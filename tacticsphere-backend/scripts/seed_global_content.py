"""
Populate database with a global set of pillars, questions, questionnaires, and assignments.

The script ensures every company shares the same catalogue of pillars/preguntas by creating
company-specific copies (required by the current schema) and wiring assignments so surveys
can start without manual setup.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import Dict, Iterable, List, Tuple

from sqlalchemy import func, select

# Ensure project root is on sys.path so `app` is importable when running as script.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models import (
    Asignacion,
    Cuestionario,
    CuestionarioPregunta,
    Empresa,
    Pilar,
    Pregunta,
    TipoPreguntaEnum,
)


GLOBAL_TEMPLATE: List[Dict] = [
    {
        "nombre": "Estrategia",
        "descripcion": "Direccion y objetivos de la transformacion.",
        "preguntas": [
            {
                "enunciado": "La empresa tiene una vision digital clara y compartida.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen indicadores que miden avances de la transformacion.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
    {
        "nombre": "Tecnologia",
        "descripcion": "Infraestructura, software y datos disponibles.",
        "preguntas": [
            {
                "enunciado": "La infraestructura soporta las necesidades actuales y futuras.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Contamos con politicas de seguridad y respaldo efectivas.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
    {
        "nombre": "Procesos",
        "descripcion": "Estandarizacion y mejora continua.",
        "preguntas": [
            {
                "enunciado": "Los procesos clave estan documentados y estandarizados.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existe mejora continua basada en datos.",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
]


def ensure_pilar(session, data: Dict) -> Tuple[Pilar, bool]:
    stmt = select(Pilar).where(Pilar.nombre == data["nombre"])
    pilar = session.scalars(stmt).first()
    created = False
    if not pilar:
        pilar = Pilar(
            empresa_id=None,
            nombre=data["nombre"],
            descripcion=data.get("descripcion"),
            peso=data.get("peso", 1),
        )
        session.add(pilar)
        session.flush()
        created = True
    else:
        updated = False
        if pilar.descripcion != data.get("descripcion"):
            pilar.descripcion = data.get("descripcion")
            updated = True
        if data.get("peso") and pilar.peso != data["peso"]:
            pilar.peso = data["peso"]
            updated = True
        if updated:
            session.flush()
    return pilar, created


def ensure_preguntas(session, pilar: Pilar, preguntas: Iterable[Dict]) -> Tuple[List[Pregunta], int]:
    created_count = 0
    ensured: List[Pregunta] = []
    for pdata in preguntas:
        stmt = select(Pregunta).where(
            Pregunta.pilar_id == pilar.id,
            Pregunta.enunciado == pdata["enunciado"],
        )
        pregunta = session.scalars(stmt).first()
        if not pregunta:
            pregunta = Pregunta(
                pilar_id=pilar.id,
                enunciado=pdata["enunciado"],
                tipo=TipoPreguntaEnum[pdata.get("tipo", "LIKERT")],
                es_obligatoria=pdata.get("es_obligatoria", True),
                peso=pdata.get("peso", 1),
            )
            session.add(pregunta)
            session.flush()
            created_count += 1
        else:
            updated = False
            target_tipo = TipoPreguntaEnum[pdata.get("tipo", pregunta.tipo.name)]
            if pregunta.tipo != target_tipo:
                pregunta.tipo = target_tipo
                updated = True
            if pregunta.es_obligatoria != pdata.get("es_obligatoria", pregunta.es_obligatoria):
                pregunta.es_obligatoria = pdata.get("es_obligatoria", pregunta.es_obligatoria)
                updated = True
            if pregunta.peso != pdata.get("peso", pregunta.peso):
                pregunta.peso = pdata.get("peso", pregunta.peso)
                updated = True
            if updated:
                session.flush()
        ensured.append(pregunta)
    return ensured, created_count


def ensure_cuestionario(session, empresa_id: int, preguntas: Iterable[Pregunta]) -> Tuple[Cuestionario, int]:
    stmt = (
        select(Cuestionario)
        .where(Cuestionario.empresa_id == empresa_id)
        .where(Cuestionario.estado == "PUBLICADO")
        .order_by(Cuestionario.version.desc(), Cuestionario.id.desc())
        .limit(1)
    )
    cuestionario = session.scalars(stmt).first()
    if not cuestionario:
        cuestionario = Cuestionario(
            empresa_id=empresa_id,
            titulo="Plantilla Global",
            version=1,
            estado="PUBLICADO",
        )
        session.add(cuestionario)
        session.flush()

    existing = {
        pid
        for pid in session.scalars(
            select(CuestionarioPregunta.pregunta_id).where(CuestionarioPregunta.cuestionario_id == cuestionario.id)
        )
    }
    orden = (
        session.scalar(
            select(func.max(CuestionarioPregunta.orden)).where(CuestionarioPregunta.cuestionario_id == cuestionario.id)
        )
        or 0
    )

    added = 0
    for pregunta in preguntas:
        if pregunta.id in existing:
            continue
        orden += 1
        session.add(
            CuestionarioPregunta(
                cuestionario_id=cuestionario.id,
                pregunta_id=pregunta.id,
                orden=orden,
            )
        )
        added += 1
    if added:
        session.flush()
    return cuestionario, added


def utc_now_naive() -> datetime:
    """Return naive UTC datetime (matches existing backend convention)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ensure_assignment(session, empresa_id: int, cuestionario: Cuestionario) -> Tuple[Asignacion, bool]:
    stmt = select(Asignacion).where(
        Asignacion.empresa_id == empresa_id,
        Asignacion.alcance_tipo == "EMPRESA",
        Asignacion.alcance_id.is_(None),
    )
    asignacion = session.scalars(stmt).first()
    created = False
    now = utc_now_naive()
    if not asignacion:
        asignacion = Asignacion(
            empresa_id=empresa_id,
            cuestionario_id=cuestionario.id,
            alcance_tipo="EMPRESA",
            alcance_id=None,
            fecha_inicio=now - timedelta(hours=1),
            fecha_cierre=now + timedelta(days=365),
            anonimo=False,
        )
        session.add(asignacion)
        session.flush()
        created = True
    else:
        changed = False
        if asignacion.cuestionario_id != cuestionario.id:
            asignacion.cuestionario_id = cuestionario.id
            changed = True
        if asignacion.fecha_cierre <= now:
            asignacion.fecha_cierre = utc_now_naive() + timedelta(days=365)
            changed = True
        if changed:
            session.flush()
    return asignacion, created


def main() -> None:
    session = SessionLocal()
    try:
        empresas = session.scalars(select(Empresa)).all()
        if not empresas:
            print("No hay empresas registradas. Nada que hacer.")
            return

        summaries = []
        for empresa in empresas:
            pilares_creados = 0
            preguntas_creadas = 0
            question_pool: List[Pregunta] = []

            for pilar_data in GLOBAL_TEMPLATE:
                pilar, nuevo = ensure_pilar(session, pilar_data)
                if nuevo:
                    pilares_creados += 1
                preguntas, nuevas = ensure_preguntas(session, pilar, pilar_data["preguntas"])
                preguntas_creadas += nuevas
                question_pool.extend(preguntas)

            cuestionario, nuevas_relaciones = ensure_cuestionario(session, empresa.id, question_pool)
            asignacion, asignacion_creada = ensure_assignment(session, empresa.id, cuestionario)

            summaries.append(
                {
                    "empresa": empresa.nombre,
                    "pilares_creados": pilares_creados,
                    "preguntas_creadas": preguntas_creadas,
                    "nuevas_relaciones": nuevas_relaciones,
                    "asignacion_creada": asignacion_creada,
                    "asignacion_id": asignacion.id,
                    "cuestionario_id": cuestionario.id,
                }
            )

        session.commit()
        print("Contenido global sincronizado correctamente.\n")
        for item in summaries:
            print(
                f"- {item['empresa']}: pilares nuevos={item['pilares_creados']}, "
                f"preguntas nuevas={item['preguntas_creadas']}, "
                f"relaciones anadidas={item['nuevas_relaciones']}, "
                f"asignacion {'creada' if item['asignacion_creada'] else 'existente'} "
                f"(asg #{item['asignacion_id']}, cuestionario #{item['cuestionario_id']})"
            )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
