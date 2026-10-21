# Pokedex API

![CI](https://github.com/ilucasoliveira/pokedex-api/actions/workflows/ci.yml/badge.svg)

**Site no ar:** [https://rota151-9ykf.onrender.com](https://rota151-9ykf.onrender.com) · **API no ar:** [https://pokedex-api-cb8d.onrender.com/docs](https://pokedex-api-cb8d.onrender.com/docs)

API REST inspirada na [PokéAPI](https://pokeapi.co/) para cadastrar, consultar, atualizar e excluir pokémons. Projeto final do módulo de Python para back-end do curso Full Stack Python da EBAC.

Além do CRUD, a API importa pokémons direto da PokéAPI, guarda leituras em cache no Redis e protege as rotas de escrita com autenticação JWT. Ela alimenta a **Rota151**, a interface web em [`frontend/`](frontend/README.md).

## Funcionalidades

- **CRUD completo** de pokémons, com paginação por `limit`/`offset` (total, próxima e página anterior na resposta) e ordenação pelo número da Pokédex
- **Busca, filtro e ordenação na listagem**: nome ou número (`search`), tipo (`type`), geração (`generation`), lista de números (`ids`) e ordenação por número, nome, atributo ou total (`sort`), combináveis com a paginação
- **Opções dos filtros** em `GET /types` e `GET /generations`, com a quantidade de pokémons em cada, para o front-end não fixar listas na interface
- **Ficha completa** de cada pokémon: artwork oficial, geração, descrição da Pokédex, atributos base, habilidades (com a oculta identificada) e cadeia evolutiva, inclusive com ramificações como a do Eevee
- **CORS configurável** pela variável `CORS_ORIGINS`, para o front-end em outra origem consumir a API
- **Tipos e habilidades com relacionamento N:N**: cada tipo e cada habilidade é cadastrado uma vez só e reaproveitado
- **Importação da PokéAPI** pelo nome ou número (`POST /pokemons/import/pikachu`) ou em lote por faixa de números (`POST /pokemons/import`), juntando `pokemon`, `pokemon-species` e `evolution-chain` numa ficha só
- **Seed em lote** pela linha de comando (`python -m app.seed`), para popular o banco com a Pokédex inteira
- **Migrações versionadas** com Alembic, aplicadas automaticamente antes da API subir
- **Cache com Redis** nas leituras, invalidado a cada alteração. Se o Redis cair, a API continua funcionando direto pelo banco
- **Autenticação JWT**: leitura pública, criação/importação/edição/exclusão exigem token
- **Documentação interativa** em `/docs` (Swagger) com descrições, exemplos e códigos de erro
- **110 testes automatizados** cobrindo sucesso e erro de cada endpoint, o import e as migrações
- **Type hints** em todas as funções, conferidas com mypy
- **Deploy automático** no Render pelo GitHub Actions, só depois dos testes passarem

## Stack

| Camada         | Tecnologia                                            |
| -------------- | ----------------------------------------------------- |
| Linguagem      | Python 3.14                                           |
| Framework      | FastAPI                                               |
| ORM            | SQLAlchemy 2 (async) com asyncpg                      |
| Migrações      | Alembic                                               |
| Banco de dados | PostgreSQL 18                                         |
| Cache          | Redis 7 (redis-py async)                              |
| Autenticação   | JWT (PyJWT) e hash de senha com bcrypt                |
| Cliente HTTP   | httpx (async)                                         |
| Testes         | pytest, pytest-asyncio, SQLite em memória (aiosqlite) |
| Dependências   | Poetry                                                |
| Containers     | Docker e Docker Compose                               |

## Estrutura do projeto

O repositório tem duas partes: a API em `backend/` e a interface web **Rota151** em `frontend/` (React + TypeScript + Vite, em português e inglês, com modo claro e escuro), documentada no [README próprio](frontend/README.md).

```
pokedex-api/
├── backend/
│   ├── app/
│   │   ├── main.py            # cria o app, CORS e plugs dos routers
│   │   ├── database.py        # engine e sessão assíncrona do SQLAlchemy
│   │   ├── models.py          # tabelas (ver "Modelo de dados")
│   │   ├── schemas.py         # schemas Pydantic de entrada e saída
│   │   ├── services.py        # gravação de pokémons e import em lote
│   │   ├── pokeapi.py         # busca na PokéAPI e conversão para o nosso formato
│   │   ├── migrate.py         # aplica as migrações (python -m app.migrate)
│   │   ├── seed.py            # popula o banco pela PokéAPI (python -m app.seed)
│   │   ├── security.py        # hash de senha, geração e validação do JWT
│   │   ├── cache.py           # cliente Redis e funções de cache tolerantes a falha
│   │   └── routers/
│   │       ├── auth.py        # /auth/register e /auth/token
│   │       ├── catalog.py     # /types e /generations (opções dos filtros)
│   │       └── pokemon.py     # CRUD e importação de pokémons
│   ├── migrations/            # Alembic: env.py e versions/ com cada migração
│   ├── tests/
│   │   ├── conftest.py        # fixtures: banco em memória, clientes, mocks
│   │   ├── test_auth.py
│   │   ├── test_catalog.py
│   │   ├── test_cors.py
│   │   ├── test_health.py
│   │   ├── test_import.py
│   │   ├── test_migrations.py
│   │   └── test_pokemon.py
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── poetry.lock
├── frontend/                  # interface web Rota151 (React + TypeScript + Vite)
├── .github/workflows/
│   └── ci.yml                 # testes, build, publicação da imagem e deploy
├── docker-compose.yml         # PostgreSQL, Redis e API
├── render.yaml                # Blueprint do Render (API, PostgreSQL e Redis)
└── .env.example               # usado pelo docker-compose e pela API
```

## Modelo de dados

```
pokemon                        pokemon_type                 type
┌──────────────────┐           ┌──────────────┐           ┌──────────────┐
│ id (PK)          │◄──────────│ pokemon_id   │           │ id (PK)      │
│ name (único)     │           │ type_id      │──────────►│ name (único) │
│ height           │           └──────────────┘           └──────────────┘
│ weight           │            PK (pokemon_id, type_id)
│ sprites          │
│ artwork          │           pokemon_ability              ability
│ generation       │           ┌──────────────┐           ┌──────────────┐
│ description      │◄──────────│ pokemon_id   │           │ id (PK)      │
│ hp, attack,      │           │ ability_id   │──────────►│ name (único) │
│ defense,         │           │ is_hidden    │           └──────────────┘
│ special_attack,  │           │ slot         │
│ special_defense, │           └──────────────┘
│ speed            │            PK (pokemon_id, ability_id)
│ evolution_chain  │ (JSON)
└──────────────────┘

users
┌──────────────────┐
│ id (PK)          │
│ username (único) │
│ hashed_password  │
└──────────────────┘
```

- O `id` do pokémon é o **número da Pokédex**, informado pelo cliente (não é gerado pelo banco). Charizard é 6 em qualquer lugar
- `height` está em **decímetros** e `weight` em **hectogramas**, as mesmas unidades da PokéAPI
- Nome, tipos e habilidades são salvos sempre em **minúsculo**, para que `Charizard` e `charizard` não virem dois registros
- `pokemon_ability` guarda dados próprios da ligação: se a habilidade é **oculta** (`is_hidden`) e a ordem de exibição (`slot`)
- A **cadeia evolutiva** é uma árvore (Eevee ramifica em oito) lida sempre inteira, então fica em JSON em cada membro da cadeia
- Só `sprites`, `artwork`, `generation`, `description`, os atributos e a evolução aceitam nulo: a PokéAPI nem sempre tem esses dados, e um cadastro manual pode não informá-los

## Como rodar com Docker

Pré-requisito: Docker com Docker Compose.

**1. Clone o repositório e entre na pasta**

```bash
git clone https://github.com/ilucasoliveira/pokedex-api.git
cd pokedex-api
```

**2. Crie o `.env` a partir do exemplo**

```bash
cp .env.example .env
```

Abra o `.env` e preencha os valores. Para gerar a `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**3. Suba os serviços**

```bash
docker compose up -d --build
```

Sobem três containers: `pokedex-app` (API), `pokedex-db` (PostgreSQL) e `pokedex-redis` (Redis). Antes de a API iniciar, o container aplica as migrações do banco (`python -m app.migrate`).

**4. Acesse a documentação**

[http://localhost:8000/docs](http://localhost:8000/docs)

**5. (Opcional) Popule o banco**

```bash
docker compose exec app python -m app.seed --end 151
```

Veja [Seed](#seed) para os detalhes.

### Imagem publicada

A cada push na `main` com os testes passando, o GitHub Actions publica a imagem da API no GitHub Container Registry:

```bash
docker pull ghcr.io/ilucasoliveira/pokedex-api:latest
```

Cada versão também recebe uma tag com o hash do commit (`ghcr.io/ilucasoliveira/pokedex-api:<sha>`), para dar para rodar exatamente uma versão anterior. A imagem contém só a API: o banco e o Redis continuam vindo do `docker-compose.yml`.

## Como rodar localmente (sem Docker para a API)

Útil para desenvolver com reload. O banco e o Redis continuam no Docker. O `docker compose` roda na raiz; o Poetry, dentro de `backend/`.

```bash
docker compose up -d db redis
cd backend
poetry install
poetry run python -m app.migrate
poetry run fastapi dev app/main.py
```

O `.env` continua na raiz do repositório: a API o encontra subindo a partir de `backend/`. Nesse modo o `.env` precisa apontar para `localhost` (banco na porta `5433`, Redis na `6379`). Quando a API roda dentro do Docker, o `docker-compose.yml` sobrescreve esses endereços com os nomes dos serviços (`db` e `redis`).

Fora do Docker, as migrações não rodam sozinhas: rode `python -m app.migrate` sempre que puxar uma mudança no esquema.

## Migrações

O esquema do banco é versionado com [Alembic](https://alembic.sqlalchemy.org/), em `backend/migrations/versions/`. O comando `python -m app.migrate` aplica as que faltam e roda antes da API subir no `Dockerfile` (Render) e no `docker-compose.yml`.

Bancos criados antes do Alembic (pelo `create_all` das primeiras versões) não têm a tabela `alembic_version`. O `app.migrate` reconhece esse caso, marca o banco como estando na migração inicial (`0001`) e aplica só o que veio depois, sem recriar tabelas nem perder dados.

Para criar uma migração nova depois de mudar os modelos (dentro de `backend/`, com o banco no ar):

```bash
poetry run alembic revision --autogenerate -m "descrição da mudança"
```

Revise o arquivo gerado antes de aplicar: o autogenerate não detecta tudo (ex.: renomear coluna vira apagar e criar). O teste `test_migrations.py` falha se as migrações e os modelos ficarem diferentes.

## Seed

O `app.seed` importa da PokéAPI uma faixa de números da Pokédex, com a ficha completa, em lotes de até 200. Números que já estão no banco são pulados, então dá para rodar de novo para completar o que falhou.

```bash
cd backend
poetry run python -m app.seed               # Pokédex inteira: 1 a 1025
poetry run python -m app.seed --end 151     # só a primeira geração
poetry run python -m app.seed --start 152 --end 251
```

As buscas rodam em paralelo (até 10 ao mesmo tempo) e cada cadeia evolutiva é buscada uma vez só por lote. Os 151 primeiros levaram cerca de 7 segundos nos testes; a Pokédex inteira deve ficar por volta de um minuto. O seed usa a `DATABASE_URL` do `.env` e limpa o cache das listagens no fim.

Em produção, o mesmo import está em `POST /pokemons/import` (com token), que recebe `{"start": 1, "end": 200}` e devolve o que foi importado, pulado e o que falhou. Para a Pokédex inteira, envie as faixas em sequência (1–200, 201–400 e assim por diante).

## Variáveis de ambiente

| Variável                      | Exemplo                                                                       | Descrição                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `POSTGRES_USER`               | `seu_usuario`                                                                 | Usuário do PostgreSQL                                                                   |
| `POSTGRES_PASSWORD`           | `sua_senha`                                                                   | Senha do PostgreSQL                                                                     |
| `POSTGRES_DB`                 | `register_pokemons`                                                           | Nome do banco                                                                           |
| `DATABASE_URL`                | `postgresql+asyncpg://seu_usuario:sua_senha@localhost:5433/register_pokemons` | URL de conexão usada pela API fora do Docker                                            |
| `REDIS_HOST`                  | `localhost`                                                                   | Host do Redis fora do Docker                                                            |
| `REDIS_PORT`                  | `6379`                                                                        | Porta do Redis                                                                          |
| `REDIS_URL`                   | `redis://host:6379`                                                           | Opcional. URL única do Redis, usada em produção no lugar de `REDIS_HOST` e `REDIS_PORT` |
| `SECRET_KEY`                  | (64 caracteres hexadecimais)                                                  | Chave que assina os tokens JWT. Nunca versionar                                         |
| `JWT_ALGORITHM`               | `HS256`                                                                       | Algoritmo de assinatura do JWT                                                          |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                                                                          | Validade do token, em minutos                                                           |
| `CORS_ORIGINS`                | `http://localhost:5173,https://meu-front.com`                                 | Opcional. Origens que podem chamar a API pelo navegador, separadas por vírgula. Padrão: `http://localhost:5173` (Vite) |

Nenhuma credencial fica no código: tudo vem do `.env`, que está no `.gitignore`.

## Autenticação

Leitura é pública. Criar, importar, editar e excluir exigem token.

**Pelo Swagger (`/docs`):**

1. `POST /auth/register` com `username` e `password`
2. Clique em **Authorize** (cadeado no topo) e entre com o mesmo usuário e senha
3. As rotas protegidas passam a enviar o token sozinhas

**Por linha de comando:**

```bash
# registrar
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "ash", "password": "pikachu123"}'

# login (formulário, não JSON)
curl -X POST http://localhost:8000/auth/token \
  -d "username=ash&password=pikachu123"

# usar o token
curl -X POST http://localhost:8000/pokemons/import/pikachu \
  -H "Authorization: Bearer <access_token>"
```

## Endpoints

| Método   | Rota                      | Auth | Descrição                                                       |
| -------- | ------------------------- | ---- | --------------------------------------------------------------- |
| `GET`    | `/health`                 |      | Verifica se a API está no ar                                    |
| `POST`   | `/auth/register`          |      | Cria um usuário                                                 |
| `POST`   | `/auth/token`             |      | Faz login e devolve o JWT                                       |
| `GET`    | `/pokemons`               |      | Lista paginada (`limit` até 100, `offset`), com filtros `search`, `type`, `generation` e `ids` e ordenação `sort` |
| `GET`    | `/pokemons/{id_or_name}`  |      | Ficha completa de um pokémon, pelo número ou pelo nome          |
| `POST`   | `/pokemons`               | 🔒   | Cadastra um pokémon                                             |
| `POST`   | `/pokemons/import/{name}` | 🔒   | Importa da PokéAPI pelo nome ou número                          |
| `POST`   | `/pokemons/import`        | 🔒   | Importa da PokéAPI uma faixa de números (até 200 por chamada)   |
| `PATCH`  | `/pokemons/{pokemon_id}`  | 🔒   | Atualiza só os campos enviados                                  |
| `DELETE` | `/pokemons/{pokemon_id}`  | 🔒   | Exclui um pokémon                                               |
| `GET`    | `/types`                  |      | Tipos usados por algum pokémon, com a quantidade de cada        |
| `GET`    | `/generations`            |      | Gerações com algum pokémon, com a quantidade de cada            |

**Exemplo de corpo para `POST /pokemons`:**

```json
{
  "id": 6,
  "name": "Charizard",
  "height": 17,
  "weight": 905,
  "types": ["Fire", "Flying"],
  "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png",
  "generation": 1,
  "abilities": [
    { "name": "blaze", "is_hidden": false },
    { "name": "solar-power", "is_hidden": true }
  ]
}
```

Só `id`, `name`, `height`, `weight` e `types` são obrigatórios. Também são aceitos `artwork`, `description` e `stats` (os seis atributos juntos). A cadeia evolutiva vem só pelo import da PokéAPI.

### Paginação

`GET /pokemons` aceita `limit` (padrão 20, máximo 100) e `offset` (padrão 0), no mesmo formato da PokéAPI. A resposta traz os pokémons em `data` e as informações da página em `pagination`:

```
GET /pokemons?limit=20&offset=0
```

```json
{
  "data": [
    {
      "id": 1,
      "name": "bulbasaur",
      "height": 7,
      "weight": 69,
      "types": ["grass", "poison"],
      "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
      "artwork": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",
      "generation": 1
    }
  ],
  "pagination": {
    "total": 151,
    "limit": 20,
    "offset": 0,
    "next": "/pokemons?limit=20&offset=20",
    "previous": null
  }
}
```

- `total`: quantos pokémons atendem aos filtros (sem filtros, quantos existem no banco)
- `next`: caminho da próxima página, ou `null` na última
- `previous`: caminho da página anterior, ou `null` na primeira

Cada item da lista traz o necessário para um card, inclusive os atributos (`stats`), para mostrar o valor usado na ordenação. Habilidades, descrição e evolução ficam na ficha completa, para a listagem continuar leve.

### Busca e filtro

`GET /pokemons` também aceita filtros e ordenação opcionais, que podem ser combinados entre si e com a paginação:

- `search`: parte do nome, sem diferenciar maiúsculas (`char` encontra charmander, charmeleon e charizard). Um número também busca pelo número da Pokédex, com ou sem zeros à esquerda (`25` e `025` encontram o Pikachu)
- `type`: nome do tipo (`fire`, `flying`...)
- `generation`: geração em que o pokémon estreou (`1`, `2`...)
- `ids`: números da Pokédex separados por vírgula, até 100 (`ids=1,4,25`). É como o front carrega os favoritos numa requisição só
- `sort`: ordem da lista. `number` (padrão), `name`, um atributo (`hp`, `attack`, `defense`, `special_attack`, `special_defense`, `speed`) ou `total`; com `-` na frente, decrescente (`-speed` lista os mais rápidos primeiro). Empates são desfeitos pelo número, e pokémons sem atributos ficam no fim

```
GET /pokemons?search=char&type=flying&generation=1
GET /pokemons?type=dragon&sort=-total
```

Com filtros, o `total` conta só os pokémons que atendem a eles, e os caminhos `next` e `previous` já trazem os filtros (ex.: `/pokemons?limit=20&offset=20&search=char&type=fire`).

### Ficha completa

`GET /pokemons/{id_or_name}` aceita o número (`25`, `0025`) ou o nome (`pikachu`, `Pikachu`) e devolve a ficha inteira (abaixo, resumida: toda etapa da evolução traz os mesmos campos da primeira, e o Raichu está em `"..."`):

```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "types": ["electric"],
  "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  "artwork": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
  "generation": 1,
  "description": "When it is angered, it immediately discharges the energy stored in the pouches in its cheeks.",
  "stats": {
    "hp": 35,
    "attack": 55,
    "defense": 40,
    "special_attack": 50,
    "special_defense": 50,
    "speed": 90
  },
  "abilities": [
    { "name": "static", "is_hidden": false },
    { "name": "lightning-rod", "is_hidden": true }
  ],
  "evolution_chain": {
    "id": 172,
    "name": "pichu",
    "trigger": null,
    "conditions": {},
    "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/172.png",
    "artwork": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/172.png",
    "evolves_to": [
      {
        "id": 25,
        "name": "pikachu",
        "trigger": "level-up",
        "conditions": { "min_happiness": 220 },
        "evolves_to": ["..."]
      }
    ]
  }
}
```

- `evolution_chain` começa sempre na primeira etapa. Cada etapa traz em `evolves_to` as seguintes; mais de um item significa que a cadeia ramifica (o Eevee tem oito)
- `trigger` e `conditions` usam os nomes da PokéAPI (`level-up`, `use-item`, `min_level`, `item`, `time_of_day`...). Quando uma evolução tem regras diferentes por jogo, vale a marcada como padrão pela PokéAPI
- `description` é o texto mais recente da Pokédex em inglês, já sem as quebras de linha do jogo. A PokéAPI não tem esses textos em português
- Campos que a PokéAPI não tem para aquele pokémon vêm como `null` (ou `[]` em `abilities`)

### Opções dos filtros

`GET /types` e `GET /generations` dizem quais valores existem no banco para os filtros `type` e `generation`, já com a quantidade de pokémons em cada. Assim o front-end monta os seletores (e as telas de tipos e gerações) sem fixar listas na interface:

```
GET /types        →  [{"name": "bug", "count": 92}, {"name": "dark", "count": 69}, ...]
GET /generations  →  [{"id": 1, "count": 151}, {"id": 2, "count": 100}, ...]
```

- Tipos em ordem alfabética, gerações em ordem crescente
- Só aparecem tipos e gerações com pelo menos um pokémon. A contagem de tipos considera os dois tipos de cada pokémon (o Bulbasaur conta em `grass` e em `poison`)
- O `name` e o `id` são exatamente os valores aceitos em `GET /pokemons?type=` e `?generation=`

**Códigos de resposta usados:**

| Código                | Quando                                                                              |
| --------------------- | ----------------------------------------------------------------------------------- |
| `200` / `201` / `204` | Sucesso                                                                             |
| `401`                 | Token ausente, inválido ou vencido; login incorreto                                 |
| `404`                 | Pokémon não encontrado (no banco ou na PokéAPI)                                     |
| `409`                 | Já existe pokémon com esse número ou nome; username já usado                        |
| `422`                 | Dados inválidos (ex.: número 0, mais de dois tipos, habilidade repetida, senha curta, `offset` negativo, faixa de import com mais de 200) |
| `503`                 | PokéAPI fora do ar ou com erro                                                      |

## Cache

Usa o padrão **cache-aside**:

- **Leitura** (`GET`): procura no Redis; se não achar, busca no banco e grava no cache por até 1 hora
- **Escrita** (`POST`, `PATCH`, `DELETE`): após o commit no banco, apaga a chave do pokémon alterado e todas as páginas de listagem (`pokemon:list:*`, buscadas com `SCAN` para não travar o Redis)
- **Chaves**: `pokemon:{id}` para um pokémon e `pokemon:list:limit=..:offset=..:search=..:type=..:generation=..:ids=..:sort=..` para cada página, então cada combinação de filtros tem seu próprio cache e todas caem no mesmo padrão de invalidação. A busca pelo nome só traduz o nome para o número e usa a mesma chave `pokemon:{id}`. As opções dos filtros ficam em `pokemon:list:types` e `pokemon:list:generations`, de propósito sob o mesmo padrão: toda escrita já as invalida junto com as páginas

Toda operação de cache tem limite de 1 segundo e captura falhas de conexão. Se o Redis cair, a API segue respondendo pelo banco.

## Testes

```bash
cd backend
poetry run pytest -v
```

Ou dentro do container:

```bash
docker compose exec app pytest -v
```

Os testes não dependem de nenhum serviço externo:

- **Banco**: cada teste usa um SQLite em memória novo, criado e descartado na hora, via `app.dependency_overrides`
- **Redis**: substituído por funções vazias com `monkeypatch`
- **PokéAPI**: substituída por uma PokéAPI falsa com `httpx.MockTransport`, que responde `pokemon`, `pokemon-species` e `evolution-chain` e conta as requisições (sucesso, 404, erro 500 e falha de conexão)
- **Migrações**: rodam num SQLite em arquivo temporário, criado por teste

Cobertura por área:

| Arquivo              | O que testa                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `test_pokemon.py`    | CRUD: sucesso, 404, 409, 422, paginação (`data`, `total`, `next`, `previous`), ordenação, reaproveitamento de tipos e habilidades, campos novos (atributos, habilidades ocultas, geração), detalhe por número e por nome, filtros `search` (nome e número), `type`, `generation` e `ids` e ordenação `sort` (sozinhos, combinados, nos links e na chave de cache), página antiga do cache sem `stats` |
| `test_import.py`     | Import da PokéAPI: ficha completa, cadeia evolutiva, nome longo e imagens nulas, espécie ausente, 404, 409, 503; import em lote (pulados, falhas por pokémon, cadeia buscada uma vez, faixa inválida, token); seed; conversão de descrição e de cadeias com ramificação |
| `test_migrations.py` | Migrações geram o mesmo esquema dos modelos, atualizam um banco criado antes do Alembic sem perder dados e podem ser revertidas |
| `test_catalog.py`    | `/types` e `/generations`: contagens, ordem, tipos sem pokémon escondidos, banco vazio, chaves e uso do cache |
| `test_cors.py`    | Preflight e requisições simples de origem permitida e de origem desconhecida, leitura da variável `CORS_ORIGINS` |
| `test_auth.py`    | Registro, login, rotas protegidas sem token, com token falso e com token vencido, rotas públicas                                      |
| `test_health.py`  | Health check                                                                                                                          |

## Deploy

A API e o site estão publicados no [Render](https://render.com/) (plano gratuito):

- **Site (Rota151):** [https://rota151-9ykf.onrender.com](https://rota151-9ykf.onrender.com)
- **Documentação:** [https://pokedex-api-cb8d.onrender.com/docs](https://pokedex-api-cb8d.onrender.com/docs)
- **Health check:** [https://pokedex-api-cb8d.onrender.com/health](https://pokedex-api-cb8d.onrender.com/health)

A infraestrutura está descrita no [`render.yaml`](render.yaml) (Blueprint): o serviço da API a partir do `backend/Dockerfile`, o front-end como site estático, um PostgreSQL e um Redis (Key Value), todos gratuitos e na mesma região. As variáveis de ambiente são ligadas automaticamente: `DATABASE_URL` vem do banco, `REDIS_URL` do Redis e a `SECRET_KEY` é gerada pelo próprio Render. Nenhum segredo fica no repositório. A `CORS_ORIGINS` fica em branco no Blueprint e recebe o endereço do front-end publicado em **Environment**, no painel do serviço (em branco, vale o padrão `http://localhost:5173`).

O deploy automático da API fica **desligado** de propósito: quem dispara o deploy é o GitHub Actions, e só depois que os testes, o build e a publicação da imagem passam.

O front-end (`rota151`) é um site estático: o Render roda `npm ci && npm run build` em `frontend/` e serve o `dist/` por CDN. Ele publica sozinho a cada push na `main` que mexa em `frontend/`, mas só depois que os checks do GitHub Actions passam (`autoDeployTrigger: checksPass`). Qualquer caminho sem arquivo (ex.: `/pokemon/25`) recebe o `index.html`, e o React Router resolve a rota; os arquivos de `/assets`, que têm hash no nome, ficam em cache por um ano.

**Para reproduzir em outra conta do Render:**

1. No Render, **New > Blueprint** e selecione este repositório. O Render lê o `render.yaml` e cria os quatro serviços
2. No serviço `pokedex-api`, **Settings > Deploy Hook**, copie a URL
3. No GitHub, **Settings > Secrets and variables > Actions > New repository secret**, com o nome `RENDER_DEPLOY_HOOK_URL` e a URL copiada como valor
4. Copie o endereço do serviço `rota151` e coloque em `CORS_ORIGINS` da `pokedex-api` (ex.: `https://rota151.onrender.com,http://localhost:5173`). Se a API não estiver em `pokedex-api-cb8d.onrender.com`, ajuste também a `VITE_API_URL` do `rota151` no `render.yaml`

## CI/CD

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions em quatro etapas, cada uma só começando se a anterior passar:

| Job               | Quando roda                        | O que faz                                                                                 |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **Tests**         | Todo push e pull request na `main` | Instala Python 3.14 e as dependências com Poetry e roda os 110 testes                     |
| **Docker build**  | Depois dos testes                  | Confere se o `Dockerfile` constrói a imagem                                               |
| **Publish image** | Só em push na `main`               | Publica a imagem em `ghcr.io/ilucasoliveira/pokedex-api` com as tags `latest` e do commit |
| **Deploy**        | Só em push na `main`               | Chama o Deploy Hook do Render, que constrói e publica a nova versão da API                |

Pull requests passam pelos testes e pelo build, mas não publicam imagem nem fazem deploy.

Em paralelo, o job **Frontend** instala as dependências de `frontend/` com Node 24 e roda lint, testes e build. Ele não bloqueia o deploy da API.

## Decisões técnicas

- **SQLAlchemy assíncrono**: as rotas são `async def` e o acesso ao banco também, sem bloquear o servidor durante as consultas. Tipos e habilidades são carregados com `selectinload` para evitar consultas extras (problema N+1)
- **Lógica de criação centralizada**: `POST /pokemons`, a importação e o seed passam pela mesma função `save_pokemon` (em `services.py`), com as mesmas validações e regras
- **Ficha consolidada no back-end**: o import junta `pokemon`, `pokemon-species` e `evolution-chain` da PokéAPI e guarda tudo no banco. O front-end faz uma requisição por tela, em vez de chamar a PokéAPI várias vezes por pokémon
- **Listagem leve, detalhe completo**: a lista devolve só os campos de um card; atributos, habilidades, descrição e evolução ficam em `GET /pokemons/{id_or_name}`
- **Import em lote com paralelismo limitado**: até 10 buscas simultâneas na PokéAPI, cadeias evolutivas compartilhadas buscadas uma vez só, e gravação uma por vez (a sessão do banco não aceita uso concorrente). Números já cadastrados são pulados, então repetir a faixa só tenta de novo o que falhou
- **Imagens das etapas da evolução** montadas a partir do número, no mesmo padrão de URL que a própria PokéAPI usa, porque a cadeia da PokéAPI só traz o nome de cada espécie
- **Leitura pública, escrita protegida**: mesmo modelo da PokéAPI real
- **Usuário inexistente e senha errada devolvem a mesma mensagem**, para não revelar quais usernames existem
- **Migrações com Alembic** aplicadas antes da API subir, e não dentro do `lifespan`: se uma migração falhar, a API nem inicia, e no Render a versão anterior continua no ar
- **Paginação por `limit`/`offset`**, igual à PokéAPI, com os caminhos de próxima e anterior já prontos na resposta. Os filtros `search`, `type` e `generation` vão junto nesses caminhos, para a navegação não perder a busca
- **CORS sem credentials**: o token vai no header `Authorization`, não em cookie, então a API libera só as origens de `CORS_ORIGINS`, os métodos usados e os headers `Authorization` e `Content-Type`
- **Configuração por URL em produção**: a API aceita `DATABASE_URL` no formato `postgres://` entregue pelos serviços de hospedagem (converte para o driver `asyncpg`) e `REDIS_URL` no lugar de host e porta

## Limitações conhecidas

- **Descrições só em inglês**: a PokéAPI não tem os textos da Pokédex em português
- **Pokémons cadastrados antes dos campos novos** ficam sem artwork, geração, atributos, habilidades e evolução, e o import em lote os pula por já existirem. Para completá-los, exclua e importe de novo
- **Formas alternativas** (megaevoluções, formas regionais) não entram no seed, que importa só a forma padrão de cada número da Pokédex. Dá para importar uma forma pelo nome em `POST /pokemons/import/{name}`
- **Cache durante queda do Redis**: se uma alteração acontecer com o Redis fora do ar, a invalidação falha e o dado antigo pode ser servido do cache até o TTL (1 hora) vencer depois que o Redis voltar
- **Avisos no log com Redis fora**: aparecem mensagens `Future exception was never retrieved` com `gaierror`. São avisos da resolução de nome cancelada pelo timeout, não afetam as respostas
- **Registro aberto e sem refresh token**: qualquer pessoa cria conta, e o token expira sem renovação automática
- **Plano gratuito do Render**: a API "dorme" após 15 minutos sem acesso, e a primeira requisição depois disso demora uns 30 a 60 segundos. O PostgreSQL gratuito do Render expira depois de 30 dias e precisa ser recriado

## Histórico de desenvolvimento

O projeto foi versionado em commits pequenos no padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `test`, `docs`, `chore`), do setup inicial à documentação. Para ver o histórico:

```bash
git log --oneline
```

## Autor

**Lucas de Oliveira Pimentel**
lucasoliveirapimentel.dev@gmail.com
