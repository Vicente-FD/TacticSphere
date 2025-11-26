# Solución: Cambiar a psycopg3 (compatible con Python 3.13)

## 🔴 Problema

Render sigue usando Python 3.13 y `psycopg2-binary` no es compatible con Python 3.13.

## ✅ Solución Aplicada

**Cambiamos de `psycopg2-binary` a `psycopg` (psycopg3)**

`psycopg` (psycopg3) es:
- ✅ Compatible con Python 3.13
- ✅ Más moderno y eficiente
- ✅ Compatible con SQLAlchemy 2.0
- ✅ No requiere cambios en el código (solo en la URL de conexión)

## 📋 Cambios Realizados

### 1. requirements.txt
Cambiado de:
```
psycopg2-binary==2.9.9
```

A:
```
psycopg[binary]==3.2.3
```

### 2. app/database.py
Actualizado para usar `psycopg` automáticamente cuando detecta PostgreSQL:
- Cambia `postgresql://` a `postgresql+psycopg://` automáticamente
- Mantiene compatibilidad con SQLite

## 🚀 Pasos para Aplicar

### Paso 1: Hacer Commit y Push

```bash
git add tacticsphere-backend/requirements.txt
git add tacticsphere-backend/app/database.py
git commit -m "Cambiar a psycopg3 para compatibilidad con Python 3.13"
git push
```

### Paso 2: Render se Reconstruirá Automáticamente

Render detectará los cambios y:
1. Instalará `psycopg[binary]==3.2.3`
2. Usará Python 3.13 (que ahora funcionará)
3. El backend debería iniciar correctamente

### Paso 3: Verificar

Una vez desplegado, prueba:
```
https://tacticsphere-backend.onrender.com/ping
```

Debería responder: `{"message":"pong"}`

## 🔍 Verificación

Si el error persiste, verifica en Render:

1. **Logs del Build:** Debe mostrar que instaló `psycopg`
2. **Logs del Runtime:** No debe haber errores de importación
3. **Estado:** Debe estar "Live" (verde)

## 📝 Notas

- **No necesitas cambiar `runtime.txt`:** Python 3.13 funcionará con psycopg3
- **La URL de PostgreSQL no cambia:** El código la modifica automáticamente
- **SQLite sigue funcionando:** No se afecta el desarrollo local

## 🆘 Si Aún Hay Problemas

Si después de estos cambios sigue fallando:

1. **Verifica los logs completos** en Render
2. **Asegúrate de que los cambios se hayan hecho push**
3. **Fuerza un rebuild limpio:**
   - En Render: "Manual Deploy" → "Clear build cache & deploy"


