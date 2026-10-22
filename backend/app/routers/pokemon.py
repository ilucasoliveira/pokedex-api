from typing import Any
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.orm import QueryableAttribute, selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import MAX_DB_INT, STAT_FIELDS, Pokemon, Type
from app.pokeapi import (
    PokeAPIUnavailable,
    PokemonNotFoundInPokeAPI,
    create_client,
    fetch_pokemon,
)
from app.schemas import (
    BatchImportResponse,
    ErrorResponse,
    PaginationInfo,
    PokemonBatchImport,
    PokemonCreate,
    PokemonListResponse,
    PokemonResponse,
    PokemonSummary,
    PokemonUpdate,
)
from app.services import (
    apply_stats,
    build_abilities,
    build_types,
    import_range,
    save_pokemon,
)
from app.cache import get_cache, set_cache, delete_cache_by_pattern, delete_cache
from app.security import get_current_user

router = APIRouter(prefix="/pokemons", tags=["pokemons"])

ErrorResponses = dict[int | str, dict[str, Any]]

UNAUTHORIZED: ErrorResponses = {
    401: {"model": ErrorResponse, "description": "Missing, invalid or expired token."}
}
NOT_FOUND: ErrorResponses = {404: {"model": ErrorResponse, "description": "Pokémon not found."}}
CONFLICT: ErrorResponses = {
    409: {
        "model": ErrorResponse,
        "description": "A Pokémon with this id or name already exists.",
    }
}

# Chaves aceitas em ?sort= e a coluna (ou expressão) de cada uma.
SORT_COLUMNS: dict[str, ColumnElement[Any] | QueryableAttribute[Any]] = {
    "number": Pokemon.id,
    "name": Pokemon.name,
    **{field: getattr(Pokemon, field) for field in STAT_FIELDS},
    "total": sum(
        (getattr(Pokemon, field) for field in STAT_FIELDS[1:]),
        start=getattr(Pokemon, STAT_FIELDS[0]),
    ),
}
SORT_KEYS = tuple(SORT_COLUMNS)

# Quantos números cabem no filtro ?ids= (ex.: a lista de favoritos do front).
MAX_IDS_FILTER = 100

# A ficha completa precisa dos tipos e das habilidades já carregados, porque o
# SQLAlchemy assíncrono não carrega relacionamentos sob demanda.
DETAIL_OPTIONS = (selectinload(Pokemon.types), selectinload(Pokemon.abilities))


@router.post(
    "",
    status_code=201,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Create a Pokémon",
    description=(
        "Creates a Pokémon with the given Pokédex number, name and types. "
        "Name, types and abilities are stored in lowercase. Types and abilities that "
        "do not exist yet are created; existing ones are reused. Only `id`, `name`, "
        "`height`, `weight` and `types` are required. **Requires authentication.**"
    ),
    responses={**UNAUTHORIZED, **CONFLICT},
)
async def create_pokemon(
    pokemon: PokemonCreate, db: AsyncSession = Depends(get_db)
) -> Pokemon:
    new_pokemon = await save_pokemon(pokemon, db)
    await delete_cache_by_pattern("pokemon:list:*")
    return new_pokemon


@router.post(
    "/import",
    status_code=200,
    response_model=BatchImportResponse,
    dependencies=[Depends(get_current_user)],
    summary="Import a range of Pokémon from the PokéAPI",
    description=(
        "Imports every Pokédex number from `start` to `end` (at most 200 per call) "
        "with the same data as the single import. Numbers already in the database "
        "are skipped, so the same range can be sent again to retry failures. "
        "To fill the whole Pokédex, send consecutive ranges (1-200, 201-400...). "
        "**Requires authentication.**"
    ),
    responses=UNAUTHORIZED,
)
async def import_pokemon_batch(
    batch: PokemonBatchImport, db: AsyncSession = Depends(get_db)
) -> BatchImportResponse:
    result = await import_range(db, batch.start, batch.end)
    if result.imported:
        await delete_cache_by_pattern("pokemon:list:*")
    return result


@router.post(
    "/import/{name}",
    status_code=201,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Import a Pokémon from the PokéAPI",
    description=(
        "Fetches a Pokémon from the public [PokéAPI](https://pokeapi.co/) by name "
        "or Pokédex number and saves it with the same rules as the create endpoint. "
        "Besides the basic data, it brings the official artwork, generation, "
        "Pokédex entry, base stats, abilities and the whole evolution chain "
        "(from `pokemon-species` and `evolution-chain`). "
        "Each request to the PokéAPI times out after 10 seconds. "
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
) -> Pokemon:
    try:
        async with create_client() as client:
            pokemon_data = await fetch_pokemon(client, name)
    except PokemonNotFoundInPokeAPI as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PokeAPIUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    new_pokemon = await save_pokemon(pokemon_data, db)
    await delete_cache_by_pattern("pokemon:list:*")
    return new_pokemon


@router.get(
    "/{id_or_name}",
    status_code=200,
    response_model=PokemonResponse,
    summary="Get a Pokémon by Pokédex number or name",
    description=(
        "Returns the full record of a Pokémon: basic data, artwork, generation, "
        "Pokédex entry, base stats, abilities and evolution chain. "
        "Accepts the Pokédex number (`25`, leading zeros allowed) or the name "
        "(`pikachu`, case-insensitive). Public endpoint. "
        "Responses are cached in Redis for up to 1 hour and invalidated on every change."
    ),
    responses=NOT_FOUND,
)
async def read_one_pokemon(
    id_or_name: str = Path(
        description="Pokédex number or name.", examples=["25", "pikachu"]
    ),
    db: AsyncSession = Depends(get_db),
) -> PokemonResponse:
    # isascii: isdigit aceita "²" e outros dígitos Unicode, que o int() recusa.
    if id_or_name.isascii() and id_or_name.isdigit():
        if int(id_or_name) > MAX_DB_INT:
            # Não cabe na coluna, então não existe (e o banco recusaria a consulta).
            raise HTTPException(status_code=404, detail="Pokémon not found")
        pokemon_id: int | None = int(id_or_name)
    else:
        # O nome só é traduzido para o número; o cache continua por número,
        # que é a chave invalidada nas escritas.
        pokemon_id = await db.scalar(
            select(Pokemon.id).where(Pokemon.name == id_or_name.strip().lower())
        )
        if pokemon_id is None:
            raise HTTPException(status_code=404, detail="Pokémon not found")

    cache_key = f"pokemon:{pokemon_id}"
    cached_pokemon = await get_cache(cache_key)

    if cached_pokemon:
        return PokemonResponse.model_validate_json(cached_pokemon)

    result = await db.execute(
        select(Pokemon).where(Pokemon.id == pokemon_id).options(*DETAIL_OPTIONS)
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
    response_model=PokemonListResponse,
    summary="List Pokémon",
    description=(
        "Returns a page of Pokémon, plus pagination info: "
        "the total matching the filters and the paths to the next and previous pages. "
        "Each item has the fields needed for a card; the full record (stats, "
        "abilities, evolution) comes from `GET /pokemons/{id_or_name}`. "
        "Optional filters: `search` (part of the name, case-insensitive, or the "
        "Pokédex number), `type` (type name), `generation` and `ids` (a list of "
        "Pokédex numbers, e.g. to load favorites). `sort` picks the order: by "
        "number (default), name, a base stat or the stat total, with a leading "
        "`-` for descending (`-speed` lists the fastest first). Filters and sort "
        "can be combined and are kept in the pagination links. "
        "Public endpoint. Each page is cached in Redis for up to 1 hour."
    ),
)
async def read_pokemons(
    limit: int = Query(
        default=20, ge=1, le=100, description="Items per page (1 to 100)."
    ),
    offset: int = Query(
        default=0,
        ge=0,
        le=MAX_DB_INT,
        description="Number of items to skip before the page.",
    ),
    search: str | None = Query(
        default=None,
        max_length=50,
        description=(
            "Part of the Pokémon name, case-insensitive. A number also matches "
            "the Pokédex number (`25` or `025` finds Pikachu)."
        ),
        examples=["char"],
    ),
    type_name: str | None = Query(
        default=None,
        alias="type",
        max_length=50,
        description="Type name. Only Pokémon with this type are returned.",
        examples=["fire"],
    ),
    generation: int | None = Query(
        default=None,
        ge=1,
        le=MAX_DB_INT,
        description="Generation in which the Pokémon was introduced.",
        examples=[1],
    ),
    ids: str | None = Query(
        default=None,
        max_length=600,
        pattern=r"^\d+(,\d+)*$",
        description=(
            f"Comma-separated Pokédex numbers (at most {MAX_IDS_FILTER}). "
            "Only these Pokémon are returned."
        ),
        examples=["1,4,25"],
    ),
    sort: str = Query(
        default="number",
        pattern=f"^-?({'|'.join(SORT_KEYS)})$",
        description=(
            f"Sort key: {', '.join(f'`{key}`' for key in SORT_KEYS)}. "
            "Prefix with `-` for descending. Ties are broken by Pokédex number."
        ),
        examples=["-total"],
    ),
    db: AsyncSession = Depends(get_db),
) -> PokemonListResponse:
    # Nomes e tipos são salvos em minúsculas, então basta normalizar a entrada.
    # Texto vazio ou só com espaços conta como filtro ausente.
    search = (search or "").strip().lower() or None
    type_name = (type_name or "").strip().lower() or None
    id_list = sorted({int(item) for item in ids.split(",")}) if ids else []
    if len(id_list) > MAX_IDS_FILTER:
        raise HTTPException(
            status_code=422,
            detail=f"ids accepts at most {MAX_IDS_FILTER} Pokédex numbers.",
        )

    # O prefixo pokemon:list: continua o mesmo, então a invalidação por padrão
    # (pokemon:list:*) apaga também as páginas filtradas.
    cache_key = (
        f"pokemon:list:limit={limit}:offset={offset}"
        f":search={search or ''}:type={type_name or ''}"
        f":generation={generation or ''}"
        f":ids={','.join(map(str, id_list))}:sort={sort}"
    )
    cached_page = await get_cache(cache_key)

    if cached_page:
        return PokemonListResponse.model_validate_json(cached_page)

    filters: list[ColumnElement[bool]] = []
    if search:
        # autoescape trata % e _ digitados pelo usuário como texto, não como curinga.
        name_matches = Pokemon.name.contains(search, autoescape=True)
        if search.isascii() and search.isdigit() and int(search) <= MAX_DB_INT:
            # Busca por número aceita zeros à esquerda: "025" encontra o 25.
            filters.append(or_(Pokemon.id == int(search), name_matches))
        else:
            filters.append(name_matches)
    if type_name:
        filters.append(Pokemon.types.any(Type.name == type_name))
    if generation:
        filters.append(Pokemon.generation == generation)
    if ids:
        # Números que não cabem na coluna não existem; sem nenhum válido, a
        # lista volta vazia (e não com todos os pokémons).
        filters.append(Pokemon.id.in_([item for item in id_list if item <= MAX_DB_INT]))

    # Pokémon sem o atributo (cadastro manual) ficam sempre no fim; o número
    # desempata, para a paginação ser estável.
    sort_column = SORT_COLUMNS[sort.removeprefix("-")]
    order = sort_column.desc() if sort.startswith("-") else sort_column.asc()

    total = (
        await db.scalar(select(func.count()).select_from(Pokemon).where(*filters)) or 0
    )

    result = await db.execute(
        select(Pokemon)
        .where(*filters)
        .options(selectinload(Pokemon.types))
        .order_by(order.nulls_last(), Pokemon.id)
        .offset(offset)
        .limit(limit)
    )
    pokemons = result.scalars().all()

    def page_path(page_offset: int) -> str:
        # Os filtros vão junto nos links para a navegação não perder a busca.
        params: dict[str, str | int] = {"limit": limit, "offset": page_offset}
        if search:
            params["search"] = search
        if type_name:
            params["type"] = type_name
        if generation:
            params["generation"] = generation
        if id_list:
            params["ids"] = ",".join(map(str, id_list))
        if sort != "number":
            params["sort"] = sort
        return f"{router.prefix}?{urlencode(params)}"

    next_offset = offset + limit
    previous_offset = max(offset - limit, 0)

    response = PokemonListResponse(
        data=[PokemonSummary.model_validate(p) for p in pokemons],
        pagination=PaginationInfo(
            total=total,
            limit=limit,
            offset=offset,
            next=page_path(next_offset) if next_offset < total else None,
            previous=page_path(previous_offset) if offset > 0 else None,
        ),
    )
    await set_cache(cache_key, response.model_dump_json(), ttl=3600)

    return response


@router.patch(
    "/{pokemon_id}",
    status_code=200,
    response_model=PokemonResponse,
    dependencies=[Depends(get_current_user)],
    summary="Update a Pokémon",
    description=(
        "Partially updates a Pokémon: only the fields sent are changed. "
        "Sending `types` or `abilities` replaces the whole list. The Pokédex number "
        "and the evolution chain cannot be changed. **Requires authentication.**"
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
    pokemon_id: int = Path(
        ge=1, le=MAX_DB_INT, description="Pokédex number.", examples=[6]
    ),
    db: AsyncSession = Depends(get_db),
) -> Pokemon:
    result = await db.execute(
        select(Pokemon).where(Pokemon.id == pokemon_id).options(*DETAIL_OPTIONS)
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
        exclude_unset=True, exclude={"types", "abilities", "stats"}, exclude_none=True
    ).items():
        setattr(pokemon, key, value)

    apply_stats(pokemon, new_data.stats)

    if new_data.types:
        pokemon.types = await build_types(db, new_data.types)

    if new_data.abilities is not None:
        pokemon.abilities = await build_abilities(db, new_data.abilities)

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
        "Deletes a Pokémon and its links to types and abilities. The types and "
        "abilities themselves are kept, since other Pokémon may use them. "
        "**Requires authentication.**"
    ),
    responses={**UNAUTHORIZED, **NOT_FOUND},
)
async def delete_pokemon(
    pokemon_id: int = Path(
        ge=1, le=MAX_DB_INT, description="Pokédex number.", examples=[6]
    ),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Pokemon).where(Pokemon.id == pokemon_id))
    pokemon = result.scalars().first()

    if not pokemon:
        raise HTTPException(status_code=404, detail="Pokémon not found")

    await db.delete(pokemon)
    await db.commit()

    cache_key = f"pokemon:{pokemon_id}"
    await delete_cache(cache_key)
    await delete_cache_by_pattern("pokemon:list:*")
