"""
Script para poblar la base de datos con empresas de ejemplo como NovaTech, etc.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import io

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from sqlalchemy import select

# Ensure project root is on sys.path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from app.database import SessionLocal
from app.auth import hash_password
from app.models import (
    Empresa, Departamento, Empleado,
    Usuario, RolEnum,
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
        print("🌱 Poblando base de datos con empresas de ejemplo...")
        
        # ---- Usuario Admin Sistema (si no existe) ----
        admin_sistema, _ = get_or_create(
            db, Usuario,
            email="admin@tacticsphere.com",
            defaults=dict(
                nombre="Admin Sistema",
                password_hash=hash_password("Admin123456!"),
                rol=RolEnum.ADMIN_SISTEMA,
                empresa_id=None,
                activo=True
            )
        )
        print(f"   ✓ Usuario Admin Sistema: {admin_sistema.email}")
        
        # ---- Empresas de ejemplo ----
        empresas_data = [
            {
                "nombre": "NovaTech Solutions",
                "rut": "76.123.456-7",
                "giro": "Tecnología y Consultoría",
                "departamentos": [
                    "Tecnología", "Logística", "Ventas", "RRHH", "Innovación"
                ],
                "usuarios": [
                    {
                        "nombre": "Admin NovaTech",
                        "email": "admin@novatech.com",
                        "rol": RolEnum.ADMIN,
                        "password": "Admin123456!"
                    },
                    {
                        "nombre": "Analista NovaTech",
                        "email": "analista@novatech.com",
                        "rol": RolEnum.ANALISTA,
                        "password": "Analista123!"
                    }
                ]
            },
            {
                "nombre": "TechCorp Industries",
                "rut": "77.234.567-8",
                "giro": "Manufactura Tecnológica",
                "departamentos": [
                    "Producción", "Finanzas", "Atención al Cliente", "Data Office", "Marketing"
                ],
                "usuarios": [
                    {
                        "nombre": "Admin TechCorp",
                        "email": "admin@techcorp.com",
                        "rol": RolEnum.ADMIN,
                        "password": "Admin123456!"
                    }
                ]
            },
            {
                "nombre": "CloudSystems S.A.",
                "rut": "78.345.678-9",
                "giro": "Servicios Cloud",
                "departamentos": [
                    "Infraestructura", "DevOps", "Administración", "Calidad", "E-Commerce"
                ],
                "usuarios": [
                    {
                        "nombre": "Admin CloudSystems",
                        "email": "admin@cloudsystems.com",
                        "rol": RolEnum.ADMIN,
                        "password": "Admin123456!"
                    }
                ]
            },
            {
                "nombre": "DataFlow Enterprises",
                "rut": "79.456.789-0",
                "giro": "Análisis de Datos",
                "departamentos": [
                    "Seguridad", "Operaciones Industriales", "BI & Analytics", "Proyectos", "Research"
                ],
                "usuarios": [
                    {
                        "nombre": "Admin DataFlow",
                        "email": "admin@dataflow.com",
                        "rol": RolEnum.ADMIN,
                        "password": "Admin123456!"
                    }
                ]
            },
            {
                "nombre": "InnovateLab",
                "rut": "80.567.890-1",
                "giro": "Innovación y Desarrollo",
                "departamentos": [
                    "Finanzas", "Recursos Humanos", "Operaciones", "TI"
                ],
                "usuarios": [
                    {
                        "nombre": "Admin InnovateLab",
                        "email": "admin@innovatelab.com",
                        "rol": RolEnum.ADMIN,
                        "password": "Admin123456!"
                    }
                ]
            }
        ]
        
        empresas_creadas = []
        
        for emp_data in empresas_data:
            empresa, created = get_or_create(
                db, Empresa,
                nombre=emp_data["nombre"],
                defaults=dict(
                    rut=emp_data["rut"],
                    giro=emp_data["giro"],
                    activa=True
                )
            )
            
            if created:
                empresas_creadas.append(empresa.nombre)
                print(f"   ✓ Empresa creada: {empresa.nombre}")
            else:
                print(f"   ⊙ Empresa ya existe: {empresa.nombre}")
            
            # Crear departamentos
            for dept_name in emp_data["departamentos"]:
                dept, _ = get_or_create(
                    db, Departamento,
                    nombre=dept_name,
                    empresa_id=empresa.id
                )
            
            # Crear usuarios
            for user_data in emp_data["usuarios"]:
                user, _ = get_or_create(
                    db, Usuario,
                    email=user_data["email"],
                    defaults=dict(
                        nombre=user_data["nombre"],
                        password_hash=hash_password(user_data["password"]),
                        rol=user_data["rol"],
                        empresa_id=empresa.id,
                        activo=True
                    )
                )
                if user_data["rol"] == RolEnum.ADMIN:
                    print(f"      → Admin: {user.email} / {user_data['password']}")
        
        db.commit()
        
        print("\n✅ Seed de empresas completado.")
        print(f"   Total empresas: {len(empresas_data)}")
        print(f"   Empresas nuevas: {len(empresas_creadas)}")
        print("\n📋 Credenciales de acceso:")
        print("   - ADMIN_SISTEMA: admin@tacticsphere.com / Admin123456!")
        for emp_data in empresas_data:
            for user_data in emp_data["usuarios"]:
                if user_data["rol"] == RolEnum.ADMIN:
                    print(f"   - {emp_data['nombre']}: {user_data['email']} / {user_data['password']}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()

