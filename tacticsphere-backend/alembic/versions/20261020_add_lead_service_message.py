"""add service and message to consulting leads

Revision ID: 20261020_lead_service_message
Revises: 20250115_add_subpilares
Create Date: 2026-10-20 00:00:00.000000

Idempotente: app/schema_patches.py agrega estas mismas columnas al arrancar la app,
así que aquí solo se crean si todavía no existen.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20261020_lead_service_message"
down_revision = "20250115_add_subpilares"
branch_labels = None
depends_on = None


def _existing_columns() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {c["name"] for c in inspector.get_columns("consulting_leads")}


def upgrade() -> None:
    existing = _existing_columns()
    if "service" not in existing:
        op.add_column(
            "consulting_leads",
            sa.Column("service", sa.String(length=50), nullable=True),
        )
    if "message" not in existing:
        op.add_column(
            "consulting_leads",
            sa.Column("message", sa.String(length=2000), nullable=True),
        )


def downgrade() -> None:
    existing = _existing_columns()
    if "message" in existing:
        op.drop_column("consulting_leads", "message")
    if "service" in existing:
        op.drop_column("consulting_leads", "service")
