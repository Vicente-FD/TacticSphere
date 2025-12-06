# ⚠️ IMPORTANTE: Antes de hacer commit

## ❌ PROBLEMA CRÍTICO

**El código actualizado NO funcionará sin aplicar la migración primero.**

### ¿Por qué?

El modelo SQLAlchemy (`app/models.py`) define:
- La clase `Subpilar` 
- El campo `subpilar_id` en `Pregunta`
- La relación `pilar.subpilares`

Si haces commit y despliegas este código **SIN aplicar la migración**, SQLAlchemy intentará:
- Hacer `SELECT * FROM preguntas` (incluyendo `subpilar_id`)
- Acceder a la tabla `subpilares` (que no existe)
- Crear foreign keys a `subpilares.id` (que no existe)

**Resultado: El sistema fallará con errores como:**
```
sqlalchemy.exc.OperationalError: no such column: preguntas.subpilar_id
sqlalchemy.exc.OperationalError: no such table: subpilares
```

## ✅ SOLUCIÓN: Orden correcto de despliegue

### Opción 1: Migración PRIMERO (Recomendado)

1. **Hacer commit del código** (incluyendo migración)
2. **En producción:**
   - Hacer backup de la base de datos
   - Aplicar migración: `alembic upgrade head`
   - Desplegar código actualizado
   - Reiniciar aplicación

### Opción 2: Código y migración juntos

1. **Hacer commit del código** (incluyendo migración)
2. **En producción:**
   - Hacer backup
   - **Primero aplicar migración:** `alembic upgrade head`
   - **Luego reiniciar aplicación** (para que cargue el código nuevo)

## 📋 Checklist antes de commit

- [x] Migración creada y probada localmente
- [x] Código actualizado con modelos nuevos
- [x] Backend funciona con migración aplicada
- [x] Frontend funciona con backend actualizado
- [ ] **Backup de producción preparado**
- [ ] **Plan de despliegue definido**

## 🚀 Plan de despliegue recomendado

```bash
# 1. En producción - ANTES de hacer pull del código nuevo
cd /ruta/a/tacticsphere-backend
alembic current  # Verificar estado actual

# 2. Hacer backup
pg_dump [opciones] > backup_$(date +%Y%m%d).sql

# 3. Hacer pull del código nuevo
git pull origin main

# 4. Aplicar migración INMEDIATAMENTE
alembic upgrade head

# 5. Verificar migración
alembic current
# Debe mostrar: 20250115_add_subpilares (head)

# 6. Reiniciar aplicación
# (según tu setup: systemd, supervisor, docker, etc.)
```

## ⚠️ ADVERTENCIA

**NO hacer commit y deploy del código sin aplicar la migración primero.**

El sistema fallará inmediatamente al intentar usar la base de datos.

## 💡 Alternativa (si necesitas deployar código sin migración)

Si por alguna razón necesitas desplegar código nuevo sin migración, tendrías que:
1. Hacer el modelo `Subpilar` condicional (complejo)
2. Hacer `subpilar_id` opcional en el código (ya está, pero SQLAlchemy lo intentará leer)
3. Manejar errores de columna faltante (no recomendado)

**No es recomendable.** Mejor: aplicar migración primero.

