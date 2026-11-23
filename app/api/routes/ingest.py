from typing import Any

from fastapi import APIRouter

from app.agents.ingest_agent import IngestAgent
from app.api.schemas import IngestRequest

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest(payload: IngestRequest) -> dict[str, Any]:
    try:
        return await IngestAgent().run(payload.model_dump())
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
