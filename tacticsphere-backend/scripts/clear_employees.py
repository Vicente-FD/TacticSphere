"""
Script para eliminar solo empleados y sus respuestas de la base de datos.
Mantiene empresas, departamentos, usuarios, pilares, preguntas, etc.
"""
from pathlib import Path
import sys
import io

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Ensure project root is on sys.path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from sqlalchemy import select, func
from app.database import SessionLocal
from app.models import Empleado, Respuesta

def clear_employees():
    """Elimina todos los empleados y sus respuestas."""
    db = SessionLocal()
    try:
        print("🗑️  Eliminando empleados y respuestas...")
        
        # Contar antes de eliminar
        total_respuestas = db.scalar(select(func.count(Respuesta.id)))
        total_empleados = db.scalar(select(func.count(Empleado.id)))
        
        print(f"   Encontrados: {total_empleados} empleados, {total_respuestas} respuestas")
        
        # Eliminar respuestas primero (dependencia)
        respuestas_eliminadas = db.execute(select(Respuesta)).scalars().all()
        for respuesta in respuestas_eliminadas:
            db.delete(respuesta)
        
        db.flush()
        print(f"   ✓ {len(respuestas_eliminadas)} respuestas eliminadas")
        
        # Eliminar empleados
        empleados_eliminados = db.execute(select(Empleado)).scalars().all()
        for empleado in empleados_eliminados:
            db.delete(empleado)
        
        db.flush()
        print(f"   ✓ {len(empleados_eliminados)} empleados eliminados")
        
        db.commit()
        print("✅ Empleados y respuestas eliminados correctamente.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al eliminar empleados: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clear_employees()




