from collections import Counter
from collections.abc import Callable
from typing import Any

import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app import seed as seed_module
from app.models import Pokemon
from app.pokeapi import parse_description, parse_evolution_node

MockPokeAPI = Callable[[Callable[[httpx.Request], httpx.Response]], None]

API = "https://pokeapi.co/api/v2"
SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon"


def pokemon_json(
    pokemon_id: int,
    name: str,
    types: list[str],
    species_id: int | None = None,
    sprite: str | None = "default",
) -> dict[str, Any]:
    species_id = species_id or pokemon_id
    return {
        "id": pokemon_id,
        "name": name,
        "height": 4,
        "weight": 60,
        "types": [
            {"slot": slot, "type": {"name": type_name, "url": "..."}}
            for slot, type_name in enumerate(types, start=1)
        ],
        "sprites": {
            "front_default": (
                f"{SPRITES}/{pokemon_id}.png" if sprite == "default" else sprite
            ),
            "other": {
                "official-artwork": {
                    "front_default": (
                        f"{SPRITES}/other/official-artwork/{pokemon_id}.png"
                        if sprite == "default"
                        else sprite
                    )
                }
            },
        },
        "species": {"name": name, "url": f"{API}/pokemon-species/{species_id}/"},
        # A PokéAPI não garante a ordem: o slot é que manda.
        "abilities": [
            {"is_hidden": True, "slot": 3, "ability": {"name": "lightning-rod", "url": "..."}},
            {"is_hidden": False, "slot": 1, "ability": {"name": "static", "url": "..."}},
        ],
        "stats": [
            {"base_stat": value, "stat": {"name": stat, "url": "..."}}
            for stat, value in [
                ("hp", 35),
                ("attack", 55),
                ("defense", 40),
                ("special-attack", 50),
                ("special-defense", 50),
                ("speed", 90),
            ]
        ],
    }


def species_json(species_id: int, generation: int, chain_id: int) -> dict[str, Any]:
    return {
        "id": species_id,
        "generation": {"name": "...", "url": f"{API}/generation/{generation}/"},
        "evolution_chain": {"url": f"{API}/evolution-chain/{chain_id}/"},
        "flavor_text_entries": [
            {
                "flavor_text": "Old\ntext.",
                "language": {"name": "en", "url": "..."},
                "version": {"name": "red", "url": "..."},
            },
            {
                "flavor_text": "Texto em espanhol.",
                "language": {"name": "es", "url": "..."},
                "version": {"name": "x", "url": "..."},
            },
            {
                "flavor_text": "It stores elec­\ntricity\fin its\ncheeks.",
                "language": {"name": "en", "url": "..."},
                "version": {"name": "sword", "url": "..."},
            },
        ],
    }


def node(
    species_id: int,
    name: str,
    evolves_to: list[dict[str, Any]] | None = None,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "species": {"name": name, "url": f"{API}/pokemon-species/{species_id}/"},
        "evolution_details": details or [],
        "evolves_to": evolves_to or [],
    }


def level_up(level: int) -> dict[str, Any]:
    return {
        "trigger": {"name": "level-up", "url": "..."},
        "min_level": level,
        "item": None,
        "time_of_day": "",
        "needs_overworld_rain": False,
    }


PIKACHU_CHAIN = node(
    172,
    "pichu",
    [
        node(
            25,
            "pikachu",
            [
                node(
                    26,
                    "raichu",
                    details=[
                        {
                            "trigger": {"name": "use-item", "url": "..."},
                            "item": {"name": "thunder-stone", "url": "..."},
                        }
                    ],
                )
            ],
            details=[
                {"trigger": {"name": "level-up", "url": "..."}, "min_happiness": 220}
            ],
        )
    ],
)

BULBASAUR_CHAIN = node(
    1,
    "bulbasaur",
    [node(2, "ivysaur", [node(3, "venusaur", details=[level_up(32)])], [level_up(16)])],
)


class FakePokeAPI:
    """Responde pelos caminhos cadastrados e conta quantas vezes cada um foi pedido."""

    def __init__(self) -> None:
        self.routes: dict[str, dict[str, Any]] = {}
        self.calls: Counter[str] = Counter()

    def add_pokemon(
        self,
        pokemon: dict[str, Any],
        generation: int,
        chain_id: int,
        chain: dict[str, Any],
    ) -> None:
        species_id = int(pokemon["species"]["url"].rstrip("/").rsplit("/", 1)[1])
        self.routes[f"/api/v2/pokemon/{pokemon['id']}"] = pokemon
        self.routes[f"/api/v2/pokemon/{pokemon['name']}"] = pokemon
        self.routes[f"/api/v2/pokemon-species/{species_id}/"] = species_json(
            species_id, generation, chain_id
        )
        self.routes[f"/api/v2/evolution-chain/{chain_id}/"] = {"id": chain_id, "chain": chain}

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls[request.url.path] += 1
        data = self.routes.get(request.url.path)
        return httpx.Response(200, json=data) if data else httpx.Response(404)


@pytest.fixture
def fake_pokeapi(mock_pokeapi: MockPokeAPI) -> FakePokeAPI:
    api = FakePokeAPI()
    api.add_pokemon(pokemon_json(25, "pikachu", ["electric"]), 1, 10, PIKACHU_CHAIN)
    for pokemon_id, name in [(1, "bulbasaur"), (2, "ivysaur"), (3, "venusaur")]:
        api.add_pokemon(
            pokemon_json(pokemon_id, name, ["grass", "poison"]), 1, 1, BULBASAUR_CHAIN
        )
    mock_pokeapi(api)
    return api


# POST /pokemons/import/{name}


async def test_import_pokemon_returns_full_record(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    response = await client.post("/pokemons/import/Pikachu")

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 25
    assert body["name"] == "pikachu"
    assert body["types"] == ["electric"]
    assert body["sprites"] == f"{SPRITES}/25.png"
    assert body["artwork"] == f"{SPRITES}/other/official-artwork/25.png"
    assert body["generation"] == 1
    assert body["description"] == "It stores electricity in its cheeks."
    assert body["stats"] == {
        "hp": 35,
        "attack": 55,
        "defense": 40,
        "special_attack": 50,
        "special_defense": 50,
        "speed": 90,
    }
    assert body["abilities"] == [
        {"name": "static", "is_hidden": False},
        {"name": "lightning-rod", "is_hidden": True},
    ]


async def test_import_pokemon_saves_evolution_chain(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    await client.post("/pokemons/import/pikachu")

    response = await client.get("/pokemons/pikachu")

    chain = response.json()["evolution_chain"]
    assert chain["id"] == 172
    assert chain["name"] == "pichu"
    assert chain["trigger"] is None
    assert chain["sprites"] == f"{SPRITES}/172.png"
    pikachu = chain["evolves_to"][0]
    assert (pikachu["name"], pikachu["trigger"]) == ("pikachu", "level-up")
    assert pikachu["conditions"] == {"min_happiness": 220}
    raichu = pikachu["evolves_to"][0]
    assert raichu["artwork"] == f"{SPRITES}/other/official-artwork/26.png"
    assert raichu["conditions"] == {"item": "thunder-stone"}
    assert raichu["evolves_to"] == []


async def test_import_pokemon_with_long_name_and_no_images(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    urshifu = pokemon_json(10191, "urshifu-single-strike", ["fighting"], 892, sprite=None)
    fake_pokeapi.add_pokemon(urshifu, 8, 450, node(891, "kubfu", [node(892, "urshifu")]))

    response = await client.post("/pokemons/import/urshifu-single-strike")

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "urshifu-single-strike"
    assert body["sprites"] is None
    assert body["artwork"] is None
    assert body["generation"] == 8


async def test_import_pokemon_without_species_keeps_basic_data(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    del fake_pokeapi.routes["/api/v2/pokemon-species/25/"]

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "pikachu"
    assert body["generation"] is None
    assert body["description"] is None
    assert body["evolution_chain"] is None
    assert body["stats"] is not None


async def test_import_existing_pokemon_returns_409(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    await client.post("/pokemons/import/pikachu")

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 409


async def test_import_pokemon_not_found_in_pokeapi_returns_404(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    response = await client.post("/pokemons/import/naoexiste")

    assert response.status_code == 404


async def test_import_pokemon_when_pokeapi_returns_error_returns_503(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    mock_pokeapi(lambda request: httpx.Response(500))

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 503


async def test_import_pokemon_when_species_fails_returns_503(
    client: AsyncClient, fake_pokeapi: FakePokeAPI, mock_pokeapi: MockPokeAPI
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if "pokemon-species" in request.url.path:
            return httpx.Response(500)
        return fake_pokeapi(request)

    mock_pokeapi(handler)

    response = await client.post("/pokemons/import/pikachu")
    after = await client.get("/pokemons/25")

    assert response.status_code == 503
    assert after.status_code == 404


async def test_import_pokemon_when_pokeapi_is_down_returns_503(
    client: AsyncClient, mock_pokeapi: MockPokeAPI
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("PokéAPI fora do ar", request=request)

    mock_pokeapi(handler)

    response = await client.post("/pokemons/import/pikachu")

    assert response.status_code == 503


# POST /pokemons/import (lote)


async def test_import_batch_imports_skips_and_reports_failures(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    await client.post("/pokemons/import/ivysaur")

    # Do 1 ao 4: o 2 já existe e o 4 não está na PokéAPI falsa.
    response = await client.post("/pokemons/import", json={"start": 1, "end": 4})

    assert response.status_code == 200
    assert response.json() == {
        "imported": [1, 3],
        "skipped": [2],
        "failed": [{"id": 4, "detail": "Pokémon not found in PokéAPI."}],
    }
    listing = await client.get("/pokemons")
    assert [p["name"] for p in listing.json()["data"]] == [
        "bulbasaur",
        "ivysaur",
        "venusaur",
    ]


async def test_import_batch_fetches_shared_evolution_chain_once(
    client: AsyncClient, fake_pokeapi: FakePokeAPI
) -> None:
    await client.post("/pokemons/import", json={"start": 1, "end": 3})

    assert fake_pokeapi.calls["/api/v2/evolution-chain/1/"] == 1
    assert fake_pokeapi.calls["/api/v2/pokemon-species/2/"] == 1


async def test_import_batch_reports_pokeapi_errors_per_pokemon(
    client: AsyncClient, fake_pokeapi: FakePokeAPI, mock_pokeapi: MockPokeAPI
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/api/v2/pokemon/2":
            raise httpx.ConnectError("timeout", request=request)
        return fake_pokeapi(request)

    mock_pokeapi(handler)

    response = await client.post("/pokemons/import", json={"start": 1, "end": 3})

    assert response.json()["imported"] == [1, 3]
    assert response.json()["failed"] == [{"id": 2, "detail": "PokéAPI is unavailable."}]


@pytest.mark.parametrize(
    "body",
    [{"start": 5, "end": 4}, {"start": 1, "end": 201}, {"start": 0, "end": 3}],
)
async def test_import_batch_with_invalid_range_returns_422(
    client: AsyncClient, body: dict[str, int]
) -> None:
    response = await client.post("/pokemons/import", json=body)

    assert response.status_code == 422


async def test_import_batch_without_token_returns_401(anon_client: AsyncClient) -> None:
    response = await anon_client.post("/pokemons/import", json={"start": 1, "end": 3})

    assert response.status_code == 401


# Seed (python -m app.seed)


async def test_seed_imports_range_in_batches(
    session_maker: async_sessionmaker[AsyncSession],
    fake_pokeapi: FakePokeAPI,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_delete_cache_by_pattern(pattern: str) -> None:
        return None

    monkeypatch.setattr(seed_module, "LocalSession", session_maker)
    monkeypatch.setattr(seed_module, "delete_cache_by_pattern", fake_delete_cache_by_pattern)
    monkeypatch.setattr(seed_module, "MAX_BATCH_IMPORT_SIZE", 2)

    failures = await seed_module.seed(1, 4)

    async with session_maker() as session:
        ids = (await session.execute(select(Pokemon.id).order_by(Pokemon.id))).scalars().all()
    assert ids == [1, 2, 3]
    assert failures == 1


# Conversão dos dados da PokéAPI


def test_parse_description_uses_latest_english_entry_and_cleans_it() -> None:
    assert parse_description(species_json(25, 1, 10)) == "It stores electricity in its cheeks."
    assert parse_description({"flavor_text_entries": []}) is None


def test_parse_evolution_node_keeps_branches_and_default_conditions() -> None:
    eevee = node(
        133,
        "eevee",
        [
            node(
                134,
                "vaporeon",
                details=[
                    {
                        "trigger": {"name": "use-item", "url": "..."},
                        "item": {"name": "water-stone", "url": "..."},
                        "is_default": True,
                        "version_group": {"name": "red-blue", "url": "..."},
                    }
                ],
            ),
            node(
                700,
                "sylveon",
                details=[
                    {
                        "trigger": {"name": "level-up", "url": "..."},
                        "min_affection": 2,
                        "known_move_type": {"name": "fairy", "url": "..."},
                    },
                    {
                        "trigger": {"name": "level-up", "url": "..."},
                        "min_happiness": 160,
                        "known_move_type": {"name": "fairy", "url": "..."},
                        "is_default": True,
                    },
                ],
            ),
            node(
                237,
                "hitmontop",
                details=[
                    {
                        "trigger": {"name": "level-up", "url": "..."},
                        "min_level": 20,
                        "relative_physical_stats": 0,
                        "evolved_pokemon_form": {"name": "hitmontop", "url": "..."},
                    }
                ],
            ),
        ],
    )

    result = parse_evolution_node(eevee)

    assert [child.name for child in result.evolves_to] == ["vaporeon", "sylveon", "hitmontop"]
    vaporeon, sylveon, hitmontop = result.evolves_to
    assert vaporeon.conditions == {"item": "water-stone"}
    assert sylveon.conditions == {"min_happiness": 160, "known_move_type": "fairy"}
    assert hitmontop.conditions == {"min_level": 20, "relative_physical_stats": 0}
