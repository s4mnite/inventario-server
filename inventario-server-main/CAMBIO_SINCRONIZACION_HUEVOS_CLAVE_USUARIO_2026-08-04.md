# Corrección de sincronización de Huevos

## Problema
Los dispositivos podían consultar documentos distintos porque Huevos usaba `empresa` como clave. Algunas sesiones tenían `empresa: ""` y otras `empresa: "Rey del Huevo"`.

## Solución
- Huevos usa ahora una clave estable basada en el usuario autenticado (`admin`).
- Web, APK y PC consultan el mismo documento de MongoDB.
- Se agregó compatibilidad para migrar un documento antiguo guardado con la empresa como clave.
- La carga de Huevos usa `Cache-Control: no-store`.
- Las ventas y eliminaciones de ventas actualizan el mismo documento central de Huevos.

## Archivos modificados
- `index.js`
- `server/index.js`

No se eliminan ni reinician inventario, movimientos, ventas, caja ni otros datos.
