# Ventas por día y venta de prueba

## frontend/src/App.jsx
- Historial agrupado por fecha en móvil y escritorio.
- Cada fecha muestra cantidad de ventas y total diario.
- Se añadió el botón **Generar venta de prueba**.
- La prueba crea una venta y boleta persistentes, claramente marcadas, sin descontar stock.

## server.cjs
- Se agregó el campo `esPrueba` a ventas y boletas.
- Las ventas de prueba se guardan en MongoDB, pero no validan ni descuentan stock.

## Motivo
Permitir revisar ventas por día y comprobar de forma segura que las boletas permanecen después de recargar.
