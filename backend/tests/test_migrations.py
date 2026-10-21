from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text

from app.migrate import alembic_config, run_migrations
from app.models import Base

# Os testes são síncronos de propósito: o env.py do Alembic usa asyncio.run,
# que não pode rodar dentro do loop de um teste assíncrono.


def database_urls(tmp_path: Path) -> tuple[str, str]:
    path = (tmp_path / "migrations.db").as_posix()
    return f"sqlite+aiosqlite:///{path}", f"sqlite:///{path}"


def schema_differences(sync_url: str) -> list[object]:
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    engine.dispose()
    return list(diff)


def current_revision(sync_url: str) -> str | None:
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        revision = MigrationContext.configure(conn).get_current_revision()
    engine.dispose()
    return revision


def test_migrations_create_the_same_schema_as_the_models(tmp_path: Path) -> None:
    async_url, sync_url = database_urls(tmp_path)

    run_migrations(async_url)

    assert schema_differences(sync_url) == []
    assert current_revision(sync_url) == "0002"


def test_migrations_upgrade_database_created_before_alembic(tmp_path: Path) -> None:
    async_url, sync_url = database_urls(tmp_path)
    # Simula o banco de produção: tabelas do create_all antigo, sem alembic_version.
    command.upgrade(alembic_config(async_url), "0001")
    engine = create_engine(sync_url)
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE alembic_version"))
        conn.execute(
            text(
                "INSERT INTO pokemon (id, name, height, weight, sprites) "
                "VALUES (25, 'pikachu', 4, 60, 'https://example.com/25.png')"
            )
        )
    engine.dispose()

    run_migrations(async_url)

    engine = create_engine(sync_url)
    with engine.connect() as conn:
        row = conn.execute(text("SELECT name, sprites, generation FROM pokemon")).one()
    engine.dispose()
    assert tuple(row) == ("pikachu", "https://example.com/25.png", None)
    assert schema_differences(sync_url) == []
    assert current_revision(sync_url) == "0002"


def test_migrations_can_be_reverted(tmp_path: Path) -> None:
    async_url, sync_url = database_urls(tmp_path)
    run_migrations(async_url)

    command.downgrade(alembic_config(async_url), "base")

    engine = create_engine(sync_url)
    tables = inspect(engine).get_table_names()
    engine.dispose()
    assert tables == ["alembic_version"]
