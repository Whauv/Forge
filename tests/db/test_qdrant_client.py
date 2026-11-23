"""Characterization tests for app.db.qdrant_client.

``mock_qdrant`` swaps the module-level Qdrant client for a MagicMock so the
async wrappers (run via asyncio.to_thread) can be checked without a server.
"""

import app.db.qdrant_client as qc


async def test_create_collection_uses_project_scoped_name(mock_qdrant):
    mock_qdrant.collection_exists.return_value = False

    await qc.create_collection("abc123")

    mock_qdrant.collection_exists.assert_called_with("project_abc123")
    # Vector config is created with the hardcoded 768/cosine params.
    _, kwargs = mock_qdrant.create_collection.call_args
    assert kwargs["collection_name"] == "project_abc123"
    assert kwargs["vectors_config"].size == 768


async def test_create_collection_skips_when_existing(mock_qdrant):
    mock_qdrant.collection_exists.return_value = True

    await qc.create_collection("abc123")

    mock_qdrant.create_collection.assert_not_called()


async def test_solution_template_collection_name(mock_qdrant):
    mock_qdrant.collection_exists.return_value = False

    await qc.create_solution_template_collection()

    mock_qdrant.collection_exists.assert_called_with("solution_templates")


async def test_upsert_vectors_maps_points_and_scopes_collection(mock_qdrant):
    points = [{"id": "1", "vector": [0.1, 0.2], "payload": {"text": "x"}}]

    await qc.upsert_vectors("proj", points)

    _, kwargs = mock_qdrant.upsert.call_args
    assert kwargs["collection_name"] == "project_proj"
    assert len(kwargs["points"]) == 1
    assert kwargs["points"][0].id == "1"


async def test_search_vectors_passes_query_and_limit(mock_qdrant):
    mock_qdrant.search.return_value = ["match"]

    result = await qc.search_vectors("proj", [0.1, 0.2, 0.3], limit=5)

    assert result == ["match"]
    _, kwargs = mock_qdrant.search.call_args
    assert kwargs["collection_name"] == "project_proj"
    assert kwargs["query_vector"] == [0.1, 0.2, 0.3]
    assert kwargs["limit"] == 5


async def test_search_vectors_in_collection_forwards_score_threshold(mock_qdrant):
    mock_qdrant.search.return_value = []

    await qc.search_vectors_in_collection(
        "solution_templates", [0.0], limit=1, score_threshold=0.85
    )

    _, kwargs = mock_qdrant.search.call_args
    assert kwargs["collection_name"] == "solution_templates"
    assert kwargs["score_threshold"] == 0.85
