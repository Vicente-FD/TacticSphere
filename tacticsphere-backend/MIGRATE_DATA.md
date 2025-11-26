# Guía de Migración de Datos

Esta guía te ayudará a migrar tus datos desde la base de datos local (SQLite) al backend en producción (Render).

## ⚠️ Situación Actual

**IMPORTANTE:** Los datos que tienes en tu base de datos local (`tacticsphere.db`) **NO se migraron automáticamente** al backend en Render. 

Si configuraste SQLite en Render (`DATABASE_URL=sqlite:///./tacticsphere.db`), los datos se perderán cada vez que Render reinicie el servicio porque:
- SQLite es un archivo local que se almacena en el sistema de archivos temporal
- Render no mantiene archivos entre reinicios en el plan gratuito
- Cada reinicio crea una base de datos nueva y vacía

## 📋 Opciones para Migrar Datos

### Opción 1: Migración Manual (Recomendado para empezar)

#### Paso 1: Exportar datos locales

1. Asegúrate de estar en el directorio del backend:
   ```bash
   cd tacticsphere-backend
   ```

2. Activa tu entorno virtual (si lo tienes):
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. Ejecuta el script de exportación:
   ```bash
   python scripts/export_data.py
   ```

4. Esto creará un archivo `data_export.json` en `tacticsphere-backend/` con todos tus datos.

#### Paso 2: Importar datos a producción

**Opción A: Usar el script de importación localmente apuntando a producción**

1. Crea un archivo `.env.production` temporal:
   ```bash
   DATABASE_URL=postgresql://usuario:password@host:5432/database
   # O la URL de tu base de datos en Render
   ```

2. Modifica temporalmente `app/database.py` para usar esta variable, o:
   
3. **Mejor opción:** Usa la API del backend para importar datos (ver abajo)

**Opción B: Importar vía API (Más seguro)**

Puedes crear un endpoint temporal en el backend para importar datos, o usar scripts que se conecten directamente a la base de datos de producción.

### Opción 2: Usar PostgreSQL en Render (Recomendado para producción)

PostgreSQL es una base de datos persistente que mantiene los datos entre reinicios.

#### Paso 1: Crear base de datos PostgreSQL en Render

1. En Render, ve a "New +" → "PostgreSQL"
2. Configura:
   - **Name:** `tacticsphere-db`
   - **Database:** `tacticsphere`
   - **User:** Se generará automáticamente
   - **Region:** Elige la misma región que tu backend
3. Click en "Create Database"
4. Render te dará una `DATABASE_URL` como:
   ```
   postgresql://user:password@host:5432/database
   ```

#### Paso 2: Actualizar variables de entorno en Render

1. Ve a tu servicio de backend en Render
2. Ve a "Environment"
3. Actualiza `DATABASE_URL` con la nueva URL de PostgreSQL:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```
4. Guarda los cambios
5. Render reiniciará automáticamente el servicio

#### Paso 3: Migrar datos a PostgreSQL

1. **Instalar dependencias para PostgreSQL:**
   - Ya está en `requirements.txt`: `psycopg2-binary` (necesitarás agregarlo)
   
2. **Actualizar requirements.txt:**
   ```
   psycopg2-binary==2.9.9
   ```

3. **Exportar datos locales** (usando el script de arriba)

4. **Importar a PostgreSQL:**
   - Puedes usar el script `import_data.py` modificando temporalmente `DATABASE_URL`
   - O usar herramientas como `pgAdmin` o `DBeaver`

### Opción 3: Migración Directa SQLite → PostgreSQL

Si tienes acceso a herramientas de línea de comandos:

```bash
# Instalar sqlite3-to-postgres si no lo tienes
pip install sqlite3-to-postgres

# Migrar
sqlite3-to-postgres \
  --sqlite-file tacticsphere.db \
  --postgres-url postgresql://user:password@host:5432/database
```

## 🔧 Scripts Disponibles

### `scripts/export_data.py`
Exporta todos los datos de la base de datos local a un archivo JSON.

**Uso:**
```bash
python scripts/export_data.py
```

**Salida:** `data_export.json` en el directorio raíz del backend.

### `scripts/import_data.py`
Importa datos desde el archivo JSON exportado a la base de datos actual.

**Uso:**
```bash
# Asegúrate de que DATABASE_URL apunte a la base de datos destino
python scripts/import_data.py
```

**Nota:** Este script omite registros que ya existen (por ID) para evitar duplicados.

## 📝 Pasos Recomendados

1. **Exportar datos locales ahora:**
   ```bash
   cd tacticsphere-backend
   python scripts/export_data.py
   ```

2. **Crear base de datos PostgreSQL en Render** (gratis)

3. **Actualizar `DATABASE_URL` en Render** con la URL de PostgreSQL

4. **Agregar `psycopg2-binary` a requirements.txt** y hacer redeploy

5. **Importar datos a PostgreSQL** usando el script o herramientas de migración

## ⚠️ Advertencias Importantes

1. **Backup:** Siempre haz una copia de seguridad de `tacticsphere.db` antes de migrar
2. **Seguridad:** El archivo `data_export.json` contiene datos sensibles. **NO lo subas a Git**
3. **Pruebas:** Prueba la migración en un entorno de prueba primero si es posible
4. **Contraseñas:** Las contraseñas están hasheadas, así que se mantendrán

## 🆘 Solución de Problemas

### Error: "No module named 'psycopg2'"
Agrega `psycopg2-binary==2.9.9` a `requirements.txt` y haz redeploy.

### Error: "Connection refused"
Verifica que la `DATABASE_URL` sea correcta y que la base de datos PostgreSQL esté activa en Render.

### Datos duplicados
El script `import_data.py` omite registros existentes por defecto. Si necesitas forzar la importación, modifica `skip_existing=False` en el script.

## 📞 Siguiente Paso

**Recomendación inmediata:**
1. Ejecuta `python scripts/export_data.py` AHORA para tener un backup de tus datos
2. Crea una base de datos PostgreSQL en Render
3. Actualiza la configuración
4. Importa los datos

¿Necesitas ayuda con algún paso específico?


