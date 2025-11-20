# Diagramas del Sistema - TacticSphere

**Versión:** 1.0 FINAL  
**Fecha:** 19-01-2025

---

## Tabla de Contenidos

1. [Diagrama de Clases](#diagrama-de-clases)
2. [Diagrama Entidad-Relación (Base de Datos)](#diagrama-entidad-relación-base-de-datos)
3. [ERD Unificado (OLTP + Reporting) - Vista Híbrida](#erd-unificado-oltp--reporting---vista-híbrida)

---

## Diagrama de Clases

### Descripción General

El diagrama de clases representa la estructura de objetos del sistema, incluyendo modelos de dominio (entidades de base de datos), esquemas de validación (Pydantic), y enums. Este diagrama muestra las relaciones entre las clases y sus atributos principales.

### Clases Principales

#### Enums

```
┌─────────────────────┐
│     RolEnum          │
├─────────────────────┤
│ ADMIN_SISTEMA        │
│ ADMIN                │
│ ANALISTA             │
│ USUARIO              │
└─────────────────────┘

┌─────────────────────┐
│ TipoPreguntaEnum     │
├─────────────────────┤
│ LIKERT               │
│ ABIERTA              │
│ SI_NO                │
└─────────────────────┘

┌─────────────────────┐
│   SemaforoEnum       │
├─────────────────────┤
│ ROJO                 │
│ AMARILLO             │
│ VERDE                │
└─────────────────────┘

┌─────────────────────┐
│  AuditActionEnum     │
├─────────────────────┤
│ LOGIN                │
│ LOGOUT               │
│ USER_CREATE          │
│ USER_UPDATE          │
│ ... (más acciones)   │
└─────────────────────┘
```

#### Modelos de Dominio (SQLAlchemy)

```
┌─────────────────────────────────────────┐
│            Usuario                      │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + nombre: str                           │
│ + email: str (unique)                   │
│ + password_hash: str                     │
│ + activo: bool                          │
│ + rol: RolEnum                          │
│ + empresa_id: Optional[int]              │
├─────────────────────────────────────────┤
│ + empresa: Empresa                      │
│ + password_change_requests: List        │
│ + audit_logs: List                      │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│            Empresa                      │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + nombre: str (unique)                  │
│ + rut: Optional[str]                     │
│ + giro: Optional[str]                    │
│ + activa: bool                          │
├─────────────────────────────────────────┤
│ + usuarios: List[Usuario]                │
│ + departamentos: List[Departamento]      │
│ + empleados: List[Empleado]             │
│ + pilares: List[Pilar]                   │
│ + cuestionarios: List[Cuestionario]      │
│ + asignaciones: List[Asignacion]        │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│         Departamento                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + nombre: str                           │
│ + empresa_id: int                       │
├─────────────────────────────────────────┤
│ + empresa: Empresa                      │
│ + empleados: List[Empleado]             │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│            Empleado                     │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + nombre: str                           │
│ + apellidos: Optional[str]               │
│ + rut: Optional[str]                    │
│ + email: Optional[str]                  │
│ + cargo: Optional[str]                  │
│ + empresa_id: int                       │
│ + departamento_id: Optional[int]        │
├─────────────────────────────────────────┤
│ + empresa: Empresa                      │
│ + departamento: Optional[Departamento]  │
│ + respuestas: List[Respuesta]           │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│            Pilar                        │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + empresa_id: Optional[int]              │
│ + nombre: str (unique)                  │
│ + descripcion: Optional[str]             │
│ + peso: int                             │
├─────────────────────────────────────────┤
│ + empresa: Optional[Empresa]            │
│ + preguntas: List[Pregunta]              │
│ + umbral: Optional[UmbralPilar]         │
│ + recomendaciones: List[Recomendacion]  │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│           Pregunta                     │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + pilar_id: int                         │
│ + enunciado: str                        │
│ + tipo: TipoPreguntaEnum                │
│ + es_obligatoria: bool                  │
│ + peso: int                             │
│ + respuesta_esperada: Optional[str]      │
├─────────────────────────────────────────┤
│ + pilar: Pilar                          │
│ + respuestas: List[Respuesta]           │
└─────────────────────────────────────────┘
                    │
                    │ *
                    │
                    │ 1
┌─────────────────────────────────────────┐
│         Cuestionario                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + empresa_id: int                       │
│ + titulo: str                           │
│ + version: int                          │
│ + estado: str                           │
├─────────────────────────────────────────┤
│ + empresa: Empresa                      │
│ + preguntas_assoc: List[CuestionarioPregunta] │
│ + preguntas: List[Pregunta] (property)  │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│    CuestionarioPregunta                │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + cuestionario_id: int                   │
│ + pregunta_id: int                      │
│ + orden: Optional[int]                  │
├─────────────────────────────────────────┤
│ + cuestionario: Cuestionario            │
│ + pregunta: Pregunta                    │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│          Asignacion                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + empresa_id: int                       │
│ + cuestionario_id: int                  │
│ + alcance_tipo: str                     │
│ + alcance_id: Optional[int]             │
│ + fecha_inicio: datetime                │
│ + fecha_cierre: datetime                │
│ + anonimo: bool                         │
├─────────────────────────────────────────┤
│ + empresa: Empresa                      │
│ + cuestionario: Cuestionario            │
│ + respuestas: List[Respuesta]           │
│ + preguntas_asignadas: List[Pregunta]   │
└─────────────────────────────────────────┘
                    │
                    │ 1
                    │
                    │ *
┌─────────────────────────────────────────┐
│           Respuesta                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + asignacion_id: int                    │
│ + pregunta_id: int                      │
│ + empleado_id: Optional[int]            │
│ + valor: Optional[str]                  │
│ + fecha_respuesta: datetime             │
├─────────────────────────────────────────┤
│ + asignacion: Asignacion                │
│ + pregunta: Pregunta                    │
│ + empleado: Optional[Empleado]          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         UmbralPilar                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + pilar_id: int (unique)                │
│ + umbral_amarillo: int                  │
│ + umbral_verde: int                     │
├─────────────────────────────────────────┤
│ + pilar: Pilar                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│        Recomendacion                   │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + pilar_id: int                         │
│ + categoria: SemaforoEnum               │
│ + texto: str                            │
├─────────────────────────────────────────┤
│ + pilar: Pilar                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    PasswordChangeRequest                │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + user_id: int                          │
│ + user_email: str                       │
│ + user_nombre: str                      │
│ + empresa_id: Optional[int]             │
│ + resolved: bool                        │
│ + created_at: datetime                  │
│ + resolved_at: Optional[datetime]       │
│ + resolved_by_id: Optional[int]         │
├─────────────────────────────────────────┤
│ + user: Usuario                         │
│ + resolved_by: Optional[Usuario]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          AuditLog                      │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + created_at: datetime                  │
│ + user_id: Optional[int]                │
│ + user_email: Optional[str]             │
│ + user_role: Optional[str]              │
│ + empresa_id: Optional[int]             │
│ + action: AuditActionEnum               │
│ + entity_type: Optional[str]            │
│ + entity_id: Optional[int]              │
│ + notes: Optional[str]                  │
│ + ip: Optional[str]                     │
│ + user_agent: Optional[str]              │
│ + path: Optional[str]                   │
│ + method: Optional[str]                 │
│ + diff_before: Optional[dict] (JSON)    │
│ + diff_after: Optional[dict] (JSON)     │
│ + extra: Optional[dict] (JSON)          │
├─────────────────────────────────────────┤
│ + user: Optional[Usuario]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      ConsultingLead                    │
├─────────────────────────────────────────┤
│ + id: int                               │
│ + company: str                          │
│ + email: str                            │
│ + created_at: datetime                  │
└─────────────────────────────────────────┘
```

### Esquemas Pydantic (Validación)

Los esquemas Pydantic se organizan en categorías:

#### Autenticación
- `LoginRequest`
- `TokenResponse`
- `PasswordForgotRequest`
- `PasswordForgotResponse`

#### Usuarios
- `UsuarioCreate`
- `UsuarioUpdate`
- `UsuarioRead`
- `UsuarioPasswordReset`
- `PasswordChangeRequestRead`

#### Empresas y Estructura
- `EmpresaCreate`
- `EmpresaRead`
- `DepartamentoCreate`
- `DepartamentoRead`
- `EmpleadoCreate`
- `EmpleadoUpdate`
- `EmpleadoRead`

#### Pilares y Preguntas
- `PilarCreate`
- `PilarRead`
- `PreguntaCreate`
- `PreguntaUpdate`
- `PreguntaRead`

#### Cuestionarios y Asignaciones
- `CuestionarioCreate`
- `CuestionarioRead`
- `AsignacionCreate`
- `AsignacionRead`

#### Encuestas
- `SurveyBeginRequest`
- `SurveyBeginResponse`
- `SurveyQuestionRead`
- `PillarQuestionsResponse`
- `LikertLevel`
- `BulkAnswersRequest`
- `BulkAnswersResponse`
- `AssignmentProgress`
- `PillarProgress`

#### Analytics
- `DashboardAnalyticsResponse`
- `AnalyticsKpis`
- `PillarDistribution`
- `HeatmapRow`
- `TimelinePoint`
- `RankingEntry`
- `EmployeePoint`
- `DistributionByDepartment`
- `CoverageByDepartmentEntry`
- `AnalyticsFilters`

#### Auditoría
- `AuditLogRead`
- `AuditDeleteRequest`
- `ReportExportRequest`

---

## Diagrama Entidad-Relación (Base de Datos)

### Descripción

El diagrama ER muestra las relaciones entre las tablas de la base de datos, incluyendo claves primarias, claves foráneas, restricciones de unicidad e índices.

### Relaciones Principales

```
┌─────────────────┐
│    usuarios      │
├─────────────────┤
│ PK id            │
│    nombre        │
│    email (UQ)    │
│    password_hash  │
│    activo        │
│    rol (enum)    │
│ FK empresa_id    │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│    empresas     │  │
├─────────────────┤  │
│ PK id            │◄─┘
│    nombre (UQ)   │
│    rut           │
│    giro          │
│    activa        │
└─────────────────┘
       │
       │ 1
       │
       │ *
┌─────────────────┐
│  departamentos  │
├─────────────────┤
│ PK id            │
│    nombre        │
│ FK empresa_id    │──┐
│ UQ (empresa_id,  │  │
│     nombre)      │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │
│   empleados     │  │
├─────────────────┤  │
│ PK id            │  │
│    nombre        │  │
│    apellidos     │  │
│    rut (IDX)     │  │
│    email (IDX)   │  │
│    cargo         │  │
│ FK empresa_id    │──┘
│ FK departamento_id│──┐
└─────────────────┘  │  │
                     │  │
┌─────────────────┐  │  │
│   pilares       │  │  │
├─────────────────┤  │  │
│ PK id            │  │  │
│ FK empresa_id    │──┘  │
│    nombre (UQ)   │      │
│    descripcion   │      │
│    peso          │      │
└─────────────────┘      │
       │                  │
       │ 1                │
       │                  │
       │ *                │
┌─────────────────┐      │
│   preguntas     │      │
├─────────────────┤      │
│ PK id            │      │
│ FK pilar_id      │──┐   │
│    enunciado     │  │   │
│    tipo (enum)   │  │   │
│    es_obligatoria│  │   │
│    peso          │  │   │
│    respuesta_    │  │   │
│    esperada      │  │   │
└─────────────────┘  │   │
       │             │   │
       │ *           │   │
       │             │   │
       │ 1           │   │
┌─────────────────┐  │   │
│ cuestionario_   │  │   │
│ pregunta        │  │   │
├─────────────────┤  │   │
│ PK id            │  │   │
│ FK cuestionario_│  │   │
│    id            │──┘   │
│ FK pregunta_id   │──┐   │
│    orden         │  │   │
│ UQ (cuestionario_│  │   │
│     id, pregunta_│  │   │
│     id)          │  │   │
└─────────────────┘  │   │
                     │   │
┌─────────────────┐  │   │
│ cuestionarios   │  │   │
├─────────────────┤  │   │
│ PK id            │  │   │
│ FK empresa_id    │──┘   │
│    titulo        │      │
│    version       │      │
│    estado        │      │
└─────────────────┘      │
       │                  │
       │ 1                │
       │                  │
       │ *                │
┌─────────────────┐      │
│  asignaciones   │      │
├─────────────────┤      │
│ PK id            │      │
│ FK empresa_id    │──┐   │
│ FK cuestionario_ │  │   │
│    id            │──┘   │
│    alcance_tipo  │      │
│    alcance_id    │      │
│    fecha_inicio  │      │
│    fecha_cierre  │      │
│    anonimo       │      │
│ IDX (empresa_id, │      │
│      fecha_inicio,│     │
│      fecha_cierre)│     │
│ IDX (empresa_id, │      │
│      alcance_tipo,│     │
│      alcance_id) │      │
└─────────────────┘      │
       │                  │
       │ 1                │
       │                  │
       │ *                │
┌─────────────────┐      │
│   respuestas   │      │
├─────────────────┤      │
│ PK id            │      │
│ FK asignacion_id│──┐   │
│ FK pregunta_id   │──┘   │
│ FK empleado_id   │──┐   │
│    valor         │  │   │
│    fecha_respuesta│ │   │
│ UQ (asignacion_id,│ │   │
│     pregunta_id,  │ │   │
│     empleado_id)  │ │   │
│ IDX (asignacion_  │ │   │
│      id, pregunta_│ │   │
│      id)          │ │   │
└─────────────────┘  │   │
                     │   │
                     │   │
┌─────────────────┐  │   │
│  umbral_pilar   │  │   │
├─────────────────┤  │   │
│ PK id            │  │   │
│ FK pilar_id (UQ)│──┘   │
│    umbral_      │      │
│    amarillo     │      │
│    umbral_verde │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│ recomendaciones │      │
├─────────────────┤      │
│ PK id            │      │
│ FK pilar_id      │──┐   │
│    categoria     │  │   │
│    (enum)        │  │   │
│    texto         │  │   │
└─────────────────┘  │   │
                     │   │
┌─────────────────┐  │   │
│ password_change_│  │   │
│ requests        │  │   │
├─────────────────┤  │   │
│ PK id            │  │   │
│ FK user_id       │──┘   │
│    user_email    │      │
│    user_nombre   │      │
│    empresa_id    │      │
│    resolved      │      │
│    created_at    │      │
│    resolved_at   │      │
│ FK resolved_by_id│──┐   │
└─────────────────┘  │   │
                     │   │
┌─────────────────┐  │   │
│   audit_logs   │  │   │
├─────────────────┤  │   │
│ PK id            │  │   │
│    created_at    │  │   │
│ FK user_id       │──┘   │
│    user_email    │      │
│    user_role     │      │
│    empresa_id    │      │
│    action (enum) │      │
│    entity_type   │      │
│    entity_id     │      │
│    notes         │      │
│    ip            │      │
│    user_agent    │      │
│    path          │      │
│    method        │      │
│    diff_before   │      │
│    (JSON)        │      │
│    diff_after    │      │
│    (JSON)        │      │
│    extra (JSON)  │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│ consulting_leads│      │
├─────────────────┤      │
│ PK id            │      │
│    company       │      │
│    email (IDX)   │      │
│    created_at    │      │
└─────────────────┘      │
```

### Notas sobre Relaciones

1. **Empresa → Usuarios**: Relación 1:N. Un usuario puede pertenecer a una empresa o no tener empresa (ADMIN_SISTEMA).

2. **Empresa → Departamentos**: Relación 1:N con restricción de unicidad en (empresa_id, nombre).

3. **Empresa → Empleados**: Relación 1:N. Los empleados pertenecen a una empresa.

4. **Departamento → Empleados**: Relación 1:N opcional. Un empleado puede no tener departamento.

5. **Empresa → Pilares**: Relación 1:N opcional. Los pilares pueden ser globales (empresa_id = NULL) o específicos de empresa.

6. **Pilar → Preguntas**: Relación 1:N. Cada pregunta pertenece a un pilar.

7. **Cuestionario ↔ Preguntas**: Relación N:M a través de la tabla intermedia `cuestionario_pregunta` con campo `orden`.

8. **Empresa → Cuestionarios**: Relación 1:N. Cada cuestionario pertenece a una empresa.

9. **Cuestionario → Asignaciones**: Relación 1:N. Una asignación vincula un cuestionario a un alcance.

10. **Asignación → Respuestas**: Relación 1:N. Cada respuesta pertenece a una asignación.

11. **Pregunta → Respuestas**: Relación 1:N. Cada respuesta corresponde a una pregunta.

12. **Empleado → Respuestas**: Relación 1:N opcional. En encuestas anónimas, `empleado_id` puede ser NULL.

13. **Pilar → UmbralPilar**: Relación 1:1. Cada pilar puede tener un umbral configurado.

14. **Pilar → Recomendaciones**: Relación 1:N. Un pilar puede tener múltiples recomendaciones por categoría (ROJO, AMARILLO, VERDE).

15. **Usuario → PasswordChangeRequest**: Relación 1:N. Un usuario puede tener múltiples solicitudes de cambio de contraseña.

16. **Usuario → AuditLog**: Relación 1:N. Un usuario puede generar múltiples registros de auditoría.

### Restricciones de Integridad

- **Cascadas de eliminación**:
  - Al eliminar una empresa, se eliminan sus departamentos, empleados, cuestionarios y asignaciones.
  - Al eliminar un pilar, se eliminan sus preguntas, umbral y recomendaciones.
  - Al eliminar una pregunta, se eliminan sus respuestas y asociaciones en cuestionarios.
  - Al eliminar una asignación, se eliminan sus respuestas.
  - Al eliminar un usuario, se eliminan sus solicitudes de cambio de contraseña.

- **Restricciones de unicidad**:
  - `usuarios.email`: Único en toda la tabla.
  - `empresas.nombre`: Único en toda la tabla.
  - `pilares.nombre`: Único en toda la tabla.
  - `departamentos(empresa_id, nombre)`: Único por empresa.
  - `cuestionario_pregunta(cuestionario_id, pregunta_id)`: Único por cuestionario.
  - `respuestas(asignacion_id, pregunta_id, empleado_id)`: Único por asignación, pregunta y empleado.
  - `umbral_pilar.pilar_id`: Único (1:1 con pilar).

- **Índices**:
  - Índices en claves foráneas para optimizar joins.
  - Índices en campos de búsqueda frecuente (email, rut, created_at).
  - Índices compuestos para consultas de rango de fechas y alcances.

---

## ERD Unificado (OLTP + Reporting) - Vista Híbrida

### Descripción

Este diagrama muestra una vista unificada que combina las tablas transaccionales (OLTP) con vistas y estructuras optimizadas para reporting y analíticas. Incluye:

1. **Tablas OLTP**: Estructura normalizada para operaciones transaccionales.
2. **Vistas Materializadas / Agregaciones**: Para reporting eficiente.
3. **Campos Calculados**: Para métricas y KPIs.
4. **Índices de Reporting**: Optimizados para consultas analíticas.

### Vista Unificada

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA OLTP (Transaccional)                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   usuarios   │      │   empresas   │      │ departamentos│
│              │      │              │      │              │
│ [PK] id      │      │ [PK] id      │      │ [PK] id      │
│      nombre  │      │      nombre  │      │      nombre  │
│      email   │      │      rut     │      │ [FK] empresa_│
│      rol     │      │      giro    │      │      id      │
│ [FK] empresa_│──────│      activa  │      │              │
│      id      │      │              │      └──────────────┘
│      activo  │      └──────────────┘              │
└──────────────┘              │                     │
                               │                     │
                               │ 1                   │ *
                               │                     │
                               │ *                   │ 1
                    ┌──────────────┐      ┌──────────────┐
                    │  empleados   │      │   pilares    │
                    │              │      │              │
                    │ [PK] id      │      │ [PK] id      │
                    │      nombre  │      │ [FK] empresa_│
                    │      rut     │      │      id      │
                    │      email   │      │      nombre  │
                    │ [FK] empresa_│      │      peso    │
                    │      id      │      │              │
                    │ [FK] depto_id│      └──────────────┘
                    └──────────────┘              │
                           │                      │
                           │ *                    │ 1
                           │                      │
                           │ 1                    │ *
                    ┌──────────────┐      ┌──────────────┐
                    │  respuestas  │      │  preguntas   │
                    │              │      │              │
                    │ [PK] id      │      │ [PK] id      │
                    │ [FK] asign_  │      │ [FK] pilar_id│
                    │      id      │      │      tipo    │
                    │ [FK] pregunta│──────│      peso    │
                    │      _id     │      │      es_     │
                    │ [FK] empleado│      │      obligat. │
                    │      _id     │      │              │
                    │      valor   │      └──────────────┘
                    │      fecha   │              │
                    └──────────────┘              │
                           │                      │
                           │ *                    │ 1
                           │                      │
                           │ 1                    │ *
                    ┌──────────────┐      ┌──────────────┐
                    │ asignaciones │      │ cuestionarios│
                    │              │      │              │
                    │ [PK] id      │      │ [PK] id      │
                    │ [FK] empresa_│      │ [FK] empresa_│
                    │      id      │      │      id      │
                    │ [FK] cuestion│──────│      version │
                    │      _id     │      │      estado  │
                    │      alcance │      │              │
                    │      _tipo   │      └──────────────┘
                    │      fecha_  │
                    │      inicio  │
                    │      fecha_  │
                    │      cierre  │
                    └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CAPA DE REPORTING (Analíticas)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: respuestas_analytics (Vista Materializada)              │
├─────────────────────────────────────────────────────────────────┤
│  Campos Calculados:                                              │
│  - respuesta_numerica: int (conversión de Likert)               │
│  - respuesta_porcentaje: float (normalizado 0-100)               │
│  - nivel_madurez: int (1-5)                                     │
│  - semaforo: enum (ROJO/AMARILLO/VERDE)                         │
│  - fecha_respuesta_date: date (para agrupaciones)               │
│  - mes_respuesta: int                                           │
│  - año_respuesta: int                                           │
│                                                                 │
│  Joins Incluidos:                                               │
│  - empresa_id, empresa_nombre                                  │
│  - departamento_id, departamento_nombre                        │
│  - empleado_id, empleado_nombre                                │
│  - pilar_id, pilar_nombre, pilar_peso                          │
│  - pregunta_id, pregunta_enunciado, pregunta_peso              │
│  - asignacion_id, asignacion_fecha_inicio, asignacion_fecha_   │
│    cierre                                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: kpis_por_empresa (Agregación)                           │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - fecha_desde                                                  │
│  - fecha_hasta                                                  │
│  - promedio_global: float                                      │
│  - pilar_mas_fuerte_id: int                                     │
│  - pilar_mas_fuerte_valor: float                               │
│  - pilar_mas_debil_id: int                                      │
│  - pilar_mas_debil_valor: float                                │
│  - brecha_pilares: float                                        │
│  - cobertura_total: int                                         │
│  - cobertura_respondidos: int                                   │
│  - cobertura_porcentaje: float                                  │
│  - tendencia_30d: float                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: distribucion_por_pilar (Agregación)                     │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - pilar_id                                                      │
│  - fecha_desde                                                   │
│  - fecha_hasta                                                   │
│  - total_respuestas: int                                        │
│  - nivel_1_count: int                                           │
│  - nivel_2_count: int                                           │
│  - nivel_3_count: int                                           │
│  - nivel_4_count: int                                           │
│  - nivel_5_count: int                                           │
│  - promedio_pilar: float                                         │
│  - porcentaje_ge4: float (>= nivel 4)                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: heatmap_departamento_pilar (Agregación)                 │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - departamento_id                                              │
│  - departamento_nombre                                          │
│  - pilar_id                                                      │
│  - promedio_departamento_pilar: float                           │
│  - fecha_desde                                                   │
│  - fecha_hasta                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: timeline_evolucion (Agregación Temporal)                │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - fecha: date                                                  │
│  - promedio_global: float                                      │
│  - promedio_por_pilar: json (pilar_id -> valor)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: ranking_departamentos (Agregación)                      │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - departamento_id                                              │
│  - departamento_nombre                                          │
│  - promedio_departamento: float                                │
│  - ranking: int                                                 │
│  - fecha_desde                                                   │
│  - fecha_hasta                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Vista: cobertura_por_departamento (Agregación)                 │
├─────────────────────────────────────────────────────────────────┤
│  - empresa_id                                                   │
│  - departamento_id                                              │
│  - departamento_nombre                                          │
│  - total_empleados: int                                         │
│  - empleados_respondidos: int                                   │
│  - cobertura_porcentaje: float                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Tabla: cache_analytics (Cache de Resultados)                   │
├─────────────────────────────────────────────────────────────────┤
│  - id: int (PK)                                                  │
│  - empresa_id: int                                              │
│  - filtros_hash: str (hash de filtros aplicados)                │
│  - resultado_json: json (resultado completo serializado)         │
│  - fecha_generacion: datetime                                    │
│  - fecha_expiracion: datetime                                   │
│  - indice: (empresa_id, filtros_hash, fecha_generacion)         │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos OLTP → Reporting

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DATOS                               │
└─────────────────────────────────────────────────────────────────┘

1. OPERACIONES TRANSACCIONALES (OLTP)
   ┌──────────────┐
   │  Usuario     │
   │  responde    │
   │  encuesta    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  INSERT INTO │
   │  respuestas  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Trigger /   │
   │  Job         │
   │  (Actualiza  │
   │   vistas     │
   │   material.) │
   └──────┬───────┘
          │
          ▼
2. CAPA DE REPORTING
   ┌──────────────┐
   │  Vistas      │
   │  Materializadas│
   │  (Actualizadas│
   │   periódicamente)│
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Consultas   │
   │  Analíticas  │
   │  (Dashboard) │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  Cache       │
   │  (Opcional)  │
   └──────────────┘
```

### Índices de Reporting

```sql
-- Índices optimizados para consultas analíticas

-- Respuestas por empresa y fecha
CREATE INDEX idx_resp_empresa_fecha 
ON respuestas(asignacion_id, fecha_respuesta);

-- Respuestas por pilar y empleado
CREATE INDEX idx_resp_pilar_empleado 
ON respuestas(pregunta_id, empleado_id) 
INCLUDE (valor, fecha_respuesta);

-- Asignaciones activas por empresa
CREATE INDEX idx_asig_empresa_vigencia 
ON asignaciones(empresa_id, fecha_inicio, fecha_cierre) 
WHERE fecha_cierre >= CURRENT_DATE;

-- Agregaciones por departamento y pilar
CREATE INDEX idx_resp_depto_pilar 
ON respuestas(empleado_id, pregunta_id) 
INCLUDE (valor);
```

### Optimizaciones de Reporting

1. **Vistas Materializadas**: Se actualizan periódicamente (cada hora o diariamente) para evitar cálculos costosos en tiempo real.

2. **Particionamiento**: Las tablas de respuestas y audit_logs pueden particionarse por fecha para mejorar el rendimiento de consultas históricas.

3. **Campos Calculados**: Se almacenan campos derivados (como `respuesta_numerica` y `respuesta_porcentaje`) para evitar conversiones repetidas.

4. **Cache de Resultados**: Se mantiene un cache de resultados de analytics con hash de filtros para evitar recálculos innecesarios.

5. **Índices Compuestos**: Índices optimizados para las consultas más frecuentes del dashboard.

---

## Notas Técnicas

### Convenciones de Nomenclatura

- **Tablas**: Nombres en plural, minúsculas, con guiones bajos (ej: `usuarios`, `password_change_requests`).
- **Campos**: Nombres en minúsculas, con guiones bajos (ej: `empresa_id`, `fecha_inicio`).
- **Claves Primarias**: Siempre `id`.
- **Claves Foráneas**: Formato `{tabla}_id` (ej: `empresa_id`, `pilar_id`).

### Tipos de Datos

- **IDs**: `Integer` (auto-incremental).
- **Textos cortos**: `String(200)` o `String(120)`.
- **Textos largos**: `Text`.
- **Fechas**: `DateTime` (naive UTC en backend).
- **Booleanos**: `Boolean`.
- **JSON**: `JSON` (para campos flexibles como `diff_before`, `diff_after`, `extra`).
- **Enums**: `SAEnum` (SQLAlchemy Enum) mapeado a strings.

### Políticas de Eliminación

- **CASCADE**: Eliminación en cascada para relaciones fuertes (ej: empresa → departamentos).
- **SET NULL**: Para relaciones opcionales (ej: empleado → departamento cuando se elimina el departamento).
- **RESTRICT**: Para prevenir eliminaciones que romperían la integridad referencial.

---

**Fin del Documento de Diagramas**

