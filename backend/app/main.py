import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.routers import auth, catalog, pokemon

load_dotenv()

# Origem do Vite em desenvolvimento. Em produção, CORS_ORIGINS lista o endereço do front.
DEFAULT_CORS_ORIGINS = "http://localhost:5173"


def parse_cors_origins(value: str | None) -> list[str]:
    # Lista separada por vírgula. Ignora espaços, itens vazios e a barra final,
    # já que o navegador envia a origem sem barra (https://site.com).
    origins = [
        origin.strip().rstrip("/") for origin in (value or "").split(",") if origin.strip()
    ]
    # Variável ausente ou em branco (o Render pode criá-la vazia) vale o padrão,
    # e não "nenhuma origem liberada".
    return origins or [DEFAULT_CORS_ORIGINS]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # As tabelas vêm das migrações do Alembic (python -m app.migrate), que rodam
    # antes da API subir no Dockerfile e no docker-compose.
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
    {
        "name": "catalog",
        "description": "Types and generations present in the database, to build filters.",
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

# O token vai no header Authorization, não em cookie, então não precisamos de credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(os.getenv("CORS_ORIGINS")),
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
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
app.include_router(catalog.router)
