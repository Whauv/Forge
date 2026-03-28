from fastapi import APIRouter

router = APIRouter(prefix="/run", tags=["run"])


@router.post("/")
async def run() -> dict[str, str]:
    return {"status": "run route ready"}

