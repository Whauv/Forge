"""Characterization tests for app.db.supabase_client.

The module builds its client at import time; ``mock_supabase`` swaps that
module-level client for a MagicMock so the thin async wrappers can be exercised
without a network call.
"""

from unittest.mock import MagicMock

import pytest

import app.db.supabase_client as sc


async def test_insert_project_uses_projects_table(mock_supabase):
    sentinel = MagicMock(name="execute_result")
    mock_supabase.table.return_value.insert.return_value.execute.return_value = sentinel

    result = await sc.insert_project({"id": "p1"})

    mock_supabase.table.assert_called_with("projects")
    mock_supabase.table.return_value.insert.assert_called_with({"id": "p1"})
    assert result is sentinel


async def test_select_task_by_id_builds_eq_id_query(mock_supabase):
    chain = mock_supabase.table.return_value.select.return_value.eq.return_value
    chain.execute.return_value = MagicMock(name="rows")

    await sc.select_task_by_id("task-1")

    mock_supabase.table.assert_called_with("tasks")
    mock_supabase.table.return_value.select.assert_called_with("*")
    mock_supabase.table.return_value.select.return_value.eq.assert_called_with("id", "task-1")


async def test_select_code_artifact_by_field_builds_eq_field_query(mock_supabase):
    await sc.select_code_artifact_by_field("task_id", "t-9")

    mock_supabase.table.assert_called_with("code_artifacts")
    mock_supabase.table.return_value.select.return_value.eq.assert_called_with("task_id", "t-9")


async def test_update_task_by_id_chains_update_eq(mock_supabase):
    await sc.update_task_by_id("task-1", {"status": "approved"})

    mock_supabase.table.assert_called_with("tasks")
    mock_supabase.table.return_value.update.assert_called_with({"status": "approved"})
    mock_supabase.table.return_value.update.return_value.eq.assert_called_with("id", "task-1")


async def test_insert_deployment_uses_deployments_table(mock_supabase):
    await sc.insert_deployment({"id": "d1"})
    mock_supabase.table.assert_called_with("deployments")


@pytest.fixture
def capture_broadcast(monkeypatch):
    captured: dict = {}

    class FakeAsyncClient:
        def __init__(self, timeout=None):
            captured["timeout"] = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, json, headers):
            captured["url"] = url
            captured["json"] = json
            captured["headers"] = headers
            response = MagicMock(name="response")
            response.raise_for_status = MagicMock()
            captured["response"] = response
            return response

    monkeypatch.setattr(sc.httpx, "AsyncClient", FakeAsyncClient)
    return captured


async def test_broadcast_project_update_builds_payload_and_headers(capture_broadcast):
    await sc.broadcast_project_update(
        "proj-1", "run_status", {"stage": "coder", "status": "started"}
    )

    assert capture_broadcast["url"].endswith("/realtime/v1/api/broadcast")
    message = capture_broadcast["json"]["messages"][0]
    assert message["topic"] == "project_proj-1"
    assert message["event"] == "run_status"
    assert message["payload"] == {"stage": "coder", "status": "started"}

    headers = capture_broadcast["headers"]
    assert headers["Content-Type"] == "application/json"
    assert headers["apikey"] == sc.settings.supabase_key
    assert headers["Authorization"] == f"Bearer {sc.settings.supabase_key}"
    capture_broadcast["response"].raise_for_status.assert_called_once()
