# Corrección: `movimientosHuevosInicio is not defined`

## Archivo modificado
- `frontend/src/App.jsx`

## Función/cálculo modificado
- Cálculos de datos de la pantalla Inicio.

## Motivo
Las tarjetas de “Últimas ventas de huevos” y “Movimientos recientes” todavía utilizaban `movimientosHuevosInicio`, pero esa variable había sido retirada al cambiar el resumen para leer todas las ventas desde MongoDB. Esto impedía abrir la aplicación.

## Solución
Se reconstruye `movimientosHuevosInicio` directamente desde el estado `ventas`, tomando los ítems de huevo guardados en MongoDB, normalizando calidad, cantidad de huevos, método de pago, ingreso y fecha, y ordenándolos desde la venta más reciente.

## Datos
No se borran ni modifican ventas, caja, historial, inventario ni registros de MongoDB.
