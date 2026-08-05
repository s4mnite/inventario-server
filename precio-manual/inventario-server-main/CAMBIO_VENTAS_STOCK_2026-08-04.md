# Cambio: ventas y devolución de stock

## Archivos modificados

- `server/index.js`

## Cambios realizados

1. Las ventas de huevos usan exactamente la misma clave de inventario que el módulo Huevos (`empresa` del usuario o, si no existe, su nombre de usuario).
2. Los huevos vendidos se registran como movimientos `venta` dentro del documento central de Huevos, vinculados mediante `ventaId` y número de boleta.
3. Las ventas de productos mantienen su flujo anterior y solo descuentan el inventario general.
4. Al eliminar una venta, los productos vuelven al inventario general y los huevos vuelven al inventario de Huevos.
5. Al eliminar una venta de huevos también se elimina el movimiento vinculado por `ventaId`.
6. Se agregó compatibilidad con ventas antiguas cuyo movimiento de huevos pudiera estar guardado bajo otra clave.

## Datos no modificados

No se reinicia ni borra MongoDB, caja, inventario, movimientos ni historial existente.
