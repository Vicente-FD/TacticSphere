# Manual de Uso - TacticSphere

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Roles y Permisos](#roles-y-permisos)
4. [Interfaz de Usuario](#interfaz-de-usuario)
5. [Gestión de Empresas](#gestión-de-empresas)
6. [Gestión de Departamentos](#gestión-de-departamentos)
7. [Gestión de Empleados](#gestión-de-empleados)
8. [Gestión de Usuarios](#gestión-de-usuarios)
9. [Gestión de Pilares](#gestión-de-pilares)
10. [Gestión de Preguntas](#gestión-de-preguntas)
11. [Sistema de Encuestas](#sistema-de-encuestas)
12. [Dashboard y Analytics](#dashboard-y-analytics)
13. [Registro de Auditoría](#registro-de-auditoría)
14. [Solicitudes de Consultoría](#solicitudes-de-consultoría)
15. [Flujos de Trabajo Comunes](#flujos-de-trabajo-comunes)
16. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

### ¿Qué es TacticSphere?

TacticSphere es una plataforma inteligente que evalúa, analiza y visualiza la madurez tecnológica de las organizaciones tomando como base ITIL 4. La plataforma permite diagnosticar el nivel actual de madurez tecnológica y proporcionar una ruta clara para avanzar hacia una gestión más eficiente, automatizada y basada en datos.

### Objetivo

TacticSphere combina consultoría especializada y herramientas de diagnóstico modernas para conectar estrategia, infraestructura y personas bajo una visión integral, ayudando a las organizaciones a:

- Comprender su nivel actual de madurez tecnológica
- Identificar brechas y oportunidades de mejora
- Priorizar inversiones tecnológicas
- Optimizar recursos
- Construir un roadmap digital sostenible

### Pilares de Evaluación

La plataforma evalúa cuatro pilares fundamentales:

1. **Infraestructura & Cloud**: Estabilidad, escalabilidad y adopción de servicios en la nube
2. **Big Data & Analytics**: Gestión y aprovechamiento avanzado de los datos
3. **Business Intelligence (BI)**: Información estratégica para decidir con certeza
4. **Inteligencia Artificial (IA)**: Automatización, predicción y optimización de procesos

Cada pilar se evalúa en cinco niveles de madurez para mostrar con precisión dónde está la empresa y qué pasos seguir.

---

## Acceso al Sistema

### Inicio de Sesión

1. Accede a la URL de la plataforma TacticSphere
2. En la página de inicio, haz clic en el botón de **Iniciar Sesión** o navega a `/login`
3. Ingresa tus credenciales:
   - **Email**: Tu dirección de correo electrónico registrada
   - **Contraseña**: Tu contraseña de acceso
4. Haz clic en **Iniciar Sesión**

### Recuperación de Contraseña

Si olvidaste tu contraseña:

1. En la página de login, haz clic en **¿Olvidaste tu contraseña?**
2. Ingresa tu dirección de email
3. Se generará una solicitud de cambio de contraseña
4. Un administrador del sistema procesará tu solicitud y te notificará

**Nota**: Las solicitudes de cambio de contraseña deben ser aprobadas por un administrador del sistema.

### Cerrar Sesión

Para cerrar tu sesión:

1. Haz clic en el botón **Salir** ubicado en la esquina superior derecha del menú
2. Serás redirigido a la página de inicio

---

## Roles y Permisos

TacticSphere utiliza un sistema de roles jerárquico con los siguientes niveles:

### ADMIN_SISTEMA

**Permisos completos del sistema:**

- Acceso a todas las empresas y sus datos
- Crear, editar y eliminar empresas
- Gestionar todos los usuarios del sistema
- Asignar cualquier rol a usuarios
- Acceso completo al registro de auditoría
- Exportar y eliminar registros de auditoría
- Ver dashboard global (todas las empresas)
- Gestionar solicitudes de consultoría
- Gestionar solicitudes de cambio de contraseña

### ADMIN

**Permisos a nivel de empresa:**

- Gestionar su empresa asignada
- Crear, editar y eliminar departamentos de su empresa
- Gestionar empleados de su empresa
- Crear usuarios con roles ANALISTA y USUARIO para su empresa
- Gestionar pilares y preguntas de su empresa
- Crear y gestionar cuestionarios y asignaciones
- Ver dashboard de su empresa
- Ver registro de auditoría de su empresa
- No puede ver ni gestionar otras empresas

### ANALISTA

**Permisos de análisis y encuestas:**

- Ver datos de su empresa
- Acceder al sistema de encuestas
- Responder encuestas
- Ver resultados y analytics de su empresa
- No puede gestionar usuarios, empresas o configuraciones

### USUARIO

**Permisos básicos:**

- Ver resultados y analytics de su empresa
- Acceso limitado a funcionalidades de visualización
- No puede gestionar configuraciones ni responder encuestas

---

## Interfaz de Usuario

### Estructura Principal

La interfaz de TacticSphere está organizada en las siguientes secciones:

#### Barra Superior (Header)

- **Logo y nombre**: Enlace a la página principal
- **Usuario actual**: Muestra el nombre del usuario conectado
- **Botón Salir**: Cierra la sesión actual

#### Menú Lateral (Sidebar)

El menú lateral contiene las siguientes opciones según los permisos del usuario:

- **Resultados**: Dashboard de analytics y visualización de datos
- **Encuesta**: Sistema de encuestas (solo ANALISTA, ADMIN, ADMIN_SISTEMA)
- **Empresas**: Gestión de empresas (solo ADMIN, ADMIN_SISTEMA)
- **Pilares**: Gestión de pilares (solo ADMIN, ADMIN_SISTEMA)
- **Preguntas**: Gestión de preguntas (solo ADMIN, ADMIN_SISTEMA)
- **Usuarios**: Gestión de usuarios (solo ADMIN, ADMIN_SISTEMA)
- **Registro de auditoría**: Visualización de logs (solo ADMIN_SISTEMA)

**Nota**: Algunos elementos del menú muestran badges de notificación cuando hay solicitudes pendientes (por ejemplo, solicitudes de consultoría o cambio de contraseña).

#### Área de Contenido Principal

Muestra el contenido de la sección seleccionada. Incluye:
- Formularios de gestión
- Tablas de datos
- Gráficos y visualizaciones
- Dashboards

#### Pie de Página (Footer)

- Información de copyright
- Enlace de soporte
- Botón para volver arriba

---

## Gestión de Empresas

### Ver Lista de Empresas

1. Navega a **Empresas** en el menú lateral
2. Se mostrará una tabla con todas las empresas disponibles
3. Puedes ver:
   - Nombre de la empresa
   - RUT (si está registrado)
   - Giro comercial
   - Estado (activa/inactiva)

**Nota**: Los usuarios ADMIN solo verán su propia empresa.

### Crear una Nueva Empresa

**Solo ADMIN_SISTEMA puede crear empresas.**

1. En la página de **Empresas**, haz clic en el botón **Nueva Empresa** o **Crear Empresa**
2. Completa el formulario:
   - **Nombre**: Nombre de la empresa (obligatorio)
   - **RUT**: RUT de la empresa (opcional)
   - **Giro**: Giro comercial (opcional)
   - **Departamentos**: Lista de departamentos iniciales (opcional)
3. Haz clic en **Guardar** o **Crear**

**Nota**: Al crear una empresa, puedes agregar departamentos iniciales. Estos se crearán automáticamente junto con la empresa.

### Editar una Empresa

1. En la lista de empresas, localiza la empresa que deseas editar
2. Haz clic en el botón **Editar** o en el ícono de edición
3. Modifica los campos necesarios:
   - Nombre
   - RUT
   - Giro
   - Departamentos (agregar, editar o eliminar)
4. Haz clic en **Guardar**

### Eliminar una Empresa

**Solo ADMIN_SISTEMA puede eliminar empresas.**

1. En la lista de empresas, localiza la empresa que deseas eliminar
2. Haz clic en el botón **Eliminar** o en el ícono de eliminación
3. Confirma la eliminación

**Advertencia**: Eliminar una empresa eliminará también todos sus departamentos, empleados, usuarios, pilares, preguntas, cuestionarios y asignaciones asociadas.

---

## Gestión de Departamentos

### Ver Departamentos de una Empresa

1. Navega a **Empresas** en el menú lateral
2. Selecciona una empresa de la lista
3. Los departamentos de la empresa se mostrarán en la sección correspondiente

O bien:

1. Navega directamente a la gestión de departamentos desde la página de empresas
2. Selecciona la empresa en el filtro

### Crear un Departamento

1. Desde la página de empresas, selecciona una empresa
2. Haz clic en **Agregar Departamento** o **Nuevo Departamento**
3. Ingresa el nombre del departamento
4. Haz clic en **Guardar**

**Nota**: Solo puedes crear departamentos para empresas a las que tienes acceso según tu rol.

### Editar un Departamento

1. Localiza el departamento en la lista
2. Haz clic en el botón **Editar**
3. Modifica el nombre
4. Haz clic en **Guardar**

### Eliminar un Departamento

1. Localiza el departamento en la lista
2. Haz clic en el botón **Eliminar**
3. Confirma la eliminación

**Advertencia**: Eliminar un departamento puede afectar a los empleados asignados a ese departamento.

---

## Gestión de Empleados

### Ver Lista de Empleados

1. Navega a la sección de **Empleados** desde la gestión de empresas
2. Selecciona una empresa
3. Opcionalmente, filtra por departamento usando el selector
4. Puedes buscar empleados usando el campo de búsqueda

### Crear un Empleado

1. En la página de empleados, haz clic en **Nuevo Empleado** o **Agregar Empleado**
2. Completa el formulario:
   - **Nombre**: Nombre del empleado (obligatorio)
   - **Apellidos**: Apellidos del empleado (obligatorio)
   - **RUT**: RUT del empleado (opcional)
   - **Email**: Correo electrónico (opcional)
   - **Cargo**: Cargo o posición (opcional)
   - **Departamento**: Selecciona el departamento al que pertenece (opcional)
   - **Empresa**: Se asigna automáticamente según tu rol
3. Haz clic en **Guardar**

### Editar un Empleado

1. Localiza el empleado en la lista
2. Haz clic en el botón **Editar**
3. Modifica los campos necesarios
4. Haz clic en **Guardar**

### Buscar Empleados

1. Usa el campo de búsqueda en la página de empleados
2. Ingresa al menos 2 caracteres
3. Los resultados se filtrarán automáticamente

**Nota**: La búsqueda busca en nombre, apellidos, email y cargo.

---

## Gestión de Usuarios

### Ver Lista de Usuarios

1. Navega a **Usuarios** en el menú lateral
2. Se mostrará una tabla con todos los usuarios disponibles según tus permisos:
   - **ADMIN_SISTEMA**: Ve todos los usuarios de todas las empresas
   - **ADMIN**: Ve solo usuarios de su empresa
3. Puedes ver:
   - Nombre
   - Email
   - Rol
   - Empresa asignada
   - Estado (activo/inactivo)

**Nota**: Si hay solicitudes de cambio de contraseña pendientes, verás un badge de notificación en el menú.

### Crear un Usuario

1. En la página de **Usuarios**, haz clic en **Nuevo Usuario** o **Crear Usuario**
2. Completa el formulario:
   - **Nombre**: Nombre completo del usuario (obligatorio)
   - **Email**: Dirección de correo electrónico (obligatorio, debe ser único)
   - **Contraseña**: Contraseña inicial (obligatorio, debe cumplir requisitos de seguridad)
   - **Rol**: Selecciona el rol (según tus permisos):
     - **ADMIN_SISTEMA**: Solo puede asignar ADMIN_SISTEMA
     - **ADMIN**: Puede asignar ANALISTA y USUARIO
   - **Empresa**: Selecciona la empresa (obligatorio para roles ADMIN, ANALISTA, USUARIO)
3. Haz clic en **Guardar**

**Restricciones de roles:**
- **ADMIN** solo puede crear usuarios con roles ANALISTA o USUARIO
- **ADMIN** solo puede crear usuarios para su propia empresa
- **ADMIN_SISTEMA** puede crear usuarios con cualquier rol y para cualquier empresa

### Editar un Usuario

1. Localiza el usuario en la lista
2. Haz clic en el botón **Editar**
3. Modifica los campos necesarios:
   - Nombre
   - Email
   - Rol (según tus permisos)
   - Empresa (según tus permisos)
   - Estado activo/inactivo
4. Haz clic en **Guardar**

**Restricciones:**
- No se puede desactivar un usuario ADMIN_SISTEMA
- **ADMIN** solo puede editar usuarios de su empresa
- **ADMIN** no puede cambiar el rol a ADMIN_SISTEMA

### Restablecer Contraseña de un Usuario

1. Localiza el usuario en la lista
2. Haz clic en **Restablecer Contraseña** o en el ícono correspondiente
3. Si hay una solicitud de cambio pendiente, puedes vincularla usando el ID de solicitud
4. Ingresa la nueva contraseña
5. Confirma la acción

**Nota**: Las contraseñas deben cumplir requisitos de seguridad (mínimo de caracteres, mayúsculas, números, etc.).

### Desactivar/Activar un Usuario

1. Edita el usuario
2. Cambia el estado **Activo** a desactivado o activado según corresponda
3. Guarda los cambios

**Nota**: Un usuario desactivado no puede iniciar sesión en el sistema.

### Eliminar un Usuario

1. Localiza el usuario en la lista
2. Haz clic en el botón **Eliminar**
3. Confirma la eliminación

**Restricciones:**
- No se puede eliminar un usuario ADMIN_SISTEMA
- **ADMIN** solo puede eliminar usuarios de su empresa

### Gestionar Solicitudes de Cambio de Contraseña

**Solo ADMIN_SISTEMA puede gestionar solicitudes de cambio de contraseña.**

1. Navega a **Usuarios** en el menú lateral
2. Si hay solicitudes pendientes, verás un badge de notificación
3. Accede a la sección de solicitudes de cambio de contraseña
4. Revisa las solicitudes pendientes
5. Para procesar una solicitud:
   - Haz clic en la solicitud
   - Restablece la contraseña del usuario asociado
   - La solicitud se marcará como resuelta automáticamente

---

## Gestión de Pilares

### ¿Qué son los Pilares?

Los pilares son las categorías principales de evaluación de madurez tecnológica. Cada empresa puede tener sus propios pilares personalizados, o usar pilares globales del sistema.

### Ver Lista de Pilares

1. Navega a **Pilares** en el menú lateral
2. Se mostrará una tabla con todos los pilares disponibles según tus permisos
3. Puedes ver:
   - Nombre del pilar
   - Descripción
   - Peso (importancia relativa)
   - Empresa asociada

### Crear un Pilar

1. En la página de **Pilares**, haz clic en **Nuevo Pilar** o **Crear Pilar**
2. Completa el formulario:
   - **Nombre**: Nombre del pilar (obligatorio, ej: "Infraestructura & Cloud")
   - **Descripción**: Descripción detallada del pilar (opcional)
   - **Peso**: Peso relativo del pilar para cálculos (obligatorio, valor numérico)
   - **Empresa**: Selecciona la empresa (opcional, si es null es un pilar global)
3. Haz clic en **Guardar**

**Nota**: 
- **ADMIN** solo puede crear pilares para su empresa
- **ADMIN_SISTEMA** puede crear pilares globales (sin empresa) o para cualquier empresa

### Editar un Pilar

1. Localiza el pilar en la lista
2. Haz clic en el botón **Editar**
3. Modifica los campos necesarios:
   - Nombre
   - Descripción
   - Peso
4. Haz clic en **Guardar**

### Eliminar un Pilar

1. Localiza el pilar en la lista
2. Haz clic en el botón **Eliminar**
3. Confirma la eliminación

**Opciones de eliminación:**
- **Eliminación simple**: Solo elimina el pilar si no tiene preguntas asociadas
- **Eliminación en cascada**: Elimina el pilar y todas sus preguntas (usa el parámetro `cascade=true`)

**Advertencia**: Eliminar un pilar puede afectar cuestionarios y asignaciones que lo utilizan.

---

## Gestión de Preguntas

### ¿Qué son las Preguntas?

Las preguntas son los elementos individuales que se utilizan en las encuestas para evaluar cada pilar. Cada pregunta pertenece a un pilar específico.

### Ver Lista de Preguntas

1. Navega a **Preguntas** en el menú lateral
2. Selecciona un pilar del filtro
3. Se mostrará una tabla con todas las preguntas del pilar seleccionado
4. Puedes ver:
   - Enunciado de la pregunta
   - Tipo de pregunta
   - Si es obligatoria
   - Peso de la pregunta
   - Respuesta esperada (si está configurada)

### Tipos de Preguntas

TacticSphere soporta tres tipos de preguntas:

1. **LIKERT**: Escala de 1 a 5 (o según niveles configurados)
2. **ABIERTA**: Respuesta de texto libre
3. **SI_NO**: Respuesta booleana (Sí/No)

### Crear una Pregunta

1. En la página de **Preguntas**, selecciona primero un pilar
2. Haz clic en **Nueva Pregunta** o **Agregar Pregunta**
3. Completa el formulario:
   - **Pilar**: Se asigna automáticamente según el filtro seleccionado
   - **Enunciado**: Texto de la pregunta (obligatorio)
   - **Tipo**: Selecciona LIKERT, ABIERTA o SI_NO (obligatorio)
   - **Es obligatoria**: Marca si la pregunta debe ser respondida (obligatorio)
   - **Peso**: Peso relativo de la pregunta para cálculos (obligatorio)
   - **Respuesta esperada**: Respuesta ideal o esperada (opcional, solo visible para ADMIN, ANALISTA)
4. Haz clic en **Guardar**

### Editar una Pregunta

1. Localiza la pregunta en la lista
2. Haz clic en el botón **Editar**
3. Modifica los campos necesarios:
   - Enunciado
   - Tipo (ten cuidado al cambiar el tipo, puede afectar respuestas existentes)
   - Es obligatoria
   - Peso
   - Respuesta esperada
4. Haz clic en **Guardar**

### Eliminar una Pregunta

1. Localiza la pregunta en la lista
2. Haz clic en el botón **Eliminar**
3. Confirma la eliminación

**Advertencia**: Eliminar una pregunta puede afectar cuestionarios y respuestas existentes.

---

## Sistema de Encuestas

### Flujo General de Encuestas

El sistema de encuestas de TacticSphere sigue este flujo:

1. **Crear Cuestionario**: Se crea un cuestionario con preguntas seleccionadas
2. **Publicar Cuestionario**: El cuestionario se marca como PUBLICADO
3. **Crear Asignación**: Se asigna el cuestionario a una empresa, departamento o empleado específico
4. **Responder Encuesta**: Los usuarios autorizados responden las preguntas
5. **Ver Resultados**: Los resultados se visualizan en el dashboard

### Cuestionarios

#### Crear un Cuestionario

1. Desde la gestión de empresas o pilares, accede a la creación de cuestionarios
2. Completa el formulario:
   - **Título**: Nombre del cuestionario (obligatorio)
   - **Versión**: Número de versión (obligatorio)
   - **Empresa**: Empresa asociada (obligatorio)
   - **Estado**: BORRADOR o PUBLICADO
   - **Preguntas**: Selecciona las preguntas que formarán parte del cuestionario
3. Haz clic en **Guardar**

#### Publicar un Cuestionario

1. Localiza el cuestionario en estado BORRADOR
2. Haz clic en **Publicar** o cambia el estado a PUBLICADO
3. El cuestionario estará disponible para crear asignaciones

**Nota**: Solo los cuestionarios PUBLICADOS pueden ser asignados.

### Asignaciones

#### Crear una Asignación

1. Accede a la sección de asignaciones (desde empresas o cuestionarios)
2. Haz clic en **Nueva Asignación**
3. Completa el formulario:
   - **Empresa**: Empresa a la que se asigna (obligatorio)
   - **Cuestionario**: Cuestionario a asignar (obligatorio, debe estar PUBLICADO)
   - **Alcance**: Tipo de alcance:
     - **EMPRESA**: Para toda la empresa
     - **DEPARTAMENTO**: Para un departamento específico
     - **EMPLEADO**: Para un empleado específico
   - **Alcance ID**: ID del departamento o empleado (si aplica)
   - **Fecha de inicio**: Fecha desde cuando está activa (obligatorio)
   - **Fecha de cierre**: Fecha hasta cuando está activa (obligatorio)
   - **Anónimo**: Marca si las respuestas serán anónimas
4. Haz clic en **Guardar**

**Nota**: 
- Las asignaciones tienen un período de vigencia
- Solo se pueden responder encuestas de asignaciones activas (dentro del rango de fechas)
- Si la asignación no es anónima, se requiere especificar el empleado al responder

#### Ver Asignaciones Activas

1. Navega a la sección de asignaciones
2. Filtra por empresa si es necesario
3. Las asignaciones activas se mostrarán destacadas

### Responder una Encuesta

#### Iniciar una Encuesta

1. Navega a **Encuesta** en el menú lateral
2. Selecciona la empresa (si tienes acceso a múltiples)
3. El sistema buscará automáticamente una asignación activa o creará una si es necesario
4. Haz clic en **Comenzar Encuesta**

#### Navegar por los Pilares

1. Una vez iniciada la encuesta, verás la lista de pilares incluidos
2. Haz clic en un pilar para ver sus preguntas
3. Responde todas las preguntas del pilar:
   - **LIKERT**: Selecciona un valor de la escala (generalmente 1-5)
   - **ABIERTA**: Escribe tu respuesta en el campo de texto
   - **SI_NO**: Selecciona Sí o No
4. Las preguntas obligatorias están marcadas con un asterisco (*)

#### Guardar Respuestas

1. Después de responder las preguntas de un pilar, haz clic en **Guardar**
2. Puedes navegar entre pilares y volver para modificar respuestas
3. El progreso se guarda automáticamente

#### Ver Progreso

1. En la página de encuesta, puedes ver el progreso general
2. Se muestra:
   - Número de pilares completados
   - Número de preguntas respondidas
   - Porcentaje de completitud

#### Finalizar Encuesta

1. Una vez que hayas respondido todas las preguntas obligatorias
2. Revisa tus respuestas navegando por los pilares
3. El sistema guardará automáticamente todas las respuestas

**Nota**: 
- Puedes guardar respuestas parciales y continuar más tarde
- Las respuestas se pueden modificar mientras la asignación esté activa
- Si la asignación no es anónima, debes especificar el empleado al iniciar

---

## Dashboard y Analytics

### Acceder al Dashboard

1. Navega a **Resultados** en el menú lateral
2. Se mostrará el dashboard principal con métricas y visualizaciones

### Vistas Disponibles

#### Vista por Empresa

- **ADMIN, ANALISTA, USUARIO**: Ven solo los datos de su empresa asignada
- Muestra métricas agregadas de todas las encuestas de la empresa

#### Vista Global

- **ADMIN_SISTEMA**: Puede ver una vista global de todas las empresas
- Selecciona "Todas las empresas" o deja el filtro de empresa vacío
- Agrupa datos de todas las empresas sin filtrar por empresa específica

### Filtros Disponibles

El dashboard permite filtrar datos por:

- **Empresa**: Selecciona una empresa específica (o todas para ADMIN_SISTEMA)
- **Rango de fechas**: Fecha desde y fecha hasta
- **Departamentos**: Selecciona uno o más departamentos
- **Empleados**: Selecciona uno o más empleados específicos
- **Pilares**: Selecciona uno o más pilares para analizar

### Métricas Mostradas

El dashboard muestra diversas métricas y visualizaciones:

1. **Resumen General**:
   - Total de respuestas
   - Número de empleados que han respondido
   - Porcentaje de completitud
   - Promedios por pilar

2. **Gráficos por Pilar**:
   - Distribución de respuestas por pilar
   - Niveles de madurez alcanzados
   - Comparativas entre pilares

3. **Análisis Temporal** (si está habilitado):
   - Evolución de las respuestas a lo largo del tiempo
   - Tendencias por pilar

4. **Distribución de Respuestas**:
   - Gráficos de barras o pastel
   - Distribución de respuestas Likert
   - Respuestas abiertas agrupadas

### Exportar Datos

#### Exportar Dashboard

1. En el dashboard, aplica los filtros deseados
2. Haz clic en el botón **Exportar** o **Descargar**
3. Selecciona el formato:
   - **PDF**: Para reportes formateados
   - **Excel/CSV**: Para análisis de datos
4. El archivo se descargará automáticamente

#### Exportar Respuestas

1. Desde el dashboard o la sección de analytics
2. Haz clic en **Exportar Respuestas**
3. Se generará un archivo CSV con todas las respuestas según los filtros aplicados
4. El archivo incluye:
   - ID de respuesta
   - Fecha de respuesta
   - Información de asignación
   - Pregunta y pilar
   - Información del empleado (si no es anónimo)
   - Valor de la respuesta

### Interpretación de Resultados

#### Niveles de Madurez

TacticSphere evalúa cinco niveles de madurez:

1. **Nivel 1 - Inicial**: Procesos ad-hoc, sin estandarización
2. **Nivel 2 - Repetible**: Procesos básicos establecidos
3. **Nivel 3 - Definido**: Procesos documentados y estandarizados
4. **Nivel 4 - Gestionado**: Procesos medidos y controlados
5. **Nivel 5 - Optimizado**: Mejora continua y optimización

#### Interpretación de Gráficos

- **Gráficos de barras**: Muestran la distribución de respuestas
- **Gráficos de líneas**: Muestran tendencias temporales
- **Gráficos de pastel**: Muestran proporciones de respuestas
- **Mapas de calor**: Comparan múltiples pilares o departamentos

---

## Registro de Auditoría

### ¿Qué es el Registro de Auditoría?

El registro de auditoría mantiene un historial completo de todas las acciones realizadas en el sistema, incluyendo:

- Inicios de sesión
- Creación, edición y eliminación de entidades
- Cambios de contraseña
- Exportaciones de reportes
- Acciones administrativas

### Acceder al Registro de Auditoría

**Solo ADMIN_SISTEMA y ADMIN pueden acceder al registro de auditoría.**

1. Navega a **Registro de auditoría** en el menú lateral
2. Se mostrará una tabla con los registros de auditoría

**Nota**: 
- **ADMIN_SISTEMA**: Ve todos los registros del sistema
- **ADMIN**: Ve solo registros de su empresa

### Filtrar Registros

Puedes filtrar los registros de auditoría por:

- **Rango de fechas**: Fecha desde y fecha hasta
- **Empresa**: ID o nombre de empresa
- **Usuario**: ID, email o rol del usuario
- **Acción**: Tipo de acción realizada (LOGIN, USER_CREATE, etc.)
- **Tipo de entidad**: Tipo de entidad afectada (Usuario, Empresa, etc.)
- **Búsqueda de texto**: Busca en notas y campos adicionales

### Información Mostrada

Cada registro de auditoría muestra:

- **Fecha y hora**: Cuándo ocurrió la acción
- **Usuario**: Email y rol del usuario que realizó la acción
- **Empresa**: Empresa asociada (si aplica)
- **Acción**: Tipo de acción (LOGIN, CREATE, UPDATE, DELETE, etc.)
- **Entidad**: Tipo y ID de la entidad afectada
- **Notas**: Descripción adicional de la acción
- **IP y User Agent**: Información del cliente
- **Método y Ruta**: Endpoint de la API utilizado
- **Cambios**: Diferencias antes/después (si aplica)

### Exportar Registros de Auditoría

1. Aplica los filtros deseados
2. Haz clic en **Exportar** o **Descargar CSV**
3. Se generará un archivo CSV con todos los registros filtrados
4. El archivo incluye todas las columnas de información

### Eliminar Registros de Auditoría

**Solo ADMIN_SISTEMA puede eliminar registros de auditoría.**

#### Eliminar un Registro Individual

1. Localiza el registro en la lista
2. Haz clic en **Eliminar**
3. Confirma tu contraseña para autorizar la eliminación
4. Confirma la acción

#### Vaciar Todo el Registro

1. En la página de auditoría, haz clic en **Vaciar Registro** o **Limpiar Todo**
2. Confirma tu contraseña
3. Opcionalmente, puedes generar un respaldo antes de vaciar:
   - Haz clic en **Respaldo y Vaciar**
   - Se descargará un CSV con todos los registros
   - Luego se vaciará el registro

**Advertencia**: Vaciar el registro de auditoría es una acción irreversible. Asegúrate de generar un respaldo si necesitas conservar los datos.

---

## Solicitudes de Consultoría

### ¿Qué son las Solicitudes de Consultoría?

Las solicitudes de consultoría son leads generados desde la página pública de TacticSphere cuando visitantes interesados solicitan información sobre los servicios de consultoría.

### Ver Solicitudes de Consultoría

**Solo ADMIN_SISTEMA y ADMIN pueden ver solicitudes de consultoría.**

1. Navega a **Empresas** en el menú lateral
2. Si hay solicitudes pendientes, verás un badge de notificación rojo con el número de solicitudes
3. Accede a la sección de solicitudes de consultoría
4. Se mostrará una lista con:
   - Nombre de la empresa
   - Email de contacto
   - Fecha de solicitud

### Gestionar Solicitudes

1. Revisa las solicitudes pendientes
2. Puedes contactar directamente a los solicitantes usando el email proporcionado
3. Una vez procesada una solicitud, puedes eliminarla:
   - Haz clic en **Eliminar** en la solicitud
   - Confirma la eliminación

### Eliminar Todas las Solicitudes

1. En la página de solicitudes, haz clic en **Limpiar Todo** o **Eliminar Todas**
2. Confirma la acción
3. Todas las solicitudes serán eliminadas

---

## Flujos de Trabajo Comunes

### Flujo 1: Configuración Inicial de una Nueva Empresa

**Rol requerido: ADMIN_SISTEMA**

1. **Crear la empresa**:
   - Ve a **Empresas** → **Nueva Empresa**
   - Completa nombre, RUT, giro
   - Agrega departamentos iniciales si es necesario
   - Guarda

2. **Crear pilares**:
   - Ve a **Pilares** → **Nuevo Pilar**
   - Crea los pilares necesarios (Infraestructura, Big Data, BI, IA, etc.)
   - Asigna pesos a cada pilar

3. **Crear preguntas**:
   - Ve a **Preguntas**
   - Para cada pilar, crea las preguntas de evaluación
   - Define tipos (LIKERT, ABIERTA, SI_NO)
   - Marca preguntas obligatorias
   - Asigna pesos

4. **Crear cuestionario**:
   - Crea un cuestionario con todas las preguntas
   - Publica el cuestionario

5. **Crear usuarios**:
   - Ve a **Usuarios** → **Nuevo Usuario**
   - Crea al menos un usuario ADMIN para la empresa
   - Crea usuarios ANALISTA si es necesario

6. **Crear asignación**:
   - Crea una asignación del cuestionario a la empresa
   - Define fechas de vigencia
   - Configura si será anónima o no

### Flujo 2: Realizar una Evaluación Completa

**Roles: ADMIN, ANALISTA**

1. **Preparar la encuesta** (ADMIN):
   - Verifica que existe un cuestionario PUBLICADO
   - Verifica que existe una asignación activa
   - Si no existe, créalas siguiendo el Flujo 1

2. **Responder la encuesta** (ANALISTA o ADMIN):
   - Ve a **Encuesta**
   - Selecciona la empresa
   - Inicia la encuesta
   - Navega por los pilares
   - Responde todas las preguntas obligatorias
   - Guarda las respuestas

3. **Ver resultados** (ADMIN, ANALISTA, USUARIO):
   - Ve a **Resultados**
   - Aplica filtros si es necesario
   - Revisa métricas y gráficos
   - Exporta reportes si es necesario

### Flujo 3: Gestionar Usuarios de una Empresa

**Rol: ADMIN**

1. **Crear nuevos usuarios**:
   - Ve a **Usuarios** → **Nuevo Usuario**
   - Completa el formulario
   - Asigna rol ANALISTA o USUARIO
   - Asigna a la empresa

2. **Gestionar solicitudes de contraseña**:
   - Si hay solicitudes pendientes, verás un badge
   - Accede a la sección de solicitudes
   - Restablece la contraseña del usuario
   - La solicitud se resolverá automáticamente

3. **Desactivar usuarios**:
   - Edita el usuario
   - Cambia el estado a inactivo
   - Guarda

### Flujo 4: Analizar Resultados y Generar Reportes

**Roles: ADMIN, ANALISTA, USUARIO**

1. **Acceder al dashboard**:
   - Ve a **Resultados**

2. **Aplicar filtros**:
   - Selecciona rango de fechas
   - Filtra por departamentos si es necesario
   - Filtra por pilares específicos
   - Filtra por empleados si es necesario

3. **Analizar métricas**:
   - Revisa el resumen general
   - Analiza gráficos por pilar
   - Revisa tendencias temporales (si están disponibles)

4. **Exportar datos**:
   - Exporta el dashboard como PDF o Excel
   - Exporta respuestas como CSV para análisis detallado

5. **Interpretar resultados**:
   - Identifica pilares con menor madurez
   - Prioriza áreas de mejora
   - Genera un plan de acción

---

## Solución de Problemas

### Problemas de Acceso

#### No puedo iniciar sesión

**Posibles causas y soluciones:**

1. **Credenciales incorrectas**:
   - Verifica que el email y contraseña sean correctos
   - Asegúrate de que no haya espacios adicionales
   - Verifica que el bloqueo de mayúsculas esté desactivado

2. **Usuario desactivado**:
   - Contacta a un administrador del sistema
   - Un ADMIN o ADMIN_SISTEMA debe activar tu cuenta

3. **Problemas de conexión**:
   - Verifica tu conexión a internet
   - Intenta refrescar la página
   - Limpia la caché del navegador

#### Olvidé mi contraseña

1. Haz clic en **¿Olvidaste tu contraseña?** en la página de login
2. Ingresa tu email
3. Se generará una solicitud de cambio
4. Contacta a un administrador para que procese tu solicitud
5. El administrador te notificará cuando se haya restablecido

### Problemas con Encuestas

#### No puedo ver la opción de Encuesta en el menú

**Causa**: Tu rol no tiene permisos para acceder a encuestas.

**Solución**: 
- Solo los roles ANALISTA, ADMIN y ADMIN_SISTEMA pueden acceder a encuestas
- Contacta a un administrador si necesitas este acceso

#### No hay asignaciones activas

**Causa**: No existe una asignación activa para tu empresa o el período de vigencia ha expirado.

**Solución**:
1. Un ADMIN debe crear una nueva asignación
2. Verifica que las fechas de inicio y cierre sean correctas
3. Asegúrate de que el cuestionario esté PUBLICADO

#### No puedo guardar respuestas

**Posibles causas:**

1. **Asignación fuera de vigencia**:
   - Verifica las fechas de la asignación
   - Contacta a un ADMIN si necesitas extender el período

2. **Preguntas obligatorias sin responder**:
   - Asegúrate de responder todas las preguntas marcadas como obligatorias (*)

3. **Problemas de conexión**:
   - Verifica tu conexión a internet
   - Intenta guardar nuevamente

### Problemas con Permisos

#### No puedo ver ciertas opciones del menú

**Causa**: Tu rol no tiene los permisos necesarios.

**Solución**: 
- Revisa la sección [Roles y Permisos](#roles-y-permisos) de este manual
- Contacta a un ADMIN o ADMIN_SISTEMA si necesitas permisos adicionales

#### No puedo editar o eliminar ciertos elementos

**Causa**: Restricciones de permisos según tu rol.

**Solución**:
- **ADMIN** solo puede gestionar elementos de su empresa
- **ADMIN_SISTEMA** tiene acceso completo
- Contacta a un ADMIN_SISTEMA si necesitas realizar cambios fuera de tu alcance

### Problemas Técnicos

#### La página no carga correctamente

**Soluciones:**

1. **Refresca la página** (F5 o Ctrl+R)
2. **Limpia la caché del navegador**:
   - Chrome/Edge: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
3. **Verifica que JavaScript esté habilitado**
4. **Intenta en otro navegador**
5. **Verifica tu conexión a internet**

#### Los gráficos no se muestran

**Soluciones:**

1. Verifica que tu navegador soporte JavaScript moderno
2. Actualiza tu navegador a la última versión
3. Desactiva extensiones que puedan interferir (bloqueadores de anuncios, etc.)
4. Intenta en modo incógnito/privado

#### Error al exportar datos

**Soluciones:**

1. Verifica que tengas espacio suficiente en disco
2. Intenta exportar con menos filtros (menos datos)
3. Verifica tu conexión a internet
4. Intenta nuevamente después de unos momentos

### Contactar Soporte

Si continúas experimentando problemas:

1. **Revisa este manual** para ver si hay información relevante
2. **Revisa el registro de auditoría** para ver si hay errores registrados
3. **Contacta al soporte técnico**:
   - Email: soporte@tacticsphere.com
   - Incluye detalles del problema, tu rol y pasos para reproducirlo

---

## Apéndices

### A. Requisitos del Sistema

#### Navegadores Soportados

- Google Chrome (últimas 2 versiones)
- Mozilla Firefox (últimas 2 versiones)
- Microsoft Edge (últimas 2 versiones)
- Safari (últimas 2 versiones)

#### Requisitos Técnicos

- JavaScript habilitado
- Conexión a internet estable
- Resolución de pantalla mínima: 1024x768

### B. Glosario de Términos

- **Asignación**: Vinculación de un cuestionario a una empresa, departamento o empleado con un período de vigencia
- **Cuestionario**: Conjunto de preguntas agrupadas que se utilizan para evaluar la madurez tecnológica
- **Empresa**: Organización que utiliza TacticSphere para evaluar su madurez tecnológica
- **Pilar**: Categoría principal de evaluación (Infraestructura, Big Data, BI, IA)
- **Pregunta**: Elemento individual de evaluación dentro de un pilar
- **Respuesta**: Valor proporcionado por un usuario a una pregunta específica
- **Madurez**: Nivel de desarrollo y estandarización de procesos tecnológicos (1-5)

### C. Mejores Prácticas

1. **Gestión de Usuarios**:
   - Asigna roles apropiados según las responsabilidades
   - Mantén las contraseñas seguras
   - Desactiva usuarios que ya no necesiten acceso

2. **Creación de Preguntas**:
   - Formula preguntas claras y específicas
   - Usa tipos de pregunta apropiados
   - Asigna pesos considerando la importancia relativa

3. **Gestión de Encuestas**:
   - Planifica las fechas de asignación con anticipación
   - Comunica a los usuarios cuándo estarán disponibles las encuestas
   - Revisa regularmente el progreso de las respuestas

4. **Análisis de Resultados**:
   - Usa filtros para análisis específicos
   - Exporta datos regularmente para respaldo
   - Compara resultados a lo largo del tiempo

---

## Conclusión

Este manual cubre las funcionalidades principales de TacticSphere. Para preguntas adicionales o soporte técnico, contacta a soporte@tacticsphere.com.

**Última actualización**: 2025

---

*TacticSphere - Diagnostica la madurez tecnológica de tu organización con claridad*


