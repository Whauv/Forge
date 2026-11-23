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

    # --- edge / error paths ---------------------------------------------------

    def test_parse_github_repo_name_without_git_suffix(self) -> None:
        self.assertEqual(
            parse_github_repo_name("https://github.com/Whauv/Forge"),
            "Whauv/Forge",
        )

    def test_parse_github_repo_name_ignores_extra_path_segments(self) -> None:
        self.assertEqual(
            parse_github_repo_name("https://github.com/acme/widget/tree/main/src"),
            "acme/widget",
        )

    def test_parse_github_repo_name_requires_owner_and_repo(self) -> None:
        with self.assertRaises(ValueError):
            parse_github_repo_name("https://github.com/acme")

    def test_parse_github_repo_name_empty_path_raises(self) -> None:
        with self.assertRaises(ValueError):
            parse_github_repo_name("https://github.com/")

    def test_infer_project_name_replaces_separators_and_titles(self) -> None:
        self.assertEqual(
            infer_project_name("https://github.com/acme/my-cool_repo.git"),
            "My Cool Repo",
        )

    def test_normalize_code_artifact_rows_empty_list(self) -> None:
        self.assertEqual(normalize_code_artifact_rows([]), [])

    def test_normalize_code_artifact_rows_missing_keys_default_to_empty(self) -> None:
        self.assertEqual(
            normalize_code_artifact_rows([{}]),
            [{"file_path": "", "diff": "", "explanation": ""}],
        )

    def test_normalize_code_artifact_rows_none_values_coerced(self) -> None:
        rows = [{"file_path": None, "unified_diff": None, "explanation": None}]
        self.assertEqual(
            normalize_code_artifact_rows(rows),
            [{"file_path": "", "diff": "", "explanation": ""}],
        )


if __name__ == "__main__":
    unittest.main()
