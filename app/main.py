from fastapi import FastAPI

app = FastAPI(
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
