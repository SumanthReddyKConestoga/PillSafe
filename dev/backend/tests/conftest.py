import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.main import app as fastapi_app
from app.core.database import Base, get_db
import app.models.user  # noqa: F401
import app.models.patient  # noqa: F401
import app.models.analysis  # noqa: F401
import app.models.prescription  # noqa: F401
import app.models.din_pill  # noqa: F401

TEST_DB_URL = "sqlite+aiosqlite:///./pillsafe_test.db"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    async def override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient) -> str:
    """Register a fresh patient account and return its access token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"patient_{uuid.uuid4().hex[:10]}@pillsafe.dev",
            "password": "Test1234",
            "first_name": "Test",
            "last_name": "Patient",
            "date_of_birth": "1990-01-01",
        },
    )
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(auth_token: str) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict:
    """Bootstrap a fresh admin account via the dev seed endpoint."""
    response = await client.post(
        "/api/v1/dev/seed-admin",
        json={"email": f"admin_{uuid.uuid4().hex[:10]}@pillsafe.dev", "password": "Admin1234"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
