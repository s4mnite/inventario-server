# Sincronización total sin borrar respaldo local

## frontend/src/App.jsx
- Ventas y boletas se consultan desde MongoDB cada 8 segundos.
- También se actualizan al volver a la ventana, recuperar Internet y entrar a Inicio, Ventas, Recibos o Reportes.
- localStorage se conserva como respaldo offline y nunca se elimina durante la sincronización.
- Si el servidor responde, sus datos se muestran en todos los dispositivos y se actualiza la copia local.
- Si el servidor no responde, se mantiene visible la copia local disponible.

## server/index.js
- Se deshabilitó la caché en GET /api/ventas y GET /api/boletas.
- Motivo: evitar que PC, web móvil o APK reciban listas antiguas.

## No se borra
- Ventas
- Boletas
- Cajas
- Productos y stock
- Huevos y lotes
- Respaldo local
