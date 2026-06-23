import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_pill_analysis_requires_auth(client: AsyncClient):
    response = await client.post(
        "/api/v1/analyze/pill",
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_pill_analysis_degrades_gracefully_without_opencv(client: AsyncClient, auth_headers: dict):
    """opencv-python-headless isn't installed in this dev environment by default —
    the endpoint must fail informatively (501), not crash."""
    response = await client.post(
        "/api/v1/analyze/pill",
        headers=auth_headers,
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 501
    assert response.json()["detail"]["error"]["code"] == "CV_UNAVAILABLE"


@pytest.mark.asyncio
async def test_pill_analysis_with_cv_mocked_returns_empty_candidates(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    """With colour/shape detection mocked (as if opencv were installed), the DIN
    lookup should still return an empty candidate list — no seed data loaded yet."""
    monkeypatch.setattr(
        "app.services.pill_detection.detect_color_and_shape",
        lambda image_bytes: ("white", "round"),
    )
    response = await client.post(
        "/api/v1/analyze/pill",
        headers=auth_headers,
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["detected_color"] == "white"
    assert data["detected_shape"] == "round"
    assert data["candidates"] == []
    # No LLM_API_KEY configured in the test environment -> inert, not an error
    assert data["claude_description"] is None
