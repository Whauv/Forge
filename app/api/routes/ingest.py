from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.api.schemas import IngestRequest, StatusResponse

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/")
async def ingest(payload: IngestRequest) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content=StatusResponse(
            status="not_implemented",
            message=(
                "The backend ingest pipeline is scaffolded but not wired to agent "
                "execution in this local repository snapshot."
            ),
        ).model_dump(),
    )
