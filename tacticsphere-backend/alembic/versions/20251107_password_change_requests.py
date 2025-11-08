"""add password change requests table"""

"""
Revision ID: 20251107_password_change_requests
Revises: 20251104_add_consulting_leads
Create Date: 2025-11-07 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251107_password_change_requests"
down_revision = "20251104_add_consulting_leads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("password_reset_tokens")

    op.create_table(
        "password_change_requests",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_email", sa.String(length=200), nullable=False),
        sa.Column("user_nombre", sa.String(length=200), nullable=False),
        sa.Column("empresa_id", sa.Integer(), nullable=True),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column(
            "resolved_by_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_pwd_change_requests_user_id",
        "password_change_requests",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_pwd_change_requests_empresa_id",
        "password_change_requests",
        ["empresa_id"],
        unique=False,
    )
    op.create_index(
        "ix_pwd_change_requests_resolved",
        "password_change_requests",
        ["resolved"],
        unique=False,
    )
    op.create_index(
        "ix_pwd_change_requests_created_at",
        "password_change_requests",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pwd_change_requests_resolved_by_id",
        "password_change_requests",
        ["resolved_by_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pwd_change_requests_resolved_by_id", table_name="password_change_requests")
    op.drop_index("ix_pwd_change_requests_created_at", table_name="password_change_requests")
    op.drop_index("ix_pwd_change_requests_resolved", table_name="password_change_requests")
    op.drop_index("ix_pwd_change_requests_empresa_id", table_name="password_change_requests")
    op.drop_index("ix_pwd_change_requests_user_id", table_name="password_change_requests")
    op.drop_table("password_change_requests")

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
        ),
    )
    op.create_index(
        "ix_password_reset_tokens_user_id",
        "password_reset_tokens",
        ["user_id"],
        unique=False,
    )
