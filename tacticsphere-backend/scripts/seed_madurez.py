"""
Script de seed para poblar la base de datos con:
- 4 pilares del modelo TacticSphere
- 40 preguntas tipo LIKERT (10 por pilar)
- Cuestionario de madurez
- 4 empresas de ejemplo
- Empleados y respuestas simuladas (al menos 100 respuestas totales)

Este script limpia solo las tablas relacionadas con el modelo de madurez,
sin tocar usuarios, password_change_requests ni audit_logs.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import List, Optional, Dict
import random

from sqlalchemy import select, delete
from sqlalchemy.orm import Session

# Ensure project root is on sys.path so `app` is importable when running as script.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models import (
    Empresa,
    Departamento,
    Empleado,
    Pilar,
    Pregunta,
    Cuestionario,
    CuestionarioPregunta,
    Asignacion,
    Respuesta,
    UmbralPilar,
    Recomendacion,
    TipoPreguntaEnum,
    SemaforoEnum,
)

# ============================================
# RESPUESTAS ESPERADAS PARA CADA PREGUNTA
# ============================================

RESPUESTAS_ESPERADAS = {
    "¿La empresa utiliza servicios en la nube (correo, almacenamiento, aplicaciones)?": """1 – Inicial: La empresa funciona principalmente con infraestructura on-premise y, si usa servicios en la nube, es de forma aislada y sin políticas ni contratos formales (por ejemplo, correos gratuitos o cuentas sueltas).

3 – Intermedio: La organización utiliza de forma consistente servicios cloud corporativos (correo, colaboración y algunas aplicaciones de negocio), con cuentas administradas y configuración básica de seguridad.

5 – Ideal: Existe una estrategia cloud definida (SaaS/PaaS/IaaS) alineada al negocio, con gobierno, seguridad, costos y rendimiento gestionados formalmente.""",

    "¿Existen entornos virtualizados para servidores o aplicaciones críticas?": """1 – Inicial: La mayoría de los servidores son físicos, sin virtualización estandarizada o con pruebas aisladas sin políticas claras.

3 – Intermedio: La mayor parte de los servidores y aplicaciones críticas está virtualizada, usando una plataforma consolidada y con procedimientos básicos de administración.

5 – Ideal: La virtualización y/o contenedores están estandarizados y orquestados (por ejemplo, clusters de VMs o Kubernetes), con alta disponibilidad, automatización y capacidad gestionada según demanda.""",

    "¿La infraestructura tecnológica está documentada y estandarizada?": """1 – Inicial: La documentación de la infraestructura es mínima o inexistente; la información está dispersa o depende del conocimiento tácito de algunas personas.

3 – Intermedio: Existen diagramas y descripciones actualizadas de redes, servidores y servicios críticos, junto con algunos estándares de configuración (nomenclaturas, versiones, sistemas operativos).

5 – Ideal: La organización cuenta con una CMDB o repositorio de configuración formal, con estándares de arquitectura definidos y revisiones periódicas, integrado con la gestión de cambios y el control de impacto en el negocio.""",

    "¿Se aplican prácticas de monitoreo para detectar fallas y caídas?": """1 – Inicial: No hay monitoreo formal; la organización se entera de las caídas cuando los usuarios reportan problemas.

3 – Intermedio: Existen herramientas de monitoreo para servicios y componentes críticos, con alertas básicas (por correo, SMS u otros canales) y revisión periódica de eventos.

5 – Ideal: Hay monitoreo proactivo e integrado, con umbrales definidos, dashboards en tiempo real, correlación de eventos y uso sistemático de la información para prevenir incidentes y mejorar continuamente.""",

    "¿Se mide la capacidad de la infraestructura para prevenir saturación?": """1 – Inicial: No se realiza gestión de capacidad; se actúa solo cuando los sistemas se saturan o muestran degradación evidente de rendimiento.

3 – Intermedio: Se monitorean de forma periódica indicadores de capacidad (CPU, memoria, almacenamiento, red) en sistemas clave, y se planifican ampliaciones básicas en función de esas mediciones.

5 – Ideal: Existe una gestión de capacidad formal, con proyecciones basadas en tendencias de uso, acuerdos con el negocio, modelos de demanda y mecanismos de autoescalado cuando corresponde.""",

    "¿Se utilizan arquitecturas híbridas o multicloud?": """1 – Inicial: Toda la infraestructura está en un único entorno (on-premise o un solo proveedor cloud) sin una estrategia definida.

3 – Intermedio: La organización combina infraestructura on-premise con al menos un proveedor cloud de forma planificada para ciertos servicios o cargas de trabajo.

5 – Ideal: Existe una estrategia híbrida/multicloud diseñada, con interoperabilidad y portabilidad entre entornos, gestión de seguridad y costos, y decisiones alineadas a riesgos y creación de valor.""",

    "¿La empresa cuenta con planes de continuidad y recuperación ante desastres (DRP)?": """1 – Inicial: No hay un plan formal de continuidad o recuperación; solo se realizan respaldos ocasionales sin pruebas ni procedimientos claros.

3 – Intermedio: La organización tiene un DRP documentado para servicios críticos, con respaldos regulares y pruebas de recuperación realizadas al menos de forma periódica.

5 – Ideal: El plan de continuidad y el DRP están integrados con las prioridades del negocio, con RTO y RPO definidos y medidos, simulacros frecuentes y mejora continua de los procedimientos.""",

    "¿Se automatizan despliegues mediante CI/CD o infraestructura como código?": """1 – Inicial: Los despliegues se realizan de forma manual, sin scripts estandarizados ni herramientas de automatización.

3 – Intermedio: Algunos proyectos utilizan pipelines de CI/CD y herramientas de infraestructura como código para automatizar despliegues y configuraciones en entornos clave.

5 – Ideal: La automatización mediante CI/CD e infraestructura como código es transversal, con pruebas automatizadas, revisiones de calidad, despliegues frecuentes y mecanismos de rollback controlados e integrados a la gestión de cambios.""",

    "¿Los contratos con proveedores cloud se gestionan con SLAs definidos y medidos?": """1 – Inicial: Las relaciones con proveedores cloud se gestionan solo a nivel de facturación o soporte básico, sin SLAs claros ni seguimiento formal.

3 – Intermedio: Los contratos incluyen SLAs definidos (por ejemplo, disponibilidad y tiempos de respuesta) y se realiza algún tipo de revisión periódica de su cumplimiento.

5 – Ideal: Existe una gestión formal de proveedores y SLAs, con indicadores de desempeño, revisiones periódicas, acciones correctivas y decisiones de mejora basadas en datos objetivos.""",

    "¿La disponibilidad de la infraestructura está alineada a los objetivos estratégicos del negocio?": """1 – Inicial: No se conocen ni han sido acordados los requerimientos de disponibilidad del negocio; la prioridad es simplemente "que funcione".

3 – Intermedio: Para los servicios más importantes se han definido ventanas de mantenimiento y niveles de disponibilidad aceptados en acuerdo con las áreas de negocio.

5 – Ideal: Hay un catálogo de servicios con objetivos de disponibilidad negociados según criticidad, la infraestructura se diseña en función de esos objetivos y se monitorea el cumplimiento de forma continua.""",

    "¿La empresa centraliza sus datos en un repositorio único (Data Warehouse o Data Lake)?": """1 – Inicial: Los datos están dispersos en hojas de cálculo y sistemas independientes, sin integración centralizada.

3 – Intermedio: La organización dispone de un Data Warehouse o Data Lake que concentra datos de los dominios clave (por ejemplo, ventas, operaciones), con procesos ETL básicos.

5 – Ideal: Existe una plataforma de datos corporativa bien definida, que integra múltiples fuentes de forma automática y sirve como base para BI, analítica avanzada e iniciativas de IA.""",

    "¿Existen políticas de calidad de datos documentadas y aplicadas?": """1 – Inicial: No hay reglas formales de calidad de datos; la exactitud y consistencia dependen de cada usuario o equipo.

3 – Intermedio: Existen políticas básicas de calidad de datos (formatos, validaciones, unicidad) documentadas y aplicadas al menos en los sistemas principales.

5 – Ideal: La organización cuenta con una gestión de calidad de datos formal, con responsables definidos, métricas de calidad, procesos de limpieza y mejora continua sobre la base de esas métricas.""",

    "¿El acceso a los datos está controlado mediante roles definidos?": """1 – Inicial: Los permisos de acceso a datos están poco controlados; muchos usuarios tienen más acceso del que necesitan o no hay criterios claros.

3 – Intermedio: Se utilizan roles definidos para controlar el acceso a datos sensibles, con revisiones periódicas de permisos al menos en sistemas críticos.

5 – Ideal: Existe un modelo de seguridad basado en roles y principios de mínimo privilegio para los datos, con auditoría, trazabilidad y cumplimiento de normativas aplicables.""",

    "¿Se realizan análisis básicos con herramientas como Excel o SQL?": """1 – Inicial: Se realizan pocos análisis y de forma ad hoc, sin estructura, sin modelos reutilizables ni periodicidad.

3 – Intermedio: Las áreas clave realizan análisis regulares con Excel o SQL, con plantillas y consultas reutilizables que generan reportes recurrentes.

5 – Ideal: El análisis básico está estandarizado e institucionalizado, con consultas, modelos y plantillas controladas, integradas a los procesos de decisión del negocio.""",

    "¿Se utilizan lenguajes o frameworks avanzados (Python, R, Spark)?": """1 – Inicial: No se utilizan lenguajes ni frameworks avanzados; el análisis se limita a hojas de cálculo y consultas simples.

3 – Intermedio: Algunas áreas o proyectos específicos usan Python, R o frameworks como Spark para análisis más sofisticados, aunque sin una plataforma unificada.

5 – Ideal: Hay un equipo o función de analítica de datos consolidada, con plataforma analítica soportada (notebooks, clusters, etc.) y uso extendido de frameworks avanzados dentro de buenas prácticas de desarrollo y MLOps.""",

    "¿Se generan reportes periódicos basados en datos actualizados?": """1 – Inicial: Los reportes se generan de forma esporádica y manual, con datos desactualizados y sin calendario claro.

3 – Intermedio: Existen reportes periódicos (por ejemplo, mensuales o semanales) que se generan en base a datos actualizados de los sistemas centrales o del repositorio de datos.

5 – Ideal: Hay un calendario de reporting automatizado con datos near real-time o de baja latencia, distribución controlada y uso activo de los reportes en las reuniones de gestión.""",

    "¿Se aplican técnicas de analítica predictiva en procesos clave?": """1 – Inicial: No se aplican técnicas de analítica predictiva; solo se analizan datos históricos de forma descriptiva.

3 – Intermedio: Se han desarrollado algunos modelos predictivos para procesos o casos de uso específicos (por ejemplo, churn de clientes o proyección de demanda) que se utilizan operativamente en ciertas áreas.

5 – Ideal: La analítica predictiva está integrada en procesos de negocio clave, con modelos mantenidos, métricas de performance y decisiones relevantes basadas en sus resultados.""",

    "¿La empresa analiza datos en tiempo real (ej. IoT, logs, streaming)?": """1 – Inicial: Todo el análisis se realiza en batch; no hay capacidades para analizar flujos de datos en tiempo real.

3 – Intermedio: Se procesan datos en tiempo casi real para monitorear ciertos eventos o logs de sistemas críticos, con algunas alertas o paneles específicos.

5 – Ideal: La organización cuenta con una arquitectura de datos en streaming para eventos relevantes (por ejemplo, IoT, transacciones, seguridad), con análisis y alertas en tiempo real integrados a la operación.""",

    "¿Existe un catálogo o gobierno de datos que describa orígenes y usos?": """1 – Inicial: No hay un catálogo de datos; el origen y uso de cada conjunto de datos se conoce solo de manera informal.

3 – Intermedio: Existe un catálogo o documentación parcial para los conjuntos de datos más importantes, con responsables asignados y descripción básica.

5 – Ideal: La organización dispone de un catálogo de datos corporativo, con linaje y metadatos mantenidos, políticas claras de uso y un modelo de gobierno de datos establecido.""",

    "¿El análisis de datos guía decisiones estratégicas de alto impacto?": """1 – Inicial: Las decisiones estratégicas se toman principalmente por intuición, experiencia o criterios políticos, con poco uso de evidencia cuantitativa.

3 – Intermedio: Algunas decisiones estratégicas se apoyan en reportes y análisis de datos, especialmente en ciertas áreas o proyectos relevantes.

5 – Ideal: La estrategia del negocio es fuertemente data-driven; los comités directivos revisan sistemáticamente indicadores, escenarios y modelos analíticos antes de tomar decisiones de alto impacto.""",

    "¿La empresa define formalmente KPIs alineados a sus objetivos estratégicos?": """1 – Inicial: No hay un conjunto formal de KPIs o, si existe, no está claramente alineado a la estrategia de la organización.

3 – Intermedio: La empresa define un conjunto de KPIs por área, relacionados con los objetivos estratégicos principales y revisados periódicamente.

5 – Ideal: Existe un mapa de KPIs corporativo bien definido y documentado, alineado al plan estratégico, con responsables, metas y ciclos de revisión claros.""",

    "¿Existen dashboards ejecutivos para visualizar dichos KPIs?": """1 – Inicial: No hay dashboards ejecutivos; la información se ve en reportes estáticos, planillas o presentaciones aisladas.

3 – Intermedio: Existen dashboards ejecutivos para temas clave (por ejemplo, resultados financieros, ventas, operaciones) que se consultan con cierta regularidad.

5 – Ideal: La organización dispone de una suite de dashboards ejecutivos integrada, con vista global y posibilidad de detalle (drill-down), accesible en diferentes dispositivos y actualizada automáticamente.""",

    "¿La dirección consulta regularmente los dashboards/reportes?": """1 – Inicial: La dirección casi no utiliza dashboards ni reportes formales en sus reuniones; se basa principalmente en resúmenes verbales o documentos sueltos.

3 – Intermedio: La dirección revisa dashboards y reportes de forma periódica (por ejemplo, en reuniones mensuales o trimestrales) para apoyar sus decisiones.

5 – Ideal: El uso de dashboards y reportes está plenamente incorporado a la dinámica de la dirección; las decisiones se discuten explícitamente en base a indicadores y evidencias presentadas en BI.""",

    "¿El BI está integrado en diferentes áreas (finanzas, operaciones, marketing)?": """1 – Inicial: El BI, si existe, se usa solo en una o muy pocas áreas; no hay una visión transversal.

3 – Intermedio: Varias áreas clave (por ejemplo, finanzas, operaciones, ventas/marketing) utilizan BI con modelos y reportes propios dentro de una misma plataforma.

5 – Ideal: El BI es transversal y está integrado en múltiples áreas, con modelos compartidos, definiciones de indicadores comunes y colaboración entre equipos en torno a los datos.""",

    "¿Los reportes se generan de forma automática, no manual?": """1 – Inicial: La mayoría de los reportes se arma manualmente, copiando y pegando datos desde distintas fuentes.

3 – Intermedio: Una parte importante de los reportes se genera automáticamente desde la plataforma de BI o el repositorio de datos, aunque todavía existen reportes manuales.

5 – Ideal: La generación de reportes está casi totalmente automatizada, con pipelines de datos confiables, mínima intervención manual y trazabilidad de las versiones e históricos.""",

    "¿La información de BI se actualiza en tiempo real o con baja latencia?": """1 – Inicial: La información de BI se actualiza de forma esporádica (por ejemplo, mensual) y mediante procesos manuales.

3 – Intermedio: Los principales dashboards se actualizan con una frecuencia razonable (por ejemplo, diaria o varias veces al día), suficiente para la mayoría de las decisiones.

5 – Ideal: Los datos de BI para indicadores críticos se actualizan en tiempo real o casi real, y el resto tiene frecuencias de actualización definidas según la naturaleza de cada KPI y las necesidades del negocio.""",

    "¿Se aplican técnicas de visualización adecuadas para la interpretación?": """1 – Inicial: Los gráficos son poco claros, saturados o no adecuados al tipo de dato; no hay estándares de diseño ni buenas prácticas.

3 – Intermedio: Las visualizaciones son razonablemente claras y consistentes, con ciertos criterios básicos de diseño aplicados de forma habitual.

5 – Ideal: La organización aplica buenas prácticas de visualización de datos, con plantillas, foco en la comprensión, uso adecuado de tipos de gráficos y, cuando corresponde, técnicas de data storytelling para apoyar la toma de decisiones.""",

    "¿Los usuarios cuentan con autoservicio de BI (Power BI, Tableau, Looker)?": """1 – Inicial: Solo el equipo de TI o BI puede crear o modificar reportes; los usuarios de negocio dependen totalmente de ellos.

3 – Intermedio: Algunos usuarios de negocio (power users) cuentan con licencias y crean sus propios reportes, con cierto nivel de gobernanza sobre las fuentes de datos.

5 – Ideal: Existe un modelo de autoservicio de BI gobernado, con dominios de datos preparados, capacitación a usuarios, y distinción clara entre reportes oficiales y exploratorios.""",

    "¿El BI se utiliza para anticipar demandas y planificar recursos?": """1 – Inicial: El BI se utiliza principalmente para mirar el pasado; no se ocupa para anticipar demanda ni planificar recursos.

3 – Intermedio: Algunas áreas usan tendencias históricas y reportes de BI para realizar estimaciones y planificar recursos de manera básica.

5 – Ideal: El BI se combina con analítica predictiva para anticipar demanda, simular escenarios y planificar capacidad y recursos de forma sistemática.""",

    "¿El BI forma parte del ciclo de mejora continua de la organización?": """1 – Inicial: No existe una relación clara entre los datos de BI y las iniciativas de mejora o proyectos de cambio.

3 – Intermedio: Algunos proyectos de mejora utilizan BI para definir metas y monitorear avances, pero no hay un uso totalmente sistemático.

5 – Ideal: El ciclo de mejora continua (por ejemplo, PDCA) se apoya sistemáticamente en BI, con KPIs antes y después, seguimiento de resultados y retroalimentación al sistema de gestión.""",

    "¿La empresa conoce y evalúa casos de uso de IA aplicables a su industria?": """1 – Inicial: La organización tiene poco conocimiento sobre IA y no ha analizado seriamente casos de uso relevantes para su sector.

3 – Intermedio: Se han identificado y analizado algunos casos de uso de IA aplicables a la industria, con evaluaciones básicas de factibilidad e impacto.

5 – Ideal: Existe un portafolio de casos de uso de IA priorizado, con análisis de impacto, viabilidad técnica y alineación estratégica, revisado de forma periódica.""",

    "¿Se han realizado pilotos de IA (ej. chatbots, RPA básica)?": """1 – Inicial: No se han realizado pilotos de IA ni iniciativas estructuradas de prueba de estas tecnologías.

3 – Intermedio: Se han ejecutado pilotos de IA en una o dos áreas (por ejemplo, chatbots, RPA simple) y se han evaluado sus resultados.

5 – Ideal: La organización realiza pilotos de IA de forma recurrente y sistemática, con una metodología definida de experimentación y criterios claros para decidir qué proyectos pasan a producción.""",

    "¿Existen proyectos de machine learning en áreas específicas?": """1 – Inicial: No hay proyectos de machine learning activos en la organización.

3 – Intermedio: Existen proyectos puntuales de machine learning en algunas áreas (por ejemplo, scoring, segmentación, predicciones operativas).

5 – Ideal: La empresa cuenta con un portafolio de proyectos de machine learning en varias áreas de negocio, con equipo dedicado, roadmap y gobernanza definidos.""",

    "¿Se usan modelos predictivos en procesos críticos (ventas, mantenimiento)?": """1 – Inicial: Los procesos críticos se gestionan sin modelos predictivos; se basan en experiencia y reglas fijas.

3 – Intermedio: Algunos procesos críticos incorporan modelos predictivos para apoyar decisiones (por ejemplo, forecast de ventas o mantenimiento preventivo).

5 – Ideal: Los modelos predictivos están embebidos en los procesos de negocio críticos, con monitoreo de desempeño, ajustes regulares y medición clara del impacto (reducción de fallas, aumento de ingresos, etc.).""",

    "¿La IA está integrada en sistemas productivos o de negocio?": """1 – Inicial: Las iniciativas de IA, si existen, se limitan a pruebas o análisis aislados; no están integradas en sistemas productivos.

3 – Intermedio: Algunos sistemas de negocio consumen modelos de IA (por ejemplo, motores de recomendación, scoring, clasificación) en escenarios concretos.

5 – Ideal: La IA está integrada de forma robusta en varios sistemas productivos, con APIs, prácticas de MLOps, monitoreo continuo y gestión de cambios alineada al ciclo de vida de los modelos.""",

    "¿Existen lineamientos éticos o de gobernanza para el uso de IA?": """1 – Inicial: No hay lineamientos éticos ni políticas de gobernanza específicas para el uso de IA y datos asociados.

3 – Intermedio: La organización cuenta con lineamientos básicos para el uso responsable de datos y algunos criterios éticos para proyectos de IA, especialmente en áreas sensibles.

5 – Ideal: Existe un marco formal de gobernanza de IA, con principios éticos definidos, comités o roles responsables, evaluación de riesgos y cumplimiento de normativas y buenas prácticas.""",

    "¿Se aplican técnicas avanzadas como NLP o visión computacional?": """1 – Inicial: No se utilizan técnicas avanzadas de IA como procesamiento de lenguaje natural o visión computacional; solo se han explorado modelos simples, si acaso.

3 – Intermedio: Se han desarrollado algunos proyectos de NLP o visión computacional en áreas específicas, con uso limitado pero real.

5 – Ideal: La organización aplica de forma sistemática técnicas avanzadas (NLP, visión, audio, etc.) en los casos donde aportan valor, con capacidades técnicas internas o externas bien gestionadas.""",

    "¿Los proyectos de IA tienen métricas claras de éxito y retorno (ROI)?": """1 – Inicial: Los proyectos de IA, si existen, se ejecutan sin métricas claras de éxito; el valor generado no se mide formalmente.

3 – Intermedio: Los proyectos relevantes de IA definen algunos KPIs de resultado (ahorro, aumento de ingresos, mejora de tiempos, calidad, etc.) y se revisan al cierre del proyecto.

5 – Ideal: Existe un marco de medición de valor para la IA, con métricas de ROI, impacto operativo, experiencia de cliente y aprendizaje organizacional, usado para priorizar y ajustar la inversión en IA.""",

    "¿La IA está incluida formalmente en la estrategia tecnológica de la empresa?": """1 – Inicial: La estrategia tecnológica no incluye la IA o solo la menciona de forma muy superficial, sin objetivos ni planes concretos.

3 – Intermedio: La estrategia de TI contempla la IA en algunos ejes o iniciativas, con ciertos objetivos de adopción o experimentación.

5 – Ideal: La IA forma parte explícita de la estrategia tecnológica y/o digital de la empresa, con objetivos claros, roadmap, presupuesto y responsables definidos.""",

    "¿La IA se utiliza como fuente de innovación continua (ej. IA generativa, nuevos modelos de negocio)?": """1 – Inicial: La IA no se considera un motor de innovación; en el mejor de los casos, se utiliza solo para automatizar tareas puntuales.

3 – Intermedio: Existen algunas iniciativas de innovación que aprovechan IA (incluyendo IA generativa), pero no conforman un sistema continuo ni estructurado.

5 – Ideal: La IA es un pilar de la innovación y transformación de la organización, usada para explorar y desarrollar nuevos productos, servicios y modelos de negocio, con procesos formales de innovación continua.""",
}

# ============================================
# PREGUNTAS POR PILAR
# ============================================

PILARES_DEFINICION = [
    {
        "nombre": "Infraestructura & Cloud",
        "descripcion": "Capacidades tecnológicas relacionadas con la infraestructura de TI, virtualización, servicios en la nube, automatización, monitoreo y gestión de la disponibilidad.",
        "preguntas": [
            "¿La empresa utiliza servicios en la nube (correo, almacenamiento, aplicaciones)?",
            "¿Existen entornos virtualizados para servidores o aplicaciones críticas?",
            "¿La infraestructura tecnológica está documentada y estandarizada?",
            "¿Se aplican prácticas de monitoreo para detectar fallas y caídas?",
            "¿Se mide la capacidad de la infraestructura para prevenir saturación?",
            "¿Se utilizan arquitecturas híbridas o multicloud?",
            "¿La empresa cuenta con planes de continuidad y recuperación ante desastres (DRP)?",
            "¿Se automatizan despliegues mediante CI/CD o infraestructura como código?",
            "¿Los contratos con proveedores cloud se gestionan con SLAs definidos y medidos?",
            "¿La disponibilidad de la infraestructura está alineada a los objetivos estratégicos del negocio?",
        ],
    },
    {
        "nombre": "Big Data & Analytics",
        "descripcion": "Capacidades relacionadas con la gestión de datos, repositorios centralizados, calidad de datos, análisis descriptivo y predictivo, y uso de datos para la toma de decisiones estratégicas.",
        "preguntas": [
            "¿La empresa centraliza sus datos en un repositorio único (Data Warehouse o Data Lake)?",
            "¿Existen políticas de calidad de datos documentadas y aplicadas?",
            "¿El acceso a los datos está controlado mediante roles definidos?",
            "¿Se realizan análisis básicos con herramientas como Excel o SQL?",
            "¿Se utilizan lenguajes o frameworks avanzados (Python, R, Spark)?",
            "¿Se generan reportes periódicos basados en datos actualizados?",
            "¿Se aplican técnicas de analítica predictiva en procesos clave?",
            "¿La empresa analiza datos en tiempo real (ej. IoT, logs, streaming)?",
            "¿Existe un catálogo o gobierno de datos que describa orígenes y usos?",
            "¿El análisis de datos guía decisiones estratégicas de alto impacto?",
        ],
    },
    {
        "nombre": "Business Intelligence (BI)",
        "descripcion": "Capacidades relacionadas con la definición de KPIs, dashboards ejecutivos, reportes automáticos, visualización de datos y uso del BI para la planificación y mejora continua.",
        "preguntas": [
            "¿La empresa define formalmente KPIs alineados a sus objetivos estratégicos?",
            "¿Existen dashboards ejecutivos para visualizar dichos KPIs?",
            "¿La dirección consulta regularmente los dashboards/reportes?",
            "¿El BI está integrado en diferentes áreas (finanzas, operaciones, marketing)?",
            "¿Los reportes se generan de forma automática, no manual?",
            "¿La información de BI se actualiza en tiempo real o con baja latencia?",
            "¿Se aplican técnicas de visualización adecuadas para la interpretación?",
            "¿Los usuarios cuentan con autoservicio de BI (Power BI, Tableau, Looker)?",
            "¿El BI se utiliza para anticipar demandas y planificar recursos?",
            "¿El BI forma parte del ciclo de mejora continua de la organización?",
        ],
    },
    {
        "nombre": "Inteligencia Artificial (IA)",
        "descripcion": "Capacidades relacionadas con el conocimiento y evaluación de casos de uso de IA, desarrollo de modelos de machine learning, integración en procesos de negocio, gobernanza ética y uso de IA como motor de innovación.",
        "preguntas": [
            "¿La empresa conoce y evalúa casos de uso de IA aplicables a su industria?",
            "¿Se han realizado pilotos de IA (ej. chatbots, RPA básica)?",
            "¿Existen proyectos de machine learning en áreas específicas?",
            "¿Se usan modelos predictivos en procesos críticos (ventas, mantenimiento)?",
            "¿La IA está integrada en sistemas productivos o de negocio?",
            "¿Existen lineamientos éticos o de gobernanza para el uso de IA?",
            "¿Se aplican técnicas avanzadas como NLP o visión computacional?",
            "¿Los proyectos de IA tienen métricas claras de éxito y retorno (ROI)?",
            "¿La IA está incluida formalmente en la estrategia tecnológica de la empresa?",
            "¿La IA se utiliza como fuente de innovación continua (ej. IA generativa, nuevos modelos de negocio)?",
        ],
    },
]

# ============================================
# FUNCIONES DE LIMPIEZA
# ============================================

def limpiar_tablas_madurez(session: Session) -> None:
    """Limpia solo las tablas relacionadas con el modelo de madurez."""
    print("Limpiando tablas relacionadas con el modelo de madurez...")
    
    # Orden de eliminación respetando FK (primero las dependientes)
    session.execute(delete(Respuesta))
    session.execute(delete(Recomendacion))
    session.execute(delete(UmbralPilar))
    session.execute(delete(CuestionarioPregunta))
    session.execute(delete(Asignacion))
    session.execute(delete(Cuestionario))
    session.execute(delete(Pregunta))
    session.execute(delete(Pilar))
    session.execute(delete(Empleado))
    session.execute(delete(Departamento))
    session.execute(delete(Empresa))
    
    session.flush()
    print("Tablas limpiadas correctamente.")


# ============================================
# FUNCIONES DE CREACIÓN
# ============================================

def crear_pilares_y_preguntas(session: Session) -> tuple[List[Pilar], List[Pregunta]]:
    """Crea los 4 pilares y sus 40 preguntas (10 por pilar)."""
    print("\nCreando pilares y preguntas...")
    
    pilares = []
    preguntas = []
    
    for pilar_data in PILARES_DEFINICION:
        # Crear pilar
        pilar = Pilar(
            empresa_id=None,  # Pilares globales (no asociados a empresa específica)
            nombre=pilar_data["nombre"],
            descripcion=pilar_data["descripcion"],
            peso=1,
        )
        session.add(pilar)
        session.flush()
        pilares.append(pilar)
        print(f"  [+] Pilar creado: {pilar.nombre}")
        
        # Crear preguntas del pilar
        for enunciado in pilar_data["preguntas"]:
            respuesta_esperada = RESPUESTAS_ESPERADAS.get(enunciado, "")
            # Truncar si excede 1000 caracteres (límite del campo)
            if len(respuesta_esperada) > 1000:
                respuesta_esperada = respuesta_esperada[:997] + "..."
            
            pregunta = Pregunta(
                pilar_id=pilar.id,
                enunciado=enunciado,
                tipo=TipoPreguntaEnum.LIKERT,
                es_obligatoria=True,
                peso=1,
                respuesta_esperada=respuesta_esperada if respuesta_esperada else None,
            )
            session.add(pregunta)
            session.flush()
            preguntas.append(pregunta)
        
        print(f"    [+] {len(pilar_data['preguntas'])} preguntas creadas para {pilar.nombre}")
    
    print(f"\n[OK] Total: {len(pilares)} pilares y {len(preguntas)} preguntas creadas.")
    return pilares, preguntas


def crear_cuestionario_para_empresa(
    session: Session, empresa_id: int, preguntas: List[Pregunta]
) -> Cuestionario:
    """Crea un cuestionario de madurez para una empresa específica."""
    cuestionario = Cuestionario(
        empresa_id=empresa_id,
        titulo="Cuestionario de Madurez Tecnológica TacticSphere v1",
        version=1,
        estado="PUBLICADO",
    )
    session.add(cuestionario)
    session.flush()
    
    # Crear relaciones CuestionarioPregunta con orden 1-40
    for idx, pregunta in enumerate(preguntas, start=1):
        cuestionario_pregunta = CuestionarioPregunta(
            cuestionario_id=cuestionario.id,
            pregunta_id=pregunta.id,
            orden=idx,
        )
        session.add(cuestionario_pregunta)
    
    session.flush()
    return cuestionario


def crear_empresas_ejemplo(session: Session) -> List[Empresa]:
    """Crea 4 empresas de ejemplo con nombres creativos y realistas."""
    print("\nCreando empresas de ejemplo...")
    
    empresas_data = [
        {"nombre": "NovaTech Solutions", "rut": "76.123.456-7", "giro": "Tecnología e Innovación"},
        {"nombre": "AndesCloud Corp", "rut": "77.234.567-8", "giro": "Servicios Cloud y Consultoría"},
        {"nombre": "DataVista Analytics", "rut": "78.345.678-9", "giro": "Big Data y Business Intelligence"},
        {"nombre": "InnoWave Systems", "rut": "79.456.789-0", "giro": "Sistemas y Transformación Digital"},
    ]
    
    empresas = []
    for empresa_data in empresas_data:
        empresa = Empresa(
            nombre=empresa_data["nombre"],
            rut=empresa_data["rut"],
            giro=empresa_data["giro"],
            activa=True,
        )
        session.add(empresa)
        session.flush()
        empresas.append(empresa)
        print(f"  [+] {empresa.nombre}")
    
    return empresas


def crear_santiago_cloud(
    session: Session,
    empleado_global_idx: int,
    rut_base: int,
) -> tuple[Empresa, List[Departamento], List[Empleado], Dict[int, str]]:
    """
    Crea la empresa Santiago Cloud con distribución específica de empleados.
    
    - 30 empleados distribuidos: 3 inicial, 5 básico, 12 intermedio, 8 avanzado, 2 innovador
    - 4 departamentos: Finanzas (medio), RRHH (bajo), Operaciones (medio), TI (alto)
    """
    print("\nCreando empresa especial: Santiago Cloud...")
    
    # Crear empresa
    empresa = Empresa(
        nombre="Santiago Cloud",
        rut="80.567.890-1",
        giro="Servicios Cloud y Transformación Digital",
        activa=True,
    )
    session.add(empresa)
    session.flush()
    print(f"  [+] {empresa.nombre}")
    
    # Crear departamentos con desempeños específicos
    departamentos_data = [
        {"nombre": "Finanzas", "desempeño": "MEDIO"},
        {"nombre": "Recursos Humanos", "desempeño": "BAJO"},
        {"nombre": "Operaciones", "desempeño": "MEDIO"},
        {"nombre": "TI", "desempeño": "ALTO"},
    ]
    
    departamentos = []
    desempeños_departamento = {}
    
    for depto_data in departamentos_data:
        depto = Departamento(nombre=depto_data["nombre"], empresa_id=empresa.id)
        session.add(depto)
        session.flush()
        departamentos.append(depto)
        desempeños_departamento[depto.id] = depto_data["desempeño"]
        print(f"    [+] Departamento: {depto.nombre} (desempeño: {depto_data['desempeño']})")
    
    # Nombres y apellidos adicionales para Santiago Cloud
    nombres_santiago = [
        "Alejandro", "Catalina", "Matías", "Javiera", "Felipe", "Antonia", "Tomás", "Francisca",
        "Ignacio", "Isidora", "Benjamín", "Trinidad", "Vicente", "Amanda", "Maximiliano", "Catalina",
        "Joaquín", "Martina", "Emilio", "Antonia", "Lucas", "Sofía", "Martín", "Emilia",
        "Agustín", "Josefa", "Cristóbal", "Magdalena", "Renato", "Constanza",
    ]
    
    apellidos_santiago = [
        "Araya", "Bustamante", "Cáceres", "Delgado", "Espinoza", "Fuentes", "García", "Herrera",
        "Ibáñez", "Jara", "Klein", "Lagos", "Molina", "Navarro", "Orellana", "Pizarro",
        "Quiroz", "Rojas", "Salazar", "Tapia", "Urrutia", "Valdés", "Werner", "Yáñez",
        "Zúñiga", "Álvarez", "Benítez", "Carrasco", "Díaz", "Escobar",
    ]
    
    # Cargos por departamento
    cargos_por_dept = {
        "Finanzas": ["Contador Senior", "Analista Financiero", "Tesorero", "Controller", "CFO", "Especialista en Presupuestos", "Analista de Costos"],
        "Recursos Humanos": ["Especialista en RRHH", "Reclutador", "Analista de Compensaciones", "Coordinador de Desarrollo", "Gerente de Talento", "Especialista en Capacitación"],
        "Operaciones": ["Supervisor de Operaciones", "Coordinador Operativo", "Analista de Procesos", "Gerente de Operaciones", "Especialista en Calidad", "Coordinador de Logística"],
        "TI": ["Desarrollador Senior", "Arquitecto Cloud", "DevOps Engineer", "Tech Lead", "Cloud Engineer", "System Administrator", "Security Specialist"],
    }
    
    # Distribución de empleados por nivel
    # 3 inicial (MUY_BAJO), 5 básico (BAJO), 12 intermedio (MEDIO), 8 avanzado (ALTO), 2 innovador (MUY_ALTO)
    distribucion_niveles = [
        ("MUY_BAJO", 3),   # Inicial
        ("BAJO", 5),       # Básico
        ("MEDIO", 12),     # Intermedio
        ("ALTO", 8),       # Avanzado
        ("MUY_ALTO", 2),   # Innovador
    ]
    
    empleados = []
    perfiles_asignados = {}
    
    # Asignar empleados a departamentos (distribuir equitativamente)
    empleados_por_depto = {depto.id: [] for depto in departamentos}
    empleado_idx = 0
    
    for nivel_perfil, cantidad in distribucion_niveles:
        for _ in range(cantidad):
            # Seleccionar nombre y apellidos
            nombre = nombres_santiago[empleado_idx % len(nombres_santiago)]
            apellido1 = apellidos_santiago[empleado_idx % len(apellidos_santiago)]
            apellido2 = apellidos_santiago[(empleado_idx * 3 + 1) % len(apellidos_santiago)]
            apellidos_completos = f"{apellido1} {apellido2}"
            
            # Asignar departamento (distribuir equitativamente)
            depto_idx = empleado_idx % len(departamentos)
            depto_asignado = departamentos[depto_idx]
            depto_nombre = departamentos_data[depto_idx]["nombre"]
            
            # Obtener cargo según departamento
            cargos_disponibles = cargos_por_dept.get(depto_nombre, ["Analista", "Especialista"])
            cargo = cargos_disponibles[empleado_idx % len(cargos_disponibles)]
            
            # Generar email
            email_base = f"{nombre.lower()}.{apellido1.lower()}"
            email = f"{email_base}@santiagocloud.cl"
            
            # Generar RUT
            rut = generar_rut_chileno(rut_base + empleado_global_idx)
            
            # Crear empleado
            empleado = Empleado(
                nombre=nombre,
                apellidos=apellidos_completos,
                rut=rut,
                email=email,
                empresa_id=empresa.id,
                departamento_id=depto_asignado.id,
                cargo=cargo,
            )
            session.add(empleado)
            session.flush()
            empleados.append(empleado)
            empleados_por_depto[depto_asignado.id].append(empleado)
            
            # Asignar perfil de rendimiento
            perfiles_asignados[empleado.id] = nivel_perfil
            
            empleado_idx += 1
            empleado_global_idx += 1
    
    print(f"  [+] 30 empleados creados con distribución:")
    print(f"      - 3 Inicial (MUY_BAJO)")
    print(f"      - 5 Básico (BAJO)")
    print(f"      - 12 Intermedio (MEDIO)")
    print(f"      - 8 Avanzado (ALTO)")
    print(f"      - 2 Innovador (MUY_ALTO)")
    
    return empresa, departamentos, empleados, perfiles_asignados


def generar_rut_chileno(numero: int) -> str:
    """Genera un RUT chileno ficticio con formato válido."""
    # RUT base: número entre 10.000.000 y 99.999.999
    rut_numero = 10000000 + (numero % 89999999)
    # Calcular dígito verificador (simplificado para datos de prueba)
    verificadores = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K']
    dv = verificadores[rut_numero % 11]
    # Formatear como XX.XXX.XXX-X
    rut_str = str(rut_numero)
    rut_formateado = f"{rut_str[:-6]}.{rut_str[-6:-3]}.{rut_str[-3:]}-{dv}"
    return rut_formateado


def crear_departamentos_y_empleados(
    session: Session, empresas: List[Empresa]
) -> tuple[List[Departamento], List[Empleado]]:
    """Crea departamentos y empleados para cada empresa.
    
    - Crea al menos 5 departamentos distintos por empresa
    - Crea 25 empleados por empresa (100 total)
    - Cada empleado tiene todos sus campos completos (nombre, apellidos, RUT, email, cargo, departamento)
    """
    print("\nCreando departamentos y empleados...")
    
    departamentos = []
    empleados = []
    
    # Departamentos distintos por empresa (al menos 5 por empresa)
    departamentos_por_empresa = [
        ["Tecnología", "Logística", "Ventas", "RRHH", "Innovación"],
        ["Producción", "Finanzas", "Atención al Cliente", "Data Office", "Marketing"],
        ["Infraestructura", "DevOps", "Administración", "Calidad", "E-Commerce"],
        ["Seguridad", "Operaciones Industriales", "BI & Analytics", "Proyectos", "Research"],
    ]
    
    # Lista ampliada de nombres y apellidos chilenos
    nombres = [
        "Juan", "María", "Carlos", "Ana", "Luis", "Laura", "Pedro", "Carmen",
        "Diego", "Patricia", "Roberto", "Claudia", "Fernando", "Marcela", "Miguel", "Sofía",
        "Ricardo", "Valentina", "Andrés", "Camila", "Francisco", "Isabella", "Sebastián", "Javiera",
        "Nicolás", "Francisca", "Rodrigo", "Constanza", "Pablo", "Amanda", "Gonzalo", "Daniela",
    ]
    
    apellidos = [
        "Pérez", "González", "Rodríguez", "Martínez", "López", "Sánchez", "Ramírez", "Torres",
        "Flores", "Rivera", "Morales", "Ortiz", "Gutiérrez", "Castillo", "Díaz", "Vargas",
        "Castro", "Romero", "Soto", "Navarro", "Cruz", "Medina", "Herrera", "Jiménez",
        "Moreno", "Aguilar", "Fernández", "Silva", "Ramos", "Mendoza", "Vega", "Cárdenas",
    ]
    
    # Cargos variados por departamento
    cargos_por_dept = {
        "Tecnología": ["Desarrollador Senior", "Arquitecto de Software", "DevOps Engineer", "Tech Lead", "Analista de Sistemas"],
        "Logística": ["Coordinador Logístico", "Analista de Supply Chain", "Supervisor de Almacén", "Especialista en Distribución", "Gerente de Logística"],
        "Ventas": ["Ejecutivo de Ventas", "Gerente Comercial", "Analista de Ventas", "Especialista en CRM", "Coordinador Comercial"],
        "RRHH": ["Especialista en RRHH", "Reclutador", "Analista de Compensaciones", "Coordinador de Desarrollo", "Gerente de Talento"],
        "Innovación": ["Innovation Manager", "Product Manager", "Research Analyst", "Innovation Specialist", "Head of Innovation"],
        "Producción": ["Supervisor de Producción", "Ingeniero de Producción", "Operario Especializado", "Coordinador de Manufactura", "Gerente de Operaciones"],
        "Finanzas": ["Contador", "Analista Financiero", "Tesorero", "Especialista en Control de Gestión", "CFO"],
        "Atención al Cliente": ["Agente de Servicio", "Supervisor de Call Center", "Especialista en Experiencia", "Coordinador de Soporte", "Gerente de Servicio"],
        "Data Office": ["Data Engineer", "Data Analyst", "Data Scientist", "Chief Data Officer", "Analista de Datos"],
        "Marketing": ["Marketing Manager", "Digital Marketing Specialist", "Brand Manager", "Content Creator", "SEO Specialist"],
        "Infraestructura": ["Ingeniero de Infraestructura", "Network Administrator", "System Administrator", "Cloud Engineer", "Infrastructure Manager"],
        "DevOps": ["DevOps Engineer", "Site Reliability Engineer", "Automation Engineer", "CI/CD Specialist", "Platform Engineer"],
        "Administración": ["Administrador", "Coordinador Administrativo", "Asistente de Gerencia", "Especialista en Procesos", "Office Manager"],
        "Calidad": ["Auditor de Calidad", "Especialista en QA", "Quality Manager", "Analista de Procesos", "Coordinador de Calidad"],
        "E-Commerce": ["E-Commerce Manager", "Digital Commerce Specialist", "Online Sales Analyst", "E-Commerce Coordinator", "Digital Retail Manager"],
        "Seguridad": ["Security Analyst", "CISO", "Cybersecurity Specialist", "Security Engineer", "Information Security Manager"],
        "Operaciones Industriales": ["Supervisor Industrial", "Ingeniero de Procesos", "Operaciones Manager", "Production Coordinator", "Industrial Analyst"],
        "BI & Analytics": ["BI Analyst", "Business Intelligence Manager", "Analytics Consultant", "Data Visualization Specialist", "BI Developer"],
        "Proyectos": ["Project Manager", "Scrum Master", "Project Coordinator", "PMO Analyst", "Program Manager"],
        "Research": ["Research Scientist", "Research Analyst", "R&D Manager", "Innovation Researcher", "Technology Researcher"],
    }
    
    empleado_global_idx = 0
    rut_base = 15000000  # Base para RUTs
    
    for empresa_idx, empresa in enumerate(empresas):
        # Crear departamentos específicos para esta empresa
        deptos_empresa = []
        nombres_deptos = departamentos_por_empresa[empresa_idx]
        
        for depto_nombre in nombres_deptos:
            depto = Departamento(nombre=depto_nombre, empresa_id=empresa.id)
            session.add(depto)
            session.flush()
            departamentos.append(depto)
            deptos_empresa.append(depto)
        
        # Crear 25 empleados por empresa
        empleados_empresa = []
        num_empleados = 25
        
        for i in range(num_empleados):
            # Seleccionar nombre y apellido
            nombre = nombres[empleado_global_idx % len(nombres)]
            apellido1 = apellidos[empleado_global_idx % len(apellidos)]
            apellido2 = apellidos[(empleado_global_idx * 2 + 1) % len(apellidos)]
            apellidos_completos = f"{apellido1} {apellido2}"
            
            # Asignar departamento y cargo
            depto_idx = i % len(deptos_empresa)
            depto_asignado = deptos_empresa[depto_idx]
            depto_nombre = nombres_deptos[depto_idx]
            
            # Obtener cargo según departamento
            cargos_disponibles = cargos_por_dept.get(depto_nombre, ["Analista", "Especialista", "Coordinador"])
            cargo = cargos_disponibles[i % len(cargos_disponibles)]
            
            # Generar email
            email_base = f"{nombre.lower()}.{apellido1.lower()}"
            empresa_email = empresa.nombre.lower().replace(" ", "").replace("&", "")
            email = f"{email_base}.{i+1}@{empresa_email}.com"
            
            # Generar RUT
            rut = generar_rut_chileno(rut_base + empleado_global_idx)
            
            # Crear empleado con todos los campos
            empleado = Empleado(
                nombre=nombre,
                apellidos=apellidos_completos,
                rut=rut,
                email=email,
                empresa_id=empresa.id,
                departamento_id=depto_asignado.id,
                cargo=cargo,
            )
            session.add(empleado)
            session.flush()
            empleados.append(empleado)
            empleados_empresa.append(empleado)
            empleado_global_idx += 1
        
        print(f"  [+] {empresa.nombre}: {len(deptos_empresa)} departamentos, {len(empleados_empresa)} empleados")
    
    print(f"\n[OK] Total: {len(departamentos)} departamentos y {len(empleados)} empleados creados.")
    return departamentos, empleados


# Perfiles de rendimiento para empleados
PERFILES_RENDIMIENTO = {
    "MUY_BAJO": {
        "nombre": "Muy Bajo",
        "distribucion": {1: 0.50, 2: 0.40, 3: 0.10, 4: 0.00, 5: 0.00},
        "promedio_esperado": 1.6,
    },
    "BAJO": {
        "nombre": "Bajo",
        "distribucion": {1: 0.20, 2: 0.45, 3: 0.30, 4: 0.05, 5: 0.00},
        "promedio_esperado": 2.3,
    },
    "MEDIO": {
        "nombre": "Medio",
        "distribucion": {1: 0.05, 2: 0.25, 3: 0.40, 4: 0.25, 5: 0.05},
        "promedio_esperado": 3.0,
    },
    "ALTO": {
        "nombre": "Alto",
        "distribucion": {1: 0.00, 2: 0.05, 3: 0.35, 4: 0.40, 5: 0.20},
        "promedio_esperado": 3.75,
    },
    "MUY_ALTO": {
        "nombre": "Muy Alto",
        "distribucion": {1: 0.00, 2: 0.00, 3: 0.10, 4: 0.40, 5: 0.50},
        "promedio_esperado": 4.4,
    },
}


def generar_respuesta_segun_perfil(
    perfil_empleado: str,
    sesgo_empresa: float,
    sesgo_departamento: float,
    sesgo_pilar: float,
) -> int:
    """
    Genera una respuesta Likert (1-5) basada en el perfil de rendimiento del empleado.
    
    El perfil del empleado es la base principal, y se aplican pequeños ajustes
    por empresa, departamento y pilar para crear variación adicional.
    """
    # Obtener distribución base del perfil
    perfil_data = PERFILES_RENDIMIENTO.get(perfil_empleado, PERFILES_RENDIMIENTO["MEDIO"])
    distribucion_base = perfil_data["distribucion"].copy()
    
    # Convertir a lista de pesos [peso_nivel_1, peso_nivel_2, ..., peso_nivel_5]
    weights = [
        distribucion_base[1],
        distribucion_base[2],
        distribucion_base[3],
        distribucion_base[4],
        distribucion_base[5],
    ]
    
    # Aplicar ajustes MUY PEQUEÑOS por contexto (máximo 1% de variación)
    # Los perfiles individuales deben ser completamente dominantes (99% del peso)
    
    # Para Santiago Cloud, los perfiles asignados deben ser aún más determinantes
    # Solo aplicamos ajustes si realmente son necesarios y de forma muy conservadora
    
    # Sesgo de empresa (afecta muy mínimamente, solo si es significativo)
    ajuste_emp = sesgo_empresa * 0.02  # Ajuste mínimo
    if abs(ajuste_emp) > 0.001:
        if ajuste_emp > 0:
            # Sesgo positivo: desplaza ligeramente hacia niveles altos
            weights = [w * (1 - ajuste_emp * 0.05) if i < 2 else w * (1 + ajuste_emp * 0.08) 
                      for i, w in enumerate(weights)]
        else:
            # Sesgo negativo: desplaza ligeramente hacia niveles bajos
            weights = [w * (1 - ajuste_emp * 0.08) if i < 2 else w * (1 + ajuste_emp * 0.05) 
                      for i, w in enumerate(weights)]
    
    # Sesgo de departamento (afecta muy mínimamente)
    ajuste_dept = sesgo_departamento * 0.02  # Ajuste mínimo
    if abs(ajuste_dept) > 0.001:
        if ajuste_dept > 0:
            weights = [w * (1 - ajuste_dept * 0.05) if i < 2 else w * (1 + ajuste_dept * 0.08) 
                      for i, w in enumerate(weights)]
        else:
            weights = [w * (1 - ajuste_dept * 0.08) if i < 2 else w * (1 + ajuste_dept * 0.05) 
                      for i, w in enumerate(weights)]
    
    # Sesgo de pilar (afecta muy mínimamente)
    ajuste_pilar = sesgo_pilar * 0.02  # Ajuste mínimo
    if abs(ajuste_pilar) > 0.001:
        if ajuste_pilar > 0:
            weights = [w * (1 - ajuste_pilar * 0.05) if i < 2 else w * (1 + ajuste_pilar * 0.08) 
                      for i, w in enumerate(weights)]
        else:
            weights = [w * (1 - ajuste_pilar * 0.08) if i < 2 else w * (1 + ajuste_pilar * 0.05) 
                      for i, w in enumerate(weights)]
    
    # Agregar ruido aleatorio del 5% para evitar respuestas perfectas
    # Pero mantener los perfiles dominantes (95% del peso del perfil)
    ruido = random.uniform(-0.05, 0.05)
    weights = [max(0.001, w * (1 + ruido)) 
              for w in weights]
    
    # Normalizar pesos
    total = sum(weights)
    if total > 0:
        weights = [w / total for w in weights]
    else:
        # Fallback a distribución del perfil original
        weights = [
            distribucion_base[1],
            distribucion_base[2],
            distribucion_base[3],
            distribucion_base[4],
            distribucion_base[5],
        ]
    
    # Generar valor usando distribución ponderada
    valor = random.choices([1, 2, 3, 4, 5], weights=weights)[0]
    
    # Asegurar que siempre esté en rango válido
    return max(1, min(5, valor))


def asignar_perfiles_empleados(empleados: List[Empleado]) -> Dict[int, str]:
    """
    Asigna perfiles de rendimiento a empleados de forma libre y dispersa.
    
    No usa números exactos. Distribuye naturalmente entre los 5 perfiles.
    Algunos empleados muy bajos, algunos muy altos, la mayoría en medio.
    """
    perfiles_disponibles = list(PERFILES_RENDIMIENTO.keys())
    
    # Pesos para la distribución de perfiles (más empleados en medio, menos en extremos)
    # Estos pesos solo determinan la probabilidad, no garantizan números exactos
    pesos_perfiles = {
        "MUY_BAJO": 0.08,   # ~8% - algunos pocos
        "BAJO": 0.22,       # ~22% - varios
        "MEDIO": 0.40,      # ~40% - mayoría
        "ALTO": 0.22,       # ~22% - varios
        "MUY_ALTO": 0.08,   # ~8% - algunos pocos
    }
    
    # Crear lista de pesos en orden
    pesos_ordenados = [pesos_perfiles[p] for p in perfiles_disponibles]
    
    # Asignar perfil a cada empleado de forma aleatoria según pesos
    perfiles_asignados = {}
    
    for empleado in empleados:
        perfil = random.choices(perfiles_disponibles, weights=pesos_ordenados)[0]
        perfiles_asignados[empleado.id] = perfil
    
    return perfiles_asignados


def crear_asignaciones_y_respuestas(
    session: Session,
    empresas: List[Empresa],
    preguntas: List[Pregunta],
    empleados: List[Empleado],
    pilares: List[Pilar],
    departamentos: List[Departamento],
    perfiles_santiago_cloud: Optional[Dict[int, str]] = None,
) -> tuple[List[Asignacion], List[Respuesta]]:
    """
    Crea asignaciones y respuestas basadas en perfiles de rendimiento individuales.
    
    Cada empleado tiene un perfil de rendimiento (muy bajo, bajo, medio, alto, muy alto)
    que determina su distribución de respuestas. Se aplican pequeños ajustes por
    empresa, departamento y pilar para crear variación adicional.
    """
    print("\nCreando asignaciones y respuestas con perfiles de rendimiento...")
    
    asignaciones = []
    respuestas = []
    
    # Para cada empresa, crear una asignación
    fecha_base = datetime.now(timezone.utc)
    
    # Agrupar empleados por empresa
    empleados_por_empresa = {}
    for empleado in empleados:
        if empleado.empresa_id not in empleados_por_empresa:
            empleados_por_empresa[empleado.empresa_id] = []
        empleados_por_empresa[empleado.empresa_id].append(empleado)
    
    # Asignar perfiles de rendimiento a empleados (distribución libre)
    # Identificar empleados de Santiago Cloud
    empresa_santiago = next((emp for emp in empresas if emp.nombre == "Santiago Cloud"), None)
    empleados_santiago_ids = {e.id for e in empleados if empresa_santiago and e.empresa_id == empresa_santiago.id}
    
    # Asignar perfiles solo a empleados estándar (no Santiago Cloud)
    empleados_estandar = [e for e in empleados if e.id not in empleados_santiago_ids]
    perfiles_empleados = asignar_perfiles_empleados(empleados_estandar)
    
    # Agregar perfiles de Santiago Cloud si fueron proporcionados
    if perfiles_santiago_cloud:
        print(f"\n  [INFO] Agregando {len(perfiles_santiago_cloud)} perfiles de Santiago Cloud")
        # Contar perfiles por tipo
        conteo_perfiles = {}
        for emp_id, perfil in perfiles_santiago_cloud.items():
            perfiles_empleados[emp_id] = perfil
            conteo_perfiles[perfil] = conteo_perfiles.get(perfil, 0) + 1
        print(f"    [INFO] Distribución de perfiles: {conteo_perfiles}")
    
    # Crear sesgos únicos para cada empresa (ajustes menores, no dominantes)
    sesgos_empresa = {}
    for empresa in empresas:
        # Cada empresa tiene un pequeño sesgo (algunas ligeramente más maduras)
        sesgos_empresa[empresa.id] = random.uniform(-0.2, 0.2)
    
    # Crear sesgos únicos para cada departamento (ajustes menores)
    # Para Santiago Cloud, usar desempeños específicos
    sesgos_departamento = {}
    for depto in departamentos:
        # Verificar si es departamento de Santiago Cloud
        empresa_depto = next((emp for emp in empresas if emp.id == depto.empresa_id), None)
        if empresa_depto and empresa_depto.nombre == "Santiago Cloud":
            # Aplicar sesgos según desempeño del departamento
            if depto.nombre == "Finanzas":
                sesgos_departamento[depto.id] = 0.0  # Medio
            elif depto.nombre == "Recursos Humanos":
                sesgos_departamento[depto.id] = -0.15  # Bajo
            elif depto.nombre == "Operaciones":
                sesgos_departamento[depto.id] = 0.0  # Medio
            elif depto.nombre == "TI":
                sesgos_departamento[depto.id] = 0.15  # Alto
            else:
                sesgos_departamento[depto.id] = random.uniform(-0.15, 0.15)
        else:
            # Cada departamento tiene un pequeño sesgo
            sesgos_departamento[depto.id] = random.uniform(-0.15, 0.15)
    
    # Crear sesgos únicos para cada pilar (ajustes menores)
    sesgos_pilar = {}
    for pilar in pilares:
        # Cada pilar tiene un pequeño sesgo (algunos pilares ligeramente mejor desarrollados)
        sesgos_pilar[pilar.id] = random.uniform(-0.15, 0.15)
    
    for empresa in empresas:
        # Crear cuestionario para esta empresa
        cuestionario_empresa = crear_cuestionario_para_empresa(session, empresa.id, preguntas)
        
        # Crear asignación
        asignacion = Asignacion(
            empresa_id=empresa.id,
            cuestionario_id=cuestionario_empresa.id,
            alcance_tipo="EMPRESA",
            alcance_id=None,
            fecha_inicio=fecha_base - timedelta(days=30),
            fecha_cierre=fecha_base + timedelta(days=30),
            anonimo=False,
        )
        session.add(asignacion)
        session.flush()
        asignaciones.append(asignacion)
        
        # Crear respuestas para los empleados de esta empresa
        empleados_empresa = empleados_por_empresa.get(empresa.id, [])
        respuestas_creadas = 0
        
        # Mezclar empleados para evitar ordenamiento por nivel
        random.shuffle(empleados_empresa)
        
        # Crear respuestas según perfil de rendimiento de cada empleado
        for empleado in empleados_empresa:
            # Obtener perfil de rendimiento del empleado
            perfil_empleado = perfiles_empleados.get(empleado.id, "MEDIO")
            
            # Obtener sesgos de contexto
            sesgo_emp = sesgos_empresa.get(empresa.id, 0.0)
            sesgo_dept = sesgos_departamento.get(empleado.departamento_id, 0.0) if empleado.departamento_id else 0.0
            
            for pregunta in preguntas:
                # Obtener sesgo del pilar
                pilar_id = pregunta.pilar_id
                sesgo_pilar_val = sesgos_pilar.get(pilar_id, 0.0)
                
                # Generar respuesta según perfil del empleado con ajustes menores de contexto
                valor = generar_respuesta_segun_perfil(
                    perfil_empleado=perfil_empleado,
                    sesgo_empresa=sesgo_emp,
                    sesgo_departamento=sesgo_dept,
                    sesgo_pilar=sesgo_pilar_val,
                )
                
                valor_str = str(valor)
                
                respuesta = Respuesta(
                    asignacion_id=asignacion.id,
                    pregunta_id=pregunta.id,
                    empleado_id=empleado.id,
                    valor=valor_str,
                    fecha_respuesta=(fecha_base - timedelta(days=random.randint(0, 20))).replace(tzinfo=None),
                )
                session.add(respuesta)
                respuestas.append(respuesta)
                respuestas_creadas += 1
        
        session.flush()
        print(f"  [+] {empresa.nombre}: asignación creada con {respuestas_creadas} respuestas")
    
    print(f"\n[OK] Total: {len(asignaciones)} asignaciones y {len(respuestas)} respuestas creadas.")
    return asignaciones, respuestas


def crear_umbrales_pilares(session: Session, pilares: List[Pilar]) -> None:
    """Crea umbrales para cada pilar."""
    print("\nCreando umbrales para pilares...")
    
    for pilar in pilares:
        umbral = UmbralPilar(
            pilar_id=pilar.id,
            umbral_amarillo=30,  # Por debajo de 30% (1.5/5 promedio)
            umbral_verde=60,     # Por encima de 60% (3/5 promedio)
        )
        session.add(umbral)
    
    session.flush()
    print(f"[OK] {len(pilares)} umbrales creados.")


# ============================================
# FUNCIÓN PRINCIPAL
# ============================================

def main():
    """Función principal del script de seed."""
    print("=" * 70)
    print("SCRIPT DE SEED - MODELO DE MADUREZ TACTICSPHERE")
    print("=" * 70)
    
    session = SessionLocal()
    try:
        # Paso 1: Limpiar tablas
        limpiar_tablas_madurez(session)
        
        # Paso 2: Crear pilares y preguntas
        pilares, preguntas = crear_pilares_y_preguntas(session)
        
        # Paso 3: Crear empresas (4 empresas estándar)
        empresas = crear_empresas_ejemplo(session)
        
        # Paso 4: Crear departamentos y empleados para empresas estándar
        departamentos, empleados = crear_departamentos_y_empleados(session, empresas)
        
        # Paso 4b: Crear empresa especial Santiago Cloud
        empleado_global_idx = len(empleados)
        rut_base = 15000000 + empleado_global_idx
        empresa_santiago, deptos_santiago, empleados_santiago, perfiles_santiago = crear_santiago_cloud(
            session, empleado_global_idx, rut_base
        )
        
        # Agregar Santiago Cloud a las listas
        empresas.append(empresa_santiago)
        departamentos.extend(deptos_santiago)
        empleados.extend(empleados_santiago)
        
        # Paso 5: Crear asignaciones y respuestas (crea cuestionarios y asignaciones)
        asignaciones, respuestas = crear_asignaciones_y_respuestas(
            session, empresas, preguntas, empleados, pilares, departamentos, perfiles_santiago
        )
        
        # Paso 7: Crear umbrales
        crear_umbrales_pilares(session, pilares)
        
        # Commit final
        session.commit()
        
        print("\n" + "=" * 70)
        print("[OK] SEED COMPLETADO EXITOSAMENTE")
        print("=" * 70)
        print(f"\nResumen:")
        print(f"  • {len(pilares)} pilares")
        print(f"  • {len(preguntas)} preguntas")
        print(f"  • {len(empresas)} empresas")
        print(f"  • {len(departamentos)} departamentos")
        print(f"  • {len(empleados)} empleados")
        print(f"  • {len(asignaciones)} asignaciones")
        print(f"  • {len(respuestas)} respuestas")
        
    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] ERROR durante la ejecucion del seed:")
        print(f"  {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()

