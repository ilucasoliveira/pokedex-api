from fnmatch import fnmatch
from typing import Any

import pytest
from httpx import AsyncClient

from app.routers import catalog as catalog_router


async def create_pokemon(client: AsyncClient, **payload: Any) -> None:
    payload = {"height": 1, "weight": 1, **payload}
    response = await client.post("/pokemons", json=payload)
    assert response.status_code == 201


async def create_mixed_pokedex(client: AsyncClient) -> None:
    await create_pokemon(client, id=1, name="bulbasaur", types=["grass", "poison"], generation=1)
    await create_pokemon(client, id=4, name="charmander", types=["fire"], generation=1)
    await create_pokemon(client, id=152, name="chikorita", types=["grass"], generation=2)
    await create_pokemon(client, id=999, name="semgeracao", types=["normal"])


# GET /types


async def test_list_types_returns_counts_in_alphabetical_order(
    client: AsyncClient,
) -> None:
    await create_mixed_pokedex(client)

    response = await client.get("/types")

    assert response.status_code == 200
    assert response.json() == [
        {"name": "fire", "count": 1},
        {"name": "grass", "count": 2},
        {"name": "normal", "count": 1},
        {"name": "poison", "count": 1},
    ]


async def test_list_types_hides_types_without_pokemon(client: AsyncClient) -> None:
    await create_pokemon(client, id=4, name="charmander", types=["fire"])

    # O tipo "fire" continua na tabela, mas nenhum pokémon usa mais.
    await client.patch("/pokemons/4", json={"types": ["dragon"]})
    response = await client.get("/types")

    assert response.json() == [{"name": "dragon", "count": 1}]


async def test_list_types_with_empty_database_returns_empty_list(
    anon_client: AsyncClient,
) -> None:
    response = await anon_client.get("/types")

    assert response.status_code == 200
    assert response.json() == []


# GET /generations


async def test_list_generations_returns_counts_in_order(client: AsyncClient) -> None:
    await create_mixed_pokedex(client)

    response = await client.get("/generations")

    assert response.status_code == 200
    assert response.json() == [{"id": 1, "count": 2}, {"id": 2, "count": 1}]


async def test_list_generations_is_public(anon_client: AsyncClient) -> None:
    response = await anon_client.get("/generations")

    assert response.status_code == 200
    assert response.json() == []


# Cache


async def test_catalog_cache_keys_are_invalidated_with_the_listing(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    keys: list[str] = []

    async def record_get_cache(key: str) -> None:
        keys.append(key)

    monkeypatch.setattr(catalog_router, "get_cache", record_get_cache)

    await client.get("/types")
    await client.get("/generations")

    # Toda escrita apaga pokemon:list:*, então as contagens nunca ficam velhas.
    assert keys == ["pokemon:list:types", "pokemon:list:generations"]
    assert all(fnmatch(key, "pokemon:list:*") for key in keys)


async def test_catalog_uses_cached_value_when_present(
    anon_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def cached(key: str) -> str:
        return '[{"name": "fire", "count": 64}]'

    monkeypatch.setattr(catalog_router, "get_cache", cached)

    response = await anon_client.get("/types")

    assert response.json() == [{"name": "fire", "count": 64}]
