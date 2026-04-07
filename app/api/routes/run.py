from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.api.schemas import RunRequest, StatusResponse

router = APIRouter(prefix="/run", tags=["run"])


@router.post("/")
async def run(payload: RunRequest) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content=StatusResponse(
            status="not_implemented",
            message=(
                "The run route is reserved for the coder/tester pipeline and is not "
                "yet connected to executable agent implementations."
            ),
        ).model_dump(),
    )
