from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.models import Type


class PokemonCreate(BaseModel):
    id: int = Field(ge=1, description="pokemon ID")
    name: str = Field(min_length=2, max_length=20, description="pokemon's name")
    height: int = Field(ge=0, description="pokemon's height")
    weight: int = Field(ge=0, description="pokemon's weight")
    types: list[str] = Field(min_length=1, max_length=2, description="pokemon's types")
    sprites: str = Field(max_length=255, description="pokemon's sprites")

    @field_validator("types")
    @classmethod
    def padronizar_tipos(cls, value):
        value = [i.lower() for i in value]
        return value

    @field_validator("name")
    @classmethod
    def padronizar_nome(cls, value):
        return value.lower()


class PokemonUpdate(BaseModel):
    name: str | None = Field(min_length=2, max_length=20, default=None)
    height: int | None = Field(ge=0, default=None)
    weight: int | None = Field(ge=0, default=None)
    types: list[str] | None = Field(min_length=1, max_length=2, default=None)
    sprites: str | None = Field(max_length=255, default=None)

    @field_validator("types")
    @classmethod
    def padronizar_tipos(cls, value):
        if value is None:
            return value
        value = [i.lower() for i in value]
        return value

    @field_validator("name")
    @classmethod
    def padronizar_nome(cls, value):
        if value is None:
            return value
        return value.lower()


class PokemonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    height: int
    weight: int
    types: list[str]
    sprites: str

    @field_validator("types", mode="before")
    @classmethod
    def extrai_nomes_dos_tipos(cls, value):
        return [i.name if isinstance(i, Type) else i for i in value]
