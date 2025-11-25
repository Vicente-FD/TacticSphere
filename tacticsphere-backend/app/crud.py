from typing import List, Optional, Dict, Tuple, Iterable
from datetime import datetime, timedelta, timezone, date  # usamos naive UTC
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, and_, or_, delete

from .auth import hash_password, validate_password
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
    PasswordChangeRequest,
    AuditLog,
    AuditActionEnum,
)
from .likert_levels import LIKERT_LEVELS

# ======================================================
# USUARIOS
# ======================================================

def get_user_by_email(db: Session, email: str):
    normalized = email.lower()
    return db.scalars(select(Usuario).where(func.lower(Usuario.email) == normalized)).first()

def list_usuarios(db: Session, empresa_id: Optional[int] = None) -> List[Usuario]:
    stmt = select(Usuario)
    if empresa_id is not None:
        stmt = stmt.where(Usuario.empresa_id == empresa_id)
    return db.scalars(stmt).all()

def create_usuario(db: Session, nombre: str, email: str, password: str, rol: RolEnum, empresa_id: Optional[int]):
    validate_password(password)
    user = Usuario(
        nombre=nombre,
        email=email.lower(),
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
    validate_password(new_password)
    u.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(u)
    return u


def create_password_change_request(db: Session, user: Usuario) -> PasswordChangeRequest:
    existing = db.scalars(
        select(PasswordChangeRequest).where(
            PasswordChangeRequest.user_id == user.id,
            PasswordChangeRequest.resolved.is_(False),
        )
    ).first()
    now = datetime.utcnow()
    if existing:
        existing.created_at = now
        existing.user_email = user.email
        existing.user_nombre = user.nombre
        existing.empresa_id = user.empresa_id
        db.commit()
        db.refresh(existing)
        return existing

    record = PasswordChangeRequest(
        user_id=user.id,
        user_email=user.email,
        user_nombre=user.nombre,
        empresa_id=user.empresa_id,
        created_at=now,
        resolved=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def list_password_change_requests(db: Session, include_resolved: bool = False) -> List[PasswordChangeRequest]:
    stmt = (
        select(PasswordChangeRequest)
        .options(
            joinedload(PasswordChangeRequest.user),
            joinedload(PasswordChangeRequest.resolved_by),
        )
        .order_by(PasswordChangeRequest.created_at.desc())
    )
    if not include_resolved:
        stmt = stmt.where(PasswordChangeRequest.resolved.is_(False))
    return db.scalars(stmt).all()


def get_password_change_request(db: Session, request_id: int) -> Optional[PasswordChangeRequest]:
    return db.get(PasswordChangeRequest, request_id)


def resolve_password_change_request(
    db: Session,
    request_id: int,
    *,
    user_id: Optional[int] = None,
    resolved_by_id: Optional[int] = None,
) -> Optional[PasswordChangeRequest]:
    record = db.get(PasswordChangeRequest, request_id)
    if not record:
        return None
    if user_id is not None and record.user_id != user_id:
        return None
    record.resolved = True
    record.resolved_at = datetime.utcnow()
    if resolved_by_id is not None:
        record.resolved_by_id = resolved_by_id
    db.commit()
    db.refresh(record)
    return record


def clear_password_change_requests(db: Session) -> int:
    """Elimina todas las solicitudes de cambio de contraseña pendientes"""
    count = db.query(PasswordChangeRequest).filter(PasswordChangeRequest.resolved.is_(False)).delete()
    db.commit()
    return count

# ======================================================
# EMPRESAS
# ======================================================

def list_empresas(db: Session) -> List[Empresa]:
    """
    Lista todas las empresas con sus departamentos.
    Usa joinedload para cargar los departamentos de forma eficiente y asegurar
    que cada empresa solo tenga sus propios departamentos (filtrados por empresa_id).
    """
    stmt = select(Empresa).options(joinedload(Empresa.departamentos))
    empresas = list(db.scalars(stmt).unique().all())
    # Validación adicional: asegurar que los departamentos están correctamente filtrados
    # por empresa_id (SQLAlchemy debería hacer esto automáticamente vía Foreign Key,
    # pero esta validación previene cualquier problema de datos corruptos)
    for empresa in empresas:
        empresa.departamentos = [d for d in empresa.departamentos if d.empresa_id == empresa.id]
    return empresas

def create_empresa(db: Session, nombre: str, rut: Optional[str], giro: Optional[str],
                   departamentos: Optional[List[str]] = None):
    """
    Crea una nueva empresa y sus departamentos.
    IMPORTANTE: Solo crea los departamentos especificados, no carga departamentos existentes de otras empresas.
    """
    emp = Empresa(nombre=nombre, rut=rut, giro=giro, activa=True)
    db.add(emp)
    db.flush()  # para conseguir emp.id
    
    # CRÍTICO: Limpiar departamentos huérfanos que puedan existir para este empresa_id
    # Esto previene errores de UNIQUE constraint cuando SQLite reutiliza IDs de empresas eliminadas.
    # Si una empresa fue eliminada pero sus departamentos no (departamentos huérfanos),
    # y SQLite reutiliza ese ID para la nueva empresa, al intentar crear departamentos
    # con el mismo nombre fallaría por el constraint único.
    # Solución: Eliminar cualquier departamento existente para este empresa_id antes de crear los nuevos.
    existing_depts = db.scalars(
        select(Departamento).where(Departamento.empresa_id == emp.id)
    ).all()
    # Si hay departamentos existentes para este empresa_id, eliminarlos (son huérfanos)
    # porque estamos creando una empresa nueva, no debería tener departamentos todavía
    if existing_depts:
        for orphan_dept in existing_depts:
            db.delete(orphan_dept)
        db.flush()  # Eliminar huérfanos antes de crear nuevos departamentos
    
    # Inicializar la lista de departamentos como vacía para evitar problemas de lazy loading
    emp.departamentos = []
    
    if departamentos:
        seen: set[str] = set()
        dept_objects = []
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
            
            # Verificar si el departamento ya existe para ESTA empresa antes de crearlo
            # Esto previene errores de UNIQUE constraint (empresa_id, nombre)
            # IMPORTANTE: Si hay departamentos huérfanos de empresas eliminadas,
            # esta verificación los detectará y evitaremos crear duplicados
            existing = db.scalar(
                select(Departamento).where(
                    and_(
                        Departamento.empresa_id == emp.id,
                        func.lower(Departamento.nombre) == key
                    )
                )
            )
            if not existing:
                dept_objects.append(Departamento(nombre=n, empresa_id=emp.id))
        
        # Agregar todos los departamentos de una vez
        if dept_objects:
            db.add_all(dept_objects)
            db.flush()  # Flush después de agregar departamentos para detectar errores temprano
    
    db.commit()
    
    # CRÍTICO: Expulsar la empresa de la sesión y recargarla completamente
    # Esto evita problemas de caché o lazy loading que puedan traer departamentos incorrectos
    db.expire(emp)
    
    # Recargar la empresa desde cero usando joinedload para asegurar que solo cargue sus departamentos
    empresa_id = emp.id
    stmt = select(Empresa).options(joinedload(Empresa.departamentos)).where(Empresa.id == empresa_id)
    emp_reloaded = db.scalar(stmt)
    
    if not emp_reloaded:
        # Si por alguna razón no se encuentra, retornar la original sin departamentos
        emp.departamentos = []
        return emp
    
    # Validación crítica: filtrar SOLO los departamentos que pertenecen a esta empresa
    # Esto previene que se incluyan departamentos de otras empresas o huérfanos
    emp_reloaded.departamentos = [d for d in emp_reloaded.departamentos if d.empresa_id == empresa_id]
    
    return emp_reloaded

def update_empresa(
    db: Session,
    empresa_id: int,
    nombre: Optional[str] = None,
    rut: Optional[str] = None,
    giro: Optional[str] = None,
    departamentos: Optional[List[str]] = None,
) -> Optional[Empresa]:
    # Cargar empresa con sus departamentos usando joinedload para asegurar que tenemos todos los datos
    stmt = select(Empresa).options(joinedload(Empresa.departamentos)).where(Empresa.id == empresa_id)
    emp = db.scalar(stmt)
    if not emp:
        return None
    
    # Validación: asegurar que los departamentos pertenecen a esta empresa
    emp.departamentos = [d for d in emp.departamentos if d.empresa_id == emp.id]
    
    # Actualizar campos básicos
    if nombre is not None:
        emp.nombre = nombre
    if rut is not None:
        emp.rut = rut
    if giro is not None:
        emp.giro = giro
    
    # Si se proporcionan departamentos, reemplazar los existentes
    if departamentos is not None:
        # Eliminar departamentos existentes (solo los que pertenecen a esta empresa)
        for dep in emp.departamentos:
            if dep.empresa_id == emp.id:  # Validación adicional de seguridad
                db.delete(dep)
        db.flush()  # Asegurar que los departamentos se eliminen antes de crear nuevos
        
        # Crear nuevos departamentos
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
            # Verificar si el departamento ya existe para esta empresa antes de crearlo
            existing = db.scalar(
                select(Departamento).where(
                    and_(
                        Departamento.empresa_id == emp.id,
                        func.lower(Departamento.nombre) == key
                    )
                )
            )
            if not existing:
                db.add(Departamento(nombre=n, empresa_id=emp.id))
    
    db.commit()
    # Refrescar la empresa y cargar los departamentos actualizados
    db.refresh(emp, ["departamentos"])
    # Validación final: asegurar que solo se devuelven departamentos de esta empresa
    emp.departamentos = [d for d in emp.departamentos if d.empresa_id == emp.id]
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
    """Lista todos los departamentos de una empresa específica."""
    return db.scalars(select(Departamento).where(Departamento.empresa_id == empresa_id)).all()

def find_orphan_departments(db: Session) -> List[Departamento]:
    """
    Encuentra departamentos huérfanos (departamentos que no tienen una empresa válida).
    Esto puede ocurrir si hay datos corruptos en la base de datos.
    """
    # Buscar departamentos cuya empresa_id no existe en la tabla empresas
    empresas_ids = {e.id for e in db.scalars(select(Empresa)).all()}
    all_departments = db.scalars(select(Departamento)).all()
    orphan_departments = [d for d in all_departments if d.empresa_id not in empresas_ids]
    return orphan_departments

def cleanup_orphan_departments(db: Session) -> int:
    """
    Elimina departamentos huérfanos (departamentos que no tienen una empresa válida).
    Retorna el número de departamentos eliminados.
    """
    orphan_departments = find_orphan_departments(db)
    count = len(orphan_departments)
    for dept in orphan_departments:
        db.delete(dept)
    db.commit()
    return count

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

def list_empleados(
    db: Session,
    empresa_id: Optional[int] = None,
    departamento_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Empleado]:
    stmt = select(Empleado)
    if empresa_id is not None:
        stmt = stmt.where(Empleado.empresa_id == empresa_id)
    if departamento_id is not None:
        stmt = stmt.where(Empleado.departamento_id == departamento_id)
    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Empleado.nombre).like(pattern),
                func.lower(Empleado.apellidos).like(pattern),
                func.lower(Empleado.email).like(pattern),
                func.lower(Empleado.rut).like(pattern),
            )
        )
    stmt = stmt.order_by(Empleado.nombre.asc(), Empleado.apellidos.asc())
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()

def create_empleado(
    db: Session,
    empresa_id: int,
    nombre: str,
    apellidos: Optional[str] = None,
    rut: Optional[str] = None,
    email: Optional[str] = None,
    cargo: Optional[str] = None,
    departamento_id: Optional[int] = None,
) -> Empleado:
    emp = Empleado(
        empresa_id=empresa_id,
        nombre=nombre,
        apellidos=apellidos,
        rut=rut,
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
    apellidos: Optional[str] = None,
    rut: Optional[str] = None,
    email: Optional[str] = None,
    cargo: Optional[str] = None,
    departamento_id: Optional[int] = None,
) -> Optional[Empleado]:
    emp = db.get(Empleado, empleado_id)
    if not emp:
        return None
    if nombre is not None:
        emp.nombre = nombre
    if apellidos is not None:
        emp.apellidos = apellidos
    if rut is not None:
        emp.rut = rut
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

def update_pilar(
    db: Session,
    pilar_id: int,
    *,
    nombre: Optional[str] = None,
    descripcion: Optional[str] = None,
    peso: Optional[int] = None,
) -> Optional[Pilar]:
    p = db.get(Pilar, pilar_id)
    if not p:
        return None
    if nombre is not None:
        p.nombre = nombre
    if descripcion is not None:
        p.descripcion = descripcion
    if peso is not None:
        p.peso = peso
    db.commit()
    db.refresh(p)
    return p

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

def create_pregunta(
    db: Session,
    pilar_id: int,
    enunciado: str,
    tipo,
    es_obligatoria: bool,
    peso: int,
    respuesta_esperada: Optional[str] = None,
) -> Pregunta:
    sanitized_expected = (respuesta_esperada or "").strip() or None
    q = Pregunta(
        pilar_id=pilar_id,
        enunciado=enunciado,
        tipo=tipo,
        es_obligatoria=es_obligatoria,
        peso=peso,
        respuesta_esperada=sanitized_expected,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    sync_question_with_questionnaires(db, q)
    return q

def list_preguntas(db: Session, pilar_id: int) -> List[Pregunta]:
    return db.scalars(select(Pregunta).where(Pregunta.pilar_id == pilar_id)).all()


def update_pregunta(
    db: Session,
    pregunta_id: int,
    *,
    enunciado: Optional[str] = None,
    tipo: Optional[TipoPreguntaEnum] = None,
    es_obligatoria: Optional[bool] = None,
    peso: Optional[int] = None,
    respuesta_esperada: Optional[str] = None,
) -> Optional[Pregunta]:
    q = db.get(Pregunta, pregunta_id)
    if not q:
        return None
    if enunciado is not None:
        q.enunciado = enunciado
    if tipo is not None:
        q.tipo = tipo
    if es_obligatoria is not None:
        q.es_obligatoria = es_obligatoria
    if peso is not None:
        q.peso = peso
    if respuesta_esperada is not None:
        q.respuesta_esperada = (respuesta_esperada or "").strip() or None
    db.commit()
    db.refresh(q)
    return q


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

# === cuestionario PUBLICADO mÃ¡s reciente ===
def get_latest_published_cuestionario(db: Session, empresa_id: int) -> Optional[Cuestionario]:
    stmt = (
        select(Cuestionario)
        .where(Cuestionario.empresa_id == empresa_id)
        .where(Cuestionario.estado == "PUBLICADO")
        .order_by(Cuestionario.version.desc(), Cuestionario.id.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()

# --- MODO SIMPLE: helpers automÃ¡ticos ---

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
            raise ValueError("Departamento invÃ¡lido para la empresa")
    elif alcance_tipo == "EMPLEADO":
        if alcance_id is None:
            raise ValueError("Para alcance EMPLEADO, alcance_id es obligatorio")
        emp_obj = db.get(Empleado, alcance_id)
        if not emp_obj or emp_obj.empresa_id != empresa_id:
            raise ValueError("Empleado invÃ¡lido para la empresa")
    else:
        raise ValueError("alcance_tipo invÃ¡lido")

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
    True si now estÃ¡ dentro de [inicio, cierre].
    """
    now = now or datetime.utcnow()  # naive UTC
    return (asg.fecha_inicio <= now <= asg.fecha_cierre)

def get_active_asignacion_for_empresa(db: Session, empresa_id: int, now: Optional[datetime] = None) -> Optional[Asignacion]:
    """
    Devuelve la asignaciÃ³n vigente de alcance EMPRESA para la empresa dada,
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
    Retorna una asignaciÃ³n vigente (alcance EMPRESA). Si no existe y hay un
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

# --- MODO SIMPLE: garantiza asignaciÃ³n auto (vigencia amplia) ---

def get_or_create_auto_asignacion(
    db: Session,
    empresa_id: int,
    anonimo: bool = False,
) -> Asignacion:
    """
    Garantiza una asignaciÃ³n vigente a nivel EMPRESA.
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
# ENCUESTA (AsignaciÃ³n â†’ Pilares/Preguntas â†’ Respuestas & Progreso)
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


# ======================================================
# AUDITORÃA
# ======================================================
def _build_audit_query(
    *,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    empresa_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    action: Optional[AuditActionEnum] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    scope_empresa_id: Optional[int] = None,
):
    stmt = select(AuditLog)
    if scope_empresa_id is not None:
        stmt = stmt.where(AuditLog.empresa_id == scope_empresa_id)
    if empresa_id is not None:
        stmt = stmt.where(AuditLog.empresa_id == empresa_id)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if user_email:
        pattern = f"%{user_email.lower()}%"
        stmt = stmt.where(func.lower(AuditLog.user_email).like(pattern))
    if user_role:
        stmt = stmt.where(AuditLog.user_role == user_role)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(func.lower(AuditLog.entity_type) == entity_type.lower())
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    if search:
        pattern = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(AuditLog.notes).like(pattern),
                func.lower(AuditLog.user_email).like(pattern),
                func.lower(AuditLog.entity_type).like(pattern),
                func.lower(AuditLog.path).like(pattern),
            )
        )
    return stmt.order_by(AuditLog.created_at.desc())


def list_audit_logs(
    db: Session,
    *,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    empresa_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    action: Optional[AuditActionEnum] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    scope_empresa_id: Optional[int] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[AuditLog]:
    stmt = _build_audit_query(
        date_from=date_from,
        date_to=date_to,
        empresa_id=empresa_id,
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        search=search,
        scope_empresa_id=scope_empresa_id,
    )
    stmt = stmt.offset(offset).limit(limit)
    return db.scalars(stmt).all()


def export_audit_logs(
    db: Session,
    *,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    empresa_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    action: Optional[AuditActionEnum] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    scope_empresa_id: Optional[int] = None,
) -> List[AuditLog]:
    stmt = _build_audit_query(
        date_from=date_from,
        date_to=date_to,
        empresa_id=empresa_id,
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        search=search,
        scope_empresa_id=scope_empresa_id,
    )
    return db.scalars(stmt).all()


def delete_audit_log(db: Session, log_id: int) -> bool:
    record = db.get(AuditLog, log_id)
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


def clear_all_audit_logs(db: Session, scope_empresa_id: Optional[int] = None) -> int:
    """
    Elimina todos los registros de auditoría.
    Si scope_empresa_id está definido, solo elimina los de esa empresa.
    Retorna el número de registros eliminados.
    """
    stmt = delete(AuditLog)
    if scope_empresa_id is not None:
        stmt = stmt.where(AuditLog.empresa_id == scope_empresa_id)
    result = db.execute(stmt)
    db.commit()
    return result.rowcount

def compute_assignment_progress(
    db: Session,
    asignacion_id: int,
    empleado_id: Optional[int] = None
) -> Dict:
    """
    Calcula dos tipos de mÃ©tricas:
      - completion: porcentaje de avance (preguntas respondidas / totales)
      - progreso: puntaje promedio (normalizado 0..1) segÃºn las respuestas entregadas
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
            if lowered in {"1", "si", "sÃ­", "true", "t", "yes", "y"}:
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

def compute_dashboard_analytics(
    db: Session,
    empresa_id: Optional[int],
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    departamento_ids: Optional[List[int]] = None,
    empleado_ids: Optional[List[int]] = None,
    pilar_ids: Optional[List[int]] = None,
    include_timeline: bool = True,
) -> Dict:
    """
    Calcula todas las métricas del dashboard basadas en Likert.
    
    MODO GLOBAL (empresa_id = None):
    - Agrupa respuestas de TODAS las empresas sin filtrar por empresa_id
    - Los departamentos y empleados se cargan de todas las empresas
    - Las respuestas se agrupan globalmente, aplicando otros filtros (departamento, pilar, empleado) si están presentes
    
    MODO NORMAL (empresa_id = número):
    - Filtra respuestas solo de la empresa especificada
    - Los departamentos y empleados se cargan solo de esa empresa
    - Aplica otros filtros normalmente
    """

    dept_filter = [int(x) for x in (departamento_ids or []) if x is not None]
    emp_filter = [int(x) for x in (empleado_ids or []) if x is not None]
    pillar_filter = [int(x) for x in (pilar_ids or []) if x is not None]

    def _as_percent(value_sum: float, weight_sum: float) -> float:
        if not weight_sum:
            return 0.0
        percent = (value_sum / (5 * weight_sum)) * 100
        if percent < 0:
            percent = 0.0
        if percent > 100:
            percent = 100.0
        return round(percent, 1)

    def _level_percentages(levels: List[float], weight_sum: float) -> List[float]:
        if not weight_sum:
            return [0.0] * 5
        return [round((value / weight_sum) * 100, 1) for value in levels]

    # Si empresa_id es None, vista global (todas las empresas)
    dept_stmt = select(Departamento.id, Departamento.nombre)
    if empresa_id is not None:
        dept_stmt = dept_stmt.where(Departamento.empresa_id == empresa_id)
    dept_rows = db.execute(dept_stmt).all()
    dept_lookup = {row.id: row.nombre for row in dept_rows}

    emp_stmt = select(Empleado.id, Empleado.nombre, Empleado.departamento_id)
    if empresa_id is not None:
        emp_stmt = emp_stmt.where(Empleado.empresa_id == empresa_id)
    if emp_filter:
        emp_stmt = emp_stmt.where(Empleado.id.in_(emp_filter))
    elif dept_filter:
        emp_stmt = emp_stmt.where(Empleado.departamento_id.in_(dept_filter))
    employees = db.execute(emp_stmt).all()
    employee_lookup = {
        row.id: {"name": row.nombre, "departamento_id": row.departamento_id}
        for row in employees
    }
    employee_universe = set(employee_lookup.keys())
    coverage_total = len(emp_filter) if emp_filter else len(employee_universe)

    start_dt = datetime.combine(fecha_desde, datetime.min.time()) if fecha_desde else None
    end_dt = (
        datetime.combine(fecha_hasta + timedelta(days=1), datetime.min.time())
        if fecha_hasta
        else None
    )

    stmt = (
        select(
            Respuesta.valor,
            Respuesta.fecha_respuesta,
            Respuesta.empleado_id,
            Pregunta.peso.label("pregunta_peso"),
            Pilar.id.label("pilar_id"),
            Pilar.nombre.label("pilar_nombre"),
            Pilar.peso.label("pilar_peso"),
            Empleado.departamento_id,
            Departamento.nombre.label("departamento_nombre"),
            Asignacion.alcance_tipo,
            Asignacion.alcance_id,
            Asignacion.anonimo,
        )
        .join(Pregunta, Respuesta.pregunta_id == Pregunta.id)
        .join(Pilar, Pregunta.pilar_id == Pilar.id)
        .join(Asignacion, Respuesta.asignacion_id == Asignacion.id)
        .outerjoin(Empleado, Respuesta.empleado_id == Empleado.id)
        .outerjoin(Departamento, Empleado.departamento_id == Departamento.id)
        .where(
            Pregunta.tipo == TipoPreguntaEnum.LIKERT,
        )
    )
    if empresa_id is not None:
        stmt = stmt.where(Asignacion.empresa_id == empresa_id)
    if start_dt:
        stmt = stmt.where(Respuesta.fecha_respuesta >= start_dt)
    if end_dt:
        stmt = stmt.where(Respuesta.fecha_respuesta < end_dt)
    if pillar_filter:
        stmt = stmt.where(Pilar.id.in_(pillar_filter))
    if emp_filter:
        stmt = stmt.where(Respuesta.empleado_id.in_(emp_filter))
    if dept_filter:
        stmt = stmt.where(
            or_(
                Empleado.departamento_id.in_(dept_filter),
                and_(
                    Asignacion.alcance_tipo == "DEPARTAMENTO",
                    Asignacion.alcance_id.in_(dept_filter),
                ),
            )
        )

    rows = db.execute(stmt).all()

    pillar_map: Dict[int, Dict[str, object]] = {}
    dept_map: Dict[Optional[int], Dict[str, object]] = {}
    timeline_map: Optional[Dict[date, Dict[str, object]]] = {} if include_timeline else None
    employee_map: Dict[int, Dict[str, object]] = {}
    respondent_employees: set[int] = set()
    global_stats = {"value_sum": 0.0, "weight_sum": 0.0, "levels": [0.0] * 5}

    for row in rows:
        raw = row.valor
        if raw is None:
            continue
        try:
            value = float(str(raw).replace(",", "."))
        except ValueError:
            continue
        if value < 1 or value > 5:
            continue
        question_weight = float(row.pregunta_peso or 1)
        pillar_weight = float(row.pilar_peso or 1)
        weight = question_weight * pillar_weight
        if weight <= 0:
            continue

        level_idx = int(round(value))
        if level_idx < 1:
            level_idx = 1
        if level_idx > 5:
            level_idx = 5
        level_pos = level_idx - 1
        weighted_value = value * weight

        global_stats["value_sum"] += weighted_value
        global_stats["weight_sum"] += weight
        global_stats["levels"][level_pos] += weight

        pillar_entry = pillar_map.setdefault(
            row.pilar_id,
            {
                "name": row.pilar_nombre or f"Pilar #{row.pilar_id}",
                "value_sum": 0.0,
                "weight_sum": 0.0,
                "levels": [0.0] * 5,
            },
        )
        pillar_entry["value_sum"] += weighted_value
        pillar_entry["weight_sum"] += weight
        pillar_entry["levels"][level_pos] += weight

        if timeline_map is not None:
            day = row.fecha_respuesta.date()
            timeline_entry = timeline_map.setdefault(
                day,
                {"value_sum": 0.0, "weight_sum": 0.0, "pillars": {}},
            )
            timeline_entry["value_sum"] += weighted_value
            timeline_entry["weight_sum"] += weight
            day_pillar = timeline_entry["pillars"].setdefault(
                row.pilar_id,
                {"value_sum": 0.0, "weight_sum": 0.0},
            )
            day_pillar["value_sum"] += weighted_value
            day_pillar["weight_sum"] += weight

        if row.empleado_id is not None:
            respondent_employees.add(row.empleado_id)

        if not row.anonimo:
            dept_id = row.departamento_id
            dept_name = row.departamento_nombre
            if dept_id is None and row.alcance_tipo == "DEPARTAMENTO" and row.alcance_id is not None:
                dept_id = row.alcance_id
                dept_name = dept_lookup.get(dept_id, f"Departamento #{dept_id}")
            if dept_id is not None:
                dept_entry = dept_map.setdefault(
                    dept_id,
                    {
                        "name": dept_name or dept_lookup.get(dept_id, f"Departamento #{dept_id}") or f"Departamento #{dept_id}",
                        "value_sum": 0.0,
                        "weight_sum": 0.0,
                        "pillars": {},
                    },
                )
                dept_entry["value_sum"] += weighted_value
                dept_entry["weight_sum"] += weight
                dept_pillar = dept_entry["pillars"].setdefault(
                    row.pilar_id,
                    {
                        "name": pillar_entry["name"],
                        "value_sum": 0.0,
                        "weight_sum": 0.0,
                        "levels": [0.0] * 5,
                    },
                )
                dept_pillar["value_sum"] += weighted_value
                dept_pillar["weight_sum"] += weight
                dept_pillar["levels"][level_pos] += weight

            if row.empleado_id is not None:
                emp_info = employee_lookup.get(row.empleado_id)
                emp_name = (emp_info or {}).get("name") or f"Empleado #{row.empleado_id}"
                employee_entry = employee_map.setdefault(
                    row.empleado_id,
                    {"name": emp_name, "value_sum": 0.0, "weight_sum": 0.0},
                )
                employee_entry["value_sum"] += weighted_value
                employee_entry["weight_sum"] += weight

    coverage_base = set(emp_filter) if emp_filter else employee_universe
    if coverage_base:
        coverage_respondents = len(respondent_employees & coverage_base)
    else:
        coverage_respondents = len(respondent_employees)
    coverage_percent = (
        round((coverage_respondents / coverage_total) * 100, 1)
        if coverage_total
        else None
    )

    if not global_stats["weight_sum"]:
        return {
            "generated_at": datetime.utcnow(),
            "filters": {
                "empresa_id": empresa_id,
                "fecha_desde": fecha_desde,
                "fecha_hasta": fecha_hasta,
                "departamento_ids": dept_filter,
                "empleado_ids": emp_filter,
                "pilar_ids": pillar_filter,
            },
            "likert_levels": LIKERT_LEVELS,
            "kpis": {
                "global_average": 0.0,
                "strongest_pillar": None,
                "weakest_pillar": None,
                "pillar_gap": 0.0,
                "coverage_percent": coverage_percent,
                "coverage_total": coverage_total,
                "coverage_respondents": coverage_respondents,
                "trend_30d": None,
            },
            "pillars": [],
            "heatmap": [],
            "distribution": {"global": [], "by_department": []},
            "timeline": [],
            "ranking": {"top": [], "bottom": []},
            "employees": [],
        }

    def _build_distribution_entry(pilar_id: int, stats: Dict[str, object]) -> Dict:
        percent = _as_percent(stats["value_sum"], stats["weight_sum"])
        levels = _level_percentages(stats["levels"], stats["weight_sum"])
        pct_ge4 = round(sum(levels[3:]), 1)
        return {
            "pillar_id": pilar_id,
            "pillar_name": stats["name"],
            "percent": percent,
            "pct_ge4": pct_ge4,
            "levels": levels,
        }

    pillars = [
        _build_distribution_entry(pid, data)
        for pid, data in pillar_map.items()
    ]
    pillars.sort(key=lambda item: item["percent"], reverse=True)
    pillar_order = [item["pillar_id"] for item in pillars]
    pillar_name_lookup = {item["pillar_id"]: item["pillar_name"] for item in pillars}

    heatmap_rows = []
    distribution_by_department = []
    dept_items = []
    for dept_id, data in dept_map.items():
        if not data["weight_sum"]:
            continue
        average = _as_percent(data["value_sum"], data["weight_sum"])
        dept_items.append((dept_id, average, data))
    dept_items.sort(key=lambda item: item[1], reverse=True)

    for dept_id, average, data in dept_items:
        values = []
        pillars_for_dept = []
        for pid in pillar_order:
            stats = data["pillars"].get(pid)
            if stats:
                percent = _as_percent(stats["value_sum"], stats["weight_sum"])
                entry = _build_distribution_entry(pid, stats)
            else:
                percent = 0.0
                entry = {
                    "pillar_id": pid,
                    "pillar_name": pillar_name_lookup.get(pid, f"Pilar #{pid}"),
                    "percent": 0.0,
                    "pct_ge4": 0.0,
                    "levels": [0.0] * 5,
                }
            values.append({"pillar_id": pid, "percent": percent})
            pillars_for_dept.append(entry)
        heatmap_rows.append(
            {
                "department_id": dept_id,
                "department_name": data["name"],
                "average": average,
                "values": values,
            }
        )
        distribution_by_department.append(
            {
                "department_id": dept_id,
                "department_name": data["name"],
                "pillars": pillars_for_dept,
            }
        )

    ranking_top = [
        {"id": dept_id, "name": data["name"], "value": average}
        for dept_id, average, data in dept_items[:5]
    ]
    ranking_bottom = [
        {"id": dept_id, "name": data["name"], "value": average}
        for dept_id, average, data in list(reversed(dept_items))[:5]
    ]

    timeline_points: List[Dict[str, object]] = []
    if include_timeline and timeline_map:
        for day in sorted(timeline_map.keys()):
            entry = timeline_map[day]
            pillars_point = {
                pid: _as_percent(stats["value_sum"], stats["weight_sum"])
                for pid, stats in entry["pillars"].items()
            }
            timeline_points.append(
                {
                    "date": day,
                    "global_percent": _as_percent(entry["value_sum"], entry["weight_sum"]),
                    "pillars": pillars_point,
                }
            )

    trend_30d = None
    if include_timeline and timeline_map:
        latest_day = max(timeline_map.keys())
        current_start = latest_day - timedelta(days=29)
        previous_start = current_start - timedelta(days=30)
        current_value = current_weight = 0.0
        previous_value = previous_weight = 0.0
        for day, entry in timeline_map.items():
            if current_start <= day <= latest_day:
                current_value += entry["value_sum"]
                current_weight += entry["weight_sum"]
            elif previous_start <= day < current_start:
                previous_value += entry["value_sum"]
                previous_weight += entry["weight_sum"]
        current_percent = _as_percent(current_value, current_weight)
        previous_percent = _as_percent(previous_value, previous_weight)
        if previous_percent > 0:
            trend_30d = round(((current_percent - previous_percent) / previous_percent) * 100, 1)

    employee_points = []
    for emp_id, data in employee_map.items():
        if not data["weight_sum"]:
            continue
        percent = _as_percent(data["value_sum"], data["weight_sum"])
        avg_value = data["value_sum"] / data["weight_sum"]
        level = int(round(avg_value))
        if level < 1:
            level = 1
        if level > 5:
            level = 5
        employee_points.append(
            {
                "id": emp_id,
                "name": data["name"],
                "percent": percent,
                "level": level,
            }
    )
    employee_points.sort(key=lambda item: item["percent"], reverse=True)

    coverage_totals: Dict[Optional[int], int] = {}
    for meta in employee_lookup.values():
        dept_id = meta["departamento_id"]
        coverage_totals[dept_id] = coverage_totals.get(dept_id, 0) + 1
    coverage_responses: Dict[Optional[int], int] = {}
    for emp_id in respondent_employees:
        meta = employee_lookup.get(emp_id)
        if not meta:
            continue
        dept_id = meta["departamento_id"]
        coverage_responses[dept_id] = coverage_responses.get(dept_id, 0) + 1
    coverage_entries = []
    for dept_id, total in coverage_totals.items():
        respondents = coverage_responses.get(dept_id, 0)
        percent = round((respondents / total) * 100, 1) if total else 0.0
        name = (
            dept_lookup.get(dept_id, f"Departamento #{dept_id}")
            if dept_id is not None
            else "Sin departamento"
        )
        coverage_entries.append(
            {
                "department_id": dept_id,
                "department_name": name,
                "respondents": respondents,
                "total": total,
                "coverage_percent": percent,
            }
        )
    coverage_entries.sort(key=lambda item: item["coverage_percent"], reverse=True)

    strongest = pillars[0] if pillars else None
    weakest = pillars[-1] if len(pillars) > 1 else pillars[0] if pillars else None
    pillar_gap = 0.0
    if strongest and weakest and strongest is not weakest:
        pillar_gap = round(strongest["percent"] - weakest["percent"], 1)

    global_average = _as_percent(global_stats["value_sum"], global_stats["weight_sum"])

    return {
        "generated_at": datetime.utcnow(),
        "filters": {
            "empresa_id": empresa_id,
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "departamento_ids": dept_filter,
            "empleado_ids": emp_filter,
            "pilar_ids": pillar_filter,
        },
        "likert_levels": LIKERT_LEVELS,
        "kpis": {
            "global_average": global_average,
            "strongest_pillar": (
                {
                    "id": strongest["pillar_id"],
                    "name": strongest["pillar_name"],
                    "value": strongest["percent"],
                }
                if strongest
                else None
            ),
            "weakest_pillar": (
                {
                    "id": weakest["pillar_id"],
                    "name": weakest["pillar_name"],
                    "value": weakest["percent"],
                }
                if weakest
                else None
            ),
            "pillar_gap": pillar_gap,
            "coverage_percent": coverage_percent,
            "coverage_total": coverage_total,
            "coverage_respondents": coverage_respondents,
            "trend_30d": trend_30d,
        },
        "pillars": pillars,
        "heatmap": heatmap_rows,
        "distribution": {
            "global": pillars,
            "by_department": distribution_by_department,
        },
        "coverage_by_department": coverage_entries,
        "timeline": timeline_points,
        "ranking": {"top": ranking_top, "bottom": ranking_bottom},
        "employees": employee_points,
    }


def list_responses_for_export(
    db: Session,
    empresa_id: int,
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    departamento_ids: Optional[List[int]] = None,
    empleado_ids: Optional[List[int]] = None,
    pilar_ids: Optional[List[int]] = None,
) -> List[Dict[str, object]]:
    """Collects raw responses for CSV export honoring the same filters as analytics."""
    dept_filter = [int(x) for x in (departamento_ids or []) if x is not None]
    emp_filter = [int(x) for x in (empleado_ids or []) if x is not None]
    pillar_filter = [int(x) for x in (pilar_ids or []) if x is not None]

    stmt = (
        select(
            Respuesta.id.label("respuesta_id"),
            Respuesta.fecha_respuesta,
            Asignacion.id.label("asignacion_id"),
            Asignacion.alcance_tipo,
            Asignacion.alcance_id,
            Pregunta.id.label("pregunta_id"),
            Pregunta.enunciado.label("pregunta_enunciado"),
            Pregunta.respuesta_esperada.label("pregunta_respuesta_esperada"),
            Pilar.id.label("pilar_id"),
            Pilar.nombre.label("pilar_nombre"),
            Empleado.id.label("empleado_id"),
            Empleado.nombre.label("empleado_nombre"),
            Departamento.nombre.label("departamento_nombre"),
            Respuesta.valor,
        )
        .join(Asignacion, Respuesta.asignacion_id == Asignacion.id)
        .join(Pregunta, Respuesta.pregunta_id == Pregunta.id)
        .join(Pilar, Pregunta.pilar_id == Pilar.id)
        .outerjoin(Empleado, Respuesta.empleado_id == Empleado.id)
        .outerjoin(Departamento, Empleado.departamento_id == Departamento.id)
        .where(Asignacion.empresa_id == empresa_id)
    )

    if fecha_desde:
        start_dt = datetime.combine(fecha_desde, datetime.min.time())
        stmt = stmt.where(Respuesta.fecha_respuesta >= start_dt)
    if fecha_hasta:
        end_dt = datetime.combine(fecha_hasta + timedelta(days=1), datetime.min.time())
        stmt = stmt.where(Respuesta.fecha_respuesta < end_dt)
    if pillar_filter:
        stmt = stmt.where(Pregunta.pilar_id.in_(pillar_filter))
    if emp_filter:
        stmt = stmt.where(Respuesta.empleado_id.in_(emp_filter))
    if dept_filter:
        stmt = stmt.where(Empleado.departamento_id.in_(dept_filter))

    stmt = stmt.order_by(Respuesta.fecha_respuesta.desc(), Respuesta.id.desc())
    rows = db.execute(stmt).mappings().all()
    result: List[Dict[str, object]] = []
    for row in rows:
        result.append(
            {
                "respuesta_id": row["respuesta_id"],
                "fecha_respuesta": row["fecha_respuesta"],
                "asignacion_id": row["asignacion_id"],
                "alcance_tipo": row["alcance_tipo"],
                "alcance_id": row["alcance_id"],
                "pregunta_id": row["pregunta_id"],
                "pregunta_enunciado": row["pregunta_enunciado"],
                "pregunta_respuesta_esperada": row["pregunta_respuesta_esperada"],
                "pilar_id": row["pilar_id"],
                "pilar_nombre": row["pilar_nombre"],
                "empleado_id": row["empleado_id"],
                "empleado_nombre": row["empleado_nombre"],
                "departamento_nombre": row["departamento_nombre"],
                "valor": row["valor"],
            }
        )
    return result


# ======================================================
# CONSULTING LEADS
# ======================================================

def create_consulting_lead(db: Session, company: str, email: str) -> ConsultingLead:
    lead = ConsultingLead(company=company, email=email.lower())
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

def delete_consulting_lead(db: Session, lead_id: int) -> bool:
    lead = db.get(ConsultingLead, lead_id)
    if not lead:
        return False
    db.delete(lead)
    db.commit()
    return True

def clear_consulting_leads(db: Session) -> int:
    count = db.query(ConsultingLead).delete()
    db.commit()
    return count
