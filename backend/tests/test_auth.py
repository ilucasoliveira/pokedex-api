from datetime import datetime, timedelta, timezone

import jwt
from httpx import AsyncClient

from app.security import ALGORITHM, SECRET_KEY

USER = {"username": "Misty", "password": "starmie123"}


# Registro


async def test_register_returns_201_without_password(anon_client: AsyncClient) -> None:
    response = await anon_client.post("/auth/register", json=USER)

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "misty"
    assert "password" not in body
    assert "hashed_password" not in body


async def test_register_existing_username_returns_409(anon_client: AsyncClient) -> None:
    await anon_client.post("/auth/register", json=USER)

    response = await anon_client.post("/auth/register", json=USER)

    assert response.status_code == 409


async def test_register_with_short_password_returns_422(anon_client: AsyncClient) -> None:
    response = await anon_client.post(
        "/auth/register", json={"username": "brock", "password": "123"}
    )

    assert response.status_code == 422


# Login


async def test_login_returns_bearer_token(anon_client: AsyncClient) -> None:
    await anon_client.post("/auth/register", json=USER)

    response = await anon_client.post("/auth/token", data=USER)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


async def test_login_with_wrong_password_returns_401(anon_client: AsyncClient) -> None:
    await anon_client.post("/auth/register", json=USER)

    response = await anon_client.post(
        "/auth/token", data={"username": "misty", "password": "senhaerrada"}
    )

    assert response.status_code == 401


async def test_login_with_unknown_user_returns_401(anon_client: AsyncClient) -> None:
    response = await anon_client.post("/auth/token", data=USER)

    assert response.status_code == 401


# Proteção das rotas


async def test_protected_route_without_token_returns_401(anon_client: AsyncClient) -> None:
    response = await anon_client.post("/pokemons", json={})

    assert response.status_code == 401


async def test_protected_route_with_invalid_token_returns_401(anon_client: AsyncClient) -> None:
    response = await anon_client.delete(
        "/pokemons/6", headers={"Authorization": "Bearer token-falso"}
    )

    assert response.status_code == 401


async def test_protected_route_with_expired_token_returns_401(anon_client: AsyncClient) -> None:
    expired_token = jwt.encode(
        {"sub": "ash", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = await anon_client.delete(
        "/pokemons/6", headers={"Authorization": f"Bearer {expired_token}"}
    )

    assert response.status_code == 401


async def test_public_routes_work_without_token(anon_client: AsyncClient) -> None:
    response = await anon_client.get("/pokemons")

    assert response.status_code == 200
