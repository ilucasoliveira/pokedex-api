from httpx import AsyncClient


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "OK"}


async def test_health_check_accepts_head_for_uptime_monitors(anon_client: AsyncClient) -> None:
    response = await anon_client.head("/health")

    assert response.status_code == 200
    assert response.content == b""
