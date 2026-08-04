# Corrección: venta rechazada con caja abierta

## Problema
La caja se abría usando el negocio de respaldo **Rey del Huevo**, pero la venta todavía enviaba `empresa` vacío desde una sesión antigua. El servidor buscaba una caja abierta con ese valor vacío y rechazaba la venta.

## Archivos modificados
- `frontend/src/App.jsx`
  - `handleVentaDirecta`: la venta y la boleta ahora usan `empresaCaja`, el mismo identificador usado para abrir y sincronizar la caja.
- `server/index.js`
  - `POST /api/ventas`: primero valida la caja por `cajaId`; si no está disponible, busca por el negocio normalizado. También guarda en la venta el negocio real de la caja encontrada.

No se borran cajas, ventas, inventario ni historial.
