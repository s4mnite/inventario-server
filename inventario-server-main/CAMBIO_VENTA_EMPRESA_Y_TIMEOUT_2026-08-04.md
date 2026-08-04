# Corrección de venta y negocio activo — 2026-08-04

- `frontend/src/App.jsx`: todas las consultas de ventas, boletas y categorías usan una identidad de negocio estable (`empresaActiva`) aunque la sesión antigua no incluya `empresa`.
- `frontend/src/App.jsx`: el POST de venta envía explícitamente la empresa en venta y boleta, maneja respuestas no JSON y corta a los 30 segundos con un mensaje seguro para evitar repeticiones/duplicados.
- `server/index.js` e `index.js`: una caja solo se considera abierta si no tiene fecha de cierre; las ventas se filtran por empresa sin distinguir mayúsculas y las ventas de huevos usan la empresa confirmada por la caja.
- No se eliminan ni modifican datos existentes en MongoDB.
