"""Characterization tests for app.agents.utils (the shared LLM helpers)."""

from types import SimpleNamespace

from app.agents import utils


class TestParseJsonPayload:
    def test_plain_json(self):
        assert utils.parse_json_payload('{"a": 1}') == {"a": 1}

    def test_strips_json_fence(self):
        assert utils.parse_json_payload('```json\n{"a": 1}\n```') == {"a": 1}

    def test_strips_bare_fence(self):
        assert utils.parse_json_payload('```\n{"a": 1}\n```') == {"a": 1}


class TestExtractResponseText:
    def test_prefers_top_level_text(self):
        response = SimpleNamespace(text="  hello  ", candidates=[])
        assert utils._extract_response_text(response) == "hello"

    def test_falls_back_to_candidate_parts(self):
        part = SimpleNamespace(text="part-a")
        content = SimpleNamespace(parts=[part])
        candidate = SimpleNamespace(content=content)
        response = SimpleNamespace(text=None, candidates=[candidate])
        assert utils._extract_response_text(response) == "part-a"


async def test_embed_text_returns_vector(mock_gemini):
    vector = await utils.embed_text("hello")
    assert vector == [0.0] * 768
    mock_gemini.embed_content.assert_called()


async def test_embed_texts_returns_one_vector_per_input(mock_gemini):
    vectors = await utils.embed_texts(["a", "b", "c"])
    assert len(vectors) == 3
    assert all(v == [0.0] * 768 for v in vectors)


async def test_generate_json_parses_model_output(mock_gemini):
    mock_gemini.model.generate_content.return_value = SimpleNamespace(
        text='{"ok": true}', candidates=[]
    )
    result = await utils.generate_json("prompt")
    assert result == {"ok": True}
