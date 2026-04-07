from typing import Any

from app.agents.utils import generate_json
from app.db.supabase_client import insert_task


class ArchitectAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_id = str(payload.get("project_id") or "").strip()
        analysis = payload.get("analysis")
        if not project_id or not isinstance(analysis, dict):
            raise ValueError("project_id and analysis are required")

        prompt = _build_architect_prompt(analysis)
        try:
            result = await generate_json(prompt)
        except Exception:
            result = _fallback_task_graph(analysis)

        task_graph = _validate_task_graph(result)
        for task in task_graph["tasks"]:
            await insert_task(
                {
                    "project_id": project_id,
                    "title": task["title"],
                    "description": task["description"],
                    "status": "pending",
                    "clarifying_question": None,
                }
            )

        return task_graph


def _build_architect_prompt(analysis: dict[str, Any]) -> str:
    return f"""
You are a software architect. Based on this analysis:
{analysis}

Break the proposed solution into an ordered list of implementation tasks.
Respond ONLY in this JSON format:
{{
  "tasks": [
    {{
      "task_id": "t1",
      "title": "task title",
      "description": "task description",
      "files_to_modify": ["file path"],
      "depends_on": [],
      "type": "create"
    }}
  ]
}}
Keep tasks small and atomic. Max 7 tasks total.
""".strip()


def _validate_task_graph(result: dict[str, Any]) -> dict[str, Any]:
    tasks = result.get("tasks")
    if not isinstance(tasks, list):
        raise ValueError("architect response must contain tasks")

    normalized: list[dict[str, Any]] = []
    for index, task in enumerate(tasks[:7], start=1):
        if not isinstance(task, dict):
            continue
        normalized.append(
            {
                "task_id": str(task.get("task_id") or f"t{index}"),
                "title": str(task.get("title") or f"Implementation task {index}").strip(),
                "description": str(task.get("description") or "No description provided.").strip(),
                "files_to_modify": [str(item) for item in task.get("files_to_modify", []) if str(item).strip()],
                "depends_on": [str(item) for item in task.get("depends_on", []) if str(item).strip()],
                "type": str(task.get("type") or "modify").strip().lower(),
            }
        )

    if not normalized:
        raise ValueError("architect response returned no usable tasks")
    return {"tasks": normalized}


def _fallback_task_graph(analysis: dict[str, Any]) -> dict[str, Any]:
    solution = str(analysis.get("proposed_solution") or "Implement the proposed solution.")
    question = analysis.get("clarifying_question")
    tasks = [
        {
            "task_id": "t1",
            "title": "Map the current implementation gap",
            "description": "Identify the modules and data flow required to support the proposed solution.",
            "files_to_modify": ["app/api/routes/analyze.py", "autopilot/src/app/api/analyze/route.ts"],
            "depends_on": [],
            "type": "modify",
        },
        {
            "task_id": "t2",
            "title": "Implement backend support",
            "description": solution,
            "files_to_modify": ["app/agents/analysis_agent.py", "app/agents/architect_agent.py"],
            "depends_on": ["t1"],
            "type": "modify",
        },
        {
            "task_id": "t3",
            "title": "Validate frontend integration",
            "description": "Connect the frontend stream and project review pages to the backend output.",
            "files_to_modify": ["autopilot/src/components/analysis-stream.tsx", "autopilot/src/app/projects/[id]/tasks/page.tsx"],
            "depends_on": ["t2"],
            "type": "modify",
        },
    ]
    if question:
        tasks.append(
            {
                "task_id": "t4",
                "title": "Resolve open product question",
                "description": f"Capture an answer to: {question}",
                "files_to_modify": ["autopilot/src/components/task-graph.tsx"],
                "depends_on": ["t1"],
                "type": "modify",
            }
        )
    return {"tasks": tasks}

