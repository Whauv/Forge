import asyncio
import json
import os
from typing import Any

from e2b_code_interpreter import Sandbox

from app.agents.coder_agent import CoderAgent
from app.core.config import get_required_env
from app.db.supabase_client import select_project_by_id

MAX_RETRIES = 3


class TesterAgent:
    def __init__(self) -> None:
        self.e2b_api_key = get_required_env("E2B_API_KEY")
        self.github_token = os.getenv("GITHUB_TOKEN")

    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        coder_agent = CoderAgent()
        current_payload = payload

        for attempt in range(1, MAX_RETRIES + 1):
            execution_result = await asyncio.to_thread(self._run_in_sandbox, current_payload)
            if execution_result["status"] == "passed":
                return {
                    "status": "passed",
                    "test_output": execution_result["test_output"],
                    "error": None,
                    "attempts": attempt,
                }

            if attempt == MAX_RETRIES:
                return {
                    "status": "needs_human_review",
                    "test_output": execution_result["test_output"],
                    "error": execution_result["error"],
                    "attempts": attempt,
                }

            retry_result = await coder_agent.run(
                {
                    "project_id": current_payload["project_id"],
                    "task": current_payload["task"],
                    "error_context": execution_result["error"] or execution_result["test_output"],
                }
            )
            if retry_result.get("status") == "error":
                return {
                    "status": "failed",
                    "test_output": execution_result["test_output"],
                    "error": retry_result["message"],
                    "attempts": attempt,
                }

            current_payload = retry_result

        return {
            "status": "needs_human_review",
            "test_output": "",
            "error": "Exceeded retry limit.",
            "attempts": MAX_RETRIES,
        }

    def _run_in_sandbox(self, payload: dict[str, Any]) -> dict[str, Any]:
        project = asyncio.run(self._load_project(payload["project_id"]))
        with Sandbox(api_key=self.e2b_api_key) as sandbox:
            setup_result = sandbox.run_code(
                self._build_setup_script(
                    project=project,
                    diffs=payload["diffs"],
                    github_token=self.github_token,
                )
            )
            setup_text = getattr(setup_result, "text", "") or ""
            setup_json = self._parse_sandbox_json(setup_text)
            if setup_json.get("status") != "ok":
                return {
                    "status": "failed",
                    "test_output": setup_json.get("stdout", ""),
                    "error": setup_json.get("error", "Sandbox setup failed."),
                }

            test_result = sandbox.run_code(self._build_test_script(payload["test_code"]))
            test_text = getattr(test_result, "text", "") or ""
            test_json = self._parse_sandbox_json(test_text)

            if test_json.get("status") == "passed":
                return {
                    "status": "passed",
                    "test_output": test_json.get("stdout", ""),
                    "error": None,
                }

            return {
                "status": "failed",
                "test_output": test_json.get("stdout", ""),
                "error": test_json.get("error") or test_json.get("stderr"),
            }

    async def _load_project(self, project_id: str) -> dict[str, Any]:
        response = await select_project_by_id(project_id)
        rows = getattr(response, "data", None) or []
        return rows[0] if rows else {}

    def _build_setup_script(
        self,
        project: dict[str, Any],
        diffs: list[dict[str, Any]],
        github_token: str | None,
    ) -> str:
        return f"""
import json
import os
import subprocess
from pathlib import Path

workspace = Path("/home/user/project")
workspace.mkdir(parents=True, exist_ok=True)
repo_url = {json.dumps(project.get("repo_url"))}
github_token = {json.dumps(github_token)}
diffs = {json.dumps(diffs)}

stdout_parts = []
stderr_parts = []

try:
    if repo_url:
        clone_url = repo_url
        if github_token and repo_url.startswith("https://github.com/"):
            clone_url = repo_url.replace("https://", f"https://{{github_token}}@", 1)
        if not any(workspace.iterdir()):
            result = subprocess.run(
                ["git", "clone", clone_url, str(workspace)],
                capture_output=True,
                text=True,
            )
            stdout_parts.append(result.stdout)
            stderr_parts.append(result.stderr)
            if result.returncode != 0:
                raise RuntimeError(result.stderr or "git clone failed")
    elif not (workspace / ".git").exists():
        result = subprocess.run(
            ["git", "init"],
            cwd=str(workspace),
            capture_output=True,
            text=True,
        )
        stdout_parts.append(result.stdout)
        stderr_parts.append(result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "git init failed")

    patch_file = workspace / "changes.patch"
    patch_file.write_text("\\n\\n".join(diff["diff"] for diff in diffs), encoding="utf-8")
    if patch_file.read_text(encoding="utf-8").strip():
        result = subprocess.run(
            ["git", "apply", "--reject", "--whitespace=nowarn", str(patch_file)],
            cwd=str(workspace),
            capture_output=True,
            text=True,
        )
        stdout_parts.append(result.stdout)
        stderr_parts.append(result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "git apply failed")

    requirements = workspace / "requirements.txt"
    if requirements.exists():
        result = subprocess.run(
            ["python", "-m", "pip", "install", "-r", str(requirements)],
            cwd=str(workspace),
            capture_output=True,
            text=True,
        )
        stdout_parts.append(result.stdout)
        stderr_parts.append(result.stderr)
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "pip install -r requirements.txt failed")

    print(json.dumps({{
        "status": "ok",
        "stdout": "\\n".join(part for part in stdout_parts if part),
        "stderr": "\\n".join(part for part in stderr_parts if part),
        "error": None,
    }}))
except Exception as exc:
    print(json.dumps({{
        "status": "failed",
        "stdout": "\\n".join(part for part in stdout_parts if part),
        "stderr": "\\n".join(part for part in stderr_parts if part),
        "error": str(exc),
    }}))
"""

    def _build_test_script(self, test_code: str) -> str:
        language = self._detect_test_language(test_code)
        third_party_imports = self._extract_python_packages(test_code) if language == "python" else []
        return f"""
import contextlib
import io
import json
import subprocess
from pathlib import Path

workspace = Path("/home/user/project")
workspace.mkdir(parents=True, exist_ok=True)
test_code = {json.dumps(test_code)}
language = {json.dumps(language)}
python_packages = {json.dumps(third_party_imports)}

stdout_buffer = io.StringIO()
stderr_buffer = io.StringIO()

try:
    if python_packages:
        missing_packages = []
        for package in python_packages:
            check_result = subprocess.run(
                ["python", "-c", f"import importlib; importlib.import_module('{{package}}')"],
                cwd=str(workspace),
                capture_output=True,
                text=True,
            )
            if check_result.returncode != 0:
                missing_packages.append(package)

        if missing_packages:
            install_result = subprocess.run(
                ["python", "-m", "pip", "install", *missing_packages],
                cwd=str(workspace),
                capture_output=True,
                text=True,
            )
            stdout_buffer.write(install_result.stdout)
            stderr_buffer.write(install_result.stderr)
            if install_result.returncode != 0:
                raise RuntimeError(install_result.stderr or "pip install failed")

    if language == "python":
        namespace = {{"__name__": "__main__"}}
        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(stderr_buffer):
            import os
            os.chdir(workspace)
            exec(test_code, namespace, namespace)
    else:
        test_file = workspace / "generated_test.js"
        test_file.write_text(test_code, encoding="utf-8")
        node_result = subprocess.run(
            ["node", str(test_file)],
            cwd=str(workspace),
            capture_output=True,
            text=True,
        )
        stdout_buffer.write(node_result.stdout)
        stderr_buffer.write(node_result.stderr)
        if node_result.returncode != 0:
            raise RuntimeError(node_result.stderr or "Node test failed")

    print(json.dumps({{
        "status": "passed",
        "stdout": stdout_buffer.getvalue(),
        "stderr": stderr_buffer.getvalue(),
        "error": None,
    }}))
except Exception as exc:
    print(json.dumps({{
        "status": "failed",
        "stdout": stdout_buffer.getvalue(),
        "stderr": stderr_buffer.getvalue(),
        "error": str(exc),
    }}))
"""

    def _detect_test_language(self, test_code: str) -> str:
        javascript_markers = ("console.log(", "require(", "module.exports", "describe(", "it(")
        return "javascript" if any(marker in test_code for marker in javascript_markers) else "python"

    def _extract_python_packages(self, test_code: str) -> list[str]:
        import re
        import sys

        packages: set[str] = set()
        stdlib = getattr(sys, "stdlib_module_names", set())
        patterns = [
            re.compile(r"^import\s+([a-zA-Z_][\w]*)", re.MULTILINE),
            re.compile(r"^from\s+([a-zA-Z_][\w]*)\s+import", re.MULTILINE),
        ]
        for pattern in patterns:
            for match in pattern.findall(test_code):
                root = match.split(".")[0]
                if root not in stdlib and root not in {"__future__"}:
                    packages.add(root)
        return sorted(packages)

    def _parse_sandbox_json(self, text: str) -> dict[str, Any]:
        try:
            return json.loads(text.strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError) as exc:
            raise ValueError(f"Sandbox returned non-JSON output: {text}") from exc
