"""Characterization tests for app.core.json_stream.

These pin the *current* behavior (including known limitations) so the Phase 2
consolidation onto a single JSON parser can be verified against them.
"""

import unittest

from app.core.json_stream import (
    extract_array_field,
    extract_json_object,
    extract_nullable_string_field,
    extract_string_field,
)


class ExtractJsonObjectTests(unittest.TestCase):
    def test_plain_object(self) -> None:
        self.assertEqual(extract_json_object('{"a": 1}'), {"a": 1})

    def test_fenced_json_block(self) -> None:
        text = '```json\n{"a": 1, "b": "x"}\n```'
        self.assertEqual(extract_json_object(text), {"a": 1, "b": "x"})

    def test_fenced_bare_block(self) -> None:
        text = '```\n{"a": 1}\n```'
        self.assertEqual(extract_json_object(text), {"a": 1})

    def test_object_embedded_in_prose(self) -> None:
        text = 'Here is the result: {"a": 1} thanks'
        self.assertEqual(extract_json_object(text), {"a": 1})

    def test_no_object_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            extract_json_object("no json here")

    def test_malformed_object_raises_json_error(self) -> None:
        import json

        with self.assertRaises(json.JSONDecodeError):
            extract_json_object('{"a": }')


class ExtractStringFieldTests(unittest.TestCase):
    def test_simple_value(self) -> None:
        self.assertEqual(extract_string_field('{"name": "forge"}', "name"), "forge")

    def test_escaped_quotes_are_unescaped(self) -> None:
        self.assertEqual(
            extract_string_field('{"q": "say \\"hi\\""}', "q"),
            'say "hi"',
        )

    def test_missing_field_returns_none(self) -> None:
        self.assertIsNone(extract_string_field('{"other": "x"}', "name"))


class ExtractNullableStringFieldTests(unittest.TestCase):
    def test_null_value_returns_none(self) -> None:
        self.assertIsNone(extract_nullable_string_field('{"q": null}', "q"))

    def test_string_value_returned(self) -> None:
        self.assertEqual(extract_nullable_string_field('{"q": "ask"}', "q"), "ask")

    def test_missing_field_returns_none(self) -> None:
        self.assertIsNone(extract_nullable_string_field('{"other": "x"}', "q"))


class ExtractArrayFieldTests(unittest.TestCase):
    def test_simple_array(self) -> None:
        self.assertEqual(extract_array_field('{"items": [1, 2, 3]}', "items"), [1, 2, 3])

    def test_array_of_strings(self) -> None:
        self.assertEqual(
            extract_array_field('{"items": ["a", "b"]}', "items"),
            ["a", "b"],
        )

    def test_missing_field_returns_none(self) -> None:
        self.assertIsNone(extract_array_field('{"other": 1}', "items"))

    def test_nested_array_current_limitation_returns_none(self) -> None:
        # The non-greedy `\[[\s\S]*?\]` stops at the first `]`, yielding an
        # unparseable fragment -> None. Documented limitation to fix in Phase 2.
        self.assertIsNone(extract_array_field('{"items": [1, [2, 3], 4]}', "items"))


if __name__ == "__main__":
    unittest.main()
