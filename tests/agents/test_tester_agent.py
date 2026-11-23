"""Characterization tests for TesterAgent.run retry/branch logic.

``_run_in_sandbox`` (e2b) and the inner CoderAgent are patched so the state
machine in ``run`` is exercised deterministically.
"""

from unittest.mock import AsyncMock

import pytest

# Import via the module (not `from ... import TesterAgent`) so pytest does not
# try to collect the agent class as a test class (its name matches Test*).
from app.agents import tester_agent as ta

MAX_RETRIES = ta.MAX_RETRIES
Tester = ta.TesterAgent


@pytest.fixture
def patch_coder(monkeypatch):
    """Patch the CoderAgent constructed inside TesterAgent.run."""
    coder = AsyncMock()

    def _factory(*args, **kwargs):
        return coder

    monkeypatch.setattr(ta, "CoderAgent", _factory)
    return coder


def _payload() -> dict:
    return {"project_id": "p1", "task": {"id": "t1"}, "diffs": [], "test_code": "x"}


async def test_passes_on_first_attempt(monkeypatch, patch_coder):
    monkeypatch.setattr(
        Tester,
        "_run_in_sandbox",
        lambda self, payload: {"status": "passed", "test_output": "ok", "error": None},
    )

    result = await Tester().run(_payload())

    assert result == {"status": "passed", "test_output": "ok", "error": None, "attempts": 1}


async def test_exhausts_retries_to_human_review(monkeypatch, patch_coder):
    monkeypatch.setattr(
        Tester,
        "_run_in_sandbox",
        lambda self, payload: {"status": "failed", "test_output": "out", "error": "boom"},
    )
    patch_coder.run.return_value = {"diffs": [], "test_code": "y", "project_id": "p1", "task": {}}

    result = await Tester().run(_payload())

    assert result["status"] == "needs_human_review"
    assert result["attempts"] == MAX_RETRIES


async def test_coder_error_during_retry_returns_failed(monkeypatch, patch_coder):
    monkeypatch.setattr(
        Tester,
        "_run_in_sandbox",
        lambda self, payload: {"status": "failed", "test_output": "out", "error": "boom"},
    )
    patch_coder.run.return_value = {"status": "error", "message": "coder blew up"}

    result = await Tester().run(_payload())

    assert result["status"] == "failed"
    assert result["error"] == "coder blew up"
    assert result["attempts"] == 1
