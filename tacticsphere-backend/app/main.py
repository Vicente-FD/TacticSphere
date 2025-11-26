# app/main.py

from typing import Optional, List, Dict

import csv

import io

from fastapi import FastAPI, Depends, HTTPException, status, Query, Request

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.database import get_db

import os, time

import hashlib

from datetime import datetime, timedelta, date  # usamos naive UTC para coherencia

from pydantic import BaseModel  # â¬ï¸ para SimpleBeginRequest

from app import models, database

from .database import Base, engine, get_db

from .models import (

    RolEnum, Usuario, TipoPreguntaEnum,

    Empresa, Departamento, Pilar, Pregunta, Asignacion, Empleado,

    Cuestionario, AuditActionEnum,

)

from .auth import verify_password, create_access_token, get_current_user, require_roles

from . import crud
from .likert_levels import LIKERT_LEVELS

from .schemas import (

    # Auth

    LoginRequest, TokenResponse,

    PasswordForgotRequest, PasswordForgotResponse,

    # Empresa / Depto

    EmpresaCreate, EmpresaRead, EmpresaUpdate,

    DepartamentoCreate, DepartamentoRead,

    # Usuarios

    UsuarioCreate, UsuarioRead, UsuarioUpdate, UsuarioPasswordReset, PasswordChangeRequestRead,

    # Empleados

    EmpleadoCreate, EmpleadoRead, EmpleadoUpdate,

    # Pilares / Preguntas

    PilarCreate, PilarRead, PilarUpdate,

    PreguntaCreate, PreguntaRead, PreguntaUpdate,

    # Cuestionarios

    CuestionarioCreate, CuestionarioRead,

    # Asignaciones

    AsignacionCreate, AsignacionRead,

    # Analytics
    DashboardAnalyticsResponse,

    # Encuesta

    SurveyBeginRequest, SurveyBeginResponse,

    PillarQuestionsResponse,

    BulkAnswersRequest, BulkAnswersResponse,

    AssignmentProgress,

    LeadCreate,

    LeadRead,

    AuditLogRead,
    AuditDeleteRequest,
    ReportExportRequest,

)

from passlib.context import CryptContext  # â agregado para bcrypt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # â contexto para hash compatible con login



from .audit import audit_log

app = FastAPI(title="TacticSphere API")



# ---------------- CORS ----------------

# Permitir orígenes para desarrollo y producción
allowed_origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://tacticsphere-prod.web.app",
    "https://tacticsphere-prod.firebaseapp.com",
    "https://tacticsphere.cl",
    "https://www.tacticsphere.cl",
]

app.add_middleware(

    CORSMiddleware,

    allow_origins=allowed_origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# Crear tablas si no existen

Base.metadata.create_all(bind=engine)



@app.get("/")
def root():
    return {"message": "TacticSphere API", "version": "1.0", "status": "running"}

@app.get("/ping")
def ping():
    return {"message": "pong"}



@app.get("/_routes")

def _routes():

    return sorted([f"{r.methods} {r.path}" for r in app.routes])



@app.get("/__whoami")

def __whoami():

    return {

        "file": __file__,

        "cwd": os.getcwd__,  # mantenemos como en tu versiÃ³n

        "app_id": id(app),

        "loaded_at": time.ctime(),

        "routes": [f"{sorted(r.methods)} {r.path}" for r in app.routes][:25],

    }



# ======================================================

# Helpers de autorizaciÃ³n de empresa

# ======================================================

def _ensure_company_access(current: Usuario, target_empresa_id: Optional[int]):

    """Valida el acceso a recursos ligados a empresa según rol."""

    if current.rol in (RolEnum.ADMIN_SISTEMA, RolEnum.ANALISTA, RolEnum.ADMIN):

        return



    if current.rol == RolEnum.USUARIO:

        if current.empresa_id is not None and current.empresa_id == target_empresa_id:

            return

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    raise HTTPException(status_code=403, detail="Permisos insuficientes")



def _ensure_can_assign_role(current: Usuario, rol_objetivo: RolEnum):

    """ADMIN puede asignar solo ANALISTA/USUARIO; ADMIN_SISTEMA cualquier rol."""

    if current.rol == RolEnum.ADMIN_SISTEMA:

        return

    if current.rol == RolEnum.ADMIN and rol_objetivo in (RolEnum.ANALISTA, RolEnum.USUARIO):

        return

    raise HTTPException(status_code=403, detail="No puedes asignar ese rol")



def _ensure_assignment_access(db: Session, current: Usuario, asignacion_id: int) -> Asignacion:

    """

    Valida que el usuario pueda acceder a la asignación.

    ADMIN_SISTEMA / ADMIN / ANALISTA: acceso total.

    USUARIO: sólo si la asignación pertenece a su empresa.

    """

    asg = crud.get_asignacion(db, asignacion_id)

    if not asg:

        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    if current.rol in (RolEnum.ADMIN_SISTEMA, RolEnum.ADMIN, RolEnum.ANALISTA):

        return asg

    if current.empresa_id is None or current.empresa_id != asg.empresa_id:

        raise HTTPException(status_code=403, detail="No puedes acceder a esta asignación")

    return asg



# ======================================================

# AUTH

# ======================================================

@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email_normalized = payload.email.strip().lower()

    user = crud.get_user_by_email(db, email_normalized)

    if not user or not verify_password(payload.password, user.password_hash):

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    if not user.activo:

        raise HTTPException(

            status_code=status.HTTP_403_FORBIDDEN,

            detail="Usuario desactivado, contacte al administrador",

        )

    token = create_access_token({
        "sub": str(user.id),
        "rol": user.rol.value,
        "empresa_id": user.empresa_id
    })
    audit_log(
        db,
        action=AuditActionEnum.LOGIN,
        current_user=user,
        empresa_id=user.empresa_id,
        entity_type="Usuario",
        entity_id=user.id,
        notes="Inicio de sesión",
        request=request,
    )
    return TokenResponse(access_token=token)


@app.get("/me", response_model=UsuarioRead)

def me(current: Usuario = Depends(get_current_user)):

    return current



@app.post("/auth/password/forgot", response_model=PasswordForgotResponse)

def forgot_password(payload: PasswordForgotRequest, db: Session = Depends(get_db)):

    email = payload.email.strip().lower()

    user = crud.get_user_by_email(db, email)

    if user and user.activo:

        crud.create_password_change_request(db, user)

    # Para evitar enumeraci?n no revelamos estado

    return PasswordForgotResponse(ok=True)


# Seed admin (solo dev)

@app.post("/dev/seed-admin")

def seed_admin(db: Session = Depends(get_db)):

    if crud.get_user_by_email(db, "admin@tacticsphere.com"):

        return {"ok": True, "msg": "admin ya existe"}

    try:

        admin = crud.create_usuario(

            db,

            nombre="Admin Sistema",

            email="admin@tacticsphere.com",

            password="Admin123456!",

            rol=RolEnum.ADMIN_SISTEMA,

            empresa_id=None,

        )

    except ValueError as exc:

        raise HTTPException(status_code=400, detail=str(exc))

    return {"ok": True, "admin_id": admin.id}



# ======================================================

# CONSULTING LEADS (pÃºblico)

# ======================================================

@app.post("/consulting-leads", response_model=LeadRead, status_code=201)

def create_consulting_lead_endpoint(payload: LeadCreate, db: Session = Depends(get_db)):

    company = payload.company.strip()

    if not company:

        raise HTTPException(status_code=422, detail="La empresa es obligatoria")

    lead = crud.create_consulting_lead(db, company=company, email=payload.email.lower())

    return lead



@app.get("/consulting-leads", response_model=list[LeadRead])

def list_consulting_leads_endpoint(

    limit: int = Query(default=100, ge=1, le=500),

    offset: int = Query(default=0, ge=0),

    db: Session = Depends(get_db),

):

    return crud.list_consulting_leads(db, limit=limit, offset=offset)



@app.delete("/consulting-leads/{lead_id}", status_code=204)

def delete_consulting_lead_endpoint(

    lead_id: int,

    db: Session = Depends(get_db),

    _admin=Depends(require_roles(RolEnum.ADMIN_SISTEMA, RolEnum.ADMIN)),

):

    if not crud.delete_consulting_lead(db, lead_id):

        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    return None



@app.delete("/consulting-leads", status_code=204)

def clear_consulting_leads_endpoint(

    db: Session = Depends(get_db),

    _admin=Depends(require_roles(RolEnum.ADMIN_SISTEMA, RolEnum.ADMIN)),

):

    crud.clear_consulting_leads(db)

    return None



# ======================================================

# EMPRESAS

# ======================================================

@app.get("/companies", response_model=list[EmpresaRead])

def companies_list(db: Session = Depends(get_db), _user=Depends(get_current_user)):

    return crud.list_empresas(db)



@app.post("/companies", response_model=EmpresaRead, status_code=201)
def create_company(
    data: EmpresaCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    empresa = crud.create_empresa(db, data.nombre, data.rut, data.giro, data.departamentos)
    
    # Validación final: asegurar que la empresa solo tiene los departamentos correctos
    # (esto es redundante pero crítico para prevenir problemas de datos corruptos)
    empresa.departamentos = [d for d in empresa.departamentos if d.empresa_id == empresa.id]
    
    audit_log(
        db,
        action=AuditActionEnum.COMPANY_CREATE,
        current_user=current,
        empresa_id=empresa.id,
        entity_type="Empresa",
        entity_id=empresa.id,
        notes=f"Creó la empresa {empresa.nombre}",
        diff_after={"id": empresa.id, "nombre": empresa.nombre},
        request=request,
    )
    return empresa


@app.patch("/companies/{empresa_id}", response_model=EmpresaRead)
def update_company(
    empresa_id: int,
    data: EmpresaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    # Cargar empresa con sus departamentos para asegurar que tenemos todos los datos
    stmt = select(Empresa).options(joinedload(Empresa.departamentos)).where(Empresa.id == empresa_id)
    empresa = db.scalar(stmt)
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Validación: asegurar que los departamentos pertenecen a esta empresa
    empresa.departamentos = [d for d in empresa.departamentos if d.empresa_id == empresa.id]
    
    # Guardar estado antes para auditoría
    before = {
        "id": empresa.id,
        "nombre": empresa.nombre,
        "rut": empresa.rut,
        "giro": empresa.giro,
        "departamentos": [d.nombre for d in empresa.departamentos] if empresa.departamentos else [],
    }
    
    updated = crud.update_empresa(
        db,
        empresa_id=empresa_id,
        nombre=data.nombre,
        rut=data.rut,
        giro=data.giro,
        departamentos=data.departamentos,
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Refrescar la empresa desde la base de datos para obtener los departamentos actualizados
    db.refresh(updated, ["departamentos"])
    # Validación adicional: asegurar que los departamentos pertenecen a esta empresa
    updated.departamentos = [d for d in updated.departamentos if d.empresa_id == updated.id]
    
    # Registrar en auditoría
    after = {
        "id": updated.id,
        "nombre": updated.nombre,
        "rut": updated.rut,
        "giro": updated.giro,
        "departamentos": [d.nombre for d in updated.departamentos] if updated.departamentos else [],
    }
    
    audit_log(
        db,
        action=AuditActionEnum.COMPANY_UPDATE,
        current_user=current,
        empresa_id=updated.id,
        entity_type="Empresa",
        entity_id=empresa_id,
        notes=f"Actualizó empresa {updated.nombre}",
        diff_before=before,
        diff_after=after,
        request=request,
    )
    return updated


@app.delete("/companies/{empresa_id}", status_code=204)
def delete_company(
    empresa_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    empresa = db.get(Empresa, empresa_id)
    if not empresa:
        raise HTTPException(status_code=404, detail="Not Found")
    ok = crud.delete_empresa(db, empresa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not Found")
    audit_log(
        db,
        action=AuditActionEnum.COMPANY_DELETE,
        current_user=current,
        empresa_id=empresa_id,
        entity_type="Empresa",
        entity_id=empresa_id,
        notes=f"Eliminó la empresa {empresa.nombre}",
        diff_before={"id": empresa.id, "nombre": empresa.nombre},
        request=request,
    )
    return None


# ======================================================

# DEPARTAMENTOS

# ======================================================

@app.get("/companies/{empresa_id}/departments", response_model=list[DepartamentoRead])

def list_departments(

    empresa_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, empresa_id)

    return crud.list_departamentos_by_empresa(db, empresa_id)



@app.post("/companies/{empresa_id}/departments", response_model=DepartamentoRead, status_code=201)
def add_department(
    empresa_id: int,
    data: DepartamentoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)
    departamento = crud.create_departamento(db, empresa_id, data.nombre)
    audit_log(
        db,
        action=AuditActionEnum.DEPARTMENT_CREATE,
        current_user=current,
        empresa_id=empresa_id,
        entity_type="Departamento",
        entity_id=departamento.id,
        notes=f"Creó departamento {departamento.nombre}",
        diff_after={"id": departamento.id, "nombre": departamento.nombre},
        request=request,
    )
    return departamento

@app.get("/diagnostics/orphan-departments", response_model=Dict)
def diagnose_orphan_departments(
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    """
    Endpoint de diagnóstico: encuentra departamentos huérfanos (departamentos sin empresa válida).
    Solo disponible para ADMIN_SISTEMA.
    """
    orphan_depts = crud.find_orphan_departments(db)
    return {
        "count": len(orphan_depts),
        "departments": [
            {"id": d.id, "nombre": d.nombre, "empresa_id": d.empresa_id}
            for d in orphan_depts
        ]
    }

@app.post("/diagnostics/cleanup-orphan-departments", response_model=Dict)
def cleanup_orphan_departments(
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    """
    Endpoint de limpieza: elimina departamentos huérfanos de la base de datos.
    Solo disponible para ADMIN_SISTEMA.
    """
    deleted_count = crud.cleanup_orphan_departments(db)
    return {
        "message": f"Se eliminaron {deleted_count} departamentos huérfanos",
        "deleted_count": deleted_count
    }

@app.delete("/departments/{dep_id}", status_code=204)
def delete_department(
    dep_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    dep = db.get(Departamento, dep_id)
    if not dep:
        raise HTTPException(status_code=404, detail="Not Found")
    _ensure_company_access(current, dep.empresa_id)
    ok = crud.delete_departamento(db, dep_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not Found")
    audit_log(
        db,
        action=AuditActionEnum.DEPARTMENT_DELETE,
        current_user=current,
        empresa_id=dep.empresa_id,
        entity_type="Departamento",
        entity_id=dep_id,
        notes=f"Eliminó departamento {dep.nombre}",
        diff_before={"id": dep.id, "nombre": dep.nombre},
        request=request,
    )
    return None


# ======================================================

# EMPLEADOS

# ======================================================

@app.get("/companies/{empresa_id}/employees", response_model=list[EmpleadoRead])
def list_employees(
    empresa_id: int,
    departamento_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, min_length=1),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)

    return crud.list_empleados(
        db,
        empresa_id=empresa_id,
        departamento_id=departamento_id,
        search=search,
    )


@app.get("/employees/search", response_model=list[EmpleadoRead])
def search_employees(
    query: str = Query(..., min_length=2),
    empresa_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    target_empresa = empresa_id

    if current.rol == RolEnum.ADMIN:
        target_empresa = current.empresa_id
    elif current.rol in (RolEnum.ANALISTA, RolEnum.USUARIO):
        target_empresa = current.empresa_id

    if target_empresa is not None:
        _ensure_company_access(current, target_empresa)
    elif current.rol != RolEnum.ADMIN_SISTEMA:
        target_empresa = current.empresa_id
        if target_empresa is None:
            raise HTTPException(status_code=403, detail="No puedes buscar empleados sin empresa asignada.")

    employees = crud.list_empleados(
        db,
        empresa_id=target_empresa,
        search=query,
        limit=limit,
    )
    return employees



@app.post("/companies/{empresa_id}/employees", response_model=EmpleadoRead, status_code=201)
def create_employee(
    empresa_id: int,
    data: EmpleadoCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)

    if data.empresa_id != empresa_id:

        raise HTTPException(status_code=400, detail="empresa_id inconsistente")



    if data.departamento_id:

        dep = db.get(Departamento, data.departamento_id)

        if not dep or dep.empresa_id != empresa_id:

            raise HTTPException(status_code=400, detail="Departamento invÃ¡lido para la empresa")



    empleado = crud.create_empleado(
        db,
        empresa_id=empresa_id,
        nombre=data.nombre,
        apellidos=data.apellidos,
        rut=data.rut,
        email=data.email,
        cargo=data.cargo,
        departamento_id=data.departamento_id,
    )
    audit_log(
        db,
        action=AuditActionEnum.EMPLOYEE_CREATE,
        current_user=current,
        empresa_id=empresa_id,
        entity_type="Empleado",
        entity_id=empleado.id,
        notes=f"Creó empleado {empleado.nombre}",
        diff_after={
            "id": empleado.id,
            "nombre": empleado.nombre,
            "apellidos": empleado.apellidos,
            "rut": empleado.rut,
            "email": empleado.email,
        },
        request=request,
    )
    return empleado

@app.patch("/employees/{empleado_id}", response_model=EmpleadoRead)
def update_employee(
    empleado_id: int,
    data: EmpleadoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    emp = db.get(Empleado, empleado_id)

    if not emp:

        raise HTTPException(status_code=404, detail="Empleado no encontrado")



    _ensure_company_access(current, emp.empresa_id)



    if data.departamento_id is not None:

        dep = db.get(Departamento, data.departamento_id)

        if not dep or dep.empresa_id != emp.empresa_id:

            raise HTTPException(status_code=400, detail="Departamento invÃ¡lido para la empresa")



    before = {
        "nombre": emp.nombre,
        "apellidos": emp.apellidos,
        "rut": emp.rut,
        "email": emp.email,
        "cargo": emp.cargo,
        "departamento_id": emp.departamento_id,
    }
    updated = crud.update_empleado(
        db,
        empleado_id=empleado_id,
        nombre=data.nombre,
        apellidos=data.apellidos,
        rut=data.rut,
        email=data.email,
        cargo=data.cargo,
        departamento_id=data.departamento_id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    audit_log(
        db,
        action=AuditActionEnum.EMPLOYEE_UPDATE,
        current_user=current,
        empresa_id=emp.empresa_id,
        entity_type="Empleado",
        entity_id=empleado_id,
        notes=f"Actualizo empleado {updated.nombre}",
        diff_before=before,
        diff_after={
            "nombre": updated.nombre,
            "apellidos": updated.apellidos,
            "rut": updated.rut,
            "email": updated.email,
            "cargo": updated.cargo,
            "departamento_id": updated.departamento_id,
        },
        request=request,
    )
    return updated


# ======================================================

# USUARIOS

# ======================================================

@app.get("/users", response_model=list[UsuarioRead])

def users_list(

    empresa_id: int | None = None,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    # ADMIN_SISTEMA y ADMIN pueden consultar cualquier empresa (o todas si no se indica)

    if current.rol not in (RolEnum.ADMIN, RolEnum.ADMIN_SISTEMA):

        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    return crud.list_usuarios(db, empresa_id)



@app.post("/users", response_model=UsuarioRead, status_code=201)
def create_user(
    data: UsuarioCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    target_empresa_id = data.empresa_id if data.empresa_id is not None else current.empresa_id

    if current.rol == RolEnum.ADMIN:

        if target_empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes crear usuarios en otra empresa")

        _ensure_can_assign_role(current, data.rol)

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    if crud.get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email ya en uso")
    try:
        usuario = crud.create_usuario(db, data.nombre, data.email, data.password, data.rol, target_empresa_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    audit_log(
        db,
        action=AuditActionEnum.USER_CREATE,
        current_user=current,
        empresa_id=usuario.empresa_id,
        entity_type="Usuario",
        entity_id=usuario.id,
        notes=f"Creó usuario {usuario.email}",
        diff_after={"id": usuario.id, "email": usuario.email, "rol": usuario.rol.value},
        request=request,
    )
    return usuario


@app.patch("/users/{user_id}", response_model=UsuarioRead)

def update_user(
    user_id: int,
    data: UsuarioUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")
    if u.rol == RolEnum.ADMIN_SISTEMA and data.activo is False:
        raise HTTPException(status_code=400, detail="No se puede desactivar un ADMIN_SISTEMA")
    before = {
        "nombre": u.nombre,
        "email": u.email,
        "rol": u.rol.value,
        "empresa_id": u.empresa_id,
        "activo": u.activo,
    }


    if current.rol == RolEnum.ADMIN:

        if u.empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes editar usuarios de otra empresa")

        if data.rol is not None:

            _ensure_can_assign_role(current, data.rol)

        if data.empresa_id is not None and data.empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes mover usuarios a otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    updated = crud.update_usuario(
        db, user_id,
        nombre=data.nombre,
        email=data.email,
        rol=data.rol,
        empresa_id=data.empresa_id,
        activo=data.activo,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Not Found")
    audit_log(
        db,
        action=AuditActionEnum.USER_UPDATE,
        current_user=current,
        empresa_id=updated.empresa_id,
        entity_type="Usuario",
        entity_id=user_id,
        notes=f"Actualizó usuario {updated.email}",
        diff_before=before,
        diff_after={
            "nombre": updated.nombre,
            "email": updated.email,
            "rol": updated.rol.value,
            "empresa_id": updated.empresa_id,
            "activo": updated.activo,
        },
        request=request,
    )
    return updated


@app.post("/users/{user_id}/password", response_model=UsuarioRead)

def reset_password(
    user_id: int,
    data: UsuarioPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    u = db.get(Usuario, user_id)

    if not u:

        raise HTTPException(status_code=404, detail="Not Found")



    request_record = None

    if data.request_id is not None:

        request_record = crud.get_password_change_request(db, data.request_id)

        if not request_record:

            raise HTTPException(status_code=404, detail="Solicitud de cambio no encontrada")

        if request_record.user_id != user_id:

            raise HTTPException(status_code=400, detail="La solicitud no corresponde a este usuario")



    if current.rol == RolEnum.ADMIN:

        if u.empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes cambiar contraseÃ±a de otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    try:
        u = crud.set_password(db, user_id, data.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")

    if request_record:

        crud.resolve_password_change_request(

            db,
            request_record.id,
            user_id=user_id,
            resolved_by_id=current.id,
        )

    note_msg = f"Restableció la contraseña de {u.email}"
    if request_record:
        note_msg += f" (solicitud #{request_record.id})"

    audit_log(
        db,
        action=AuditActionEnum.USER_PASSWORD_RESET,
        current_user=current,
        empresa_id=u.empresa_id,
        entity_type="Usuario",
        entity_id=user_id,
        notes=note_msg,
        request=request,
    )
    return u


@app.delete("/users/{user_id}", status_code=204)

def delete_user(

    user_id: int,

    request: Request,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    u = db.get(Usuario, user_id)

    if not u:

        raise HTTPException(status_code=404, detail="Not Found")
    if u.rol == RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=400, detail="No se puede eliminar un ADMIN_SISTEMA")




    if current.rol == RolEnum.ADMIN:

        if u.empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes eliminar usuarios de otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    ok = crud.delete_usuario(db, user_id)

    if not ok:

        raise HTTPException(status_code=404, detail="Not Found")

    audit_log(

        db,

        action=AuditActionEnum.USER_DELETE,

        current_user=current,

        empresa_id=u.empresa_id,

        entity_type="Usuario",

        entity_id=user_id,

        notes=f"Eliminó usuario {u.email}",

        diff_before={"email": u.email, "rol": u.rol.value},

        request=request,

    )

    return None



@app.get("/password-change-requests", response_model=list[PasswordChangeRequestRead])

def list_password_change_requests_endpoint(

    include_resolved: bool = Query(False),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    if current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    return crud.list_password_change_requests(db, include_resolved=include_resolved)


@app.delete("/password-change-requests", status_code=204)
def clear_password_change_requests_endpoint(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    crud.clear_password_change_requests(db)
    return None



# ======================================================

# PILARES / PREGUNTAS

# ======================================================

@app.get("/pillars", response_model=list[PilarRead])

def list_pillars(

    empresa_id: Optional[int] = Query(default=None),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    if empresa_id is not None:

        _ensure_company_access(current, empresa_id)

    else:

        if current.rol != RolEnum.ADMIN_SISTEMA and current.empresa_id is not None:

            empresa_id = current.empresa_id

    return crud.list_pilares(db, empresa_id)



@app.get("/companies/{empresa_id}/pillars", response_model=list[PilarRead])

def list_company_pillars(

    empresa_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, empresa_id)

    return crud.list_pilares(db, empresa_id)



@app.post("/pillars", response_model=PilarRead, status_code=201)

def create_pillar(

    data: PilarCreate,

    request: Request,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    if data.empresa_id is not None:

        _ensure_company_access(current, data.empresa_id)

    else:

        if current.rol not in (RolEnum.ADMIN, RolEnum.ADMIN_SISTEMA):

            raise HTTPException(status_code=403, detail="Permisos insuficientes")

    pilar = crud.create_pilar(db, data.empresa_id, data.nombre, data.descripcion, data.peso)

    audit_log(

        db,

        action=AuditActionEnum.PILLAR_CREATE,

        current_user=current,

        empresa_id=pilar.empresa_id,

        entity_type="Pilar",

        entity_id=pilar.id,

        notes=f"Creó pilar {pilar.nombre}",

        diff_after={"id": pilar.id, "nombre": pilar.nombre},

        request=request,

    )

    return pilar


@app.patch("/pillars/{pilar_id}", response_model=PilarRead)
def update_pillar(
    pilar_id: int,
    data: PilarUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    p = db.get(Pilar, pilar_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pilar no existe")
    
    _ensure_company_access(current, p.empresa_id)
    
    # Guardar estado antes para auditoría
    before = {
        "id": p.id,
        "nombre": p.nombre,
        "descripcion": p.descripcion,
        "peso": p.peso,
    }
    
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        return p
    
    updated = crud.update_pilar(
        db,
        pilar_id,
        nombre=payload.get("nombre"),
        descripcion=payload.get("descripcion"),
        peso=payload.get("peso"),
    )
    
    if updated is None:
        raise HTTPException(status_code=404, detail="Pilar no existe")
    
    audit_log(
        db,
        action=AuditActionEnum.PILLAR_UPDATE,
        current_user=current,
        empresa_id=p.empresa_id,
        entity_type="Pilar",
        entity_id=updated.id,
        notes=f"Actualizó pilar {updated.nombre}",
        diff_before=before,
        diff_after={"id": updated.id, "nombre": updated.nombre, "descripcion": updated.descripcion, "peso": updated.peso},
        request=request,
    )
    return updated


@app.delete("/pillars/{pilar_id}", status_code=204)
def delete_pillar(
    pilar_id: int,
    request: Request,
    cascade: bool = Query(False),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):

    p = db.get(Pilar, pilar_id)

    if not p:

        raise HTTPException(status_code=404, detail="Pilar no existe")

    _ensure_company_access(current, p.empresa_id)

    ok, reason = crud.delete_pilar(db, pilar_id, cascade=cascade)

    if not ok:

        raise HTTPException(status_code=400, detail=reason or "No se pudo eliminar el pilar")

    audit_log(

        db,

        action=AuditActionEnum.PILLAR_DELETE,

        current_user=current,

        empresa_id=p.empresa_id,

        entity_type="Pilar",

        entity_id=pilar_id,

        notes=f"Eliminó pilar {p.nombre}",

        diff_before={"id": p.id, "nombre": p.nombre},

        request=request,

    )

    return None



@app.get("/questions", response_model=list[PreguntaRead])

def list_questions(

    pilar_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    p = db.get(Pilar, pilar_id)

    if not p:

        raise HTTPException(status_code=404, detail="Pilar no existe")

    _ensure_company_access(current, p.empresa_id)

    return crud.list_preguntas(db, pilar_id)



@app.get("/pillars/{pilar_id}/questions", response_model=list[PreguntaRead])

def list_questions_by_pilar(

    pilar_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    p = db.get(Pilar, pilar_id)

    if not p:

        raise HTTPException(status_code=404, detail="Pilar no existe")

    _ensure_company_access(current, p.empresa_id)

    return crud.list_preguntas(db, pilar_id)



@app.post("/questions", response_model=PreguntaRead, status_code=201)

def create_question(

    data: PreguntaCreate,

    request: Request,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    p = db.get(Pilar, data.pilar_id)

    if not p:

        raise HTTPException(status_code=404, detail="Pilar no existe")

    _ensure_company_access(current, p.empresa_id)



    if data.tipo not in (TipoPreguntaEnum.LIKERT, TipoPreguntaEnum.ABIERTA, TipoPreguntaEnum.SI_NO):

        raise HTTPException(status_code=400, detail="Tipo invÃ¡lido")



    pregunta = crud.create_pregunta(
        db,
        data.pilar_id,
        data.enunciado,
        data.tipo,
        data.es_obligatoria,
        data.peso,
        data.respuesta_esperada,
    )

    audit_log(

        db,

        action=AuditActionEnum.QUESTION_CREATE,

        current_user=current,

        empresa_id=p.empresa_id,

        entity_type="Pregunta",

        entity_id=pregunta.id,

        notes=f"Creó pregunta {pregunta.enunciado[:60]}",

        diff_after={"id": pregunta.id, "pilar_id": pregunta.pilar_id},

        request=request,

    )

    return pregunta




@app.put("/questions/{pregunta_id}", response_model=PreguntaRead)
def update_question(
    pregunta_id: int,
    data: PreguntaUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    pregunta = db.get(Pregunta, pregunta_id)
    if not pregunta:
        raise HTTPException(status_code=404, detail="Pregunta no existe")
    p = db.get(Pilar, pregunta.pilar_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pilar no existe")
    _ensure_company_access(current, p.empresa_id)

    payload = data.model_dump(exclude_unset=True)
    if not payload:
        return pregunta

    updated = crud.update_pregunta(
        db,
        pregunta_id,
        enunciado=payload.get("enunciado"),
        tipo=payload.get("tipo"),
        es_obligatoria=payload.get("es_obligatoria"),
        peso=payload.get("peso"),
        respuesta_esperada=payload.get("respuesta_esperada"),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Pregunta no existe")

    audit_log(
        db,
        action=AuditActionEnum.QUESTION_UPDATE,
        current_user=current,
        empresa_id=p.empresa_id,
        entity_type="Pregunta",
        entity_id=updated.id,
        notes=f"Actualizó pregunta {updated.enunciado[:60]}",
        diff_after={"id": updated.id, "pilar_id": updated.pilar_id},
        request=request,
    )
    return updated
@app.delete("/questions/{pregunta_id}", status_code=204)

def delete_question(

    pregunta_id: int,

    request: Request,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    q = db.get(Pregunta, pregunta_id)

    if not q:

        raise HTTPException(status_code=404, detail="Not Found")

    p = db.get(Pilar, q.pilar_id)

    if not p:

        raise HTTPException(status_code=404, detail="Pilar no existe")

    _ensure_company_access(current, p.empresa_id)



    ok = crud.delete_pregunta(db, pregunta_id)

    if not ok:

        raise HTTPException(status_code=404, detail="Not Found")

    audit_log(

        db,

        action=AuditActionEnum.QUESTION_DELETE,

        current_user=current,

        empresa_id=p.empresa_id,

        entity_type="Pregunta",

        entity_id=pregunta_id,

        notes=f"Eliminó pregunta {q.enunciado[:60]}",

        diff_before={"id": q.id, "pilar_id": q.pilar_id},

        request=request,

    )

    return None



# ======================================================

# CUESTIONARIOS (nuevo)

# ======================================================

@app.post("/questionnaires", response_model=CuestionarioRead, status_code=201)

def create_questionnaire(

    data: CuestionarioCreate,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, data.empresa_id)

    c = crud.create_cuestionario(

        db,

        empresa_id=data.empresa_id,

        titulo=data.titulo,

        version=data.version,

        estado=data.estado,              # BORRADOR o PUBLICADO

        preguntas_ids=data.preguntas_ids

    )

    return c



@app.get("/companies/{empresa_id}/questionnaires", response_model=list[CuestionarioRead])

def list_company_questionnaires(

    empresa_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, empresa_id)

    return crud.list_cuestionarios(db, empresa_id)



@app.patch("/questionnaires/{cuestionario_id}/publish", response_model=CuestionarioRead)

def publish_questionnaire(

    cuestionario_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    c = db.get(Cuestionario, cuestionario_id)

    if not c:

        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")

    _ensure_company_access(current, c.empresa_id)

    c.estado = "PUBLICADO"

    db.commit()

    db.refresh(c)

    return c



# ======================================================

# ASIGNACIONES

# ======================================================

@app.post("/assignments", response_model=AsignacionRead, status_code=201)

def create_assignment(

    data: AsignacionCreate,

    request: Request,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    # Admin empresa solo puede crear para su empresa

    if current.rol == RolEnum.ADMIN:

        if current.empresa_id != data.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes crear asignaciones en otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    try:

        asg = crud.create_asignacion(

            db,

            empresa_id=data.empresa_id,

            cuestionario_id=data.cuestionario_id,

            alcance_tipo=data.alcance_tipo,

            alcance_id=data.alcance_id,

            fecha_inicio=data.fecha_inicio,

            fecha_cierre=data.fecha_cierre,

            anonimo=data.anonimo,

        )

    except ValueError as e:

        raise HTTPException(status_code=400, detail=str(e))

    audit_log(

        db,

        action=AuditActionEnum.ASSIGNMENT_CREATE,

        current_user=current,

        empresa_id=asg.empresa_id,

        entity_type="Asignacion",

        entity_id=asg.id,

        notes=f"Creó asignación #{asg.id}",

        diff_after={"id": asg.id, "empresa_id": asg.empresa_id},

        request=request,

    )

    return asg



@app.get("/assignments", response_model=list[AsignacionRead])

def list_assignments(

    empresa_id: Optional[int] = None,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    effective_empresa_id = empresa_id

    if current.rol in (RolEnum.ADMIN_SISTEMA, RolEnum.ANALISTA):

        pass

    elif current.rol == RolEnum.ADMIN:

        effective_empresa_id = empresa_id if empresa_id is not None else current.empresa_id

    elif current.rol == RolEnum.USUARIO:

        if current.empresa_id is None:

            raise HTTPException(status_code=403, detail="Permisos insuficientes")

        if empresa_id is not None and empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="Permisos insuficientes")

        effective_empresa_id = current.empresa_id

    else:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    return crud.list_asignaciones(db, empresa_id=effective_empresa_id)



@app.get("/assignments/{asignacion_id}", response_model=AsignacionRead)

def get_assignment(

    asignacion_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    asg = _ensure_assignment_access(db, current, asignacion_id)

    return asg



# Obtener (y opcionalmente crear) asignaciÃ³n vigente de una empresa

@app.get("/companies/{empresa_id}/assignments/active", response_model=Optional[AsignacionRead])

def get_active_assignment_for_company(

    empresa_id: int,

    create_if_missing: bool = Query(False),

    anonimo: bool = Query(False),

    ventana_dias: int = Query(30, ge=1, le=365),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, empresa_id)



    if create_if_missing:

        asg = crud.get_or_create_active_asignacion(db, empresa_id, ventana_dias=ventana_dias, anonimo=anonimo)

    else:

        asg = crud.get_active_asignacion_for_empresa(db, empresa_id)



    return asg  # puede ser None (200 con null)



# ======================================================

# DEV SEED

# ======================================================

@app.post("/dev/seed-demo-survey", dependencies=[Depends(require_roles(RolEnum.ADMIN_SISTEMA))])

def seed_demo_survey(db: Session = Depends(get_db)):

    # Empresa

    empresas = crud.list_empresas(db)

    emp = empresas[0] if empresas else crud.create_empresa(db, "DemoCo", None, None, ["DiseÃ±o", "TI"])



    # Pilar

    pilares = crud.list_pilares(db, emp.id)

    pil = pilares[0] if pilares else crud.create_pilar(db, emp.id, "Cultura", "Buenas prÃ¡cticas", 1)



    # Pregunta

    if not crud.list_preguntas(db, pil.id):

        crud.create_pregunta(
            db,
            pil.id,
            "Â¿RecomendarÃ­as la empresa?",
            TipoPreguntaEnum.LIKERT,
            True,
            1,
            None,
        )



    # Cuestionario

    cuests = crud.list_cuestionarios(db, emp.id)

    if not cuests:

        preg_ids = [p.id for p in crud.list_preguntas(db, pil.id)]

        cuest = crud.create_cuestionario(db, emp.id, "Clima 2025", 1, "PUBLICADO", preg_ids)

    else:

        cuest = cuests[0]



    # AsignaciÃ³n vigente â naive UTC para coherencia

    now = datetime.utcnow()

    fi = now - timedelta(hours=1)

    fc = now + timedelta(days=30)

    asgs = crud.list_asignaciones(db, emp.id)

    if not asgs:

        asg = crud.create_asignacion(db, emp.id, cuest.id, "EMPRESA", None, fi, fc, False)

    else:

        asg = asgs[0]



    return {"ok": True, "empresa_id": emp.id, "pilar_id": pil.id, "cuestionario_id": cuest.id, "asignacion_id": asg.id}



# ======================================================

# ENCUESTA â Pilares, Preguntas, Respuestas y Progreso

# ======================================================



# --- NUEVO: MODO SIMPLE (garantiza cuestionario+asignaciÃ³n automÃ¡ticamente) ---

class SimpleBeginRequest(BaseModel):

    empresa_id: int

    anonimo: bool = False



@app.post("/survey/simple/begin", response_model=SurveyBeginResponse)

def survey_simple_begin(

    data: SimpleBeginRequest,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_company_access(current, data.empresa_id)

    # Garantiza cuestionario publicado (auto) y asignaciÃ³n vigente (auto)

    try:

        asg = crud.get_or_create_auto_asignacion(db, empresa_id=data.empresa_id, anonimo=data.anonimo)

    except ValueError as exc:

        raise HTTPException(status_code=400, detail=str(exc))

    return SurveyBeginResponse(asignacion_id=asg.id)



# --- Flujo clÃ¡sico (requiere asignaciÃ³n existente) ---

@app.post("/survey/begin", response_model=SurveyBeginResponse)

def survey_begin(

    data: SurveyBeginRequest,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    asg = _ensure_assignment_access(db, current, data.asignacion_id)

    # bloquear fuera de vigencia (naive UTC)

    if not crud.is_assignment_active(asg, now=datetime.utcnow()):

        raise HTTPException(status_code=403, detail="AsignaciÃ³n fuera de vigencia")

    return SurveyBeginResponse(asignacion_id=asg.id)



@app.get("/survey/{asignacion_id}/progress", response_model=AssignmentProgress)

def survey_progress(

    asignacion_id: int,

    empleado_id: Optional[int] = Query(None),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_assignment_access(db, current, asignacion_id)

    pr = crud.compute_assignment_progress(db, asignacion_id, empleado_id)

    return AssignmentProgress(**pr)



# lista pilares realmente presentes en el cuestionario de la asignaciÃ³n

@app.get("/survey/{asignacion_id}/pillars", response_model=list[PilarRead])

def survey_pillars(

    asignacion_id: int,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    _ensure_assignment_access(db, current, asignacion_id)

    return crud.list_pilares_por_asignacion(db, asignacion_id)



@app.get("/survey/{asignacion_id}/pillars/{pilar_id}", response_model=PillarQuestionsResponse)

def survey_pillar_questions(

    asignacion_id: int,

    pilar_id: int,

    empleado_id: Optional[int] = Query(None),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    asg = _ensure_assignment_access(db, current, asignacion_id)

    pil = db.get(Pilar, pilar_id)

    if not pil or (pil.empresa_id is not None and pil.empresa_id != asg.empresa_id):

        raise HTTPException(status_code=404, detail="Pilar no encontrado")



    preguntas, rmap = crud.get_pilar_questions_with_answers(db, asignacion_id, pilar_id, empleado_id)
    include_expected = current.rol in (RolEnum.ADMIN_SISTEMA, RolEnum.ADMIN, RolEnum.ANALISTA)

    items = [{
        "id": q.id,
        "enunciado": q.enunciado,
        "tipo": q.tipo,
        "es_obligatoria": q.es_obligatoria,
        "peso": q.peso,
        "respuesta_actual": (rmap[q.id].valor if q.id in rmap else None),
        "respuesta_esperada": q.respuesta_esperada if include_expected else None,
    } for q in preguntas]

    return PillarQuestionsResponse(
        pilar_id=pil.id,
        pilar_nombre=pil.nombre,
        likert_levels=LIKERT_LEVELS,
        preguntas=items,
    )



@app.get("/analytics/dashboard", response_model=DashboardAnalyticsResponse)
def analytics_dashboard(
    empresa_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    departamento_ids: Optional[List[int]] = Query(None),
    empleado_ids: Optional[List[int]] = Query(None),
    pilar_ids: Optional[List[int]] = Query(None),
    include_timeline: bool = Query(True),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    """
    Endpoint para obtener métricas del dashboard de analytics.
    
    MODO GLOBAL (empresa_id = None):
    - Solo disponible para ADMIN_SISTEMA
    - Agrupa datos de TODAS las empresas sin filtrar por empresa_id
    - Aplica otros filtros (departamento, pilar, empleado) si están presentes
    
    MODO NORMAL (empresa_id = número):
    - Disponible para usuarios con acceso a esa empresa
    - Filtra datos solo de la empresa especificada
    - Aplica otros filtros normalmente
    """
    # Validación de permisos: modo global solo para ADMIN_SISTEMA
    if empresa_id is None:
        if current.rol != RolEnum.ADMIN_SISTEMA:
            raise HTTPException(status_code=403, detail="Solo ADMIN_SISTEMA puede ver la vista global")
    else:
        # Modo normal: validar acceso a la empresa específica
        _ensure_company_access(current, empresa_id)
    
    # compute_dashboard_analytics maneja empresa_id=None agrupando datos de todas las empresas
    data = crud.compute_dashboard_analytics(
        db,
        empresa_id=empresa_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        departamento_ids=departamento_ids,
        empleado_ids=empleado_ids,
        pilar_ids=pilar_ids,
        include_timeline=include_timeline,
    )
    return DashboardAnalyticsResponse(**data)


@app.get("/analytics/responses/export")
def analytics_responses_export(
    empresa_id: int = Query(...),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    departamento_ids: Optional[List[int]] = Query(None),
    empleado_ids: Optional[List[int]] = Query(None),
    pilar_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)
    rows = crud.list_responses_for_export(
        db,
        empresa_id=empresa_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        departamento_ids=departamento_ids,
        empleado_ids=empleado_ids,
        pilar_ids=pilar_ids,
    )

    headers = [
        "respuesta_id",
        "fecha_respuesta",
        "asignacion_id",
        "alcance_tipo",
        "alcance_id",
        "pregunta_id",
        "pregunta_enunciado",
        "pilar_id",
        "pilar_nombre",
        "empleado_id",
        "empleado_nombre",
        "departamento_nombre",
        "valor",
    ]

    def iter_rows():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
        for row in rows:
            record = [
                row["respuesta_id"],
                row["fecha_respuesta"],
                row["asignacion_id"],
                row["alcance_tipo"],
                row["alcance_id"],
                row["pregunta_id"],
                row["pregunta_enunciado"],
                row["pilar_id"],
                row["pilar_nombre"],
                row["empleado_id"],
                row["empleado_nombre"],
                row["departamento_nombre"],
                row["valor"],
            ]
            writer.writerow(record)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

    filename = f"respuestas-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    return StreamingResponse(
        iter_rows(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/survey/{asignacion_id}/answers", response_model=BulkAnswersResponse)

def survey_submit_answers(

    asignacion_id: int,

    payload: BulkAnswersRequest,

    empleado_id: Optional[int] = Query(None),

    request: Request = None,

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    asg = _ensure_assignment_access(db, current, asignacion_id)



    # bloquear fuera de vigencia (naive UTC)

    if not crud.is_assignment_active(asg, now=datetime.utcnow()):

        raise HTTPException(status_code=403, detail="Asignación fuera de vigencia")



    # exigir empleado_id si NO es anónimo

    if not asg.anonimo and empleado_id is None:

        raise HTTPException(status_code=400, detail="Se requiere empleado_id para esta asignación")



    res = crud.submit_bulk_answers(db, asignacion_id, [a.model_dump() for a in payload.respuestas], empleado_id)

    audit_log(

        db,

        action=AuditActionEnum.SURVEY_ANSWER_BULK,

        current_user=current,

        empresa_id=asg.empresa_id,

        entity_type="Asignacion",

        entity_id=asignacion_id,

        notes="Guardó respuestas de encuesta",

        extra={"creadas": res.get("creadas", 0), "actualizadas": res.get("actualizadas", 0)},

        request=request,

    )

    return BulkAnswersResponse(ok=True, creadas=res.get("creadas", 0), actualizadas=res.get("actualizadas", 0))



# ======================================================

# AUDITORÍA

# ======================================================

@app.get("/audit", response_model=list[AuditLogRead])

def list_audit_logs(

    request: Request,

    date_from: Optional[datetime] = Query(None),

    date_to: Optional[datetime] = Query(None),

    empresa_id: Optional[int] = Query(None),

    user_id: Optional[int] = Query(None),

    user_email: Optional[str] = Query(None),

    user_role: Optional[RolEnum] = Query(None),

    action: Optional[AuditActionEnum] = Query(None),

    entity_type: Optional[str] = Query(None),

    search: Optional[str] = Query(None),

    limit: int = Query(200, ge=1, le=500),

    offset: int = Query(0, ge=0),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    scope_empresa_id: Optional[int] = None

    if current.rol == RolEnum.ADMIN:

        scope_empresa_id = current.empresa_id

        if empresa_id is not None and empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes consultar auditoría de otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    logs = crud.list_audit_logs(

        db,

        date_from=date_from,

        date_to=date_to,

        empresa_id=empresa_id,

        user_id=user_id,

        user_email=user_email,

        user_role=user_role.value if user_role else None,

        action=action,

        entity_type=entity_type,

        search=search,

        scope_empresa_id=scope_empresa_id,

        limit=limit,

        offset=offset,

    )

    return logs


@app.post("/audit/report-export", status_code=204)
def log_report_export(
    payload: ReportExportRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    extra = {"report_type": payload.report_type}
    if payload.notes:
        extra["notes"] = payload.notes
    audit_log(
        db,
        action=AuditActionEnum.REPORT_EXPORT,
        current_user=current,
        empresa_id=current.empresa_id,
        entity_type="Report",
        notes=f"Exportó dashboard {payload.report_type}",
        extra=extra,
        request=request,
    )
    return {"ok": True}



@app.get("/audit/export")

def export_audit_logs(

    request: Request,

    date_from: Optional[datetime] = Query(None),

    date_to: Optional[datetime] = Query(None),

    empresa_id: Optional[int] = Query(None),

    user_id: Optional[int] = Query(None),

    user_email: Optional[str] = Query(None),

    user_role: Optional[RolEnum] = Query(None),

    action: Optional[AuditActionEnum] = Query(None),

    entity_type: Optional[str] = Query(None),

    search: Optional[str] = Query(None),

    db: Session = Depends(get_db),

    current: Usuario = Depends(get_current_user),

):

    scope_empresa_id: Optional[int] = None

    if current.rol == RolEnum.ADMIN:

        scope_empresa_id = current.empresa_id

        if empresa_id is not None and empresa_id != current.empresa_id:

            raise HTTPException(status_code=403, detail="No puedes consultar auditoría de otra empresa")

    elif current.rol != RolEnum.ADMIN_SISTEMA:

        raise HTTPException(status_code=403, detail="Permisos insuficientes")



    logs = crud.export_audit_logs(

        db,

        date_from=date_from,

        date_to=date_to,

        empresa_id=empresa_id,

        user_id=user_id,

        user_email=user_email,

        user_role=user_role.value if user_role else None,

        action=action,

        entity_type=entity_type,

        search=search,

        scope_empresa_id=scope_empresa_id,

    )



    audit_log(

        db,

        action=AuditActionEnum.AUDIT_EXPORT,

        current_user=current,

        empresa_id=current.empresa_id,

        entity_type="AuditLog",

        notes=f"Exportó {len(logs)} registros de auditoría",

        request=request,

    )



    rows = [

        {

            "id": log.id,

            "created_at": log.created_at.isoformat() if log.created_at else "",

            "empresa_id": log.empresa_id or "",

            "user_email": log.user_email or "",

            "user_role": log.user_role or "",

            "action": log.action.value if hasattr(log.action, "value") else log.action,

            "entity_type": log.entity_type or "",

            "entity_id": log.entity_id or "",

            "notes": log.notes or "",

            "ip": log.ip or "",

            "method": log.method or "",

            "path": log.path or "",

        }

        for log in logs

    ]



    headers = [

        "id",

        "created_at",

        "empresa_id",

        "user_email",

        "user_role",

        "action",

        "entity_type",

        "entity_id",

        "notes",

        "ip",

        "method",

        "path",

    ]



    def iter_rows():

        buffer = io.StringIO()

        writer = csv.writer(buffer)

        writer.writerow(headers)

        yield buffer.getvalue()

        buffer.seek(0)

        buffer.truncate(0)

        for row in rows:

            writer.writerow([

                row["id"],

                row["created_at"],

                row["empresa_id"],

                row["user_email"],

                row["user_role"],

                row["action"],

                row["entity_type"],

                row["entity_id"],

                row["notes"],

                row["ip"],

                row["method"],

                row["path"],

            ])

            yield buffer.getvalue()

            buffer.seek(0)

            buffer.truncate(0)



    filename = f"audit-log-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"

    return StreamingResponse(

        iter_rows(),

        media_type="text/csv",

        headers={"Content-Disposition": f'attachment; filename="{filename}"'},

    )


@app.delete("/audit/{log_id}", status_code=204)
def delete_audit_entry(
    log_id: int,
    payload: AuditDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Solo ADMIN_SISTEMA puede eliminar auditorías")
    if not verify_password(payload.password, current.password_hash):
        raise HTTPException(status_code=403, detail="Contraseña inválida")
    if not crud.delete_audit_log(db, log_id):
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    audit_log(
        db,
        action=AuditActionEnum.AUDIT_DELETE,
        current_user=current,
        empresa_id=current.empresa_id,
        entity_type="AuditLog",
        entity_id=log_id,
        notes="Eliminó un registro de auditoría",
        request=request,
    )
    return None


@app.post("/audit/backup-and-clear", status_code=200)
def backup_and_clear_audit_logs(
    payload: AuditDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    """Genera un CSV de respaldo y luego vacía el registro de auditoría."""
    if current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Solo ADMIN_SISTEMA puede vaciar el registro de auditoría")
    if not verify_password(payload.password, current.password_hash):
        raise HTTPException(status_code=403, detail="Contraseña inválida")
    
    import csv
    import io
    from datetime import datetime
    
    # Leer todos los registros de auditoría
    logs = crud.list_audit_logs(
        db,
        limit=100000,  # Límite alto para obtener todos
        offset=0,
    )
    
    # Generar CSV en memoria
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    
    # Encabezados
    writer.writerow([
        "id", "created_at", "user_id", "user_email", "user_role", "empresa_id",
        "action", "entity_type", "entity_id", "notes", "ip", "user_agent",
        "method", "path"
    ])
    
    # Escribir datos
    for log in logs:
        writer.writerow([
            log.id,
            log.created_at.isoformat() if log.created_at else "",
            log.user_id or "",
            log.user_email or "",
            log.user_role or "",
            log.empresa_id or "",
            log.action.value if log.action else "",
            log.entity_type or "",
            log.entity_id or "",
            log.notes or "",
            log.ip or "",
            log.user_agent or "",
            log.method or "",
            log.path or "",
        ])
    
    csv_content = buffer.getvalue()
    buffer.close()
    
    # Vaciar el registro
    scope_empresa_id = None
    if current.rol == RolEnum.ADMIN:
        scope_empresa_id = current.empresa_id
    
    deleted_count = crud.clear_all_audit_logs(db, scope_empresa_id=scope_empresa_id)
    
    # Generar nombre de archivo con timestamp
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    filename = f"auditoria-respaldo-{timestamp}.csv"
    
    from fastapi.responses import StreamingResponse
    
    return StreamingResponse(
        io.BytesIO(csv_content.encode('utf-8')),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@app.delete("/audit", status_code=200)
def clear_all_audit_logs(
    payload: AuditDeleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Solo ADMIN_SISTEMA puede vaciar el registro de auditoría")
    if not verify_password(payload.password, current.password_hash):
        raise HTTPException(status_code=403, detail="Contraseña inválida")
    
    scope_empresa_id = None
    if current.rol == RolEnum.ADMIN:
        scope_empresa_id = current.empresa_id
    
    deleted_count = crud.clear_all_audit_logs(db, scope_empresa_id=scope_empresa_id)
    
    audit_log(
        db,
        action=AuditActionEnum.AUDIT_DELETE,
        current_user=current,
        empresa_id=current.empresa_id,
        entity_type="AuditLog",
        notes=f"Vació el registro de auditoría ({deleted_count} registros eliminados)",
        request=request,
    )
    
    return {"deleted_count": deleted_count}


# ======================================================

# â Crear usuario simple (con bcrypt y RolEnum)

# ======================================================

@app.post("/crear_usuario_simple")

def crear_usuario_simple(

    nombre: str,

    email: str,

    password: str,

    rol: str = "ADMIN_SISTEMA",

    db: Session = Depends(get_db)

):

    """

    Crea un usuario directamente (sin autenticaciÃ³n, solo para pruebas)

    - Hash con bcrypt (compatible con /auth/login)

    - Convierte 'rol' string a RolEnum

    """

    # bcrypt compatible con verify_password

    password_hash = pwd_context.hash(password)



    # Convertir string a RolEnum (acepta admin, ADMIN, usuario, etc.)

    try:

        rol_enum = RolEnum[rol.upper()]

    except KeyError:

        raise HTTPException(status_code=400, detail=f"Rol invÃ¡lido: {rol}. Usa uno de: ADMIN_SISTEMA, ADMIN, ANALISTA, USUARIO")



    nuevo_usuario = models.Usuario(

        nombre=nombre,

        email=email,

        password_hash=password_hash,

        rol=rol_enum,

        activo=True

    )



    db.add(nuevo_usuario)

    db.commit()

    db.refresh(nuevo_usuario)



    return {

        "mensaje": "â Usuario creado correctamente (bcrypt)",

        "id": nuevo_usuario.id,

        "email": nuevo_usuario.email,

        "rol": nuevo_usuario.rol

    }





