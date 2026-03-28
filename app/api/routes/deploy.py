from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agents.deploy_agent import DeployAgent
from app.agents.feedback_agent import FeedbackAgent
from app.db.supabase_client import (
    select_code_artifact_by_field,
    select_project_by_id,
    select_task_by_field,
    select_task_by_id,
)

router = APIRouter(prefix="/deploy", tags=["deploy"])


class DeployRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)


@router.post("")
async def deploy(payload: DeployRequest) -> dict[str, Any]:
    try:
        task = await _fetch_task(payload.task_id)
        if not task:
            return {"status": "error", "message": f"Task {payload.task_id} not found."}

        project_rows = getattr(await select_project_by_id(payload.project_id), "data", None) or []
        if not project_rows:
            return {"status": "error", "message": f"Project {payload.project_id} not found."}
        project = project_rows[0]

        approved_diffs_rows = getattr(
            await select_code_artifact_by_field("task_id", task.get("task_id") or task.get("id")),
            "data",
            None,
        ) or []
        approved_diffs = [row for row in approved_diffs_rows if row.get("status") == "approved"]
        if not approved_diffs:
            return {"status": "error", "message": "No approved diffs found for deployment."}

        analysis = await _fetch_analysis(payload.project_id)
        deploy_result = await DeployAgent().run(
            {
                "project_id": payload.project_id,
                "repo_url": project.get("repo_url"),
                "approved_diffs": approved_diffs,
                "task_id": task.get("task_id") or task.get("id"),
                "task_title": task.get("title") or "AI-FDE deployment",
                "pain_points": (analysis or {}).get("pain_points"),
                "proposed_solution": (analysis or {}).get("proposed_solution"),
                "test_results_summary": _summarize_test_results(task.get("test_result")),
            }
        )
        if deploy_result.get("status") == "error":
            return deploy_result

        feedback_result = await FeedbackAgent().run(
            {
                "project_id": payload.project_id,
                "analysis": analysis or {},
                "tasks": await _fetch_architect_tasks(payload.project_id),
                "diffs": approved_diffs,
                "test_results": task.get("test_result") or {},
            }
        )

        return {
            "pr_url": deploy_result["pr_url"],
            "branch": deploy_result["branch"],
            "commit_sha": deploy_result["commit_sha"],
            "deployment_status": "success",
            "feedback_status": feedback_result.get("status", "error"),
        }
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


async def _fetch_analysis(project_id: str) -> dict[str, Any] | None:
    response = await select_task_by_field("project_id", project_id)
    rows = getattr(response, "data", None) or []
    for row in rows:
        if row.get("type") == "analysis":
            return row.get("details")
    return None


async def _fetch_architect_tasks(project_id: str) -> list[dict[str, Any]]:
    response = await select_task_by_field("project_id", project_id)
    rows = getattr(response, "data", None) or []
    return [row for row in rows if row.get("task_id")]


def _summarize_test_results(test_result: dict[str, Any] | None) -> str:
    if not test_result:
        return "No test results recorded."
    return (
        f"status={test_result.get('status')}; "
        f"attempts={test_result.get('attempts')}; "
        f"error={test_result.get('error')}"
    )
