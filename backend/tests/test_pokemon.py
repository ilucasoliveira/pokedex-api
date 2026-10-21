from fnmatch import fnmatch
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models import Ability, PokemonAbility, Type
from app.routers import pokemon as pokemon_router

STATS = {
    "hp": 78,
    "attack": 84,
    "defense": 78,
    "special_attack": 109,
    "special_defense": 85,
    "speed": 100,
}


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


async def test_create_pokemon_with_details_returns_them(client: AsyncClient) -> None:
    response = await client.post(
        "/pokemons",
        json=make_payload(
            artwork="https://example.com/6.png",
            generation=1,
            description="Spits fire.",
            stats=STATS,
            abilities=[
                {"name": "Blaze"},
                {"name": "solar-power", "is_hidden": True},
            ],
        ),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["artwork"] == "https://example.com/6.png"
    assert body["generation"] == 1
    assert body["description"] == "Spits fire."
    assert body["stats"] == STATS
    assert body["abilities"] == [
        {"name": "blaze", "is_hidden": False},
        {"name": "solar-power", "is_hidden": True},
    ]
    assert body["evolution_chain"] is None


async def test_create_pokemon_with_only_required_fields_has_empty_details(
    client: AsyncClient,
) -> None:
    payload = make_payload()
    del payload["sprites"]

    response = await client.post("/pokemons", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["sprites"] is None
    assert body["artwork"] is None
    assert body["generation"] is None
    assert body["description"] is None
    assert body["stats"] is None
    assert body["abilities"] == []


async def test_create_pokemon_accepts_names_up_to_50_characters(
    client: AsyncClient,
) -> None:
    long_name = "squawkabilly-green-plumage"
    ok = await client.post("/pokemons", json=make_payload(id=931, name=long_name))
    too_long = await client.post("/pokemons", json=make_payload(id=932, name="a" * 51))

    assert ok.status_code == 201
    assert ok.json()["name"] == long_name
    assert too_long.status_code == 422


async def test_create_pokemon_with_repeated_ability_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/pokemons",
        json=make_payload(abilities=[{"name": "blaze"}, {"name": "Blaze"}]),
    )

    assert response.status_code == 422


async def test_create_pokemon_with_incomplete_stats_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/pokemons", json=make_payload(stats={"hp": 78, "attack": 84})
    )

    assert response.status_code == 422


async def test_create_pokemon_reuses_existing_abilities(
    client: AsyncClient, session_maker: async_sessionmaker
) -> None:
    await create_pokemon(client, id=4, name="charmander", abilities=[{"name": "blaze"}])
    await create_pokemon(client, id=5, name="charmeleon", abilities=[{"name": "blaze"}])

    async with session_maker() as session:
        result = await session.execute(select(Ability))
        names = [a.name for a in result.scalars().all()]

    assert names == ["blaze"]


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


async def test_get_pokemon_by_id_accepts_leading_zeros(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.get("/pokemons/0006")

    assert response.status_code == 200
    assert response.json()["id"] == 6


async def test_get_pokemon_by_name_is_case_insensitive(client: AsyncClient) -> None:
    await create_pokemon(client, stats=STATS)

    response = await client.get("/pokemons/Charizard")

    assert response.status_code == 200
    assert response.json()["id"] == 6
    assert response.json()["stats"] == STATS


async def test_get_pokemon_by_unknown_name_returns_404(client: AsyncClient) -> None:
    response = await client.get("/pokemons/missingno")

    assert response.status_code == 404


async def test_list_pokemons_returns_summary_without_details(
    client: AsyncClient,
) -> None:
    await create_pokemon(client, generation=1, abilities=[{"name": "blaze"}])

    response = await client.get("/pokemons")

    item = response.json()["data"][0]
    assert set(item) == {
        "id",
        "name",
        "height",
        "weight",
        "types",
        "sprites",
        "artwork",
        "generation",
    }
    assert item["generation"] == 1


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
        "pokemon:list:limit=20:offset=0:search=char:type=fire:generation=",
        "pokemon:list:limit=20:offset=0:search=char:type=:generation=",
    ]
    assert all(fnmatch(key, "pokemon:list:*") for key in keys)


async def test_list_pokemons_search_by_number_ignores_leading_zeros(
    client: AsyncClient,
) -> None:
    await create_starters(client)

    plain = await client.get("/pokemons", params={"search": "16"})
    padded = await client.get("/pokemons", params={"search": "016"})

    assert [p["name"] for p in plain.json()["data"]] == ["pidgey"]
    assert [p["name"] for p in padded.json()["data"]] == ["pidgey"]


async def test_list_pokemons_filters_by_generation(client: AsyncClient) -> None:
    await create_pokemon(client, id=1, name="bulbasaur", types=["grass"], generation=1)
    await create_pokemon(client, id=152, name="chikorita", types=["grass"], generation=2)
    await create_pokemon(client, id=155, name="cyndaquil", types=["fire"], generation=2)
    await create_pokemon(client, id=999, name="semgeracao", types=["grass"])

    second = await client.get("/pokemons", params={"generation": 2})
    second_grass = await client.get(
        "/pokemons", params={"generation": 2, "type": "grass", "limit": 1}
    )

    assert [p["name"] for p in second.json()["data"]] == ["chikorita", "cyndaquil"]
    assert second.json()["pagination"]["total"] == 2
    assert [p["name"] for p in second_grass.json()["data"]] == ["chikorita"]
    assert second_grass.json()["pagination"]["total"] == 1


async def test_list_pokemons_keeps_generation_in_navigation_links(
    client: AsyncClient,
) -> None:
    await create_pokemon(client, id=152, name="chikorita", types=["grass"], generation=2)
    await create_pokemon(client, id=155, name="cyndaquil", types=["fire"], generation=2)

    response = await client.get("/pokemons", params={"generation": 2, "limit": 1})

    assert (
        response.json()["pagination"]["next"]
        == "/pokemons?limit=1&offset=1&generation=2"
    )


async def test_list_pokemons_with_generation_zero_returns_422(
    client: AsyncClient,
) -> None:
    response = await client.get("/pokemons", params={"generation": 0})

    assert response.status_code == 422


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


async def test_update_pokemon_details(client: AsyncClient) -> None:
    await create_pokemon(client)

    response = await client.patch(
        "/pokemons/6",
        json={"generation": 1, "description": "Spits fire.", "stats": STATS},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["generation"] == 1
    assert body["description"] == "Spits fire."
    assert body["stats"] == STATS
    assert body["height"] == 17


async def test_update_pokemon_replaces_abilities(
    client: AsyncClient, session_maker: async_sessionmaker
) -> None:
    await create_pokemon(
        client,
        abilities=[{"name": "blaze"}, {"name": "solar-power", "is_hidden": True}],
    )

    # "blaze" continua, mas muda de posição e passa a ser oculta.
    response = await client.patch(
        "/pokemons/6",
        json={
            "abilities": [
                {"name": "tough-claws"},
                {"name": "blaze", "is_hidden": True},
            ]
        },
    )
    detail = await client.get("/pokemons/6")

    expected = [
        {"name": "tough-claws", "is_hidden": False},
        {"name": "blaze", "is_hidden": True},
    ]
    assert response.status_code == 200
    assert response.json()["abilities"] == expected
    assert detail.json()["abilities"] == expected

    async with session_maker() as session:
        links = (await session.execute(select(PokemonAbility))).scalars().all()
    assert len(links) == 2


async def test_update_pokemon_with_empty_abilities_clears_them(
    client: AsyncClient,
) -> None:
    await create_pokemon(client, abilities=[{"name": "blaze"}])

    response = await client.patch("/pokemons/6", json={"abilities": []})

    assert response.status_code == 200
    assert response.json()["abilities"] == []


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


async def test_delete_pokemon_removes_ability_links_but_keeps_abilities(
    client: AsyncClient, session_maker: async_sessionmaker
) -> None:
    await create_pokemon(client, abilities=[{"name": "blaze"}])

    response = await client.delete("/pokemons/6")

    assert response.status_code == 204
    async with session_maker() as session:
        links = (await session.execute(select(PokemonAbility))).scalars().all()
        abilities = (await session.execute(select(Ability))).scalars().all()
    assert links == []
    assert [a.name for a in abilities] == ["blaze"]


async def test_delete_pokemon_not_found_returns_404(client: AsyncClient) -> None:
    response = await client.delete("/pokemons/999")

    assert response.status_code == 404
