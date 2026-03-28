import json
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.analysis_agent import AnalysisAgent
from app.agents.architect_agent import ArchitectAgent

router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    user_query: str = Field(..., min_length=1)


def _sse_event(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("")
async def analyze(payload: AnalyzeRequest) -> StreamingResponse:
    async def event_stream():
        analysis_agent = AnalysisAgent()
        architect_agent = ArchitectAgent()

        try:
            analysis_result: dict[str, Any] | None = None
            async for event in analysis_agent.stream(payload.model_dump()):
                if event["field"] == "_final":
                    analysis_result = event["value"]
                    continue
                yield _sse_event(
                    "analysis",
                    {"field": event["field"], "value": event["value"]},
                )

            if analysis_result is None:
                raise ValueError("Analysis agent did not return a final result.")

            async for event in architect_agent.stream(payload.project_id, analysis_result):
                if event["field"] == "_final":
                    yield _sse_event("done", event["value"])
                    continue
                yield _sse_event(
                    "architect",
                    {"field": event["field"], "value": event["value"]},
                )
        except Exception as exc:
            yield _sse_event("error", {"status": "error", "message": str(exc)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
