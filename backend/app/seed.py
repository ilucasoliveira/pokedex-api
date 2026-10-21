"""Popula o banco com pokémons da PokéAPI, em lotes.

Uso: python -m app.seed [--start 1] [--end 1025]

Usa a DATABASE_URL do .env. Números que já estão no banco são pulados, então
dá para rodar de novo para completar o que falhou.
"""

import argparse
import asyncio

from app.cache import delete_cache_by_pattern
from app.database import LocalSession, engine
from app.schemas import MAX_BATCH_IMPORT_SIZE
from app.services import import_range

# Último número da Pokédex nacional na PokéAPI.
LAST_POKEDEX_NUMBER = 1025


async def seed(start: int, end: int) -> int:
    failures = 0
    async with LocalSession() as db:
        for batch_start in range(start, end + 1, MAX_BATCH_IMPORT_SIZE):
            batch_end = min(batch_start + MAX_BATCH_IMPORT_SIZE - 1, end)
            result = await import_range(db, batch_start, batch_end)
            print(
                f"{batch_start}-{batch_end}: {len(result.imported)} importados, "
                f"{len(result.skipped)} já existiam, {len(result.failed)} falharam"
            )
            for failure in result.failed:
                print(f"  nº {failure.id}: {failure.detail}")
            failures += len(result.failed)

    # Falhas do Redis são engolidas: sem Redis, o seed funciona do mesmo jeito.
    await delete_cache_by_pattern("pokemon:list:*")
    await engine.dispose()
    return failures


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa pokémons da PokéAPI.")
    parser.add_argument("--start", type=int, default=1, help="primeiro número (padrão: 1)")
    parser.add_argument(
        "--end",
        type=int,
        default=LAST_POKEDEX_NUMBER,
        help=f"último número, inclusive (padrão: {LAST_POKEDEX_NUMBER})",
    )
    args = parser.parse_args()
    if args.start < 1 or args.end < args.start:
        parser.error("use 1 <= --start <= --end")

    failures = asyncio.run(seed(args.start, args.end))
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    main()
