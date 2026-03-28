import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.routes.analyze import router as analyze_router
from app.api.routes.deploy import router as deploy_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.run import router as run_router
from app.graph.workflow import run_workflow

app = FastAPI(title="AI Forward Deployed Engineer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(analyze_router)
app.include_router(run_router)
app.include_router(deploy_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class WorkflowRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    repo_url: str | None = None
    user_query: str | None = None
    doc_urls: list[str] | None = None
    raw_text: str | None = None


@app.post("/workflow")
async def workflow(payload: WorkflowRequest) -> StreamingResponse:
    async def event_stream():
        try:
            async for update in run_workflow(payload.model_dump(exclude_none=True)):
                yield f"data: {update}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'status': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
