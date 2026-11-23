"""Server-Sent Events framing helpers.

Centralizes the ``data: <payload>\\n\\n`` wire format that was hand-written in
``app.main`` and ``app.api.routes.analyze``.
"""

import json
from typing import Any


def sse_event(payload: Any) -> str:
    """Frame a payload as one SSE ``data:`` event.

    A ``str`` payload is sent verbatim (it is already-serialized JSON); anything
    else is JSON-encoded first.
    """
    data = payload if isinstance(payload, str) else json.dumps(payload)
    return f"data: {data}\n\n"


def sse_error(message: str) -> str:
    """Frame a standard ``{"status": "error", "message": ...}`` SSE event."""
    return sse_event({"status": "error", "message": message})
