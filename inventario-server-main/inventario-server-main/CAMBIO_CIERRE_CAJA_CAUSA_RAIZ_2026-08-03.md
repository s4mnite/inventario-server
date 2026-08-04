# Corrección definitiva del cierre de caja

## Causa encontrada
La pantalla podía mostrar una caja desde el respaldo local, pero las ventas y el cierre buscaban la caja solamente por el texto exacto de `empresa`. Cuando había diferencias de espacios, mayúsculas o datos antiguos, la caja visible no coincidía con la consulta del backend.

## Cambios
- El cierre usa primero el ID real de MongoDB de la caja visible.
- El backend cierra por `_id` y confirma posteriormente el documento cerrado.
- La búsqueda por empresa tolera espacios y diferencias de mayúsculas.
- Las ventas usan el mismo `cajaId` que muestra la pantalla de Caja.
- La empresa de la venta se toma de la caja abierta confirmada.
- El frontend consulta el estado después de cerrar y solo confirma cuando ya no existe caja abierta.

## Archivos
- `frontend/src/App.jsx`
- `server/index.js`
