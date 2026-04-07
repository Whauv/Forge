import asyncio
from typing import Any

from app.agents.utils import embed_text, generate_json
from app.db.qdrant_client import search_vectors
from app.db.supabase_client import insert_task, supabase


class AnalysisAgent:
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        project_id = str(payload.get("project_id") or "").strip()
        user_query = str(payload.get("user_query") or "").strip()
        if not project_id or not user_query:
            raise ValueError("project_id and user_query are required")

        project = await _fetch_project(project_id)
        retrieved_chunks = await self._retrieve_context(project_id, user_query)
        prompt = _build_analysis_prompt(
            user_query=user_query,
            retrieved_chunks=retrieved_chunks,
            project=project,
        )

        try:
            result = await generate_json(prompt)
        except Exception:
            result = _fallback_analysis(
                project=project,
                user_query=user_query,
                chunks=retrieved_chunks,
            )

        validated = _validate_analysis(result)
        await insert_task(
            {
                "project_id": project_id,
                "title": f"Analysis summary: {user_query[:80]}",
                "description": (
                    f"Root cause: {validated['root_cause']}\n\n"
                    f"Proposed solution: {validated['proposed_solution']}"
                ),
                "status": "analyzed",
                "clarifying_question": validated["clarifying_question"],
            }
        )
        return validated

    async def stream_events(self, payload: dict[str, Any]):
        result = await self.run(payload)
        for pain_point in result["pain_points"]:
            yield {"type": "pain_point", "content": pain_point}
        yield {"type": "solution", "content": result["proposed_solution"]}
        if result["clarifying_question"]:
            yield {"type": "solution", "content": f"Open question: {result['clarifying_question']}"}

    async def _retrieve_context(self, project_id: str, user_query: str) -> list[str]:
        chunks: list[str] = []
        try:
            vector = await embed_text(user_query, task_type="RETRIEVAL_QUERY")
            hits = await search_vectors(project_id, vector, limit=10)
            for hit in hits:
                payload = getattr(hit, "payload", {}) or {}
                text = (
                    payload.get("text")
                    or payload.get("content")
                    or payload.get("chunk")
                    or payload.get("summary")
                )
                if text:
                    chunks.append(str(text))
        except Exception:
            return []
        return chunks


async def _fetch_project(project_id: str) -> dict[str, Any]:
    def _read() -> dict[str, Any]:
        response = supabase.table("projects").select("*").eq("id", project_id).limit(1).execute()
        data = getattr(response, "data", None) or []
        return data[0] if data else {}

    return await asyncio.to_thread(_read)


def _build_analysis_prompt(
    *,
    user_query: str,
    retrieved_chunks: list[str],
    project: dict[str, Any],
) -> str:
    project_summary = (
        f"Project: {project.get('name') or 'Unknown project'}\n"
        f"Repo: {project.get('github_repo_url') or 'Unknown'}\n"
        f"Problem description: {project.get('problem_description') or 'Not provided'}"
    )
    context_block = "\n\n".join(retrieved_chunks) if retrieved_chunks else "No vector context was found."
    return f"""
You are a senior Forward Deployed Engineer embedded at a client site.

Client project summary:
{project_summary}

Client's codebase context:
{context_block}

Client's problem statement:
{user_query}

Analyze the above and respond ONLY in this JSON format:
{{
  "pain_points": ["specific issue"],
  "root_cause": "one sentence root cause",
  "proposed_solution": "clear technical solution description",
  "effort_estimate": "S/M/L",
  "clarifying_question": "one question to ask if ambiguity exists, else null"
}}
""".strip()


def _validate_analysis(result: dict[str, Any]) -> dict[str, Any]:
    pain_points = result.get("pain_points")
    if not isinstance(pain_points, list) or not all(isinstance(item, str) for item in pain_points):
        raise ValueError("analysis response must contain a string list pain_points")

    root_cause = str(result.get("root_cause") or "").strip()
    proposed_solution = str(result.get("proposed_solution") or "").strip()
    effort_estimate = str(result.get("effort_estimate") or "").strip().upper()
    clarifying_question = result.get("clarifying_question")

    if not root_cause or not proposed_solution or effort_estimate not in {"S", "M", "L"}:
        raise ValueError("analysis response is missing required fields")

    if clarifying_question is not None:
        clarifying_question = str(clarifying_question).strip() or None

    return {
        "pain_points": [item.strip() for item in pain_points if item.strip()],
        "root_cause": root_cause,
        "proposed_solution": proposed_solution,
        "effort_estimate": effort_estimate,
        "clarifying_question": clarifying_question,
    }


def _fallback_analysis(
    *,
    project: dict[str, Any],
    user_query: str,
    chunks: list[str],
) -> dict[str, Any]:
    repo_url = str(project.get("github_repo_url") or "the repository")
    problem_description = str(project.get("problem_description") or "").strip()
    context_hint = chunks[0][:180] if chunks else "No indexed code context is available yet."
    return {
        "pain_points": [
            f"{repo_url} does not yet have a connected analysis pipeline for the requested question.",
            context_hint,
        ],
        "root_cause": "The repository workflow is partially scaffolded and lacks fully connected backend execution.",
        "proposed_solution": (
            "Complete the backend agent workflow, persist structured analysis results, "
            "and connect the frontend analysis stream to the live backend pipeline."
        ),
        "effort_estimate": "M" if problem_description else "S",
        "clarifying_question": None if problem_description else f"What specific outcome should this analysis focus on for '{user_query}'?",
    }
