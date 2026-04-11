import unittest

from app.core.repo_utils import (
    infer_project_name,
    normalize_code_artifact_rows,
    parse_github_repo_name,
)


class RepoUtilsTests(unittest.TestCase):
    def test_parse_github_repo_name_strips_git_suffix(self) -> None:
        self.assertEqual(
            parse_github_repo_name("https://github.com/Whauv/Forge.git"),
            "Whauv/Forge",
        )

    def test_infer_project_name_formats_repo_name(self) -> None:
        self.assertEqual(
            infer_project_name("https://github.com/acme/auto_pilot-core"),
            "Auto Pilot Core",
        )

    def test_normalize_code_artifact_rows_maps_unified_diff(self) -> None:
        rows = [
            {
                "file_path": "app/main.py",
                "unified_diff": "@@ -1 +1 @@\n-print('old')\n+print('new')\n",
                "explanation": "Update startup log.",
            }
        ]

        self.assertEqual(
            normalize_code_artifact_rows(rows),
            [
                {
                    "file_path": "app/main.py",
                    "diff": "@@ -1 +1 @@\n-print('old')\n+print('new')\n",
                    "explanation": "Update startup log.",
                }
            ],
        )


if __name__ == "__main__":
    unittest.main()
