"""Regras de gravação compartilhadas pelas rotas e pelo seed."""

import asyncio

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Ability, Pokemon, PokemonAbility, Type
from app.pokeapi import ChainCache, PokeAPIError, create_client, fetch_pokemon
from app.schemas import (
    BatchImportFailure,
    BatchImportResponse,
    PokemonAbilityItem,
    PokemonCreate,
    PokemonStats,
)

# Quantos pokémons buscar na PokéAPI ao mesmo tempo no import em lote.
MAX_CONCURRENT_FETCHES = 10


async def get_or_create[T: (Type, Ability)](
    db: AsyncSession, model: type[T], name: str
) -> T:
    result = await db.execute(select(model).where(model.name == name))
    instance = result.scalars().first()
    return instance if instance else model(name=name)


async def build_types(db: AsyncSession, names: list[str]) -> list[Type]:
    return [await get_or_create(db, Type, name) for name in names]


async def build_abilities(
    db: AsyncSession, items: list[PokemonAbilityItem]
) -> list[PokemonAbility]:
    abilities: list[PokemonAbility] = []
    for slot, item in enumerate(items, start=1):
        ability = await get_or_create(db, Ability, item.name)
        abilities.append(
            PokemonAbility(ability=ability, is_hidden=item.is_hidden, slot=slot)
        )
    return abilities


def apply_stats(pokemon: Pokemon, stats: PokemonStats | None) -> None:
    for field, value in (stats.model_dump() if stats else {}).items():
        setattr(pokemon, field, value)


async def save_pokemon(pokemon: PokemonCreate, db: AsyncSession) -> Pokemon:
    result = await db.execute(
        select(Pokemon).where(
            or_(Pokemon.name == pokemon.name, Pokemon.id == pokemon.id)
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Pokémon already exists.")

    new_pokemon = Pokemon(
        **pokemon.model_dump(
            exclude={"types", "abilities", "stats", "evolution_chain"}
        ),
        evolution_chain=(
            pokemon.evolution_chain.model_dump() if pokemon.evolution_chain else None
        ),
        types=await build_types(db, pokemon.types),
        abilities=await build_abilities(db, pokemon.abilities),
    )
    apply_stats(new_pokemon, pokemon.stats)

    db.add(new_pokemon)
    await db.commit()
    return new_pokemon


async def import_range(db: AsyncSession, start: int, end: int) -> BatchImportResponse:
    """Importa da PokéAPI os números de start a end, pulando os que já existem."""
    result = await db.execute(
        select(Pokemon.id).where(Pokemon.id.between(start, end))
    )
    existing = set(result.scalars().all())
    to_fetch = [pokemon_id for pokemon_id in range(start, end + 1) if pokemon_id not in existing]

    # As buscas rodam em paralelo (com limite); a gravação é uma por vez, porque
    # a sessão do banco não pode ser usada por várias tarefas ao mesmo tempo.
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_FETCHES)
    chain_cache: ChainCache = {}

    async with create_client() as client:

        async def fetch(pokemon_id: int) -> PokemonCreate:
            async with semaphore:
                return await fetch_pokemon(client, pokemon_id, chain_cache)

        fetched = await asyncio.gather(
            *(fetch(pokemon_id) for pokemon_id in to_fetch), return_exceptions=True
        )

    imported: list[int] = []
    failed: list[BatchImportFailure] = []
    for pokemon_id, item in zip(to_fetch, fetched):
        if isinstance(item, PokeAPIError):
            failed.append(BatchImportFailure(id=pokemon_id, detail=str(item)))
            continue
        if isinstance(item, BaseException):
            raise item
        try:
            await save_pokemon(item, db)
        except HTTPException as exc:
            failed.append(BatchImportFailure(id=pokemon_id, detail=str(exc.detail)))
            continue
        imported.append(pokemon_id)

    return BatchImportResponse(
        imported=imported, skipped=sorted(existing), failed=failed
    )
