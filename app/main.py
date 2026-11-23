from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.api.routes.analyze import router as analyze_router
from app.api.routes.deploy import router as deploy_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.run import router as run_router
from app.api.schemas import WorkflowRequest
from app.core.sse import sse_error, sse_event
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


@app.post("/workflow")
async def workflow(payload: WorkflowRequest) -> StreamingResponse:
    async def event_stream():
        try:
            async for update in run_workflow(payload.model_dump(exclude_none=True)):
                yield sse_event(update)
        except Exception as exc:
            yield sse_error(str(exc))

    return StreamingResponse(event_stream(), media_type="text/event-stream")
