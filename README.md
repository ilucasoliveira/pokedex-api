# Pokedex API

![CI](https://github.com/ilucasoliveira/pokedex-api/actions/workflows/ci.yml/badge.svg)

API REST inspirada na [PokéAPI](https://pokeapi.co/) para cadastrar, consultar, atualizar e excluir pokémons. Projeto final do módulo de Python para back-end do curso Full Stack Python da EBAC.

Além do CRUD, a API importa pokémons direto da PokéAPI, guarda leituras em cache no Redis e protege as rotas de escrita com autenticação JWT.

## Funcionalidades

- **CRUD completo** de pokémons, com paginação e ordenação pelo número da Pokédex
- **Tipos com relacionamento N:N**: um pokémon tem um ou dois tipos, e cada tipo é cadastrado uma vez só e reaproveitado
- **Importação da PokéAPI** pelo nome ou número (`POST /pokemon/import/pikachu`)
- **Cache com Redis** nas leituras, invalidado a cada alteração. Se o Redis cair, a API continua funcionando direto pelo banco
- **Autenticação JWT**: leitura pública, criação/importação/edição/exclusão exigem token
- **Documentação interativa** em `/docs` (Swagger) com descrições, exemplos e códigos de erro
- **32 testes automatizados** cobrindo sucesso e erro de cada endpoint

## Stack

| Camada         | Tecnologia                                            |
| -------------- | ----------------------------------------------------- |
| Linguagem      | Python 3.14                                           |
| Framework      | FastAPI                                               |
| ORM            | SQLAlchemy 2 (async) com asyncpg                      |
| Banco de dados | PostgreSQL 18                                         |
| Cache          | Redis 7 (redis-py async)                              |
| Autenticação   | JWT (PyJWT) e hash de senha com bcrypt                |
| Cliente HTTP   | httpx (async)                                         |
| Testes         | pytest, pytest-asyncio, SQLite em memória (aiosqlite) |
| Dependências   | Poetry                                                |
| Containers     | Docker e Docker Compose                               |

## Estrutura do projeto

```
projeto_final_ebac/
├── app/
│   ├── main.py            # cria o app, lifespan e plugs dos routers
│   ├── database.py        # engine e sessão assíncrona do SQLAlchemy
│   ├── models.py          # tabelas: pokemon, type, pokemon_type, users
│   ├── schemas.py         # schemas Pydantic de entrada e saída
│   ├── security.py        # hash de senha, geração e validação do JWT
│   ├── cache.py           # cliente Redis e funções de cache tolerantes a falha
│   └── routers/
│       ├── auth.py        # /auth/register e /auth/token
│       └── pokemon.py     # CRUD e importação de pokémons
├── tests/
│   ├── conftest.py        # fixtures: banco em memória, clientes, mocks
│   ├── test_auth.py
│   ├── test_health.py
│   └── test_pokemon.py
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── poetry.lock
└── .env.example
```

## Modelo de dados

```
pokemon                    pokemon_type                 type
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│ id (PK)      │◄──────────│ pokemon_id   │           │ id (PK)      │
│ name (único) │           │ type_id      │──────────►│ name (único) │
│ height       │           └──────────────┘           └──────────────┘
│ weight       │            PK composta
│ sprites      │            (pokemon_id, type_id)
└──────────────┘

users
┌──────────────────┐
│ id (PK)          │
│ username (único) │
│ hashed_password  │
└──────────────────┘
```

- O `id` do pokémon é o **número da Pokédex**, informado pelo cliente (não é gerado pelo banco). Charizard é 6 em qualquer lugar
- `height` está em **decímetros** e `weight` em **hectogramas**, as mesmas unidades da PokéAPI
- Nome e tipos são salvos sempre em **minúsculo**, para que `Charizard` e `charizard` não virem dois registros

## Como rodar com Docker

Pré-requisito: Docker com Docker Compose.

**1. Clone o repositório e entre na pasta**

```bash
git clone <url-do-repositorio>
cd projeto_final_ebac
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

Sobem três containers: `pokedex-app` (API), `pokedex-db` (PostgreSQL) e `pokedex-redis` (Redis). As tabelas são criadas automaticamente quando a API inicia.

**4. Acesse a documentação**

[http://localhost:8000/docs](http://localhost:8000/docs)

### Imagem publicada

A cada push na `main` com os testes passando, o GitHub Actions publica a imagem da API no GitHub Container Registry:

```bash
docker pull ghcr.io/ilucasoliveira/pokedex-api:latest
```

Cada versão também recebe uma tag com o hash do commit (`ghcr.io/ilucasoliveira/pokedex-api:<sha>`), para dar para rodar exatamente uma versão anterior. A imagem contém só a API: o banco e o Redis continuam vindo do `docker-compose.yml`.

## Como rodar localmente (sem Docker para a API)

Útil para desenvolver com reload. O banco e o Redis continuam no Docker.

```bash
poetry install
docker compose up -d db redis
poetry run fastapi dev app/main.py
```

Nesse modo o `.env` precisa apontar para `localhost` (banco na porta `5433`, Redis na `6379`). Quando a API roda dentro do Docker, o `docker-compose.yml` sobrescreve esses endereços com os nomes dos serviços (`db` e `redis`).

## Variáveis de ambiente

| Variável                      | Exemplo                                                                       | Descrição                                       |
| ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| `POSTGRES_USER`               | `seu_usuario`                                                                 | Usuário do PostgreSQL                           |
| `POSTGRES_PASSWORD`           | `sua_senha`                                                                   | Senha do PostgreSQL                             |
| `POSTGRES_DB`                 | `register_pokemons`                                                           | Nome do banco                                   |
| `DATABASE_URL`                | `postgresql+asyncpg://seu_usuario:sua_senha@localhost:5433/register_pokemons` | URL de conexão usada pela API fora do Docker    |
| `REDIS_HOST`                  | `localhost`                                                                   | Host do Redis fora do Docker                    |
| `REDIS_PORT`                  | `6379`                                                                        | Porta do Redis                                  |
| `SECRET_KEY`                  | (64 caracteres hexadecimais)                                                  | Chave que assina os tokens JWT. Nunca versionar |
| `JWT_ALGORITHM`               | `HS256`                                                                       | Algoritmo de assinatura do JWT                  |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                                                                          | Validade do token, em minutos                   |

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
curl -X POST http://localhost:8000/pokemon/import/pikachu \
  -H "Authorization: Bearer <access_token>"
```

## Endpoints

| Método   | Rota                     | Auth | Descrição                                                     |
| -------- | ------------------------ | ---- | ------------------------------------------------------------- |
| `GET`    | `/health`                |      | Verifica se a API está no ar                                  |
| `POST`   | `/auth/register`         |      | Cria um usuário                                               |
| `POST`   | `/auth/token`            |      | Faz login e devolve o JWT                                     |
| `GET`    | `/pokemon`               |      | Lista paginada (`page`, `limit` até 100), ordenada por número |
| `GET`    | `/pokemon/{pokemon_id}`  |      | Busca um pokémon pelo número                                  |
| `POST`   | `/pokemon`               | 🔒   | Cadastra um pokémon                                           |
| `POST`   | `/pokemon/import/{name}` | 🔒   | Importa da PokéAPI pelo nome ou número                        |
| `PATCH`  | `/pokemon/{pokemon_id}`  | 🔒   | Atualiza só os campos enviados                                |
| `DELETE` | `/pokemon/{pokemon_id}`  | 🔒   | Exclui um pokémon                                             |

**Exemplo de corpo para `POST /pokemon`:**

```json
{
  "id": 6,
  "name": "Charizard",
  "height": 17,
  "weight": 905,
  "types": ["Fire", "Flying"],
  "sprites": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png"
}
```

**Códigos de resposta usados:**

| Código                | Quando                                                           |
| --------------------- | ---------------------------------------------------------------- |
| `200` / `201` / `204` | Sucesso                                                          |
| `401`                 | Token ausente, inválido ou vencido; login incorreto              |
| `404`                 | Pokémon não encontrado (no banco ou na PokéAPI)                  |
| `409`                 | Já existe pokémon com esse número ou nome; username já usado     |
| `422`                 | Dados inválidos (ex.: número 0, mais de dois tipos, senha curta) |
| `503`                 | PokéAPI fora do ar ou com erro                                   |

## Cache

Usa o padrão **cache-aside**:

- **Leitura** (`GET`): procura no Redis; se não achar, busca no banco e grava no cache por até 1 hora
- **Escrita** (`POST`, `PATCH`, `DELETE`): após o commit no banco, apaga a chave do pokémon alterado e todas as páginas de listagem (`pokemon:list:*`, buscadas com `SCAN` para não travar o Redis)

Toda operação de cache tem limite de 1 segundo e captura falhas de conexão. Se o Redis cair, a API segue respondendo pelo banco.

## Testes

```bash
poetry run pytest -v
```

Ou dentro do container:

```bash
docker compose exec app pytest -v
```

Os testes não dependem de nenhum serviço externo:

- **Banco**: cada teste usa um SQLite em memória novo, criado e descartado na hora, via `app.dependency_overrides`
- **Redis**: substituído por funções vazias com `monkeypatch`
- **PokéAPI**: substituída por respostas simuladas com `httpx.MockTransport` (sucesso, 404, erro 500 e falha de conexão)

Cobertura por área:

| Arquivo           | O que testa                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `test_pokemon.py` | CRUD e importação: sucesso, 404, 409, 422, 503, paginação, ordenação, reaproveitamento de tipos  |
| `test_auth.py`    | Registro, login, rotas protegidas sem token, com token falso e com token vencido, rotas públicas |
| `test_health.py`  | Health check                                                                                     |

## CI/CD

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions em três etapas, cada uma só começando se a anterior passar:

| Job               | Quando roda                        | O que faz                                                                                 |
| ----------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **Tests**         | Todo push e pull request na `main` | Instala Python 3.14 e as dependências com Poetry e roda os 32 testes                      |
| **Docker build**  | Depois dos testes                  | Confere se o `Dockerfile` constrói a imagem                                               |
| **Publish image** | Só em push na `main`               | Publica a imagem em `ghcr.io/ilucasoliveira/pokedex-api` com as tags `latest` e do commit |

Pull requests passam pelos testes e pelo build, mas não publicam imagem.

## Decisões técnicas

- **SQLAlchemy assíncrono**: as rotas são `async def` e o acesso ao banco também, sem bloquear o servidor durante as consultas. Os tipos são carregados com `selectinload` para evitar consultas extras (problema N+1)
- **Lógica de criação centralizada**: `POST /pokemon` e a importação passam pela mesma função `save_pokemon`, com as mesmas validações e regras
- **Leitura pública, escrita protegida**: mesmo modelo da PokéAPI real
- **Usuário inexistente e senha errada devolvem a mesma mensagem**, para não revelar quais usernames existem
- **Tabelas criadas no startup** com `create_all` dentro do `lifespan`

## Limitações conhecidas

- **Sem migrações**: as tabelas são criadas com `create_all`, que não altera tabelas existentes. Mudanças de esquema exigiriam Alembic
- **Cache durante queda do Redis**: se uma alteração acontecer com o Redis fora do ar, a invalidação falha e o dado antigo pode ser servido do cache até o TTL (1 hora) vencer depois que o Redis voltar
- **Avisos no log com Redis fora**: aparecem mensagens `Future exception was never retrieved` com `gaierror`. São avisos da resolução de nome cancelada pelo timeout, não afetam as respostas
- **Registro aberto e sem refresh token**: qualquer pessoa cria conta, e o token expira sem renovação automática

## Histórico de desenvolvimento

O projeto foi versionado em commits pequenos no padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `test`, `docs`, `chore`), do setup inicial à documentação. Para ver o histórico:

```bash
git log --oneline
```

## Autor

**Lucas de Oliveira Pimentel**
lucasoliveirapimentel.dev@gmail.com
