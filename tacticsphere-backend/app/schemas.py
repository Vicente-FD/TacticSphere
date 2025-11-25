# app/schemas.py
from __future__ import annotations
from typing import Optional, List, Literal, Dict
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field, model_validator, EmailStr

from .models import RolEnum, TipoPreguntaEnum, AuditActionEnum

# ======================================================
# BÁSICOS
# ======================================================

class DepartamentoRead(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)

class DepartamentoCreate(BaseModel):
    nombre: str

class EmpresaCreate(BaseModel):
    nombre: str
    rut: Optional[str] = None
    giro: Optional[str] = None
    # nombres de departamentos opcionales al crear empresa
    departamentos: Optional[List[str]] = None

class EmpresaUpdate(BaseModel):
    # todos opcionales para actualizaciones parciales
    nombre: Optional[str] = None
    rut: Optional[str] = None
    giro: Optional[str] = None
    # nombres de departamentos opcionales al actualizar empresa
    departamentos: Optional[List[str]] = None

class EmpresaRead(BaseModel):
    id: int
    nombre: str
    rut: Optional[str] = None
    giro: Optional[str] = None
    activa: bool
    # importante: default_factory para evitar lista mutable por defecto
    departamentos: List[DepartamentoRead] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# AUTH / USUARIOS
# ======================================================

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PasswordForgotRequest(BaseModel):
    email: EmailStr

class PasswordForgotResponse(BaseModel):
    ok: bool = True

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str = Field(min_length=10)
    rol: RolEnum
    empresa_id: Optional[int] = None

class UsuarioUpdate(BaseModel):
    # todos opcionales para actualizaciones parciales
    nombre: Optional[str] = None
    email: Optional[str] = None
    rol: Optional[RolEnum] = None
    empresa_id: Optional[int] = None
    activo: Optional[bool] = None

class UsuarioRead(BaseModel):
    id: int
    nombre: str
    email: str
    rol: RolEnum
    empresa_id: Optional[int] = None
    activo: bool
    model_config = ConfigDict(from_attributes=True)

class UsuarioPasswordReset(BaseModel):
    new_password: str = Field(min_length=10)
    request_id: Optional[int] = None

class PasswordChangeRequestRead(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_nombre: str
    empresa_id: Optional[int] = None
    created_at: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by_id: Optional[int] = None
    user: Optional[UsuarioRead] = None
    resolved_by: Optional[UsuarioRead] = None
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# EMPLEADOS
# ======================================================

class EmpleadoCreate(BaseModel):
    empresa_id: int
    nombre: str
    apellidos: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None
    departamento_id: Optional[int] = None

class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None
    departamento_id: Optional[int] = None

class EmpleadoRead(BaseModel):
    id: int
    empresa_id: int
    departamento_id: Optional[int] = None
    nombre: str
    apellidos: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    cargo: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# PILARES / PREGUNTAS
# ======================================================

class PilarCreate(BaseModel):
    empresa_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    peso: int = 1

class PilarRead(BaseModel):
    id: int
    empresa_id: Optional[int] = None
    nombre: str
    descripcion: Optional[str] = None
    peso: int
    model_config = ConfigDict(from_attributes=True)

class PilarUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    peso: Optional[int] = None

class PreguntaCreate(BaseModel):
    pilar_id: int
    enunciado: str
    tipo: TipoPreguntaEnum
    es_obligatoria: bool = True
    peso: int = 1
    respuesta_esperada: Optional[str] = Field(default=None, max_length=500)


class PreguntaUpdate(BaseModel):
    enunciado: Optional[str] = None
    tipo: Optional[TipoPreguntaEnum] = None
    es_obligatoria: Optional[bool] = None
    peso: Optional[int] = None
    respuesta_esperada: Optional[str] = Field(default=None, max_length=500)


class PreguntaRead(BaseModel):
    id: int
    pilar_id: int
    enunciado: str
    tipo: TipoPreguntaEnum
    es_obligatoria: bool
    peso: int
    respuesta_esperada: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# LEADS / CONSULTING REQUESTS
# ======================================================

class LeadCreate(BaseModel):
    company: str
    email: EmailStr

class LeadRead(BaseModel):
    id: int
    company: str
    email: EmailStr
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# CUESTIONARIOS (placeholder)
# ======================================================

class CuestionarioCreate(BaseModel):
    empresa_id: int
    titulo: str
    version: int = 1
    estado: str = "BORRADOR"
    preguntas_ids: List[int] = Field(default_factory=list)

class CuestionarioRead(BaseModel):
    id: int
    empresa_id: int
    titulo: str
    version: int
    estado: str
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# ASIGNACIONES / RESPUESTAS
# ======================================================

# Limita el string a valores válidos
AlcanceTipo = Literal["EMPRESA", "DEPARTAMENTO", "EMPLEADO"]

class AsignacionCreate(BaseModel):
    empresa_id: int
    cuestionario_id: int
    alcance_tipo: AlcanceTipo  # EMPRESA | DEPARTAMENTO | EMPLEADO
    alcance_id: Optional[int] = None
    fecha_inicio: datetime
    fecha_cierre: datetime
    anonimo: bool = False

    @model_validator(mode="after")
    def _validar_asignacion(self):
        # fechas
        if self.fecha_inicio >= self.fecha_cierre:
            raise ValueError("fecha_inicio debe ser menor que fecha_cierre")
        # alcance
        if self.alcance_tipo == "EMPRESA":
            if self.alcance_id is not None:
                raise ValueError("Para alcance EMPRESA, alcance_id debe ser None")
        elif self.alcance_tipo in ("DEPARTAMENTO", "EMPLEADO"):
            if self.alcance_id is None:
                raise ValueError(f"Para alcance {self.alcance_tipo}, alcance_id es obligatorio")
        return self

class AsignacionRead(BaseModel):
    id: int
    empresa_id: int
    cuestionario_id: int
    alcance_tipo: AlcanceTipo
    alcance_id: Optional[int] = None
    fecha_inicio: datetime
    fecha_cierre: datetime
    anonimo: bool
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def _validar_asignacion_read(self):
        # Misma lógica por coherencia cuando se serializa desde ORM
        if self.fecha_inicio >= self.fecha_cierre:
            raise ValueError("fecha_inicio debe ser menor que fecha_cierre")
        if self.alcance_tipo == "EMPRESA" and self.alcance_id is not None:
            raise ValueError("Para alcance EMPRESA, alcance_id debe ser None")
        if self.alcance_tipo in ("DEPARTAMENTO", "EMPLEADO") and self.alcance_id is None:
            raise ValueError(f"Para alcance {self.alcance_tipo}, alcance_id es obligatorio")
        return self

class RespuestaCreate(BaseModel):
    asignacion_id: int
    pregunta_id: int
    empleado_id: Optional[int] = None
    valor: str

class RespuestaRead(BaseModel):
    id: int
    asignacion_id: int
    pregunta_id: int
    empleado_id: Optional[int] = None
    valor: Optional[str] = None
    fecha_respuesta: datetime
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# (Opcional) UMBRALES / RECOMENDACIONES
# ======================================================

class UmbralPilarUpsert(BaseModel):
    pilar_id: int
    umbral_amarillo: int
    umbral_verde: int

class UmbralPilarRead(BaseModel):
    id: int
    pilar_id: int
    umbral_amarillo: int
    umbral_verde: int
    model_config = ConfigDict(from_attributes=True)

# ======================================================
# ENCUESTA — Sesión por Asignación, Pilares, Progreso y Respuestas
# ======================================================

# --- Inicio/continuación de una sesión de respuesta (por asignación) ---
class SurveyBeginRequest(BaseModel):
    """
    Inicia o continúa una sesión de respuesta para una asignación dada.
    Si la encuesta es anónima, `empleado_id` puede omitirse.
    """
    asignacion_id: int
    empleado_id: Optional[int] = None  # si no es anónimo y quieres asociar explícito

class SurveyBeginResponse(BaseModel):
    """
    Simplemente confirma la asignación desde la cual se responderá.
    """
    asignacion_id: int

# --- Carga de preguntas por pilar (incluye respuesta actual si existe) ---
class SurveyQuestionRead(BaseModel):
    id: int
    enunciado: str
    tipo: TipoPreguntaEnum
    es_obligatoria: bool
    peso: int
    # valor ya respondido por el empleado (o por sesión anónima) si existe:
    respuesta_actual: Optional[str] = None
    respuesta_esperada: Optional[str] = None

class PillarQuestionsResponse(BaseModel):
    pilar_id: int
    pilar_nombre: str
    likert_levels: Optional[List["LikertLevel"]] = None
    preguntas: List[SurveyQuestionRead]

class LikertLevel(BaseModel):
    valor: int
    nombre: str
    etiqueta: str
    descripcion: str
    caracteristicas: str
    interpretacion_itil: str

# --- Envío masivo de respuestas, por pilar ---
class BulkAnswersRequest(BaseModel):
    """
    Envío en bloque para un pilar: cada item es equivalente a RespuestaCreate,
    pero se permite enviar una lista en un solo POST.
    """
    respuestas: List[RespuestaCreate]

class BulkAnswersResponse(BaseModel):
    ok: bool = True
    creadas: Optional[int] = None
    actualizadas: Optional[int] = None

# --- Progreso (global y por pilar) ---
class PillarProgress(BaseModel):
    pilar_id: int
    pilar_nombre: str
    total: int            # total de preguntas en el pilar asociadas al cuestionario de la asignación
    respondidas: int      # cuántas ya tienen respuesta para esta asignación (+empleado si aplica)
    progreso: float       # 0..1 (puntaje promedio normalizado)
    completion: float     # 0..1 (avance de participación)

class AssignmentProgress(BaseModel):
    total: int
    respondidas: int
    progreso: float       # 0..1 (puntaje global)
    completion: float     # 0..1 (participación global)
    por_pilar: List[PillarProgress]


class PillarHighlight(BaseModel):
    id: int
    name: str
    value: float


class AnalyticsKpis(BaseModel):
    global_average: float
    strongest_pillar: Optional[PillarHighlight] = None
    weakest_pillar: Optional[PillarHighlight] = None
    pillar_gap: float
    coverage_percent: Optional[float] = None
    coverage_total: int
    coverage_respondents: int
    trend_30d: Optional[float] = None


class PillarDistribution(BaseModel):
    pillar_id: int
    pillar_name: str
    percent: float
    pct_ge4: float
    levels: List[float]


class HeatmapCell(BaseModel):
    pillar_id: int
    percent: float


class HeatmapRow(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    average: float
    values: List[HeatmapCell]


class TimelinePoint(BaseModel):
    date: date
    global_percent: float
    pillars: Dict[int, Optional[float]] = Field(default_factory=dict)


class RankingEntry(BaseModel):
    id: Optional[int] = None
    name: str
    value: float


class RankingData(BaseModel):
    top: List[RankingEntry] = Field(default_factory=list)
    bottom: List[RankingEntry] = Field(default_factory=list)


class EmployeePoint(BaseModel):
    id: int
    name: str
    percent: float
    level: int


class DistributionByDepartment(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    pillars: List[PillarDistribution]


class DistributionData(BaseModel):
    global_: List[PillarDistribution] = Field(default_factory=list, alias="global")
    by_department: List[DistributionByDepartment] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class CoverageByDepartmentEntry(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    respondents: int
    total: int
    coverage_percent: float


class AnalyticsFilters(BaseModel):
    # empresa_id es opcional para soportar modo global (None = todas las empresas, solo para ADMIN_SISTEMA)
    empresa_id: Optional[int] = None
    fecha_desde: Optional[date] = None
    fecha_hasta: Optional[date] = None
    departamento_ids: List[int] = Field(default_factory=list)
    empleado_ids: List[int] = Field(default_factory=list)
    pilar_ids: List[int] = Field(default_factory=list)


class DashboardAnalyticsResponse(BaseModel):
    generated_at: datetime
    filters: AnalyticsFilters
    likert_levels: List[LikertLevel]
    kpis: AnalyticsKpis
    pillars: List[PillarDistribution]
    heatmap: List[HeatmapRow]
    distribution: DistributionData
    coverage_by_department: List[CoverageByDepartmentEntry] = Field(default_factory=list)
    timeline: List[TimelinePoint]
    ranking: RankingData
    employees: List[EmployeePoint]


class AuditLogRead(BaseModel):
    id: int
    created_at: datetime
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[RolEnum] = None
    empresa_id: Optional[int] = None
    action: AuditActionEnum
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    notes: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    diff_before: Optional[Dict] = None
    diff_after: Optional[Dict] = None
    extra: Optional[Dict] = None
    model_config = ConfigDict(from_attributes=True)


class AuditDeleteRequest(BaseModel):
    password: str


class ReportExportRequest(BaseModel):
    report_type: str
    notes: Optional[str] = None

