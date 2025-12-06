# Funciones y Vistas Importantes - TacticSphere

## Tabla de Contenidos

1. [Vistas y Componentes del Frontend](#vistas-y-componentes-del-frontend)
2. [Servicios del Frontend](#servicios-del-frontend)
3. [Endpoints de la API (Backend)](#endpoints-de-la-api-backend)
4. [Guards y Middleware](#guards-y-middleware)
5. [Funciones de Utilidad](#funciones-de-utilidad)
6. [Modelos de Datos](#modelos-de-datos)

---

## Vistas y Componentes del Frontend

### Públicas (Sin Autenticación)

#### 1. HomeComponent (`/home`)
**Ruta**: `/home`  
**Archivo**: `src/app/home/home.ts`

**Funcionalidades**:
- Página de inicio pública
- Presentación de TacticSphere
- Formulario de solicitud de consultoría
- Información sobre los pilares de evaluación
- Esfera 3D decorativa (HeroSphere3dComponent)

**Funciones principales**:
- `submitLead()`: Envía solicitud de consultoría
- `scrollToSection()`: Navegación por secciones

#### 2. LoginComponent (`/login`)
**Ruta**: `/login`  
**Archivo**: `src/app/login/login.ts`

**Funcionalidades**:
- Formulario de inicio de sesión
- Validación de credenciales
- Redirección según rol del usuario

**Funciones principales**:
- `onSubmit()`: Procesa el login
- `forgotPassword()`: Redirige a recuperación de contraseña

#### 3. ForgotPasswordComponent (`/password/recuperar`)
**Ruta**: `/password/recuperar`  
**Archivo**: `src/app/login/forgot-password.ts`

**Funcionalidades**:
- Formulario de recuperación de contraseña
- Envío de solicitud de cambio de contraseña

**Funciones principales**:
- `onSubmit()`: Envía solicitud de recuperación

---

### Protegidas (Requieren Autenticación)

#### 4. ShellComponent (Layout Principal)
**Ruta**: Base para todas las rutas protegidas  
**Archivo**: `src/app/layout/shell/shell.ts`

**Funcionalidades**:
- Layout principal de la aplicación
- Barra de navegación superior
- Menú lateral (sidebar)
- Pie de página
- Gestión de notificaciones
- Control de sesión

**Funciones principales**:
- `logout()`: Cierra sesión
- `toggleSidebar()`: Controla visibilidad del menú móvil
- `handleNavClick()`: Maneja clicks en navegación
- `scrollToTop()`: Scroll al inicio

**Menú lateral incluye**:
- Resultados (Dashboard)
- Encuesta
- Empresas (solo ADMIN, ADMIN_SISTEMA)
- Pilares (solo ADMIN, ADMIN_SISTEMA)
- Preguntas (solo ADMIN, ADMIN_SISTEMA)
- Usuarios (solo ADMIN, ADMIN_SISTEMA)
- Registro de auditoría (solo ADMIN_SISTEMA)

---

#### 5. DashboardAnalyticsComponent (`/results`)
**Ruta**: `/results`  
**Archivo**: `src/app/admin/dashboard-analytics/dashboard-analytics.ts`  
**Permisos**: ADMIN_SISTEMA, ADMIN, ANALISTA, USUARIO

**Funcionalidades**:
- Dashboard principal con métricas y visualizaciones
- Gráficos interactivos (ECharts)
- Filtros avanzados (empresa, fecha, departamento, empleado, pilar)
- Exportación de datos en múltiples formatos
- Vista global (solo ADMIN_SISTEMA)
- Análisis de respuestas Likert
- Timeline de respuestas

**Funciones principales**:
- `loadAnalytics()`: Carga datos del dashboard
- `applyFilters()`: Aplica filtros de búsqueda
- `exportPdf()`: Exporta dashboard como PDF
- `exportCsv()`: Exporta respuestas como CSV
- `exportExcel()`: Exporta datos como Excel
- `generateReports()`: Genera múltiples formatos de reporte
- `openReportModal()`: Abre modal de generación de reportes
- `resetFilters()`: Restablece filtros

**Formatos de exportación**:
- PDF (jsPDF + html2canvas)
- Excel (exceljs)
- CSV
- JSON
- XML

**Componentes relacionados**:
- `LikertBucketsComponent`: Visualización de buckets Likert

---

#### 6. SurveyComponent (`/survey`)
**Ruta**: `/survey`  
**Archivo**: `src/app/survey/survey.ts`  
**Permisos**: ADMIN_SISTEMA, ADMIN, ANALISTA

**Funcionalidades**:
- Sistema de encuestas interactivo
- Navegación por pilares
- Formularios dinámicos según tipo de pregunta
- Guardado de respuestas
- Visualización de progreso
- Modo anónimo y no anónimo

**Funciones principales**:
- `beginSurvey()`: Inicia una encuesta
- `loadPillars()`: Carga pilares del cuestionario
- `loadPillarQuestions()`: Carga preguntas de un pilar
- `submitAnswers()`: Envía respuestas de un pilar
- `getProgress()`: Obtiene progreso de la encuesta
- `saveProgress()`: Guarda progreso parcial

**Tipos de preguntas soportadas**:
- LIKERT (escala 1-5)
- ABIERTA (texto libre)
- SI_NO (booleano)

---

#### 7. CompaniesComponent (`/admin/companies`)
**Ruta**: `/admin/companies`  
**Archivo**: `src/app/admin/companies/companies.ts`  
**Permisos**: ADMIN, ADMIN_SISTEMA

**Funcionalidades**:
- Gestión completa de empresas
- CRUD de empresas
- Gestión de departamentos por empresa
- Gestión de empleados por empresa
- Visualización de solicitudes de consultoría
- Búsqueda y filtrado

**Funciones principales**:
- `loadCompanies()`: Carga lista de empresas
- `createCompany()`: Crea nueva empresa
- `updateCompany()`: Actualiza empresa existente
- `deleteCompany()`: Elimina empresa
- `loadDepartments()`: Carga departamentos de una empresa
- `createDepartment()`: Crea departamento
- `deleteDepartment()`: Elimina departamento
- `loadEmployees()`: Carga empleados
- `createEmployee()`: Crea empleado
- `updateEmployee()`: Actualiza empleado
- `loadConsultingLeads()`: Carga solicitudes de consultoría
- `deleteConsultingLead()`: Elimina solicitud

---

#### 8. PillarsComponent (`/admin/pillars`)
**Ruta**: `/admin/pillars`  
**Archivo**: `src/app/admin/pillars/pillars.ts`  
**Permisos**: ADMIN, ADMIN_SISTEMA

**Funcionalidades**:
- Gestión de pilares de evaluación
- Crear, editar y eliminar pilares
- Asignar pesos a pilares
- Filtrar por empresa

**Funciones principales**:
- `loadPillars()`: Carga lista de pilares
- `createPillar()`: Crea nuevo pilar
- `updatePillar()`: Actualiza pilar
- `deletePillar()`: Elimina pilar (con opción de cascada)

---

#### 9. QuestionsComponent (`/admin/questions`)
**Ruta**: `/admin/questions`  
**Archivo**: `src/app/admin/questions/questions.ts`  
**Permisos**: ADMIN, ADMIN_SISTEMA

**Funcionalidades**:
- Gestión de preguntas
- Crear, editar y eliminar preguntas
- Asignar preguntas a pilares
- Configurar tipos de pregunta
- Definir preguntas obligatorias
- Asignar pesos
- Configurar respuestas esperadas

**Funciones principales**:
- `loadQuestions()`: Carga preguntas de un pilar
- `createQuestion()`: Crea nueva pregunta
- `updateQuestion()`: Actualiza pregunta
- `deleteQuestion()`: Elimina pregunta
- `filterByPillar()`: Filtra por pilar

---

#### 10. UsersComponent (`/admin/users`)
**Ruta**: `/admin/users`  
**Archivo**: `src/app/admin/users/users.ts`  
**Permisos**: ADMIN, ADMIN_SISTEMA

**Funcionalidades**:
- Gestión completa de usuarios
- Crear, editar y eliminar usuarios
- Asignar roles y empresas
- Restablecer contraseñas
- Gestionar solicitudes de cambio de contraseña
- Activar/desactivar usuarios
- Búsqueda y filtrado

**Funciones principales**:
- `loadUsers()`: Carga lista de usuarios
- `createUser()`: Crea nuevo usuario
- `updateUser()`: Actualiza usuario
- `deleteUser()`: Elimina usuario
- `resetPassword()`: Restablece contraseña
- `loadPasswordRequests()`: Carga solicitudes de cambio
- `resolvePasswordRequest()`: Resuelve solicitud
- `toggleUserStatus()`: Activa/desactiva usuario

---

#### 11. AuditAdminComponent (`/admin/auditoria`)
**Ruta**: `/admin/auditoria`  
**Archivo**: `src/app/admin/audit/audit-admin.ts`  
**Permisos**: ADMIN_SISTEMA

**Funcionalidades**:
- Visualización del registro de auditoría
- Filtros avanzados (fecha, usuario, acción, entidad)
- Exportación de registros
- Eliminación de registros individuales
- Vaciar registro completo (con respaldo)

**Funciones principales**:
- `loadAuditLogs()`: Carga registros de auditoría
- `applyFilters()`: Aplica filtros de búsqueda
- `exportAuditLogs()`: Exporta registros como CSV
- `deleteAuditEntry()`: Elimina registro individual
- `backupAndClear()`: Genera respaldo y vacía registro
- `clearAllLogs()`: Vacía todo el registro

---

### Componentes Compartidos

#### 12. ModalComponent
**Archivo**: `src/app/shared/ui/modal/modal.component.ts`

**Funcionalidades**:
- Modal reutilizable
- Control de apertura/cierre
- Soporte para contenido dinámico

#### 13. IconComponent
**Archivo**: `src/app/shared/ui/icon/icon.component.ts`

**Funcionalidades**:
- Componente de iconos
- Integración con Lucide Angular

#### 14. NotificationToastComponent
**Archivo**: `src/app/shared/ui/notification-toast/notification-toast.component.ts`

**Funcionalidades**:
- Notificaciones toast
- Sistema de notificaciones centralizado

#### 15. LikertBucketsComponent
**Archivo**: `src/app/admin/dashboard-analytics/likert-buckets/likert-buckets.component.ts`

**Funcionalidades**:
- Visualización de distribución Likert
- Gráficos de buckets por nivel

---

## Servicios del Frontend

### 1. AuthService
**Archivo**: `src/app/auth.service.ts`

**Funciones principales**:
- `login(email, password)`: Inicia sesión y obtiene token
- `logout()`: Cierra sesión
- `forgotPassword(email)`: Solicita recuperación de contraseña
- `ensureMe()`: Actualiza información del usuario actual
- `getToken()`: Obtiene token de autenticación
- `getRole()`: Obtiene rol del usuario
- `getEmpresaId()`: Obtiene ID de empresa del usuario
- `getUserName()`: Obtiene nombre del usuario
- `hasRole(roles)`: Verifica si el usuario tiene un rol específico
- `isLoggedIn()`: Verifica si hay sesión activa
- `getDefaultRoute()`: Obtiene ruta por defecto según rol

---

### 2. AnalyticsService
**Archivo**: `src/app/analytics.service.ts`

**Funciones principales**:
- `getDashboardAnalytics(params)`: Obtiene datos del dashboard
  - Parámetros: companyId, dateFrom, dateTo, departmentIds, employeeIds, pillarIds, includeTimeline
- `exportResponsesCsv(params)`: Exporta respuestas como CSV
  - Retorna: Observable<Blob>

---

### 3. SurveyService
**Archivo**: `src/app/survey.service.ts`

**Funciones principales**:
- `simpleBegin(empresaId, anonimo)`: Inicia encuesta en modo simple (crea asignación automáticamente)
- `begin(asignacionId, empleadoId?)`: Inicia encuesta con asignación existente
- `getProgress(asignacionId, empleadoId?)`: Obtiene progreso de la encuesta
- `getPillars(asignacionId)`: Obtiene pilares del cuestionario
- `getPillarQuestions(asignacionId, pilarId, empleadoId?)`: Obtiene preguntas de un pilar
- `submitAnswers(asignacionId, body, empleadoId?)`: Envía respuestas en bloque

---

### 4. CompanyService
**Archivo**: `src/app/company.service.ts`

**Funciones principales**:
- `getCompanies()`: Obtiene lista de empresas
- `createCompany(data)`: Crea nueva empresa
- `updateCompany(id, data)`: Actualiza empresa
- `deleteCompany(id)`: Elimina empresa
- `getDepartments(empresaId)`: Obtiene departamentos de una empresa
- `createDepartment(empresaId, data)`: Crea departamento
- `deleteDepartment(id)`: Elimina departamento
- `getEmployees(empresaId, filters?)`: Obtiene empleados
- `createEmployee(empresaId, data)`: Crea empleado
- `updateEmployee(id, data)`: Actualiza empleado
- `searchEmployees(query, empresaId?, limit?)`: Busca empleados

---

### 5. UserService
**Archivo**: `src/app/user.service.ts`

**Funciones principales**:
- `getUsers(empresaId?)`: Obtiene lista de usuarios
- `createUser(data)`: Crea nuevo usuario
- `updateUser(id, data)`: Actualiza usuario
- `deleteUser(id)`: Elimina usuario
- `resetPassword(userId, data)`: Restablece contraseña
- `getPasswordChangeRequests(includeResolved?)`: Obtiene solicitudes de cambio
- `clearPasswordRequests()`: Limpia solicitudes resueltas

---

### 6. PilarService
**Archivo**: `src/app/pillar.service.ts`

**Funciones principales**:
- `getPillars(empresaId?)`: Obtiene lista de pilares
- `createPillar(data)`: Crea nuevo pilar
- `updatePillar(id, data)`: Actualiza pilar
- `deletePillar(id, cascade?)`: Elimina pilar

---

### 7. QuestionService
**Archivo**: `src/app/question.service.ts`

**Funciones principales**:
- `getQuestions(pilarId)`: Obtiene preguntas de un pilar
- `createQuestion(data)`: Crea nueva pregunta
- `updateQuestion(id, data)`: Actualiza pregunta
- `deleteQuestion(id)`: Elimina pregunta

---

### 8. QuestionnairesService
**Archivo**: `src/app/questionnaires.service.ts`

**Funciones principales**:
- `getQuestionnaires(empresaId)`: Obtiene cuestionarios de una empresa
- `createQuestionnaire(data)`: Crea nuevo cuestionario
- `publishQuestionnaire(id)`: Publica un cuestionario

---

### 9. AssignmentsService
**Archivo**: `src/app/assignments.service.ts`

**Funciones principales**:
- `getAssignments(empresaId?)`: Obtiene asignaciones
- `getAssignment(id)`: Obtiene una asignación específica
- `createAssignment(data)`: Crea nueva asignación
- `getActiveAssignment(empresaId, createIfMissing?, anonimo?, ventanaDias?)`: Obtiene asignación activa

---

### 10. EmployeeService
**Archivo**: `src/app/employee.service.ts`

**Funciones principales**:
- `getEmployees(empresaId, filters?)`: Obtiene empleados
- `createEmployee(empresaId, data)`: Crea empleado
- `updateEmployee(id, data)`: Actualiza empleado
- `searchEmployees(query, empresaId?, limit?)`: Busca empleados

---

### 11. AuditService
**Archivo**: `src/app/services/audit.service.ts`

**Funciones principales**:
- `getAuditLogs(filters)`: Obtiene registros de auditoría
- `exportAuditLogs(filters)`: Exporta registros como CSV
- `deleteAuditEntry(id, password)`: Elimina registro individual
- `backupAndClearAuditLogs(password)`: Respalda y vacía registro
- `clearAllAuditLogs(password)`: Vacía todo el registro
- `logReportExport(reportType, notes?)`: Registra exportación de reporte

---

### 12. LeadService
**Archivo**: `src/app/core/services/lead.service.ts`

**Funciones principales**:
- `createLead(data)`: Crea solicitud de consultoría
- `getLeads(limit?, offset?)`: Obtiene solicitudes
- `deleteLead(id)`: Elimina solicitud
- `clearLeads()`: Limpia todas las solicitudes

---

### 13. NotificationCenterService
**Archivo**: `src/app/core/services/notification-center.service.ts`

**Funciones principales**:
- `showNotification(message, type?)`: Muestra notificación
- `showSuccess(message)`: Notificación de éxito
- `showError(message)`: Notificación de error
- `showWarning(message)`: Notificación de advertencia
- `showInfo(message)`: Notificación informativa

---

### 14. MeService
**Archivo**: `src/app/me.service.ts`

**Funciones principales**:
- `getMe()`: Obtiene información del usuario actual

---

### 15. InactivityService
**Archivo**: `src/app/inactivity.service.ts`

**Funciones principales**:
- Gestión de inactividad del usuario
- Cierre automático de sesión por inactividad

---

## Endpoints de la API (Backend)

### Autenticación

#### `POST /auth/login`
**Descripción**: Inicia sesión  
**Request**: `{ email: string, password: string }`  
**Response**: `{ access_token: string, token_type: string }`  
**Permisos**: Público

#### `GET /me`
**Descripción**: Obtiene información del usuario actual  
**Response**: `UsuarioRead`  
**Permisos**: Autenticado

#### `POST /auth/password/forgot`
**Descripción**: Solicita recuperación de contraseña  
**Request**: `{ email: string }`  
**Response**: `{ ok: boolean }`  
**Permisos**: Público

---

### Empresas

#### `GET /companies`
**Descripción**: Lista todas las empresas  
**Response**: `List[EmpresaRead]`  
**Permisos**: Autenticado

#### `POST /companies`
**Descripción**: Crea una nueva empresa  
**Request**: `EmpresaCreate`  
**Response**: `EmpresaRead`  
**Permisos**: ADMIN_SISTEMA

#### `PATCH /companies/{empresa_id}`
**Descripción**: Actualiza una empresa  
**Request**: `EmpresaUpdate`  
**Response**: `EmpresaRead`  
**Permisos**: ADMIN_SISTEMA

#### `DELETE /companies/{empresa_id}`
**Descripción**: Elimina una empresa  
**Response**: `204 No Content`  
**Permisos**: ADMIN_SISTEMA

---

### Departamentos

#### `GET /companies/{empresa_id}/departments`
**Descripción**: Lista departamentos de una empresa  
**Response**: `List[DepartamentoRead]`  
**Permisos**: Autenticado (acceso a empresa)

#### `POST /companies/{empresa_id}/departments`
**Descripción**: Crea un departamento  
**Request**: `DepartamentoCreate`  
**Response**: `DepartamentoRead`  
**Permisos**: Autenticado (acceso a empresa)

#### `DELETE /departments/{dep_id}`
**Descripción**: Elimina un departamento  
**Response**: `204 No Content`  
**Permisos**: Autenticado (acceso a empresa)

#### `GET /diagnostics/orphan-departments`
**Descripción**: Encuentra departamentos huérfanos  
**Response**: `{ count: int, departments: [...] }`  
**Permisos**: ADMIN_SISTEMA

#### `POST /diagnostics/cleanup-orphan-departments`
**Descripción**: Limpia departamentos huérfanos  
**Response**: `{ message: string, deleted_count: int }`  
**Permisos**: ADMIN_SISTEMA

---

### Empleados

#### `GET /companies/{empresa_id}/employees`
**Descripción**: Lista empleados de una empresa  
**Query Params**: `departamento_id?`, `search?`  
**Response**: `List[EmpleadoRead]`  
**Permisos**: Autenticado (acceso a empresa)

#### `GET /employees/search`
**Descripción**: Busca empleados  
**Query Params**: `query`, `empresa_id?`, `limit?`  
**Response**: `List[EmpleadoRead]`  
**Permisos**: Autenticado

#### `POST /companies/{empresa_id}/employees`
**Descripción**: Crea un empleado  
**Request**: `EmpleadoCreate`  
**Response**: `EmpleadoRead`  
**Permisos**: Autenticado (acceso a empresa)

#### `PATCH /employees/{empleado_id}`
**Descripción**: Actualiza un empleado  
**Request**: `EmpleadoUpdate`  
**Response**: `EmpleadoRead`  
**Permisos**: Autenticado (acceso a empresa)

---

### Usuarios

#### `GET /users`
**Descripción**: Lista usuarios  
**Query Params**: `empresa_id?`  
**Response**: `List[UsuarioRead]`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `POST /users`
**Descripción**: Crea un usuario  
**Request**: `UsuarioCreate`  
**Response**: `UsuarioRead`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `PATCH /users/{user_id}`
**Descripción**: Actualiza un usuario  
**Request**: `UsuarioUpdate`  
**Response**: `UsuarioRead`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `POST /users/{user_id}/password`
**Descripción**: Restablece contraseña de un usuario  
**Request**: `UsuarioPasswordReset`  
**Response**: `UsuarioRead`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `DELETE /users/{user_id}`
**Descripción**: Elimina un usuario  
**Response**: `204 No Content`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `GET /password-change-requests`
**Descripción**: Lista solicitudes de cambio de contraseña  
**Query Params**: `include_resolved?`  
**Response**: `List[PasswordChangeRequestRead]`  
**Permisos**: ADMIN_SISTEMA

#### `DELETE /password-change-requests`
**Descripción**: Limpia solicitudes de cambio de contraseña  
**Response**: `204 No Content`  
**Permisos**: ADMIN_SISTEMA

---

### Pilares

#### `GET /pillars`
**Descripción**: Lista pilares  
**Query Params**: `empresa_id?`  
**Response**: `List[PilarRead]`  
**Permisos**: Autenticado

#### `GET /companies/{empresa_id}/pillars`
**Descripción**: Lista pilares de una empresa  
**Response**: `List[PilarRead]`  
**Permisos**: Autenticado (acceso a empresa)

#### `POST /pillars`
**Descripción**: Crea un pilar  
**Request**: `PilarCreate`  
**Response**: `PilarRead`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `PATCH /pillars/{pilar_id}`
**Descripción**: Actualiza un pilar  
**Request**: `PilarUpdate`  
**Response**: `PilarRead`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `DELETE /pillars/{pilar_id}`
**Descripción**: Elimina un pilar  
**Query Params**: `cascade?`  
**Response**: `204 No Content`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

---

### Preguntas

#### `GET /questions`
**Descripción**: Lista preguntas de un pilar  
**Query Params**: `pilar_id`  
**Response**: `List[PreguntaRead]`  
**Permisos**: Autenticado (acceso a empresa del pilar)

#### `GET /pillars/{pilar_id}/questions`
**Descripción**: Lista preguntas de un pilar  
**Response**: `List[PreguntaRead]`  
**Permisos**: Autenticado (acceso a empresa del pilar)

#### `POST /questions`
**Descripción**: Crea una pregunta  
**Request**: `PreguntaCreate`  
**Response**: `PreguntaRead`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `PUT /questions/{pregunta_id}`
**Descripción**: Actualiza una pregunta  
**Request**: `PreguntaUpdate`  
**Response**: `PreguntaRead`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `DELETE /questions/{pregunta_id}`
**Descripción**: Elimina una pregunta  
**Response**: `204 No Content`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

---

### Cuestionarios

#### `POST /questionnaires`
**Descripción**: Crea un cuestionario  
**Request**: `CuestionarioCreate`  
**Response**: `CuestionarioRead`  
**Permisos**: Autenticado (acceso a empresa)

#### `GET /companies/{empresa_id}/questionnaires`
**Descripción**: Lista cuestionarios de una empresa  
**Response**: `List[CuestionarioRead]`  
**Permisos**: Autenticado (acceso a empresa)

#### `PATCH /questionnaires/{cuestionario_id}/publish`
**Descripción**: Publica un cuestionario  
**Response**: `CuestionarioRead`  
**Permisos**: Autenticado (acceso a empresa)

---

### Asignaciones

#### `POST /assignments`
**Descripción**: Crea una asignación  
**Request**: `AsignacionCreate`  
**Response**: `AsignacionRead`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `GET /assignments`
**Descripción**: Lista asignaciones  
**Query Params**: `empresa_id?`  
**Response**: `List[AsignacionRead]`  
**Permisos**: Autenticado

#### `GET /assignments/{asignacion_id}`
**Descripción**: Obtiene una asignación  
**Response**: `AsignacionRead`  
**Permisos**: Autenticado (acceso a asignación)

#### `GET /companies/{empresa_id}/assignments/active`
**Descripción**: Obtiene asignación activa de una empresa  
**Query Params**: `create_if_missing?`, `anonimo?`, `ventana_dias?`  
**Response**: `AsignacionRead | null`  
**Permisos**: Autenticado (acceso a empresa)

---

### Encuestas

#### `POST /survey/simple/begin`
**Descripción**: Inicia encuesta en modo simple (crea asignación automáticamente)  
**Request**: `{ empresa_id: int, anonimo?: bool }`  
**Response**: `{ asignacion_id: int }`  
**Permisos**: Autenticado (acceso a empresa)

#### `POST /survey/begin`
**Descripción**: Inicia encuesta con asignación existente  
**Request**: `{ asignacion_id: int, empleado_id?: int }`  
**Response**: `{ asignacion_id: int }`  
**Permisos**: Autenticado (acceso a asignación)

#### `GET /survey/{asignacion_id}/progress`
**Descripción**: Obtiene progreso de la encuesta  
**Query Params**: `empleado_id?`  
**Response**: `AssignmentProgress`  
**Permisos**: Autenticado (acceso a asignación)

#### `GET /survey/{asignacion_id}/pillars`
**Descripción**: Lista pilares del cuestionario  
**Response**: `List[PilarRead]`  
**Permisos**: Autenticado (acceso a asignación)

#### `GET /survey/{asignacion_id}/pillars/{pilar_id}`
**Descripción**: Obtiene preguntas de un pilar  
**Query Params**: `empleado_id?`  
**Response**: `PillarQuestionsResponse`  
**Permisos**: Autenticado (acceso a asignación)

#### `POST /survey/{asignacion_id}/answers`
**Descripción**: Envía respuestas en bloque  
**Request**: `BulkAnswersRequest`  
**Query Params**: `empleado_id?`  
**Response**: `BulkAnswersResponse`  
**Permisos**: Autenticado (acceso a asignación)

---

### Analytics

#### `GET /analytics/dashboard`
**Descripción**: Obtiene datos del dashboard  
**Query Params**: `empresa_id?`, `fecha_desde?`, `fecha_hasta?`, `departamento_ids?`, `empleado_ids?`, `pilar_ids?`, `include_timeline?`  
**Response**: `DashboardAnalyticsResponse`  
**Permisos**: Autenticado
- **Modo Global**: `empresa_id=null` solo para ADMIN_SISTEMA
- **Modo Normal**: `empresa_id` específico para todos los roles

#### `GET /analytics/responses/export`
**Descripción**: Exporta respuestas como CSV  
**Query Params**: `empresa_id`, `fecha_desde?`, `fecha_hasta?`, `departamento_ids?`, `empleado_ids?`, `pilar_ids?`  
**Response**: `StreamingResponse (CSV)`  
**Permisos**: Autenticado (acceso a empresa)

---

### Auditoría

#### `GET /audit`
**Descripción**: Lista registros de auditoría  
**Query Params**: `date_from?`, `date_to?`, `empresa_id?`, `user_id?`, `user_email?`, `user_role?`, `action?`, `entity_type?`, `search?`, `limit?`, `offset?`  
**Response**: `List[AuditLogRead]`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `GET /audit/export`
**Descripción**: Exporta registros de auditoría como CSV  
**Query Params**: Mismos que `/audit`  
**Response**: `StreamingResponse (CSV)`  
**Permisos**: ADMIN (solo su empresa), ADMIN_SISTEMA

#### `POST /audit/report-export`
**Descripción**: Registra exportación de reporte  
**Request**: `{ report_type: string, notes?: string }`  
**Response**: `204 No Content`  
**Permisos**: Autenticado

#### `DELETE /audit/{log_id}`
**Descripción**: Elimina un registro de auditoría  
**Request**: `{ password: string }`  
**Response**: `204 No Content`  
**Permisos**: ADMIN_SISTEMA

#### `POST /audit/backup-and-clear`
**Descripción**: Genera respaldo CSV y vacía el registro  
**Request**: `{ password: string }`  
**Response**: `StreamingResponse (CSV)`  
**Permisos**: ADMIN_SISTEMA

#### `DELETE /audit`
**Descripción**: Vacía todo el registro de auditoría  
**Request**: `{ password: string }`  
**Response**: `{ deleted_count: int }`  
**Permisos**: ADMIN_SISTEMA

---

### Solicitudes de Consultoría (Leads)

#### `POST /consulting-leads`
**Descripción**: Crea solicitud de consultoría (público)  
**Request**: `{ company: string, email: string }`  
**Response**: `LeadRead`  
**Permisos**: Público

#### `GET /consulting-leads`
**Descripción**: Lista solicitudes de consultoría  
**Query Params**: `limit?`, `offset?`  
**Response**: `List[LeadRead]`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `DELETE /consulting-leads/{lead_id}`
**Descripción**: Elimina una solicitud  
**Response**: `204 No Content`  
**Permisos**: ADMIN, ADMIN_SISTEMA

#### `DELETE /consulting-leads`
**Descripción**: Limpia todas las solicitudes  
**Response**: `204 No Content`  
**Permisos**: ADMIN, ADMIN_SISTEMA

---

### Utilidades y Diagnósticos

#### `GET /`
**Descripción**: Información básica de la API  
**Response**: `{ message: string, version: string, status: string }`  
**Permisos**: Público

#### `GET /ping`
**Descripción**: Health check  
**Response**: `{ message: "pong" }`  
**Permisos**: Público

#### `GET /_routes`
**Descripción**: Lista todas las rutas disponibles  
**Response**: `List[string]`  
**Permisos**: Público

#### `GET /__whoami`
**Descripción**: Información de debug del servidor  
**Response**: `{ file: string, cwd: string, app_id: int, loaded_at: string, routes: List[string] }`  
**Permisos**: Público

#### `POST /dev/seed-admin`
**Descripción**: Crea usuario admin por defecto (solo desarrollo)  
**Response**: `{ ok: bool, admin_id?: int, msg?: string }`  
**Permisos**: Público (solo desarrollo)

#### `POST /dev/seed-demo-survey`
**Descripción**: Crea datos de demostración (solo desarrollo)  
**Response**: `{ ok: bool, empresa_id: int, pilar_id: int, cuestionario_id: int, asignacion_id: int }`  
**Permisos**: ADMIN_SISTEMA

#### `POST /crear_usuario_simple`
**Descripción**: Crea usuario simple (solo pruebas)  
**Request**: `nombre: string, email: string, password: string, rol?: string`  
**Response**: `{ mensaje: string, id: int, email: string, rol: RolEnum }`  
**Permisos**: Público (solo pruebas)

---

## Guards y Middleware

### Frontend Guards

#### 1. AuthGuard
**Archivo**: `src/app/auth.guard.ts`

**Funcionalidad**: Protege rutas que requieren autenticación  
**Uso**: `canActivate: [authGuard]`

#### 2. RoleGuard
**Archivo**: `src/app/role.guard.ts`

**Funcionalidad**: Protege rutas según roles específicos  
**Uso**: `canActivate: [roleGuard(['ADMIN', 'ADMIN_SISTEMA'])]`

#### 3. AdminSistemaGuard
**Archivo**: `src/app/admin-sistema.guard.ts`

**Funcionalidad**: Protege rutas solo para ADMIN_SISTEMA  
**Uso**: `canActivate: [adminSistemaGuard]`

---

### Interceptors

#### 1. AuthInterceptor
**Archivo**: `src/app/auth.interceptor.ts`

**Funcionalidad**: Agrega token de autenticación a todas las peticiones HTTP

#### 2. TokenInterceptor
**Archivo**: `src/app/token.interceptor.ts`

**Funcionalidad**: Maneja tokens y renovación de sesión

---

## Funciones de Utilidad

### Backend (app/crud.py)

#### Funciones de Empresas
- `list_empresas(db)`: Lista todas las empresas
- `create_empresa(db, nombre, rut, giro, departamentos)`: Crea empresa
- `update_empresa(db, empresa_id, nombre, rut, giro, departamentos)`: Actualiza empresa
- `delete_empresa(db, empresa_id)`: Elimina empresa
- `get_empresa(db, empresa_id)`: Obtiene una empresa

#### Funciones de Departamentos
- `list_departamentos_by_empresa(db, empresa_id)`: Lista departamentos
- `create_departamento(db, empresa_id, nombre)`: Crea departamento
- `delete_departamento(db, dep_id)`: Elimina departamento
- `find_orphan_departments(db)`: Encuentra departamentos huérfanos
- `cleanup_orphan_departments(db)`: Limpia departamentos huérfanos

#### Funciones de Empleados
- `list_empleados(db, empresa_id, departamento_id?, search?, limit?)`: Lista empleados
- `create_empleado(db, empresa_id, nombre, apellidos, rut, email, cargo, departamento_id?)`: Crea empleado
- `update_empleado(db, empleado_id, ...)`: Actualiza empleado

#### Funciones de Usuarios
- `list_usuarios(db, empresa_id?)`: Lista usuarios
- `create_usuario(db, nombre, email, password, rol, empresa_id?)`: Crea usuario
- `update_usuario(db, user_id, ...)`: Actualiza usuario
- `delete_usuario(db, user_id)`: Elimina usuario
- `get_user_by_email(db, email)`: Obtiene usuario por email
- `set_password(db, user_id, new_password)`: Cambia contraseña
- `create_password_change_request(db, user)`: Crea solicitud de cambio
- `get_password_change_request(db, request_id)`: Obtiene solicitud
- `resolve_password_change_request(db, request_id, user_id, resolved_by_id)`: Resuelve solicitud
- `list_password_change_requests(db, include_resolved?)`: Lista solicitudes
- `clear_password_change_requests(db)`: Limpia solicitudes

#### Funciones de Pilares
- `list_pilares(db, empresa_id?)`: Lista pilares
- `create_pilar(db, empresa_id, nombre, descripcion, peso)`: Crea pilar
- `update_pilar(db, pilar_id, nombre?, descripcion?, peso?)`: Actualiza pilar
- `delete_pilar(db, pilar_id, cascade?)`: Elimina pilar

#### Funciones de Preguntas
- `list_preguntas(db, pilar_id)`: Lista preguntas
- `create_pregunta(db, pilar_id, enunciado, tipo, es_obligatoria, peso, respuesta_esperada?)`: Crea pregunta
- `update_pregunta(db, pregunta_id, ...)`: Actualiza pregunta
- `delete_pregunta(db, pregunta_id)`: Elimina pregunta

#### Funciones de Cuestionarios
- `create_cuestionario(db, empresa_id, titulo, version, estado, preguntas_ids)`: Crea cuestionario
- `list_cuestionarios(db, empresa_id)`: Lista cuestionarios

#### Funciones de Asignaciones
- `create_asignacion(db, empresa_id, cuestionario_id, alcance_tipo, alcance_id, fecha_inicio, fecha_cierre, anonimo)`: Crea asignación
- `list_asignaciones(db, empresa_id?)`: Lista asignaciones
- `get_asignacion(db, asignacion_id)`: Obtiene asignación
- `get_active_asignacion_for_empresa(db, empresa_id)`: Obtiene asignación activa
- `get_or_create_active_asignacion(db, empresa_id, ventana_dias?, anonimo?)`: Obtiene o crea asignación activa
- `get_or_create_auto_asignacion(db, empresa_id, anonimo?)`: Crea automáticamente cuestionario y asignación
- `is_assignment_active(asg, now)`: Verifica si asignación está activa
- `compute_assignment_progress(db, asignacion_id, empleado_id?)`: Calcula progreso

#### Funciones de Encuestas
- `list_pilares_por_asignacion(db, asignacion_id)`: Lista pilares de una asignación
- `get_pilar_questions_with_answers(db, asignacion_id, pilar_id, empleado_id?)`: Obtiene preguntas con respuestas
- `submit_bulk_answers(db, asignacion_id, respuestas, empleado_id?)`: Envía respuestas en bloque

#### Funciones de Analytics
- `compute_dashboard_analytics(db, empresa_id?, fecha_desde?, fecha_hasta?, departamento_ids?, empleado_ids?, pilar_ids?, include_timeline?)`: Calcula métricas del dashboard
- `list_responses_for_export(db, empresa_id, ...)`: Lista respuestas para exportar

#### Funciones de Auditoría
- `audit_log(db, action, current_user, empresa_id?, entity_type?, entity_id?, notes?, diff_before?, diff_after?, extra?, request?)`: Registra acción en auditoría
- `list_audit_logs(db, date_from?, date_to?, empresa_id?, user_id?, user_email?, user_role?, action?, entity_type?, search?, scope_empresa_id?, limit?, offset?)`: Lista registros
- `export_audit_logs(db, ...)`: Exporta registros
- `delete_audit_log(db, log_id)`: Elimina registro
- `clear_all_audit_logs(db, scope_empresa_id?)`: Vacía registro

#### Funciones de Leads
- `create_consulting_lead(db, company, email)`: Crea solicitud de consultoría
- `list_consulting_leads(db, limit?, offset?)`: Lista solicitudes
- `delete_consulting_lead(db, lead_id)`: Elimina solicitud
- `clear_consulting_leads(db)`: Limpia todas las solicitudes

---

### Frontend Utilidades

#### Tipos y Enums
**Archivo**: `src/app/types.ts`

- `RolEnum`: ADMIN_SISTEMA, ADMIN, ANALISTA, USUARIO
- `TipoPreguntaEnum`: LIKERT, ABIERTA, SI_NO
- Interfaces para todas las entidades del sistema

#### Configuración
**Archivo**: `src/app/app.config.ts`

- Configuración de la aplicación Angular
- Providers globales
- Interceptors HTTP

---

## Modelos de Datos

### Entidades Principales

1. **Usuario**: Usuarios del sistema con roles y permisos
2. **Empresa**: Organizaciones que utilizan la plataforma
3. **Departamento**: Departamentos dentro de una empresa
4. **Empleado**: Empleados de las empresas
5. **Pilar**: Categorías de evaluación (Infraestructura, Big Data, BI, IA)
6. **Pregunta**: Preguntas individuales dentro de un pilar
7. **Cuestionario**: Conjunto de preguntas agrupadas
8. **Asignacion**: Vinculación de cuestionario a empresa/departamento/empleado
9. **Respuesta**: Respuestas de los usuarios a las preguntas
10. **AuditLog**: Registro de auditoría de acciones
11. **ConsultingLead**: Solicitudes de consultoría desde la página pública
12. **PasswordChangeRequest**: Solicitudes de cambio de contraseña

---

## Resumen de Permisos por Rol

### ADMIN_SISTEMA
- Acceso completo a todas las funcionalidades
- Gestión de todas las empresas
- Acceso al registro de auditoría completo
- Vista global del dashboard
- Gestión de solicitudes de cambio de contraseña

### ADMIN
- Gestión de su empresa asignada
- Crear usuarios ANALISTA y USUARIO
- Gestión de pilares, preguntas y cuestionarios de su empresa
- Ver dashboard de su empresa
- Ver auditoría de su empresa

### ANALISTA
- Ver datos de su empresa
- Responder encuestas
- Ver resultados y analytics

### USUARIO
- Ver resultados y analytics de su empresa
- Acceso limitado a visualización

---

## Tecnologías Utilizadas

### Frontend
- **Angular 20**: Framework principal
- **TypeScript**: Lenguaje de programación
- **TailwindCSS**: Estilos
- **ECharts**: Gráficos y visualizaciones
- **jsPDF**: Generación de PDFs
- **html2canvas**: Captura de elementos HTML
- **exceljs**: Generación de archivos Excel
- **RxJS**: Programación reactiva

### Backend
- **FastAPI**: Framework web
- **Python 3**: Lenguaje de programación
- **SQLAlchemy**: ORM
- **Alembic**: Migraciones de base de datos
- **PostgreSQL/MySQL**: Base de datos
- **Pydantic**: Validación de datos
- **JWT**: Autenticación

---

**Última actualización**: 2025

*TacticSphere - Documentación Técnica Completa*


