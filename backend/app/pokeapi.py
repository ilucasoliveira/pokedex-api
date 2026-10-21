"""Busca dados na PokéAPI e converte para o formato da nossa API."""

import asyncio
from typing import Any

import httpx

from app.models import STAT_FIELDS
from app.schemas import EvolutionNode, PokemonAbilityItem, PokemonCreate, PokemonStats

POKEAPI_URL = "https://pokeapi.co/api/v2"
TIMEOUT_SECONDS = 10.0

# Mesmo padrão de URL que a PokéAPI devolve em sprites.front_default e em
# sprites.other.official-artwork. A cadeia evolutiva só traz o nome da espécie,
# então as imagens das etapas são montadas a partir do número.
SPRITE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png"
ARTWORK_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png"

# Campos de evolution_details que descrevem a própria entrada, não a condição.
IGNORED_EVOLUTION_FIELDS = {"trigger", "is_default", "version_group", "required_pokemon_form"}

JSON = dict[str, Any]
# Várias espécies dividem a mesma cadeia (bulbasaur, ivysaur, venusaur). No
# import em lote, a primeira busca fica guardada e as outras reaproveitam.
ChainCache = dict[str, asyncio.Future[JSON | None]]


class PokeAPIError(Exception):
    pass


class PokemonNotFoundInPokeAPI(PokeAPIError):
    pass


class PokeAPIUnavailable(PokeAPIError):
    pass


def create_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=TIMEOUT_SECONDS)


async def get_json(client: httpx.AsyncClient, url: str) -> JSON | None:
    """Faz o GET e devolve o JSON, ou None se o recurso não existe (404)."""
    try:
        response = await client.get(url)
    except httpx.RequestError:
        raise PokeAPIUnavailable("PokéAPI is unavailable.")

    if response.status_code == 404:
        return None
    if response.status_code != 200:
        raise PokeAPIUnavailable("PokéAPI returned an unexpected error.")

    data: JSON = response.json()
    return data


async def get_json_cached(
    client: httpx.AsyncClient, url: str, cache: ChainCache | None
) -> JSON | None:
    if cache is None:
        return await get_json(client, url)
    if url not in cache:
        cache[url] = asyncio.ensure_future(get_json(client, url))
    return await cache[url]


def resource_id(url: str) -> int:
    # As URLs da PokéAPI terminam no id: .../pokemon-species/133/
    return int(url.rstrip("/").rsplit("/", 1)[1])


def parse_description(species: JSON) -> str | None:
    entries = [
        entry["flavor_text"]
        for entry in species.get("flavor_text_entries", [])
        if entry["language"]["name"] == "en"
    ]
    if not entries:
        return None
    # A lista vem em ordem de versão; a última entrada em inglês é a mais recente.
    # Os textos vêm com quebras de linha e hífens suaves da tela do jogo.
    text = entries[-1].replace("­\n", "").replace("­", "")
    return " ".join(text.split())


def parse_generation(species: JSON) -> int | None:
    generation = species.get("generation")
    return resource_id(generation["url"]) if generation else None


def parse_stats(pokemon: JSON) -> PokemonStats | None:
    values = {
        item["stat"]["name"].replace("-", "_"): item["base_stat"]
        for item in pokemon.get("stats", [])
    }
    if not all(field in values for field in STAT_FIELDS):
        return None
    return PokemonStats(**{field: values[field] for field in STAT_FIELDS})


def parse_abilities(pokemon: JSON) -> list[PokemonAbilityItem]:
    items = sorted(pokemon.get("abilities", []), key=lambda item: item["slot"])
    return [
        PokemonAbilityItem(name=item["ability"]["name"], is_hidden=item["is_hidden"])
        for item in items
    ]


def parse_evolution_conditions(
    details: list[JSON],
) -> tuple[str | None, dict[str, str | int | bool]]:
    if not details:
        return None, {}

    # Uma mesma evolução pode ter regras diferentes por jogo; a marcada como
    # padrão é a atual. Sem marcação, vale a primeira.
    detail = next((item for item in details if item.get("is_default")), details[0])
    trigger = detail["trigger"]["name"] if detail.get("trigger") else None

    conditions: dict[str, str | int | bool] = {}
    for key, value in detail.items():
        if key in IGNORED_EVOLUTION_FIELDS:
            continue
        if isinstance(value, dict):
            value = value.get("name")
        # Zero é condição válida (relative_physical_stats), então não dá para
        # descartar tudo que é "falso": só vazios e False.
        if value is None or value is False or value == "":
            continue
        if isinstance(value, (str, int, bool)):
            conditions[key] = value
    return trigger, conditions


def parse_evolution_node(node: JSON) -> EvolutionNode:
    species_id = resource_id(node["species"]["url"])
    trigger, conditions = parse_evolution_conditions(node.get("evolution_details") or [])
    return EvolutionNode(
        id=species_id,
        name=node["species"]["name"],
        trigger=trigger,
        conditions=conditions,
        sprites=SPRITE_URL.format(id=species_id),
        artwork=ARTWORK_URL.format(id=species_id),
        evolves_to=[parse_evolution_node(child) for child in node.get("evolves_to", [])],
    )


async def fetch_pokemon(
    client: httpx.AsyncClient,
    id_or_name: str | int,
    chain_cache: ChainCache | None = None,
) -> PokemonCreate:
    """Junta /pokemon, /pokemon-species e /evolution-chain numa ficha só."""
    data = await get_json(client, f"{POKEAPI_URL}/pokemon/{str(id_or_name).lower()}")
    if data is None:
        raise PokemonNotFoundInPokeAPI("Pokémon not found in PokéAPI.")

    # Espécie e cadeia completam a ficha. Se não existirem (404), os campos
    # ficam nulos em vez de impedir o import.
    species = None
    if data.get("species"):
        species = await get_json(client, data["species"]["url"])

    evolution_chain = None
    if species and species.get("evolution_chain"):
        chain = await get_json_cached(
            client, species["evolution_chain"]["url"], chain_cache
        )
        if chain:
            evolution_chain = parse_evolution_node(chain["chain"])

    sprites = data.get("sprites") or {}
    artwork = (sprites.get("other") or {}).get("official-artwork") or {}

    return PokemonCreate(
        id=data["id"],
        name=data["name"],
        height=data["height"],
        weight=data["weight"],
        types=[item["type"]["name"] for item in data["types"]],
        sprites=sprites.get("front_default"),
        artwork=artwork.get("front_default"),
        generation=parse_generation(species) if species else None,
        description=parse_description(species) if species else None,
        stats=parse_stats(data),
        abilities=parse_abilities(data),
        evolution_chain=evolution_chain,
    )
