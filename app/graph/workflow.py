import json
from typing import Any, TypedDict

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


async def ingest_node(state: AgentState) -> AgentState:
    try:
        result = await IngestAgent().run({"project_id": state["project_id"], "repo_url": state["repo_url"]})
        return {**state, "status": result.get("status", "ingested")}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def analysis_node(state: AgentState) -> AgentState:
    try:
        analysis = await AnalysisAgent().run(
            {"project_id": state["project_id"], "user_query": state["user_query"]}
        )
        return {**state, "analysis": analysis, "status": "analyzed"}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def architect_node(state: AgentState) -> AgentState:
    try:
        task_graph = await ArchitectAgent().run(
            {"project_id": state["project_id"], "analysis": state["analysis"]}
        )
        return {
            **state,
            "task_graph": task_graph,
            "current_task_index": 0,
            "status": "planned",
        }
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def coder_node(state: AgentState) -> AgentState:
    try:
        tasks = state.get("task_graph", {}).get("tasks", [])
        current_task = tasks[state.get("current_task_index", 0)] if tasks else {}
        result = await CoderAgent().run({"project_id": state["project_id"], "task": current_task})
        return {**state, "current_diffs": result, "status": result.get("status", "coded")}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def tester_node(state: AgentState) -> AgentState:
    try:
        result = await TesterAgent().run(state.get("current_diffs", {}))
        return {**state, "test_result": result, "status": result.get("status", "tested")}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def deploy_node(state: AgentState) -> AgentState:
    try:
        result = await DeployAgent().run(
            {"project_id": state["project_id"], "approved_diffs": state.get("current_diffs", {}).get("diffs", [])}
        )
        return {**state, "deployment_result": result, "status": result.get("status", "deployed")}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


async def feedback_node(state: AgentState) -> AgentState:
    try:
        result = await FeedbackAgent().run(state)
        return {**state, "status": result.get("status", state["status"])}
    except Exception as exc:
        return {**state, "status": "failed", "error": str(exc)}


def _after_test(state: AgentState) -> str:
    if state.get("error"):
        return END
    status = (state.get("test_result") or {}).get("status")
    if status == "needs_human_review":
        return END
    tasks = state.get("task_graph", {}).get("tasks", [])
    next_index = state.get("current_task_index", 0) + 1
    if status == "passed" and next_index < len(tasks):
        state["current_task_index"] = next_index
        return "coder"
    if status == "passed":
        return "deploy"
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
    graph.add_edge("ingest", "analysis")
    graph.add_edge("analysis", "architect")
    graph.add_edge("architect", "coder")
    graph.add_edge("coder", "tester")
    graph.add_conditional_edges("tester", _after_test)
    graph.add_edge("deploy", "feedback")
    graph.add_edge("feedback", END)
    return graph.compile()


async def run_workflow(payload: dict[str, Any]):
    app = build_workflow()
    initial_state: AgentState = {
        "project_id": str(payload.get("project_id") or ""),
        "repo_url": str(payload.get("repo_url") or ""),
        "user_query": str(payload.get("user_query") or ""),
        "analysis": {},
        "task_graph": {},
        "current_task_index": 0,
        "current_diffs": {},
        "test_result": {},
        "deployment_result": {},
        "status": "pending",
        "error": None,
    }

    async for chunk in app.astream(initial_state):
        yield json.dumps(chunk)
