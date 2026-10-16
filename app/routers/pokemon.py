from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Pokemon, Type, PokemonType
from app.schemas import PokemonCreate, PokemonUpdate, PokemonResponse

router = APIRouter(prefix="/pokemon", tags=["pokemon"])


@router.post("", status_code=201, response_model=PokemonResponse)
async def create_pokemon(pokemon: PokemonCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pokemon).where(
            or_(Pokemon.name == pokemon.name, Pokemon.id == pokemon.id)
        )
    )
    conflict = result.scalars().first()

    if conflict:
        raise HTTPException(status_code=409, detail="Pokémon already exists.")

    list_types = []
    for name in pokemon.types:
        types = await db.execute(select(Type).where(Type.name == name))
        type_obj = types.scalars().first()

        if not type_obj:
            type_obj = Type(name=name)

        list_types.append(type_obj)

    new_pokemon = Pokemon(**pokemon.model_dump(exclude={"types"}), types=list_types)

    db.add(new_pokemon)
    await db.commit()

    return new_pokemon


@router.get("/{pokemon_id}", status_code=200, response_model=PokemonResponse)
async def read_one_pokemon(pokemon_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Pokemon)
        .where(Pokemon.id == pokemon_id)
        .options(selectinload(Pokemon.types))
    )
    pokemon = result.scalars().first()

    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    return pokemon
