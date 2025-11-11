from datetime import datetime, timedelta, timezone

from sqlalchemy import select



from app.database import SessionLocal

from app.auth import hash_password

from app.models import (

    Empresa, Departamento, Empleado,

    Usuario, RolEnum,

    Pilar, Pregunta, TipoPreguntaEnum,

    Cuestionario, CuestionarioPregunta,

    Asignacion

)



def get_or_create(session, model, defaults=None, **kwargs):

    """Helper simple para evitar duplicados en el seed."""

    q = session.scalars(select(model).filter_by(**kwargs)).first()

    if q:

        return q, False

    params = dict(kwargs)

    if defaults:

        params.update(defaults)

    obj = model(**params)

    session.add(obj)

    session.flush()

    return obj, True



def main():

    db = SessionLocal()

    try:

        # ---- Empresa DEMO ----

        empresa, created = get_or_create(

            db, Empresa,

            nombre="Demo Corp",

            defaults=dict(rut="76.123.456-7", giro="Servicios TI", activa=True)

        )



        # ---- Departamentos ----

        for dep_name in ["TI", "Ventas"]:

            get_or_create(db, Departamento, nombre=dep_name, empresa_id=empresa.id)



        # ---- Empleado de ejemplo ----
        dep_ti = db.scalars(select(Departamento).where(
            (Departamento.empresa_id == empresa.id) & (Departamento.nombre == "TI"))
        ).first()
        get_or_create(
            db, Empleado,
            nombre="Juan",
            apellidos="Perez",
            defaults=dict(email="juan.perez@demo.com", cargo="Analista", rut="11.222.333-4"),
            empresa_id=empresa.id,
            departamento_id=dep_ti.id if dep_ti else None
        )

        # ---- Usuarios (login) ----

        users = [

            dict(nombre="Admin Sistema", email="admin@tacticsphere.com", rol=RolEnum.ADMIN_SISTEMA, empresa_id=None, password="Admin123456!"),

            dict(nombre="Admin Empresa", email="empresa.admin@demo.com", rol=RolEnum.ADMIN, empresa_id=empresa.id, password="Demo12345!"),

            dict(nombre="Analista", email="analista@demo.com", rol=RolEnum.ANALISTA, empresa_id=empresa.id, password="Demo12345!"),

            dict(nombre="Usuario", email="usuario@demo.com", rol=RolEnum.USUARIO, empresa_id=empresa.id, password="Demo12345!"),

        ]

        for u in users:

            existing = db.scalars(select(Usuario).where(Usuario.email == u["email"])).first()

            if not existing:

                db.add(Usuario(

                    nombre=u["nombre"],

                    email=u["email"],

                    password_hash=hash_password(u["password"]),

                    rol=u["rol"],

                    empresa_id=u["empresa_id"],

                    activo=True

                ))



        db.flush()



        # ---- Pilares ----

        pilares_data = [

            dict(nombre="Estrategia", descripcion="Dirección y objetivos", peso=1),

            dict(nombre="Tecnología", descripcion="Infraestructura, software y datos", peso=1),

            dict(nombre="Procesos", descripcion="Estandarización y mejora continua", peso=1),

        ]

        pilares = []

        for p in pilares_data:

            obj, _ = get_or_create(

                db, Pilar, empresa_id=None, nombre=p["nombre"],

                defaults=dict(descripcion=p["descripcion"], peso=p["peso"])

            )

            pilares.append(obj)



        # ---- Preguntas (tipo Likert 1..5) ----

        preguntas_map = {}

        preguntas_def = {

            "Estrategia": [

                "La empresa tiene una visión digital clara y compartida.",

                "Existen KPI que miden avances de la transformación.",

            ],

            "Tecnología": [

                "La infraestructura soporta las necesidades actuales y futuras.",

                "Contamos con políticas de seguridad y respaldo efectivas.",

            ],

            "Procesos": [

                "Los procesos clave están documentados y estandarizados.",

                "Existe mejora continua basada en datos.",

            ],

        }

        for pilar in pilares:

            for enun in preguntas_def.get(pilar.nombre, []):

                q, _ = get_or_create(

                    db, Pregunta,

                    pilar_id=pilar.id, enunciado=enun,

                    defaults=dict(tipo=TipoPreguntaEnum.LIKERT, es_obligatoria=True, peso=1)

                )

                preguntas_map.setdefault(pilar.nombre, []).append(q)



        # ---- Cuestionario v1 ----

        cuesti, _ = get_or_create(

            db, Cuestionario,

            empresa_id=empresa.id, titulo="Diagnóstico Base", version=1,

            defaults=dict(estado="PUBLICADO")

        )

        # Asociar preguntas si aún no están asociadas

        ya = {(cp.pregunta_id) for cp in db.scalars(

            select(CuestionarioPregunta).where(CuestionarioPregunta.cuestionario_id == cuesti.id)

        ).all()}

        orden = 1

        for lst in preguntas_map.values():

            for q in lst:

                if q.id not in ya:

                    db.add(CuestionarioPregunta(cuestionario_id=cuesti.id, pregunta_id=q.id, orden=orden))

                    orden += 1



        # ---- Asignación del cuestionario (EMPRESA completa) ----

        ahora = datetime.now(timezone.utc)

        asignacion, _ = get_or_create(

            db, Asignacion,

            empresa_id=empresa.id, cuestionario_id=cuesti.id, alcance_tipo="EMPRESA", alcance_id=None,

            defaults=dict(fecha_inicio=ahora, fecha_cierre=ahora + timedelta(days=14), anonimo=False)

        )



        db.commit()



        print("✅ Seed completado.")

        print("   Empresa:", empresa.nombre)

        print("   Usuarios para login:")

        print("   - ADMIN_SISTEMA: admin@tacticsphere.com / Admin123456!")

        print("   - ADMIN        : empresa.admin@demo.com / Demo12345!")

        print("   - ANALISTA     : analista@demo.com / Demo12345!")

        print("   - USUARIO      : usuario@demo.com / Demo12345!")



    except Exception as e:

        db.rollback()

        raise

    finally:

        db.close()



if __name__ == "__main__":

    main()

