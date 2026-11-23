"""Shared pytest fixtures for the Forge backend test suite.

Two responsibilities:

1. Set dummy environment variables *before any ``app`` module is imported*.
   Several modules (e.g. ``app.db.supabase_client``) build clients at import
   time via ``get_settings()``, so the environment must be populated during
   collection or the import itself raises. (Moving these off import time is a
   Phase 2 task; until then this keeps the suite runnable.)

2. Provide opt-in fixtures that mock the external services — Gemini, Supabase
   and Qdrant — so tests never touch the network.
"""

from __future__ import annotations

import os
from types import SimpleNamespace
from typing import Any
from unittest.mock import MagicMock

import pytest

# --- 1. Environment defaults (must run at import, before app modules load) ---

_ENV_DEFAULTS = {
    "GEMINI_API_KEY": "test-gemini-key",
    "QDRANT_URL": "http://localhost:6333",
    "QDRANT_API_KEY": "test-qdrant-key",
    "SUPABASE_URL": "http://localhost:54321",
    "SUPABASE_KEY": "test-supabase-key",
    "GITHUB_TOKEN": "test-github-token",
    "E2B_API_KEY": "test-e2b-key",
    "FIRECRAWL_API_KEY": "test-firecrawl-key",
}

for _key, _value in _ENV_DEFAULTS.items():
    os.environ.setdefault(_key, _value)


# --- 2. Service mock fixtures -------------------------------------------------


def _make_supabase_response(data: Any = None) -> SimpleNamespace:
    """Mimic the ``.data`` attribute shape every caller reads via getattr."""
    return SimpleNamespace(data=data if data is not None else [])


@pytest.fixture
def supabase_response():
    """Factory for fake Supabase responses: ``supabase_response([{...}])``."""
    return _make_supabase_response


@pytest.fixture
def mock_gemini(monkeypatch):
    """Patch ``google.generativeai`` so no agent makes a real model call.

    Returns a namespace with the ``model`` mock and the ``embed_content`` mock
    so individual tests can set ``return_value``/``side_effect``.
    """
    import google.generativeai as genai

    model = MagicMock(name="GenerativeModel")
    model.generate_content.return_value = SimpleNamespace(text="{}", candidates=[])

    monkeypatch.setattr(genai, "configure", MagicMock(), raising=False)
    monkeypatch.setattr(genai, "GenerativeModel", MagicMock(return_value=model), raising=False)

    embed_content = MagicMock(return_value={"embedding": [0.0] * 768})
    monkeypatch.setattr(genai, "embed_content", embed_content, raising=False)

    return SimpleNamespace(model=model, embed_content=embed_content)


@pytest.fixture
def mock_supabase(monkeypatch):
    """Patch the module-level Supabase client used by ``app.db.supabase_client``."""
    from app.db import supabase_client

    client = MagicMock(name="SupabaseClient")
    monkeypatch.setattr(supabase_client, "supabase", client, raising=False)
    return client


@pytest.fixture
def mock_qdrant(monkeypatch):
    """Patch the module-level Qdrant client used by ``app.db.qdrant_client``."""
    from app.db import qdrant_client as qdrant_module

    client = MagicMock(name="QdrantClient")
    # The module shadows the package name: the client instance is the
    # module-level ``qdrant_client`` attribute.
    monkeypatch.setattr(qdrant_module, "qdrant_client", client, raising=False)
    return client
