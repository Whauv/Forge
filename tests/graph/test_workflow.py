"""Characterization tests for app.graph.workflow.

Covers the pure edge/helper functions, individual node transitions, and a full
``run_workflow`` pass with every agent mocked to success.
"""

import json
from unittest.mock import AsyncMock

import pytest
from langgraph.graph import END

from app.graph import workflow as wf


def _agent(result=None, *, error=None):
    """Return a zero-arg factory yielding an agent whose run() is mocked."""
    run = AsyncMock(side_effect=error) if error else AsyncMock(return_value=result)
    return lambda: AsyncMock(run=run)


# --- pure helpers -------------------------------------------------------------


def test_with_error_sets_status_and_message():
    result = wf._with_error({"status": "ingested", "error": None}, "boom")
    assert result["status"] == "error"
    assert result["error"] == "boom"


def test_get_current_task_in_range():
    state = {"task_graph": {"tasks": [{"id": "a"}, {"id": "b"}]}, "current_task_index": 1}
    assert wf._get_current_task(state) == {"id": "b"}


def test_get_current_task_out_of_range_returns_none():
    state = {"task_graph": {"tasks": [{"id": "a"}]}, "current_task_index": 5}
    assert wf._get_current_task(state) is None


def test_summarize_test_result_empty():
    assert wf._summarize_test_result({}) == "No test results recorded."


def test_summarize_test_result_formats_fields():
    summary = wf._summarize_test_result({"status": "passed", "attempts": 2, "error": None})
    assert "status=passed" in summary
    assert "attempts=2" in summary


@pytest.mark.parametrize(
    "fn,state,expected",
    [
        (wf._next_after_ingest, {}, "analysis"),
        (wf._next_after_ingest, {"error": "x"}, END),
        (wf._next_after_analysis, {}, "architect"),
        (wf._next_after_analysis, {"error": "x"}, END),
        (wf._next_after_architect, {}, "coder"),
        (wf._next_after_architect, {"error": "x"}, END),
        (wf._next_after_coder, {}, "tester"),
        (wf._next_after_coder, {"error": "x"}, END),
        (wf._next_after_deploy, {}, "feedback"),
        (wf._next_after_deploy, {"error": "x"}, END),
        (wf._next_after_feedback, {}, END),
    ],
)
def test_simple_edges(fn, state, expected):
    assert fn(state) == expected


def test_next_after_tester_error_ends():
    assert wf._next_after_tester({"error": "x"}) == END


def test_next_after_tester_needs_human_review_ends():
    assert wf._next_after_tester({"status": "needs_human_review"}) == END


def test_next_after_tester_passed_loops_to_coder_when_tasks_remain():
    state = {
        "status": "passed",
        "current_task_index": 1,
        "task_graph": {"tasks": [{"id": "a"}, {"id": "b"}]},
    }
    assert wf._next_after_tester(state) == "coder"


def test_next_after_tester_passed_goes_to_deploy_when_done():
    state = {
        "status": "passed",
        "current_task_index": 1,
        "task_graph": {"tasks": [{"id": "a"}]},
    }
    assert wf._next_after_tester(state) == "deploy"


def test_next_after_tester_other_status_ends():
    assert wf._next_after_tester({"status": "failed"}) == END


# --- node transitions ---------------------------------------------------------


def _base_state() -> dict:
    return {
        "project_id": "p1",
        "repo_url": "r",
        "user_query": "q",
        "analysis": {},
        "task_graph": {},
        "current_task_index": 0,
        "current_diffs": {},
        "test_result": {},
        "deployment_result": {},
        "status": "initialized",
        "error": None,
    }


async def test_ingest_node_success(monkeypatch):
    monkeypatch.setattr(wf, "IngestAgent", _agent({"status": "success"}))
    result = await wf.ingest_node(_base_state())
    assert result["status"] == "ingested"
    assert result["error"] is None


async def test_ingest_node_agent_error_short_circuits(monkeypatch):
    monkeypatch.setattr(wf, "IngestAgent", _agent({"status": "error", "message": "bad"}))
    result = await wf.ingest_node(_base_state())
    assert result["status"] == "error"
    assert result["error"] == "bad"


async def test_ingest_node_exception_is_caught(monkeypatch):
    monkeypatch.setattr(wf, "IngestAgent", _agent(error=RuntimeError("explode")))
    result = await wf.ingest_node(_base_state())
    assert result["status"] == "error"
    assert "explode" in result["error"]


async def test_tester_node_passed_increments_index(monkeypatch):
    monkeypatch.setattr(wf, "TesterAgent", _agent({"status": "passed", "attempts": 1}))
    state = {**_base_state(), "current_task_index": 0, "current_diffs": {"diffs": []}}
    result = await wf.tester_node(state)
    assert result["status"] == "passed"
    assert result["current_task_index"] == 1


async def test_tester_node_failed_sets_error(monkeypatch):
    monkeypatch.setattr(wf, "TesterAgent", _agent({"status": "failed", "error": "nope"}))
    result = await wf.tester_node(_base_state())
    assert result["status"] == "error"
    assert result["error"] == "nope"


# --- full pass ----------------------------------------------------------------


async def test_run_workflow_happy_path_reaches_completed(monkeypatch):
    monkeypatch.setattr(wf, "IngestAgent", _agent({"status": "success"}))
    monkeypatch.setattr(
        wf, "AnalysisAgent", _agent({"pain_points": [], "proposed_solution": "x"})
    )
    monkeypatch.setattr(
        wf,
        "ArchitectAgent",
        _agent({"tasks": [{"id": "t1", "title": "T", "files_to_modify": []}]}),
    )
    monkeypatch.setattr(wf, "CoderAgent", _agent({"diffs": [{"file_path": "a"}]}))
    monkeypatch.setattr(wf, "TesterAgent", _agent({"status": "passed", "attempts": 1}))
    monkeypatch.setattr(
        wf, "DeployAgent", _agent({"pr_url": "u", "branch": "b", "commit_sha": "c"})
    )
    monkeypatch.setattr(wf, "FeedbackAgent", _agent({"status": "success"}))

    payload = {"project_id": "p1", "repo_url": "r", "user_query": "q"}
    updates = [json.loads(u) async for u in wf.run_workflow(payload)]

    visited = [node for update in updates for node in update]
    assert visited == ["ingest", "analysis", "architect", "coder", "tester", "deploy", "feedback"]
    assert updates[-1]["feedback"]["status"] == "completed"
    assert all(update[node].get("error") is None for update in updates for node in update)


async def test_run_workflow_stops_on_ingest_error(monkeypatch):
    monkeypatch.setattr(
        wf, "IngestAgent", _agent({"status": "error", "message": "bad repo"})
    )

    updates = [json.loads(u) async for u in wf.run_workflow({"project_id": "p1"})]

    visited = [node for update in updates for node in update]
    assert visited == ["ingest"]
    assert updates[-1]["ingest"]["status"] == "error"
