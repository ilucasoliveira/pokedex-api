"""Aplica as migrações do Alembic. Roda antes da API subir (Dockerfile e compose).

Uso: python -m app.migrate
"""

import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from sqlalchemy import inspect, pool
from sqlalchemy.ext.asyncio import create_async_engine

from app.database import normalize_database_url

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Revisão que corresponde ao esquema criado pelo create_all antes do Alembic.
BASELINE_REVISION = "0001"


def alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    # Por attributes, e não set_main_option, para um "%" na senha não quebrar o ini.
    config.attributes["database_url"] = database_url
    return config


async def is_legacy_database(database_url: str) -> bool:
    # Bancos criados pelo create_all já têm as tabelas, mas não a alembic_version.
    engine = create_async_engine(
        normalize_database_url(database_url), poolclass=pool.NullPool
    )
    async with engine.connect() as conn:
        tables = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_table_names()
        )
    await engine.dispose()
    return "pokemon" in tables and "alembic_version" not in tables


def run_migrations(database_url: str) -> None:
    config = alembic_config(database_url)
    if asyncio.run(is_legacy_database(database_url)):
        # Marca o banco antigo como já estando no esquema inicial, para o
        # Alembic aplicar só o que veio depois, sem recriar tabelas.
        command.stamp(config, BASELINE_REVISION)
    command.upgrade(config, "head")


if __name__ == "__main__":
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL não definida no .env")
    run_migrations(url)
