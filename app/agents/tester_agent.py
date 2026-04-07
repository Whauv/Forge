from typing import Any


class TesterAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {
            "status": "needs_human_review",
            "test_output": "",
            "error": "TesterAgent is scaffolded but not wired to E2B execution in this snapshot.",
            "attempts": 0,
        }

