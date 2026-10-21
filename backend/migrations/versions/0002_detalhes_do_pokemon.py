"""detalhes do pokémon: artwork, geração, descrição, atributos, habilidades e evolução

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STAT_COLUMNS = (
    "hp",
    "attack",
    "defense",
    "special_attack",
    "special_defense",
    "speed",
)


def upgrade() -> None:
    with op.batch_alter_table("pokemon") as batch_op:
        # Nomes de formas padrão passam de 20 caracteres (squawkabilly-green-plumage).
        batch_op.alter_column(
            "name",
            existing_type=sa.String(length=20),
            type_=sa.String(length=50),
            existing_nullable=False,
        )
        # A PokéAPI às vezes devolve sprite nulo.
        batch_op.alter_column(
            "sprites", existing_type=sa.String(length=255), nullable=True
        )
        batch_op.add_column(sa.Column("artwork", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("generation", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        for column in STAT_COLUMNS:
            batch_op.add_column(sa.Column(column, sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("evolution_chain", sa.JSON(), nullable=True))

    op.create_table(
        "ability",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "pokemon_ability",
        sa.Column("pokemon_id", sa.Integer(), nullable=False),
        sa.Column("ability_id", sa.Integer(), nullable=False),
        sa.Column("is_hidden", sa.Boolean(), nullable=False),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["ability_id"], ["ability.id"]),
        sa.ForeignKeyConstraint(["pokemon_id"], ["pokemon.id"]),
        sa.PrimaryKeyConstraint("pokemon_id", "ability_id"),
    )


def downgrade() -> None:
    op.drop_table("pokemon_ability")
    op.drop_table("ability")

    with op.batch_alter_table("pokemon") as batch_op:
        batch_op.drop_column("evolution_chain")
        for column in reversed(STAT_COLUMNS):
            batch_op.drop_column(column)
        batch_op.drop_column("description")
        batch_op.drop_column("generation")
        batch_op.drop_column("artwork")
        batch_op.alter_column(
            "sprites", existing_type=sa.String(length=255), nullable=False
        )
        batch_op.alter_column(
            "name",
            existing_type=sa.String(length=50),
            type_=sa.String(length=20),
            existing_nullable=False,
        )
