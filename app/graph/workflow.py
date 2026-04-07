import json
from typing import Any, AsyncIterator, Literal
from typing_extensions import NotRequired, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.analysis_agent import AnalysisAgent
from app.agents.architect_agent import ArchitectAgent
from app.agents.coder_agent import CoderAgent
from app.agents.deploy_agent import DeployAgent
from app.agents.feedback_agent import FeedbackAgent
from app.agents.ingest_agent import IngestAgent
from app.agents.tester_agent import TesterAgent


class AgentState(TypedDict):
    project_id: str
    repo_url: str
    user_query: str
    analysis: dict[str, Any]
    task_graph: dict[str, Any]
    current_task_index: int
    current_diffs: dict[str, Any]
    test_result: dict[str, Any]
    deployment_result: dict[str, Any]
    status: str
    error: str | None
    doc_urls: NotRequired[list[str]]
    raw_text: NotRequired[str]


async def ingest_node(state: AgentState) -> AgentState:
    try:
        result = await IngestAgent().run(
            {
                "project_id": state["project_id"],
                "repo_url": state.get("repo_url"),
                "doc_urls": state.get("doc_urls"),
                "raw_text": state.get("raw_text"),
            }
        )
        if result.get("status") == "error":
            return _with_error(state, result["message"])
        return {**state, "status": "ingested", "error": None}
    except Exception as exc:
        return _with_error(state, str(exc))


async def analysis_node(state: AgentState) -> AgentState:
    try:
        result = await AnalysisAgent().run(
            {"project_id": state["project_id"], "user_query": state["user_query"]}
        )
        if result.get("status") == "error":
            return _with_error(state, result["message"])
        return {**state, "analysis": result, "status": "analyzed", "error": None}
    except Exception as exc:
        return _with_error(state, str(exc))


async def architect_node(state: AgentState) -> AgentState:
    try:
        result = await ArchitectAgent().run(state["project_id"], state.get("analysis", {}))
        if result.get("status") == "error":
            return _with_error(state, result["message"])
        task_graph = {**result, "approved_diffs": []}
        return {
            **state,
            "task_graph": task_graph,
            "current_task_index": 0,
            "status": "architected",
            "error": None,
        }
    except Exception as exc:
        return _with_error(state, str(exc))


async def coder_node(state: AgentState) -> AgentState:
    try:
        current_task = _get_current_task(state)
        if not current_task:
            return _with_error(state, "No current task available for coder node.")

        result = await CoderAgent().run(
            {"project_id": state["project_id"], "task": current_task}
        )
        if result.get("status") == "error":
            return _with_error(state, result["message"])

        task_graph = dict(state.get("task_graph", {}))
        approved_diffs = list(task_graph.get("approved_diffs", []))
        approved_diffs.extend(result.get("diffs", []))
        task_graph["approved_diffs"] = approved_diffs

        return {
            **state,
            "current_diffs": result,
            "task_graph": task_graph,
            "status": "coded",
            "error": None,
        }
    except Exception as exc:
        return _with_error(state, str(exc))


async def tester_node(state: AgentState) -> AgentState:
    try:
        result = await TesterAgent().run(state.get("current_diffs", {}))
        if result.get("status") == "failed":
            return _with_error(state, result.get("error") or "Tester agent failed.")

        next_state: AgentState = {
            **state,
            "test_result": result,
            "status": result.get("status", "tested"),
            "error": None,
        }
        if result.get("status") == "passed":
            next_state["current_task_index"] = state.get("current_task_index", 0) + 1
        return next_state
    except Exception as exc:
        return _with_error(state, str(exc))


async def deploy_node(state: AgentState) -> AgentState:
    try:
        tasks = state.get("task_graph", {}).get("tasks", [])
        approved_diffs = state.get("task_graph", {}).get("approved_diffs", [])
        current_task = tasks[-1] if tasks else {}
        result = await DeployAgent().run(
            {
                "project_id": state["project_id"],
                "repo_url": state.get("repo_url"),
                "approved_diffs": approved_diffs,
                "task_id": current_task.get("id"),
                "task_title": current_task.get("title") or "AI-FDE deployment",
                "pain_points": state.get("analysis", {}).get("pain_points"),
                "proposed_solution": state.get("analysis", {}).get("proposed_solution"),
                "test_results_summary": _summarize_test_result(state.get("test_result", {})),
            }
        )
        if result.get("status") == "error":
            return _with_error(state, result["message"])
        return {
            **state,
            "deployment_result": result,
            "status": "deployed",
            "error": None,
        }
    except Exception as exc:
        return _with_error(state, str(exc))


async def feedback_node(state: AgentState) -> AgentState:
    try:
        result = await FeedbackAgent().run(
            {
                "project_id": state["project_id"],
                "analysis": state.get("analysis", {}),
                "tasks": state.get("task_graph", {}).get("tasks", []),
                "diffs": state.get("task_graph", {}).get("approved_diffs", []),
                "test_results": state.get("test_result", {}),
            }
        )
        if result.get("status") == "error":
            return _with_error(state, result["message"])
        return {**state, "status": "completed", "error": None}
    except Exception as exc:
        return _with_error(state, str(exc))


def _with_error(state: AgentState, message: str) -> AgentState:
    return {**state, "status": "error", "error": message}


def _get_current_task(state: AgentState) -> dict[str, Any] | None:
    tasks = state.get("task_graph", {}).get("tasks", [])
    index = state.get("current_task_index", 0)
    if index < 0 or index >= len(tasks):
        return None
    return tasks[index]


def _next_after_ingest(state: AgentState) -> Literal["analysis", "__end__"]:
    return END if state.get("error") else "analysis"


def _next_after_analysis(state: AgentState) -> Literal["architect", "__end__"]:
    return END if state.get("error") else "architect"


def _next_after_architect(state: AgentState) -> Literal["coder", "__end__"]:
    return END if state.get("error") else "coder"


def _next_after_coder(state: AgentState) -> Literal["tester", "__end__"]:
    return END if state.get("error") else "tester"


def _next_after_tester(state: AgentState) -> Literal["coder", "deploy", "__end__"]:
    if state.get("error"):
        return END
    if state.get("status") == "needs_human_review":
        return END

    tasks = state.get("task_graph", {}).get("tasks", [])
    if state.get("status") == "passed" and state.get("current_task_index", 0) < len(tasks):
        return "coder"
    if state.get("status") == "passed":
        return "deploy"
    return END


def _next_after_deploy(state: AgentState) -> Literal["feedback", "__end__"]:
    return END if state.get("error") else "feedback"


def _next_after_feedback(state: AgentState) -> Literal["__end__"]:
    return END


def build_workflow():
    graph = StateGraph(AgentState)
    graph.add_node("ingest", ingest_node)
    graph.add_node("analysis", analysis_node)
    graph.add_node("architect", architect_node)
    graph.add_node("coder", coder_node)
    graph.add_node("tester", tester_node)
    graph.add_node("deploy", deploy_node)
    graph.add_node("feedback", feedback_node)

    graph.set_entry_point("ingest")
    graph.add_conditional_edges("ingest", _next_after_ingest)
    graph.add_conditional_edges("analysis", _next_after_analysis)
    graph.add_conditional_edges("architect", _next_after_architect)
    graph.add_conditional_edges("coder", _next_after_coder)
    graph.add_conditional_edges("tester", _next_after_tester)
    graph.add_conditional_edges("deploy", _next_after_deploy)
    graph.add_conditional_edges("feedback", _next_after_feedback)

    return graph.compile()


async def run_workflow(input_payload: dict[str, Any]) -> AsyncIterator[str]:
    initial_state: AgentState = {
        "project_id": input_payload.get("project_id", ""),
        "repo_url": input_payload.get("repo_url", ""),
        "user_query": input_payload.get("user_query", ""),
        "analysis": {},
        "task_graph": {},
        "current_task_index": 0,
        "current_diffs": {},
        "test_result": {},
        "deployment_result": {},
        "status": "initialized",
        "error": None,
    }
    if "doc_urls" in input_payload:
        initial_state["doc_urls"] = input_payload["doc_urls"]
    if "raw_text" in input_payload:
        initial_state["raw_text"] = input_payload["raw_text"]

    graph = build_workflow()
    async for update in graph.astream(initial_state, stream_mode="updates"):
        yield json.dumps(update, default=str)


def _summarize_test_result(test_result: dict[str, Any]) -> str:
    if not test_result:
        return "No test results recorded."
    return (
        f"status={test_result.get('status')}; "
        f"attempts={test_result.get('attempts')}; "
        f"error={test_result.get('error')}"
    )
