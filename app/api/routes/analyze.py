from fastapi import APIRouter, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.agents.analysis_agent import AnalysisAgent
from app.agents.architect_agent import ArchitectAgent
from app.api.schemas import AnalyzeRequest, StatusResponse
from app.core.sse import sse_event

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/")
async def analyze(payload: AnalyzeRequest) -> JSONResponse:
    try:
        analysis = await AnalysisAgent().run(
            {"project_id": payload.project_id, "user_query": payload.query}
        )
        if analysis.get("status") == "error":
            raise ValueError(str(analysis["message"]))

        task_graph = await ArchitectAgent().run(payload.project_id, analysis)
        if task_graph.get("status") == "error":
            raise ValueError(str(task_graph["message"]))

        return JSONResponse({"analysis": analysis, "task_graph": task_graph})
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=StatusResponse(status="error", message=str(exc)).model_dump(),
        )


@router.post("/stream")
async def analyze_stream(payload: AnalyzeRequest) -> StreamingResponse:
    async def event_stream():
        try:
            analysis = await AnalysisAgent().run(
                {"project_id": payload.project_id, "user_query": payload.query}
            )
            if analysis.get("status") == "error":
                raise ValueError(str(analysis["message"]))

            pain_points = analysis.get("pain_points", [])
            for pain_point in pain_points:
                yield sse_event({"type": "pain_point", "content": pain_point})

            yield sse_event(
                {"type": "solution", "content": analysis["proposed_solution"]}
            )

            if analysis.get("clarifying_question"):
                yield sse_event(
                    {
                        "type": "solution",
                        "content": f"Open question: {analysis['clarifying_question']}",
                    }
                )

            task_graph = await ArchitectAgent().run(payload.project_id, analysis)
            if task_graph.get("status") == "error":
                raise ValueError(str(task_graph["message"]))
            yield sse_event({"type": "task_graph", "content": task_graph})
        except Exception as exc:
            yield sse_event({"type": "error", "content": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
