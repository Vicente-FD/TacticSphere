"""
Script para vaciar completamente la base de datos PostgreSQL.
Elimina todos los datos pero mantiene la estructura de tablas.
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

from sqlalchemy import text
from app.database import SessionLocal, engine
from app import models  # Importa todos los modelos para que las tablas estén registradas

def clear_database():
    """Elimina todos los datos de la base de datos manteniendo la estructura."""
    db = SessionLocal()
    try:
        print("🗑️  Vacando base de datos...")
        
        # Obtener todas las tablas
        metadata = models.Base.metadata
        table_names = [table.name for table in metadata.tables.values()]
        
        print(f"   Eliminando datos de {len(table_names)} tablas...")
        
        if engine.url.drivername.startswith('postgresql'):
            # Para PostgreSQL, usar TRUNCATE con CASCADE que maneja las dependencias automáticamente
            # Hacer tabla por tabla para evitar problemas de permisos
            for table_name in table_names:
                try:
                    db.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE;'))
                    print(f"   ✓ {table_name}")
                except Exception as e:
                    # Si falla, hacer rollback y continuar con la siguiente
                    db.rollback()
                    print(f"   ⚠ {table_name}: {str(e)[:100]}")
                    # Continuar con la siguiente tabla
        else:
            # Para SQLite, eliminar en orden de dependencias
            # Orden aproximado: primero tablas dependientes
            ordered_tables = [
                'respuestas', 'cuestionario_pregunta', 'asignaciones', 'cuestionarios',
                'preguntas', 'pilares', 'empleados', 'departamentos', 'empresas',
                'usuarios', 'consulting_leads', 'password_change_requests', 'audit_logs'
            ]
            # Agregar tablas que no estén en la lista
            for table_name in table_names:
                if table_name not in ordered_tables:
                    ordered_tables.append(table_name)
            
            for table_name in ordered_tables:
                if table_name in table_names:
                    try:
                        db.execute(text(f'DELETE FROM "{table_name}";'))
                        print(f"   ✓ {table_name}")
                    except Exception as e:
                        print(f"   ⚠ {table_name}: {str(e)[:100]}")
        
        db.commit()
        print("✅ Base de datos vaciada correctamente.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al vaciar la base de datos: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clear_database()

