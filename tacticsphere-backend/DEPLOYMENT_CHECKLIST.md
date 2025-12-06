# Checklist de Despliegue - Migración de Subpilares

Este documento es un checklist para asegurar que la migración de subpilares se aplique correctamente en producción.

## Pre-commit Checklist

### ✅ Código
- [x] Migración de Alembic creada y probada (`20250115_add_subpilares.py`)
- [x] Migración es idempotente (verifica existencia antes de crear)
- [x] Backend actualizado con modelos, schemas, CRUD y endpoints
- [x] Frontend actualizado con tipos, servicios y componentes
- [x] No hay errores de compilación/linting

### ✅ Base de Datos
- [x] Archivo de migración incluido en el repositorio
- [x] `.gitignore` excluye archivos `*.db` (base de datos local no se sube)
- [x] Migración probada en entorno de desarrollo
- [x] Migración es backward compatible (no rompe datos existentes)

### ✅ Documentación
- [x] `MIGRATIONS.md` creado con instrucciones
- [x] `DEPLOYMENT_CHECKLIST.md` creado (este archivo)
- [x] Comentarios en código explicando cambios no obvios

## Pre-deployment Checklist (Producción)

### Antes de hacer el deploy:

1. **Backup de Base de Datos**
   ```bash
   # PostgreSQL
   pg_dump -h [HOST] -U [USER] [DB_NAME] > backup_pre_subpilares_$(date +%Y%m%d).sql
   
   # Verificar que el backup se creó correctamente
   ls -lh backup_pre_subpilares_*.sql
   ```

2. **Verificar Variables de Entorno**
   ```bash
   # En el servidor de producción
   echo $DATABASE_URL
   # Debe mostrar la cadena de conexión a la base de datos de producción
   ```

3. **Verificar Estado Actual de Migraciones**
   ```bash
   cd tacticsphere-backend
   alembic current
   # Debe mostrar: 20251112_add_respuesta_esperada (o la última migración aplicada)
   ```

4. **Revisar Migraciones Pendientes**
   ```bash
   alembic history --verbose
   # Verificar que 20250115_add_subpilares aparece en la lista
   ```

## Deployment Steps

### 1. Deploy del Código

```bash
# En el servidor de producción
git pull origin main  # o la rama correspondiente
```

### 2. Instalar/Actualizar Dependencias (si aplica)

```bash
cd tacticsphere-backend
pip install -r requirements.txt
```

### 3. Ejecutar Migraciones

```bash
# Verificar estado antes
alembic current

# Aplicar migraciones
alembic upgrade head

# Verificar estado después
alembic current
# Debe mostrar: 20250115_add_subpilares (head)
```

### 4. Verificar Migración Exitosa

```bash
# Verificar que la tabla subpilares existe
# PostgreSQL:
psql -h [HOST] -U [USER] [DB_NAME] -c "\d subpilares"

# Verificar que la columna subpilar_id existe en preguntas
psql -h [HOST] -U [USER] [DB_NAME] -c "\d preguntas" | grep subpilar_id

# Verificar que hay 0 filas en subpilares (esperado inicialmente)
psql -h [HOST] -U [USER] [DB_NAME] -c "SELECT COUNT(*) FROM subpilares;"
```

### 5. Reiniciar Aplicación

```bash
# Dependiendo de tu setup:
# - Si usas systemd: sudo systemctl restart tacticsphere-backend
# - Si usas supervisor: supervisorctl restart tacticsphere-backend
# - Si usas PM2: pm2 restart tacticsphere-backend
# - Si usas Docker: docker-compose restart backend
```

## Post-deployment Verification

### Verificaciones Funcionales

1. **API Endpoints**
   - [ ] `GET /pillars/{id}/subpilares` responde correctamente
   - [ ] `POST /pillars/{id}/subpilares` permite crear subpilares
   - [ ] `GET /questions` incluye `subpilar_id` en las respuestas
   - [ ] `POST /questions` acepta `subpilar_id` opcional

2. **Frontend**
   - [ ] Componente de Pilares carga sin errores
   - [ ] Se pueden crear/edit subpilares desde `/admin/pillars`
   - [ ] Se pueden asignar preguntas a subpilares desde `/admin/questions`
   - [ ] Survey muestra subtítulo de subpilares correctamente

3. **Datos Existentes**
   - [ ] Las preguntas existentes siguen funcionando normalmente
   - [ ] Las encuestas existentes se pueden completar sin errores
   - [ ] El dashboard de analytics funciona correctamente

### Verificaciones de Base de Datos

```sql
-- Verificar estructura de subpilares
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subpilares';

-- Verificar que subpilar_id es nullable en preguntas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'preguntas' AND column_name = 'subpilar_id';

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'subpilares';
SELECT indexname FROM pg_indexes WHERE tablename = 'preguntas' AND indexname LIKE '%subpilar%';

-- Verificar foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' AND (conrelid::regclass::text = 'preguntas' OR confrelid::regclass::text = 'subpilares');
```

## Rollback Plan (Solo en Emergencias)

Si es necesario revertir la migración:

```bash
# 1. Detener la aplicación
sudo systemctl stop tacticsphere-backend  # o el método que uses

# 2. Revertir migración
cd tacticsphere-backend
alembic downgrade -1

# 3. Verificar rollback
alembic current
# Debe mostrar: 20251112_add_respuesta_esperada

# 4. Revertir código (git)
git revert [commit-hash]  # o volver al commit anterior

# 5. Reiniciar aplicación
sudo systemctl start tacticsphere-backend
```

**ADVERTENCIA**: El rollback eliminará:
- La tabla `subpilares` y todos sus datos
- La columna `subpilar_id` de `preguntas`

Si ya se crearon subpilares en producción, **NO hacer rollback sin backup adicional**.

## Soporte

Si encuentras problemas durante el despliegue:

1. Revisar logs de la aplicación
2. Revisar logs de Alembic (salida de `alembic upgrade head`)
3. Verificar que la base de datos esté accesible
4. Consultar `MIGRATIONS.md` para troubleshooting
5. Si es crítico, usar el rollback plan

## Notas Adicionales

- La migración es **no destructiva**: no elimina ni modifica datos existentes
- La migración es **backward compatible**: el código anterior seguirá funcionando
- La nueva funcionalidad solo estará disponible después del deploy completo (código + migración)
- Los subpilares son opcionales: los pilares pueden seguir funcionando sin subpilares

