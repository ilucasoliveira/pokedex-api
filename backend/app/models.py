from typing import Any

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Atributos base, na ordem em que a PokéAPI os devolve.
STAT_FIELDS = (
    "hp",
    "attack",
    "defense",
    "special_attack",
    "special_defense",
    "speed",
)


# Maior valor de uma coluna INTEGER no PostgreSQL. Número acima disso na entrada
# fazia o banco recusar a consulta, e a API respondia 500 em vez de 404 ou 422.
MAX_DB_INT = 2_147_483_647

class Base(DeclarativeBase):
    pass


class Pokemon(Base):
    __tablename__ = "pokemon"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    height: Mapped[int] = mapped_column(Integer)
    weight: Mapped[int] = mapped_column(Integer)
    types: Mapped[list["Type"]] = relationship(secondary="pokemon_type")
    sprites: Mapped[str | None] = mapped_column(String(255))
    artwork: Mapped[str | None] = mapped_column(String(255))
    generation: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    hp: Mapped[int | None] = mapped_column(Integer)
    attack: Mapped[int | None] = mapped_column(Integer)
    defense: Mapped[int | None] = mapped_column(Integer)
    special_attack: Mapped[int | None] = mapped_column(Integer)
    special_defense: Mapped[int | None] = mapped_column(Integer)
    speed: Mapped[int | None] = mapped_column(Integer)
    # A cadeia evolutiva é uma árvore (Eevee ramifica em oito) lida sempre
    # inteira, então fica guardada como JSON em cada membro da cadeia.
    evolution_chain: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    abilities: Mapped[list["PokemonAbility"]] = relationship(
        cascade="all, delete-orphan", order_by="PokemonAbility.slot"
    )

    @property
    def stats(self) -> dict[str, int] | None:
        # Os seis atributos andam juntos: ou o pokémon tem todos, ou nenhum.
        values = {field: getattr(self, field) for field in STAT_FIELDS}
        if any(value is None for value in values.values()):
            return None
        return values


class Type(Base):
    __tablename__ = "type"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class PokemonType(Base):
    __tablename__ = "pokemon_type"
    pokemon_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pokemon.id"), primary_key=True
    )
    type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("type.id"), primary_key=True
    )


class Ability(Base):
    __tablename__ = "ability"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class PokemonAbility(Base):
    # Associação com dados próprios: se a habilidade é oculta e a ordem de exibição.
    __tablename__ = "pokemon_ability"
    pokemon_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pokemon.id"), primary_key=True
    )
    ability_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ability.id"), primary_key=True
    )
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    slot: Mapped[int] = mapped_column(Integer)
    ability: Mapped[Ability] = relationship(lazy="joined")

    @property
    def name(self) -> str:
        return self.ability.name


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
