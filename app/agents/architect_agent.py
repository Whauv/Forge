import asyncio
import json
from typing import Any
from uuid import uuid4

import google.generativeai as genai
from pydantic import BaseModel, ValidationError

from app.core.config import get_required_env
from app.core.json_stream import extract_array_field, extract_json_object
from app.db.supabase_client import insert_task

ARCHITECT_PROMPT = """You are a software architect. Based on this analysis:
{analysis_json}

Break the proposed solution into an ordered list of implementation tasks.
Respond ONLY in this JSON format:
{{
  "tasks": [
    {{
      "task_id": "t1",
      "title": str,
      "description": str,
      "files_to_modify": [list of file paths],
      "depends_on": [list of task_ids or empty],
      "type": "create|modify|delete"
    }}
  ]
}}
Keep tasks small and atomic. Max 7 tasks total.
"""


class ArchitectTask(BaseModel):
    task_id: str
    title: str
    description: str
    files_to_modify: list[str]
    depends_on: list[str]
    type: str


class ArchitectResult(BaseModel):
    tasks: list[ArchitectTask]


class ArchitectAgent:
    def __init__(self) -> None:
        genai.configure(api_key=get_required_env("GEMINI_API_KEY"))
        self.architect_model = genai.GenerativeModel("gemini-2.0-flash")

    async def run(self, project_id: str, analysis: dict[str, Any]) -> dict[str, Any]:
        try:
            prompt = self._build_prompt(analysis)
            response_text = await asyncio.to_thread(self._generate_response, prompt)
            parsed = self._parse_and_validate(response_text)
            await self._save_tasks(project_id, parsed["tasks"])
            return parsed
        except Exception as exc:
            return {"status": "error", "message": str(exc)}

    async def stream(self, project_id: str, analysis: dict[str, Any]):
        prompt = self._build_prompt(analysis)
        response = self.architect_model.generate_content(
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
            tasks = extract_array_field(buffer, "tasks")
            if tasks is not None and "tasks" not in emitted_fields:
                emitted_fields.add("tasks")
                yield {"field": "tasks", "value": tasks}
            await asyncio.sleep(0)

        parsed = self._parse_and_validate(buffer)
        await self._save_tasks(project_id, parsed["tasks"])
        yield {"field": "_final", "value": parsed}

    def _build_prompt(self, analysis: dict[str, Any]) -> str:
        return ARCHITECT_PROMPT.format(
            analysis_json=json.dumps(analysis, indent=2),
        )

    def _generate_response(self, prompt: str) -> str:
        response = self.architect_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return getattr(response, "text", "") or ""

    def _parse_and_validate(self, response_text: str) -> dict[str, Any]:
        try:
            parsed = extract_json_object(response_text)
            result = ArchitectResult.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Invalid architect JSON returned by Gemini: {exc}") from exc

        tasks = result.model_dump()["tasks"]
        if len(tasks) > 7:
            raise ValueError("Architect returned more than 7 tasks.")
        return {"tasks": tasks}

    async def _save_tasks(self, project_id: str, tasks: list[dict[str, Any]]) -> None:
        for task in tasks:
            await insert_task(
                {
                    "id": str(uuid4()),
                    "project_id": project_id,
                    "status": "planned",
                    "task_id": task["task_id"],
                    "title": task["title"],
                    "description": task["description"],
                    "clarifying_question": None,
                    "files_to_modify": task.get("files_to_modify", []),
                    "depends_on": task.get("depends_on", []),
                    "type": task.get("type", "modify"),
                }
            )
