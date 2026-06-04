import pytest
from httpx import AsyncClient

REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "password": "SecurePass1",
    "first_name": "Jane",
    "last_name": "Doe",
    "date_of_birth": "1990-06-15",
    "preferred_language": "en",
}


@pytest.mark.asyncio
async def test_register_happy_path(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" not in data  # refresh token is in httpOnly cookie


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 409
    body = response.json()
    assert body["detail"]["error"]["code"] == "EMAIL_TAKEN"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": "wrongpassword"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403  # HTTPBearer returns 403 when no credentials provided


@pytest.mark.asyncio
async def test_me_endpoint_with_valid_token(client: AsyncClient):
    reg_response = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    token = reg_response.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == REGISTER_PAYLOAD["email"]
    assert data["first_name"] == REGISTER_PAYLOAD["first_name"]


@pytest.mark.asyncio
async def test_register_underage_rejected(client: AsyncClient):
    payload = {**REGISTER_PAYLOAD, "date_of_birth": "2015-01-01", "email": "young@example.com"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password_rejected(client: AsyncClient):
    payload = {**REGISTER_PAYLOAD, "password": "weak", "email": "weak@example.com"}
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
