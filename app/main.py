from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.database import get_db, engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="Pokedex",
    description="Registrador de Pokémon com o intuito de armazenar informações vindas da Poké-API",
    version="0.1.0",
    contact={
        "name": "Lucas de Oliveira Pimentel",
        "email": "lucasoliveirapimentel.dev@gmail.com",
    },
)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "OK"}
