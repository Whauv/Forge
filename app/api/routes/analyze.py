from fastapi import APIRouter

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/")
async def analyze() -> dict[str, str]:
    return {"status": "analyze route ready"}

