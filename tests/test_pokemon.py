import httpx
from sqlalchemy import select

from app.models import Type


def make_payload(**overrides):
    payload = {
        "id": 6,
        "name": "Charizard",
        "height": 17,
        "weight": 905,
        "types": ["Fire", "Flying"],
        "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
    }
    payload.update(overrides)
    return payload


async def create_pokemon(client, **overrides):
    response = await client.post("/pokemon", json=make_payload(**overrides))
    assert response.status_code == 201
    return response.json()


POKEAPI_PIKACHU = {
    "id": 25,
    "name": "pikachu",
    "height": 4,
    "weight": 60,
    "types": [{"slot": 1, "type": {"name": "electric", "url": "..."}}],
    "sprites": {
        "front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
    },
}


# POST /pokemon


async def test_create_pokemon_returns_201_and_normalizes_names(client):
    response = await client.post("/pokemon", json=make_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 6
    assert body["name"] == "charizard"
    assert sorted(body["types"]) == ["fire", "flying"]


async def test_create_pokemon_with_existing_id_returns_409(client):
    await create_pokemon(client)

    response = await client.post("/pokemon", json=make_payload(name="outro"))

    assert response.status_code == 409


async def test_create_pokemon_with_existing_name_returns_409(client):
    await create_pokemon(client)

    response = await client.post("/pokemon", json=make_payload(id=999))

    assert response.status_code == 409


async def test_create_pokemon_with_invalid_id_returns_422(client):
    response = await client.post("/pokemon", json=make_payload(id=0))

    assert response.status_code == 422


async def test_create_pokemon_with_more_than_two_types_returns_422(client):
    response = await client.post(
        "/pokemon", json=make_payload(types=["fire", "flying", "dragon"])
    )

    assert response.status_code == 422


async def test_create_pokemon_reuses_existing_types(client, session_maker):
    await create_pokemon(client, id=16, name="pidgey", types=["normal", "flying"])
    await create_pokemon(client, id=6, name="charizard", types=["fire", "flying"])

    async with session_maker() as session:
        result = await session.execute(select(Type))
        names = sorted(t.name for t in result.scalars().all())

    assert names == ["fire", "flying", "normal"]


# GET /pokemon/{id} e GET /pokemon


async def test_get_pokemon_by_id_returns_200(client):
    await create_pokemon(client)

    response = await client.get("/pokemon/6")

    assert response.status_code == 200
    assert response.json()["name"] == "charizard"


async def test_get_pokemon_by_id_not_found_returns_404(client):
    response = await client.get("/pokemon/999")

    assert response.status_code == 404


async def test_list_pokemons_is_paginated_and_ordered_by_id(client):
    await create_pokemon(client, id=25, name="pikachu", types=["electric"])
    await create_pokemon(client, id=6, name="charizard", types=["fire", "flying"])
    await create_pokemon(client, id=1, name="bulbasaur", types=["grass", "poison"])

    first_page = await client.get("/pokemon", params={"page": 1, "limit": 2})
    second_page = await client.get("/pokemon", params={"page": 2, "limit": 2})

    assert first_page.status_code == 200
    assert [p["id"] for p in first_page.json()] == [1, 6]
    assert [p["id"] for p in second_page.json()] == [25]


async def test_list_pokemons_with_invalid_page_returns_422(client):
    response = await client.get("/pokemon", params={"page": 0})

    assert response.status_code == 422


# PATCH /pokemon/{id}


async def test_update_pokemon_changes_only_sent_fields(client):
    await create_pokemon(client)

    response = await client.patch("/pokemon/6", json={"weight": 950})

    assert response.status_code == 200
    body = response.json()
    assert body["weight"] == 950
    assert body["height"] == 17
    assert body["name"] == "charizard"


async def test_update_pokemon_types(client):
    await create_pokemon(client)

    response = await client.patch("/pokemon/6", json={"types": ["Fire", "Dragon"]})

    assert response.status_code == 200
    assert sorted(response.json()["types"]) == ["dragon", "fire"]


async def test_update_pokemon_with_existing_name_returns_409(client):
    await create_pokemon(client)
    await create_pokemon(client, id=16, name="pidgey", types=["normal", "flying"])

    response = await client.patch("/pokemon/6", json={"name": "Pidgey"})

    assert response.status_code == 409


async def test_update_pokemon_not_found_returns_404(client):
    response = await client.patch("/pokemon/999", json={"weight": 1})

    assert response.status_code == 404


# DELETE /pokemon/{id}


async def test_delete_pokemon_returns_204_and_removes_it(client):
    await create_pokemon(client)

    response = await client.delete("/pokemon/6")
    after_delete = await client.get("/pokemon/6")

    assert response.status_code == 204
    assert after_delete.status_code == 404


async def test_delete_pokemon_not_found_returns_404(client):
    response = await client.delete("/pokemon/999")

    assert response.status_code == 404


# POST /pokemon/import/{name}


async def test_import_pokemon_returns_201(client, mock_pokeapi):
    def handler(request):
        assert request.url.path == "/api/v2/pokemon/pikachu"
        return httpx.Response(200, json=POKEAPI_PIKACHU)

    mock_pokeapi(handler)

    response = await client.post("/pokemon/import/Pikachu")

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 25
    assert body["name"] == "pikachu"
    assert body["types"] == ["electric"]


async def test_import_existing_pokemon_returns_409(client, mock_pokeapi):
    mock_pokeapi(lambda request: httpx.Response(200, json=POKEAPI_PIKACHU))
    await client.post("/pokemon/import/pikachu")

    response = await client.post("/pokemon/import/pikachu")

    assert response.status_code == 409


async def test_import_pokemon_not_found_in_pokeapi_returns_404(client, mock_pokeapi):
    mock_pokeapi(lambda request: httpx.Response(404))

    response = await client.post("/pokemon/import/naoexiste")

    assert response.status_code == 404


async def test_import_pokemon_when_pokeapi_returns_error_returns_503(
    client, mock_pokeapi
):
    mock_pokeapi(lambda request: httpx.Response(500))

    response = await client.post("/pokemon/import/pikachu")

    assert response.status_code == 503


async def test_import_pokemon_when_pokeapi_is_down_returns_503(client, mock_pokeapi):
    def handler(request):
        raise httpx.ConnectError("PokéAPI fora do ar", request=request)

    mock_pokeapi(handler)

    response = await client.post("/pokemon/import/pikachu")

    assert response.status_code == 503
