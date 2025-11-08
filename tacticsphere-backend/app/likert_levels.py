LIKERT_LEVELS = [
    {
        "valor": 1,
        "nombre": "Inicial",
        "etiqueta": "Ad hoc / Reactivo",
        "descripcion": (
            "La empresa depende de esfuerzos aislados. La tecnologia existe, pero no esta planificada ni "
            "alineada con la estrategia de negocio. La gestion es reactiva."
        ),
        "caracteristicas": "Procesos manuales, poca digitalizacion, gestion reactiva.",
        "interpretacion_itil": "Uso ad hoc, no existe relacion clara con la gestion de valor (SVS).",
    },
    {
        "valor": 2,
        "nombre": "Basico",
        "etiqueta": "Estandarizado / Organizado",
        "descripcion": (
            "La empresa comienza a adoptar herramientas digitales basicas y estandarizar procesos. "
            "Se digitalizan operaciones aisladas, aunque sin integracion transversal."
        ),
        "caracteristicas": "Digitalizacion inicial, herramientas aisladas, estandarizacion basica.",
        "interpretacion_itil": "Practicas minimas, primeros pasos hacia la estandarizacion.",
    },
    {
        "valor": 3,
        "nombre": "Intermedio",
        "etiqueta": "Integrado / Optimizado",
        "descripcion": (
            "Se logra integracion transversal de sistemas y procesos. Los datos se convierten en informacion "
            "valiosa, con indicadores de desempeno que guian decisiones."
        ),
        "caracteristicas": "Integracion transversal, datos centralizados, decisiones basadas en KPIs.",
        "interpretacion_itil": "Optimizacion inicial alineada a Mejora Continua de ITIL v4.",
    },
    {
        "valor": 4,
        "nombre": "Avanzado",
        "etiqueta": "Inteligente / Estrategico",
        "descripcion": (
            "La tecnologia se vuelve un activo estrategico. Se utilizan practicas avanzadas como Big Data en "
            "tiempo real, BI avanzado e IA predictiva. La infraestructura es resiliente y automatizada."
        ),
        "caracteristicas": "Uso estrategico de Big Data, BI avanzado, IA predictiva e infraestructura resiliente.",
        "interpretacion_itil": "Practicas consolidadas y estrategicas, alineadas al Service Value System.",
    },
    {
        "valor": 5,
        "nombre": "Innovador",
        "etiqueta": "Transformador",
        "descripcion": (
            "La empresa utiliza la tecnologia como motor de innovacion y diferenciacion. Aparece la co-creacion "
            "de valor, la disrupcion de modelos de negocio y la innovacion continua."
        ),
        "caracteristicas": "Transformacion del negocio con tecnologia disruptiva e innovacion continua.",
        "interpretacion_itil": "Practicas transformadoras e innovacion continua, foco en creacion de valor.",
    },
]
