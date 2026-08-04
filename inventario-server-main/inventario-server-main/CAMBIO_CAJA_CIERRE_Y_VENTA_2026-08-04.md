# Corrección de Caja y Ventas — 2026-08-04

## Problemas corregidos
- La caja podía abrirse, pero no cerrarse.
- La venta no se generaba cuando el navegador conservaba un identificador local antiguo o una identidad de negocio distinta.
- Las ventas podían no cargarse por diferencias de mayúsculas/minúsculas en el nombre del negocio.

## Archivos modificados

### `frontend/src/App.jsx`
- `handleVentaDirecta`: antes de guardar una venta consulta a MongoDB cuál es la caja realmente abierta.
- La venta y la boleta usan el `id` y la empresa confirmados por el servidor, admitiendo `id` o `_id`.
- `sincronizarVentasYBoletas`: usa la misma identidad estable (`empresaCaja`) utilizada por Caja.

### `index.js`
- Se agregó `buscarCajaAbierta`, que busca primero por ID y luego por empresa.
- `/api/caja/actual`, `/api/caja/cerrar` y `/api/ventas` usan la misma búsqueda de caja abierta.
- `GET /api/ventas` compara la empresa sin distinguir mayúsculas/minúsculas.

### `server/index.js`
- Se aplicaron las mismas correcciones del backend para cubrir la ruta alternativa de despliegue.

## Datos
No se borran, reinician ni migran ventas, cajas, inventario, huevos ni datos de MongoDB.
