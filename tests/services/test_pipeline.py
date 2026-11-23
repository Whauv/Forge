"""Tests for the shared pipeline helpers extracted in Phase 2."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

from app.services import pipeline


def _resp(data):
    return SimpleNamespace(data=data)


async def test_fetch_task_by_primary_id(monkeypatch):
    monkeypatch.setattr(
        pipeline, "select_task_by_id", AsyncMock(return_value=_resp([{"id": "t1"}]))
    )
    monkeypatch.setattr(pipeline, "select_task_by_field", AsyncMock(return_value=_resp([])))

    assert await pipeline.fetch_task("t1") == {"id": "t1"}


async def test_fetch_task_falls_back_to_task_id(monkeypatch):
    by_id = AsyncMock(return_value=_resp([]))
    by_field = AsyncMock(return_value=_resp([{"id": "t2", "task_id": "wf-2"}]))
    monkeypatch.setattr(pipeline, "select_task_by_id", by_id)
    monkeypatch.setattr(pipeline, "select_task_by_field", by_field)

    assert await pipeline.fetch_task("wf-2") == {"id": "t2", "task_id": "wf-2"}
    by_field.assert_awaited_once_with("task_id", "wf-2")


async def test_fetch_task_returns_none_when_missing(monkeypatch):
    monkeypatch.setattr(pipeline, "select_task_by_id", AsyncMock(return_value=_resp([])))
    monkeypatch.setattr(pipeline, "select_task_by_field", AsyncMock(return_value=_resp([])))

    assert await pipeline.fetch_task("nope") is None


def test_summarize_test_result_empty():
    assert pipeline.summarize_test_result({}) == "No test results recorded."
    assert pipeline.summarize_test_result(None) == "No test results recorded."


def test_summarize_test_result_formats_fields():
    summary = pipeline.summarize_test_result({"status": "passed", "attempts": 2, "error": None})
    assert "status=passed" in summary
    assert "attempts=2" in summary
    assert "error=None" in summary
