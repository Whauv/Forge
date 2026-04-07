import asyncio
import re
import time
from pathlib import Path
from typing import Any
from uuid import uuid4

import google.generativeai as genai
from firecrawl import FirecrawlApp
from github import ContentFile, Github

from app.core.config import get_required_env
from app.core.repo_utils import infer_project_name, parse_github_repo_name
from app.db.qdrant_client import create_collection, upsert_vectors
from app.db.supabase_client import insert_project, select_project_by_id, update_project_by_id

MAX_FILE_SIZE_BYTES = 50 * 1024
MAX_CHUNK_CHARS = 2000
EMBED_BATCH_SIZE = 20
ALLOWED_EXTENSIONS = {".py", ".ts", ".js", ".md", ".yaml", ".json", ".txt"}
CODE_SPLIT_PATTERN = re.compile(
    r"(?=^\s*(?:async\s+def |def |class |function |const |export ))",
    re.MULTILINE,
)
DOC_SPLIT_PATTERN = re.compile(r"(?=^##\s+|^#\s+)", re.MULTILINE)


class IngestAgent:
    def __init__(self) -> None:
        self.github_token = get_required_env("GITHUB_TOKEN")
        self.gemini_api_key = get_required_env("GEMINI_API_KEY")
        genai.configure(api_key=self.gemini_api_key)
        self.github_client = Github(self.github_token)

    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            project_id = payload["project_id"]
            repo_url = payload.get("repo_url")
            doc_urls = payload.get("doc_urls") or []
            raw_text = payload.get("raw_text")

            if not repo_url and not doc_urls and not raw_text:
                raise ValueError("At least one of repo_url, doc_urls, or raw_text must be provided.")

            documents: list[dict[str, Any]] = []

            if repo_url:
                documents.extend(await self._fetch_repo_documents(repo_url))

            if doc_urls:
                documents.extend(await self._fetch_doc_documents(doc_urls))

            if raw_text:
                documents.append(
                    {
                        "file_path": "raw_text.txt",
                        "language": "text",
                        "source_type": "raw_text",
                        "content": raw_text,
                    }
                )

            chunks = self._chunk_documents(documents)
            if not chunks:
                raise ValueError("No ingestible content was found for this project.")

            embeddings = await self._embed_chunks(chunks)
            points = [
                {
                    "id": str(uuid4()),
                    "vector": embedding,
                    "payload": {
                        "text": chunk["text"],
                        **chunk["metadata"],
                    },
                }
                for chunk, embedding in zip(chunks, embeddings, strict=True)
            ]

            await create_collection(project_id)
            await upsert_vectors(project_id, points)
            await self._save_project_record(project_id, payload)

            return {
                "status": "success",
                "chunks_stored": len(points),
                "project_id": project_id,
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    async def _fetch_repo_documents(self, repo_url: str) -> list[dict[str, Any]]:
        repo = await asyncio.to_thread(self.github_client.get_repo, parse_github_repo_name(repo_url))
        documents: list[dict[str, Any]] = []
        queue = list(await asyncio.to_thread(repo.get_contents, ""))

        while queue:
            item = queue.pop(0)
            if isinstance(item, list):
                queue.extend(item)
                continue

            if item.type == "dir":
                queue.extend(await asyncio.to_thread(repo.get_contents, item.path))
                continue

            if item.size > MAX_FILE_SIZE_BYTES:
                continue

            extension = Path(item.path).suffix.lower()
            if extension not in ALLOWED_EXTENSIONS:
                continue

            content = await self._decode_github_file(item)
            if not content.strip():
                continue

            documents.append(
                {
                    "file_path": item.path,
                    "language": self._detect_language(item.path),
                    "source_type": "repo",
                    "content": content,
                }
            )

        return documents

    async def _fetch_doc_documents(self, doc_urls: list[str]) -> list[dict[str, Any]]:
        firecrawl_api_key = get_required_env("FIRECRAWL_API_KEY")
        firecrawl = FirecrawlApp(api_key=firecrawl_api_key)
        documents: list[dict[str, Any]] = []

        for url in doc_urls:
            result = await asyncio.to_thread(firecrawl.scrape_url, url, formats=["markdown"])
            markdown = self._extract_markdown(result)
            if not markdown.strip():
                continue

            documents.append(
                {
                    "file_path": url,
                    "language": "markdown",
                    "source_type": "docs",
                    "content": markdown,
                }
            )

        return documents

    async def _decode_github_file(self, item: ContentFile.ContentFile) -> str:
        def _decode() -> str:
            return item.decoded_content.decode("utf-8", errors="ignore")

        return await asyncio.to_thread(_decode)

    def _chunk_documents(self, documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
        chunks: list[dict[str, Any]] = []

        for document in documents:
            content = document["content"]
            source_type = document["source_type"]
            if source_type == "repo":
                sections = self._split_sections(content, CODE_SPLIT_PATTERN)
            else:
                sections = self._split_sections(content, DOC_SPLIT_PATTERN)

            chunk_index = 0
            for section in sections:
                for chunk_text in self._enforce_chunk_limit(section):
                    if not chunk_text.strip():
                        continue

                    chunks.append(
                        {
                            "text": chunk_text,
                            "metadata": {
                                "file_path": document["file_path"],
                                "language": document["language"],
                                "chunk_index": chunk_index,
                                "source_type": source_type,
                            },
                        }
                    )
                    chunk_index += 1

        return chunks

    def _split_sections(self, content: str, pattern: re.Pattern[str]) -> list[str]:
        sections = [part.strip() for part in pattern.split(content) if part.strip()]
        return sections or [content.strip()]

    def _enforce_chunk_limit(self, content: str) -> list[str]:
        if len(content) <= MAX_CHUNK_CHARS:
            return [content]

        pieces: list[str] = []
        current = ""
        for block in re.split(r"(\n\s*\n)", content):
            candidate = f"{current}{block}"
            if current and len(candidate) > MAX_CHUNK_CHARS:
                pieces.append(current.strip())
                current = block
                continue
            current = candidate

        if current.strip():
            pieces.append(current.strip())

        normalized: list[str] = []
        for piece in pieces:
            if len(piece) <= MAX_CHUNK_CHARS:
                normalized.append(piece)
                continue

            for start in range(0, len(piece), MAX_CHUNK_CHARS):
                normalized.append(piece[start : start + MAX_CHUNK_CHARS].strip())

        return [piece for piece in normalized if piece]

    async def _embed_chunks(self, chunks: list[dict[str, Any]]) -> list[list[float]]:
        embeddings: list[list[float]] = []

        for start in range(0, len(chunks), EMBED_BATCH_SIZE):
            batch = chunks[start : start + EMBED_BATCH_SIZE]
            batch_vectors = await asyncio.to_thread(self._embed_batch, batch)
            embeddings.extend(batch_vectors)

            if start + EMBED_BATCH_SIZE < len(chunks):
                await asyncio.sleep(1)

        return embeddings

    def _embed_batch(self, batch: list[dict[str, Any]]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for chunk in batch:
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=chunk["text"],
                task_type="retrieval_document",
            )
            embedding = response.get("embedding")
            if not embedding:
                raise ValueError("Failed to generate embedding for one or more chunks.")
            vectors.append(embedding)
            time.sleep(0.05)
        return vectors

    async def _save_project_record(self, project_id: str, payload: dict[str, Any]) -> None:
        repo_url = payload.get("repo_url")
        inferred_name = infer_project_name(repo_url) if repo_url else f"Project {project_id[:8]}"
        record = {
            "id": project_id,
            "name": payload.get("name") or inferred_name,
            "github_repo_url": repo_url,
            "doc_urls": payload.get("doc_urls") or [],
            "problem_description": payload.get("raw_text"),
            "status": "ingested",
        }
        existing = await select_project_by_id(project_id)
        existing_rows = getattr(existing, "data", None) or []

        if existing_rows:
            await update_project_by_id(project_id, record)
        elif payload.get("user_id"):
            record["user_id"] = payload["user_id"]
            await insert_project(record)

    def _extract_markdown(self, result: Any) -> str:
        if isinstance(result, dict):
            if "markdown" in result:
                return result["markdown"] or ""
            if "data" in result and isinstance(result["data"], dict):
                return result["data"].get("markdown", "") or ""
        markdown = getattr(result, "markdown", None)
        if markdown:
            return markdown
        data = getattr(result, "data", None)
        if isinstance(data, dict):
            return data.get("markdown", "") or ""
        return ""

    def _detect_language(self, file_path: str) -> str:
        extension = Path(file_path).suffix.lower()
        return {
            ".py": "python",
            ".ts": "typescript",
            ".js": "javascript",
            ".md": "markdown",
            ".yaml": "yaml",
            ".json": "json",
            ".txt": "text",
        }.get(extension, "text")
