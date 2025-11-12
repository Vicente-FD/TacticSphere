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
  request_id?: number | null;
}

export interface PasswordChangeRequest {
  id: number;
  user_id: number;
  user_email: string;
  user_nombre: string;
  empresa_id?: number | null;
  created_at: string;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by_id?: number | null;
  user?: Usuario | null;
  resolved_by?: Usuario | null;
}

// ===== Empleados =====
export interface Empleado {
  id: number;
  empresa_id: number;
  departamento_id?: number | null;
  nombre: string;
  apellidos?: string | null;
  rut?: string | null;
  email?: string | null;
  cargo?: string | null;
}

export interface EmpleadoCreate {
  empresa_id: number;
  nombre: string;
  apellidos?: string | null;
  rut?: string | null;
  email?: string | null;
  cargo?: string | null;
  departamento_id?: number | null;
}

export interface EmpleadoUpdate {
  nombre?: string;
  apellidos?: string | null;
  rut?: string | null;
  email?: string | null;
  cargo?: string | null;
  departamento_id?: number | null;
}

// ===== Pilares / Preguntas =====
export interface Pilar {
  id: number;
  empresa_id?: number | null;
  nombre: string;
  descripcion?: string | null;
  peso: number;
}

export interface PilarCreate {
  empresa_id?: number | null;
  nombre: string;
  descripcion?: string | null;
  peso?: number; // default 1 en backend
}

export interface PilarUpdate {
  empresa_id?: number | null;
  nombre?: string;
  descripcion?: string | null;
  peso?: number;
}

export interface Pregunta {
  id: number;
  pilar_id: number;
  enunciado: string;
  tipo: TipoPreguntaEnum;
  es_obligatoria: boolean;
  peso: number;
  respuesta_esperada?: string | null;
}

export interface PreguntaCreate {
  pilar_id: number;
  enunciado: string;
  tipo: TipoPreguntaEnum;
  es_obligatoria: boolean;
  peso: number;
  respuesta_esperada?: string | null;
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
  respuesta_esperada?: string | null;
}

export interface LikertLevel {
  valor: number;
  nombre: string;
  etiqueta: string;
  descripcion: string;
  caracteristicas: string;
  interpretacion_itil: string;
}

export interface PillarQuestionsResponse {
  pilar_id: number;
  pilar_nombre: string;
  likert_levels?: LikertLevel[];
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
  completion?: number; // 0..1, may be undefined on legacy responses
  progreso: number; // 0..1
}

export interface AssignmentProgress {
  total: number;
  respondidas: number;
  completion?: number; // 0..1
  progreso: number; // 0..1
  por_pilar: PillarProgress[];
}


export interface PillarHighlight {
  id: number;
  name: string;
  value: number;
}

export interface AnalyticsKpis {
  global_average: number;
  strongest_pillar: PillarHighlight | null;
  weakest_pillar: PillarHighlight | null;
  pillar_gap: number;
  coverage_percent: number | null;
  coverage_total: number;
  coverage_respondents: number;
  trend_30d: number | null;
}

export interface PillarDistribution {
  pillar_id: number;
  pillar_name: string;
  percent: number;
  pct_ge4: number;
  levels: number[];
}

export interface HeatmapCell {
  pillar_id: number;
  percent: number;
}

export interface HeatmapRow {
  department_id: number | null;
  department_name: string;
  average: number;
  values: HeatmapCell[];
}

export interface DistributionByDepartment {
  department_id: number | null;
  department_name: string;
  pillars: PillarDistribution[];
}

export interface DistributionData {
  global: PillarDistribution[];
  by_department: DistributionByDepartment[];
}

export interface CoverageByDepartmentEntry {
  department_id: number | null;
  department_name: string;
  respondents: number;
  total: number;
  coverage_percent: number;
}

export interface TimelinePoint {
  date: string;
  global_percent: number;
  pillars: Record<number, number | null>;
}

export interface RankingEntry {
  id: number | null;
  name: string;
  value: number;
}

export interface RankingData {
  top: RankingEntry[];
  bottom: RankingEntry[];
}

export interface EmployeePoint {
  id: number;
  name: string;
  percent: number;
  level: number;
}

export interface AnalyticsFiltersSummary {
  empresa_id: number;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  departamento_ids: number[];
  empleado_ids: number[];
  pilar_ids: number[];
}

export interface DashboardAnalyticsResponse {
  generated_at: string;
  filters: AnalyticsFiltersSummary;
  likert_levels: LikertLevel[];
  kpis: AnalyticsKpis;
  pillars: PillarDistribution[];
  heatmap: HeatmapRow[];
  distribution: DistributionData;
  coverage_by_department: CoverageByDepartmentEntry[];
  timeline: TimelinePoint[];
  ranking: RankingData;
  employees: EmployeePoint[];
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

export interface Lead {
  id: number;
  company: string;
  email: string;
  created_at: string; // ISO
}

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_PASSWORD_RESET'
  | 'COMPANY_CREATE'
  | 'COMPANY_UPDATE'
  | 'COMPANY_DELETE'
  | 'DEPARTMENT_CREATE'
  | 'DEPARTMENT_UPDATE'
  | 'DEPARTMENT_DELETE'
  | 'EMPLOYEE_CREATE'
  | 'EMPLOYEE_UPDATE'
  | 'EMPLOYEE_DELETE'
  | 'PILLAR_CREATE'
  | 'PILLAR_UPDATE'
  | 'PILLAR_DELETE'
  | 'QUESTION_CREATE'
  | 'QUESTION_UPDATE'
  | 'QUESTION_DELETE'
  | 'ASSIGNMENT_CREATE'
  | 'ASSIGNMENT_UPDATE'
  | 'ASSIGNMENT_DELETE'
  | 'SURVEY_ANSWER_BULK'
  | 'REPORT_EXPORT'
  | 'SETTINGS_CHANGE'
  | 'AUDIT_EXPORT'
  | 'AUDIT_DELETE';

export interface AuditLog {
  id: number;
  created_at: string;
  empresa_id?: number | null;
  user_email?: string | null;
  user_role?: RolEnum | string | null;
  action: AuditAction | string;
  entity_type?: string | null;
  entity_id?: number | null;
  notes?: string | null;
  ip?: string | null;
  method?: string | null;
  path?: string | null;
}
