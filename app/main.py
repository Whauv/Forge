from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analyze import router as analyze_router
from app.api.routes.deploy import router as deploy_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.run import router as run_router

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
