# 🔄 Migración de Dominio: tacticsphere.cl

## ✅ Cambios Realizados en el Código

### 1. Backend - CORS Actualizado ✅

**Archivo:** `tacticsphere-backend/app/main.py`

Se agregaron los siguientes orígenes a la lista de CORS permitidos:
- `https://tacticsphere.cl`
- `https://www.tacticsphere.cl`

**Antes:**
```python
allowed_origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://tacticsphere-prod.web.app",
    "https://tacticsphere-prod.firebaseapp.com",
]
```

**Después:**
```python
allowed_origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    "https://tacticsphere-prod.web.app",
    "https://tacticsphere-prod.firebaseapp.com",
    "https://tacticsphere.cl",
    "https://www.tacticsphere.cl",
]
```

### 2. Frontend - Configuración Verificada ✅

**Archivos verificados:**
- `tacticsphere-frontend/src/environments/environment.prod.ts` - ✅ Correcto
  - `apiUrl: 'https://tacticsphere-backend.onrender.com'` - ✅ Correcto
  - `authDomain: "tacticsphere-prod.firebaseapp.com"` - ✅ Correcto (Firebase usa su propio dominio)

**Nota:** El `authDomain` en Firebase debe seguir siendo `tacticsphere-prod.firebaseapp.com`. Firebase maneja la autenticación a través de su propio dominio, pero necesita autorizar `tacticsphere.cl` como dominio permitido en la consola.

---

## ⚠️ ACCIÓN REQUERIDA: Actualizar Firebase Console

### Paso 1: Agregar Dominios Autorizados en Firebase Authentication

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto `tacticsphere-prod`
3. Ve a **Authentication** → **Settings** → **Authorized domains**
4. Haz clic en **Add domain**
5. Agrega los siguientes dominios:
   - `tacticsphere.cl`
   - `www.tacticsphere.cl`

**Importante:** Sin estos dominios autorizados, Firebase Auth bloqueará los intentos de inicio de sesión desde `tacticsphere.cl`.

### Paso 2: Verificar Firebase Hosting

1. En Firebase Console, ve a **Hosting**
2. Verifica que el dominio personalizado `tacticsphere.cl` esté correctamente configurado
3. Asegúrate de que los registros DNS estén correctos:
   - **A** → `199.36.158.100`
   - **TXT** → `hosting-site=tacticsphere-prod`

---

## 🔍 Verificación Post-Migración

### Checklist de Verificación

- [ ] Backend desplegado con CORS actualizado
- [ ] Dominios agregados en Firebase Authentication → Authorized domains
- [ ] DNS configurado correctamente en Cloudflare
- [ ] SSL/TLS funcionando en `https://tacticsphere.cl`
- [ ] Login funciona desde `https://tacticsphere.cl`
- [ ] API responde correctamente desde el nuevo dominio
- [ ] No hay errores de CORS en la consola del navegador

### Comandos para Verificar

```bash
# Verificar que el backend responde
curl https://tacticsphere-backend.onrender.com/ping

# Verificar CORS (desde el navegador, abrir consola y verificar que no hay errores)
# Intentar hacer login desde https://tacticsphere.cl
```

---

## 🐛 Solución de Problemas

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solución:** Verifica que el backend esté desplegado con los cambios de CORS y que el origen exacto esté en la lista (incluyendo `www.` si aplica).

### Error: "Firebase Auth: Domain not authorized"
**Solución:** Agrega `tacticsphere.cl` y `www.tacticsphere.cl` en Firebase Console → Authentication → Settings → Authorized domains.

### Error: "Failed to fetch" o "Network error"
**Solución:** 
1. Verifica que la URL del backend sea correcta: `https://tacticsphere-backend.onrender.com`
2. Verifica que Cloudflare no esté bloqueando las peticiones
3. Verifica que el proxy de Cloudflare esté desactivado (DNS only) para el subdominio de la API si existe

### Error: "401 Unauthorized" o "403 Forbidden"
**Solución:**
1. Verifica que el token se esté enviando correctamente
2. Verifica que el backend esté recibiendo las peticiones
3. Revisa los logs del backend para ver el error específico

---

## 📝 Notas Técnicas

- **Firebase Auth Domain:** Se mantiene como `tacticsphere-prod.firebaseapp.com` porque Firebase maneja la autenticación a través de su propio dominio. Los dominios personalizados solo necesitan estar autorizados en Firebase Console.

- **API URL:** Se mantiene como `https://tacticsphere-backend.onrender.com` porque el backend está desplegado en Render, no en Firebase.

- **CORS:** El backend ahora acepta peticiones desde ambos dominios (con y sin `www.`) para mayor flexibilidad.

---

## 🚀 Próximos Pasos

1. **Desplegar el backend** con los cambios de CORS
2. **Actualizar Firebase Console** con los dominios autorizados
3. **Probar el login** desde `https://tacticsphere.cl`
4. **Monitorear logs** del backend para detectar cualquier problema

---

**Última actualización:** 2025-11-26
**Estado:** ✅ Código actualizado, ⚠️ Pendiente actualización en Firebase Console

