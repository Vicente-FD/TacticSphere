"""
Script para agregar empleados y respuestas a las empresas existentes.
También actualiza las preguntas con respuestas esperadas.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import io
import random
from typing import List, Dict

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
from app.models import (
    Empresa, Departamento, Empleado, Pregunta, Asignacion, Respuesta, CuestionarioPregunta
)

# Importar respuestas esperadas del script seed_madurez
from scripts.seed_madurez import RESPUESTAS_ESPERADAS

# Nombres y apellidos para generar empleados
NOMBRES = [
    "Juan", "María", "Carlos", "Ana", "Luis", "Laura", "Pedro", "Carmen",
    "Diego", "Patricia", "Roberto", "Claudia", "Fernando", "Marcela", "Miguel",
    "Sofía", "Ricardo", "Valentina", "Andrés", "Camila", "Francisco", "Isabella",
    "Sebastián", "Javiera", "Nicolás", "Catalina", "Matías", "Francisca", "Javier", "Daniela"
]

APELLIDOS = [
    "González", "Rodríguez", "Martínez", "López", "Sánchez", "Ramírez", "Torres",
    "Flores", "Rivera", "Morales", "Ortiz", "Gutiérrez", "Castillo", "Díaz", "Vargas",
    "Castro", "Romero", "Soto", "Navarro", "Cruz", "Medina", "Herrera", "Jiménez",
    "Moreno", "Álvarez", "Mendoza", "Silva", "Rojas", "Pérez", "Fernández"
]

CARGOS = [
    "Analista", "Desarrollador", "Gerente", "Coordinador", "Especialista",
    "Consultor", "Arquitecto", "Líder Técnico", "Product Owner", "Scrum Master"
]

def generar_rut_chileno(numero: int) -> str:
    """Genera un RUT chileno válido."""
    rut = str(numero)
    suma = 0
    multiplicador = 2
    
    for i in range(len(rut) - 1, -1, -1):
        suma += int(rut[i]) * multiplicador
        multiplicador = multiplicador + 1 if multiplicador < 7 else 2
    
    resto = suma % 11
    dv = 11 - resto
    if dv == 11:
        dv = 0
    elif dv == 10:
        dv = 'K'
    
    return f"{rut}-{dv}"

def normalizar_texto(texto: str) -> str:
    """Normaliza texto para comparación (sin acentos, minúsculas, sin signos)."""
    import unicodedata
    # Normalizar y remover acentos
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    # Minúsculas y remover signos de interrogación
    texto = texto.lower().replace('¿', '').replace('?', '').strip()
    return texto

def actualizar_respuestas_esperadas(db):
    """Actualiza las preguntas existentes con respuestas esperadas."""
    print("\n📝 Actualizando respuestas esperadas en preguntas...")
    
    preguntas = db.scalars(select(Pregunta)).all()
    actualizadas = 0
    
    # Crear diccionario normalizado de respuestas esperadas
    respuestas_normalizadas = {
        normalizar_texto(key): RESPUESTAS_ESPERADAS[key]
        for key in RESPUESTAS_ESPERADAS.keys()
    }
    
    for pregunta in preguntas:
        # Normalizar el enunciado de la pregunta
        enunciado_normalizado = normalizar_texto(pregunta.enunciado)
        
        # Buscar coincidencia
        respuesta_esperada = None
        for key_normalizado, respuesta in respuestas_normalizadas.items():
            # Coincidencia exacta normalizada
            if enunciado_normalizado == key_normalizado:
                respuesta_esperada = respuesta
                break
            # Coincidencia parcial (al menos 80% de palabras coinciden)
            palabras_pregunta = set(enunciado_normalizado.split())
            palabras_key = set(key_normalizado.split())
            if len(palabras_pregunta) > 0 and len(palabras_key) > 0:
                coincidencia = len(palabras_pregunta & palabras_key) / max(len(palabras_pregunta), len(palabras_key))
                if coincidencia >= 0.7:  # 70% de coincidencia
                    respuesta_esperada = respuesta
                    break
        
        if respuesta_esperada:
            # Truncar si excede 1000 caracteres
            if len(respuesta_esperada) > 1000:
                respuesta_esperada = respuesta_esperada[:997] + "..."
            
            pregunta.respuesta_esperada = respuesta_esperada
            actualizadas += 1
    
    db.flush()
    print(f"   ✓ {actualizadas}/{len(preguntas)} preguntas actualizadas con respuestas esperadas")
    return actualizadas

def crear_empleados_para_empresa(db, empresa: Empresa, num_empleados: int = 20):
    """Crea empleados para una empresa."""
    # Obtener departamentos de la empresa
    departamentos = db.scalars(
        select(Departamento).where(Departamento.empresa_id == empresa.id)
    ).all()
    
    if not departamentos:
        print(f"   ⚠ {empresa.nombre}: No tiene departamentos, saltando empleados")
        return []
    
    empleados = []
    rut_base = 15000000 + empresa.id * 1000
    
    for i in range(num_empleados):
        nombre = NOMBRES[i % len(NOMBRES)]
        apellido1 = APELLIDOS[i % len(APELLIDOS)]
        apellido2 = APELLIDOS[(i * 2 + 1) % len(APELLIDOS)]
        departamento = departamentos[i % len(departamentos)]
        cargo = CARGOS[i % len(CARGOS)]
        rut = generar_rut_chileno(rut_base + i)
        email = f"{nombre.lower()}.{apellido1.lower()}.{i+1}@{empresa.nombre.lower().replace(' ', '').replace('.', '')}.com"
        
        empleado = Empleado(
            nombre=nombre,
            apellidos=f"{apellido1} {apellido2}",
            rut=rut,
            email=email,
            cargo=cargo,
            empresa_id=empresa.id,
            departamento_id=departamento.id
        )
        db.add(empleado)
        empleados.append(empleado)
    
    db.flush()
    print(f"   ✓ {empresa.nombre}: {len(empleados)} empleados creados")
    return empleados

def crear_respuestas_para_empleados(db, empresa: Empresa, empleados: List[Empleado]):
    """Crea respuestas para los empleados de una empresa."""
    # Obtener la asignación activa de la empresa
    asignacion = db.scalar(
        select(Asignacion).where(
            Asignacion.empresa_id == empresa.id,
            Asignacion.alcance_tipo == "EMPRESA"
        ).order_by(Asignacion.fecha_inicio.desc())
    )
    
    if not asignacion:
        print(f"   ⚠ {empresa.nombre}: No tiene asignación activa, saltando respuestas")
        return []
    
    # Obtener preguntas del cuestionario
    cuestionario_preguntas = db.scalars(
        select(CuestionarioPregunta).where(
            CuestionarioPregunta.cuestionario_id == asignacion.cuestionario_id
        ).order_by(CuestionarioPregunta.orden)
    ).all()
    
    if not cuestionario_preguntas:
        print(f"   ⚠ {empresa.nombre}: El cuestionario no tiene preguntas, saltando respuestas")
        return []
    
    respuestas = []
    fecha_base = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # Perfiles de rendimiento (distribución variada)
    perfiles = ["MUY_BAJO", "BAJO", "MEDIO", "ALTO", "MUY_ALTO"]
    pesos_perfiles = [0.1, 0.2, 0.4, 0.2, 0.1]  # Más empleados en medio
    
    for empleado in empleados:
        # Asignar perfil aleatorio según pesos
        perfil = random.choices(perfiles, weights=pesos_perfiles)[0]
        
        # Generar respuestas según perfil
        for cp in cuestionario_preguntas:
            # Generar valor Likert (1-5) según perfil
            if perfil == "MUY_BAJO":
                valor = random.choices([1, 2], weights=[0.7, 0.3])[0]
            elif perfil == "BAJO":
                valor = random.choices([1, 2, 3], weights=[0.2, 0.5, 0.3])[0]
            elif perfil == "MEDIO":
                valor = random.choices([2, 3, 4], weights=[0.2, 0.5, 0.3])[0]
            elif perfil == "ALTO":
                valor = random.choices([3, 4, 5], weights=[0.2, 0.5, 0.3])[0]
            else:  # MUY_ALTO
                valor = random.choices([4, 5], weights=[0.3, 0.7])[0]
            
            # Agregar un poco de variación aleatoria
            if random.random() < 0.1:  # 10% de variación
                valor = max(1, min(5, valor + random.choice([-1, 1])))
            
            respuesta = Respuesta(
                asignacion_id=asignacion.id,
                pregunta_id=cp.pregunta_id,
                empleado_id=empleado.id,
                valor=str(valor),
                fecha_respuesta=fecha_base - timedelta(days=random.randint(0, 20))
            )
            db.add(respuesta)
            respuestas.append(respuesta)
    
    db.flush()
    print(f"   ✓ {empresa.nombre}: {len(respuestas)} respuestas creadas ({len(empleados)} empleados × {len(cuestionario_preguntas)} preguntas)")
    return respuestas

def main():
    db = SessionLocal()
    
    try:
        print("🌱 Agregando empleados y respuestas a empresas existentes...")
        print("=" * 70)
        
        # Paso 1: Actualizar respuestas esperadas
        actualizar_respuestas_esperadas(db)
        
        # Paso 2: Obtener todas las empresas
        empresas = db.scalars(select(Empresa)).all()
        
        if not empresas:
            print("\n⚠ No hay empresas en la base de datos.")
            return
        
        print(f"\n📊 Procesando {len(empresas)} empresas...")
        
        total_empleados = 0
        total_respuestas = 0
        
        # Paso 3: Para cada empresa, crear empleados y respuestas
        for empresa in empresas:
            print(f"\n🏢 {empresa.nombre}:")
            
            # Crear empleados (20 por empresa)
            empleados = crear_empleados_para_empresa(db, empresa, num_empleados=20)
            total_empleados += len(empleados)
            
            if empleados:
                # Crear respuestas para los empleados
                respuestas = crear_respuestas_para_empleados(db, empresa, empleados)
                total_respuestas += len(respuestas)
        
        # Commit final
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ Seed completado exitosamente")
        print("=" * 70)
        print(f"\n📊 Resumen:")
        print(f"   • Empresas procesadas: {len(empresas)}")
        print(f"   • Empleados creados: {total_empleados}")
        print(f"   • Respuestas creadas: {total_respuestas}")
        print(f"\n💡 Los dashboards ahora deberían mostrar datos de las empresas.")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error durante la ejecución: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()

