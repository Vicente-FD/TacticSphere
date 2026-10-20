# app/schema_patches.py
#
# Ajustes de esquema aditivos que se aplican al arrancar la app.
# create_all() crea tablas nuevas pero no agrega columnas a tablas existentes; como
# Render no ejecuta Alembic al desplegar, aquí se agregan las columnas nuevas que falten.
# Solo agrega columnas opcionales (nunca borra ni modifica datos) y, si algo falla,
# la app arranca igual y lo deja registrado en el log.

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# tabla -> [(columna, tipo SQL)]  (mantener en sincronía con las migraciones de Alembic)
ADDITIVE_COLUMNS = {
    "consulting_leads": [
        ("service", "VARCHAR(50)"),  # migración 20261020_lead_service_message
        ("message", "VARCHAR(2000)"),
    ],
}


def ensure_additive_columns(engine: Engine) -> None:
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        with engine.begin() as conn:
            for table, columns in ADDITIVE_COLUMNS.items():
                if table not in existing_tables:
                    continue
                present = {c["name"] for c in inspector.get_columns(table)}
                for name, sql_type in columns:
                    if name in present:
                        continue
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
                    logger.warning("Columna agregada al esquema: %s.%s", table, name)
    except Exception:
        logger.exception("No se pudieron aplicar los ajustes de esquema aditivos")
