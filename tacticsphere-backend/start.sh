#!/bin/bash
# Script para iniciar el servidor FastAPI en producción

# Cargar variables de entorno si existen
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Ejecutar migraciones de Alembic si es necesario
# alembic upgrade head

# Iniciar el servidor con uvicorn
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}






