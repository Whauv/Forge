from typing import Any
from urllib.parse import urlparse


def parse_github_repo_name(repo_url: str) -> str:
    parsed = urlparse(repo_url)
    path = parsed.path.strip("/")
    if path.endswith(".git"):
        path = path[:-4]
    parts = [part for part in path.split("/") if part]
    if len(parts) < 2:
        raise ValueError("repo_url must point to a valid GitHub repository.")
    return "/".join(parts[:2])


def infer_project_name(repo_url: str) -> str:
    repo_name = parse_github_repo_name(repo_url).split("/")[-1]
    return repo_name.replace("-", " ").replace("_", " ").title()


def normalize_code_artifact_rows(rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "file_path": str(row.get("file_path") or ""),
                "diff": str(row.get("unified_diff") or ""),
                "explanation": str(row.get("explanation") or ""),
            }
        )
    return normalized
