import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analyze_stub_never_returns_a_fabricated_confidence(
    client: AsyncClient, auth_headers: dict
):
    """ML_PIPELINE_ENABLED=false is the stub path (no model ever runs) — the
    response must not present a hardcoded number in the same field a real
    model's confidence would populate."""
    response = await client.post(
        "/api/v1/analyze",
        headers=auth_headers,
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stub"
    assert data["ml_pipeline_enabled"] is False
    for pill in data["pills_detected"]:
        assert pill["confidence"] is None


@pytest.mark.asyncio
async def test_analyze_requires_auth(client: AsyncClient):
    response = await client.post(
        "/api/v1/analyze",
        files={"image": ("pill.jpg", b"fake-bytes", "image/jpeg")},
    )
    assert response.status_code == 403
