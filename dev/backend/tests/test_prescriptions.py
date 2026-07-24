import pytest
from httpx import AsyncClient

from app.core.config import settings


def _fake_image() -> tuple[str, bytes, str]:
    return ("label.jpg", b"\xff\xd8\xff\xe0fake-jpeg-bytes", "image/jpeg")


@pytest.mark.asyncio
async def test_upload_prescription_synthetic_demo_mode_is_labeled(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    """OCR_PIPELINE_ENABLED=false is a legitimate, operator-controlled demo
    mode — but the response must unmistakably flag the data as synthetic so
    no caller can mistake it for a real OCR result."""
    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", False)
    name, content, ctype = _fake_image()
    response = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "synthetic_demo"
    assert data["message"]
    assert isinstance(data["parsed"], list)
    assert len(data["parsed"]) == 1
    assert data["parsed"][0]["drug_name"]
    assert data["parsed"][0]["time_slots"] == ["morning", "evening"]
    assert data["parsed"][0]["is_active"] is True


@pytest.mark.asyncio
async def test_list_update_and_soft_delete_prescription(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)
    monkeypatch.setattr(
        "app.services.ocr_service.extract_text",
        lambda image_bytes: "Metformin HCl 500mg — twice daily with meals.",
    )
    name, content, ctype = _fake_image()
    create_resp = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    prescription_id = create_resp.json()["parsed"][0]["id"]

    list_resp = await client.get("/api/v1/prescriptions/me", headers=auth_headers)
    assert list_resp.status_code == 200
    assert any(p["id"] == prescription_id for p in list_resp.json())

    patch_resp = await client.patch(
        f"/api/v1/prescriptions/{prescription_id}",
        headers=auth_headers,
        json={"dosage": "500 mg"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["dosage"] == "500 mg"

    delete_resp = await client.delete(
        f"/api/v1/prescriptions/{prescription_id}", headers=auth_headers
    )
    assert delete_resp.status_code == 204

    list_after = await client.get("/api/v1/prescriptions/me", headers=auth_headers)
    assert all(p["id"] != prescription_id for p in list_after.json())


@pytest.mark.asyncio
async def test_upload_prescription_returns_ocr_failed_on_extraction_error(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    """A corrupt/non-image upload must return a structured ocr_failed
    response — never silently substitute a fabricated prescription."""
    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)

    def _raise(image_bytes: bytes):
        raise OSError("Truncated File Read")

    monkeypatch.setattr("app.services.ocr_service.extract_text", _raise)

    name, content, ctype = _fake_image()
    response = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ocr_failed"
    assert data["parsed"] is None
    # The regression this guards against: no drug name, dosage, or doctor
    # name may leak into the response body when OCR genuinely failed.
    body_text = response.text
    for forbidden in ("Metformin", "500mg", "Dr. A. Chen", "twice daily"):
        assert forbidden not in body_text


@pytest.mark.asyncio
async def test_upload_prescription_returns_ocr_failed_when_ocr_unavailable(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    """When paddleocr isn't installed (OcrUnavailableError), the endpoint
    must return the same ocr_failed contract, not fabricated data."""
    from app.services import ocr_service

    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)

    def _raise(image_bytes: bytes):
        raise ocr_service.OcrUnavailableError("paddleocr is not installed")

    monkeypatch.setattr("app.services.ocr_service.extract_text", _raise)

    name, content, ctype = _fake_image()
    response = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ocr_failed"
    assert data["parsed"] is None


@pytest.mark.asyncio
async def test_upload_prescription_creates_one_row_per_medication(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)
    monkeypatch.setattr(
        "app.services.ocr_service.extract_text",
        lambda image_bytes: (
            "CONESTOGA MEDICAL CENTRE\n"
            "RX 1\nAcetaminophen 500mg (Tylenol Extra Strength).\n"
            "Take 2 tablets every 6 hours as needed for pain or fever - do not exceed 8 tablets in 24 hours\n"
            "Qty: 100 tablets\nRefills: 2\nDIN: 00559407\n"
            "RX 2\nIbuprofen 200mg (Advil)\n"
            "Take 1-2 tablets THREE TIMES DAILY with meals (morning, noon and night) for joint pain - take with food\n"
            "Qty: 90 tablets\nRefills: 1\nDIN: 00587915\n"
            "RX 3\nLoratadine 10mg (Claritin).\n"
            "Take 1 tablet ONCE DAILY in the morning for seasonal allergies.\n"
            "Qty: 30 tablets\nRefills: 3\nDIN: 00782696\n"
        ),
    )
    name, content, ctype = _fake_image()
    response = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    assert response.status_code == 201
    data = response.json()["parsed"]
    assert len(data) == 3
    assert all("CONESTOGA" not in p["drug_name"].upper() for p in data)
    names = {p["drug_name"] for p in data}
    assert names == {"Acetaminophen", "Ibuprofen", "Loratadine"}
    acetaminophen = next(p for p in data if p["drug_name"] == "Acetaminophen")
    assert acetaminophen["dosage"] == "500mg"
    assert acetaminophen["frequency_type"] == "PRN"
    assert acetaminophen["max_daily_dose"] == 8
    ibuprofen = next(p for p in data if p["drug_name"] == "Ibuprofen")
    assert ibuprofen["with_food"] is True
    assert ibuprofen["time_slots"] == ["morning", "afternoon", "evening"]


@pytest.mark.asyncio
async def test_get_prescription_image_requires_ownership(
    client: AsyncClient, auth_headers: dict, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)
    monkeypatch.setattr(
        "app.services.ocr_service.extract_text",
        lambda image_bytes: "Metformin HCl 500mg — twice daily with meals.",
    )
    name, content, ctype = _fake_image()
    create_resp = await client.post(
        "/api/v1/prescriptions", headers=auth_headers, files={"image": (name, content, ctype)},
    )
    prescription_id = create_resp.json()["parsed"][0]["id"]
    resp = await client.get(f"/api/v1/prescriptions/{prescription_id}/image", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/")


@pytest.mark.asyncio
async def test_resolve_din_returns_confirm_for_a_single_reference_match(
    client: AsyncClient, auth_headers: dict, db_session, monkeypatch: pytest.MonkeyPatch
):
    from app.models.din_pill import DinPill

    monkeypatch.setattr(settings, "OCR_PIPELINE_ENABLED", True)
    monkeypatch.setattr(
        "app.services.ocr_service.extract_text",
        lambda image_bytes: "Imuran 50mg — once daily.",
    )
    name, content, ctype = _fake_image()
    create_resp = await client.post(
        "/api/v1/prescriptions", headers=auth_headers, files={"image": (name, content, ctype)},
    )
    prescription_id = create_resp.json()["parsed"][0]["id"]

    db_session.add(DinPill(
        din="00004596", product="IMURAN", active_ingredient="AZATHIOPRINE",
        strength="50 MG", colour="yellow", shape="other",
    ))
    await db_session.flush()

    resp = await client.post(
        f"/api/v1/prescriptions/{prescription_id}/resolve-din", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "confirm"
    assert data["candidates"][0]["din"] == "00004596"

    patch_resp = await client.patch(
        f"/api/v1/prescriptions/{prescription_id}", headers=auth_headers,
        json={"din": data["candidates"][0]["din"]},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["din"] == "00004596"


@pytest.mark.asyncio
async def test_resolve_din_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/prescriptions/some-id/resolve-din")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_resolve_din_requires_ownership(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/prescriptions/not-a-real-id/resolve-din", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_prescriptions_require_auth(client: AsyncClient):
    response = await client.get("/api/v1/prescriptions/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_blocked_from_prescriptions(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/prescriptions/me", headers=admin_headers)
    assert response.status_code == 403
