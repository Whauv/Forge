from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agents.coder_agent import CoderAgent
from app.agents.tester_agent import TesterAgent
from app.db.supabase_client import (
    broadcast_project_update,
    select_task_by_field,
    select_task_by_id,
    update_task_by_id,
)

router = APIRouter(prefix="/run", tags=["run"])


class RunRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)


@router.post("")
async def run(payload: RunRequest) -> dict[str, Any]:
    try:
        task = await _fetch_task(payload.task_id)
        if not task:
            return {"status": "error", "message": f"Task {payload.task_id} not found."}

        await broadcast_project_update(
            payload.project_id,
            "run_status",
            {"stage": "coder", "status": "started", "task_id": payload.task_id},
        )
        coder_result = await CoderAgent().run(
            {
                "project_id": payload.project_id,
                "task": task,
            }
        )
        if coder_result.get("status") == "error":
            await broadcast_project_update(
                payload.project_id,
                "run_status",
                {"stage": "coder", "status": "error", "message": coder_result["message"]},
            )
            return coder_result

        await broadcast_project_update(
            payload.project_id,
            "run_status",
            {
                "stage": "coder",
                "status": "completed",
                "task_id": payload.task_id,
                "diff_count": len(coder_result.get("diffs", [])),
            },
        )

        await broadcast_project_update(
            payload.project_id,
            "run_status",
            {"stage": "tester", "status": "started", "task_id": payload.task_id},
        )
        tester_result = await TesterAgent().run(coder_result)

        task_status = "completed" if tester_result["status"] == "passed" else "needs_human_review"
        await update_task_by_id(task["id"], {"status": task_status})
        await broadcast_project_update(
            payload.project_id,
            "run_status",
            {
                "stage": "tester",
                "status": tester_result["status"],
                "task_id": payload.task_id,
                "attempts": tester_result["attempts"],
            },
        )
        return tester_result
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


async def _fetch_task(task_id: str) -> dict[str, Any] | None:
    by_id = await select_task_by_id(task_id)
    rows = getattr(by_id, "data", None) or []
    if rows:
        return rows[0]

    by_task_id = await select_task_by_field("task_id", task_id)
    rows = getattr(by_task_id, "data", None) or []
    return rows[0] if rows else None
