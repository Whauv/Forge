import asyncio
import json
from typing import Any
from uuid import uuid4

import google.generativeai as genai
from pydantic import BaseModel, ValidationError

from app.core.config import get_required_env
from app.core.json_stream import extract_json_object
from app.db.qdrant_client import search_vectors
from app.db.supabase_client import insert_code_artifact

CODER_PROMPT = """You are a senior software engineer generating production-ready code.

Task: {task_description}

Existing code context for files to modify:
{retrieved_code_chunks}

Rules:
- Generate a unified diff format patch (like git diff output)
- Match the existing code style exactly
- Do not rewrite entire files, only change what is necessary
- Include imports if new ones are needed

Respond ONLY in this JSON format:
{{
  "diffs": [
    {{
      "file_path": str,
      "diff": str,
      "explanation": str
    }}
  ],
  "test_code": str
}}
"""


class CoderDiff(BaseModel):
    file_path: str
    diff: str
    explanation: str


class CoderResult(BaseModel):
    diffs: list[CoderDiff]
    test_code: str


class CoderAgent:
    def __init__(self) -> None:
        genai.configure(api_key=get_required_env("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            project_id = payload["project_id"]
            task = payload["task"]
            prompt = await self._build_prompt(project_id, task, payload.get("error_context"))
            response_text = await asyncio.to_thread(self._generate_response, prompt)
            parsed = self._parse_and_validate(response_text)
            await self._save_diffs(project_id, task, parsed)
            return {
                **parsed,
                "project_id": project_id,
                "task": task,
            }
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    async def _build_prompt(
        self,
        project_id: str,
        task: dict[str, Any],
        error_context: str | None,
    ) -> str:
        retrieved_chunks: list[str] = []
        for file_path in task.get("files_to_modify", []):
            file_chunks = await self._retrieve_file_context(project_id, file_path)
            formatted = "\n\n".join(file_chunks) or f"No retrieved chunks for {file_path}."
            retrieved_chunks.append(f"File: {file_path}\n{formatted}")

        task_description = task.get("description") or task.get("title") or json.dumps(task)
        if error_context:
            task_description = f"{task_description}\n\nPrevious test failure to address:\n{error_context}"

        return CODER_PROMPT.format(
            task_description=task_description,
            retrieved_code_chunks="\n\n---\n\n".join(retrieved_chunks) or "No code context found.",
        )

    async def _retrieve_file_context(self, project_id: str, file_path: str) -> list[str]:
        query_vector = await self._embed_query(file_path)
        matches = await search_vectors(project_id, query_vector, limit=20)

        same_file = []
        fallback = []
        for match in matches:
            payload = getattr(match, "payload", {}) or {}
            chunk_text = payload.get("text", "")
            formatted = "\n".join(
                [
                    f"file_path: {payload.get('file_path', 'unknown')}",
                    f"language: {payload.get('language', 'unknown')}",
                    chunk_text,
                ]
            )
            if payload.get("file_path") == file_path:
                same_file.append(formatted)
            else:
                fallback.append(formatted)

        selected = same_file[:5]
        if len(selected) < 5:
            selected.extend(fallback[: 5 - len(selected)])
        return selected

    async def _embed_query(self, query: str) -> list[float]:
        def _embed() -> list[float]:
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query",
            )
            embedding = response.get("embedding")
            if not embedding:
                raise ValueError("Failed to embed coder query.")
            return embedding

        return await asyncio.to_thread(_embed)

    def _generate_response(self, prompt: str) -> str:
        response = self.model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return getattr(response, "text", "") or ""

    def _parse_and_validate(self, response_text: str) -> dict[str, Any]:
        try:
            parsed = extract_json_object(response_text)
            validated = CoderResult.model_validate(parsed)
            return validated.model_dump()
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Invalid coder JSON returned by Gemini: {exc}") from exc

    async def _save_diffs(
        self,
        project_id: str,
        task: dict[str, Any],
        result: dict[str, Any],
    ) -> None:
        for diff in result["diffs"]:
            await insert_code_artifact(
                {
                    "id": str(uuid4()),
                    "project_id": project_id,
                    "task_id": task.get("task_id") or task.get("id"),
                    "file_path": diff["file_path"],
                    "diff": diff["diff"],
                    "explanation": diff["explanation"],
                    "status": "generated",
                }
            )
