# Corrección de cierre de caja — 2026-08-04

## Archivos modificados

- `server/index.js`
- `index.js`

## Función modificada

- `POST /api/caja/cerrar`

## Motivo

El servidor respondía `200 OK`, pero una segunda caja abierta del mismo negocio podía seguir en MongoDB. Después del cierre, `/api/caja/actual` encontraba esa caja duplicada y la aplicación seguía mostrando la caja como abierta.

## Cambio

- La caja exacta se cierra con `updateOne`.
- Se vuelve a leer el documento cerrado para responder con datos reales.
- Cualquier otra caja abierta duplicada del mismo negocio se marca como cerrada, sin eliminar documentos ni historial.
- No se modifican ventas, inventario, huevos ni boletas.
