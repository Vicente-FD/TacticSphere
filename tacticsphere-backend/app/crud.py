from typing import List, Optional, Dict, Tuple, Iterable
from datetime import datetime, timedelta, timezone  # usamos naive UTC
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_

from .auth import hash_password
from .models import (
    Usuario,
    Empresa,
    Departamento,
    Empleado,
    Pilar,
    Pregunta,
    Cuestionario,
    CuestionarioPregunta,
    Asignacion,
    Respuesta,
    ConsultingLead,
    RolEnum,
    TipoPreguntaEnum,
)

# ======================================================
# USUARIOS
# ======================================================

def get_user_by_email(db: Session, email: str):
    return db.scalars(select(Usuario).where(Usuario.email == email)).first()

def list_usuarios(db: Session, empresa_id: Optional[int] = None) -> List[Usuario]:
    stmt = select(Usuario)
    if empresa_id is not None:
        stmt = stmt.where(Usuario.empresa_id == empresa_id)
    return db.scalars(stmt).all()

def create_usuario(db: Session, nombre: str, email: str, password: str, rol: RolEnum, empresa_id: Optional[int]):
    user = Usuario(
        nombre=nombre,
        email=email,
        password_hash=hash_password(password),
        rol=rol,
        empresa_id=empresa_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_usuario(
    db: Session, user_id: int,
    nombre: Optional[str] = None,
    email: Optional[str] = None,
    rol: Optional[RolEnum] = None,
    empresa_id: Optional[int] = None,
    activo: Optional[bool] = None,
) -> Optional[Usuario]:
    u = db.get(Usuario, user_id)
    if not u:
        return None
    if nombre is not None:
        u.nombre = nombre
    if email is not None:
        u.email = email
    if rol is not None:
        u.rol = rol
    if empresa_id is not None:
        u.empresa_id = empresa_id
    if activo is not None:
        u.activo = activo
    db.commit()
    db.refresh(u)
    return u

def delete_usuario(db: Session, user_id: int) -> bool:
    u = db.get(Usuario, user_id)
    if not u:
        return False
    db.delete(u)
    db.commit()
    return True

def set_password(db: Session, user_id: int, new_password: str) -> Optional[Usuario]:
    u = db.get(Usuario, user_id)
    if not u:
        return None
    u.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(u)
    return u

# ======================================================
# EMPRESAS
# ======================================================

def list_empresas(db: Session) -> List[Empresa]:
    return db.scalars(select(Empresa)).all()

def create_empresa(db: Session, nombre: str, rut: Optional[str], giro: Optional[str],
                   departamentos: Optional[List[str]] = None):
    emp = Empresa(nombre=nombre, rut=rut, giro=giro, activa=True)
    db.add(emp)
    db.flush()  # para conseguir emp.id
    if departamentos:
        seen: set[str] = set()
        for raw in departamentos:
            if not raw:
                continue
            n = raw.strip()
            if not n:
                continue
            key = n.lower()
            if key in seen:
                continue
            seen.add(key)
            db.add(Departamento(nombre=n, empresa_id=emp.id))
    db.commit()
    db.refresh(emp)
    return emp

def delete_empresa(db: Session, empresa_id: int) -> bool:
    emp = db.get(Empresa, empresa_id)
    if not emp:
        return False
    db.delete(emp)
    db.commit()
    return True

# ======================================================
# DEPARTAMENTOS
# ======================================================

def list_departamentos_by_empresa(db: Session, empresa_id: int) -> List[Departamento]:
    return db.scalars(select(Departamento).where(Departamento.empresa_id == empresa_id)).all()

def create_departamento(db: Session, empresa_id: int, nombre: str) -> Departamento:
    dep = Departamento(empresa_id=empresa_id, nombre=nombre)
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep

def delete_departamento(db: Session, dep_id: int) -> bool:
    dep = db.get(Departamento, dep_id)
    if not dep:
        return False
    db.delete(dep)
    db.commit()
    return True

# ======================================================
# EMPLEADOS
# ======================================================

def list_empleados(db: Session, empresa_id: Optional[int] = None, departamento_id: Optional[int] = None) -> List[Empleado]:
    stmt = select(Empleado)
    if empresa_id is not None:
        stmt = stmt.where(Empleado.empresa_id == empresa_id)
    if departamento_id is not None:
        stmt = stmt.where(Empleado.departamento_id == departamento_id)
    return db.scalars(stmt).all()

def create_empleado(
    db: Session,
    empresa_id: int,
    nombre: str,
    email: Optional[str] = None,
    cargo: Optional[str] = None,
    departamento_id: Optional[int] = None,
) -> Empleado:
    emp = Empleado(
        empresa_id=empresa_id,
        nombre=nombre,
        email=email,
        cargo=cargo,
        departamento_id=departamento_id,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

def update_empleado(
    db: Session,
    empleado_id: int,
    nombre: Optional[str] = None,
    email: Optional[str] = None,
    cargo: Optional[str] = None,
    departamento_id: Optional[int] = None,
) -> Optional[Empleado]:
    emp = db.get(Empleado, empleado_id)
    if not emp:
        return None
    if nombre is not None:
        emp.nombre = nombre
    if email is not None:
        emp.email = email
    if cargo is not None:
        emp.cargo = cargo
    if departamento_id is not None:
        emp.departamento_id = departamento_id
    db.commit()
    db.refresh(emp)
    return emp

# ======================================================
# PILARES / PREGUNTAS
# ======================================================

def create_pilar(
    db: Session,
    empresa_id: Optional[int],
    nombre: str,
    descripcion: Optional[str],
    peso: int,
) -> Pilar:
    p = Pilar(empresa_id=empresa_id, nombre=nombre, descripcion=descripcion, peso=peso)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_pilares(db: Session, empresa_id: Optional[int]) -> List[Pilar]:
    stmt = select(Pilar)
    if empresa_id is not None:
        stmt = stmt.where(or_(Pilar.empresa_id == empresa_id, Pilar.empresa_id.is_(None)))
    else:
        stmt = stmt.where(Pilar.empresa_id.is_(None))
    return db.scalars(stmt.order_by(Pilar.id)).all()

def delete_pilar(db: Session, pilar_id: int, cascade: bool = False) -> Tuple[bool, Optional[str]]:
    p = db.get(Pilar, pilar_id)
    if not p:
        return False, "Pilar no existe"
    if not cascade:
        existen = db.scalar(select(func.count(Pregunta.id)).where(Pregunta.pilar_id == pilar_id)) or 0
        if existen:
            return False, "Pilar tiene preguntas asociadas"
    db.delete(p)
    db.commit()
    return True, None

def create_pregunta(db: Session, pilar_id: int, enunciado: str, tipo, es_obligatoria: bool, peso: int) -> Pregunta:
    q = Pregunta(pilar_id=pilar_id, enunciado=enunciado, tipo=tipo, es_obligatoria=es_obligatoria, peso=peso)
    db.add(q)
    db.commit()
    db.refresh(q)
    sync_question_with_questionnaires(db, q)
    return q

def list_preguntas(db: Session, pilar_id: int) -> List[Pregunta]:
    return db.scalars(select(Pregunta).where(Pregunta.pilar_id == pilar_id)).all()

def delete_pregunta(db: Session, pregunta_id: int) -> bool:
    q = db.get(Pregunta, pregunta_id)
    if not q:
        return False
    db.delete(q)
    db.commit()
    return True

# ======================================================
# CUESTIONARIOS
# ======================================================

def create_cuestionario(db: Session, empresa_id: int, titulo: str, version: int,
                        estado: str, preguntas_ids: List[int]) -> Cuestionario:
    c = Cuestionario(empresa_id=empresa_id, titulo=titulo, version=version, estado=estado)
    db.add(c)
    db.flush()
    # Relaciona preguntas
    if preguntas_ids:
        for pid in preguntas_ids:
            db.add(CuestionarioPregunta(cuestionario_id=c.id, pregunta_id=pid))
    db.commit()
    db.refresh(c)
    return c

def list_cuestionarios(db: Session, empresa_id: int) -> List[Cuestionario]:
    return db.scalars(select(Cuestionario).where(Cuestionario.empresa_id == empresa_id)).all()

# === cuestionario PUBLICADO más reciente ===
def get_latest_published_cuestionario(db: Session, empresa_id: int) -> Optional[Cuestionario]:
    stmt = (
        select(Cuestionario)
        .where(Cuestionario.empresa_id == empresa_id)
        .where(Cuestionario.estado == "PUBLICADO")
        .order_by(Cuestionario.version.desc(), Cuestionario.id.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()

# --- MODO SIMPLE: helpers automáticos ---

def build_or_get_auto_cuestionario(db: Session, empresa_id: int) -> Cuestionario:
    """
    Devuelve un Cuestionario PUBLICADO para la empresa.
    Si no existe, crea uno con TODAS las preguntas existentes (de todos los pilares).
    """
    todas_pregs = db.scalars(
        select(Pregunta)
        .join(Pilar, Pregunta.pilar_id == Pilar.id)
        .where(or_(Pilar.empresa_id == empresa_id, Pilar.empresa_id.is_(None)))
    ).all()
    if not todas_pregs:
        raise ValueError("No hay preguntas definidas en el sistema para crear un cuestionario.")

    existente = get_latest_published_cuestionario(db, empresa_id)
    if existente:
        ensure_questionnaire_questions(db, existente, todas_pregs, purge_missing=True)
        db.commit()
        return existente

    c = create_cuestionario(
        db=db,
        empresa_id=empresa_id,
        titulo="Auto (todas las preguntas)",
        version=1,
        estado="PUBLICADO",
        preguntas_ids=[p.id for p in todas_pregs],
    )
    return c

# ======================================================
# ASIGNACIONES
# ======================================================

def _validate_assignment_fk(db: Session, empresa_id: int, cuestionario_id: int,
                            alcance_tipo: str, alcance_id: Optional[int]) -> None:
    emp = db.get(Empresa, empresa_id)
    if not emp:
        raise ValueError("Empresa no existe")

    cuest = db.get(Cuestionario, cuestionario_id)
    if not cuest:
        raise ValueError("Cuestionario no existe")
    if cuest.empresa_id != empresa_id:
        raise ValueError("El cuestionario no pertenece a la empresa indicada")

    if alcance_tipo == "EMPRESA":
        if alcance_id is not None:
            raise ValueError("Para alcance EMPRESA, alcance_id debe ser None")
    elif alcance_tipo == "DEPARTAMENTO":
        if alcance_id is None:
            raise ValueError("Para alcance DEPARTAMENTO, alcance_id es obligatorio")
        dep = db.get(Departamento, alcance_id)
        if not dep or dep.empresa_id != empresa_id:
            raise ValueError("Departamento inválido para la empresa")
    elif alcance_tipo == "EMPLEADO":
        if alcance_id is None:
            raise ValueError("Para alcance EMPLEADO, alcance_id es obligatorio")
        emp_obj = db.get(Empleado, alcance_id)
        if not emp_obj or emp_obj.empresa_id != empresa_id:
            raise ValueError("Empleado inválido para la empresa")
    else:
        raise ValueError("alcance_tipo inválido")

def create_asignacion(
    db: Session,
    empresa_id: int,
    cuestionario_id: int,
    alcance_tipo: str,               # "EMPRESA" | "DEPARTAMENTO" | "EMPLEADO"
    alcance_id: Optional[int],
    fecha_inicio: datetime,
    fecha_cierre: datetime,
    anonimo: bool = False,
) -> Asignacion:
    if fecha_inicio >= fecha_cierre:
        raise ValueError("fecha_inicio debe ser menor que fecha_cierre")

    _validate_assignment_fk(db, empresa_id, cuestionario_id, alcance_tipo, alcance_id)

    asg = Asignacion(
        empresa_id=empresa_id,
        cuestionario_id=cuestionario_id,
        alcance_tipo=alcance_tipo,
        alcance_id=alcance_id,
        fecha_inicio=fecha_inicio,
        fecha_cierre=fecha_cierre,
        anonimo=anonimo,
    )
    db.add(asg)
    db.commit()
    db.refresh(asg)
    return asg

def list_asignaciones(db: Session, empresa_id: Optional[int] = None) -> List[Asignacion]:
    stmt = select(Asignacion)
    if empresa_id is not None:
        stmt = stmt.where(Asignacion.empresa_id == empresa_id)
    return db.scalars(stmt).all()

def get_asignacion(db: Session, asignacion_id: int) -> Optional[Asignacion]:
    return db.get(Asignacion, asignacion_id)

def is_assignment_active(asg: Asignacion, now: Optional[datetime] = None) -> bool:
    """
    True si now está dentro de [inicio, cierre].
    """
    now = now or datetime.utcnow()  # naive UTC
    return (asg.fecha_inicio <= now <= asg.fecha_cierre)

def get_active_asignacion_for_empresa(db: Session, empresa_id: int, now: Optional[datetime] = None) -> Optional[Asignacion]:
    """
    Devuelve la asignación vigente de alcance EMPRESA para la empresa dada,
    o None si no hay vigente.
    """
    now = now or datetime.utcnow()  # naive UTC
    stmt = (
        select(Asignacion)
        .where(Asignacion.empresa_id == empresa_id)
        .where(Asignacion.alcance_tipo == "EMPRESA")
        .where(Asignacion.alcance_id.is_(None))
        .where(Asignacion.fecha_inicio <= now)
        .where(Asignacion.fecha_cierre >= now)
        .order_by(Asignacion.fecha_inicio.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()

def get_or_create_active_asignacion(
    db: Session,
    empresa_id: int,
    ventana_dias: int = 30,
    anonimo: bool = False,
) -> Optional[Asignacion]:
    """
    Retorna una asignación vigente (alcance EMPRESA). Si no existe y hay un
    cuestionario PUBLICADO, crea una nueva con vigencia [ahora-1h, ahora+ventana_dias].
    Si no existe cuestionario publicado, retorna None.
    """
    existing = get_active_asignacion_for_empresa(db, empresa_id)
    if existing:
        return existing

    cuest = get_latest_published_cuestionario(db, empresa_id)
    if not cuest:
        return None

    now = datetime.utcnow()  # naive UTC
    fi = now - timedelta(hours=1)
    fc = now + timedelta(days=ventana_dias)

    return create_asignacion(
        db=db,
        empresa_id=empresa_id,
        cuestionario_id=cuest.id,
        alcance_tipo="EMPRESA",
        alcance_id=None,
        fecha_inicio=fi,
        fecha_cierre=fc,
        anonimo=anonimo,
    )

# --- MODO SIMPLE: garantiza asignación auto (vigencia amplia) ---

def get_or_create_auto_asignacion(
    db: Session,
    empresa_id: int,
    anonimo: bool = False,
) -> Asignacion:
    """
    Garantiza una asignación vigente a nivel EMPRESA.
    Si no hay, crea una con cuestionario AUTO (todas las preguntas) y vigencia amplia.
    """
    # Asegurar cuestionario actualizado (global + de empresa)
    cuest = build_or_get_auto_cuestionario(db, empresa_id)

    vigente = get_active_asignacion_for_empresa(db, empresa_id)
    if vigente:
        now = datetime.now(timezone.utc)
        vigente.cuestionario_id = cuest.id
        vigente.fecha_inicio = now - timedelta(hours=1)
        vigente.fecha_cierre = now + timedelta(days=3650)
        vigente.anonimo = anonimo
        db.commit()
        db.refresh(vigente)
        return vigente

    now = datetime.now(timezone.utc)
    fi = now - timedelta(hours=1)
    fc = now + timedelta(days=3650)

    return create_asignacion(
        db=db,
        empresa_id=empresa_id,
        cuestionario_id=cuest.id,
        alcance_tipo="EMPRESA",
        alcance_id=None,
        fecha_inicio=fi,
        fecha_cierre=fc,
        anonimo=anonimo,
    )

# ======================================================
# ENCUESTA (Asignación → Pilares/Preguntas → Respuestas & Progreso)
# ======================================================

def list_pilares_por_asignacion(db: Session, asignacion_id: int) -> List[Pilar]:
    asg = get_asignacion(db, asignacion_id)
    if not asg:
        return []
    stmt = (
        select(Pilar)
        .join(Pregunta, Pregunta.pilar_id == Pilar.id)
        .join(CuestionarioPregunta, CuestionarioPregunta.pregunta_id == Pregunta.id)
        .where(CuestionarioPregunta.cuestionario_id == asg.cuestionario_id)
        .where(or_(Pilar.empresa_id == asg.empresa_id, Pilar.empresa_id.is_(None)))
        .group_by(Pilar.id)
        .order_by(Pilar.id)
    )
    return db.scalars(stmt).all()

def ensure_question_belongs_to_assignment(db: Session, asignacion_id: int, pregunta_id: int) -> bool:
    asg = get_asignacion(db, asignacion_id)
    if not asg:
        return False
    stmt = (
        select(CuestionarioPregunta)
        .where(CuestionarioPregunta.cuestionario_id == asg.cuestionario_id)
        .where(CuestionarioPregunta.pregunta_id == pregunta_id)
    )
    return db.scalars(stmt).first() is not None

def get_pilar_questions_with_answers(
    db: Session,
    asignacion_id: int,
    pilar_id: int,
    empleado_id: Optional[int] = None
) -> Tuple[List[Pregunta], Dict[int, Respuesta]]:
    asg = get_asignacion(db, asignacion_id)
    if not asg:
        return [], {}

    pil = db.get(Pilar, pilar_id)
    if not pil:
        return [], {}

    q_pregs = (
        select(Pregunta)
        .join(CuestionarioPregunta, CuestionarioPregunta.pregunta_id == Pregunta.id)
        .where(CuestionarioPregunta.cuestionario_id == asg.cuestionario_id)
        .where(Pregunta.pilar_id == pilar_id)
        .order_by(Pregunta.id)
    )
    preguntas = db.scalars(q_pregs).all()
    if not preguntas:
        return [], {}

    preg_ids = [p.id for p in preguntas]

    resp_stmt = select(Respuesta).where(
        Respuesta.asignacion_id == asignacion_id,
        Respuesta.pregunta_id.in_(preg_ids),
    )
    if asg.anonimo:
        resp_stmt = resp_stmt.where(Respuesta.empleado_id.is_(None))
    else:
        if empleado_id is not None:
            resp_stmt = resp_stmt.where(Respuesta.empleado_id == empleado_id)
        else:
            resp_stmt = resp_stmt.where(Respuesta.empleado_id == -1)

    respuestas = db.scalars(resp_stmt).all()
    rmap: Dict[int, Respuesta] = {r.pregunta_id: r for r in respuestas}
    return preguntas, rmap


def ensure_questionnaire_questions(
    db: Session,
    cuestionario: Cuestionario,
    preguntas: Iterable[Pregunta],
    purge_missing: bool = False,
) -> int:
    existing_rows = list(
        db.execute(
            select(CuestionarioPregunta.pregunta_id).where(CuestionarioPregunta.cuestionario_id == cuestionario.id)
        )
    )
    existing_ids = {row[0] for row in existing_rows}

    if purge_missing:
        valid_ids = {p.id for p in preguntas}
        missing = [pid for pid in existing_ids if pid not in valid_ids]
        if missing:
            db.execute(
                delete(CuestionarioPregunta).where(
                    CuestionarioPregunta.cuestionario_id == cuestionario.id,
                    CuestionarioPregunta.pregunta_id.in_(missing),
                )
            )
            existing_ids -= set(missing)
    orden = (
        db.scalar(
            select(func.max(CuestionarioPregunta.orden)).where(CuestionarioPregunta.cuestionario_id == cuestionario.id)
        )
        or 0
    )
    added = 0
    for pregunta in preguntas:
        if pregunta.id in existing_ids:
            continue
        orden += 1
        db.add(
            CuestionarioPregunta(
                cuestionario_id=cuestionario.id,
                pregunta_id=pregunta.id,
                orden=orden,
            )
        )
        added += 1
    if added:
        db.flush()
    return added


def sync_question_with_questionnaires(db: Session, pregunta: Pregunta) -> None:
    pilar = db.get(Pilar, pregunta.pilar_id)
    if not pilar:
        return

    if pilar.empresa_id is None:
        target_cuestionarios = db.scalars(select(Cuestionario)).all()
    else:
        target_cuestionarios = db.scalars(
            select(Cuestionario).where(Cuestionario.empresa_id == pilar.empresa_id)
        ).all()

    if not target_cuestionarios:
        return

    for cuest in target_cuestionarios:
        ensure_questionnaire_questions(db, cuest, [pregunta])
    db.commit()

def submit_bulk_answers(
    db: Session,
    asignacion_id: int,
    items: List[Dict],
    empleado_id: Optional[int] = None
) -> Dict[str, int]:
    asg = get_asignacion(db, asignacion_id)
    if not asg:
        return {"creadas": 0, "actualizadas": 0}

    creadas = 0
    actualizadas = 0

    for it in items:
        pid = it["pregunta_id"]
        if not ensure_question_belongs_to_assignment(db, asignacion_id, pid):
            continue

        valor = str(it.get("valor") if it.get("valor") is not None else "")

        stmt = select(Respuesta).where(
            Respuesta.asignacion_id == asignacion_id,
            Respuesta.pregunta_id == pid,
        )

        now_utc = datetime.utcnow()  # naive UTC para timestamp

        if asg.anonimo:
            stmt = stmt.where(Respuesta.empleado_id.is_(None))
            existing = db.scalars(stmt).first()
            if existing:
                existing.valor = valor
                existing.fecha_respuesta = now_utc
                actualizadas += 1
            else:
                db.add(Respuesta(
                    asignacion_id=asignacion_id,
                    pregunta_id=pid,
                    empleado_id=None,
                    valor=valor,
                    fecha_respuesta=now_utc,
                ))
                creadas += 1
        else:
            if empleado_id is None:
                continue
            stmt = stmt.where(Respuesta.empleado_id == empleado_id)
            existing = db.scalars(stmt).first()
            if existing:
                existing.valor = valor
                existing.fecha_respuesta = now_utc
                actualizadas += 1
            else:
                db.add(Respuesta(
                    asignacion_id=asignacion_id,
                    pregunta_id=pid,
                    empleado_id=empleado_id,
                    valor=valor,
                    fecha_respuesta=now_utc,
                ))
                creadas += 1

    db.commit()
    return {"creadas": creadas, "actualizadas": actualizadas}

def compute_assignment_progress(
    db: Session,
    asignacion_id: int,
    empleado_id: Optional[int] = None
) -> Dict:
    """
    Calcula dos tipos de métricas:
      - completion: porcentaje de avance (preguntas respondidas / totales)
      - progreso: puntaje promedio (normalizado 0..1) según las respuestas entregadas
    """
    asg = get_asignacion(db, asignacion_id)
    if not asg:
        return {
            "total": 0,
            "respondidas": 0,
            "progreso": 0.0,
            "completion": 0.0,
            "por_pilar": [],
        }

    def normalize_answer(tipo: TipoPreguntaEnum, value: Optional[str]) -> Optional[float]:
        if value is None:
            return None
        raw = value.strip()
        if not raw:
            return None
        if tipo == TipoPreguntaEnum.LIKERT:
            try:
                num = float(raw.replace(",", "."))
            except ValueError:
                return None
            if 1 <= num <= 5:
                return (num - 1.0) / 4.0
            # fallback: si viene 0..1 o 0..100
            if 0 <= num <= 1:
                return num
            if 0 <= num <= 100:
                return num / 100.0
            return None
        if tipo == TipoPreguntaEnum.SI_NO:
            lowered = raw.lower()
            if lowered in {"1", "si", "sí", "true", "t", "yes", "y"}:
                return 1.0
            if lowered in {"0", "no", "false", "f", "not", "n"}:
                return 0.0
            return None
        # Preguntas abiertas no aportan a puntaje
        return None

    totales_stmt = (
        select(
            Pilar.id.label("pilar_id"),
            Pilar.nombre.label("pilar_nombre"),
            func.count(Pregunta.id).label("total"),
        )
        .join(Pregunta, Pregunta.pilar_id == Pilar.id)
        .join(CuestionarioPregunta, CuestionarioPregunta.pregunta_id == Pregunta.id)
        .where(CuestionarioPregunta.cuestionario_id == asg.cuestionario_id)
        .where(or_(Pilar.empresa_id == asg.empresa_id, Pilar.empresa_id.is_(None)))
        .group_by(Pilar.id)
        .order_by(Pilar.id)
    )
    totales_rows = db.execute(totales_stmt).all()

    resp_stmt = (
        select(
            Pilar.id.label("pilar_id"),
            func.count(Respuesta.id).label("respondidas"),
        )
        .join(Pregunta, Pregunta.pilar_id == Pilar.id)
        .join(
            Respuesta,
            and_(
                Respuesta.pregunta_id == Pregunta.id,
                Respuesta.asignacion_id == asignacion_id,
            ),
        )
        .where(or_(Pilar.empresa_id == asg.empresa_id, Pilar.empresa_id.is_(None)))
        .group_by(Pilar.id)
    )
    detalle_stmt = (
        select(
            Pilar.id.label("pilar_id"),
            Pregunta.tipo.label("tipo"),
            Respuesta.valor.label("valor"),
        )
        .join(Pregunta, Pregunta.pilar_id == Pilar.id)
        .join(
            Respuesta,
            and_(
                Respuesta.pregunta_id == Pregunta.id,
                Respuesta.asignacion_id == asignacion_id,
            ),
        )
        .where(or_(Pilar.empresa_id == asg.empresa_id, Pilar.empresa_id.is_(None)))
    )

    if asg.anonimo:
        resp_stmt = resp_stmt.where(Respuesta.empleado_id.is_(None))
        detalle_stmt = detalle_stmt.where(Respuesta.empleado_id.is_(None))
    else:
        if empleado_id is not None:
            resp_stmt = resp_stmt.where(Respuesta.empleado_id == empleado_id)
            detalle_stmt = detalle_stmt.where(Respuesta.empleado_id == empleado_id)
        else:
            # Agregamos todas las respuestas (todos los empleados asignados)
            resp_stmt = resp_stmt.where(Respuesta.empleado_id.isnot(None))
            detalle_stmt = detalle_stmt.where(Respuesta.empleado_id.isnot(None))

    resp_rows = db.execute(resp_stmt).all()
    detalle_rows = db.execute(detalle_stmt).all()

    resp_map = {row.pilar_id: int(row.respondidas or 0) for row in resp_rows}

    score_map: Dict[int, Dict[str, float]] = {}
    global_score_sum = 0.0
    global_score_count = 0
    for row in detalle_rows:
        normalized = normalize_answer(row.tipo, row.valor)
        if normalized is None:
            continue
        agg = score_map.setdefault(
            row.pilar_id,
            {"sum": 0.0, "count": 0.0},
        )
        agg["sum"] += normalized
        agg["count"] += 1
        global_score_sum += normalized
        global_score_count += 1

    por_pilar = []
    total_global = 0
    respondidas_global = 0
    for row in totales_rows:
        total_preguntas = int(row.total or 0)
        respondidas = resp_map.get(row.pilar_id, 0)
        score_info = score_map.get(row.pilar_id, {"sum": 0.0, "count": 0.0})
        promedio = (
            (score_info["sum"] / score_info["count"]) if score_info["count"] else 0.0
        )
        completion = (respondidas / total_preguntas) if total_preguntas else 0.0
        if completion > 1.0:
            completion = 1.0

        por_pilar.append({
            "pilar_id": row.pilar_id,
            "pilar_nombre": row.pilar_nombre,
            "total": total_preguntas,
            "respondidas": respondidas,
            "progreso": promedio,
            "completion": completion,
        })

        total_global += total_preguntas
        respondidas_global += respondidas

    progreso_global = (
        (global_score_sum / global_score_count) if global_score_count else 0.0
    )
    completion_global = (respondidas_global / total_global) if total_global else 0.0
    if completion_global > 1.0:
        completion_global = 1.0

    return {
        "total": total_global,
        "respondidas": respondidas_global,
        "progreso": progreso_global,
        "completion": completion_global,
        "por_pilar": por_pilar,
    }

# ======================================================
# CONSULTING LEADS
# ======================================================

def create_consulting_lead(db: Session, company: str, email: str) -> ConsultingLead:
    lead = ConsultingLead(company=company, email=email)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

def list_consulting_leads(db: Session, limit: int = 100, offset: int = 0) -> List[ConsultingLead]:
    stmt = (
        select(ConsultingLead)
        .order_by(ConsultingLead.created_at.desc(), ConsultingLead.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return db.scalars(stmt).all()
