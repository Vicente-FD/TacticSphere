# Solución: Error psycopg2 con Python 3.13

## 🔴 Problema

El error que estás viendo:
```
ImportError: undefined symbol: _PyInterpreterState_Get
```

Ocurre porque `psycopg2-binary` no es compatible con Python 3.13 (versión muy reciente).

## ✅ Solución Aplicada

**Cambiamos Python 3.13 → Python 3.12**

El archivo `runtime.txt` ahora especifica:
```
python-3.12
```

## 📋 Pasos para Aplicar la Solución en Render

### Paso 1: Hacer Commit y Push

```bash
git add tacticsphere-backend/runtime.txt
git commit -m "Cambiar a Python 3.12 para compatibilidad con psycopg2"
git push
```

### Paso 2: Verificar Configuración en Render

1. Ve a tu servicio `tacticsphere-backend` en Render
2. Ve a **"Settings"** → **"Build & Deploy"**
3. Verifica que:
   - **Root Directory:** `tacticsphere-backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Paso 3: Verificar Variables de Entorno

1. Ve a **"Environment"**
2. Verifica que `DATABASE_URL` esté configurada con la **Internal Database URL**:
   ```
   postgresql://tacticsphere_user:TC4QWpw21lrJBgu2bWqVbP9Xutcf5JRj@dpg-d4jkfa7gi27c739pegu0-a/tacticsphere
   ```

### Paso 4: Redeploy

1. Render debería detectar automáticamente el cambio en `runtime.txt`
2. Si no, ve a **"Manual Deploy"** → **"Deploy latest commit"**
3. Espera a que el build complete

## 🔍 Verificación

Una vez desplegado, verifica:

1. **Estado del servicio:** Debe estar "Live" (verde)
2. **Probar endpoint:**
   ```
   https://tacticsphere-backend.onrender.com/ping
   ```
   Debe responder: `{"message":"pong"}`

## ⚠️ Nota sobre External Database URL

La **External Database URL** que mencionaste:
```
postgresql://tacticsphere_user:TC4QWpw21lrJBgu2bWqVbP9Xutcf5JRj@dpg-d4jkfa7gi27c739pegu0-a.oregon-postgres.render.com/tacticsphere
```

**NO se usa en Render** para el servicio backend. Solo se usa:
- **Internal Database URL:** Para servicios dentro de Render (tu backend)
- **External Database URL:** Para conexiones desde fuera de Render (tu máquina local, herramientas como DBeaver, etc.)

## 🆘 Si el Error Persiste

Si después de cambiar a Python 3.12 sigue fallando:

1. **Verifica los logs completos** en Render para ver el error exacto
2. **Asegúrate de que `runtime.txt` esté en el repositorio** y se haya hecho push
3. **Fuerza un rebuild limpio:**
   - En Render, ve a "Manual Deploy"
   - Selecciona "Clear build cache & deploy"

## 📝 Alternativa: Usar psycopg (psycopg3)

Si Python 3.12 no funciona, podemos cambiar a `psycopg` (psycopg3) que es más moderno y compatible con Python 3.13, pero requiere cambios en el código.

Por ahora, Python 3.12 debería funcionar perfectamente.


