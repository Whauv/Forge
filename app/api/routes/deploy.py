from fastapi import APIRouter

router = APIRouter(prefix="/deploy", tags=["deploy"])


@router.post("/")
async def deploy() -> dict[str, str]:
    return {"status": "deploy route ready"}

