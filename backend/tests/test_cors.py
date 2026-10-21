from httpx import AsyncClient

from app.main import parse_cors_origins

ALLOWED_ORIGIN = "http://localhost:5173"
PREFLIGHT_HEADERS = {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization, content-type",
}


async def test_preflight_from_allowed_origin_returns_cors_headers(
    anon_client: AsyncClient,
) -> None:
    response = await anon_client.options(
        "/pokemons", headers={"Origin": ALLOWED_ORIGIN, **PREFLIGHT_HEADERS}
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]
    allowed_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers


async def test_preflight_from_unknown_origin_is_rejected(
    anon_client: AsyncClient,
) -> None:
    response = await anon_client.options(
        "/pokemons", headers={"Origin": "https://evil.example", **PREFLIGHT_HEADERS}
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


async def test_simple_request_from_allowed_origin_returns_allow_origin(
    anon_client: AsyncClient,
) -> None:
    response = await anon_client.get("/health", headers={"Origin": ALLOWED_ORIGIN})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN


async def test_simple_request_from_unknown_origin_has_no_allow_origin(
    anon_client: AsyncClient,
) -> None:
    response = await anon_client.get(
        "/health", headers={"Origin": "https://evil.example"}
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_parse_cors_origins_ignores_spaces_empty_items_and_trailing_slash() -> None:
    value = " http://localhost:5173 , https://rota151.example/ ,, "

    assert parse_cors_origins(value) == [
        "http://localhost:5173",
        "https://rota151.example",
    ]
