"""Characterization tests for app.core.config."""

import unittest
from unittest import mock

from app.core.config import Settings, get_required_env, get_settings


class GetRequiredEnvTests(unittest.TestCase):
    def test_returns_value(self) -> None:
        with mock.patch.dict("os.environ", {"FORGE_TEST_KEY": "value"}):
            self.assertEqual(get_required_env("FORGE_TEST_KEY"), "value")

    def test_strips_whitespace(self) -> None:
        with mock.patch.dict("os.environ", {"FORGE_TEST_KEY": "  value  "}):
            self.assertEqual(get_required_env("FORGE_TEST_KEY"), "value")

    def test_empty_value_raises(self) -> None:
        with mock.patch.dict("os.environ", {"FORGE_TEST_KEY": "   "}):
            with self.assertRaises(ValueError):
                get_required_env("FORGE_TEST_KEY")

    def test_missing_value_raises(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ValueError):
                get_required_env("DEFINITELY_MISSING_KEY")


class GetSettingsTests(unittest.TestCase):
    def test_returns_settings_instance(self) -> None:
        settings = get_settings()
        self.assertIsInstance(settings, Settings)

    def test_is_cached_single_instance(self) -> None:
        # lru_cache(maxsize=1) means repeated calls return the same object.
        self.assertIs(get_settings(), get_settings())

    def test_settings_is_frozen(self) -> None:
        settings = get_settings()
        with self.assertRaises(Exception):
            settings.qdrant_url = "mutated"  # type: ignore[misc]


if __name__ == "__main__":
    unittest.main()
