"""add consulting leads table

Revision ID: 20251104_add_consulting_leads
Revises: 
Create Date: 2025-11-04 20:25:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251104_add_consulting_leads"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consulting_leads",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("company", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
    )
    op.create_index(
        "ix_consulting_leads_email", "consulting_leads", ["email"], unique=False
    )
    op.create_index(
        "ix_consulting_leads_created_at",
        "consulting_leads",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_consulting_leads_created_at", table_name="consulting_leads")
    op.drop_index("ix_consulting_leads_email", table_name="consulting_leads")
    op.drop_table("consulting_leads")

