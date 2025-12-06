# Guía de Migraciones de Base de Datos

Este documento describe cómo ejecutar las migraciones de Alembic en diferentes entornos.

## Prerequisitos

- Python 3.x instalado
- Entorno virtual activado (si aplica)
- Variable de entorno `DATABASE_URL` configurada con la cadena de conexión a la base de datos

## Configuración de la Base de Datos

La cadena de conexión se lee de la variable de entorno `DATABASE_URL` en el archivo `.env`:

```bash
# Para SQLite (desarrollo)
DATABASE_URL=sqlite:///tacticsphere.db

# Para PostgreSQL (producción)
DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_db
```

## Comandos Básicos de Alembic

### Verificar estado actual de migraciones

```bash
cd tacticsphere-backend
alembic current
```

### Ver historial de migraciones

```bash
alembic history
```

### Ver migraciones pendientes

```bash
alembic heads
```

### Aplicar todas las migraciones pendientes

```bash
alembic upgrade head
```

### Aplicar una migración específica

```bash
# Aplicar hasta una revisión específica
alembic upgrade <revision_id>

# Ejemplo: aplicar hasta la migración de subpilares
alembic upgrade 20250115_add_subpilares
```

### Revertir migraciones (CUIDADO: Solo en desarrollo)

```bash
# Revertir una migración
alembic downgrade -1

# Revertir hasta una revisión específica
alembic downgrade <revision_id>
```

## Migraciones para Producción

### Antes de ejecutar en producción

1. **Hacer backup de la base de datos**
   ```bash
   # Para PostgreSQL
   pg_dump -h host -U usuario nombre_db > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Para SQLite
   cp tacticsphere.db tacticsphere_backup_$(date +%Y%m%d_%H%M%S).db
   ```

2. **Verificar que la variable de entorno está configurada correctamente**
   ```bash
   echo $DATABASE_URL
   ```

3. **Verificar el estado actual de las migraciones**
   ```bash
   alembic current
   ```

4. **Revisar qué migraciones se van a aplicar**
   ```bash
   alembic history --verbose
   alembic show head
   ```

### Ejecutar migraciones en producción

```bash
# 1. Activar entorno virtual (si aplica)
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\Activate.ps1  # Windows PowerShell

# 2. Navegar al directorio del backend
cd tacticsphere-backend

# 3. Aplicar todas las migraciones pendientes
alembic upgrade head
```

### Verificar que las migraciones se aplicaron correctamente

```bash
# Verificar estado actual
alembic current

# Verificar estructura de la base de datos
# (ajustar según tu motor de base de datos)
psql -h host -U usuario nombre_db -c "\d subpilares"
```

## Migración Actual: Subpilares (20250115_add_subpilares)

### Descripción

Esta migración agrega soporte para subpilares opcionales dentro de los pilares:

- **Nueva tabla**: `subpilares` con relación a `pilares`
- **Nueva columna**: `subpilar_id` (nullable) en la tabla `preguntas`
- **Índices**: Para optimizar consultas por `subpilar_id`
- **Foreign keys**: Para mantener integridad referencial

### Características

- **Idempotente**: La migración verifica si las estructuras ya existen antes de crearlas
- **No destructiva**: No elimina ni modifica datos existentes
- **Backward compatible**: Las preguntas sin subpilar siguen funcionando normalmente

### Cambios en la estructura

```sql
-- Nueva tabla subpilares
CREATE TABLE subpilares (
    id INTEGER PRIMARY KEY,
    pilar_id INTEGER NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    orden INTEGER,
    FOREIGN KEY (pilar_id) REFERENCES pilares(id) ON DELETE CASCADE,
    UNIQUE (pilar_id, nombre)
);

-- Nueva columna en preguntas
ALTER TABLE preguntas ADD COLUMN subpilar_id INTEGER;
CREATE INDEX ix_preguntas_subpilar_id ON preguntas(subpilar_id);
ALTER TABLE preguntas ADD CONSTRAINT fk_preguntas_subpilar_id 
    FOREIGN KEY (subpilar_id) REFERENCES subpilares(id) ON DELETE SET NULL;
```

### Post-migración

Después de aplicar esta migración:

1. Verificar que la tabla `subpilares` existe y está vacía
2. Verificar que la columna `subpilar_id` existe en `preguntas` (todas con valor NULL)
3. La aplicación funcionará normalmente sin cambios visibles hasta que se creen subpilares

## Troubleshooting

### Error: "no such column: preguntas.subpilar_id"

Si ves este error, significa que la migración no se ha aplicado. Ejecuta:

```bash
alembic upgrade head
```

### Error: "table subpilares already exists"

La migración es idempotente y maneja este caso automáticamente. Si persiste, verifica el estado:

```bash
alembic current
alembic history
```

### Error: "target database is not up to date"

Esto significa que hay migraciones pendientes. Aplica todas las migraciones:

```bash
alembic upgrade head
```

### Error de conexión a la base de datos

Verifica que:
1. La variable `DATABASE_URL` esté configurada correctamente en `.env`
2. La base de datos esté accesible
3. Las credenciales sean correctas

```bash
# Verificar conexión (ajustar según tu motor)
python -c "from app.database import engine; engine.connect(); print('OK')"
```

## Rollback (Solo en emergencias)

**ADVERTENCIA**: El rollback eliminará la tabla `subpilares` y la columna `subpilar_id`. Solo hacerlo si es absolutamente necesario.

```bash
# Revertir la última migración
alembic downgrade -1

# O revertir hasta antes de subpilares
alembic downgrade 20251112_add_respuesta_esperada
```

Después del rollback, será necesario:
- Eliminar manualmente cualquier dato de subpilares si existen
- Actualizar el código para no usar subpilares

## Soporte

Para problemas o preguntas sobre migraciones, consultar:
- Documentación de Alembic: https://alembic.sqlalchemy.org/
- Logs de migración en la consola al ejecutar `alembic upgrade head`

