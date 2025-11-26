# Solución: Error de bcrypt con passlib

## Problema
El backend estaba fallando con el error:
```
AttributeError: module 'bcrypt' has no attribute '__about__'
ValueError: password cannot be longer than 72 bytes
```

## Causa
Incompatibilidad entre `passlib[bcrypt]==1.7.4` y versiones nuevas de `bcrypt` (4.x). Passlib 1.7.4 requiere bcrypt 3.x.

## Solución
Se fijó la versión de bcrypt a `3.2.2` en `requirements.txt`:

```
bcrypt==3.2.2
```

Esta versión es compatible con `passlib[bcrypt]==1.7.4`.

## Pasos para aplicar
1. El archivo `requirements.txt` ya está actualizado
2. Render debería detectar el cambio y redeployar automáticamente
3. Si no, puedes forzar un redeploy manual en Render

## Verificación
Después del redeploy, prueba el login nuevamente. Debería funcionar correctamente.

