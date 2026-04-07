import asyncio
import json
import re
from collections.abc import Sequence
from typing import Any

import google.generativeai as genai

from app.core.config import get_required_env

EMBED_MODEL = "models/text-embedding-004"
CHAT_MODEL = "gemini-2.0-flash"


def _configure_gemini() -> None:
    genai.configure(api_key=get_required_env("GEMINI_API_KEY"))


def _extract_response_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if text:
        return str(text).strip()

    candidates = getattr(response, "candidates", None) or []
    parts: list[str] = []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                parts.append(str(part_text))
    return "\n".join(parts).strip()


def parse_json_payload(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


async def embed_text(
    text: str,
    *,
    task_type: str = "RETRIEVAL_QUERY",
) -> list[float]:
    def _embed() -> list[float]:
        _configure_gemini()
        response = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type=task_type,
        )
        if isinstance(response, dict):
            return list(response.get("embedding", []))
        return list(getattr(response, "embedding", []) or [])

    return await asyncio.to_thread(_embed)


async def embed_texts(
    texts: Sequence[str],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    def _embed_many() -> list[list[float]]:
        _configure_gemini()
        results: list[list[float]] = []
        for item in texts:
            response = genai.embed_content(
                model=EMBED_MODEL,
                content=item,
                task_type=task_type,
            )
            if isinstance(response, dict):
                results.append(list(response.get("embedding", [])))
            else:
                results.append(list(getattr(response, "embedding", []) or []))
        return results

    return await asyncio.to_thread(_embed_many)


async def generate_json(prompt: str) -> dict[str, Any]:
    def _generate() -> dict[str, Any]:
        _configure_gemini()
        model = genai.GenerativeModel(CHAT_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return parse_json_payload(_extract_response_text(response))

    return await asyncio.to_thread(_generate)

