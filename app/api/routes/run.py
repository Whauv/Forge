from typing import Any

from fastapi import APIRouter

from app.agents.coder_agent import CoderAgent
from app.agents.tester_agent import TesterAgent
from app.api.schemas import RunRequest
from app.db.supabase_client import (
    broadcast_project_update,
    update_task_by_id,
)
from app.services.pipeline import fetch_task

router = APIRouter(prefix="/run", tags=["run"])


@router.post("")
async def run(payload: RunRequest) -> dict[str, Any]:
    try:
        task = await fetch_task(payload.task_id)
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

        tester_status = tester_result.get("status")
        task_status = "completed" if tester_status == "passed" else "needs_human_review"
        await update_task_by_id(
            task["id"],
            {"status": task_status, "test_result": tester_result},
        )
        await broadcast_project_update(
            payload.project_id,
            "run_status",
            {
                "stage": "tester",
                "status": tester_status,
                "task_id": payload.task_id,
                "attempts": tester_result.get("attempts"),
            },
        )
        return tester_result
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
