import pytest
from httpx import AsyncClient


def _fake_image() -> tuple[str, bytes, str]:
    return ("label.jpg", b"\xff\xd8\xff\xe0fake-jpeg-bytes", "image/jpeg")


@pytest.mark.asyncio
async def test_upload_prescription_demo_mode(client: AsyncClient, auth_headers: dict):
    name, content, ctype = _fake_image()
    response = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["drug_name"]
    assert data["time_slots"] == ["morning", "evening"]
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_list_update_and_soft_delete_prescription(client: AsyncClient, auth_headers: dict):
    name, content, ctype = _fake_image()
    create_resp = await client.post(
        "/api/v1/prescriptions",
        headers=auth_headers,
        files={"image": (name, content, ctype)},
    )
    prescription_id = create_resp.json()["id"]

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
async def test_prescriptions_require_auth(client: AsyncClient):
    response = await client.get("/api/v1/prescriptions/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_blocked_from_prescriptions(client: AsyncClient, admin_headers: dict):
    response = await client.get("/api/v1/prescriptions/me", headers=admin_headers)
    assert response.status_code == 403
