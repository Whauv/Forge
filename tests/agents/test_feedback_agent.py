"""Characterization tests for FeedbackAgent.run and template building."""

from app.agents.feedback_agent import FeedbackAgent

PROJECT_RECORD = {
    "analysis": {
        "pain_points": ["performance is bad"],
        "proposed_solution": "cache results",
    },
    "tasks": [{"task_id": "t1"}],
    "diffs": [{"file_path": "app/main.py"}, {"file_path": "web/app.tsx"}],
    "test_results": {"status": "passed"},
}


async def test_run_success_returns_template_id(mock_gemini, mock_qdrant):
    result = await FeedbackAgent().run(PROJECT_RECORD)

    assert result["status"] == "success"
    assert "template_id" in result


async def test_run_embedding_failure_returns_error(mock_gemini, mock_qdrant):
    mock_gemini.embed_content.return_value = {}  # no "embedding" key -> raises

    result = await FeedbackAgent().run(PROJECT_RECORD)

    assert result["status"] == "error"


def test_build_template_classifies_problem_and_stack():
    agent = FeedbackAgent.__new__(FeedbackAgent)  # skip __init__ (no gemini needed)
    template = agent._build_template(PROJECT_RECORD)

    assert template["problem_type"] == "performance_issue"
    assert template["tech_stack"] == ["python", "react"]
    assert template["solution_summary"] == "cache results"
    assert template["success"] is True


def test_extract_problem_type_defaults_when_empty():
    agent = FeedbackAgent.__new__(FeedbackAgent)
    assert agent._extract_problem_type([]) == "general_application_issue"
