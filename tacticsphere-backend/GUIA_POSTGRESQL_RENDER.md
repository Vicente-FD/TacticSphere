# Guía Paso a Paso: Configurar PostgreSQL en Render y Migrar Datos

## ✅ Paso 1: Datos Exportados (COMPLETADO)

Tus datos ya están exportados en `data_export.json`:
- 6,074 registros totales
- Incluye usuarios, empresas, empleados, respuestas, etc.

## 📋 Paso 2: Crear Base de Datos PostgreSQL en Render

### 2.1. Acceder a Render

1. Ve a [render.com](https://render.com)
2. Inicia sesión con tu cuenta

### 2.2. Crear Nueva Base de Datos PostgreSQL

1. En el dashboard de Render, haz clic en **"New +"** (arriba a la derecha)
2. Selecciona **"PostgreSQL"**

### 2.3. Configurar la Base de Datos

Completa el formulario:

- **Name:** `tacticsphere-db` (o el nombre que prefieras)
- **Database:** `tacticsphere` (o el nombre que prefieras)
- **User:** Se generará automáticamente (puedes dejarlo así)
- **Region:** 
  - Si tu backend está en `Oregon (US West)`, elige la misma región
  - Si no estás seguro, elige `Oregon (US West)` o `Frankfurt (EU)`
- **PostgreSQL Version:** Deja la versión por defecto (15 o 16)
- **Plan:** 
  - **Free** (gratis, suficiente para empezar)
  - O **Starter** ($7/mes) si necesitas más recursos

3. Haz clic en **"Create Database"**

### 2.4. Obtener la URL de Conexión

Una vez creada la base de datos:

1. Ve a la página de tu base de datos PostgreSQL
2. En la sección **"Connections"** o **"Info"**, encontrarás:
   - **Internal Database URL** (para usar dentro de Render)
   - **External Database URL** (para usar desde fuera de Render)

**IMPORTANTE:** Copia la **Internal Database URL**. Se verá así:
```
postgresql://usuario:password@dpg-xxxxx-a/tacticsphere
```

## 📋 Paso 3: Actualizar Variables de Entorno en Render

### 3.1. Ir a tu Servicio de Backend

1. En el dashboard de Render, encuentra tu servicio `tacticsphere-backend`
2. Haz clic en él para abrir la configuración

### 3.2. Actualizar DATABASE_URL

1. Ve a la pestaña **"Environment"** (en el menú lateral)
2. Busca la variable `DATABASE_URL`
3. Haz clic en el ícono de edición (lápiz) o en "Edit"
4. Reemplaza el valor actual con la **Internal Database URL** que copiaste:
   ```
   postgresql://usuario:password@dpg-xxxxx-a/tacticsphere
   ```
5. Haz clic en **"Save Changes"**

### 3.3. Verificar Otras Variables

Asegúrate de que estas variables estén configuradas:

- `DATABASE_URL` ← **Actualizada con PostgreSQL**
- `JWT_SECRET` ← Debe tener una clave segura
- `JWT_ALG=HS256`
- `JWT_EXPIRE_MINUTES=60`
- `PASSWORD_MIN_LENGTH=10`

### 3.4. Reiniciar el Servicio

1. Render debería reiniciar automáticamente
2. Si no, ve a **"Manual Deploy"** → **"Deploy latest commit"**
3. Espera a que el servicio esté en estado "Live" (verde)

## 📋 Paso 4: Verificar que PostgreSQL Funciona

### 4.1. Probar el Backend

1. Ve a tu servicio de backend en Render
2. Copia la URL del servicio (ej: `https://tacticsphere-backend.onrender.com`)
3. Prueba el endpoint:
   ```
   https://tacticsphere-backend.onrender.com/ping
   ```
   Debería responder: `{"message":"pong"}`

### 4.2. Verificar que la Base de Datos está Vacía

Puedes probar hacer login. Si la base de datos está vacía, no habrá usuarios.

## 📋 Paso 5: Importar tus Datos a PostgreSQL

### Opción A: Usar Script de Importación (Recomendado)

**IMPORTANTE:** Necesitas ejecutar esto desde tu máquina local, pero apuntando a la base de datos de Render.

#### 5.1. Obtener External Database URL

1. Ve a tu base de datos PostgreSQL en Render
2. Copia la **External Database URL** (no la Internal)
3. Se verá así:
   ```
   postgresql://usuario:password@dpg-xxxxx-a.oregon-postgres.render.com/tacticsphere
   ```

#### 5.2. Crear Archivo Temporal .env.production

En `tacticsphere-backend/`, crea un archivo `.env.production`:

```bash
DATABASE_URL=postgresql://usuario:password@dpg-xxxxx-a.oregon-postgres.render.com/tacticsphere
```

**⚠️ NO subas este archivo a Git** (ya está en .gitignore)

#### 5.3. Modificar Temporalmente database.py

Necesitamos que el script use la External Database URL. Opciones:

**Opción 1: Modificar temporalmente el script**

Edita `scripts/import_data.py` y agrega al inicio:

```python
import os
os.environ['DATABASE_URL'] = 'postgresql://usuario:password@dpg-xxxxx-a.oregon-postgres.render.com/tacticsphere'
```

**Opción 2: Usar variable de entorno**

En PowerShell:
```powershell
$env:DATABASE_URL="postgresql://usuario:password@dpg-xxxxx-a.oregon-postgres.render.com/tacticsphere"
python scripts/import_data.py
```

#### 5.4. Ejecutar Importación

```bash
cd tacticsphere-backend
.\venv\Scripts\Activate.ps1
python scripts/import_data.py
```

### Opción B: Usar Herramienta Visual (Más Fácil)

Puedes usar herramientas como **DBeaver** o **pgAdmin**:

1. Descarga [DBeaver](https://dbeaver.io/download/) (gratis)
2. Crea una nueva conexión PostgreSQL
3. Usa la **External Database URL** de Render
4. Conecta a la base de datos
5. Importa el JSON manualmente o usa herramientas de importación

### Opción C: Usar API del Backend (Más Seguro)

Puedo crear un endpoint temporal en el backend para importar datos vía API. ¿Quieres que lo haga?

## 📋 Paso 6: Verificar que los Datos se Importaron

1. Prueba hacer login con uno de tus usuarios
2. Verifica que puedas ver empresas, empleados, etc.
3. Revisa los logs del backend en Render para ver si hay errores

## 🎉 ¡Listo!

Una vez completados estos pasos:
- ✅ Tus datos estarán en PostgreSQL (persistente)
- ✅ El backend usará PostgreSQL en producción
- ✅ Los datos no se perderán en reinicios
- ✅ Todo funcionará correctamente

## 🆘 Solución de Problemas

### Error: "Connection refused"
- Verifica que estés usando la **External Database URL** (no Internal)
- Asegúrate de que la base de datos esté activa en Render

### Error: "Module not found: psycopg2"
- El `requirements.txt` ya incluye `psycopg2-binary`
- Render debería instalarlo automáticamente al hacer redeploy

### Error: "Authentication failed"
- Verifica que la URL de conexión sea correcta
- Asegúrate de copiar toda la URL sin espacios

### Los datos no se importan
- Verifica que el archivo `data_export.json` esté en `tacticsphere-backend/`
- Revisa los mensajes de error en la consola
- Algunos registros pueden fallar si hay conflictos de claves foráneas

## 📞 ¿Necesitas Ayuda?

Si tienes problemas en algún paso, avísame y te ayudo a resolverlo.



