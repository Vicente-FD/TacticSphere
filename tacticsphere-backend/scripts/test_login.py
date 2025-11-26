"""
Script para probar el endpoint de login directamente.
"""
import requests
import json
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

# URL del backend
BACKEND_URL = "https://tacticsphere-backend.onrender.com"

def test_login(email: str, password: str):
    """Prueba el endpoint de login."""
    url = f"{BACKEND_URL}/auth/login"
    
    print(f"🔍 Probando login en: {url}")
    print(f"   Email: {email}")
    print(f"   Password: {'*' * len(password)}")
    
    try:
        response = requests.post(
            url,
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"\n📊 Respuesta:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Login exitoso!")
            print(f"   Token: {data.get('access_token', 'N/A')[:50]}...")
            return True
        else:
            print(f"   ❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Detalle: {error_data}")
            except:
                print(f"   Respuesta: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error de conexión: {e}")
        return False

if __name__ == "__main__":
    # Probar con el usuario admin
    test_login("admin@tacticsphere.com", "Admin123456!")
    
    print("\n" + "="*50)
    print("Prueba completada. Revisa los logs del backend en Render.")
    print("="*50)

