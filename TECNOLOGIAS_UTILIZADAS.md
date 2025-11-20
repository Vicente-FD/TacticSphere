# Tecnologías Utilizadas - TacticSphere

**Versión:** 1.0 FINAL  
**Fecha:** 19-01-2025

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Backend](#backend)
3. [Frontend](#frontend)
4. [Base de Datos](#base-de-datos)
5. [Herramientas de Desarrollo](#herramientas-de-desarrollo)
6. [Seguridad y Autenticación](#seguridad-y-autenticación)
7. [Visualización de Datos](#visualización-de-datos)
8. [Exportación de Datos](#exportación-de-datos)
9. [Gestión de Dependencias](#gestión-de-dependencias)
10. [Versionado y Migraciones](#versionado-y-migraciones)

---

## Arquitectura General

TacticSphere utiliza una **arquitectura de tres capas**:

1. **Frontend**: Aplicación web SPA (Single Page Application) construida con Angular
2. **Backend**: API REST construida con FastAPI
3. **Base de Datos**: PostgreSQL (producción) / SQLite (desarrollo)

La comunicación entre frontend y backend se realiza mediante **HTTP/REST** con autenticación basada en **JWT (JSON Web Tokens)**.

---

## Backend

### Framework Principal

#### FastAPI (v0.116.1)
- **Descripción**: Framework web moderno y de alto rendimiento para construir APIs con Python 3.7+ basado en estándares web modernos.
- **Uso en el proyecto**:
  - Definición de endpoints REST
  - Validación automática de datos con Pydantic
  - Documentación automática con OpenAPI/Swagger
  - Manejo de dependencias (inyección de dependencias)
  - Middleware CORS para comunicación con frontend
- **Ventajas**:
  - Alto rendimiento (comparable a NodeJS y Go)
  - Validación automática de tipos
  - Documentación interactiva automática
  - Soporte nativo para async/await

### ORM y Base de Datos

#### SQLAlchemy (v2.0.43)
- **Descripción**: Toolkit SQL y ORM (Object-Relational Mapping) para Python.
- **Uso en el proyecto**:
  - Definición de modelos de base de datos (declarative base)
  - Gestión de sesiones de base de datos
  - Queries y operaciones CRUD
  - Relaciones entre entidades (one-to-many, many-to-many)
  - Migraciones con Alembic
- **Características utilizadas**:
  - Mapped types (SQLAlchemy 2.0 style)
  - Relationships con cascade options
  - Índices y restricciones de unicidad
  - Soporte para JSON fields

#### Alembic (v1.16.5)
- **Descripción**: Herramienta de migración de base de datos para SQLAlchemy.
- **Uso en el proyecto**:
  - Creación y gestión de migraciones de esquema
  - Versionado de cambios en la base de datos
  - Scripts de migración automáticos y manuales
- **Archivos**:
  - `alembic.ini`: Configuración de Alembic
  - `alembic/versions/`: Scripts de migración versionados

### Validación y Serialización

#### Pydantic (v2.11.9)
- **Descripción**: Biblioteca de validación de datos usando anotaciones de tipo de Python.
- **Uso en el proyecto**:
  - Esquemas de validación para requests y responses (`schemas.py`)
  - Validación automática de tipos y formatos
  - Serialización de modelos ORM a JSON
  - Validadores personalizados (`model_validator`)
- **Características utilizadas**:
  - `BaseModel` para esquemas
  - `ConfigDict` para configuración
  - `Field` para validaciones adicionales (min_length, max_length)
  - `EmailStr` para validación de emails
  - `model_validator` para validaciones complejas

### Servidor ASGI

#### Uvicorn (v0.35.0)
- **Descripción**: Servidor ASGI de alto rendimiento para aplicaciones Python.
- **Uso en el proyecto**:
  - Servidor de desarrollo y producción
  - Soporte para HTTP/1.1 y WebSockets
  - Hot reload en desarrollo
- **Características**:
  - Basado en uvloop y httptools
  - Soporte para async/await

### Autenticación y Seguridad

#### python-jose (v3.5.0)
- **Descripción**: Implementación de JWT (JSON Web Tokens) para Python.
- **Uso en el proyecto**:
  - Generación de tokens JWT para autenticación
  - Validación y decodificación de tokens
  - Extracción de información del usuario desde tokens
- **Ubicación**: `app/auth.py`

#### passlib (v1.7.4) + bcrypt (v4.3.0)
- **Descripción**: Biblioteca para hashing de contraseñas con múltiples algoritmos.
- **Uso en el proyecto**:
  - Hashing de contraseñas con bcrypt
  - Verificación de contraseñas en login
  - Validación de fortaleza de contraseñas (mínimo 10 caracteres)
- **Configuración**:
  ```python
  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
  ```

### Utilidades

#### python-dotenv (v1.1.1)
- **Descripción**: Carga variables de entorno desde archivos `.env`.
- **Uso en el proyecto**:
  - Carga de `DATABASE_URL` desde `.env`
  - Configuración de entorno sin hardcodear valores

#### email-validator (v2.3.0)
- **Descripción**: Validación de direcciones de correo electrónico.
- **Uso en el proyecto**:
  - Validación de emails en esquemas Pydantic (`EmailStr`)

---

## Frontend

### Framework Principal

#### Angular (v20.3.0)
- **Descripción**: Framework de aplicaciones web de código abierto desarrollado por Google.
- **Uso en el proyecto**:
  - Arquitectura de componentes
  - Sistema de routing con lazy loading
  - Inyección de dependencias
  - Gestión de estado reactivo
  - Formularios reactivos
- **Características utilizadas**:
  - **Standalone Components**: Componentes independientes sin módulos
  - **Signals**: Sistema de reactividad moderno
  - **Guards**: Protección de rutas (authGuard, roleGuard)
  - **Interceptors**: Manejo de headers HTTP (autenticación)
  - **Services**: Lógica de negocio y comunicación con API

#### TypeScript (v5.9.2)
- **Descripción**: Superset de JavaScript con tipado estático.
- **Uso en el proyecto**:
  - Tipado de todas las variables, funciones y clases
  - Interfaces para modelos de datos
  - Tipos genéricos para servicios
  - Mejor autocompletado y detección de errores

### Gestión de Estado y Reactividad

#### RxJS (v7.8.0)
- **Descripción**: Biblioteca para programación reactiva usando Observables.
- **Uso en el proyecto**:
  - Manejo de peticiones HTTP (HttpClient)
  - Operadores para transformación de datos (map, filter, debounceTime)
  - Gestión de eventos asíncronos
  - Manejo de inactividad de usuario (`inactivity.service.ts`)
- **Operadores utilizados**:
  - `debounceTime`: Para búsquedas con delay
  - `map`: Para transformar respuestas HTTP
  - `catchError`: Para manejo de errores
  - `switchMap`: Para cancelar peticiones anteriores

### Estilos y UI

#### TailwindCSS (v3.4.17)
- **Descripción**: Framework CSS utility-first para diseño rápido.
- **Uso en el proyecto**:
  - Estilos de componentes
  - Diseño responsive
  - Utilidades para espaciado, colores, tipografía
- **Ventajas**:
  - Desarrollo rápido sin escribir CSS personalizado
  - Clases utilitarias reutilizables
  - Purge automático de CSS no utilizado

#### Lucide Angular (v0.546.0)
- **Descripción**: Biblioteca de iconos moderna y ligera.
- **Uso en el proyecto**:
  - Iconos en toda la aplicación
  - Iconos consistentes y escalables

#### @fontsource/inter (v5.2.8)
- **Descripción**: Fuente tipográfica Inter optimizada para web.
- **Uso en el proyecto**:
  - Fuente principal de la aplicación

### Visualización de Datos

#### ECharts (v5.6.0) + ngx-echarts (v8.0.1)
- **Descripción**: Biblioteca de visualización de datos interactiva.
- **Uso en el proyecto**:
  - Gráficos de barras (distribución de pilares)
  - Gráficos de radar (comparación de pilares)
  - Gráficos de líneas (timeline de evolución)
  - Heatmaps (comparación departamento-pilar)
- **Componente**: `admin/dashboard-analytics/dashboard-analytics.ts`
- **Ventajas**:
  - Alto rendimiento con grandes volúmenes de datos
  - Interactividad nativa
  - Múltiples tipos de gráficos

### Exportación de Datos

#### html2canvas (v1.4.1) + jsPDF (v3.0.3)
- **Descripción**: Conversión de elementos HTML a imágenes y generación de PDFs.
- **Uso en el proyecto**:
  - Exportación de dashboard a PDF
  - Captura de gráficos y tablas
- **Funcionalidad**: `generateReport()` en `dashboard-analytics.ts`

#### ExcelJS (v4.4.0) + xlsx (v0.18.5) + xlsx-populate (v1.21.0)
- **Descripción**: Bibliotecas para generación y manipulación de archivos Excel.
- **Uso en el proyecto**:
  - Exportación de datos a Excel
  - Formateo de celdas y estilos
  - Múltiples hojas de cálculo

### Utilidades Frontend

#### ngx-skeleton-loader (v11.3.0)
- **Descripción**: Componente para mostrar placeholders de carga (skeleton screens).
- **Uso en el proyecto**:
  - Mejora de UX durante la carga de datos
  - Indicadores visuales de carga

### Herramientas de Desarrollo Frontend

#### Angular CLI (v20.3.1)
- **Descripción**: Herramienta de línea de comandos para Angular.
- **Uso en el proyecto**:
  - Generación de componentes, servicios, guards
  - Compilación y build del proyecto
  - Servidor de desarrollo (`ng serve`)
  - Optimización para producción

#### Autoprefixer (v10.4.21) + PostCSS (v8.5.6)
- **Descripción**: Procesamiento de CSS con autoprefijos para compatibilidad de navegadores.
- **Uso en el proyecto**:
  - Procesamiento automático de CSS de TailwindCSS
  - Compatibilidad cross-browser

---

## Base de Datos

### Motor de Base de Datos

#### SQLite (Desarrollo)
- **Descripción**: Base de datos relacional embebida, sin servidor.
- **Uso en el proyecto**:
  - Desarrollo local
  - Testing
  - Archivo: `tacticsphere.db`
- **Configuración**: `sqlite:///tacticsphere.db` en `alembic.ini`

#### PostgreSQL (Producción)
- **Descripción**: Sistema de gestión de bases de datos relacional de código abierto.
- **Uso en el proyecto**:
  - Entorno de producción
  - Soporte para múltiples conexiones concurrentes
  - Mejor rendimiento con grandes volúmenes de datos
- **Configuración**: Mediante variable de entorno `DATABASE_URL`

### Características de Base de Datos Utilizadas

- **Transacciones**: Para operaciones atómicas
- **Índices**: Optimización de consultas frecuentes
- **Restricciones de Unicidad**: Para prevenir duplicados
- **Claves Foráneas**: Integridad referencial
- **Cascadas**: Eliminación y actualización en cascada
- **Campos JSON**: Para datos flexibles (audit_logs)
- **Enums**: Para valores predefinidos (roles, tipos de pregunta)

---

## Herramientas de Desarrollo

### Control de Versiones

#### Git
- **Descripción**: Sistema de control de versiones distribuido.
- **Uso en el proyecto**:
  - Versionado de código
  - Gestión de ramas
  - Colaboración en equipo

### Gestión de Entornos Virtuales

#### Python venv
- **Descripción**: Módulo estándar de Python para crear entornos virtuales.
- **Uso en el proyecto**:
  - Aislamiento de dependencias de Python
  - Carpeta: `tacticsphere-backend/venv/`

### Gestión de Paquetes Python

#### pip
- **Descripción**: Gestor de paquetes para Python.
- **Uso en el proyecto**:
  - Instalación de dependencias del backend
  - Gestión de paquetes en el entorno virtual

### Gestión de Paquetes Node.js

#### npm
- **Descripción**: Gestor de paquetes para Node.js.
- **Uso en el proyecto**:
  - Instalación de dependencias del frontend
  - Ejecución de scripts (build, start, test)
  - Archivo: `package.json`

---

## Seguridad y Autenticación

### Autenticación

#### JWT (JSON Web Tokens)
- **Implementación**: `python-jose`
- **Uso en el proyecto**:
  - Tokens de acceso después del login
  - Validación de tokens en cada request
  - Almacenamiento en `localStorage` (frontend)
- **Flujo**:
  1. Usuario inicia sesión con email/password
  2. Backend valida credenciales
  3. Backend genera JWT con información del usuario
  4. Frontend almacena token en `localStorage`
  5. Frontend envía token en header `Authorization: Bearer {token}`
  6. Backend valida token en cada request protegido

#### Bcrypt
- **Implementación**: `passlib` con `bcrypt`
- **Uso en el proyecto**:
  - Hashing de contraseñas antes de almacenar
  - Verificación de contraseñas en login
  - Validación de fortaleza (mínimo 10 caracteres)

### Autorización

#### Role-Based Access Control (RBAC)
- **Implementación**: Custom en `app/auth.py`
- **Roles**:
  - `ADMIN_SISTEMA`: Acceso completo
  - `ADMIN`: Gestión de empresa
  - `ANALISTA`: Solo lectura y encuestas
  - `USUARIO`: Solo encuestas
- **Guards**:
  - `authGuard`: Verifica autenticación
  - `roleGuard`: Verifica roles específicos
  - `adminSistemaGuard`: Solo ADMIN_SISTEMA

### CORS (Cross-Origin Resource Sharing)

#### CORSMiddleware (FastAPI)
- **Configuración**:
  - Orígenes permitidos: `http://localhost:4200`, `http://127.0.0.1:4200`
  - Métodos: GET, POST, PUT, DELETE, OPTIONS
  - Headers: Authorization, Content-Type
- **Ubicación**: `app/main.py`

### Protección de Datos

#### Soft Delete
- **Implementación**: Campo `activa` en tabla `empresas`
- **Uso**: Eliminación lógica en lugar de física para preservar datos históricos

#### Auditoría
- **Implementación**: Tabla `audit_logs`
- **Registro de**:
  - Acciones de usuarios (CREATE, UPDATE, DELETE)
  - Logins y logouts
  - Cambios de contraseña
  - Exportaciones de reportes
  - IP, User-Agent, timestamps
  - Diferencias antes/después (JSON)

---

## Visualización de Datos

### Biblioteca Principal

#### ECharts
- **Tipos de gráficos utilizados**:
  - **Bar Chart**: Distribución de respuestas por nivel Likert
  - **Radar Chart**: Comparación de pilares
  - **Line Chart**: Evolución temporal (timeline)
  - **Heatmap**: Comparación departamento-pilar
- **Configuración**: Opciones personalizadas para cada tipo de gráfico
- **Interactividad**: Tooltips, zoom, pan

### Componente Angular

#### ngx-echarts
- **Descripción**: Wrapper de Angular para ECharts.
- **Uso**: Integración de ECharts en componentes Angular
- **Directiva**: `[echarts]` en templates HTML

---

## Exportación de Datos

### Formatos Soportados

#### CSV
- **Implementación**: `StreamingResponse` de FastAPI
- **Uso**: Exportación de respuestas y auditoría
- **Ventajas**: Compatible con Excel, ligero, fácil de procesar

#### PDF
- **Implementación**: `html2canvas` + `jsPDF`
- **Uso**: Exportación de dashboard completo con gráficos
- **Proceso**:
  1. Captura de elementos HTML con `html2canvas`
  2. Conversión a imagen
  3. Generación de PDF con `jsPDF`

#### Excel (.xlsx)
- **Implementación**: `ExcelJS` / `xlsx`
- **Uso**: Exportación de datos estructurados
- **Características**:
  - Múltiples hojas
  - Formateo de celdas
  - Estilos y colores

#### JSON / XML
- **Implementación**: Serialización nativa
- **Uso**: Exportación de datos estructurados para integración

---

## Gestión de Dependencias

### Backend

#### Sin requirements.txt explícito
- **Razón**: Dependencias instaladas directamente en `venv`
- **Dependencias principales** (identificadas por análisis):
  - fastapi
  - sqlalchemy
  - alembic
  - pydantic
  - uvicorn
  - python-jose
  - passlib
  - bcrypt
  - python-dotenv
  - email-validator

### Frontend

#### package.json
- **Gestión**: npm
- **Scripts disponibles**:
  - `npm start`: Servidor de desarrollo
  - `npm run build`: Compilación para producción
  - `npm test`: Ejecución de tests
- **Dependencias**: Listadas en `package.json` con versiones específicas

---

## Versionado y Migraciones

### Migraciones de Base de Datos

#### Alembic
- **Comandos principales**:
  - `alembic revision --autogenerate`: Genera migración automática
  - `alembic upgrade head`: Aplica migraciones pendientes
  - `alembic downgrade -1`: Revierte última migración
- **Archivos de migración**: `alembic/versions/`
- **Ejemplos**:
  - `20251104_add_consulting_leads.py`
  - `20251107_password_change_requests.py`
  - `20251112_add_respuesta_esperada_to_preguntas.py`

### Control de Versiones de Código

#### Git
- **Estrategia**: Branching según necesidades del proyecto
- **Commits**: Historial de cambios versionado

---

## Arquitectura de Comunicación

### API REST

#### Endpoints Principales
- **Autenticación**: `/auth/login`, `/auth/password/forgot`, `/me`
- **Usuarios**: `/users` (CRUD)
- **Empresas**: `/companies` (CRUD)
- **Pilares**: `/pillars` (CRUD)
- **Preguntas**: `/questions` (CRUD)
- **Cuestionarios**: `/questionnaires` (CRUD)
- **Asignaciones**: `/assignments` (CRUD)
- **Encuestas**: `/survey/*` (respuestas)
- **Analytics**: `/analytics/dashboard`, `/analytics/responses/export`
- **Auditoría**: `/audit` (listado, exportación, eliminación)

### Formato de Datos

#### Request/Response
- **Formato**: JSON
- **Content-Type**: `application/json`
- **Autenticación**: Header `Authorization: Bearer {token}`

### Manejo de Errores

#### HTTP Status Codes
- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado
- `400 Bad Request`: Error de validación
- `401 Unauthorized`: No autenticado
- `403 Forbidden`: Sin permisos
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## Rendimiento y Optimización

### Backend

#### Optimizaciones
- **Índices de base de datos**: Para consultas frecuentes
- **Lazy loading**: Carga de relaciones bajo demanda
- **Queries optimizadas**: Uso de `joinedload` cuando es necesario
- **Caché de resultados**: Para analytics (futuro)

### Frontend

#### Optimizaciones
- **Lazy Loading**: Carga de módulos bajo demanda
- **OnPush Change Detection**: Para componentes que no cambian frecuentemente
- **Debounce**: Para búsquedas (400ms)
- **Skeleton Loaders**: Mejora de percepción de rendimiento

---

## Testing (Futuro)

### Backend
- **Framework sugerido**: `pytest` + `httpx` (cliente de prueba para FastAPI)

### Frontend
- **Framework**: Jasmine + Karma (configurado en `package.json`)
- **Herramientas**: `@angular/cli` con soporte para testing

---

## Despliegue

### Backend
- **Servidor ASGI**: Uvicorn en producción
- **Base de datos**: PostgreSQL
- **Variables de entorno**: `.env` con `DATABASE_URL`

### Frontend
- **Build**: `ng build` genera archivos estáticos
- **Servidor web**: Nginx o similar para servir archivos estáticos
- **API Proxy**: Configuración de proxy para comunicación con backend

---

## Resumen de Stack Tecnológico

### Backend Stack
```
Python 3.13
├── FastAPI (Framework web)
├── SQLAlchemy (ORM)
├── Alembic (Migraciones)
├── Pydantic (Validación)
├── Uvicorn (Servidor ASGI)
├── python-jose (JWT)
├── passlib + bcrypt (Hashing)
└── PostgreSQL / SQLite (Base de datos)
```

### Frontend Stack
```
Angular 20
├── TypeScript (Lenguaje)
├── RxJS (Reactividad)
├── TailwindCSS (Estilos)
├── ECharts (Visualización)
├── html2canvas + jsPDF (Exportación PDF)
├── ExcelJS (Exportación Excel)
└── Lucide Angular (Iconos)
```

### Herramientas de Desarrollo
```
├── Git (Control de versiones)
├── npm (Gestión de paquetes Node)
├── pip (Gestión de paquetes Python)
├── Angular CLI (Herramientas Angular)
└── Alembic (Migraciones DB)
```

---

**Fin del Documento de Tecnologías Utilizadas**

