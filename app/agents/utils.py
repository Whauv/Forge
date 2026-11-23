import asyncio
from collections.abc import Sequence
from typing import Any

import google.generativeai as genai

from app.core.config import get_required_env
from app.core.json_stream import extract_json_object

EMBED_MODEL = "models/text-embedding-004"
CHAT_MODEL = "gemini-2.0-flash"


def _configure_gemini() -> None:
    genai.configure(api_key=get_required_env("GEMINI_API_KEY"))


def get_model(model_name: str = CHAT_MODEL) -> "genai.GenerativeModel":
    """Configure Gemini and return a chat model (used for one-shot + streaming)."""
    _configure_gemini()
    return genai.GenerativeModel(model_name)


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
    # Single JSON extractor shared with the agents (fences + object extraction).
    return extract_json_object(text)


def _embedding_from_response(response: Any) -> list[float]:
    if isinstance(response, dict):
        embedding = list(response.get("embedding", []))
    else:
        embedding = list(getattr(response, "embedding", []) or [])
    if not embedding:
        raise ValueError("Gemini returned an empty embedding.")
    return embedding


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
        return _embedding_from_response(response)

    return await asyncio.to_thread(_embed)


async def embed_texts(
    texts: Sequence[str],
    *,
    task_type: str = "RETRIEVAL_DOCUMENT",
) -> list[list[float]]:
    def _embed_many() -> list[list[float]]:
        _configure_gemini()
        return [
            _embedding_from_response(
                genai.embed_content(model=EMBED_MODEL, content=item, task_type=task_type)
            )
            for item in texts
        ]

    return await asyncio.to_thread(_embed_many)


async def generate_text(prompt: str) -> str:
    """Run a one-shot JSON-mode generation and return the raw response text.

    Callers that need their own validation / error messages parse this text
    themselves (e.g. via ``extract_json_object`` + a pydantic model).
    """

    def _generate() -> str:
        model = get_model()
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return _extract_response_text(response)

    return await asyncio.to_thread(_generate)


async def generate_json(prompt: str) -> dict[str, Any]:
    return parse_json_payload(await generate_text(prompt))

