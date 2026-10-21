from fnmatch import fnmatch
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import Type
from app.routers import pokemon as pokemon_router

MockPokeAPI = Any


def make_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": 6,
        "name": "Charizard",
        "height": 17,
        "weight": 905,
        "types": ["Fire", "Flying"],
        "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
    }
    payload.update(overrides)
    return payload


async def create_pokemon(client: AsyncClient, **overrides: Any) -> dict[str, Any]:
    response = await client.post("/pokemons", json=make_payload(**overrides))
    assert response.status_code == 201
    return response.json()


POKEAPI_PIKACHU = {
    "id": 25,
    "name": "pikachu",
    "height": 4,
    "weight": 60,
    "types": [{"slot": 1, "type": {"name": "electric", "url": "..."}}],
    "sprites": {
        "front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
    },
}


# POST /pokemons


async def test_create_pokemon_returns_201_and_normalizes_names(client: AsyncClient) -> None:
    response = await client.post("/pokemons", json=make_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 6
    assert body["name"] == "charizard"
    assert sorted(body["types"]) == ["fire", "flying"]


async def test_create_pokemon_with_existing_id_returns_409(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.post("/pokemons", json=make_payload(name="outro"))

    assert response.status_code == 409


async def test_create_pokemon_with_existing_name_returns_409(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.post("/pokemons", json=make_payload(id=999))

    assert response.status_code == 409


async def test_create_pokemon_with_invalid_id_returns_422(client: AsyncClient) -> None:
    response = await client.post("/pokemons", json=make_payload(id=0))

    assert response.status_code == 422


async def test_create_pokemon_with_more_than_two_types_returns_422(client: AsyncClient) -> None:
    response = await client.post(
        "/pokemons", json=make_payload(types=["fire", "flying", "dragon"])
    )

    assert response.status_code == 422


async def test_create_pokemon_reuses_existing_types(
    client: AsyncClient, session_maker: async_sessionmaker
) -> None:
    await create_pokemon(client, id=16, name="pidgey", types=["normal", "flying"])
    await create_pokemon(client, id=6, name="charizard", types=["fire", "flying"])

    async with session_maker() as session:
        result = await session.execute(select(Type))
        names = sorted(t.name for t in result.scalars().all())

    assert names == ["fire", "flying", "normal"]


# GET /pokemons/{id} e GET /pokemons


async def test_get_pokemon_by_id_returns_200(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.get("/pokemons/6")

    assert response.status_code == 200
    assert response.json()["name"] == "charizard"


async def test_get_pokemon_by_id_not_found_returns_404(client: AsyncClient) -> None:
    response = await client.get("/pokemons/999")

    assert response.status_code == 404


async def test_list_pokemons_returns_data_and_pagination(client: AsyncClient) -> None:
    await create_pokemon(client, id=25, name="pikachu", types=["electric"])
    await create_pokemon(client, id=6, name="charizard", types=["fire", "flying"])
    await create_pokemon(client, id=1, name="bulbasaur", types=["grass", "poison"])

    response = await client.get("/pokemons")

    assert response.status_code == 200
    body = response.json()
    assert [p["id"] for p in body["data"]] == [1, 6, 25]
    assert body["pagination"] == {
        "total": 3,
        "limit": 20,
        "offset": 0,
        "next": None,
        "previous": None,
    }


async def test_list_pokemons_limit_offset_and_navigation_links(
    client: AsyncClient,
) -> None:
    for pokedex_id, name in [(1, "bulbasaur"), (4, "charmander"), (7, "squirtle")]:
        await create_pokemon(client, id=pokedex_id, name=name, types=["normal"])

    first = await client.get("/pokemons", params={"limit": 2, "offset": 0})
    second = await client.get("/pokemons", params={"limit": 2, "offset": 2})

    assert [p["id"] for p in first.json()["data"]] == [1, 4]
    assert first.json()["pagination"]["next"] == "/pokemons?limit=2&offset=2"
    assert first.json()["pagination"]["previous"] is None

    assert [p["id"] for p in second.json()["data"]] == [7]
    assert second.json()["pagination"]["next"] is None
    assert second.json()["pagination"]["previous"] == "/pokemons?limit=2&offset=0"
    assert second.json()["pagination"]["total"] == 3


async def create_starters(client: AsyncClient) -> None:
    for pokedex_id, name, types in [
        (1, "bulbasaur", ["grass", "poison"]),
        (4, "charmander", ["fire"]),
        (5, "charmeleon", ["fire"]),
        (6, "charizard", ["fire", "flying"]),
        (16, "pidgey", ["normal", "flying"]),
    ]:
        await create_pokemon(client, id=pokedex_id, name=name, types=types)


async def test_list_pokemons_search_is_partial_and_case_insensitive(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"search": "CHAR"})

    assert response.status_code == 200
    body = response.json()
    assert [p["name"] for p in body["data"]] == ["charmander", "charmeleon", "charizard"]
    assert body["pagination"]["total"] == 3


async def test_list_pokemons_search_matches_middle_of_name(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"search": "meleo"})

    assert [p["name"] for p in response.json()["data"]] == ["charmeleon"]


async def test_list_pokemons_search_treats_wildcards_as_text(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"search": "%"})

    assert response.json()["data"] == []
    assert response.json()["pagination"]["total"] == 0


async def test_list_pokemons_filters_by_type(client: AsyncClient) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"type": "flying"})

    body = response.json()
    assert [p["name"] for p in body["data"]] == ["charizard", "pidgey"]
    assert body["pagination"]["total"] == 2


async def test_list_pokemons_type_filter_accepts_uppercase(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"type": "Grass"})

    assert [p["name"] for p in response.json()["data"]] == ["bulbasaur"]


async def test_list_pokemons_with_unknown_type_returns_empty_page(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"type": "dragon"})

    assert response.status_code == 200
    assert response.json()["data"] == []
    assert response.json()["pagination"] == {
        "total": 0,
        "limit": 20,
        "offset": 0,
        "next": None,
        "previous": None,
    }


async def test_list_pokemons_combines_search_and_type(client: AsyncClient) -> None:
    await create_starters(client)

    response = await client.get(
        "/pokemons", params={"search": "char", "type": "flying"}
    )

    body = response.json()
    assert [p["name"] for p in body["data"]] == ["charizard"]
    assert body["pagination"]["total"] == 1


async def test_list_pokemons_with_blank_search_ignores_filter(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    response = await client.get("/pokemons", params={"search": "  ", "type": ""})

    assert response.json()["pagination"]["total"] == 5


async def test_list_pokemons_with_filters_keeps_them_in_navigation_links(
    client: AsyncClient,
) -> None:
    await create_starters(client)
    params: dict[str, str | int] = {"limit": 1, "search": "Char", "type": "fire"}

    first = await client.get("/pokemons", params={**params, "offset": 0})
    middle = await client.get("/pokemons", params={**params, "offset": 1})
    last = await client.get("/pokemons", params={**params, "offset": 2})

    assert [p["name"] for p in first.json()["data"]] == ["charmander"]
    assert first.json()["pagination"]["total"] == 3
    assert first.json()["pagination"]["previous"] is None
    assert (
        first.json()["pagination"]["next"]
        == "/pokemons?limit=1&offset=1&search=char&type=fire"
    )

    assert [p["name"] for p in middle.json()["data"]] == ["charmeleon"]
    assert (
        middle.json()["pagination"]["previous"]
        == "/pokemons?limit=1&offset=0&search=char&type=fire"
    )

    assert [p["name"] for p in last.json()["data"]] == ["charizard"]
    assert last.json()["pagination"]["next"] is None


async def test_list_pokemons_navigation_link_follows_to_filtered_page(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    first = await client.get("/pokemons", params={"limit": 2, "type": "fire"})
    second = await client.get(first.json()["pagination"]["next"])

    assert [p["name"] for p in second.json()["data"]] == ["charizard"]
    assert second.json()["pagination"]["total"] == 3


async def test_list_pokemons_cache_key_includes_filters(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    keys: list[str] = []

    async def record_get_cache(key: str) -> None:
        keys.append(key)

    monkeypatch.setattr(pokemon_router, "get_cache", record_get_cache)

    await client.get("/pokemons", params={"search": "Char", "type": "fire"})
    await client.get("/pokemons", params={"search": "char"})

    # Chaves diferentes para filtros diferentes, todas sob o padrão invalidado na escrita.
    assert keys == [
        "pokemon:list:limit=20:offset=0:search=char:type=fire",
        "pokemon:list:limit=20:offset=0:search=char:type=",
    ]
    assert all(fnmatch(key, "pokemon:list:*") for key in keys)


async def test_list_pokemons_with_search_too_long_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.get("/pokemons", params={"search": "a" * 51})

    assert response.status_code == 422


async def test_list_pokemons_with_negative_offset_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.get("/pokemons", params={"offset": -1})

    assert response.status_code == 422


async def test_list_pokemons_with_limit_above_100_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.get("/pokemons", params={"limit": 101})

    assert response.status_code == 422


# PATCH /pokemons/{id}


async def test_update_pokemon_changes_only_sent_fields(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.patch("/pokemons/6", json={"weight": 950})

    assert response.status_code == 200
    body = response.json()
    assert body["weight"] == 950
    assert body["height"] == 17
    assert body["name"] == "charizard"


async def test_update_pokemon_types(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.patch("/pokemons/6", json={"types": ["Fire", "Dragon"]})

    assert response.status_code == 200
    assert sorted(response.json()["types"]) == ["dragon", "fire"]


async def test_update_pokemon_with_existing_name_returns_409(client: AsyncClient) -> None:
    await create_pokemon(client)
    await create_pokemon(client, id=16, name="pidgey", types=["normal", "flying"])

    response = await client.patch("/pokemons/6", json={"name": "Pidgey"})

    assert response.status_code == 409


async def test_update_pokemon_not_found_returns_404(client: AsyncClient) -> None:
    response = await client.patch("/pokemons/999", json={"weight": 1})

    assert response.status_code == 404


# DELETE /pokemons/{id}


async def test_delete_pokemon_returns_204_and_removes_it(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.delete("/pokemons/6")
    after_delete = await client.get("/pokemons/6")

    assert response.status_code == 204
    assert after_delete.status_code == 404


async def test_delete_pokemon_not_found_returns_404(client: AsyncClient) -> None:
    response = await client.delete("/pokemons/999")

    assert response.status_code == 404


# POST /pokemons/import/{name}


async def test_import_pokemon_returns_201(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/v2/pokemon/pikachu"
        return httpx.Response(200, json=POKEAPI_PIKACHU)

    mock_pokeapi(handler)

    response = await client.post("/pokemons/import/Pikachu")

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 25
    assert body["name"] == "pikachu"
    assert body["types"] == ["electric"]


async def test_import_existing_pokemon_returns_409(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    mock_pokeapi(lambda request: httpx.Response(200, json=POKEAPI_PIKACHU))
    await client.post("/pokemons/import/pikachu")

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 409


async def test_import_pokemon_not_found_in_pokeapi_returns_404(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    mock_pokeapi(lambda request: httpx.Response(404))

    response = await client.post("/pokemons/import/naoexiste")

    assert response.status_code == 404


async def test_import_pokemon_when_pokeapi_returns_error_returns_503(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    mock_pokeapi(lambda request: httpx.Response(500))

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 503


async def test_import_pokemon_when_pokeapi_is_down_returns_503(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("PokéAPI fora do ar", request=request)

    mock_pokeapi(handler)

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 503
