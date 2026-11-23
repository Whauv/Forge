"""Characterization tests for IngestAgent.run (raw_text path, no network)."""

from app.agents.ingest_agent import IngestAgent


async def test_run_with_raw_text_stores_chunks(mock_gemini, mock_supabase, mock_qdrant):
    payload = {
        "project_id": "proj-1",
        "raw_text": "# Title\n\nSome content paragraph.\n\n## Section\n\nMore content.",
    }

    result = await IngestAgent().run(payload)

    assert result["status"] == "success"
    assert result["project_id"] == "proj-1"
    assert result["chunks_stored"] >= 1
    mock_qdrant.upsert.assert_called()  # vectors persisted


async def test_run_without_any_source_returns_error(mock_gemini, mock_supabase, mock_qdrant):
    result = await IngestAgent().run({"project_id": "proj-1"})

    assert result["status"] == "error"
    assert "At least one of repo_url" in result["message"]


async def test_run_whitespace_only_text_has_no_content(mock_gemini, mock_supabase, mock_qdrant):
    result = await IngestAgent().run({"project_id": "proj-1", "raw_text": "    \n   "})

    assert result["status"] == "error"
    assert "No ingestible content" in result["message"]


def test_detect_language_maps_extensions():
    agent = IngestAgent.__new__(IngestAgent)
    assert agent._detect_language("a.py") == "python"
    assert agent._detect_language("a.ts") == "typescript"
    assert agent._detect_language("a.unknown") == "text"
