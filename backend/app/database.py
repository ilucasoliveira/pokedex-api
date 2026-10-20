import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

load_dotenv()


def normalize_database_url(url: str) -> str:
    # Serviços de hospedagem (Render, Supabase...) entregam a URL como
    # postgres:// ou postgresql://. O SQLAlchemy async precisa do driver asyncpg.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+asyncpg://" + url.removeprefix(prefix)
    return url


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não definida no .env")

engine = create_async_engine(normalize_database_url(DATABASE_URL))

LocalSession = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    db = LocalSession()
    try:
        yield db
    finally:
        await db.close()
