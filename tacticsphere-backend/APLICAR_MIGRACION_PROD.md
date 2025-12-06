# 🔄 Aplicar Migración de Subpilares en Producción

## ✅ Sí, puedes aplicar la migración desde aquí

Como `alembic/env.py` ahora lee `DATABASE_URL` del archivo `.env`, puedes aplicar la migración a producción simplemente cambiando la variable de entorno.

## ⚠️ IMPORTANTE: Antes de proceder

1. **Hacer backup de la base de datos de producción** (CRÍTICO)
2. **Verificar que tienes acceso** a la base de datos de producción
3. **Confirmar la cadena de conexión** correcta

## 📋 Pasos para Aplicar Migración en Producción

### Opción 1: Cambiar temporalmente el .env (Recomendado)

```bash
# 1. Hacer backup del .env actual
cp .env .env.backup

# 2. Ver la conexión actual (verificar que es desarrollo)
cat .env | grep DATABASE_URL
# Debe mostrar: DATABASE_URL=sqlite:///./tacticsphere.db

# 3. Editar .env y cambiar DATABASE_URL a producción
# Usa tu editor favorito:
# DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_db
# O para SQLite de producción:
# DATABASE_URL=sqlite:///ruta/a/produccion.db

# 4. Verificar estado actual de migraciones en producción
alembic current
# Debe mostrar: 20251112_add_respuesta_esperada (o la última)

# 5. Ver qué migraciones se van a aplicar
alembic history --verbose

# 6. Aplicar migración (¡CUIDADO! Estás modificando producción)
alembic upgrade head

# 7. Verificar que se aplicó
alembic current
# Debe mostrar: 20250115_add_subpilares (head)

# 8. Restaurar .env de desarrollo
cp .env.backup .env
```

### Opción 2: Usar variable de entorno del sistema (Más seguro)

```powershell
# Windows PowerShell

# 1. Verificar conexión actual
$env:DATABASE_URL
# O si no está definida:
Get-Content .env | Select-String "DATABASE_URL"

# 2. Definir temporalmente la URL de producción
$env:DATABASE_URL = "postgresql://usuario:password@host:puerto/nombre_db"
# O para SQLite:
# $env:DATABASE_URL = "sqlite:///ruta/a/produccion.db"

# 3. Verificar estado
alembic current

# 4. Aplicar migración
alembic upgrade head

# 5. Verificar
alembic current

# 6. Limpiar variable de entorno
Remove-Item Env:\DATABASE_URL
```

### Opción 3: Crear .env.prod temporal

```bash
# 1. Crear .env.prod con la conexión de producción
cat > .env.prod << EOF
DATABASE_URL=postgresql://usuario:password@host:puerto/nombre_db
EOF

# 2. Ejecutar alembic con el archivo específico
# (Necesitarías modificar alembic/env.py o usar otro método)
```

## 🔍 Verificar Antes de Aplicar

```bash
# Ver qué base de datos estás usando
python -c "from app.database import DATABASE_URL; print(f'Conectando a: {DATABASE_URL}')"

# Ver estado actual de migraciones
alembic current

# Ver qué se va a aplicar
alembic history --verbose | head -20
```

## ✅ Verificar Después de Aplicar

```bash
# Verificar migración aplicada
alembic current
# Debe mostrar: 20250115_add_subpilares (head)

# Verificar estructura en la base de datos
python -c "
from app.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
print('Tablas:', inspector.get_table_names())
print('Columnas en preguntas:', [c['name'] for c in inspector.get_columns('preguntas')])
"
```

## ⚠️ ADVERTENCIAS

1. **Backup primero**: Siempre hacer backup antes de aplicar migraciones en producción
2. **Verificar conexión**: Asegúrate de que `DATABASE_URL` apunta a producción, no a desarrollo
3. **Horario apropiado**: Aplicar en horario de bajo tráfico si es posible
4. **Testing**: Si puedes, probar primero en un entorno de staging

## 🚨 Si algo sale mal

1. **NO hacer rollback inmediatamente** - revisa los logs primero
2. **Verificar logs**: `alembic upgrade head` mostrará errores si los hay
3. **Restaurar backup**: Si es crítico, restaurar desde el backup
4. **Rollback** (solo si es necesario):
   ```bash
   alembic downgrade -1
   ```

## 📝 Nota sobre .env

El archivo `.env` normalmente está en `.gitignore`, así que cada entorno (desarrollo/producción) tiene su propio `.env` con su propia `DATABASE_URL`.

Si estás trabajando desde tu máquina local y quieres aplicar a producción, necesitas:
- Tener acceso de red a la base de datos de producción
- Las credenciales correctas en `DATABASE_URL`
- Permisos para ejecutar DDL (CREATE TABLE, ALTER TABLE, etc.)

