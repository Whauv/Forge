import asyncio
import json
from typing import Any
from uuid import uuid4

import google.generativeai as genai
from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_required_env
from app.core.json_stream import (
    extract_array_field,
    extract_json_object,
    extract_nullable_string_field,
    extract_string_field,
)
from app.db.qdrant_client import search_vectors, search_vectors_in_collection
from app.db.supabase_client import insert_task

ANALYSIS_PROMPT = """You are a senior Forward Deployed Engineer embedded at a client site.

{similar_template}

Client's codebase context:
{retrieved_chunks}

Client's problem statement:
{user_query}

Analyze the above and respond ONLY in this JSON format:
{{
  "pain_points": [list of specific issues found in the code/docs],
  "root_cause": "one sentence root cause",
  "proposed_solution": "clear technical solution description",
  "effort_estimate": "S/M/L",
  "clarifying_question": "one question to ask if ambiguity exists, else null"
}}
"""


class AnalysisResult(BaseModel):
    pain_points: list[str]
    root_cause: str
    proposed_solution: str
    effort_estimate: str = Field(pattern="^(S|M|L)$")
    clarifying_question: str | None


class AnalysisAgent:
    def __init__(self) -> None:
        genai.configure(api_key=get_required_env("GEMINI_API_KEY"))
        self.analysis_model = genai.GenerativeModel("gemini-2.0-flash")

    async def run(self, payload: dict[str, str]) -> dict[str, Any]:
        try:
            project_id = payload["project_id"]
            user_query = payload["user_query"]
            prompt = await self._build_prompt(project_id, user_query)
            response_text = await asyncio.to_thread(self._generate_response, prompt)
            parsed = self._parse_and_validate(response_text)
            await self._save_analysis(project_id, user_query, parsed)
            return parsed
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    async def stream(self, payload: dict[str, str]):
        project_id = payload["project_id"]
        user_query = payload["user_query"]
        prompt = await self._build_prompt(project_id, user_query)
        response = self.analysis_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
            stream=True,
        )

        buffer = ""
        emitted_fields: set[str] = set()
        for chunk in response:
            text = getattr(chunk, "text", "") or ""
            if not text:
                continue

            buffer += text
            for field, value in self._extract_stream_fields(buffer, emitted_fields).items():
                emitted_fields.add(field)
                yield {"field": field, "value": value}
            await asyncio.sleep(0)

        parsed = self._parse_and_validate(buffer)
        await self._save_analysis(project_id, user_query, parsed)
        yield {"field": "_final", "value": parsed}

    async def _build_prompt(self, project_id: str, user_query: str) -> str:
        query_vector = await self._embed_query(user_query)
        similar_template = await self._find_similar_template(query_vector)
        matches = await search_vectors(project_id, query_vector, limit=10)
        retrieved_chunks = self._format_retrieved_chunks(matches)
        return ANALYSIS_PROMPT.format(
            similar_template=similar_template,
            retrieved_chunks=retrieved_chunks,
            user_query=user_query,
        )

    async def _embed_query(self, user_query: str) -> list[float]:
        def _embed() -> list[float]:
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=user_query,
                task_type="retrieval_query",
            )
            embedding = response.get("embedding")
            if not embedding:
                raise ValueError("Failed to embed user query.")
            return embedding

        return await asyncio.to_thread(_embed)

    async def _find_similar_template(self, query_vector: list[float]) -> str:
        try:
            matches = await search_vectors_in_collection(
                "solution_templates",
                query_vector,
                limit=1,
                score_threshold=0.85,
            )
        except Exception:
            return ""

        if not matches:
            return ""

        payload = getattr(matches[0], "payload", {}) or {}
        return (
            "Here is a similar solved problem for reference: "
            f"{json.dumps(payload, indent=2)}\n"
        )

    def _format_retrieved_chunks(self, matches: list[Any]) -> str:
        formatted_chunks: list[str] = []
        for index, match in enumerate(matches, start=1):
            payload = getattr(match, "payload", {}) or {}
            formatted_chunks.append(
                "\n".join(
                    [
                        f"[Chunk {index}]",
                        f"file_path: {payload.get('file_path', 'unknown')}",
                        f"language: {payload.get('language', 'unknown')}",
                        f"source_type: {payload.get('source_type', 'unknown')}",
                        payload.get("text", ""),
                    ]
                )
            )
        return "\n\n".join(formatted_chunks) or "No relevant context retrieved."

    def _generate_response(self, prompt: str) -> str:
        response = self.analysis_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return getattr(response, "text", "") or ""

    def _parse_and_validate(self, response_text: str) -> dict[str, Any]:
        try:
            parsed = extract_json_object(response_text)
            return AnalysisResult.model_validate(parsed).model_dump()
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Invalid analysis JSON returned by Gemini: {exc}") from exc

    def _extract_stream_fields(
        self,
        buffer: str,
        emitted_fields: set[str],
    ) -> dict[str, Any]:
        extracted: dict[str, Any] = {}
        if "pain_points" not in emitted_fields:
            pain_points = extract_array_field(buffer, "pain_points")
            if pain_points is not None:
                extracted["pain_points"] = pain_points
        if "root_cause" not in emitted_fields:
            root_cause = extract_string_field(buffer, "root_cause")
            if root_cause is not None:
                extracted["root_cause"] = root_cause
        if "proposed_solution" not in emitted_fields:
            proposed_solution = extract_string_field(buffer, "proposed_solution")
            if proposed_solution is not None:
                extracted["proposed_solution"] = proposed_solution
        if "effort_estimate" not in emitted_fields:
            effort_estimate = extract_string_field(buffer, "effort_estimate")
            if effort_estimate is not None:
                extracted["effort_estimate"] = effort_estimate
        if "clarifying_question" not in emitted_fields:
            clarifying_question = extract_nullable_string_field(buffer, "clarifying_question")
            if clarifying_question is None and '"clarifying_question"' not in buffer:
                return extracted
            extracted["clarifying_question"] = clarifying_question
        return extracted

    async def _save_analysis(
        self,
        project_id: str,
        user_query: str,
        analysis: dict[str, Any],
    ) -> None:
        await insert_task(
            {
                "id": str(uuid4()),
                "project_id": project_id,
                "status": "analyzed",
                "type": "analysis",
                "title": "Project analysis",
                "description": user_query,
                "details": analysis,
            }
        )
