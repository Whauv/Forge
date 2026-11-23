"""Characterization tests for DeployAgent.run (GitHub client mocked)."""

import re
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.agents.deploy_agent import DeployAgent


def _configure_repo() -> MagicMock:
    repo = MagicMock(name="repo")
    repo.default_branch = "develop"
    repo.get_branch.return_value.commit.sha = "basesha"
    # Force the "file does not exist" path so create_file is used.
    repo.get_contents.side_effect = Exception("not found")
    repo.create_file.return_value = {"commit": SimpleNamespace(sha="commit-1")}
    repo.create_pull.return_value = SimpleNamespace(html_url="https://github.com/x/pr/1")
    return repo


async def test_run_creates_pr_and_returns_links(mock_supabase):
    agent = DeployAgent()
    repo = _configure_repo()
    agent.github_client = MagicMock()
    agent.github_client.get_repo.return_value = repo

    payload = {
        "project_id": "proj1234567",
        "repo_url": "https://github.com/acme/widget",
        "task_title": "Add feature",
        "approved_diffs": [
            {"file_path": "app/new.py", "diff": "FULL_CONTENT:\nprint('hi')\n"}
        ],
    }

    result = await agent.run(payload)

    assert result["pr_url"] == "https://github.com/x/pr/1"
    assert result["commit_sha"] == "commit-1"
    # Branch is unique per run: "ai-fde/<project[:8]>-<suffix>".
    assert re.fullmatch(r"ai-fde/proj1234-[0-9a-f]{8}", result["branch"])

    repo.create_pull.assert_called_once()
    # PR is opened against the repo's real default branch, not hardcoded "main".
    assert repo.create_pull.call_args.kwargs["base"] == "develop"
    mock_supabase.table.assert_any_call("deployments")


async def test_run_missing_repo_url_returns_error(mock_supabase):
    agent = DeployAgent()
    result = await agent.run({"project_id": "p1", "approved_diffs": []})

    assert result["status"] == "error"
    assert "repo_url is required" in result["message"]
