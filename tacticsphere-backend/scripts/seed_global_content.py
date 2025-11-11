"""
Populate database with the canonical catalogue of pillars, questions, questionnaires, and assignments.

This script replaces any previous set of global pilares/preguntas with the new catalogue and wires every
company so it can start surveying right away.
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
        "nombre": "Infraestructura & Cloud",
        "descripcion": (
            "Practicas ITIL v4: Gestion de Disponibilidad y Capacidad; Gestion de Continuidad de Servicios; "
            "Monitoreo y Eventos."
        ),
        "preguntas": [
            {
                "enunciado": "La empresa utiliza servicios en la nube (correo, almacenamiento, aplicaciones)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen entornos virtualizados para servidores o aplicaciones criticas?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La infraestructura tecnologica esta documentada y estandarizada?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se aplican practicas de monitoreo para detectar fallas y caidas?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se mide la capacidad de la infraestructura para prevenir saturacion?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se utilizan arquitecturas hibridas o multicloud?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La empresa cuenta con planes de continuidad y recuperacion ante desastres (DRP)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se automatizan despliegues mediante CI/CD o infraestructura como codigo?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Los contratos con proveedores cloud se gestionan con SLAs definidos y medidos?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La disponibilidad de la infraestructura esta alineada a los objetivos estrategicos del negocio?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
    {
        "nombre": "Big Data & Analytics",
        "descripcion": "Practicas ITIL v4: Gestion de la Informacion y del Conocimiento; Medicion y Reporte.",
        "preguntas": [
            {
                "enunciado": "La empresa centraliza sus datos en un repositorio unico (Data Warehouse o Data Lake)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen politicas de calidad de datos documentadas y aplicadas?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "El acceso a los datos esta controlado mediante roles definidos?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se realizan analisis basicos con herramientas como Excel o SQL?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se utilizan lenguajes o frameworks avanzados (Python, R, Spark)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se generan reportes periodicos basados en datos actualizados?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se aplican tecnicas de analitica predictiva en procesos clave?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La empresa analiza datos en tiempo real (por ejemplo IoT, logs, streaming)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existe un catalogo o gobierno de datos que describa origenes y usos?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "El analisis de datos guia decisiones estrategicas de alto impacto?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
    {
        "nombre": "Business Intelligence (BI)",
        "descripcion": "Practicas ITIL v4: Gestion de Medicion y Reporte; Gestion de Demanda.",
        "preguntas": [
            {
                "enunciado": "La empresa define formalmente KPIs alineados a sus objetivos estrategicos?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen dashboards ejecutivos para visualizar dichos KPIs?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La direccion consulta regularmente los dashboards o reportes?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "El BI esta integrado en diferentes areas (finanzas, operaciones, marketing)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Los reportes se generan de forma automatica y no manual?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La informacion de BI se actualiza en tiempo real o con baja latencia?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se aplican tecnicas de visualizacion adecuadas para la interpretacion?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Los usuarios cuentan con autoservicio de BI (Power BI, Tableau, Looker)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "El BI se utiliza para anticipar demandas y planificar recursos?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "El BI forma parte del ciclo de mejora continua de la organizacion?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
    {
        "nombre": "Inteligencia Artificial (IA)",
        "descripcion": (
            "Practicas ITIL v4: Gestion de la Innovacion; Automatizacion y Soporte de TI; Gestion de Cambios."
        ),
        "preguntas": [
            {
                "enunciado": "La empresa conoce y evalua casos de uso de IA aplicables a su industria?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se han realizado pilotos de IA (por ejemplo chatbots o RPA basica)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen proyectos de machine learning en areas especificas?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se usan modelos predictivos en procesos criticos (ventas, mantenimiento)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La IA esta integrada en sistemas productivos o de negocio?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Existen lineamientos eticos o de gobernanza para el uso de IA?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Se aplican tecnicas avanzadas como NLP o vision computacional?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "Los proyectos de IA tienen metricas claras de exito y retorno (ROI)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La IA esta incluida formalmente en la estrategia tecnologica de la empresa?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
            {
                "enunciado": "La IA se utiliza como fuente de innovacion continua (por ejemplo IA generativa o nuevos modelos de negocio)?",
                "tipo": "LIKERT",
                "es_obligatoria": True,
                "peso": 1,
            },
        ],
    },
]


def purge_obsolete_pilares(session, valid_names: Iterable[str]) -> int:
    valid = set(valid_names)
    if not valid:
        return 0
    removed = 0
    stmt = select(Pilar).where(Pilar.empresa_id.is_(None))
    for pilar in session.scalars(stmt):
        if pilar.nombre not in valid:
            session.delete(pilar)
            removed += 1
    if removed:
        session.flush()
    return removed


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


def parse_tipo(tipo_value) -> TipoPreguntaEnum:
    if isinstance(tipo_value, TipoPreguntaEnum):
        return tipo_value
    return TipoPreguntaEnum(tipo_value)


def ensure_preguntas(
    session, pilar: Pilar, preguntas: Iterable[Dict]
) -> Tuple[List[Pregunta], int, int]:
    existing = {
        pregunta.enunciado: pregunta
        for pregunta in session.scalars(select(Pregunta).where(Pregunta.pilar_id == pilar.id))
    }
    desired_texts = set()
    ensured: List[Pregunta] = []
    created_count = 0
    removed_count = 0

    for pdata in preguntas:
        desired_texts.add(pdata["enunciado"])
        tipo_enum = parse_tipo(pdata.get("tipo", TipoPreguntaEnum.LIKERT.value))
        es_obligatoria = pdata.get("es_obligatoria", True)
        peso = pdata.get("peso", 1)

        pregunta = existing.get(pdata["enunciado"])
        if not pregunta:
            pregunta = Pregunta(
                pilar_id=pilar.id,
                enunciado=pdata["enunciado"],
                tipo=tipo_enum,
                es_obligatoria=es_obligatoria,
                peso=peso,
            )
            session.add(pregunta)
            session.flush()
            created_count += 1
        else:
            updated = False
            if pregunta.tipo != tipo_enum:
                pregunta.tipo = tipo_enum
                updated = True
            if pregunta.es_obligatoria != es_obligatoria:
                pregunta.es_obligatoria = es_obligatoria
                updated = True
            if pregunta.peso != peso:
                pregunta.peso = peso
                updated = True
            if updated:
                session.flush()
        ensured.append(pregunta)

    for enunciado, pregunta in existing.items():
        if enunciado not in desired_texts:
            session.delete(pregunta)
            removed_count += 1
    if removed_count:
        session.flush()

    return ensured, created_count, removed_count


def ensure_cuestionario(session, empresa_id: int, preguntas: Iterable[Pregunta]) -> Tuple[Cuestionario, int]:
    stmt = select(Cuestionario).where(Cuestionario.empresa_id == empresa_id).order_by(Cuestionario.version.desc())
    cuestionario = session.scalars(stmt).first()
    created = False
    if not cuestionario:
        cuestionario = Cuestionario(
            empresa_id=empresa_id,
            titulo="Diagnostico Digital",
            version=1,
            estado="PUBLICADO",
        )
        session.add(cuestionario)
        session.flush()
        created = True

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

        removed_pilares = purge_obsolete_pilares(session, [item["nombre"] for item in GLOBAL_TEMPLATE])
        removed_preguntas = 0

        summaries = []
        for empresa in empresas:
            pilares_creados = 0
            preguntas_creadas = 0
            preguntas_eliminadas = 0
            question_pool: List[Pregunta] = []

            for pilar_data in GLOBAL_TEMPLATE:
                pilar, nuevo = ensure_pilar(session, pilar_data)
                if nuevo:
                    pilares_creados += 1
                preguntas, nuevas, eliminadas = ensure_preguntas(session, pilar, pilar_data["preguntas"])
                preguntas_creadas += nuevas
                preguntas_eliminadas += eliminadas
                question_pool.extend(preguntas)

            cuestionario, nuevas_relaciones = ensure_cuestionario(session, empresa.id, question_pool)
            asignacion, asignacion_creada = ensure_assignment(session, empresa.id, cuestionario)

            removed_preguntas += preguntas_eliminadas
            summaries.append(
                {
                    "empresa": empresa.nombre,
                    "pilares_creados": pilares_creados,
                    "preguntas_creadas": preguntas_creadas,
                    "preguntas_eliminadas": preguntas_eliminadas,
                    "nuevas_relaciones": nuevas_relaciones,
                    "asignacion_creada": asignacion_creada,
                    "asignacion_id": asignacion.id,
                    "cuestionario_id": cuestionario.id,
                }
            )

        session.commit()
        print("Contenido global sincronizado correctamente.\n")
        if removed_pilares or removed_preguntas:
            print(f"Se eliminaron {removed_pilares} pilares y {removed_preguntas} preguntas obsoletas.")
        for item in summaries:
            print(
                f"- {item['empresa']}: pilares nuevos={item['pilares_creados']}, "
                f"preguntas nuevas={item['preguntas_creadas']}, "
                f"preguntas eliminadas={item['preguntas_eliminadas']}, "
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
