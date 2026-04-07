from collections.abc import Iterable
from typing import Any

from app.db import qdrant_client
from app.db.supabase_client import supabase


class IngestAgent:
    async def run(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        project_id = str(payload.get("project_id") or "").strip()
        if not project_id:
            raise ValueError("project_id is required")

        await qdrant_client.create_collection(project_id)

        # This repository snapshot does not yet contain the full GitHub/doc ingestion
        # implementation, but we still provision the collection and mark the project as
        # known to the backend so downstream analysis has a stable entrypoint.
        project_patch = {
            "id": project_id,
            "name": payload.get("name") or f"Project {project_id[:8]}",
            "github_repo_url": payload.get("repo_url") or "https://github.com/example/repo",
            "doc_urls": list(_coerce_urls(payload.get("doc_urls"))),
            "problem_description": payload.get("raw_text"),
        }

        await _upsert_project_record(project_patch)

        return {
            "status": "success",
            "project_id": project_id,
            "chunks_stored": 0,
            "message": "Project collection initialized for future ingestion.",
        }


def _coerce_urls(value: Any) -> Iterable[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


async def _upsert_project_record(project_payload: dict[str, Any]) -> None:
    def _write() -> None:
        existing = (
            supabase.table("projects").select("id").eq("id", project_payload["id"]).limit(1).execute()
        )
        if getattr(existing, "data", None):
            supabase.table("projects").update(project_payload).eq("id", project_payload["id"]).execute()
        else:
            supabase.table("projects").insert(project_payload).execute()

    import asyncio

    await asyncio.to_thread(_write)

