import json
import httpx

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pokemon, Type
from app.schemas import ErrorResponse, PokemonCreate, PokemonUpdate, PokemonResponse
from app.cache import get_cache, set_cache, delete_cache_by_pattern, delete_cache
from app.security import get_current_user

router = APIRouter(prefix="/pokemon", tags=["pokemon"])

UNAUTHORIZED = {
    401: {"model": ErrorResponse, "description": "Missing, invalid or expired token."}
}
NOT_FOUND = {404: {"model": ErrorResponse, "description": "Pokémon not found."}}
CONFLICT = {
    409: {
        "model": ErrorResponse,
        "description": "A Pokémon with this id or name already exists.",
    }
}


async def save_pokemon(pokemon: PokemonCreate, db: AsyncSession) -> Pokemon:
    result = await db.execute(
        select(Pokemon).where(
            or_(Pokemon.name == pokemon.name, Pokemon.id == pokemon.id)
        )
    )
    if result.scalars().first():
        raise HTTPException(status_code=409, detail="Pokémon already exists.")

    list_types = []
    for name in pokemon.types:
        result_type = await db.execute(select(Type).where(Type.name == name))
        type_obj = result_type.scalars().first()

        if not type_obj:
            type_obj = Type(name=name)

        list_types.append(type_obj)

    new_pokemon = Pokemon(**pokemon.model_dump(exclude={"types"}), types=list_types)

    db.add(new_pokemon)
    await db.commit()

    await delete_cache_by_pattern("pokemon:list:*")
    return new_pokemon


@router.post(
    "",
    status_code=201,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Create a Pokémon",
    description=(
        "Creates a Pokémon with the given Pokédex number, name and types. "
        "Name and types are stored in lowercase. Types that do not exist yet are "
        "created; existing ones are reused. **Requires authentication.**"
    ),
    responses={**UNAUTHORIZED, **CONFLICT},
)
async def create_pokemon(pokemon: PokemonCreate, db: AsyncSession = Depends(get_db)):
    return await save_pokemon(pokemon, db)


@router.post(
    "/import/{name}",
    status_code=201,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Import a Pokémon from the PokéAPI",
    description=(
        "Fetches a Pokémon from the public [PokéAPI](https://pokeapi.co/) by name "
        "or Pokédex number and saves it with the same rules as the create endpoint. "
        "The request to the PokéAPI times out after 10 seconds. "
        "**Requires authentication.**"
    ),
    responses={
        **UNAUTHORIZED,
        404: {
            "model": ErrorResponse,
            "description": "Pokémon not found in the PokéAPI.",
        },
        **CONFLICT,
        503: {
            "model": ErrorResponse,
            "description": "PokéAPI is unavailable or returned an unexpected error.",
        },
    },
)
async def import_pokemon(
    name: str = Path(
        description="Pokémon name or Pokédex number in the PokéAPI.",
        examples=["pikachu"],
    ),
    db: AsyncSession = Depends(get_db),
):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://pokeapi.co/api/v2/pokemon/{name.lower()}"
            )
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="PokéAPI is unavailable.")

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Pokémon not found in PokéAPI.")

    if response.status_code != 200:
        raise HTTPException(
            status_code=503, detail="PokéAPI returned an unexpected error."
        )

    data = response.json()

    pokemon_data = PokemonCreate(
        id=data["id"],
        name=data["name"],
        height=data["height"],
        weight=data["weight"],
        types=[item["type"]["name"] for item in data["types"]],
        sprites=data["sprites"]["front_default"],
    )

    return await save_pokemon(pokemon_data, db)


@router.get(
    "/{pokemon_id}",
    status_code=200,
    response_model=PokemonResponse,
    summary="Get a Pokémon by Pokédex number",
    description=(
        "Returns a single Pokémon. Public endpoint. "
        "Responses are cached in Redis for up to 1 hour and invalidated on every change."
    ),
    responses=NOT_FOUND,
)
async def read_one_pokemon(
    pokemon_id: int = Path(description="Pokédex number.", examples=[6]),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"pokemon:{pokemon_id}"
    cached_pokemon = await get_cache(cache_key)

    if cached_pokemon:
        return PokemonResponse.model_validate_json(cached_pokemon)

    result = await db.execute(
        select(Pokemon)
        .where(Pokemon.id == pokemon_id)
        .options(selectinload(Pokemon.types))
    )
    pokemon = result.scalars().first()

    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    response = PokemonResponse.model_validate(pokemon)
    await set_cache(cache_key, response.model_dump_json(), ttl=3600)

    return response


@router.get(
    "",
    status_code=200,
    response_model=list[PokemonResponse],
    summary="List Pokémon",
    description=(
        "Returns a paginated list of Pokémon ordered by Pokédex number. "
        "Public endpoint. Each page is cached in Redis for up to 1 hour."
    ),
)
async def read_pokemons(
    page: int = Query(default=1, ge=1, description="Page number, starting at 1."),
    limit: int = Query(
        default=10, ge=1, le=100, description="Items per page (1 to 100)."
    ),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"pokemon:list:page={page}:limit={limit}"
    cached_pokemons = await get_cache(cache_key)

    if cached_pokemons:
        return json.loads(cached_pokemons)

    result = await db.execute(
        select(Pokemon)
        .options(selectinload(Pokemon.types))
        .order_by(Pokemon.id)
        .offset((page - 1) * limit)
        .limit(limit)
    )
    pokemons = result.scalars().all()

    response = [PokemonResponse.model_validate(p).model_dump() for p in pokemons]
    await set_cache(cache_key, json.dumps(response), ttl=3600)

    return response


@router.patch(
    "/{pokemon_id}",
    status_code=200,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Update a Pokémon",
    description=(
        "Partially updates a Pokémon: only the fields sent are changed. "
        "Sending `types` replaces the whole list. The Pokédex number cannot be changed. "
        "**Requires authentication.**"
    ),
    responses={
        **UNAUTHORIZED,
        **NOT_FOUND,
        409: {
            "model": ErrorResponse,
            "description": "Another Pokémon already uses this name.",
        },
    },
)
async def update_pokemon(
    new_data: PokemonUpdate,
    pokemon_id: int = Path(description="Pokédex number.", examples=[6]),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pokemon)
        .where(Pokemon.id == pokemon_id)
        .options(selectinload(Pokemon.types))
    )
    pokemon = result.scalars().first()

    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    if new_data.name:
        result = await db.execute(
            select(Pokemon).where(
                Pokemon.name == new_data.name, Pokemon.id != pokemon_id
            )
        )
        conflict = result.scalars().first()

        if conflict:
            raise HTTPException(status_code=409, detail="Pokémon name already exists.")

    for key, value in new_data.model_dump(
        exclude_unset=True, exclude={"types"}, exclude_none=True
    ).items():
        setattr(pokemon, key, value)

    if new_data.types:
        list_types = []
        for name in new_data.types:
            types = await db.execute(select(Type).where(Type.name == name))
            type_obj = types.scalars().first()

            if not type_obj:
                type_obj = Type(name=name)

            list_types.append(type_obj)

        pokemon.types = list_types

    await db.commit()

    cache_key = f"pokemon:{pokemon_id}"
    await delete_cache(cache_key)
    await delete_cache_by_pattern("pokemon:list:*")
    return pokemon


@router.delete(
    "/{pokemon_id}",
    status_code=204,
    dependencies=[Depends(get_current_user)],
    summary="Delete a Pokémon",
    description=(
        "Deletes a Pokémon and its links to types. The types themselves are kept, "
        "since other Pokémon may use them. **Requires authentication.**"
    ),
    responses={**UNAUTHORIZED, **NOT_FOUND},
)
async def delete_pokemon(
    pokemon_id: int = Path(description="Pokédex number.", examples=[6]),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pokemon).where(Pokemon.id == pokemon_id))
    pokemon = result.scalars().first()

    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    await db.delete(pokemon)
    await db.commit()

    cache_key = f"pokemon:{pokemon_id}"
    await delete_cache(cache_key)
    await delete_cache_by_pattern("pokemon:list:*")
