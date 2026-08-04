# Corrección de cierre de caja — 2026-08-04

## Archivos modificados
- `server/index.js`
- `index.js`

## Función modificada
- `POST /api/caja/cerrar`

## Motivo
El cierre podía actualizar una caja, pero otra caja abierta duplicada del mismo negocio seguía activa. La verificación del frontend interpretaba eso como un cierre fallido. También se eliminó la dependencia del formato de retorno de `findOneAndUpdate`, que cambia entre versiones del driver MongoDB.

## Comportamiento nuevo
- Busca primero la caja por su ID y luego por negocio.
- Cierra la caja con `updateOne`.
- Cierra cajas abiertas duplicadas del mismo negocio.
- Mantiene compatibilidad con cajas antiguas guardadas solo en respaldo local.
- No borra ventas, inventario, historial ni documentos existentes.
