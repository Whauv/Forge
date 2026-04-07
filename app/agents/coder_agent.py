from typing import Any


class CoderAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        task = payload.get("task") or {}
        return {
            "status": "needs_human_review",
            "diffs": [],
            "test_code": "",
            "message": (
                f"CoderAgent source is now present, but automated code generation for "
                f"{task.get('title') or 'this task'} is not implemented in this snapshot."
            ),
        }

