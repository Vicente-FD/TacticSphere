from __future__ import annotations
from enum import Enum
from typing import List, Optional
from datetime import datetime

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    Integer, String, Boolean, Enum as SAEnum, ForeignKey,
    Text, DateTime, UniqueConstraint, Index, JSON
)

from .database import Base

# -----------------------------
# Roles de usuario
# -----------------------------
class RolEnum(str, Enum):
    ADMIN_SISTEMA = "ADMIN_SISTEMA"
    ADMIN = "ADMIN"
    ANALISTA = "ANALISTA"
    USUARIO = "USUARIO"

# -----------------------------
# Enums de negocio
# -----------------------------
class TipoPreguntaEnum(str, Enum):
    LIKERT = "LIKERT"          # 1..5
    ABIERTA = "ABIERTA"        # texto
    SI_NO = "SI_NO"            # booleano

class SemaforoEnum(str, Enum):
    ROJO = "ROJO"
    AMARILLO = "AMARILLO"
    VERDE = "VERDE"


class AuditActionEnum(str, Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    USER_PASSWORD_RESET = "USER_PASSWORD_RESET"
    COMPANY_CREATE = "COMPANY_CREATE"
    COMPANY_UPDATE = "COMPANY_UPDATE"
    COMPANY_DELETE = "COMPANY_DELETE"
    DEPARTMENT_CREATE = "DEPARTMENT_CREATE"
    DEPARTMENT_UPDATE = "DEPARTMENT_UPDATE"
    DEPARTMENT_DELETE = "DEPARTMENT_DELETE"
    EMPLOYEE_CREATE = "EMPLOYEE_CREATE"
    EMPLOYEE_UPDATE = "EMPLOYEE_UPDATE"
    EMPLOYEE_DELETE = "EMPLOYEE_DELETE"
    PILLAR_CREATE = "PILLAR_CREATE"
    PILLAR_UPDATE = "PILLAR_UPDATE"
    PILLAR_DELETE = "PILLAR_DELETE"
    QUESTION_CREATE = "QUESTION_CREATE"
    QUESTION_UPDATE = "QUESTION_UPDATE"
    QUESTION_DELETE = "QUESTION_DELETE"
    ASSIGNMENT_CREATE = "ASSIGNMENT_CREATE"
    ASSIGNMENT_UPDATE = "ASSIGNMENT_UPDATE"
    ASSIGNMENT_DELETE = "ASSIGNMENT_DELETE"
    SURVEY_ANSWER_BULK = "SURVEY_ANSWER_BULK"
    REPORT_EXPORT = "REPORT_EXPORT"
    SETTINGS_CHANGE = "SETTINGS_CHANGE"
    AUDIT_EXPORT = "AUDIT_EXPORT"
    AUDIT_DELETE = "AUDIT_DELETE"
# -----------------------------
# Empresa / Departamento / Empleado
# -----------------------------
class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    rut: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    giro: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    usuarios: Mapped[List["Usuario"]] = relationship(
        "Usuario", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )
    departamentos: Mapped[List["Departamento"]] = relationship(
        "Departamento", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )
    empleados: Mapped[List["Empleado"]] = relationship(
        "Empleado", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )
    pilares: Mapped[List["Pilar"]] = relationship(
        "Pilar", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )
    cuestionarios: Mapped[List["Cuestionario"]] = relationship(
        "Cuestionario", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )
    asignaciones: Mapped[List["Asignacion"]] = relationship(
        "Asignacion", back_populates="empresa", cascade="all, delete-orphan", passive_deletes=True
    )

class Departamento(Base):
    __tablename__ = "departamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    empresa_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="departamentos")

    empleados: Mapped[List["Empleado"]] = relationship(
        "Empleado", back_populates="departamento", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("empresa_id", "nombre", name="uq_dep_empresa_nombre"),
    )

class Empleado(Base):
    __tablename__ = "empleados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    apellidos: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    rut: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    cargo: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    empresa_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    departamento_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("departamentos.id", ondelete="SET NULL"), nullable=True, index=True
    )

    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="empleados")
    departamento: Mapped[Optional["Departamento"]] = relationship("Departamento", back_populates="empleados")

    respuestas: Mapped[List["Respuesta"]] = relationship(
        "Respuesta", back_populates="empleado", cascade="all, delete-orphan", passive_deletes=True
    )

# -----------------------------
# Marketing / Leads
# -----------------------------
class ConsultingLead(Base):
    __tablename__ = "consulting_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

# -----------------------------
# Pilares / Preguntas / Cuestionarios
# -----------------------------
class Pilar(Base):
    __tablename__ = "pilares"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    peso: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    empresa: Mapped[Optional["Empresa"]] = relationship("Empresa", back_populates="pilares")
    preguntas: Mapped[List["Pregunta"]] = relationship(
        "Pregunta", back_populates="pilar", cascade="all, delete-orphan", passive_deletes=True
    )

    umbral: Mapped[Optional["UmbralPilar"]] = relationship(
        "UmbralPilar", back_populates="pilar", uselist=False, cascade="all, delete-orphan", passive_deletes=True
    )

    recomendaciones: Mapped[List["Recomendacion"]] = relationship(
        "Recomendacion", back_populates="pilar", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (
        UniqueConstraint("nombre", name="uq_pilar_nombre"),
    )

class Pregunta(Base):
    __tablename__ = "preguntas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pilar_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pilares.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enunciado: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[TipoPreguntaEnum] = mapped_column(SAEnum(TipoPreguntaEnum, name="tipo_pregunta_enum"), nullable=False)
    es_obligatoria: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    peso: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    respuesta_esperada: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    pilar: Mapped["Pilar"] = relationship("Pilar", back_populates="preguntas")

    respuestas: Mapped[List["Respuesta"]] = relationship(
        "Respuesta", back_populates="pregunta", cascade="all, delete-orphan", passive_deletes=True
    )

class Cuestionario(Base):
    __tablename__ = "cuestionarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    empresa_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    estado: Mapped[str] = mapped_column(String(50), default="BORRADOR", nullable=False)

    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="cuestionarios")

    # asociación oficial
    preguntas_assoc: Mapped[List["CuestionarioPregunta"]] = relationship(
        "CuestionarioPregunta",
        back_populates="cuestionario",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # helper solo-lectura para acceder a preguntas (ordenadas por 'orden' y luego id)
    @property
    def preguntas(self) -> List["Pregunta"]:
        return [cp.pregunta for cp in sorted(self.preguntas_assoc, key=lambda x: (x.orden or 0, x.id))]

class CuestionarioPregunta(Base):
    __tablename__ = "cuestionario_pregunta"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cuestionario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cuestionarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pregunta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("preguntas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    orden: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    cuestionario: Mapped["Cuestionario"] = relationship("Cuestionario", back_populates="preguntas_assoc")
    pregunta: Mapped["Pregunta"] = relationship("Pregunta")

    __table_args__ = (
        UniqueConstraint("cuestionario_id", "pregunta_id", name="uq_cuest_preg"),
    )

# -----------------------------
# Asignaciones de cuestionarios
# -----------------------------
class Asignacion(Base):
    __tablename__ = "asignaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    empresa_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cuestionario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("cuestionarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # EMPRESA | DEPARTAMENTO | EMPLEADO
    alcance_tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    # IMPORTANTE: para alcance EMPRESA debe permitir NULL
    alcance_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # Ventana de vigencia (naive UTC en backend)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    fecha_cierre: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    anonimo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    empresa: Mapped["Empresa"] = relationship("Empresa", back_populates="asignaciones")
    cuestionario: Mapped["Cuestionario"] = relationship("Cuestionario")

    respuestas: Mapped[List["Respuesta"]] = relationship(
        "Respuesta", back_populates="asignacion", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def preguntas_asignadas(self) -> List["Pregunta"]:
        return self.cuestionario.preguntas if self.cuestionario else []

    __table_args__ = (
        Index("ix_asig_empresa_vigencia", "empresa_id", "fecha_inicio", "fecha_cierre"),
        Index("ix_asig_scope", "empresa_id", "alcance_tipo", "alcance_id"),
    )

# -----------------------------
# Respuestas
# -----------------------------
class Respuesta(Base):
    __tablename__ = "respuestas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    asignacion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("asignaciones.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pregunta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("preguntas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    empleado_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("empleados.id", ondelete="SET NULL"), nullable=True, index=True
    )
    valor: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_respuesta: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    asignacion: Mapped["Asignacion"] = relationship("Asignacion", back_populates="respuestas")
    pregunta: Mapped["Pregunta"] = relationship("Pregunta", back_populates="respuestas")
    empleado: Mapped[Optional["Empleado"]] = relationship("Empleado", back_populates="respuestas")

    __table_args__ = (
        # Evita duplicados para (asignación, pregunta, empleado). En encuestas anónimas, empleado_id=NULL.
        UniqueConstraint("asignacion_id", "pregunta_id", "empleado_id", name="uq_resp_asig_preg_emp"),
        Index("ix_resp_asig_preg", "asignacion_id", "pregunta_id"),
    )

# -----------------------------
# Umbrales y Recomendaciones por Pilar
# -----------------------------
class UmbralPilar(Base):
    __tablename__ = "umbral_pilar"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pilar_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pilares.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    umbral_amarillo: Mapped[int] = mapped_column(Integer, nullable=False)
    umbral_verde: Mapped[int] = mapped_column(Integer, nullable=False)

    pilar: Mapped["Pilar"] = relationship("Pilar", back_populates="umbral")

class Recomendacion(Base):
    __tablename__ = "recomendaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pilar_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pilares.id", ondelete="CASCADE"), nullable=False, index=True
    )
    categoria: Mapped[SemaforoEnum] = mapped_column(SAEnum(SemaforoEnum, name="semaforo_enum"), nullable=False)
    texto: Mapped[str] = mapped_column(Text, nullable=False)

    pilar: Mapped["Pilar"] = relationship("Pilar", back_populates="recomendaciones")

# -----------------------------
# Usuarios
# -----------------------------
class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rol: Mapped[RolEnum] = mapped_column(SAEnum(RolEnum, name="rol_enum"), nullable=False)

    empresa_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    empresa: Mapped[Optional["Empresa"]] = relationship("Empresa", back_populates="usuarios")
    password_change_requests: Mapped[List["PasswordChangeRequest"]] = relationship(
        "PasswordChangeRequest",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="PasswordChangeRequest.user_id",
    )
    password_change_resolutions: Mapped[List["PasswordChangeRequest"]] = relationship(
        "PasswordChangeRequest",
        back_populates="resolved_by",
        foreign_keys="PasswordChangeRequest.resolved_by_id",
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")


class PasswordChangeRequest(Base):
    __tablename__ = "password_change_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_email: Mapped[str] = mapped_column(String(200), nullable=False)
    user_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_by_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )

    user: Mapped["Usuario"] = relationship(
        "Usuario", foreign_keys=[user_id], back_populates="password_change_requests"
    )
    resolved_by: Mapped[Optional["Usuario"]] = relationship(
        "Usuario", foreign_keys=[resolved_by_id], back_populates="password_change_resolutions"
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    empresa_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    action: Mapped[AuditActionEnum] = mapped_column(
        SAEnum(AuditActionEnum, name="audit_action_enum"), nullable=False, index=True
    )
    entity_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    path: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    method: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    diff_before: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    diff_after: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    extra: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user: Mapped[Optional["Usuario"]] = relationship("Usuario", back_populates="audit_logs")
