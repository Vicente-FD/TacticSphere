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

# Importar modelos para verificación
from app.models import Empleado as EmpleadoModel, Departamento as DepartamentoModel

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

def import_model_data(db, model_class, records_data, id_mapping=None, skip_existing=True):
    """Importa registros de un modelo desde datos JSON.
    
    Args:
        id_mapping: Diccionario para mapear IDs viejos a nuevos {model_name: {old_id: new_id}}
    """
    model_name = model_class.__name__
    imported = 0
    skipped = 0
    errors = 0
    
    if model_name not in records_data:
        return imported, skipped, errors, {}
    
    if id_mapping is None:
        id_mapping = {}
    if model_name not in id_mapping:
        id_mapping[model_name] = {}
    
    new_id_mapping = {}
    
    for record_data in records_data[model_name]:
        try:
            old_id = record_data.get("id")
            
            # Verificar si ya existe (por ID o por campos únicos)
            if skip_existing:
                if old_id is not None:
                    existing = db.get(model_class, old_id)
                    if existing:
                        skipped += 1
                        new_id_mapping[old_id] = old_id  # Mantener el mismo ID
                        continue
                
                # También verificar por campos únicos (email para usuarios, nombre+empresa para departamentos)
                if model_name == "Usuario" and "email" in record_data:
                    existing = db.scalar(
                        select(model_class).where(model_class.email == record_data["email"])
                    )
                    if existing:
                        skipped += 1
                        if old_id is not None:
                            new_id_mapping[old_id] = existing.id
                        continue
                elif model_name == "Departamento" and "nombre" in record_data and "empresa_id" in record_data:
                    # Mapear empresa_id si es necesario
                    empresa_id = record_data["empresa_id"]
                    if "Empresa" in id_mapping and empresa_id in id_mapping["Empresa"]:
                        empresa_id = id_mapping["Empresa"][empresa_id]
                    # Buscar por nombre y empresa_id
                    existing = db.scalar(
                        select(model_class).where(
                            model_class.nombre == record_data["nombre"],
                            model_class.empresa_id == empresa_id
                        )
                    )
                    if existing:
                        skipped += 1
                        if old_id is not None:
                            new_id_mapping[old_id] = existing.id
                        continue
                    # Si no existe, también verificar por ID original (puede que el ID haya cambiado)
                    if old_id is not None:
                        existing_by_id = db.get(model_class, old_id)
                        if existing_by_id:
                            skipped += 1
                            new_id_mapping[old_id] = existing_by_id.id
                            continue
                elif model_name == "CuestionarioPregunta" and "cuestionario_id" in record_data and "pregunta_id" in record_data:
                    # Mapear IDs si es necesario
                    cuestionario_id = record_data["cuestionario_id"]
                    pregunta_id = record_data["pregunta_id"]
                    if "Cuestionario" in id_mapping and cuestionario_id in id_mapping["Cuestionario"]:
                        cuestionario_id = id_mapping["Cuestionario"][cuestionario_id]
                    if "Pregunta" in id_mapping and pregunta_id in id_mapping["Pregunta"]:
                        pregunta_id = id_mapping["Pregunta"][pregunta_id]
                    # Verificar que ambos existan
                    cuestionario_exists = db.scalar(select(Cuestionario).where(Cuestionario.id == cuestionario_id))
                    pregunta_exists = db.scalar(select(Pregunta).where(Pregunta.id == pregunta_id))
                    if not cuestionario_exists or not pregunta_exists:
                        skipped += 1  # Omitir si no existen las referencias
                        continue
                    # Verificar duplicado
                    existing = db.scalar(
                        select(model_class).where(
                            model_class.cuestionario_id == cuestionario_id,
                            model_class.pregunta_id == pregunta_id
                        )
                    )
                    if existing:
                        skipped += 1
                        if old_id is not None:
                            new_id_mapping[old_id] = existing.id
                        continue
            
            # Crear nuevo registro
            # Convertir strings ISO de vuelta a datetime si es necesario
            record_dict = record_data.copy()
            for key, value in record_dict.items():
                if isinstance(value, str) and "T" in value and ":" in value:
                    try:
                        record_dict[key] = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except:
                        pass
            
            # Actualizar referencias de claves foráneas usando el mapeo
            # Buscar campos que puedan ser claves foráneas (terminan en _id)
            skip_record = False
            for key, value in list(record_dict.items()):
                if key.endswith("_id") and value is not None:
                    # Buscar en los mapeos de otros modelos
                    found = False
                    for other_model, mapping in id_mapping.items():
                        if value in mapping:
                            record_dict[key] = mapping[value]
                            found = True
                            break
                    # Si no se encontró el mapeo, verificar si la referencia existe
                    if not found and value is not None:
                        # Para Empleado, verificar que departamento_id exista
                        if model_name == "Empleado" and key == "departamento_id":
                            # Primero verificar si hay mapeo de departamentos
                            mapped_dept_id = value
                            if "Departamento" in id_mapping and value in id_mapping["Departamento"]:
                                mapped_dept_id = id_mapping["Departamento"][value]
                                record_dict[key] = mapped_dept_id
                                found = True
                            else:
                                # Buscar el departamento por ID
                                dept_exists = db.scalar(select(Departamento).where(Departamento.id == value))
                                if not dept_exists:
                                    # Si el departamento no existe, establecer departamento_id a None
                                    record_dict[key] = None
                                    found = True
                        # Para Respuesta, verificar que empleado_id exista (es opcional)
                        elif model_name == "Respuesta" and key == "empleado_id":
                            # Primero verificar si hay mapeo de empleados
                            mapped_emp_id = value
                            if "Empleado" in id_mapping and value in id_mapping["Empleado"]:
                                mapped_emp_id = id_mapping["Empleado"][value]
                                record_dict[key] = mapped_emp_id
                                found = True
                            else:
                                # Buscar el empleado por ID
                                emp_exists = db.scalar(select(Empleado).where(Empleado.id == value))
                                if not emp_exists:
                                    # Si el empleado no existe, establecer empleado_id a None (es opcional)
                                    record_dict[key] = None
                                    found = True
                        # Para CuestionarioPregunta, verificar que pregunta_id y cuestionario_id existan
                        elif model_name == "CuestionarioPregunta":
                            if key == "pregunta_id":
                                pregunta_exists = db.scalar(select(Pregunta).where(Pregunta.id == value))
                                if not pregunta_exists:
                                    skip_record = True
                                    break
                            elif key == "cuestionario_id":
                                cuestionario_exists = db.scalar(select(Cuestionario).where(Cuestionario.id == value))
                                if not cuestionario_exists:
                                    skip_record = True
                                    break
            
            if skip_record:
                errors += 1
                continue
            
            # Remover ID para que la BD asigne uno nuevo
            record_dict.pop("id", None)
            
            new_record = model_class(**record_dict)
            db.add(new_record)
            db.flush()  # Para obtener el nuevo ID asignado
            
            # Guardar el mapeo de ID viejo a nuevo
            if old_id is not None:
                new_id_mapping[old_id] = new_record.id
            
            imported += 1
            
        except Exception as e:
            print(f"  [ERROR] Error importando registro de {model_name}: {str(e)[:200]}")
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
        new_id_mapping = {}
    
    return imported, skipped, errors, new_id_mapping

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
        
        # Mapeo de IDs viejos a nuevos para mantener relaciones
        id_mapping = {}
        
        # Importar en orden de dependencias (importante: Empresa primero, luego Usuario)
        import_order = [
            "Empresa",      # Primero empresas (sin dependencias)
            "Usuario",      # Luego usuarios (dependen de empresas)
            "Departamento", # Departamentos (dependen de empresas)
            "Pilar",        # Pilares (pueden depender de empresas)
            "Pregunta",     # Preguntas (dependen de pilares)
            "Cuestionario", # Cuestionarios (dependen de empresas)
            "CuestionarioPregunta", # Relación cuestionario-pregunta
            "Empleado",     # Empleados (dependen de empresas y departamentos)
            "Asignacion",   # Asignaciones (dependen de empresas y cuestionarios)
            "Respuesta",    # Respuestas (dependen de asignaciones, preguntas, empleados)
            "ConsultingLead",
            "PasswordChangeRequest", # Depende de usuarios
            "AuditLog",     # Depende de usuarios y empresas
        ]
        
        for model_name in import_order:
            if model_name in MODEL_MAP:
                model_class = MODEL_MAP[model_name]
                imported, skipped, errors, new_mapping = import_model_data(
                    db, model_class, data["tables"], id_mapping
                )
                # Actualizar el mapeo con los nuevos IDs
                if new_mapping:
                    id_mapping[model_name] = new_mapping
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

