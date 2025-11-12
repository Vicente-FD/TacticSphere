"""add respuesta esperada to preguntas

Revision ID: 20251112_add_respuesta_esperada
Revises: 20251107_password_change_requests
Create Date: 2025-11-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251112_add_respuesta_esperada"
down_revision = "20251107_password_change_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "preguntas",
        sa.Column("respuesta_esperada", sa.String(length=1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("preguntas", "respuesta_esperada")

