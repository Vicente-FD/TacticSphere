"""add service and message to consulting leads

Revision ID: 20261020_lead_service_message
Revises: 20250115_add_subpilares
Create Date: 2026-10-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20261020_lead_service_message"
down_revision = "20250115_add_subpilares"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consulting_leads",
        sa.Column("service", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "consulting_leads",
        sa.Column("message", sa.String(length=2000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("consulting_leads", "message")
    op.drop_column("consulting_leads", "service")
