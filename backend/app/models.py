from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Pokemon(Base):
    __tablename__ = "pokemon"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    name: Mapped[str] = mapped_column(String(20), unique=True)
    height: Mapped[int] = mapped_column(Integer)
    weight: Mapped[int] = mapped_column(Integer)
    types: Mapped[list["Type"]] = relationship(secondary="pokemon_type")
    sprites: Mapped[str] = mapped_column(String(255))


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


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
