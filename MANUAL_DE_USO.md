# Manual de Uso - TacticSphere

**Versión:** 1.0  FINAL
**Fecha:** 19-01-2025

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Roles y Permisos](#roles-y-permisos)
4. [Navegación Principal](#navegación-principal)
5. [Gestión de Empresas](#gestión-de-empresas)
6. [Gestión de Usuarios](#gestión-de-usuarios)
7. [Gestión de Estructura Organizacional](#gestión-de-estructura-organizacional)
8. [Gestión de Pilares y Preguntas](#gestión-de-pilares-y-preguntas)
9. [Cuestionarios y Asignaciones](#cuestionarios-y-asignaciones)
10. [Responder Encuestas](#responder-encuestas)
11. [Dashboard y Reportes](#dashboard-y-reportes)
12. [Auditoría](#auditoría)
13. [Solución de Problemas](#solución-de-problemas)

---

## Introducción

TacticSphere es una plataforma de evaluación de madurez tecnológica basada en ITIL 4. Permite a las organizaciones medir su nivel de madurez en diferentes pilares tecnológicos mediante encuestas estructuradas y generar reportes analíticos detallados.

### Características Principales

- **Multi-empresa:** Soporte para múltiples organizaciones con aislamiento de datos
- **Roles diferenciados:** Administradores, Analistas y Usuarios con permisos específicos
- **Encuestas estructuradas:** Sistema de pilares, preguntas y cuestionarios versionados
- **Analytics avanzado:** Dashboard con KPIs, gráficos y reportes exportables
- **Auditoría completa:** Registro de todas las operaciones críticas

---

## Acceso al Sistema

### Inicio de Sesión

1. Accede a la URL del sistema (ej: `http://localhost:4200`)
2. Serás redirigido automáticamente a la pantalla de login
3. Ingresa tu **correo electrónico** y **contraseña**
4. Haz clic en **"Iniciar sesión"**

**Nota:** Las contraseñas deben tener mínimo 10 caracteres.

### Recuperación de Contraseña

1. En la pantalla de login, haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu correo electrónico
3. Se creará una solicitud de cambio de contraseña
4. Un Administrador del Sistema debe atender la solicitud desde la sección de Usuarios

### Cierre de Sesión

1. Haz clic en el botón **"Salir"** en la esquina superior derecha
2. Serás redirigido a la pantalla de login
3. Tu sesión se cerrará automáticamente

**Importante:** La sesión se cierra automáticamente después de 15 minutos de inactividad. Recibirás una advertencia 1 minuto antes del cierre.

---

## Roles y Permisos

El sistema tiene 4 roles principales:

### ADMIN_SISTEMA (Administrador del Sistema)
- **Acceso completo** a todas las funcionalidades
- Puede crear y gestionar empresas
- Puede crear usuarios de cualquier rol
- Acceso a auditoría completa
- Puede gestionar solicitudes de cambio de contraseña

### ADMIN (Administrador de Empresa)
- Gestiona usuarios de su empresa (roles: ANALISTA, USUARIO)
- Gestiona empleados y departamentos de su empresa
- Crea y gestiona pilares, preguntas y cuestionarios
- Crea asignaciones de encuestas
- Accede a dashboard y reportes de su empresa
- Puede responder encuestas

### ANALISTA (Analista/Consultor)
- Accede a dashboard y reportes (solo lectura)
- Puede responder encuestas
- No puede modificar configuración (pilares, preguntas, umbrales)
- No puede gestionar usuarios

### USUARIO
- Solo puede responder encuestas asignadas
- Acceso limitado a reportes básicos
- No puede modificar ninguna configuración

---

## Navegación Principal

### Menú Lateral

El menú lateral se encuentra en la parte izquierda de la pantalla y contiene:

- **Resultados:** Dashboard con analytics y reportes
- **Panel admin:** (Solo ADMIN/ADMIN_SISTEMA) Acceso a funciones administrativas
- **Empresas:** Gestión de empresas
- **Pilares:** Gestión de pilares de evaluación
- **Preguntas:** Gestión de preguntas
- **Usuarios:** Gestión de usuarios del sistema
- **Registro de auditoría:** (Solo ADMIN_SISTEMA) Vista de logs de auditoría
- **Encuesta:** Responder encuestas asignadas

### Breadcrumbs

La barra de navegación superior muestra tu ubicación actual en el sistema.

---

## Gestión de Empresas

**Acceso:** Solo ADMIN_SISTEMA  
**Ruta:** `/admin/companies`

### Crear una Empresa

1. Accede a **"Empresas"** en el menú lateral
2. Completa el formulario:
   - **Nombre:** Nombre de la empresa (obligatorio)
   - **RUT:** RUT de la empresa (opcional)
   - **Giro:** Rubro o giro comercial (opcional)
   - **Departamentos:** Lista separada por comas (ej: "Ventas, Marketing, TI")
3. Haz clic en **"Crear empresa"**

### Eliminar una Empresa

1. En el listado de empresas, localiza la empresa
2. Haz clic en **"Eliminar"**
3. Confirma la eliminación

**Nota:** La eliminación es "soft delete" (la empresa se marca como inactiva pero los datos se preservan).

### Gestionar Solicitudes de Consultoría

En la sección inferior de la página de Empresas, puedes ver las solicitudes recibidas desde la landing pública:

- **Aceptar:** Procesa la solicitud (la elimina del listado)
- **Eliminar:** Elimina la solicitud
- **Limpiar solicitudes:** Elimina todas las solicitudes de una vez

---

## Gestión de Usuarios

**Acceso:** ADMIN_SISTEMA, ADMIN  
**Ruta:** `/admin/users`

### Crear un Usuario

1. Haz clic en **"Crear usuario"**
2. Completa el formulario:
   - **Nombre:** Nombre completo del usuario
   - **Email:** Correo electrónico (debe ser único)
   - **Contraseña temporal:** Mínimo 10 caracteres
   - **Rol:** Selecciona el rol (ADMIN, ANALISTA, USUARIO)
   - **Empresa:** Selecciona la empresa o deja "Sin empresa"
3. Haz clic en **"Crear usuario"**

**Nota:** Los ADMIN solo pueden crear usuarios de su empresa con roles ANALISTA o USUARIO.

### Cambiar Rol de un Usuario

1. En el listado de usuarios, localiza el usuario
2. Selecciona el nuevo rol en el dropdown
3. El cambio se aplica automáticamente

**Restricciones:**
- ADMIN no puede asignar rol ADMIN_SISTEMA
- No se puede cambiar el rol de un ADMIN_SISTEMA

### Activar/Desactivar Usuario

1. En el listado, localiza el usuario
2. Haz clic en el botón de estado (Activo/Inactivo)
3. El estado cambia inmediatamente

**Nota:** No se puede desactivar un ADMIN_SISTEMA.

### Cambiar Contraseña de un Usuario

1. Localiza el usuario en el listado
2. Haz clic en **"Cambiar contraseña"**
3. Ingresa la nueva contraseña (mínimo 10 caracteres)
4. Confirma el cambio

### Atender Solicitudes de Cambio de Contraseña

**Solo ADMIN_SISTEMA:**

1. En la sección "Solicitudes de cambio de contraseña", verás las solicitudes pendientes
2. Haz clic en **"Atender"** en la solicitud correspondiente
3. Ingresa la nueva contraseña
4. Confirma el cambio

### Eliminar un Usuario

1. Localiza el usuario en el listado
2. Haz clic en **"Eliminar"**
3. Confirma la eliminación

**Nota:** No se puede eliminar un ADMIN_SISTEMA.

### Filtrar Usuarios por Empresa

1. Haz clic en **"Filtros"**
2. Selecciona una empresa del dropdown
3. El listado se actualiza automáticamente

---

## Gestión de Estructura Organizacional

### Departamentos

Los departamentos se crean automáticamente al crear una empresa (si se especifican en el campo "Departamentos"). También puedes agregarlos manualmente:

**Ruta:** `/admin/companies` (al seleccionar una empresa)

1. Selecciona una empresa
2. Haz clic en **"Agregar departamento"**
3. Ingresa el nombre del departamento
4. Confirma la creación

### Empleados

**Ruta:** `/survey` (sección de gestión de colaboradores)

#### Crear un Empleado

1. Accede a **"Encuesta"** en el menú
2. Haz clic en **"Ingresar colaborador"**
3. Completa el formulario:
   - **Empresa:** Selecciona la empresa
   - **Departamento:** Selecciona el departamento (opcional)
   - **Nombre:** Nombre del empleado (obligatorio)
   - **Apellidos:** Apellidos (obligatorio)
   - **RUT:** RUT del empleado (opcional)
   - **Email:** Correo electrónico (opcional)
   - **Cargo:** Cargo o posición (opcional)
4. Haz clic en **"Ingresar colaborador"**

#### Buscar Empleados

1. En la sección de búsqueda, ingresa un término (nombre, email, RUT)
2. El sistema buscará automáticamente después de 400ms
3. También puedes hacer clic en **"Buscar"** para forzar la búsqueda

#### Editar un Empleado

1. En los resultados de búsqueda, localiza el empleado
2. Haz clic en **"Editar"**
3. Modifica los campos necesarios
4. Haz clic en **"Guardar cambios"**

---

## Gestión de Pilares y Preguntas

**Acceso:** ADMIN_SISTEMA, ADMIN  
**Rutas:** `/admin/pillars`, `/admin/questions`

### Pilares

Los pilares representan las áreas de evaluación (ej: Tecnología, Procesos, Estrategia, Talento, Seguridad).

#### Crear un Pilar

1. Accede a **"Pilares"** en el menú
2. Completa el formulario:
   - **Nombre:** Nombre del pilar (ej: "Infraestructura & Cloud")
   - **Descripción:** Descripción detallada (opcional)
   - **Peso:** Peso del pilar para cálculos (por defecto: 1)
   - **Empresa:** Deja vacío para pilar global, o selecciona una empresa
3. Haz clic en **"Crear pilar"**

**Nota:** Los pilares globales (sin empresa) están disponibles para todas las empresas.

#### Editar un Pilar

1. En el listado, localiza el pilar
2. Haz clic en **"Editar"**
3. Modifica los campos
4. Guarda los cambios

#### Eliminar un Pilar

1. Localiza el pilar en el listado
2. Haz clic en **"Eliminar"**
3. Si el pilar tiene preguntas asociadas, se te pedirá confirmación para eliminación en cascada

### Preguntas

Las preguntas se asocian a un pilar y pueden ser de tres tipos: Likert (1-5), Sí/No, o Abierta.

#### Crear una Pregunta

1. Accede a **"Preguntas"** en el menú
2. Selecciona el **Pilar** al que pertenecerá la pregunta
3. Completa el formulario:
   - **Enunciado:** Texto de la pregunta
   - **Tipo:** Selecciona LIKERT, SI_NO o ABIERTA
   - **Obligatoria:** Marca si la pregunta es obligatoria
   - **Peso:** Peso de la pregunta para cálculos (por defecto: 1)
   - **Respuesta esperada:** (Opcional) Respuesta ideal o referencia
4. Haz clic en **"Crear pregunta"**

#### Editar una Pregunta

1. En el listado, localiza la pregunta
2. Haz clic en **"Editar"**
3. Modifica los campos necesarios
4. Guarda los cambios

#### Eliminar una Pregunta

1. Localiza la pregunta en el listado
2. Haz clic en **"Eliminar"**
3. Confirma la eliminación

---

## Cuestionarios y Asignaciones

### Cuestionarios

Los cuestionarios son colecciones de preguntas que se agrupan para formar una encuesta.

**Estado de un Cuestionario:**
- **BORRADOR:** En edición, no se puede usar en asignaciones
- **PUBLICADO:** Listo para usar en asignaciones
- **ARCHIVADO:** Ya no se usa (futuro)

**Nota:** Actualmente, el sistema crea cuestionarios automáticamente con todas las preguntas disponibles. La gestión manual de cuestionarios está disponible a través de la API.

### Asignaciones

Las asignaciones vinculan un cuestionario a un alcance (empresa, departamento o empleado) con fechas de vigencia.

**Tipos de Alcance:**
- **EMPRESA:** La encuesta aplica a toda la empresa
- **DEPARTAMENTO:** La encuesta aplica a un departamento específico
- **EMPLEADO:** La encuesta aplica a un empleado específico

**Modo Anónimo:**
- Si está activado, las respuestas no se vinculan a empleados específicos
- Útil para encuestas de clima organizacional

**Nota:** La creación de asignaciones se realiza principalmente a través de la API. El sistema puede crear asignaciones automáticamente cuando se inicia una encuesta.

---

## Responder Encuestas

**Ruta:** `/survey`  
**Acceso:** ADMIN_SISTEMA, ADMIN, ANALISTA

### Flujo de Respuesta

1. **Seleccionar Empresa y Empleado:**
   - Selecciona la empresa en el formulario
   - Ingresa o busca un colaborador
   - Si la asignación es anónima, no necesitas seleccionar empleado

2. **Iniciar Encuesta:**
   - El sistema detecta automáticamente si hay una asignación vigente
   - Si no existe, se crea una automáticamente
   - La encuesta se inicia automáticamente cuando hay empresa y empleado (o si es anónima)

3. **Ver Progreso:**
   - En la tarjeta "Progreso general" verás:
     - Total de preguntas
     - Preguntas respondidas
     - Porcentaje de avance
   - Cada pilar muestra su progreso individual

4. **Responder por Pilar:**
   - Selecciona un pilar en la barra lateral izquierda
   - Responde las preguntas del pilar:
     - **Likert (1-5):** Selecciona un valor del 1 al 5
       - 1 = Inicial
       - 2 = Básico
       - 3 = Intermedio
       - 4 = Avanzado
       - 5 = Innovador
     - **Sí/No:** Selecciona SI o NO
     - **Abierta:** Escribe tu respuesta en el campo de texto
   - Las preguntas obligatorias están marcadas y deben responderse

5. **Guardar Respuestas:**
   - Haz clic en **"Guardar respuestas"** para guardar el progreso del pilar actual
   - Puedes guardar parcialmente y continuar después
   - Las respuestas se actualizan si ya existían

6. **Enviar Encuesta Completa:**
   - Cuando todas las preguntas obligatorias estén respondidas
   - Haz clic en **"Enviar encuesta"** para finalizar

### Escala Likert

El sistema usa una escala de 5 niveles basada en ITIL 4:

- **1 - Inicial:** Procesos ad-hoc, sin documentación
- **2 - Básico:** Procesos documentados pero no estandarizados
- **3 - Intermedio:** Procesos estandarizados y medidos
- **4 - Avanzado:** Procesos optimizados y mejorados continuamente
- **5 - Innovador:** Liderazgo en mejores prácticas, innovación activa

Puedes expandir/colapsar la información de la escala haciendo clic en **"Mostrar"** / **"Minimizar"**.

### Validaciones

- Las preguntas obligatorias deben responderse antes de guardar
- El sistema valida que todas las obligatorias estén completas
- Si falta alguna, se resalta en rojo y se muestra un mensaje de error

---

## Dashboard y Reportes

**Ruta:** `/results` o `/admin/dashboards`  
**Acceso:** Todos los roles (con restricciones según rol)

### Acceder al Dashboard

1. Haz clic en **"Resultados"** en el menú lateral
2. Selecciona la empresa en el filtro superior
3. El dashboard se carga automáticamente

### Filtros Disponibles

- **Empresa:** Selecciona la empresa a analizar
- **Fecha desde / hasta:** Rango de fechas para las respuestas
- **Departamentos:** Filtra por uno o más departamentos
- **Empleados:** Filtra por empleados específicos
- **Pilares:** Filtra por pilares específicos

### KPIs Principales

El dashboard muestra:

- **Promedio Global:** Puntaje promedio de todas las respuestas
- **Pilar Más Fuerte:** Pilar con mayor puntaje
- **Pilar Más Débil:** Pilar con menor puntaje
- **Brecha entre Pilares:** Diferencia entre el más fuerte y el más débil
- **Cobertura:** Porcentaje de empleados que han respondido
- **Tendencia 30 días:** Variación porcentual respecto al periodo anterior

### Gráficos Disponibles

1. **Distribución Global:**
   - Muestra la distribución de respuestas por nivel Likert (1-5)
   - Agrupado por pilar

2. **Heatmap por Departamento:**
   - Comparación visual de puntajes por departamento y pilar
   - Colores indican el nivel de madurez

3. **Timeline:**
   - Evolución del puntaje a lo largo del tiempo
   - Permite ver tendencias

4. **Ranking:**
   - Top 5 departamentos con mejor puntaje
   - Top 5 departamentos con menor puntaje

5. **Distribución por Departamento:**
   - Desglose detallado de cada departamento
   - Comparación con el promedio de la empresa

6. **Cobertura por Departamento:**
   - Porcentaje de respuesta por departamento
   - Total de empleados vs. respondidos

### Exportar Reportes

#### Exportar a CSV

1. Aplica los filtros deseados
2. Haz clic en **"Exportar CSV"**
3. Se descargará un archivo CSV con todas las respuestas filtradas

**Contenido del CSV:**
- ID de respuesta
- Fecha de respuesta
- Información de asignación
- Pregunta y pilar
- Información del empleado
- Valor de la respuesta
- Respuesta esperada (solo para ADMIN/ANALISTA)

#### Exportar Dashboard a PDF

1. Aplica los filtros deseados
2. Haz clic en **"Generar reporte"**
3. Selecciona los formatos deseados (PDF, CSV, Excel, JSON, XML)
4. Ingresa notas opcionales
5. Haz clic en **"Generar"**
6. El sistema generará y descargará los archivos

**Nota:** La exportación a PDF incluye gráficos y tablas del dashboard actual.

---

## Auditoría

**Ruta:** `/admin/auditoria`  
**Acceso:** Solo ADMIN_SISTEMA

### Ver Registros de Auditoría

1. Accede a **"Registro de auditoría"** en el menú
2. El sistema muestra los últimos 200 registros por defecto

### Filtros Disponibles

- **Fecha desde / hasta:** Rango de fechas
- **Empresa:** Filtrar por empresa
- **Usuario:** Filtrar por ID, email o rol
- **Acción:** Tipo de acción (LOGIN, USER_CREATE, etc.)
- **Tipo de entidad:** Tipo de entidad afectada
- **Búsqueda:** Búsqueda de texto libre

### Información Registrada

Cada registro incluye:
- **Fecha y hora:** Timestamp UTC
- **Usuario:** Email y rol del usuario que realizó la acción
- **Acción:** Tipo de operación
- **Entidad:** Tipo e ID de la entidad afectada
- **Notas:** Descripción de la acción
- **IP y User-Agent:** Información de la solicitud
- **Valores antes/después:** Cambios realizados (cuando aplica)

### Exportar Auditoría

1. Aplica los filtros deseados
2. Haz clic en **"Exportar CSV"**
3. Se descargará un archivo CSV con todos los registros filtrados

### Eliminar Registros

**Solo ADMIN_SISTEMA con confirmación de contraseña:**

1. Selecciona un registro
2. Haz clic en **"Eliminar"**
3. Ingresa tu contraseña para confirmar
4. El registro se elimina permanentemente

**Nota:** La eliminación de registros se registra en la auditoría.

---

## Solución de Problemas

### No puedo iniciar sesión

- Verifica que el correo y contraseña sean correctos
- Asegúrate de que tu usuario esté activo (contacta a un administrador)
- Si olvidaste tu contraseña, usa la opción de recuperación

### No veo ciertas opciones en el menú

- Verifica tu rol de usuario
- Algunas funcionalidades solo están disponibles para ciertos roles
- Contacta a un administrador si crees que deberías tener acceso

### La encuesta no se inicia

- Verifica que hayas seleccionado una empresa
- Si la asignación no es anónima, asegúrate de haber seleccionado un empleado
- Verifica que exista una asignación vigente para la empresa
- El sistema creará una automáticamente si no existe

### No puedo guardar respuestas

- Verifica que todas las preguntas obligatorias estén respondidas
- Asegúrate de que la asignación esté dentro del periodo de vigencia
- Si la asignación requiere empleado, verifica que esté seleccionado

### El dashboard no muestra datos

- Verifica que haya respuestas guardadas para la empresa seleccionada
- Ajusta los filtros de fecha si es necesario
- Verifica que los empleados hayan completado las encuestas

### Error al exportar reportes

- Verifica que tengas permisos de exportación (ADMIN/ANALISTA)
- Asegúrate de que haya datos para exportar con los filtros aplicados
- Intenta con un rango de fechas más amplio

### La sesión se cierra automáticamente

- El sistema cierra la sesión después de 15 minutos de inactividad
- Recibirás una advertencia 1 minuto antes
- Puedes extender la sesión haciendo clic en el botón correspondiente
- Cualquier actividad (clic, teclado, scroll) reinicia el contador

---

## Consejos y Mejores Prácticas

### Para Administradores

1. **Organización de Pilares:**
   - Crea pilares globales para preguntas comunes a todas las empresas
   - Usa pilares específicos de empresa para necesidades particulares

2. **Gestión de Preguntas:**
   - Marca como obligatorias solo las preguntas críticas
   - Usa la descripción de pilares para contexto
   - Define respuestas esperadas para referencia

3. **Asignaciones:**
   - Define periodos de vigencia realistas
   - Usa el modo anónimo para encuestas de clima organizacional
   - Crea asignaciones específicas por departamento cuando sea necesario

4. **Usuarios:**
   - Asigna roles apropiados según las responsabilidades
   - Mantén usuarios inactivos en lugar de eliminarlos (para auditoría)
   - Usa contraseñas temporales seguras (mínimo 10 caracteres)

### Para Respondientes

1. **Completar Encuestas:**
   - Responde todas las preguntas obligatorias
   - Usa la escala Likert de manera consistente
   - Guarda frecuentemente para no perder progreso
   - Revisa tus respuestas antes de enviar

2. **Entender la Escala:**
   - Lee la descripción de cada nivel Likert
   - Sé honesto en tus respuestas
   - Considera el contexto de ITIL 4 al evaluar

---

## Glosario

- **Asignación:** Vinculación de un cuestionario a un alcance (empresa/departamento/empleado) con fechas de vigencia
- **Cuestionario:** Colección de preguntas agrupadas para formar una encuesta
- **Empleado:** Persona que responde encuestas (colaborador)
- **Empresa:** Organización cliente que usa el sistema
- **Pilar:** Área de evaluación (ej: Tecnología, Procesos)
- **Pregunta:** Item individual de una encuesta
- **Respuesta:** Valor proporcionado por un empleado a una pregunta
- **Usuario:** Persona con acceso al sistema (diferente de empleado)

---

## Soporte

Para problemas técnicos o consultas:
- **Email:** contacto@tacticsphere.com
- **Documentación técnica:** Ver `FUNCIONALIDADES_Y_COMPONENTES.md`

---

**Fin del Manual de Uso**

