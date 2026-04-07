from typing import Any


class FeedbackAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": "skipped",
            "message": "FeedbackAgent source is present, but solution template storage is not implemented in this snapshot.",
        }

