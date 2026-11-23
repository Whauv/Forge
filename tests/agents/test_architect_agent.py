"""Characterization tests for ArchitectAgent.run output contract."""

import json
from types import SimpleNamespace

from app.agents.architect_agent import ArchitectAgent


def _task(task_id: str) -> dict:
    return {
        "task_id": task_id,
        "title": f"Task {task_id}",
        "description": "do the thing",
        "files_to_modify": ["app/main.py"],
        "depends_on": [],
        "type": "modify",
    }


async def test_run_returns_tasks(mock_gemini, mock_supabase):
    payload = {"tasks": [_task("t1"), _task("t2")]}
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(payload), candidates=[]
    )

    result = await ArchitectAgent().run("p1", {"proposed_solution": "x"})

    assert set(result.keys()) == {"tasks"}
    assert [t["task_id"] for t in result["tasks"]] == ["t1", "t2"]
    assert result["tasks"][0]["type"] == "modify"


async def test_run_rejects_more_than_seven_tasks(mock_gemini, mock_supabase):
    payload = {"tasks": [_task(f"t{i}") for i in range(8)]}
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(payload), candidates=[]
    )

    result = await ArchitectAgent().run("p1", {})

    assert result["status"] == "error"
    assert "more than 7 tasks" in result["message"]


async def test_run_invalid_json_returns_error(mock_gemini, mock_supabase):
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text='{"tasks": [}', candidates=[]
    )

    result = await ArchitectAgent().run("p1", {})

    assert result["status"] == "error"
    assert "Invalid architect JSON" in result["message"]
