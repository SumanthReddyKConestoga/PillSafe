import pytest
from httpx import AsyncClient

from app.services import claude_service
from app.services.pill_detection import CvUnavailableError


@pytest.mark.asyncio
async def test_pill_analysis_requires_auth(client: AsyncClient):
    response = await client.post(
        "/api/v1/analyze/pill",
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_analyze_pill_returns_cv_unavailable_on_detector_failure(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    """This tests the failure/fallback contract when OpenCV can't run — it
    does NOT evaluate pill-identification accuracy (see KNOWN_LIMITATIONS.md
    for what actually is/isn't tested against real images). Mocked so this
    holds regardless of whether opencv happens to be installed here."""
    def _raise_unavailable(image_bytes: bytes):
        raise CvUnavailableError("opencv-python-headless is not installed")

    monkeypatch.setattr("app.services.pill_detection.detect_color_and_shape", _raise_unavailable)
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
    # No database match -> a fixed safety message, never LLM speculation and
    # never silence. Assert no drug name/dosage leaks into the message either.
    assert data["claude_description"] == claude_service.NO_MATCH_MESSAGE
    assert "consult a pharmacist" in data["claude_description"].lower()
    for forbidden in ("metformin", "mg", "acetaminophen", "ibuprofen"):
        assert forbidden not in data["claude_description"].lower()
