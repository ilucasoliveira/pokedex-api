from sqlalchemy import Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Pokemon(Base):
    __tablename__ = "pokemon"
    id: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(20), unique=True)
