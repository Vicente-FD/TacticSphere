# 🔄 Aplicar Migración de Subpilares en Producción

## ✅ Compatibilidad con Datos Existentes

**La migración es 100% compatible con datos existentes en producción.**

### ¿Por qué es segura?

1. **No modifica datos existentes**
   - Solo **agrega** nuevas estructuras (tabla `subpilares` y columna `subpilar_id`)
   - No elimina ni modifica ninguna tabla o columna existente

2. **Columnas nullable**
   - `subpilar_id` es `nullable=True`
   - Todas las preguntas existentes tendrán `subpilar_id = NULL`
   - Las preguntas seguirán funcionando exactamente igual

3. **Backward compatible**
   - El código existente sigue funcionando sin cambios
   - Los endpoints existentes no se rompen
   - Las encuestas actuales siguen funcionando

### Ejemplo de lo que pasará:

**ANTES de la migración:**
```
Tabla preguntas:
id | pilar_id | enunciado | tipo | ...
1  | 5        | "Pregunta 1" | LIKERT | ...
2  | 5        | "Pregunta 2" | ABIERTA | ...
```

**DESPUÉS de la migración:**
```
Tabla preguntas:
id | pilar_id | subpilar_id | enunciado | tipo | ...
1  | 5        | NULL        | "Pregunta 1" | LIKERT | ...
2  | 5        | NULL        | "Pregunta 2" | ABIERTA | ...

Tabla subpilares: (vacía inicialmente)
id | pilar_id | nombre | descripcion | orden
```

**Los datos NO cambian**, solo se agregan nuevas columnas/tablas.

## 📋 Pasos para Aplicar en Producción

### 1. Preparación (ANTES del deploy)

```bash
# En el servidor de producción
cd /ruta/a/tacticsphere-backend

# Verificar estado actual
alembic current
# Debe mostrar: 20251112_add_respuesta_esperada (o la última migración)
```

### 2. Backup de la Base de Datos

```bash
# PostgreSQL
pg_dump -h [HOST] -U [USER] [DB_NAME] > backup_antes_subpilares_$(date +%Y%m%d_%H%M%S).sql

# Verificar que el backup se creó
ls -lh backup_antes_subpilares_*.sql
```

### 3. Deploy del Código

```bash
# Pull del código con la migración
git pull origin main

# O hacer deploy según tu método (docker, etc.)
```

### 4. Aplicar Migración

```bash
# Asegúrate de estar en el directorio correcto
cd tacticsphere-backend

# Activar entorno virtual si es necesario
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\Activate.ps1  # Windows

# Verificar qué se va a aplicar
alembic history --verbose

# Aplicar la migración
alembic upgrade head

# Verificar que se aplicó correctamente
alembic current
# Debe mostrar: 20250115_add_subpilares (head)
```

### 5. Verificar en Base de Datos

```sql
-- Verificar que la tabla subpilares existe
SELECT COUNT(*) FROM subpilares;
-- Debe retornar: 0 (vacía inicialmente)

-- Verificar que la columna subpilar_id existe
SELECT id, pilar_id, subpilar_id, enunciado 
FROM preguntas 
LIMIT 5;
-- Todas las preguntas existentes deben tener subpilar_id = NULL

-- Verificar que las preguntas siguen ahí
SELECT COUNT(*) FROM preguntas;
-- Debe retornar el mismo número que antes de la migración
```

### 6. Reiniciar Aplicación

```bash
# Según tu setup:
sudo systemctl restart tacticsphere-backend
# o
supervisorctl restart tacticsphere-backend
# o
docker-compose restart backend
```

## ✅ Verificación Post-Migración

### Verificar que todo funciona:

1. **API funciona:**
   ```bash
   curl http://tu-servidor/api/pillars/5/questions
   # Debe responder normalmente con las preguntas existentes
   ```

2. **Preguntas existentes:**
   - Deben seguir funcionando normalmente
   - Deben tener `subpilar_id: null` en las respuestas

3. **Encuestas existentes:**
   - Deben poder completarse sin errores
   - Los datos no deben cambiar

4. **Nuevas funcionalidades:**
   - Se pueden crear subpilares desde `/admin/pillars`
   - Se pueden asignar preguntas a subpilares

## 🔄 Rollback (Solo si es necesario)

Si por alguna razón necesitas revertir:

```bash
# ADVERTENCIA: Esto eliminará la tabla subpilares
# Solo hacerlo si es absolutamente necesario

alembic downgrade -1
# O específicamente:
alembic downgrade 20251112_add_respuesta_esperada
```

**NOTA:** Si ya creaste subpilares, perderás esos datos. Hacer backup antes de rollback.

## 📊 Impacto en Datos Existentes

### Lo que NO cambia:
- ✅ Número de preguntas
- ✅ Contenido de preguntas
- ✅ Respuestas existentes
- ✅ Encuestas existentes
- ✅ Relaciones entre cuestionarios y preguntas
- ✅ Cualquier dato existente

### Lo que SÍ cambia:
- ➕ Nueva tabla `subpilares` (vacía inicialmente)
- ➕ Nueva columna `subpilar_id` en `preguntas` (todas NULL inicialmente)
- ➕ Nuevos índices para mejorar rendimiento

## ⚠️ Importante

- **Tiempo de migración:** Depende del tamaño de la tabla `preguntas`, pero normalmente es muy rápido (segundos)
- **Downtime:** La migración requiere acceso exclusivo a la base de datos. Se recomienda hacerlo en horario de bajo tráfico o con mantenimiento programado
- **Testing:** Si puedes, prueba primero en un entorno de staging con una copia de producción

## ✅ Conclusión

**La migración es segura para producción** porque:
1. No modifica datos existentes
2. Solo agrega estructuras nuevas
3. Es totalmente backward compatible
4. Las preguntas existentes seguirán funcionando normalmente

**Puedes aplicarla con confianza siguiendo los pasos arriba.**

