# Guía de Configuración de tacticsphere.cl en Cloudflare

Esta guía te ayudará a configurar tu dominio `tacticsphere.cl` comprado en NIC Chile para que funcione con Cloudflare.

## Paso 1: Agregar el dominio en Cloudflare

1. Inicia sesión en tu cuenta de Cloudflare: https://dash.cloudflare.com
2. Haz clic en "Add a Site" (Agregar un sitio)
3. Ingresa `tacticsphere.cl` y haz clic en "Add site"
4. Cloudflare escaneará tus registros DNS actuales
5. Selecciona el plan (Free, Pro, Business, etc.) y continúa

## Paso 2: Obtener los Nameservers de Cloudflare

Después de agregar el dominio, Cloudflare te proporcionará dos nameservers únicos para tu dominio. Estos serán algo como:
- `dee.ns.cloudflare.com`
- `jermaine.ns.cloudflare.com`

**IMPORTANTE**: Anota estos nameservers exactamente como aparecen en tu panel de Cloudflare, ya que son únicos para tu cuenta.

## Paso 3: Configurar los Nameservers en NIC Chile

1. Inicia sesión en tu cuenta de NIC Chile: https://www.nic.cl
2. Ve a la sección de administración de tu dominio `tacticsphere.cl`
3. Busca la sección "Configuración Técnica" o "DNS"
4. En el formulario de configuración técnica:
   - Selecciona "Servidores DNS" (no "Redireccionamiento Web")
   - En el campo "Nombre de Servidor", agrega el primer nameserver de Cloudflare (ej: `dee.ns.cloudflare.com`)
   - Haz clic en "Agregar Servidor de Nombre"
   - Agrega el segundo nameserver de Cloudflare (ej: `jermaine.ns.cloudflare.com`)
   - **IMPORTANTE**: Asegúrate de que los nombres NO terminen con punto (`.`)
   - Elimina cualquier otro nameserver que esté configurado
   - Guarda los cambios

## Paso 4: Verificar y Desactivar DNSSEC (si está activo)

### Cómo verificar si DNSSEC está activado:

1. En el panel de NIC Chile, busca la sección de **DNSSEC** o **"Administración de llaves para DNS Sec"**
2. Abre el modal o sección de administración de llaves DNSSEC
3. **Si DNSSEC está DESACTIVADO**, verás:
   - El campo "Llave" está vacío
   - No hay llaves publicadas (checkbox "Publicar" sin marcar)
   - No hay llaves en la lista

4. **Si DNSSEC está ACTIVADO**, verás:
   - Llaves DNSKEY configuradas en el campo "Llave"
   - Checkbox "Publicar" marcado
   - Llaves listadas en la tabla

### Cómo desactivar DNSSEC:

Si DNSSEC está activado y necesitas desactivarlo:

1. En la sección "Administración de llaves para DNS Sec"
2. Elimina todas las llaves configuradas (si las hay)
3. Asegúrate de que el checkbox "Publicar" esté desmarcado
4. Guarda los cambios
5. **Nota**: Si no ves ninguna llave y el campo está vacío, DNSSEC ya está desactivado ✅

### Importante:

- Si el campo "Llave" está **vacío** y no hay llaves publicadas, **DNSSEC está desactivado** ✅
- Puedes reactivar DNSSEC más tarde a través de Cloudflare si lo deseas
- Cloudflare puede gestionar DNSSEC automáticamente una vez que el dominio esté configurado

## Paso 5: Verificar la propagación DNS

Después de guardar los cambios en NIC Chile:

1. La propagación DNS puede tardar entre 24-48 horas, aunque generalmente es más rápida
2. Puedes verificar el estado en Cloudflare:
   - Ve a tu dominio en el panel de Cloudflare
   - Verás el estado de los nameservers
   - Cuando aparezca "Active" (Activo), la configuración está completa

3. Puedes verificar la propagación usando herramientas en línea:
   - https://www.whatsmydns.net
   - https://dnschecker.org
   - Busca `tacticsphere.cl` y verifica que los nameservers apunten a Cloudflare

## Paso 6: Configurar registros DNS en Cloudflare

Una vez que los nameservers estén activos, configura tus registros DNS en Cloudflare:

### Registros comunes necesarios:

1. **Registro A** (para el dominio principal):
   - Tipo: `A`
   - Nombre: `@` o `tacticsphere.cl`
   - Contenido: IP de tu servidor (ej: la IP de tu backend o frontend)
   - Proxy: Activar (nube naranja) para protección de Cloudflare

2. **Registro CNAME** (para www):
   - Tipo: `CNAME`
   - Nombre: `www`
   - Contenido: `tacticsphere.cl` o `@`
   - Proxy: Activar

3. **Registros adicionales** (si es necesario):
   - Registros MX (para email)
   - Registros TXT (para verificación de servicios, SPF, DKIM, etc.)
   - Registros CNAME para subdominios (ej: `api.tacticsphere.cl`)

## Paso 7: Configurar SSL/TLS

Cloudflare proporciona SSL/TLS gratuito:

1. Ve a SSL/TLS en el panel de Cloudflare
2. Selecciona "Full" o "Full (strict)" según tu configuración
3. Esto habilitará HTTPS automáticamente para tu dominio

## Notas importantes:

- ⚠️ **No termines los nameservers con punto**: En NIC Chile, asegúrate de que los nombres de servidor NO terminen con `.` (punto)
- ⏱️ **Tiempo de propagación**: Los cambios pueden tardar hasta 48 horas, pero generalmente son más rápidos
- 🔒 **DNSSEC**: Puedes desactivarlo temporalmente en NIC Chile y reactivarlo en Cloudflare después
- 📝 **Registros DNS**: Cloudflare importará automáticamente tus registros DNS existentes, pero revísalos y ajusta según sea necesario

## Solución de problemas:

### Si los nameservers no se propagan después de 48 horas:
- Verifica que los nombres estén escritos correctamente en NIC Chile
- Asegúrate de que no haya espacios adicionales
- Contacta al soporte de NIC Chile si persiste el problema

### Si tu sitio no carga después de la configuración:
- Verifica que los registros DNS estén configurados correctamente en Cloudflare
- Asegúrate de que la IP de tu servidor sea correcta
- Revisa la configuración de SSL/TLS en Cloudflare

## Recursos adicionales:

- [Documentación de Cloudflare](https://developers.cloudflare.com/dns/)
- [Soporte de Cloudflare](https://support.cloudflare.com/)
- [Guía de NIC Chile](https://www.nic.cl)

---

**Última actualización**: Noviembre 2024

