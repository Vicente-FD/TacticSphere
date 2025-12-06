"""add subpilares table and subpilar_id to preguntas

Revision ID: 20250115_add_subpilares
Revises: 20251112_add_respuesta_esperada
Create Date: 2025-01-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "20250115_add_subpilares"
down_revision = "20251112_add_respuesta_esperada"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Obtener inspector para verificar qué existe
    conn = op.get_bind()
    inspector = inspect(conn)
    
    # Verificar si la tabla subpilares existe
    tables = inspector.get_table_names()
    
    if "subpilares" not in tables:
        # Crear tabla subpilares solo si no existe
        op.create_table(
            "subpilares",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("pilar_id", sa.Integer(), nullable=False),
            sa.Column("nombre", sa.String(length=120), nullable=False),
            sa.Column("descripcion", sa.Text(), nullable=True),
            sa.Column("orden", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["pilar_id"],
                ["pilares.id"],
                ondelete="CASCADE"
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("pilar_id", "nombre", name="uq_subpilar_pilar_nombre"),
        )
        
        # Crear índice solo si creamos la tabla
        op.create_index(op.f("ix_subpilares_pilar_id"), "subpilares", ["pilar_id"], unique=False)
    else:
        # Si la tabla existe, verificar si el índice existe
        try:
            indexes = [idx["name"] for idx in inspector.get_indexes("subpilares")]
            if "ix_subpilares_pilar_id" not in indexes:
                op.create_index(op.f("ix_subpilares_pilar_id"), "subpilares", ["pilar_id"], unique=False)
        except Exception:
            # Si falla, intentar crear el índice de todas formas
            op.create_index(op.f("ix_subpilares_pilar_id"), "subpilares", ["pilar_id"], unique=False)
    
    # Verificar si la columna subpilar_id ya existe en preguntas
    preguntas_columns = [col["name"] for col in inspector.get_columns("preguntas")]
    
    if "subpilar_id" not in preguntas_columns:
        # SQLite requiere usar batch_alter_table para agregar columnas y constraints
        with op.batch_alter_table("preguntas", schema=None) as batch_op:
            batch_op.add_column(sa.Column("subpilar_id", sa.Integer(), nullable=True))
            batch_op.create_index(op.f("ix_preguntas_subpilar_id"), ["subpilar_id"], unique=False)
            batch_op.create_foreign_key(
                "fk_preguntas_subpilar_id",
                "subpilares",
                ["subpilar_id"],
                ["id"],
                ondelete="SET NULL"
            )
    else:
        # Si la columna existe, verificar índices y foreign keys
        try:
            indexes = [idx["name"] for idx in inspector.get_indexes("preguntas")]
            if "ix_preguntas_subpilar_id" not in indexes:
                op.create_index(op.f("ix_preguntas_subpilar_id"), "preguntas", ["subpilar_id"], unique=False)
        except Exception:
            pass
        
        try:
            foreign_keys = inspector.get_foreign_keys("preguntas")
            fk_names = [fk["name"] for fk in foreign_keys]
            if "fk_preguntas_subpilar_id" not in fk_names:
                # SQLite requiere usar batch_alter_table para agregar foreign keys
                with op.batch_alter_table("preguntas", schema=None) as batch_op:
                    batch_op.create_foreign_key(
                        "fk_preguntas_subpilar_id",
                        "subpilares",
                        ["subpilar_id"],
                        ["id"],
                        ondelete="SET NULL"
                    )
        except Exception:
            pass


def downgrade() -> None:
    # Eliminar foreign key y columna de preguntas
    op.drop_constraint("fk_preguntas_subpilar_id", "preguntas", type_="foreignkey")
    op.drop_index(op.f("ix_preguntas_subpilar_id"), table_name="preguntas")
    op.drop_column("preguntas", "subpilar_id")
    
    # Eliminar tabla subpilares
    op.drop_index(op.f("ix_subpilares_pilar_id"), table_name="subpilares")
    op.drop_table("subpilares")

