# Corrección: identidad del negocio al abrir Caja

## Problema
La apertura de caja enviaba `empresa: ""` cuando la sesión guardada en el dispositivo era antigua o no contenía el campo `empresa`. El backend rechazaba la operación con `Falta identificar el negocio`.

## Archivos modificados

### `frontend/src/App.jsx`
- Se agregó `empresaCaja`, que obtiene la identidad en este orden:
  1. `currentUser.empresa`
  2. `cajaData.empresa`
  3. `Rey del Huevo` como respaldo estable de esta aplicación.
- La sincronización, apertura y cierre de Caja ahora usan `empresaCaja`.
- Las sesiones antiguas ya no dejan bloqueada la caja en Android, web o PC.

### `server/index.js`
- Se agregó `DEFAULT_EMPRESA`, configurable mediante la variable de entorno `DEFAULT_EMPRESA`.
- Si una versión antigua de la app no envía `empresa`, las rutas de Caja usan `Rey del Huevo` en lugar de devolver el error.
- Se mantienen intactos los documentos y el historial existentes en MongoDB; no se ejecuta ningún borrado ni reinicio.

## Validación
- `server/index.js` pasó la comprobación sintáctica de Node (`node --check`).
- No fue posible ejecutar el build dentro de este entorno porque el registro interno de paquetes no tenía disponibles dependencias del proyecto (`typescript` y `yallist`). El código fuente corregido queda incluido para compilar/deployar normalmente en GitHub/Render.
