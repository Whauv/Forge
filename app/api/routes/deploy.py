from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.api.schemas import DeployRequest, StatusResponse

router = APIRouter(prefix="/deploy", tags=["deploy"])


@router.post("/")
async def deploy(payload: DeployRequest) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content=StatusResponse(
            status="not_implemented",
            message=(
                "Deployment orchestration is planned, but the GitHub/feedback agent "
                "execution layer is not present in this repository snapshot."
            ),
        ).model_dump(),
    )

