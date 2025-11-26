"""
Script para exportar datos de la base de datos local a JSON.
Esto permite migrar datos desde SQLite local a producción.
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

def export_model_data(db, model_class, output_data):
    """Exporta todos los registros de un modelo a un diccionario."""
    try:
        records = db.scalars(select(model_class)).all()
        model_name = model_class.__name__
        output_data[model_name] = []
        
        for record in records:
            # Convertir el objeto a diccionario
            record_dict = {}
            for column in model_class.__table__.columns:
                value = getattr(record, column.name)
                # Convertir datetime a string ISO
                if isinstance(value, datetime):
                    value = value.isoformat()
                record_dict[column.name] = value
            output_data[model_name].append(record_dict)
        
        print(f"[OK] Exportados {len(output_data[model_name])} registros de {model_name}")
        return len(output_data[model_name])
    except Exception as e:
        print(f"[ERROR] Error exportando {model_class.__name__}: {e}")
        return 0

def main():
    """Exporta todos los datos de la base de datos local."""
    db = SessionLocal()
    output_data = {
        "export_date": datetime.now().isoformat(),
        "tables": {}
    }
    
    try:
        print("Iniciando exportación de datos...")
        print("=" * 50)
        
        # Exportar cada modelo
        models_to_export = [
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
            PasswordChangeRequest,
            AuditLog,
        ]
        
        total_records = 0
        for model in models_to_export:
            count = export_model_data(db, model, output_data["tables"])
            total_records += count
        
        # Guardar a archivo JSON
        output_file = BACKEND_ROOT / "data_export.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print("=" * 50)
        print(f"[OK] Exportacion completada: {total_records} registros totales")
        print(f"[OK] Archivo guardado en: {output_file}")
        print("\n[IMPORTANTE] Este archivo contiene datos sensibles.")
        print("            No lo subas a Git. Usalo solo para migrar datos.")
        
    except Exception as e:
        print(f"[ERROR] Error durante la exportacion: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()

