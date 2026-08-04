# Venta libre: huevos + productos

## Archivos modificados

### `frontend/src/App.jsx`
- El selector de Ventas ahora ofrece **Venta libre** y **Venta de productos**.
- Venta libre muestra huevos y productos en la misma pantalla y en una sola boleta.
- El carrito suma ambos tipos de artículos y utiliza un único método de pago.
- Los huevos se envían separados como `eggItems` para que no se mezclen con el inventario normal.
- Al completar la venta se actualiza el inventario de huevos devuelto por el servidor.

**Motivo:** permitir una compra mixta sin mezclar los informes de huevos con los informes de productos.

### `server/index.js`
- `/api/ventas` valida y descuenta el stock de productos y huevos.
- Cada artículo de huevos genera un movimiento `venta` en el módulo Huevos.
- La venta general y la boleta conservan el total completo.
- Los productos siguen descontándose únicamente de la colección `productos`.

**Motivo:** mantener una sola boleta y un solo pago, pero registrar cada parte en su módulo correspondiente.

### `frontend/src/index.css`
- Estilos responsive para el selector y las tarjetas de huevos dentro de Venta libre.

## Comportamiento de informes
- **Huevos → Reportes:** recibe los movimientos de huevos de la venta libre.
- **Productos/Ventas:** conserva los artículos de inventario normal.
- **Caja y boleta:** muestran el total combinado.

## Datos no eliminados
No se borran ventas, boletas, productos, huevos, lotes ni movimientos existentes.
