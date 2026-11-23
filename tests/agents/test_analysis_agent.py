"""Characterization tests for AnalysisAgent.run output contract."""

import json
from types import SimpleNamespace

from app.agents.analysis_agent import AnalysisAgent

VALID_ANALYSIS = {
    "pain_points": ["slow queries"],
    "root_cause": "n+1 queries",
    "proposed_solution": "add eager loading",
    "effort_estimate": "M",
    "clarifying_question": None,
}


async def test_run_returns_validated_analysis(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []  # empty RAG context, no template
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(VALID_ANALYSIS), candidates=[]
    )

    result = await AnalysisAgent().run({"project_id": "p1", "user_query": "why slow?"})

    assert result == VALID_ANALYSIS
    assert "status" not in result  # success path returns the analysis directly


async def test_run_invalid_json_returns_error_contract(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []
    # Braces present but malformed -> JSONDecodeError inside _parse_and_validate,
    # which wraps it with the agent-specific message.
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text='{"pain_points": [}', candidates=[]
    )

    result = await AnalysisAgent().run({"project_id": "p1", "user_query": "why slow?"})

    assert result["status"] == "error"
    assert "Invalid analysis JSON" in result["message"]


async def test_run_non_json_text_returns_error(mock_gemini, mock_supabase, mock_qdrant):
    # No braces at all -> extract_json_object raises its own ValueError, which
    # surfaces unwrapped through run()'s outer handler.
    mock_qdrant.search.return_value = []
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text="totally not json", candidates=[]
    )

    result = await AnalysisAgent().run({"project_id": "p1", "user_query": "q"})

    assert result["status"] == "error"


async def test_run_schema_violation_returns_error(mock_gemini, mock_supabase, mock_qdrant):
    mock_qdrant.search.return_value = []
    bad = {**VALID_ANALYSIS, "effort_estimate": "XL"}  # fails pattern ^(S|M|L)$
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text=json.dumps(bad), candidates=[]
    )

    result = await AnalysisAgent().run({"project_id": "p1", "user_query": "q"})

    assert result["status"] == "error"


async def test_run_missing_payload_key_returns_error(mock_gemini, mock_supabase, mock_qdrant):
    result = await AnalysisAgent().run({"project_id": "p1"})  # no user_query
    assert result["status"] == "error"
