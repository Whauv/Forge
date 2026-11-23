"""Shared pipeline orchestration helpers.

These were duplicated across the per-stage REST routes (`run`, `deploy`) and the
LangGraph workflow. Centralizing them keeps the two execution paths in sync.
"""

from typing import Any

from app.db.supabase_client import select_task_by_field, select_task_by_id


async def fetch_task(task_id: str) -> dict[str, Any] | None:
    """Look a task up by primary id, then fall back to its workflow ``task_id``."""
    by_id = await select_task_by_id(task_id)
    rows = getattr(by_id, "data", None) or []
    if rows:
        return rows[0]

    by_task_id = await select_task_by_field("task_id", task_id)
    rows = getattr(by_task_id, "data", None) or []
    return rows[0] if rows else None


def summarize_test_result(test_result: dict[str, Any] | None) -> str:
    """Render a one-line test summary for PR bodies / feedback payloads."""
    if not test_result:
        return "No test results recorded."
    return (
        f"status={test_result.get('status')}; "
        f"attempts={test_result.get('attempts')}; "
        f"error={test_result.get('error')}"
    )
