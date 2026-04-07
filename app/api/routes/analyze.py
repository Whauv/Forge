import json

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse, StreamingResponse

from app.agents.analysis_agent import AnalysisAgent
from app.agents.architect_agent import ArchitectAgent
from app.api.schemas import AnalyzeRequest, StatusResponse

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/")
async def analyze(payload: AnalyzeRequest) -> JSONResponse:
    try:
        analysis = await AnalysisAgent().run(
            {"project_id": payload.project_id, "user_query": payload.query}
        )
        task_graph = await ArchitectAgent().run(
            {"project_id": payload.project_id, "analysis": analysis}
        )
        return JSONResponse({"analysis": analysis, "task_graph": task_graph})
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=StatusResponse(status="error", message=str(exc)).model_dump(),
        )


@router.post("/stream")
async def analyze_stream(payload: AnalyzeRequest) -> StreamingResponse:
    async def event_stream():
        analysis_agent = AnalysisAgent()
        try:
            analysis = await analysis_agent.run(
                {"project_id": payload.project_id, "user_query": payload.query}
            )
            for pain_point in analysis["pain_points"]:
                yield f"data: {json.dumps({'type': 'pain_point', 'content': pain_point})}\n\n"
            yield f"data: {json.dumps({'type': 'solution', 'content': analysis['proposed_solution']})}\n\n"
            if analysis["clarifying_question"]:
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "solution",
                            "content": f"Open question: {analysis['clarifying_question']}",
                        }
                    )
                    + "\n\n"
                )

            task_graph = await ArchitectAgent().run(
                {"project_id": payload.project_id, "analysis": analysis}
            )
            yield f"data: {json.dumps({'type': 'task_graph', 'content': task_graph})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
