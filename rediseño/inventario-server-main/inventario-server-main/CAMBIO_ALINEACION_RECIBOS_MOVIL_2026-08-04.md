# Corrección de alineación de Recibos en móvil

## Archivos modificados

- `frontend/src/App.jsx`
  - Se agregaron clases específicas al listado de recibos para controlar su distribución responsiva sin alterar datos ni acciones.
- `frontend/src/index.css`
  - En pantallas de hasta 640 px, cada recibo usa una cuadrícula de dos columnas.
  - El número, método de pago, fecha, vendedor, monto, estado y botón de eliminación quedan dentro de la tarjeta.
  - El monto deja de salir por el borde derecho.

## Alcance

Cambio exclusivamente visual. No modifica ventas, boletas, caja, MongoDB, autenticación ni endpoints.
