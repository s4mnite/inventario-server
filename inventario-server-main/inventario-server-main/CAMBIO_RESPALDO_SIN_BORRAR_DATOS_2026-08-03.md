# Sincronización y respaldo sin borrar datos

## Archivos revisados

### frontend/src/App.jsx
- MongoDB continúa como fuente principal para caja e historial compartido.
- `localStorage` se conserva como respaldo local temporal.
- La sincronización de caja consulta el servidor periódicamente y al volver a la app.
- Los datos locales no se eliminan durante la sincronización.

### server/index.js
- Se mantiene el historial de caja en MongoDB y la consulta por empresa.
- No se agregan rutinas de borrado de cajas, ventas, boletas, productos, stock ni huevos.

## Motivo
Evitar diferencias entre PC, web móvil y APK sin perder el respaldo local disponible en cada dispositivo.

## Datos que no se borran
- Cajas abiertas o cerradas
- Historial de caja
- Ventas
- Boletas
- Productos
- Stock
- Lotes y movimientos de huevos
- Respaldo local en `localStorage`
