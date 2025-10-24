// ===== Enums =====
export type RolEnum = 'ADMIN_SISTEMA' | 'ADMIN' | 'ANALISTA' | 'USUARIO';
export type TipoPreguntaEnum = 'LIKERT' | 'ABIERTA' | 'SI_NO';
export type AlcanceTipo = 'EMPRESA' | 'DEPARTAMENTO' | 'EMPLEADO'; // ✅ NUEVO

// ===== Auth =====
export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}

// ===== Básicos =====
export interface Departamento {
  id: number;
  nombre: string;
}

export interface DepartamentoCreate {
  nombre: string;
}

export interface Empresa {
  id: number;
  nombre: string;
  rut?: string | null;
  giro?: string | null;
  activa: boolean;                // obligatorio para evitar conflictos
  departamentos?: Departamento[];
}

export interface EmpresaCreate {
  nombre: string;
  rut?: string | null;
  giro?: string | null;
  // para el form de alta rápida (nombres separados por coma)
  departamentos?: string[] | null;
}

// ===== Usuarios =====
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolEnum;
  empresa_id?: number | null;
  activo: boolean;
}

export interface UsuarioCreate {
  nombre: string;
  email: string;
  password: string;
  rol: RolEnum;
  empresa_id?: number | null;
}

export interface UsuarioUpdate {
  nombre?: string;
  email?: string;
  rol?: RolEnum;
  empresa_id?: number | null;
  activo?: boolean;
}

export interface UsuarioPasswordReset {
  new_password: string;
}

// ===== Empleados =====
export interface Empleado {
  id: number;
  empresa_id: number;
  departamento_id?: number | null;
  nombre: string;
  email?: string | null;
  cargo?: string | null;
}

export interface EmpleadoCreate {
  empresa_id: number;
  nombre: string;
  email?: string | null;
  cargo?: string | null;
  departamento_id?: number | null;
}

export interface EmpleadoUpdate {
  nombre?: string;
  email?: string | null;
  cargo?: string | null;
  departamento_id?: number | null;
}

// ===== Pilares / Preguntas =====
export interface Pilar {
  id: number;
  empresa_id: number;
  nombre: string;
  descripcion?: string | null;
  peso: number;
}

export interface PilarCreate {
  empresa_id: number;
  nombre: string;
  descripcion?: string | null;
  peso?: number; // default 1 en backend
}

export interface Pregunta {
  id: number;
  pilar_id: number;
  enunciado: string;
  tipo: TipoPreguntaEnum;
  es_obligatoria: boolean;
  peso: number;
}

export interface PreguntaCreate {
  pilar_id: number;
  enunciado: string;
  tipo: TipoPreguntaEnum;
  es_obligatoria: boolean;
  peso: number;
}

// ===== Cuestionarios (mínimo útil) — opcional =====
export interface CuestionarioRead {
  id: number;
  empresa_id: number;
  titulo: string;
  version: number;
  estado: string;
}

/* =====================================================================
   ASIGNACIONES — alineado con endpoints del backend:
   - POST   /assignments
   - GET    /assignments?empresa_id=
   - GET    /assignments/{asignacion_id}
===================================================================== */
export interface AsignacionCreate {
  empresa_id: number;
  cuestionario_id: number;
  alcance_tipo: AlcanceTipo;
  alcance_id?: number | null;   // EMPRESA => null
  fecha_inicio: string;         // ISO
  fecha_cierre: string;         // ISO
  anonimo: boolean;
}

export interface AsignacionRead {
  id: number;
  empresa_id: number;
  cuestionario_id: number;
  alcance_tipo: AlcanceTipo;
  alcance_id?: number | null;
  fecha_inicio: string;         // ISO
  fecha_cierre: string;         // ISO
  anonimo: boolean;
}

/* =====================================================================
   ENCUESTA (survey) — alineado con endpoints del backend:
   - POST   /survey/begin
   - GET    /survey/{asignacion_id}/progress?empleado_id=
   - GET    /survey/{asignacion_id}/pillars                ✅ NUEVO
   - GET    /survey/{asignacion_id}/pillars/{pilar_id}?empleado_id=
   - POST   /survey/{asignacion_id}/answers?empleado_id=
===================================================================== */

// Comienzo/validación de sesión de respuesta (por asignación)
export interface SurveyBeginRequest {
  asignacion_id: number;
  empleado_id?: number | null; // opcional (si no es anónimo)
}

export interface SurveyBeginResponse {
  asignacion_id: number;
}

// Carga de preguntas de un pilar con respuesta actual (si existe)
export interface SurveyQuestionRead {
  id: number;
  enunciado: string;
  tipo: TipoPreguntaEnum;
  es_obligatoria: boolean;
  peso: number;
  respuesta_actual?: string | null;
}

export interface PillarQuestionsResponse {
  pilar_id: number;
  pilar_nombre: string;
  preguntas: SurveyQuestionRead[];
}

// Envío en bloque (cada item es equivalente a RespuestaCreate del backend)
export interface RespuestaCreate {
  asignacion_id: number;
  pregunta_id: number;
  valor: string | null;           // ✅ permite null; backend lo tratará como '' si llega null
  empleado_id?: number | null;    // ignorado si la asignación es anónima (backend usa query empleado_id)
}

export interface BulkAnswersRequest {
  respuestas: RespuestaCreate[];
}

export interface BulkAnswersResponse {
  ok: boolean;
  creadas?: number;
  actualizadas?: number;
}

// Progreso
export interface PillarProgress {
  pilar_id: number;
  pilar_nombre: string;
  total: number;
  respondidas: number;
  progreso: number; // 0..1
}

export interface AssignmentProgress {
  total: number;
  respondidas: number;
  progreso: number; // 0..1
  por_pilar: PillarProgress[];
}

export interface Asignacion {
  id: number;
  empresa_id: number;
  cuestionario_id: number;
  alcance_tipo: 'EMPRESA' | 'DEPARTAMENTO' | 'EMPLEADO';
  alcance_id?: number | null;
  fecha_inicio: string;   // ISO string
  fecha_cierre: string;   // ISO string
  anonimo: boolean;
}