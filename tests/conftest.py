import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-only-for-tests-not-for-production")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

import types
from collections.abc import AsyncGenerator, Callable
from typing import Any

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import Base
from app.routers import pokemon as pokemon_router

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TEST_USER = {"username": "ash", "password": "pikachu123"}


@pytest.fixture
async def session_maker() -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_sessionmaker(bind=engine, expire_on_commit=False)

    await engine.dispose()


@pytest.fixture
async def anon_client(
    session_maker: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
async def client(anon_client: AsyncClient) -> AsyncGenerator[AsyncClient, None]:
    await anon_client.post("/auth/register", json=TEST_USER)
    response = await anon_client.post("/auth/token", data=TEST_USER)
    token = response.json()["access_token"]

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def disable_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_cache(key: str) -> None:
        return None

    async def fake_noop(*args: Any, **kwargs: Any) -> None:
        return None

    monkeypatch.setattr(pokemon_router, "get_cache", fake_get_cache)
    monkeypatch.setattr(pokemon_router, "set_cache", fake_noop)
    monkeypatch.setattr(pokemon_router, "delete_cache", fake_noop)
    monkeypatch.setattr(pokemon_router, "delete_cache_by_pattern", fake_noop)


@pytest.fixture
def mock_pokeapi(
    monkeypatch: pytest.MonkeyPatch,
) -> Callable[[Callable[[httpx.Request], httpx.Response]], None]:
    real_async_client = httpx.AsyncClient

    def install(handler: Callable[[httpx.Request], httpx.Response]) -> None:
        def fake_async_client(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
            return real_async_client(
                *args, transport=httpx.MockTransport(handler), **kwargs
            )

        fake_httpx = types.SimpleNamespace(
            AsyncClient=fake_async_client,
            RequestError=httpx.RequestError,
        )
        monkeypatch.setattr(pokemon_router, "httpx", fake_httpx)

    return install
