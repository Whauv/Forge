from fastapi import APIRouter

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/")
async def ingest() -> dict[str, str]:
    return {"status": "ingest route ready"}

