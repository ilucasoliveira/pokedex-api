from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import get_cache, set_cache
from app.database import get_db
from app.models import Pokemon, PokemonType, Type
from app.schemas import GenerationCount, TypeCount

router = APIRouter(tags=["catalog"])

TYPE_LIST = TypeAdapter(list[TypeCount])
GENERATION_LIST = TypeAdapter(list[GenerationCount])

# As chaves ficam sob pokemon:list: de propósito: toda escrita em pokémon já
# apaga esse padrão, e as contagens mudam junto com a listagem.
TYPES_CACHE_KEY = "pokemon:list:types"
GENERATIONS_CACHE_KEY = "pokemon:list:generations"


@router.get(
    "/types",
    response_model=list[TypeCount],
    summary="List types",
    description=(
        "Returns the types used by at least one Pokémon in the database, in "
        "alphabetical order, with how many Pokémon have each one. Meant for the "
        "type filter of `GET /pokemons`. Public endpoint, cached in Redis for up "
        "to 1 hour and invalidated on every change."
    ),
)
async def read_types(db: AsyncSession = Depends(get_db)) -> list[TypeCount]:
    cached = await get_cache(TYPES_CACHE_KEY)
    if cached:
        return TYPE_LIST.validate_json(cached)

    # O join só traz tipos ligados a algum pokémon. Tipos que ficaram sem
    # nenhum (depois de um PATCH ou DELETE) continuam na tabela, mas não aparecem.
    result = await db.execute(
        select(Type.name, func.count(PokemonType.pokemon_id))
        .join(PokemonType, PokemonType.type_id == Type.id)
        .group_by(Type.name)
        .order_by(Type.name)
    )
    types = [TypeCount(name=name, count=count) for name, count in result.all()]

    await set_cache(TYPES_CACHE_KEY, TYPE_LIST.dump_json(types).decode(), ttl=3600)
    return types


@router.get(
    "/generations",
    response_model=list[GenerationCount],
    summary="List generations",
    description=(
        "Returns the generations that have at least one Pokémon in the database, "
        "in ascending order, with how many Pokémon were introduced in each. Meant "
        "for the generation filter of `GET /pokemons`. Pokémon without a known "
        "generation are not counted. Public endpoint, cached in Redis for up to "
        "1 hour and invalidated on every change."
    ),
)
async def read_generations(
    db: AsyncSession = Depends(get_db),
) -> list[GenerationCount]:
    cached = await get_cache(GENERATIONS_CACHE_KEY)
    if cached:
        return GENERATION_LIST.validate_json(cached)

    result = await db.execute(
        select(Pokemon.generation, func.count())
        .where(Pokemon.generation.is_not(None))
        .group_by(Pokemon.generation)
        .order_by(Pokemon.generation)
    )
    # O WHERE já tira os nulos; o "if" repete o filtro para o mypy saber disso.
    generations = [
        GenerationCount(id=generation, count=count)
        for generation, count in result.all()
        if generation is not None
    ]

    await set_cache(
        GENERATIONS_CACHE_KEY, GENERATION_LIST.dump_json(generations).decode(), ttl=3600
    )
    return generations
