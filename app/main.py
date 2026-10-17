from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import engine
from app.models import Base
from app.routers import auth, pokemon


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


DESCRIPTION = """
REST API inspired by the [PokéAPI](https://pokeapi.co/) to register, list, update
and delete Pokémon, with types modelled as a many-to-many relationship.

## Authentication

Reading is public. Creating, importing, updating and deleting require a JWT:

1. Create a user at `POST /auth/register`
2. Click **Authorize** and log in with the same username and password
3. Protected endpoints now send the token automatically

## Units

`height` is in decimetres and `weight` in hectograms, the same units used by the PokéAPI.
"""

TAGS_METADATA = [
    {"name": "auth", "description": "User registration and login (JWT)."},
    {
        "name": "pokemons",
        "description": "Pokémon CRUD and import from the PokéAPI. Reads are cached in Redis.",
    },
    {"name": "health", "description": "Liveness check."},
]

app = FastAPI(
    lifespan=lifespan,
    title="Pokedex",
    description=DESCRIPTION,
    version="0.1.0",
    contact={
        "name": "Lucas de Oliveira Pimentel",
        "email": "lucasoliveirapimentel.dev@gmail.com",
    },
    openapi_tags=TAGS_METADATA,
)


@app.get(
    "/health",
    tags=["health"],
    summary="Health check",
    description="Returns OK when the API process is running. Does not check the database or Redis.",
)
def health_check() -> dict[str, str]:
    return {"status": "OK"}


app.include_router(auth.router)
app.include_router(pokemon.router)
