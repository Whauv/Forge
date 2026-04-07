import asyncio
from pathlib import Path
from typing import Any
from uuid import uuid4

import google.generativeai as genai

from app.core.config import get_required_env
from app.db.qdrant_client import (
    create_solution_template_collection,
    upsert_vectors_for_collection,
)


class FeedbackAgent:
    def __init__(self) -> None:
        genai.configure(api_key=get_required_env("GEMINI_API_KEY"))

    async def run(self, project_record: dict[str, Any]) -> dict[str, Any]:
        try:
            template = self._build_template(project_record)
            embedding = await self._embed_summary(template["solution_summary"])
            await create_solution_template_collection()
            await upsert_vectors_for_collection(
                "solution_templates",
                [
                    {
                        "id": template["template_id"],
                        "vector": embedding,
                        "payload": template,
                    }
                ],
            )
            return {"status": "success", "template_id": template["template_id"]}
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    def _build_template(self, project_record: dict[str, Any]) -> dict[str, Any]:
        diffs = project_record.get("diffs") or []
        tasks = project_record.get("tasks") or []
        analysis = project_record.get("analysis") or {}
        test_results = project_record.get("test_results") or {}

        return {
            "template_id": str(uuid4()),
            "problem_type": self._extract_problem_type(analysis.get("pain_points") or []),
            "tech_stack": self._detect_tech_stack(diffs),
            "solution_summary": analysis.get("proposed_solution") or "",
            "task_graph": tasks,
            "success": test_results.get("status") == "passed",
        }

    def _extract_problem_type(self, pain_points: list[str]) -> str:
        if not pain_points:
            return "general_application_issue"
        first = pain_points[0].lower()
        if "performance" in first:
            return "performance_issue"
        if "deploy" in first:
            return "deployment_issue"
        if "test" in first:
            return "test_failure"
        if "auth" in first:
            return "authentication_issue"
        return "_".join(first.split()[:4]) or "general_application_issue"

    def _detect_tech_stack(self, diffs: list[dict[str, Any]]) -> list[str]:
        mapping = {
            ".py": "python",
            ".ts": "typescript",
            ".js": "javascript",
            ".tsx": "react",
            ".jsx": "react",
            ".sql": "sql",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".json": "json",
            ".md": "markdown",
        }
        stack = {
            mapping[suffix]
            for diff in diffs
            for suffix in [Path(diff.get("file_path", "")).suffix.lower()]
            if suffix in mapping
        }
        return sorted(stack)

    async def _embed_summary(self, solution_summary: str) -> list[float]:
        def _embed() -> list[float]:
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=solution_summary,
                task_type="retrieval_document",
            )
            embedding = response.get("embedding")
            if not embedding:
                raise ValueError("Failed to embed solution summary.")
            return embedding

        return await asyncio.to_thread(_embed)
