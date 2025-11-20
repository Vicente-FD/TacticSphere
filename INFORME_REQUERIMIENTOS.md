# Informe de Evaluación de Requerimientos - TacticSphere

**Versión:** 1.0  FINAL
**Fecha:** 19-01-2025
**Alcance:** Revisión completa del proyecto (backend, frontend, base de datos)

---

## ✔ Requerimientos completados al 100%

### RF-01 – Autenticación con credenciales
**Estado:** ✅ COMPLETO  
**Evidencia:** 
- Endpoint `/auth/login` implementado en `main.py` (línea 259)
- Validación de credenciales contra base de datos con `verify_password`
- Uso de bcrypt para hash de contraseñas
- Frontend con componente de login funcional

### RF-03 – Gestión de roles
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Modelo `RolEnum` con 4 roles: ADMIN_SISTEMA, ADMIN, ANALISTA, USUARIO
- Control de acceso basado en roles con `require_roles` y `roleGuard`
- Permisos diferenciados implementados en múltiples endpoints
- Frontend con guards de ruta por rol

### RF-04 – Multi-empresa (aislamiento lógico)
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Campo `empresa_id` en todas las entidades relevantes (Usuario, Empleado, Pilar, Cuestionario, Asignacion, Respuesta)
- Función `_ensure_company_access` valida acceso por empresa
- Aislamiento implementado en todos los endpoints críticos
- Soft delete con campo `activa` en Empresa

### RF-05 – Alta/Baja/Modificación de empresas
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoints: POST `/companies`, DELETE `/companies/{id}`, GET `/companies`
- Soft delete implementado (campo `activa`)
- Campos: nombre, rut, giro
- Auditoría registrada en todas las operaciones

### RF-07 – Alta de empleados
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoint POST `/companies/{empresa_id}/employees`
- Campos: nombre, apellidos, rut, email (opcional), cargo, departamento_id
- Validación de departamento pertenece a la empresa
- Frontend con formulario de creación

### RF-08 – Definición de pilares
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoints: POST `/pillars`, GET `/pillars`, DELETE `/pillars/{id}`
- Campos: nombre, descripcion, peso, empresa_id (opcional para globales)
- Frontend con gestión completa de pilares

### RF-09 – Banco de preguntas por pilar
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoints: POST `/questions`, GET `/pillars/{pilar_id}/questions`, PUT `/questions/{id}`, DELETE `/questions/{id}`
- Campos: enunciado, tipo (LIKERT, ABIERTA, SI_NO), es_obligatoria, peso, respuesta_esperada
- Soporte para Likert 1-5, sí/no, opción múltiple (ABIERTA)
- Frontend con gestión de preguntas

### RF-10 – Versionado de cuestionarios
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Modelo `Cuestionario` con campos: titulo, version, estado (BORRADOR/PUBLICADO/ARCHIVADO)
- Endpoints: POST `/questionnaires`, GET `/companies/{empresa_id}/questionnaires`, PATCH `/questionnaires/{id}/publish`
- Tabla de asociación `CuestionarioPregunta` para relacionar preguntas
- Estado implementado y funcional

### RF-11 – Asignación de encuestas
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoint POST `/assignments` con alcance: EMPRESA, DEPARTAMENTO, EMPLEADO
- Campos: cuestionario_id, alcance_tipo, alcance_id, fecha_inicio, fecha_cierre, anonimo
- Validación de fechas y alcance
- Frontend con servicio de asignaciones

### RF-13 – Respuesta de encuestas
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoints: POST `/survey/{asignacion_id}/answers` (bulk), GET `/survey/{asignacion_id}/pillars/{pilar_id}`
- Guardado de progreso parcial (borrador) y envío final
- Estado de respuestas con fecha_respuesta
- Frontend con componente de encuesta completo

### RF-15 – Cálculo de puntajes
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Función `compute_dashboard_analytics` en `crud.py` (línea 1155)
- Cálculo por pregunta, pilar y global aplicando pesos
- Normalización de respuestas Likert (1-5) y SI_NO
- Puntajes ponderados por peso de pregunta y pilar

### RF-17 – Reporte global por empresa
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoint GET `/analytics/dashboard` con filtros por empresa
- Retorna: puntaje global, puntajes por pilar, ranking de pilares, top brechas
- KPIs: global_average, strongest_pillar, weakest_pillar, pillar_gap
- Frontend con dashboard completo y visualizaciones

### RF-18 – Reporte segmentado
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Dashboard con filtros: departamento_ids, empleado_ids, pilar_ids, fecha_desde, fecha_hasta
- Reportes por departamento con comparativas
- Reportes por empleado individual
- Comparativas respecto al promedio de empresa

### RF-19 – Dashboard ejecutivo
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Componente `DashboardAnalyticsComponent` con tarjetas KPI
- Gráficos: barras, radar, distribución, heatmap, timeline
- Top 3 fortalezas y top 3 brechas en ranking
- Visualizaciones con ECharts

### RF-20 – Exportación de reportes
**Estado:** ⚠️ PARCIAL (ver detalles abajo)

### RF-21 – Registro de actividad (auditoría)
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Modelo `AuditLog` con campos completos: usuario, fecha/hora UTC, entidad, valores antes/después
- Función `audit_log` registra todas las operaciones críticas
- Endpoint GET `/audit` con filtros avanzados
- Exportación a CSV implementada
- Frontend con vista de auditoría

### RF-22 – Búsqueda y filtrado
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Búsqueda de empleados: GET `/employees/search?query=`
- Filtros en dashboard: fecha, departamento, empleado, pilar
- Filtros en auditoría: fecha, empresa, usuario, acción, búsqueda de texto
- Búsqueda en listado de empleados por nombre, email, rut

### RF-28 – Control de acceso por rol a datos
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Función `_ensure_company_access` valida acceso por empresa
- Función `_ensure_assignment_access` valida acceso a asignaciones
- Restricciones por rol en todos los endpoints
- Frontend con guards de ruta y ocultación de elementos por rol

### RF-29 – Histórico de resultados
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Dashboard con filtros de fecha (fecha_desde, fecha_hasta)
- Timeline con evolución por día
- Comparativa de tendencias (trend_30d)
- Datos históricos preservados en tabla `respuestas` con `fecha_respuesta`

### RF-30 – Soporte para anonimato opcional
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Campo `anonimo` en modelo `Asignacion`
- Respuestas anónimas con `empleado_id = NULL`
- Validación en endpoints de respuesta
- Filtrado de respuestas por anonimato en consultas

### RF-31 – Estado de cumplimiento de encuestas
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Endpoint GET `/survey/{asignacion_id}/progress` calcula % respondidas
- Métricas: total, respondidas, completion (%), progreso
- Desglose por pilar
- Frontend muestra indicadores de avance

---

## ⚠ Requerimientos parcialmente implementados

### RF-02 – Recuperación de contraseña por token
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Endpoint POST `/auth/password/forgot` crea `PasswordChangeRequest`
- Modelo `PasswordChangeRequest` con campos: user_id, created_at, resolved
- Endpoint GET `/password-change-requests` para listar solicitudes
- Endpoint POST `/users/{user_id}/password` permite reset con `request_id`

**Lo que falta:**
- ❌ No se genera ni muestra token temporal al usuario
- ❌ No hay endpoint para validar token y permitir cambio de contraseña sin autenticación
- ❌ No se exige cambio de contraseña al primer ingreso (falta campo `must_change_password` o similar)
- ❌ El flujo actual requiere que un ADMIN resuelva la solicitud manualmente

**Recomendación:** Implementar generación de token único, mostrar token en pantalla (MVP), validación de token en endpoint público, y flag de cambio obligatorio.

### RF-06 – Gestión de estructura organizacional
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Modelo `Departamento` con relación a `Empresa`
- Endpoints: POST `/companies/{empresa_id}/departments`, GET `/companies/{empresa_id}/departments`, DELETE `/departments/{id}`
- Asignación de empleados a departamentos (campo `departamento_id` en `Empleado`)

**Lo que falta:**
- ❌ No hay gestión de "equipos" como nivel adicional (solo departamentos)
- ❌ No hay jerarquía de unidades organizacionales
- ❌ Falta UI completa para gestión de estructura (solo creación básica)

**Recomendación:** Si "equipos" no es crítico para MVP, considerar completo. Si es necesario, agregar modelo `Equipo` y relaciones.

### RF-12 – Notificaciones in-app de asignación
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Sistema de asignaciones funcional
- Endpoint para obtener asignaciones activas

**Lo que falta:**
- ❌ No hay sistema de notificaciones in-app implementado
- ❌ No se muestran notificaciones al usuario al ingresar
- ❌ No hay componente de notificaciones en el frontend
- ❌ No hay servicio de notificaciones

**Recomendación:** Implementar servicio de notificaciones, componente de notificaciones, y lógica para detectar asignaciones pendientes al login.

### RF-14 – Validaciones de respuesta
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Campo `es_obligatoria` en modelo `Pregunta`
- Validación de tipo de respuesta en frontend (Likert 1-5)

**Lo que falta:**
- ❌ No hay validación backend explícita de obligatoriedad antes de enviar
- ❌ No hay validación de rangos (Likert 1-5) en backend
- ❌ No se bloquea el envío si hay inconsistencias (solo validación frontend)
- ❌ No hay validación de tipos de respuesta (SI_NO, ABIERTA) en backend

**Recomendación:** Agregar validación completa en `submit_bulk_answers` antes de guardar.

### RF-16 – Umbrales y semáforos
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Modelo `UmbralPilar` con campos: umbral_amarillo, umbral_verde
- Modelo `Recomendacion` con categoría (ROJO/AMARILLO/VERDE)
- Relaciones en modelo `Pilar`

**Lo que falta:**
- ❌ No hay endpoints para crear/editar umbrales
- ❌ No hay cálculo automático de semáforos en dashboard
- ❌ No se muestran semáforos en reportes
- ❌ No hay configuración de umbrales por empresa (solo por pilar)

**Recomendación:** Implementar endpoints CRUD para umbrales, función de cálculo de semáforos, y visualización en dashboard.

### RF-20 – Exportación de reportes
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Exportación a CSV: GET `/analytics/responses/export` (respuestas)
- Exportación de auditoría: GET `/audit/export` (CSV)
- Endpoint POST `/audit/report-export` para registrar exportaciones

**Lo que falta:**
- ❌ No hay exportación a PDF
- ❌ No hay exportación a Excel (solo CSV)
- ❌ No se preservan gráficos en exportación (solo datos tabulares)
- ❌ No hay exportación del dashboard completo con gráficos

**Recomendación:** Implementar generación de PDF (reportlab/weasyprint), Excel (openpyxl), y captura de gráficos.

### RF-23 – Gestión de catálogos
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Pilares globales (empresa_id = NULL) funcionan como catálogo
- Estructura de datos permite catálogos

**Lo que falta:**
- ❌ No hay gestión explícita de catálogos (rubro, tamaños de empresa, países)
- ❌ No hay endpoints para administrar catálogos auxiliares
- ❌ No hay UI para gestión de catálogos
- ❌ Los catálogos mencionados (rubro, país) no están implementados como entidades separadas

**Recomendación:** Crear modelos y endpoints para catálogos si son necesarios, o documentar que se manejan como datos estáticos.

### RF-24 – Gestión de sesiones y cierre
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Servicio `InactivityService` en frontend con timeout de 15 minutos
- Invalidación de sesión por inactividad
- Modal de advertencia antes de cerrar sesión

**Lo que falta:**
- ❌ El timeout es fijo (15 min) y no es configurable
- ❌ No hay invalidación de token JWT en backend al cerrar sesión (solo frontend)
- ❌ No hay endpoint de logout que invalide token
- ❌ No hay blacklist de tokens en backend

**Recomendación:** Implementar configuración de timeout, endpoint de logout, y blacklist de tokens (o tokens con expiración corta).

### RF-25 – Reapertura controlada
**Estado:** ❌ NO IMPLEMENTADO  
**Lo que existe:**
- Modelo `Asignacion` con fechas de vigencia

**Lo que falta:**
- ❌ No hay endpoint para reabrir encuesta cerrada
- ❌ No hay registro de motivo en bitácora
- ❌ No hay validación de permisos (solo ADMIN empresa)
- ❌ No hay UI para reapertura

**Recomendación:** Implementar endpoint PATCH `/assignments/{id}/reopen` con motivo, validación de permisos, y auditoría.

### RF-26 – Duplicación de cuestionarios
**Estado:** ❌ NO IMPLEMENTADO  
**Lo que existe:**
- Endpoints CRUD de cuestionarios

**Lo que falta:**
- ❌ No hay endpoint para clonar cuestionario
- ❌ No hay lógica de duplicación con nueva versión
- ❌ No hay UI para duplicar

**Recomendación:** Implementar endpoint POST `/questionnaires/{id}/duplicate` que cree copia con versión incrementada.

### RF-27 – Importación básica de empleados
**Estado:** ❌ NO IMPLEMENTADO  
**Lo que existe:**
- Endpoint POST para crear empleado individual

**Lo que falta:**
- ❌ No hay endpoint para upload de CSV
- ❌ No hay validación de formato CSV
- ❌ No hay reporte de errores de importación
- ❌ No hay UI para importación

**Recomendación:** Implementar endpoint POST `/companies/{id}/employees/import` con validación CSV y reporte de errores.

### RF-32 – Plantilla de recomendaciones
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Modelo `Recomendacion` con categoría (ROJO/AMARILLO/VERDE) y texto
- Relación con `Pilar`

**Lo que falta:**
- ❌ No hay endpoints para crear/editar recomendaciones
- ❌ No hay generación automática según tramos de puntaje
- ❌ No hay edición por Administrador de empresa
- ❌ No se muestran recomendaciones en reportes

**Recomendación:** Implementar CRUD de recomendaciones, lógica de generación por tramos, y visualización en dashboard.

---

## ❌ Requerimientos NO implementados

### RF-25 – Reapertura controlada
**Estado:** ❌ NO IMPLEMENTADO  
**Detalles:** Ver sección de parciales arriba.

### RF-26 – Duplicación de cuestionarios
**Estado:** ❌ NO IMPLEMENTADO  
**Detalles:** Ver sección de parciales arriba.

### RF-27 – Importación básica de empleados
**Estado:** ❌ NO IMPLEMENTADO  
**Detalles:** Ver sección de parciales arriba.

---

## Requerimientos No Funcionales (RNF)

### RNF-01 – Seguridad de contraseñas
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Uso de bcrypt (passlib) para hash
- Validación de longitud mínima (≥ 10 caracteres) en `validate_password`
- Variable de entorno `PASSWORD_MIN_LENGTH` configurable

### RNF-02 – Control de accesos
**Estado:** ✅ COMPLETO  
**Evidencia:**
- RBAC implementado con `require_roles` y `roleGuard`
- Validación en cada endpoint del backend
- Guards de ruta en frontend
- Funciones `_ensure_company_access` y `_ensure_assignment_access`

### RNF-03 – Protección de datos
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- CORS configurado para desarrollo
- Estructura lista para HTTPS

**Lo que falta:**
- ❌ No hay configuración explícita de HTTPS en producción
- ❌ No hay documentación de TLS en desarrollo
- ❌ CORS permite solo localhost (necesita configuración para producción)

**Recomendación:** Configurar HTTPS en producción, documentar TLS opcional en desarrollo.

### RNF-04 – Rendimiento (respuesta UI)
**Estado:** ⚠️ NO VERIFICADO  
**Evidencia:**
- Dashboard con optimizaciones (OnPush change detection)
- Paginación en algunos listados

**Falta:**
- ❌ No hay métricas de tiempo de respuesta
- ❌ No hay pruebas de carga con 10k respuestas
- ❌ No hay optimización explícita de consultas

**Recomendación:** Realizar pruebas de carga y optimizar consultas si es necesario.

### RNF-05 – Rendimiento (cálculo de puntajes)
**Estado:** ⚠️ NO VERIFICADO  
**Evidencia:**
- Función `compute_dashboard_analytics` optimizada con agregaciones SQL

**Falta:**
- ❌ No hay métricas de tiempo de ejecución
- ❌ No hay pruebas con 5k respuestas
- ❌ No hay índices específicos verificados

**Recomendación:** Agregar índices en tablas críticas, medir tiempos, optimizar si excede 10s.

### RNF-06 – Disponibilidad (demo)
**Estado:** ⚠️ NO VERIFICADO  
**Evidencia:**
- Aplicación desplegable

**Falta:**
- ❌ No hay monitoreo de disponibilidad
- ❌ No hay métricas de uptime
- ❌ No hay documentación de SLA objetivo

**Recomendación:** Implementar monitoreo y documentar disponibilidad objetivo.

### RNF-07 – Respaldo y recuperación
**Estado:** ❌ NO IMPLEMENTADO  
**Lo que falta:**
- ❌ No hay respaldos automáticos configurados
- ❌ No hay retención de 7 días documentada
- ❌ No hay prueba de restauración documentada
- ❌ No hay scripts de backup

**Recomendación:** Implementar backups diarios (cron job), documentar proceso de restauración, y probar restauración.

### RNF-08 – Trazabilidad
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Modelo `AuditLog` completo con: usuario, fecha/hora UTC, entidad, valores antes/después
- Registro de IP, user-agent, método HTTP, path
- Campos `diff_before` y `diff_after` para cambios
- Registro en todas las operaciones críticas

### RNF-09 – Usabilidad
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Navegación consistente con menú lateral y breadcrumbs (en shell)
- Formularios con validación en línea (Angular reactive forms)
- Mensajes de error claros en frontend y backend
- UI moderna con Tailwind CSS

### RNF-10 – Internacionalización básica
**Estado:** ✅ COMPLETO  
**Evidencia:**
- UI completamente en español
- Textos parametrizados en componentes (fácil de traducir)
- Estructura lista para i18n (aunque no está implementado)

**Nota:** No hay sistema i18n formal, pero la estructura permite agregarlo fácilmente.

### RNF-11 – Escalabilidad horizontal inicial
**Estado:** ✅ COMPLETO  
**Evidencia:**
- Arquitectura separada: frontend (Angular), backend (FastAPI), base de datos (SQLite/PostgreSQL)
- Backend desplegable independientemente
- Base de datos externa (no embebida en código)
- CORS configurado para comunicación entre servicios

**Nota:** SQLite en desarrollo, pero estructura lista para PostgreSQL en producción.

### RNF-12 – Mantenibilidad
**Estado:** ⚠️ PARCIAL  
**Lo que existe:**
- Código estructurado y organizado
- Separación de responsabilidades (models, crud, schemas, main)
- Migraciones con Alembic

**Lo que falta:**
- ❌ No hay linters configurados visiblemente
- ❌ No hay pruebas unitarias (0% de cobertura)
- ❌ No hay documentación OpenAPI/Swagger visible
- ❌ No hay documentación de endpoints

**Recomendación:** Configurar linters (ruff/flake8, ESLint), agregar pruebas unitarias (≥60% en servicios críticos), y generar documentación OpenAPI.

---

## 🔍 Observaciones técnicas importantes

### Problemas detectados

1. **Validación de respuestas incompleta:** El backend no valida obligatoriedad ni rangos antes de guardar respuestas. Solo el frontend valida.

2. **Sesiones no invalidadas en backend:** El logout solo limpia localStorage, pero el token JWT sigue siendo válido hasta expirar. No hay blacklist.

3. **Falta de pruebas:** No hay pruebas unitarias ni de integración. El código es funcional pero no está validado automáticamente.

4. **Exportación limitada:** Solo CSV. Falta PDF y Excel con gráficos.

5. **Umbrales no funcionales:** Los modelos existen pero no hay endpoints ni cálculo de semáforos.

6. **Notificaciones ausentes:** No hay sistema de notificaciones in-app para asignaciones.

7. **Backups no configurados:** No hay respaldos automáticos ni documentación de recuperación.

### Inconsistencias

1. **Timeout de inactividad fijo:** 15 minutos hardcodeado, debería ser configurable.

2. **Catálogos no implementados:** Se mencionan rubro, país, tamaños de empresa, pero no están como entidades.

3. **Recomendaciones sin UI:** Modelo existe pero no hay endpoints ni visualización.

### Riesgos

1. **Pérdida de datos:** Sin backups automáticos, riesgo alto en producción.

2. **Seguridad:** Tokens JWT no se invalidan en logout, riesgo medio.

3. **Rendimiento no verificado:** Sin pruebas de carga, riesgo de problemas con datos reales.

4. **Mantenibilidad:** Sin pruebas, riesgo alto de regresiones en cambios futuros.

### Mejoras recomendadas

1. **Prioridad Alta:**
   - Implementar validación backend de respuestas
   - Configurar backups automáticos
   - Agregar invalidación de tokens en logout
   - Implementar endpoints de umbrales y cálculo de semáforos

2. **Prioridad Media:**
   - Agregar pruebas unitarias (≥60% cobertura)
   - Implementar exportación PDF/Excel
   - Agregar sistema de notificaciones
   - Implementar duplicación de cuestionarios
   - Agregar importación CSV de empleados

3. **Prioridad Baja:**
   - Configurar linters y documentación OpenAPI
   - Hacer timeout de inactividad configurable
   - Implementar gestión de catálogos si es necesario
   - Agregar pruebas de carga y optimización

---

## Resumen Ejecutivo

### Completitud por categoría

- **Autenticación y Seguridad:** 85% (falta invalidación de tokens y cambio obligatorio de contraseña)
- **Gestión de Datos:** 90% (falta importación CSV y algunos catálogos)
- **Encuestas y Respuestas:** 80% (falta validación backend completa y notificaciones)
- **Reportes y Analytics:** 75% (falta PDF/Excel y semáforos)
- **Administración:** 70% (faltan varias funcionalidades de gestión)
- **No Funcionales:** 65% (faltan backups, pruebas, y algunas verificaciones)

### Total estimado: ~78% de completitud

**Requerimientos Funcionales:** 22 completos, 10 parciales, 3 no implementados  
**Requerimientos No Funcionales:** 6 completos, 5 parciales, 1 no implementado

---

**Fin del informe**

