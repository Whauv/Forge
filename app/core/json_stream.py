import json
import re
from typing import Any


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        raise ValueError("Model did not return a JSON object.")

    return json.loads(match.group(0))


def extract_string_field(buffer: str, field_name: str) -> str | None:
    pattern = rf'"{field_name}"\s*:\s*"((?:\\.|[^"\\])*)"'
    match = re.search(pattern, buffer, re.DOTALL)
    if not match:
        return None
    return json.loads(f'"{match.group(1)}"')


def extract_nullable_string_field(buffer: str, field_name: str) -> str | None | object:
    null_pattern = rf'"{field_name}"\s*:\s*null'
    if re.search(null_pattern, buffer):
        return None
    return extract_string_field(buffer, field_name)


def extract_array_field(buffer: str, field_name: str) -> list[Any] | None:
    pattern = rf'"{field_name}"\s*:\s*(\[[\s\S]*?\])'
    match = re.search(pattern, buffer, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
