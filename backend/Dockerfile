FROM python:3.14-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false

RUN pip install --upgrade --no-cache-dir pip poetry

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-interaction --no-ansi --no-root

COPY . .

EXPOSE 8000

# Aplica as migrações do banco e só então sobe a API.
# Serviços de hospedagem como o Render definem a porta pela variável PORT.
# Localmente, sem PORT, a API sobe na 8000.
CMD ["sh", "-c", "python -m app.migrate && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
