# Guía de Despliegue del Backend TacticSphere

Esta guía te ayudará a desplegar el backend FastAPI en diferentes plataformas.

## 📋 Requisitos Previos

1. **Variables de Entorno Necesarias:**
   - `DATABASE_URL`: URL de conexión a la base de datos (SQLite, PostgreSQL, MySQL, etc.)
   - `JWT_SECRET`: Clave secreta para firmar tokens JWT (usa una clave segura)
   - `JWT_ALG`: Algoritmo JWT (por defecto: HS256)
   - `JWT_EXPIRE_MINUTES`: Tiempo de expiración del token (por defecto: 60)
   - `PASSWORD_MIN_LENGTH`: Longitud mínima de contraseña (por defecto: 10)

## 🚀 Opciones de Despliegue

### Opción 1: Render.com (Recomendado - Gratis)

1. **Crear cuenta en Render:**
   - Ve a [render.com](https://render.com)
   - Crea una cuenta gratuita

2. **Crear un nuevo Web Service:**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio TacticSphere

3. **Configuración:**
   - **Name:** `tacticsphere-backend`
   - **Root Directory:** `tacticsphere-backend` ⚠️ **IMPORTANTE: Debe ser exactamente esto**
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   
   ⚠️ **NOTA CRÍTICA:** Asegúrate de que el campo "Root Directory" esté configurado como `tacticsphere-backend` (sin barra al final). Si Render no encuentra el archivo, verifica que:
   - El Root Directory esté correctamente configurado
   - El repositorio tenga la carpeta `tacticsphere-backend` en la raíz
   - El archivo `requirements.txt` esté dentro de `tacticsphere-backend/`

4. **Variables de Entorno:**
   - Ve a la sección "Environment"
   - Agrega las variables:
     ```
     DATABASE_URL=sqlite:///./tacticsphere.db
     JWT_SECRET=tu-clave-secreta-super-segura-aqui
     JWT_ALG=HS256
     JWT_EXPIRE_MINUTES=60
     PASSWORD_MIN_LENGTH=10
     ```

5. **Base de Datos (Opcional):**
   - Para producción, considera usar PostgreSQL
   - Render ofrece PostgreSQL gratuito
   - Crea una base de datos PostgreSQL y actualiza `DATABASE_URL`

6. **Desplegar:**
   - Click en "Create Web Service"
   - Render desplegará automáticamente
   - Tu backend estará disponible en: `https://tacticsphere-backend.onrender.com`

### Opción 2: Railway

1. **Crear cuenta en Railway:**
   - Ve a [railway.app](https://railway.app)
   - Crea una cuenta (puedes usar GitHub)

2. **Nuevo Proyecto:**
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Selecciona tu repositorio

3. **Configuración:**
   - Railway detectará automáticamente que es Python
   - En "Settings" → "Root Directory": `tacticsphere-backend`
   - En "Settings" → "Start Command": `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Variables de Entorno:**
   - Ve a "Variables"
   - Agrega las mismas variables que en Render

5. **Base de Datos:**
   - Railway ofrece PostgreSQL
   - Crea una base de datos y actualiza `DATABASE_URL`

### Opción 3: Google Cloud Run (Integrado con Firebase)

1. **Instalar Google Cloud SDK:**
   ```bash
   # Descarga e instala desde: https://cloud.google.com/sdk/docs/install
   ```

2. **Autenticarse:**
   ```bash
   gcloud auth login
   gcloud config set project tacticsphere-prod
   ```

3. **Crear Dockerfile:**
   ```dockerfile
   FROM python:3.13-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

4. **Desplegar:**
   ```bash
   gcloud run deploy tacticsphere-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### Opción 4: Heroku

1. **Instalar Heroku CLI:**
   - Descarga desde [heroku.com](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login y crear app:**
   ```bash
   heroku login
   heroku create tacticsphere-backend
   ```

3. **Configurar variables:**
   ```bash
   heroku config:set DATABASE_URL=postgresql://...
   heroku config:set JWT_SECRET=tu-clave-secreta
   ```

4. **Desplegar:**
   ```bash
   git push heroku main
   ```

## 🔧 Configuración Post-Despliegue

### 1. Actualizar CORS (Ya está configurado)
El backend ya está configurado para aceptar peticiones desde:
- `https://tacticsphere-prod.web.app`
- `https://tacticsphere-prod.firebaseapp.com`

### 2. Actualizar Frontend
Una vez que tengas la URL del backend desplegado, actualiza:
- `tacticsphere-frontend/src/environments/environment.prod.ts`
- Cambia `apiUrl` a la URL de tu backend desplegado

### 3. Ejecutar Migraciones
Si usas Alembic para migraciones:
```bash
alembic upgrade head
```

## 🧪 Probar el Backend

Una vez desplegado, prueba el endpoint:
```bash
curl https://tu-backend-url.com/ping
```

Debería responder: `{"message":"pong"}`

## 📝 Notas Importantes

1. **Base de Datos:**
   - Para desarrollo: SQLite está bien
   - Para producción: Usa PostgreSQL o MySQL
   - Render y Railway ofrecen PostgreSQL gratuito

2. **Seguridad:**
   - **NUNCA** uses `JWT_SECRET` por defecto en producción
   - Genera una clave segura: `openssl rand -hex 32`
   - Mantén las variables de entorno seguras

3. **Escalabilidad:**
   - Los planes gratuitos tienen limitaciones
   - Considera actualizar cuando tengas más tráfico

## 🆘 Solución de Problemas

### Error: "Could not open requirements file: [Errno 2] No such file or directory: 'requirements.txt'"
**Solución:**
1. Ve a la configuración de tu servicio en Render
2. En la sección "Settings" → "Build & Deploy"
3. Verifica que el campo **"Root Directory"** esté configurado exactamente como: `tacticsphere-backend`
4. **NO** uses `tacticsphere-backend/` (sin la barra final)
5. Guarda los cambios y vuelve a desplegar

Si el problema persiste:
- Verifica que el archivo `requirements.txt` exista en la carpeta `tacticsphere-backend/` en tu repositorio
- Asegúrate de que el repositorio esté actualizado con el último commit

### Error: "DATABASE_URL no definido"
- Asegúrate de configurar la variable de entorno `DATABASE_URL` en Render
- Ve a "Environment" y agrega todas las variables necesarias

### Error: "Module not found"
- Verifica que `requirements.txt` tenga todas las dependencias
- Ejecuta `pip install -r requirements.txt` localmente para probar
- Asegúrate de que el Root Directory esté correctamente configurado

### CORS Error
- Verifica que el origen de Firebase esté en `allowed_origins` en `app/main.py`
- Ya está configurado, pero verifica que coincida con tu dominio

