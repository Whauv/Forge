from typing import Any


class DeployAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_id = str(payload.get("project_id") or "").strip()
        return {
            "status": "needs_human_review",
            "project_id": project_id,
            "message": "DeployAgent source is present, but GitHub PR automation is not implemented in this snapshot.",
        }

