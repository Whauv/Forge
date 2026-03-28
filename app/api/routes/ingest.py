from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agents.ingest_agent import IngestAgent

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    repo_url: str | None = None
    doc_urls: list[str] | None = None
    raw_text: str | None = None


@router.post("")
async def ingest(payload: IngestRequest) -> dict[str, Any]:
    try:
        return await IngestAgent().run(payload.model_dump())
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
