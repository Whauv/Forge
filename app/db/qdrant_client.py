import asyncio
from typing import Any, Sequence

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams

from app.core.config import get_required_env

QDRANT_URL = get_required_env("QDRANT_URL")
QDRANT_API_KEY = get_required_env("QDRANT_API_KEY")

qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def _collection_name(project_id: str) -> str:
    return f"project_{project_id}"


async def create_collection(project_id: str) -> None:
    await create_named_collection(_collection_name(project_id))


async def create_named_collection(collection_name: str) -> None:
    await _create_collection(collection_name)


async def create_solution_template_collection() -> None:
    await _create_collection("solution_templates")


async def _create_collection(collection_name: str) -> None:
    def _create() -> None:
        if qdrant_client.collection_exists(collection_name):
            return
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=768, distance=Distance.COSINE),
        )

    await asyncio.to_thread(_create)


async def upsert_vectors(project_id: str, points: Sequence[dict[str, Any]]) -> None:
    await upsert_vectors_for_collection(_collection_name(project_id), points)


async def upsert_vectors_for_collection(
    collection_name: str,
    points: Sequence[dict[str, Any]],
) -> None:
    point_structs = [PointStruct(**point) for point in points]

    def _upsert() -> None:
        qdrant_client.upsert(collection_name=collection_name, points=point_structs)

    await asyncio.to_thread(_upsert)


async def search_vectors(
    project_id: str,
    query_vector: Sequence[float],
    limit: int = 10,
) -> list[Any]:
    return await search_vectors_in_collection(
        _collection_name(project_id),
        query_vector,
        limit=limit,
    )


async def search_vectors_in_collection(
    collection_name: str,
    query_vector: Sequence[float],
    limit: int = 10,
    score_threshold: float | None = None,
) -> list[Any]:

    def _search() -> list[Any]:
        return qdrant_client.search(
            collection_name=collection_name,
            query_vector=list(query_vector),
            limit=limit,
            score_threshold=score_threshold,
        )

    return await asyncio.to_thread(_search)
