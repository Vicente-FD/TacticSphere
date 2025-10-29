# app/main.py
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db
import os, time
import hashlib
from datetime import datetime, timedelta  # usamos naive UTC para coherencia
from pydantic import BaseModel  # ⬅️ para SimpleBeginRequest
from app import models, database
from .database import Base, engine, get_db
from .models import (
    RolEnum, Usuario, TipoPreguntaEnum,
    Empresa, Departamento, Pilar, Pregunta, Asignacion, Empleado,
    Cuestionario,
)
from .auth import verify_password, create_access_token, get_current_user, require_roles
from . import crud
from .schemas import (
    # Auth
    LoginRequest, TokenResponse,
    # Empresa / Depto
    EmpresaCreate, EmpresaRead,
    DepartamentoCreate, DepartamentoRead,
    # Usuarios
    UsuarioCreate, UsuarioRead, UsuarioUpdate, UsuarioPasswordReset,
    # Empleados
    EmpleadoCreate, EmpleadoRead, EmpleadoUpdate,
    # Pilares / Preguntas
    PilarCreate, PilarRead,
    PreguntaCreate, PreguntaRead,
    # Cuestionarios
    CuestionarioCreate, CuestionarioRead,
    # Asignaciones
    AsignacionCreate, AsignacionRead,
    # Encuesta
    SurveyBeginRequest, SurveyBeginResponse,
    PillarQuestionsResponse,
    BulkAnswersRequest, BulkAnswersResponse,
    AssignmentProgress,
)
from passlib.context import CryptContext  # ✅ agregado para bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # ✅ contexto para hash compatible con login

app = FastAPI(title="TacticSphere API")

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

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
        "cwd": os.getcwd__,  # mantenemos como en tu versión
        "app_id": id(app),
        "loaded_at": time.ctime(),
        "routes": [f"{sorted(r.methods)} {r.path}" for r in app.routes][:25],
    }

# ======================================================
# Helpers de autorización de empresa
# ======================================================
def _ensure_company_access(current: Usuario, target_empresa_id: Optional[int]):
    """ADMIN_SISTEMA: acceso total. ADMIN: su empresa o recursos globales."""
    if current.rol == RolEnum.ADMIN_SISTEMA:
        return
    if target_empresa_id is None:
        if current.rol == RolEnum.ADMIN:
            return
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    if current.rol == RolEnum.ADMIN and current.empresa_id == target_empresa_id:
        return
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
    ADMIN_SISTEMA: acceso total.
    ADMIN / otros: sólo si la asignación pertenece a su empresa.
    """
    asg = crud.get_asignacion(db, asignacion_id)
    if not asg:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    if current.rol != RolEnum.ADMIN_SISTEMA:
        if current.empresa_id is None or current.empresa_id != asg.empresa_id:
            raise HTTPException(status_code=403, detail="No puedes acceder a esta asignación")
    return asg

# ======================================================
# AUTH
# ======================================================
@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")
    token = create_access_token({
        "sub": str(user.id),
        "rol": user.rol.value,
        "empresa_id": user.empresa_id
    })
    return TokenResponse(access_token=token)

@app.get("/me", response_model=UsuarioRead)
def me(current: Usuario = Depends(get_current_user)):
    return current

# Seed admin (solo dev)
@app.post("/dev/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, "admin@tacticsphere.com"):
        return {"ok": True, "msg": "admin ya existe"}
    admin = crud.create_usuario(
        db,
        nombre="Admin Sistema",
        email="admin@tacticsphere.com",
        password="Admin123456!",
        rol=RolEnum.ADMIN_SISTEMA,
        empresa_id=None,
    )
    return {"ok": True, "admin_id": admin.id}

# ======================================================
# EMPRESAS
# ======================================================
@app.get("/companies", response_model=list[EmpresaRead])
def companies_list(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    return crud.list_empresas(db)

@app.post("/companies", response_model=EmpresaRead, status_code=201)
def create_company(
    data: EmpresaCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    return crud.create_empresa(db, data.nombre, data.rut, data.giro, data.departamentos)

@app.delete("/companies/{empresa_id}", status_code=204)
def delete_company(
    empresa_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_roles(RolEnum.ADMIN_SISTEMA)),
):
    ok = crud.delete_empresa(db, empresa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not Found")
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
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)
    return crud.create_departamento(db, empresa_id, data.nombre)

@app.delete("/departments/{dep_id}", status_code=204)
def delete_department(
    dep_id: int,
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
    return None

# ======================================================
# EMPLEADOS
# ======================================================
@app.get("/companies/{empresa_id}/employees", response_model=list[EmpleadoRead])
def list_employees(
    empresa_id: int,
    departamento_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)
    return crud.list_empleados(db, empresa_id=empresa_id, departamento_id=departamento_id)

@app.post("/companies/{empresa_id}/employees", response_model=EmpleadoRead, status_code=201)
def create_employee(
    empresa_id: int,
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    _ensure_company_access(current, empresa_id)
    if data.empresa_id != empresa_id:
        raise HTTPException(status_code=400, detail="empresa_id inconsistente")

    if data.departamento_id:
        dep = db.get(Departamento, data.departamento_id)
        if not dep or dep.empresa_id != empresa_id:
            raise HTTPException(status_code=400, detail="Departamento inválido para la empresa")

    return crud.create_empleado(
        db,
        empresa_id=empresa_id,
        nombre=data.nombre,
        email=data.email,
        cargo=data.cargo,
        departamento_id=data.departamento_id,
    )

@app.patch("/employees/{empleado_id}", response_model=EmpleadoRead)
def update_employee(
    empleado_id: int,
    data: EmpleadoUpdate,
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
            raise HTTPException(status_code=400, detail="Departamento inválido para la empresa")

    updated = crud.update_empleado(
        db,
        empleado_id=empleado_id,
        nombre=data.nombre,
        email=data.email,
        cargo=data.cargo,
        departamento_id=data.departamento_id,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
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
    # ADMIN_SISTEMA ve todos; ADMIN solo su empresa
    if current.rol == RolEnum.ADMIN:
        empresa_id = current.empresa_id
    elif current.rol not in (RolEnum.ADMIN, RolEnum.ADMIN_SISTEMA):
        raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return crud.list_usuarios(db, empresa_id)

@app.post("/users", response_model=UsuarioRead, status_code=201)
def create_user(
    data: UsuarioCreate,
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
    return crud.create_usuario(db, data.nombre, data.email, data.password, data.rol, target_empresa_id)

@app.patch("/users/{user_id}", response_model=UsuarioRead)
def update_user(
    user_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")

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
    return updated

@app.post("/users/{user_id}/password", response_model=UsuarioRead)
def reset_password(
    user_id: int,
    data: UsuarioPasswordReset,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")

    if current.rol == RolEnum.ADMIN:
        if u.empresa_id != current.empresa_id:
            raise HTTPException(status_code=403, detail="No puedes cambiar contraseña de otra empresa")
    elif current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    u = crud.set_password(db, user_id, data.new_password)
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")
    return u

@app.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not Found")

    if current.rol == RolEnum.ADMIN:
        if u.empresa_id != current.empresa_id:
            raise HTTPException(status_code=403, detail="No puedes eliminar usuarios de otra empresa")
    elif current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    ok = crud.delete_usuario(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not Found")
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
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if data.empresa_id is not None:
        _ensure_company_access(current, data.empresa_id)
    else:
        if current.rol not in (RolEnum.ADMIN, RolEnum.ADMIN_SISTEMA):
            raise HTTPException(status_code=403, detail="Permisos insuficientes")
    return crud.create_pilar(db, data.empresa_id, data.nombre, data.descripcion, data.peso)

@app.delete("/pillars/{pilar_id}", status_code=204)
def delete_pillar(
    pilar_id: int,
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
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    p = db.get(Pilar, data.pilar_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pilar no existe")
    _ensure_company_access(current, p.empresa_id)

    if data.tipo not in (TipoPreguntaEnum.LIKERT, TipoPreguntaEnum.ABIERTA, TipoPreguntaEnum.SI_NO):
        raise HTTPException(status_code=400, detail="Tipo inválido")

    return crud.create_pregunta(db, data.pilar_id, data.enunciado, data.tipo, data.es_obligatoria, data.peso)

@app.delete("/questions/{pregunta_id}", status_code=204)
def delete_question(
    pregunta_id: int,
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
    return asg

@app.get("/assignments", response_model=list[AsignacionRead])
def list_assignments(
    empresa_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    # ADMIN ve solo su empresa; ADMIN_SISTEMA opcional filtra por query
    if current.rol == RolEnum.ADMIN:
        empresa_id = current.empresa_id
    elif current.rol != RolEnum.ADMIN_SISTEMA:
        raise HTTPException(status_code=403, detail="Permisos insuficientes")

    return crud.list_asignaciones(db, empresa_id=empresa_id)

@app.get("/assignments/{asignacion_id}", response_model=AsignacionRead)
def get_assignment(
    asignacion_id: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    asg = _ensure_assignment_access(db, current, asignacion_id)
    return asg

# Obtener (y opcionalmente crear) asignación vigente de una empresa
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
    emp = empresas[0] if empresas else crud.create_empresa(db, "DemoCo", None, None, ["Diseño", "TI"])

    # Pilar
    pilares = crud.list_pilares(db, emp.id)
    pil = pilares[0] if pilares else crud.create_pilar(db, emp.id, "Cultura", "Buenas prácticas", 1)

    # Pregunta
    if not crud.list_preguntas(db, pil.id):
        crud.create_pregunta(db, pil.id, "¿Recomendarías la empresa?", TipoPreguntaEnum.LIKERT, True, 1)

    # Cuestionario
    cuests = crud.list_cuestionarios(db, emp.id)
    if not cuests:
        preg_ids = [p.id for p in crud.list_preguntas(db, pil.id)]
        cuest = crud.create_cuestionario(db, emp.id, "Clima 2025", 1, "PUBLICADO", preg_ids)
    else:
        cuest = cuests[0]

    # Asignación vigente — naive UTC para coherencia
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
# ENCUESTA — Pilares, Preguntas, Respuestas y Progreso
# ======================================================

# --- NUEVO: MODO SIMPLE (garantiza cuestionario+asignación automáticamente) ---
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
    # Garantiza cuestionario publicado (auto) y asignación vigente (auto)
    try:
        asg = crud.get_or_create_auto_asignacion(db, empresa_id=data.empresa_id, anonimo=data.anonimo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SurveyBeginResponse(asignacion_id=asg.id)

# --- Flujo clásico (requiere asignación existente) ---
@app.post("/survey/begin", response_model=SurveyBeginResponse)
def survey_begin(
    data: SurveyBeginRequest,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    asg = _ensure_assignment_access(db, current, data.asignacion_id)
    # bloquear fuera de vigencia (naive UTC)
    if not crud.is_assignment_active(asg, now=datetime.utcnow()):
        raise HTTPException(status_code=403, detail="Asignación fuera de vigencia")
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

# lista pilares realmente presentes en el cuestionario de la asignación
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
    items = [{
        "id": q.id,
        "enunciado": q.enunciado,
        "tipo": q.tipo,
        "es_obligatoria": q.es_obligatoria,
        "peso": q.peso,
        "respuesta_actual": (rmap[q.id].valor if q.id in rmap else None),
    } for q in preguntas]
    return PillarQuestionsResponse(pilar_id=pil.id, pilar_nombre=pil.nombre, preguntas=items)

@app.post("/survey/{asignacion_id}/answers", response_model=BulkAnswersResponse)
def survey_submit_answers(
    asignacion_id: int,
    payload: BulkAnswersRequest,
    empleado_id: Optional[int] = Query(None),
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
    return BulkAnswersResponse(ok=True, creadas=res.get("creadas", 0), actualizadas=res.get("actualizadas", 0))

# ======================================================
# ✅ Crear usuario simple (con bcrypt y RolEnum)
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
    Crea un usuario directamente (sin autenticación, solo para pruebas)
    - Hash con bcrypt (compatible con /auth/login)
    - Convierte 'rol' string a RolEnum
    """
    # bcrypt compatible con verify_password
    password_hash = pwd_context.hash(password)

    # Convertir string a RolEnum (acepta admin, ADMIN, usuario, etc.)
    try:
        rol_enum = RolEnum[rol.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Rol inválido: {rol}. Usa uno de: ADMIN_SISTEMA, ADMIN, ANALISTA, USUARIO")

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
        "mensaje": "✅ Usuario creado correctamente (bcrypt)",
        "id": nuevo_usuario.id,
        "email": nuevo_usuario.email,
        "rol": nuevo_usuario.rol
    }
