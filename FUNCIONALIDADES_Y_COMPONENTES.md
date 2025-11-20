# Funcionalidades y Explicación de Componentes - TacticSphere

**Versión:** 1.0  
**Fecha:** 2025-01-XX

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Backend - FastAPI](#backend---fastapi)
3. [Frontend - Angular](#frontend---angular)
4. [Base de Datos](#base-de-datos)
5. [Componentes Principales](#componentes-principales)
6. [Servicios y Lógica de Negocio](#servicios-y-lógica-de-negocio)
7. [Flujos de Datos](#flujos-de-datos)
8. [Seguridad y Autenticación](#seguridad-y-autenticación)
9. [APIs y Endpoints](#apis-y-endpoints)

---

## Arquitectura General

TacticSphere sigue una arquitectura de **tres capas**:

```
┌─────────────────┐
│   Frontend      │  Angular 17+ (Standalone Components)
│   (Angular)     │  Tailwind CSS, ECharts
└────────┬────────┘
         │ HTTP/REST
         │ JWT Tokens
┌────────▼────────┐
│   Backend       │  FastAPI (Python 3.13+)
│   (FastAPI)     │  SQLAlchemy ORM
└────────┬────────┘
         │ SQL
┌────────▼────────┐
│   Base de       │  SQLite (dev) / PostgreSQL (prod)
│   Datos         │  Alembic Migrations
└─────────────────┘
```

### Separación de Responsabilidades

- **Frontend:** Presentación, validación de UI, interacción con usuario
- **Backend:** Lógica de negocio, validación de datos, seguridad, cálculos
- **Base de Datos:** Persistencia, integridad referencial, consultas optimizadas

---

## Backend - FastAPI

### Estructura de Directorios

```
tacticsphere-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Punto de entrada, definición de rutas
│   ├── models.py             # Modelos SQLAlchemy (ORM)
│   ├── schemas.py            # Esquemas Pydantic (validación)
│   ├── crud.py               # Operaciones de base de datos
│   ├── auth.py               # Autenticación y autorización
│   ├── audit.py              # Sistema de auditoría
│   ├── database.py           # Configuración de BD y sesiones
│   └── likert_levels.py      # Constantes de niveles Likert
├── alembic/                  # Migraciones de base de datos
│   └── versions/
└── scripts/                   # Scripts de utilidad
```

### Componentes Principales

#### `main.py` - Punto de Entrada

**Responsabilidades:**
- Definición de todas las rutas HTTP
- Middleware (CORS, autenticación)
- Validación de permisos por endpoint
- Registro de auditoría

**Endpoints Principales:**
- `/auth/login` - Autenticación
- `/me` - Información del usuario actual
- `/companies/*` - Gestión de empresas
- `/users/*` - Gestión de usuarios
- `/pillars/*` - Gestión de pilares
- `/questions/*` - Gestión de preguntas
- `/questionnaires/*` - Gestión de cuestionarios
- `/assignments/*` - Gestión de asignaciones
- `/survey/*` - Flujo de encuestas
- `/analytics/*` - Dashboard y reportes
- `/audit/*` - Registro de auditoría

**Patrón de Autorización:**
```python
# Ejemplo de endpoint protegido
@app.get("/companies")
def list_companies(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user)  # Requiere autenticación
):
    return crud.list_empresas(db)

# Ejemplo con restricción de rol
@app.post("/companies")
def create_company(
    data: EmpresaCreate,
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA))  # Solo ADMIN_SISTEMA
):
    return crud.create_empresa(db, ...)
```

#### `models.py` - Modelos de Datos

Define todas las entidades de la base de datos usando SQLAlchemy ORM.

**Entidades Principales:**

1. **Usuario:**
   - Campos: id, nombre, email, password_hash, rol, empresa_id, activo
   - Relaciones: empresa, password_change_requests, audit_logs

2. **Empresa:**
   - Campos: id, nombre, rut, giro, activa
   - Relaciones: usuarios, departamentos, empleados, pilares, cuestionarios, asignaciones

3. **Departamento:**
   - Campos: id, nombre, empresa_id
   - Relaciones: empresa, empleados

4. **Empleado:**
   - Campos: id, nombre, apellidos, rut, email, cargo, empresa_id, departamento_id
   - Relaciones: empresa, departamento, respuestas

5. **Pilar:**
   - Campos: id, nombre, descripcion, peso, empresa_id
   - Relaciones: empresa, preguntas, umbral, recomendaciones

6. **Pregunta:**
   - Campos: id, pilar_id, enunciado, tipo, es_obligatoria, peso, respuesta_esperada
   - Relaciones: pilar, respuestas

7. **Cuestionario:**
   - Campos: id, empresa_id, titulo, version, estado
   - Relaciones: empresa, preguntas_assoc (many-to-many)

8. **Asignacion:**
   - Campos: id, empresa_id, cuestionario_id, alcance_tipo, alcance_id, fecha_inicio, fecha_cierre, anonimo
   - Relaciones: empresa, cuestionario, respuestas

9. **Respuesta:**
   - Campos: id, asignacion_id, pregunta_id, empleado_id, valor, fecha_respuesta
   - Relaciones: asignacion, pregunta, empleado

10. **AuditLog:**
    - Campos: id, created_at, user_id, user_email, user_role, empresa_id, action, entity_type, entity_id, notes, ip, user_agent, method, path, diff_before, diff_after, extra

**Características:**
- Uso de `Mapped[]` para tipado fuerte
- Relaciones con `relationship()` y `ForeignKey`
- Índices para optimización de consultas
- Constraints únicos donde aplica
- Soft delete con campo `activa` en Empresa

#### `schemas.py` - Esquemas Pydantic

Define los modelos de validación y serialización para requests/responses.

**Tipos de Schemas:**

1. **Request Schemas (Create/Update):**
   - `EmpresaCreate`, `UsuarioCreate`, `PreguntaCreate`, etc.
   - Validación de campos obligatorios
   - Validadores personalizados (ej: `@model_validator`)

2. **Response Schemas (Read):**
   - `EmpresaRead`, `UsuarioRead`, `PreguntaRead`, etc.
   - Serialización desde modelos ORM
   - Campos calculados y relaciones anidadas

3. **Schemas Especializados:**
   - `DashboardAnalyticsResponse` - Estructura compleja del dashboard
   - `AssignmentProgress` - Progreso de encuesta
   - `BulkAnswersRequest` - Envío masivo de respuestas

**Ejemplo:**
```python
class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str = Field(min_length=10)  # Validación de longitud
    rol: RolEnum
    empresa_id: Optional[int] = None
```

#### `crud.py` - Operaciones de Base de Datos

Contiene todas las funciones de acceso a datos.

**Patrón CRUD:**
- `create_*` - Crear entidades
- `list_*` - Listar con filtros
- `get_*` - Obtener por ID
- `update_*` - Actualizar entidades
- `delete_*` - Eliminar entidades

**Funciones Especializadas:**

1. **Cálculos:**
   - `compute_dashboard_analytics()` - Calcula todas las métricas del dashboard
   - `compute_assignment_progress()` - Calcula progreso de encuesta
   - Normalización de respuestas Likert (1-5 → 0-1)

2. **Lógica de Negocio:**
   - `get_or_create_auto_asignacion()` - Crea asignación automáticamente
   - `build_or_get_auto_cuestionario()` - Crea cuestionario con todas las preguntas
   - `submit_bulk_answers()` - Guarda múltiples respuestas en una transacción

3. **Validaciones:**
   - `_validate_assignment_fk()` - Valida integridad referencial de asignaciones
   - `ensure_question_belongs_to_assignment()` - Verifica que pregunta pertenece a cuestionario

**Optimizaciones:**
- Uso de `joinedload()` para evitar N+1 queries
- Agregaciones SQL para cálculos eficientes
- Índices en campos de búsqueda frecuente

#### `auth.py` - Autenticación y Autorización

**Funciones Principales:**

1. **Hash y Validación de Contraseñas:**
   ```python
   hash_password(plain: str) -> str  # Bcrypt
   verify_password(plain: str, hashed: str) -> bool
   validate_password(password: str) -> None  # Valida longitud mínima
   ```

2. **Tokens JWT:**
   ```python
   create_access_token(data: dict, minutes: int) -> str
   # Payload incluye: sub (user_id), rol, empresa_id
   ```

3. **Dependencias de FastAPI:**
   ```python
   get_current_user() -> Usuario  # Valida token y retorna usuario
   require_roles(*roles: RolEnum)  # Decorador para restricción de roles
   ```

**Flujo de Autenticación:**
1. Usuario envía email/password a `/auth/login`
2. Backend valida credenciales con `verify_password`
3. Si válido, genera JWT con `create_access_token`
4. Frontend almacena token en localStorage
5. Todas las requests incluyen token en header `Authorization: Bearer <token>`
6. `get_current_user` valida token en cada request protegida

#### `audit.py` - Sistema de Auditoría

**Función Principal:**
```python
audit_log(
    db: Session,
    action: AuditActionEnum,
    current_user: Optional[Usuario],
    empresa_id: Optional[int],
    entity_type: Optional[str],
    entity_id: Optional[int],
    notes: Optional[str],
    diff_before: Optional[dict],
    diff_after: Optional[dict],
    request: Optional[Request]
)
```

**Características:**
- Registra todas las operaciones críticas
- Captura IP, User-Agent, método HTTP, path
- Almacena valores antes/después de cambios
- No interrumpe el flujo principal (try/except)

**Acciones Registradas:**
- LOGIN, LOGOUT
- USER_CREATE, USER_UPDATE, USER_DELETE, USER_PASSWORD_RESET
- COMPANY_CREATE, COMPANY_DELETE
- EMPLOYEE_CREATE, EMPLOYEE_UPDATE
- PILLAR_CREATE, PILLAR_DELETE
- QUESTION_CREATE, QUESTION_UPDATE, QUESTION_DELETE
- ASSIGNMENT_CREATE
- SURVEY_ANSWER_BULK
- REPORT_EXPORT
- AUDIT_EXPORT, AUDIT_DELETE

---

## Frontend - Angular

### Estructura de Directorios

```
tacticsphere-frontend/src/app/
├── admin/                    # Componentes administrativos
│   ├── companies/
│   ├── users/
│   ├── pillars/
│   ├── questions/
│   ├── dashboard-analytics/
│   └── audit/
├── home/                     # Landing page pública
├── login/                    # Autenticación
├── survey/                   # Componente de encuestas
├── layout/
│   └── shell/                # Layout principal con menú
├── shared/
│   └── ui/                   # Componentes reutilizables
├── core/
│   └── services/             # Servicios core
├── services/                 # Servicios de dominio
├── auth.service.ts           # Servicio de autenticación
├── auth.guard.ts             # Guard de autenticación
├── role.guard.ts             # Guard de roles
├── app.routes.ts             # Definición de rutas
└── types.ts                  # Interfaces TypeScript
```

### Componentes Principales

#### `ShellComponent` - Layout Principal

**Ubicación:** `layout/shell/shell.ts`

**Responsabilidades:**
- Menú lateral de navegación
- Header con información de usuario
- Footer
- Gestión de sidebar responsive (móvil/desktop)
- Redirección según rol

**Características:**
- Menú se oculta en móviles (< 1024px)
- Breadcrumbs implícitos
- Botón de logout
- Muestra rol actual del usuario

#### `HomeComponent` - Landing Page

**Ubicación:** `home/home.ts`

**Responsabilidades:**
- Página pública de presentación
- Formulario de solicitud de consultoría
- Información sobre TacticSphere

**Características:**
- Animaciones de entrada
- Intersection Observer para animaciones al scroll
- Modal para formulario de contacto
- Integración con `LeadService`

#### `LoginComponent` - Autenticación

**Ubicación:** `login/login.ts`

**Responsabilidades:**
- Formulario de login
- Validación de credenciales
- Manejo de errores
- Redirección post-login según rol

**Flujo:**
1. Usuario ingresa email/password
2. Llama a `AuthService.login()`
3. Guarda token en localStorage
4. Obtiene información de usuario con `/me`
5. Redirige a ruta por defecto según rol

#### `SurveyComponent` - Encuestas

**Ubicación:** `survey/survey.ts`

**Responsabilidades:**
- Gestión de colaboradores (crear, buscar, editar)
- Inicio automático de encuestas
- Visualización de progreso
- Respuesta de preguntas por pilar
- Guardado parcial y envío final

**Características Clave:**

1. **Gestión de Empleados:**
   - Formulario plegable para crear empleados
   - Búsqueda en tiempo real con debounce (400ms)
   - Edición inline de empleados
   - Formateo automático de RUT

2. **Flujo de Encuesta:**
   - Detección automática de asignación vigente
   - Creación automática si no existe
   - Carga de pilares y preguntas
   - Progreso en tiempo real

3. **Validaciones:**
   - Validación frontend de preguntas obligatorias
   - Resaltado visual de preguntas incompletas
   - Scroll automático a preguntas con error

4. **UI/UX:**
   - Sticky sidebar de pilares (desktop)
   - Sticky card de progreso
   - Indicadores visuales de avance
   - Información expandible de escala Likert

#### `DashboardAnalyticsComponent` - Dashboard

**Ubicación:** `admin/dashboard-analytics/dashboard-analytics.ts`

**Responsabilidades:**
- Visualización de KPIs
- Gráficos interactivos (ECharts)
- Filtros avanzados
- Exportación de reportes

**Gráficos Implementados:**

1. **Distribución Global:**
   - Gráfico de barras apiladas
   - Muestra distribución de niveles Likert (1-5) por pilar
   - Porcentajes y valores absolutos

2. **Heatmap por Departamento:**
   - Matriz de departamentos vs. pilares
   - Colores indican nivel de madurez
   - Tooltips con valores detallados

3. **Timeline:**
   - Línea de tiempo con evolución diaria
   - Múltiples series (uno por pilar)
   - Zoom y pan interactivos

4. **Ranking:**
   - Top 5 y Bottom 5 departamentos
   - Gráfico de barras horizontal

5. **Distribución por Departamento:**
   - Gráfico de barras agrupadas
   - Comparación entre departamentos

6. **Cobertura:**
   - Gráfico de barras de porcentaje de respuesta
   - Por departamento

**Exportación:**
- PDF: Usa html2canvas + jsPDF para capturar gráficos
- CSV: Descarga directa desde endpoint
- Excel, JSON, XML: (Preparado para implementación)

#### `CompaniesComponent` - Gestión de Empresas

**Ubicación:** `admin/companies/companies.ts`

**Responsabilidades:**
- Crear empresas
- Listar empresas
- Eliminar empresas (soft delete)
- Gestionar solicitudes de consultoría (leads)

**Características:**
- Formulario con validación
- Creación de departamentos al crear empresa
- Listado con información de estado
- Integración con `LeadService`

#### `UsersComponent` - Gestión de Usuarios

**Ubicación:** `admin/users/users.ts`

**Responsabilidades:**
- Crear usuarios
- Listar usuarios con filtros
- Cambiar roles
- Activar/desactivar usuarios
- Cambiar contraseñas
- Atender solicitudes de cambio de contraseña

**Características:**
- Formulario plegable para creación
- Filtros por empresa
- Cambio de rol inline (dropdown)
- Modal para cambio de contraseña
- Tabla de solicitudes de cambio de contraseña (solo ADMIN_SISTEMA)

#### `PillarsComponent` - Gestión de Pilares

**Ubicación:** `admin/pillars/pillars.ts`

**Responsabilidades:**
- Crear pilares (globales o por empresa)
- Listar pilares
- Editar pilares
- Eliminar pilares (con confirmación de cascada)

**Características:**
- Distinción entre pilares globales y específicos
- Validación de nombre único
- Confirmación antes de eliminar con preguntas asociadas

#### `QuestionsComponent` - Gestión de Preguntas

**Ubicación:** `admin/questions/questions.ts`

**Responsabilidades:**
- Crear preguntas asociadas a un pilar
- Listar preguntas por pilar
- Editar preguntas
- Eliminar preguntas

**Características:**
- Filtro por pilar
- Soporte para tipos: LIKERT, SI_NO, ABIERTA
- Campo de respuesta esperada (opcional)
- Validación de obligatoriedad

#### `AuditAdminComponent` - Auditoría

**Ubicación:** `admin/audit/audit-admin.ts`

**Responsabilidades:**
- Listar registros de auditoría
- Filtrar por múltiples criterios
- Exportar a CSV
- Eliminar registros (con confirmación de contraseña)

**Características:**
- Filtros múltiples combinables
- Búsqueda de texto libre
- Paginación (200 registros por defecto)
- Exportación con mismos filtros aplicados

### Servicios

#### `AuthService` - Autenticación

**Ubicación:** `auth.service.ts`

**Métodos Principales:**
- `login(email, password)` - Inicia sesión
- `logout()` - Cierra sesión
- `getToken()` - Obtiene token actual
- `getRole()` - Obtiene rol del usuario
- `getEmpresaId()` - Obtiene empresa del usuario
- `hasRole(roles)` - Verifica si tiene rol
- `isLoggedIn()` - Verifica si está autenticado
- `forgotPassword(email)` - Solicita cambio de contraseña

**Almacenamiento:**
- Token y datos de usuario en `localStorage` bajo clave `'auth'`
- Estructura: `{ token, rol, empresa_id }`

#### `CompanyService` - Empresas

**Ubicación:** `company.service.ts`

**Métodos:**
- `list()` - Lista todas las empresas
- `create(payload)` - Crea empresa
- `delete(id)` - Elimina empresa
- `listDepartments(empresaId)` - Lista departamentos

#### `UserService` - Usuarios

**Ubicación:** `user.service.ts`

**Métodos:**
- `list(empresaId?)` - Lista usuarios (opcionalmente filtrado por empresa)
- `create(payload)` - Crea usuario
- `update(id, payload)` - Actualiza usuario
- `delete(id)` - Elimina usuario
- `setPassword(id, password, requestId?)` - Cambia contraseña
- `toggleActive(user)` - Activa/desactiva usuario
- `listPasswordChangeRequests()` - Lista solicitudes (solo ADMIN_SISTEMA)

#### `SurveyService` - Encuestas

**Ubicación:** `survey.service.ts`

**Métodos:**
- `simpleBegin(empresaId, anonimo?)` - Inicia encuesta (crea asignación automáticamente)
- `begin(asignacionId, empleadoId?)` - Inicia encuesta con asignación existente
- `getProgress(asignacionId, empleadoId?)` - Obtiene progreso
- `getPillars(asignacionId)` - Lista pilares de la asignación
- `getPillarQuestions(asignacionId, pilarId, empleadoId?)` - Obtiene preguntas de un pilar
- `submitAnswers(asignacionId, body, empleadoId?)` - Envía respuestas

#### `AnalyticsService` - Dashboard

**Ubicación:** `analytics.service.ts`

**Métodos:**
- `getDashboardAnalytics(params)` - Obtiene datos del dashboard
- `exportResponsesCsv(params)` - Exporta respuestas a CSV

**Parámetros:**
- `companyId` - ID de empresa (obligatorio)
- `dateFrom`, `dateTo` - Rango de fechas
- `departmentIds[]` - Filtro por departamentos
- `employeeIds[]` - Filtro por empleados
- `pillarIds[]` - Filtro por pilares
- `includeTimeline` - Incluir datos de timeline

#### `EmployeeService` - Empleados

**Ubicación:** `employee.service.ts`

**Métodos:**
- `listByCompany(empresaId, departamentoId?, search?)` - Lista empleados
- `search(query, empresaId?)` - Búsqueda global de empleados
- `create(empresaId, payload)` - Crea empleado
- `update(empleadoId, payload)` - Actualiza empleado

#### `AssignmentsService` - Asignaciones

**Ubicación:** `assignments.service.ts`

**Métodos:**
- `list(empresaId?)` - Lista asignaciones
- `get(id)` - Obtiene asignación por ID
- `create(payload)` - Crea asignación
- `getActiveForCompany(empresaId)` - Obtiene asignación vigente
- `ensureActiveForCompany(empresaId, opts)` - Garantiza asignación vigente

### Guards y Interceptors

#### `AuthGuard` - Guard de Autenticación

**Ubicación:** `auth.guard.ts`

**Función:**
- Verifica que el usuario esté autenticado
- Redirige a `/login` si no hay token
- Valida que el token no haya expirado

#### `RoleGuard` - Guard de Roles

**Ubicación:** `role.guard.ts`

**Función:**
- Verifica que el usuario tenga uno de los roles permitidos
- Redirige a ruta por defecto si no tiene permisos

#### `AuthInterceptor` - Interceptor de Autenticación

**Ubicación:** `auth.interceptor.ts`

**Función:**
- Agrega automáticamente el token JWT a todas las requests HTTP
- Header: `Authorization: Bearer <token>`

#### `TokenInterceptor` - Interceptor de Tokens

**Ubicación:** `token.interceptor.ts`

**Función:**
- Similar a AuthInterceptor, clona requests y agrega token

### InactivityService - Gestión de Inactividad

**Ubicación:** `inactivity.service.ts`

**Responsabilidades:**
- Detecta inactividad del usuario
- Muestra advertencia antes de cerrar sesión
- Cierra sesión automáticamente después de 15 minutos

**Características:**
- Escucha eventos: mousedown, mousemove, keypress, scroll, touchstart, click
- Timer de advertencia: 14 minutos
- Timer de cierre: 15 minutos
- Reinicia timers con cualquier actividad
- Emite eventos observables para que componentes reaccionen

---

## Base de Datos

### Modelo de Datos

**Diagrama de Relaciones:**

```
Usuario ──┐
          ├──> Empresa ──> Departamento ──> Empleado
          │                    │
          │                    └──> Respuesta
          │
          └──> AuditLog

Empresa ──> Pilar ──> Pregunta ──┐
         │                        │
         │                        └──> Respuesta
         │
         └──> Cuestionario ──> CuestionarioPregunta ──> Pregunta
                │
                └──> Asignacion ──> Respuesta

Pilar ──> UmbralPilar
     └──> Recomendacion
```

### Índices y Optimizaciones

**Índices Principales:**
- `usuarios.email` - Búsqueda rápida de usuarios
- `empleados.empresa_id`, `empleados.departamento_id` - Filtros frecuentes
- `respuestas.asignacion_id`, `respuestas.pregunta_id` - Joins optimizados
- `audit_logs.created_at`, `audit_logs.empresa_id` - Filtros de auditoría
- `asignaciones.empresa_id`, `asignaciones.fecha_inicio`, `asignaciones.fecha_cierre` - Búsqueda de vigencia

**Constraints:**
- `usuarios.email` - Único
- `empresas.nombre` - Único
- `pilares.nombre` - Único (global)
- `departamentos.empresa_id + nombre` - Único por empresa
- `cuestionario_pregunta.cuestionario_id + pregunta_id` - Único
- `respuestas.asignacion_id + pregunta_id + empleado_id` - Único (evita duplicados)

### Migraciones

**Sistema:** Alembic

**Migraciones Existentes:**
- `20251104_add_consulting_leads.py` - Tabla de leads
- `20251107_password_change_requests.py` - Tabla de solicitudes de cambio
- `20251112_add_respuesta_esperada_to_preguntas.py` - Campo respuesta_esperada

**Uso:**
```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Revertir
alembic downgrade -1
```

---

## Flujos de Datos

### Flujo de Autenticación

```
Usuario → Frontend (LoginComponent)
    ↓
POST /auth/login { email, password }
    ↓
Backend valida credenciales
    ↓
Genera JWT token
    ↓
Frontend almacena token
    ↓
GET /me (con token)
    ↓
Backend retorna usuario completo
    ↓
Frontend guarda rol y empresa_id
    ↓
Redirige a ruta por defecto según rol
```

### Flujo de Respuesta de Encuesta

```
Usuario → SurveyComponent
    ↓
Selecciona empresa y empleado
    ↓
POST /survey/simple/begin { empresa_id }
    ↓
Backend crea/obtiene asignación vigente
    ↓
GET /survey/{asignacion_id}/progress
    ↓
Backend calcula progreso actual
    ↓
GET /survey/{asignacion_id}/pillars
    ↓
Backend lista pilares del cuestionario
    ↓
Usuario selecciona pilar
    ↓
GET /survey/{asignacion_id}/pillars/{pilar_id}
    ↓
Backend retorna preguntas con respuestas actuales
    ↓
Usuario responde preguntas
    ↓
POST /survey/{asignacion_id}/answers { respuestas[] }
    ↓
Backend guarda/actualiza respuestas
    ↓
Frontend actualiza progreso
```

### Flujo de Cálculo de Dashboard

```
Usuario → DashboardAnalyticsComponent
    ↓
Aplica filtros (empresa, fechas, departamentos, etc.)
    ↓
GET /analytics/dashboard?empresa_id=...&fecha_desde=...&...
    ↓
Backend (compute_dashboard_analytics):
    1. Filtra respuestas según criterios
    2. Agrupa por pilar, departamento, empleado
    3. Calcula promedios ponderados
    4. Calcula distribuciones (niveles 1-5)
    5. Calcula KPIs (promedio, fortalezas, brechas)
    6. Genera timeline si include_timeline=true
    ↓
Retorna DashboardAnalyticsResponse
    ↓
Frontend renderiza gráficos con ECharts
```

### Flujo de Auditoría

```
Cualquier operación crítica en Backend
    ↓
audit_log() es llamado
    ↓
Se captura:
    - Usuario actual
    - Acción realizada
    - Entidad afectada
    - Valores antes/después
    - IP, User-Agent, método HTTP
    ↓
Se guarda en tabla audit_logs
    ↓
ADMIN_SISTEMA puede consultar en /audit
    ↓
Filtros aplicados en query SQL
    ↓
Retorna lista de registros
```

---

## Seguridad y Autenticación

### Hash de Contraseñas

**Algoritmo:** bcrypt (via passlib)

**Configuración:**
- Longitud mínima: 10 caracteres (configurable via `PASSWORD_MIN_LENGTH`)
- Rounds: Default de bcrypt (12)

**Implementación:**
```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash_password(plain: str) -> str
verify_password(plain: str, hashed: str) -> bool
```

### Tokens JWT

**Configuración:**
- Algoritmo: HS256 (configurable via `JWT_ALG`)
- Expiración: 60 minutos (configurable via `JWT_EXPIRE_MINUTES`)
- Secret: Variable de entorno `JWT_SECRET`

**Payload:**
```json
{
  "sub": "user_id",
  "rol": "ADMIN",
  "empresa_id": 1,
  "exp": timestamp
}
```

**Validación:**
- Cada request protegida valida el token
- Si expira, retorna 401 Unauthorized
- Frontend redirige a login si recibe 401

### Control de Acceso (RBAC)

**Niveles de Restricción:**

1. **Público:**
   - `/ping`
   - `/consulting-leads` (POST)
   - `/auth/login`
   - `/auth/password/forgot`

2. **Autenticado:**
   - Cualquier usuario con token válido
   - Ejemplo: `/me`, `/companies` (GET)

3. **Por Rol:**
   - `require_roles(RolEnum.ADMIN_SISTEMA)` - Solo ADMIN_SISTEMA
   - `require_roles(RolEnum.ADMIN, RolEnum.ADMIN_SISTEMA)` - ADMIN o ADMIN_SISTEMA

4. **Por Empresa:**
   - `_ensure_company_access(current, empresa_id)`
   - ADMIN_SISTEMA: acceso total
   - ADMIN/ANALISTA: solo su empresa
   - USUARIO: solo su empresa y solo lectura

**Implementación:**
```python
def _ensure_company_access(current: Usuario, target_empresa_id: Optional[int]):
    if current.rol in (RolEnum.ADMIN_SISTEMA, RolEnum.ANALISTA):
        return  # Acceso total
    if current.rol == RolEnum.USUARIO:
        if current.empresa_id == target_empresa_id:
            return
        raise HTTPException(403, "Permisos insuficientes")
```

### CORS

**Configuración:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Nota:** En producción, configurar `allow_origins` con dominios específicos.

---

## APIs y Endpoints

### Autenticación

- `POST /auth/login` - Inicia sesión
- `GET /me` - Obtiene usuario actual
- `POST /auth/password/forgot` - Solicita cambio de contraseña

### Empresas

- `GET /companies` - Lista empresas
- `POST /companies` - Crea empresa (ADMIN_SISTEMA)
- `DELETE /companies/{id}` - Elimina empresa (ADMIN_SISTEMA)
- `GET /companies/{id}/departments` - Lista departamentos
- `POST /companies/{id}/departments` - Crea departamento
- `DELETE /departments/{id}` - Elimina departamento

### Usuarios

- `GET /users` - Lista usuarios (ADMIN/ADMIN_SISTEMA)
- `POST /users` - Crea usuario (ADMIN/ADMIN_SISTEMA)
- `PATCH /users/{id}` - Actualiza usuario
- `DELETE /users/{id}` - Elimina usuario
- `POST /users/{id}/password` - Cambia contraseña
- `GET /password-change-requests` - Lista solicitudes (ADMIN_SISTEMA)

### Empleados

- `GET /companies/{id}/employees` - Lista empleados
- `GET /employees/search` - Búsqueda global
- `POST /companies/{id}/employees` - Crea empleado
- `PATCH /employees/{id}` - Actualiza empleado

### Pilares

- `GET /pillars` - Lista pilares (filtrado por empresa opcional)
- `GET /companies/{id}/pillars` - Lista pilares de empresa
- `POST /pillars` - Crea pilar
- `DELETE /pillars/{id}` - Elimina pilar

### Preguntas

- `GET /questions?pilar_id={id}` - Lista preguntas de un pilar
- `GET /pillars/{id}/questions` - Lista preguntas de un pilar
- `POST /questions` - Crea pregunta
- `PUT /questions/{id}` - Actualiza pregunta
- `DELETE /questions/{id}` - Elimina pregunta

### Cuestionarios

- `GET /companies/{id}/questionnaires` - Lista cuestionarios
- `POST /questionnaires` - Crea cuestionario
- `PATCH /questionnaires/{id}/publish` - Publica cuestionario

### Asignaciones

- `GET /assignments` - Lista asignaciones
- `GET /assignments/{id}` - Obtiene asignación
- `POST /assignments` - Crea asignación
- `GET /companies/{id}/assignments/active` - Obtiene asignación vigente

### Encuestas

- `POST /survey/simple/begin` - Inicia encuesta (crea asignación automáticamente)
- `POST /survey/begin` - Inicia encuesta con asignación existente
- `GET /survey/{asignacion_id}/progress` - Obtiene progreso
- `GET /survey/{asignacion_id}/pillars` - Lista pilares
- `GET /survey/{asignacion_id}/pillars/{pilar_id}` - Obtiene preguntas de pilar
- `POST /survey/{asignacion_id}/answers` - Envía respuestas

### Analytics

- `GET /analytics/dashboard` - Obtiene datos del dashboard
- `GET /analytics/responses/export` - Exporta respuestas a CSV

### Auditoría

- `GET /audit` - Lista registros de auditoría
- `GET /audit/export` - Exporta auditoría a CSV
- `POST /audit/report-export` - Registra exportación de reporte
- `DELETE /audit/{id}` - Elimina registro (ADMIN_SISTEMA con contraseña)
- `DELETE /audit` - Limpia todos los registros (ADMIN_SISTEMA con contraseña)

### Leads (Consultoría)

- `POST /consulting-leads` - Crea solicitud (público)
- `GET /consulting-leads` - Lista solicitudes (ADMIN/ADMIN_SISTEMA)
- `DELETE /consulting-leads/{id}` - Elimina solicitud
- `DELETE /consulting-leads` - Limpia todas las solicitudes

---

## Cálculos y Lógica de Negocio

### Cálculo de Puntajes

**Normalización de Respuestas:**

1. **Likert (1-5):**
   - Valor raw: 1-5
   - Normalizado: `(valor - 1) / 4` → 0.0 a 1.0
   - Ejemplo: 3 → 0.5, 5 → 1.0

2. **Sí/No:**
   - SI → 1.0
   - NO → 0.0

3. **Abierta:**
   - No aporta a puntaje numérico

**Ponderación:**
- Peso de pregunta × Peso de pilar = Peso total
- Puntaje ponderado = Valor normalizado × Peso total
- Promedio = Suma de puntajes ponderados / Suma de pesos

**Ejemplo:**
```
Pregunta con valor Likert = 4
Peso pregunta = 2
Peso pilar = 3
Valor normalizado = (4-1)/4 = 0.75
Peso total = 2 × 3 = 6
Puntaje ponderado = 0.75 × 6 = 4.5
```

### Cálculo de Porcentajes

**Conversión a Porcentaje (0-100%):**
```
Porcentaje = (Suma de valores ponderados / (5 × Suma de pesos)) × 100
```

**Ejemplo:**
- Suma de valores ponderados = 450
- Suma de pesos = 100
- Porcentaje = (450 / (5 × 100)) × 100 = 90%

### Clasificación por Niveles Likert

**Distribución:**
- Nivel 1: 0-20%
- Nivel 2: 20-40%
- Nivel 3: 40-60%
- Nivel 4: 60-80%
- Nivel 5: 80-100%

**Cálculo:**
- Se cuenta el peso de cada respuesta por nivel
- Se calcula porcentaje de cada nivel sobre el total de pesos

### Progreso de Encuesta

**Métricas:**
- `total`: Total de preguntas en el cuestionario
- `respondidas`: Preguntas con respuesta guardada
- `completion`: `respondidas / total` (0.0 a 1.0)
- `progreso`: Puntaje promedio normalizado (0.0 a 1.0)

**Por Pilar:**
- Mismas métricas pero filtradas por pilar
- Permite ver avance parcial

---

## Tecnologías Utilizadas

### Backend

- **FastAPI:** Framework web asíncrono
- **SQLAlchemy:** ORM para Python
- **Pydantic:** Validación de datos
- **Alembic:** Migraciones de base de datos
- **passlib:** Hash de contraseñas (bcrypt)
- **python-jose:** JWT tokens
- **Python 3.13+**

### Frontend

- **Angular 17+:** Framework con standalone components
- **TypeScript:** Tipado estático
- **Tailwind CSS:** Estilos utility-first
- **ECharts:** Gráficos interactivos
- **RxJS:** Programación reactiva
- **Lucide Angular:** Iconos

### Base de Datos

- **SQLite:** Desarrollo
- **PostgreSQL:** Producción (recomendado)
- **Alembic:** Migraciones

### Herramientas

- **Alembic:** Migraciones
- **html2canvas + jsPDF:** Exportación a PDF
- **CSV:** Exportación nativa

---

## Configuración y Variables de Entorno

### Backend (.env)

```env
DATABASE_URL=sqlite:///./tacticsphere.db
JWT_SECRET=change-me-in-production
JWT_ALG=HS256
JWT_EXPIRE_MINUTES=60
PASSWORD_MIN_LENGTH=10
```

### Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000'
};
```

---

## Extensibilidad

### Agregar Nuevo Rol

1. Agregar a `RolEnum` en `models.py`
2. Actualizar `require_roles` donde corresponda
3. Actualizar guards en frontend
4. Actualizar lógica de permisos en `_ensure_company_access`

### Agregar Nuevo Tipo de Pregunta

1. Agregar a `TipoPreguntaEnum` en `models.py`
2. Actualizar validación en `create_pregunta`
3. Actualizar UI en `SurveyComponent`
4. Actualizar normalización en `compute_dashboard_analytics`

### Agregar Nuevo Endpoint

1. Definir schema en `schemas.py`
2. Agregar función CRUD en `crud.py` si es necesario
3. Agregar endpoint en `main.py`
4. Agregar servicio en frontend si aplica
5. Agregar componente si requiere UI

---

## Mejores Prácticas de Código

### Backend

1. **Validación:**
   - Usar Pydantic para validación de entrada
   - Validar permisos antes de operaciones
   - Validar integridad referencial

2. **Errores:**
   - Usar HTTPException con códigos apropiados
   - Mensajes de error claros y descriptivos
   - No exponer detalles internos en producción

3. **Transacciones:**
   - Usar `db.commit()` después de cambios
   - Manejar rollback en caso de error
   - Usar `db.flush()` cuando necesites el ID antes de commit

4. **Auditoría:**
   - Registrar todas las operaciones críticas
   - Incluir valores antes/después en updates
   - Capturar información de request (IP, User-Agent)

### Frontend

1. **Estado:**
   - Usar signals de Angular para estado reactivo
   - Evitar estado duplicado
   - Centralizar estado compartido en servicios

2. **Validación:**
   - Validar en frontend para UX
   - Validar en backend para seguridad
   - Mostrar mensajes de error claros

3. **Rendimiento:**
   - Usar OnPush change detection donde sea posible
   - Debounce en búsquedas
   - Lazy loading de componentes grandes

4. **UX:**
   - Mostrar estados de carga
   - Feedback inmediato en acciones
   - Manejo de errores amigable

---

## Troubleshooting Técnico

### Backend no inicia

- Verifica que `DATABASE_URL` esté configurada
- Verifica que las migraciones estén aplicadas
- Revisa logs de errores en consola

### Frontend no se conecta al backend

- Verifica que el backend esté corriendo
- Verifica `apiUrl` en `environment.ts`
- Revisa CORS en backend
- Revisa consola del navegador para errores

### Errores de autenticación

- Verifica que el token no haya expirado
- Verifica que `JWT_SECRET` sea el mismo en backend
- Limpia localStorage y vuelve a iniciar sesión

### Consultas lentas

- Revisa índices en base de datos
- Usa `EXPLAIN QUERY PLAN` en SQLite
- Considera agregar índices adicionales
- Optimiza queries con `joinedload()` en SQLAlchemy

---

**Fin del Documento de Funcionalidades y Componentes**

