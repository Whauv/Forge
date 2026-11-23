"""Characterization tests for the FastAPI routes via TestClient.

Agents and DB helpers are patched at the route-module level. These pin the
*current* (intentionally inconsistent) error contract — e.g. /analyze returns
HTTP 500 on failure while /ingest, /run and /deploy return HTTP 200 with an
``{"status": "error"}`` body — so Phase 2's normalization can be verified.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import app.api.routes.analyze as analyze_route
import app.api.routes.deploy as deploy_route
import app.api.routes.ingest as ingest_route
import app.api.routes.run as run_route
import app.main as main_module
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def _resp(data):
    return SimpleNamespace(data=data)


def _patch_select(monkeypatch, module, name, data):
    monkeypatch.setattr(module, name, AsyncMock(return_value=_resp(data)))


# --- /health ------------------------------------------------------------------


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# --- /ingest ------------------------------------------------------------------


def test_ingest_success(client, monkeypatch):
    agent = AsyncMock()
    agent.run.return_value = {"status": "success", "chunks_stored": 3, "project_id": "p1"}
    monkeypatch.setattr(ingest_route, "IngestAgent", lambda: agent)

    r = client.post("/ingest", json={"project_id": "p1", "raw_text": "hello"})
    assert r.status_code == 200
    assert r.json()["status"] == "success"


def test_ingest_agent_error_returns_200_with_error_body(client, monkeypatch):
    agent = AsyncMock()
    agent.run.return_value = {"status": "error", "message": "bad"}
    monkeypatch.setattr(ingest_route, "IngestAgent", lambda: agent)

    r = client.post("/ingest", json={"project_id": "p1", "raw_text": "hello"})
    assert r.status_code == 200
    assert r.json() == {"status": "error", "message": "bad"}


def test_ingest_validation_error(client):
    r = client.post("/ingest", json={})  # missing required project_id
    assert r.status_code == 422


# --- /analyze -----------------------------------------------------------------


def test_analyze_success(client, monkeypatch):
    analysis_agent = AsyncMock()
    analysis_agent.run.return_value = {"pain_points": [], "proposed_solution": "x"}
    architect_agent = AsyncMock()
    architect_agent.run.return_value = {"tasks": []}
    monkeypatch.setattr(analyze_route, "AnalysisAgent", lambda: analysis_agent)
    monkeypatch.setattr(analyze_route, "ArchitectAgent", lambda: architect_agent)

    r = client.post("/analyze/", json={"project_id": "p1", "query": "q"})
    assert r.status_code == 200
    body = r.json()
    assert "analysis" in body
    assert "task_graph" in body


def test_analyze_error_returns_500(client, monkeypatch):
    analysis_agent = AsyncMock()
    analysis_agent.run.return_value = {"status": "error", "message": "boom"}
    monkeypatch.setattr(analyze_route, "AnalysisAgent", lambda: analysis_agent)

    r = client.post("/analyze/", json={"project_id": "p1", "query": "q"})
    assert r.status_code == 500
    assert r.json()["status"] == "error"


def test_analyze_stream_emits_sse_events(client, monkeypatch):
    analysis_agent = AsyncMock()
    analysis_agent.run.return_value = {
        "pain_points": ["slow"],
        "proposed_solution": "cache",
        "clarifying_question": None,
    }
    architect_agent = AsyncMock()
    architect_agent.run.return_value = {"tasks": [{"task_id": "t1"}]}
    monkeypatch.setattr(analyze_route, "AnalysisAgent", lambda: analysis_agent)
    monkeypatch.setattr(analyze_route, "ArchitectAgent", lambda: architect_agent)

    r = client.post("/analyze/stream", json={"project_id": "p1", "query": "q"})
    assert r.status_code == 200
    assert "data:" in r.text
    assert "pain_point" in r.text
    assert "task_graph" in r.text


# --- /run ---------------------------------------------------------------------


def test_run_success(client, monkeypatch):
    monkeypatch.setattr(run_route, "fetch_task", AsyncMock(return_value={"id": "t1"}))
    monkeypatch.setattr(run_route, "broadcast_project_update", AsyncMock())
    monkeypatch.setattr(run_route, "update_task_by_id", AsyncMock())
    coder = AsyncMock()
    coder.run.return_value = {"diffs": [{"file_path": "a"}]}
    tester = AsyncMock()
    tester.run.return_value = {"status": "passed", "attempts": 1}
    monkeypatch.setattr(run_route, "CoderAgent", lambda: coder)
    monkeypatch.setattr(run_route, "TesterAgent", lambda: tester)

    r = client.post("/run", json={"project_id": "p1", "task_id": "t1"})
    assert r.status_code == 200
    assert r.json()["status"] == "passed"


def test_run_task_not_found(client, monkeypatch):
    monkeypatch.setattr(run_route, "fetch_task", AsyncMock(return_value=None))

    r = client.post("/run", json={"project_id": "p1", "task_id": "missing"})
    assert r.status_code == 200
    assert r.json()["status"] == "error"
    assert "not found" in r.json()["message"]


# --- /deploy ------------------------------------------------------------------


def test_deploy_success(client, monkeypatch):
    task = {"id": "t1", "title": "T", "test_result": {"status": "passed", "attempts": 1}}
    analysis_row = {
        "type": "analysis",
        "details": {"pain_points": [], "proposed_solution": "x"},
    }
    artifact = {"status": "approved", "unified_diff": "d", "file_path": "f", "explanation": "e"}

    monkeypatch.setattr(deploy_route, "fetch_task", AsyncMock(return_value=task))
    _patch_select(monkeypatch, deploy_route, "select_project_by_id", [{"github_repo_url": "u"}])
    _patch_select(monkeypatch, deploy_route, "select_code_artifact_by_field", [artifact])
    _patch_select(monkeypatch, deploy_route, "select_task_by_field", [analysis_row])
    deploy_agent = AsyncMock()
    deploy_agent.run.return_value = {"pr_url": "u", "branch": "b", "commit_sha": "c"}
    feedback_agent = AsyncMock()
    feedback_agent.run.return_value = {"status": "success"}
    monkeypatch.setattr(deploy_route, "DeployAgent", lambda: deploy_agent)
    monkeypatch.setattr(deploy_route, "FeedbackAgent", lambda: feedback_agent)

    r = client.post("/deploy", json={"project_id": "p1", "task_id": "t1"})
    assert r.status_code == 200
    body = r.json()
    assert body["pr_url"] == "u"
    assert body["deployment_status"] == "success"
    assert body["feedback_status"] == "success"


def test_deploy_no_approved_diffs(client, monkeypatch):
    task = {"id": "t1", "title": "T", "test_result": {}}
    monkeypatch.setattr(deploy_route, "fetch_task", AsyncMock(return_value=task))
    _patch_select(monkeypatch, deploy_route, "select_project_by_id", [{"github_repo_url": "u"}])
    _patch_select(monkeypatch, deploy_route, "select_code_artifact_by_field", [])

    r = client.post("/deploy", json={"project_id": "p1", "task_id": "t1"})
    assert r.status_code == 200
    assert r.json()["status"] == "error"
    assert "No approved diffs" in r.json()["message"]


# --- /workflow ----------------------------------------------------------------


def test_workflow_streams_updates(client, monkeypatch):
    async def fake_workflow(payload):
        yield '{"ingest": {"status": "ingested"}}'
        yield '{"feedback": {"status": "completed"}}'

    monkeypatch.setattr(main_module, "run_workflow", fake_workflow)

    r = client.post("/workflow", json={"project_id": "p1"})
    assert r.status_code == 200
    assert "data:" in r.text
    assert "completed" in r.text
