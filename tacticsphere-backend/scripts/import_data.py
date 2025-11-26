"""
Script para importar datos desde JSON a la base de datos.
Úsalo para migrar datos desde el archivo exportado a producción.
"""
import json
import sys
import io
from pathlib import Path
from datetime import datetime

# Configurar encoding para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Agregar el directorio raíz al path
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

from sqlalchemy import select
from app.database import SessionLocal
from app.models import (
    Usuario, Empresa, Departamento, Empleado,
    Pilar, Pregunta, Cuestionario, CuestionarioPregunta,
    Asignacion, Respuesta, ConsultingLead, PasswordChangeRequest, AuditLog
)

# Mapeo de nombres de modelos a clases
MODEL_MAP = {
    "Usuario": Usuario,
    "Empresa": Empresa,
    "Departamento": Departamento,
    "Empleado": Empleado,
    "Pilar": Pilar,
    "Pregunta": Pregunta,
    "Cuestionario": Cuestionario,
    "CuestionarioPregunta": CuestionarioPregunta,
    "Asignacion": Asignacion,
    "Respuesta": Respuesta,
    "ConsultingLead": ConsultingLead,
    "PasswordChangeRequest": PasswordChangeRequest,
    "AuditLog": AuditLog,
}

def import_model_data(db, model_class, records_data, skip_existing=True):
    """Importa registros de un modelo desde datos JSON."""
    model_name = model_class.__name__
    imported = 0
    skipped = 0
    errors = 0
    
    if model_name not in records_data:
        return imported, skipped, errors
    
    for record_data in records_data[model_name]:
        try:
            # Verificar si ya existe (por ID)
            if skip_existing and "id" in record_data:
                existing = db.get(model_class, record_data["id"])
                if existing:
                    skipped += 1
                    continue
            
            # Crear nuevo registro
            # Convertir strings ISO de vuelta a datetime si es necesario
            for key, value in record_data.items():
                if isinstance(value, str) and "T" in value and ":" in value:
                    try:
                        record_data[key] = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except:
                        pass
            
            # Remover ID para que la BD asigne uno nuevo (o mantenerlo si skip_existing=False)
            if skip_existing:
                record_data.pop("id", None)
            
            new_record = model_class(**record_data)
            db.add(new_record)
            imported += 1
            
        except Exception as e:
            print(f"  [ERROR] Error importando registro de {model_name}: {e}")
            errors += 1
            db.rollback()
            continue
    
    try:
        db.commit()
        print(f"[OK] {model_name}: {imported} importados, {skipped} omitidos, {errors} errores")
    except Exception as e:
        print(f"[ERROR] Error guardando {model_name}: {e}")
        db.rollback()
        errors += imported
        imported = 0
    
    return imported, skipped, errors

def main():
    """Importa datos desde el archivo JSON exportado."""
    import_file = BACKEND_ROOT / "data_export.json"
    
    if not import_file.exists():
        print(f"[ERROR] No se encontro el archivo {import_file}")
        print("        Primero ejecuta export_data.py para crear el archivo de exportacion.")
        return
    
    db = SessionLocal()
    
    try:
        print("Cargando datos desde archivo JSON...")
        with open(import_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        if "tables" not in data:
            print("[ERROR] El archivo JSON no tiene el formato correcto.")
            return
        
        print(f"[OK] Archivo cargado (exportado el: {data.get('export_date', 'fecha desconocida')})")
        print("=" * 50)
        print("Iniciando importacion de datos...")
        print("[ADVERTENCIA] Esto agregara datos a la base de datos actual.")
        print("=" * 50)
        
        total_imported = 0
        total_skipped = 0
        total_errors = 0
        
        # Importar en orden de dependencias
        import_order = [
            "Usuario",
            "Empresa",
            "Departamento",
            "Empleado",
            "Pilar",
            "Pregunta",
            "Cuestionario",
            "CuestionarioPregunta",
            "Asignacion",
            "Respuesta",
            "ConsultingLead",
            "PasswordChangeRequest",
            "AuditLog",
        ]
        
        for model_name in import_order:
            if model_name in MODEL_MAP:
                model_class = MODEL_MAP[model_name]
                imported, skipped, errors = import_model_data(
                    db, model_class, data["tables"]
                )
                total_imported += imported
                total_skipped += skipped
                total_errors += errors
        
        print("=" * 50)
        print(f"[OK] Importacion completada:")
        print(f"  - {total_imported} registros importados")
        print(f"  - {total_skipped} registros omitidos (ya existian)")
        print(f"  - {total_errors} errores")
        
    except Exception as e:
        print(f"[ERROR] Error durante la importacion: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

