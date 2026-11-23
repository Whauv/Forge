"""Characterization tests for CoderAgent.run output contract."""

import json
from types import SimpleNamespace

from app.agents.coder_agent import CoderAgent

VALID_CODER = {
    "diffs": [
        {"file_path": "app/main.py", "diff": "@@ -1 +1 @@", "explanation": "tweak"}
    ],
    "test_code": "def test_x():\n    assert True",
}


def _task() -> dict:
    # Empty files_to_modify keeps _build_prompt from needing vector search.
    return {"id": "task-1", "title": "T", "description": "D", "files_to_modify": []}


async def test_run_returns_diffs_with_context(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(VALID_CODER), candidates=[]
    )

    result = await CoderAgent().run({"project_id": "p1", "task": _task()})

    assert result["diffs"] == VALID_CODER["diffs"]
    assert result["test_code"] == VALID_CODER["test_code"]
    assert result["project_id"] == "p1"
    assert result["task"]["id"] == "task-1"
    assert "status" not in result


async def test_run_invalid_json_returns_error(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text='{"diffs": [}', candidates=[]
    )

    result = await CoderAgent().run({"project_id": "p1", "task": _task()})

    assert result["status"] == "error"
    assert "Invalid coder JSON" in result["message"]


async def test_run_persists_each_diff(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(VALID_CODER), candidates=[]
    )

    await CoderAgent().run({"project_id": "p1", "task": _task()})

    # One code_artifacts insert per diff.
    assert mock_supabase.table.call_args_list, "expected a supabase insert"
    mock_supabase.table.assert_any_call("code_artifacts")
