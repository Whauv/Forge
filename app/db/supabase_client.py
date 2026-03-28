import asyncio
from typing import Any

import httpx
from supabase import Client, create_client

from app.core.config import get_required_env

SUPABASE_URL = get_required_env("SUPABASE_URL")
SUPABASE_KEY = get_required_env("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class SupabaseTableHelper:
    def __init__(self, table_name: str) -> None:
        self.table_name = table_name

    async def insert(self, payload: dict[str, Any]) -> Any:
        return await asyncio.to_thread(
            lambda: supabase.table(self.table_name).insert(payload).execute()
        )

    async def select_by_id(self, record_id: str) -> Any:
        return await asyncio.to_thread(
            lambda: supabase.table(self.table_name).select("*").eq("id", record_id).execute()
        )

    async def select_by_field(self, field_name: str, value: Any) -> Any:
        return await asyncio.to_thread(
            lambda: supabase.table(self.table_name).select("*").eq(field_name, value).execute()
        )

    async def update_by_id(self, record_id: str, payload: dict[str, Any]) -> Any:
        return await asyncio.to_thread(
            lambda: supabase.table(self.table_name)
            .update(payload)
            .eq("id", record_id)
            .execute()
        )


projects = SupabaseTableHelper("projects")
tasks = SupabaseTableHelper("tasks")
code_artifacts = SupabaseTableHelper("code_artifacts")
deployments = SupabaseTableHelper("deployments")


async def insert_project(payload: dict[str, Any]) -> Any:
    return await projects.insert(payload)


async def select_project_by_id(record_id: str) -> Any:
    return await projects.select_by_id(record_id)


async def update_project_by_id(record_id: str, payload: dict[str, Any]) -> Any:
    return await projects.update_by_id(record_id, payload)


async def select_project_by_field(field_name: str, value: Any) -> Any:
    return await projects.select_by_field(field_name, value)


async def insert_task(payload: dict[str, Any]) -> Any:
    return await tasks.insert(payload)


async def select_task_by_id(record_id: str) -> Any:
    return await tasks.select_by_id(record_id)


async def select_task_by_field(field_name: str, value: Any) -> Any:
    return await tasks.select_by_field(field_name, value)


async def update_task_by_id(record_id: str, payload: dict[str, Any]) -> Any:
    return await tasks.update_by_id(record_id, payload)


async def insert_code_artifact(payload: dict[str, Any]) -> Any:
    return await code_artifacts.insert(payload)


async def select_code_artifact_by_id(record_id: str) -> Any:
    return await code_artifacts.select_by_id(record_id)


async def update_code_artifact_by_id(record_id: str, payload: dict[str, Any]) -> Any:
    return await code_artifacts.update_by_id(record_id, payload)


async def insert_deployment(payload: dict[str, Any]) -> Any:
    return await deployments.insert(payload)


async def select_deployment_by_id(record_id: str) -> Any:
    return await deployments.select_by_id(record_id)


async def update_deployment_by_id(record_id: str, payload: dict[str, Any]) -> Any:
    return await deployments.update_by_id(record_id, payload)


async def broadcast_project_update(
    project_id: str,
    event: str,
    payload: dict[str, Any],
) -> None:
    broadcast_url = f"{SUPABASE_URL.rstrip('/')}/realtime/v1/api/broadcast"
    message = {
        "messages": [
            {
                "topic": f"project_{project_id}",
                "event": event,
                "payload": payload,
            }
        ]
    }
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(broadcast_url, json=message, headers=headers)
        response.raise_for_status()
