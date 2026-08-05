# Precio manual por producto en una venta

Se agregó una opción de **Precio manual** en cada producto del carrito.

## Funcionamiento

- El cálculo automático sigue respetando precio normal, mangas/bultos y promociones por cantidad.
- Al activar **Precio manual**, se puede escribir el total que se cobrará por esa línea solamente en la venta actual.
- El stock se descuenta según la cantidad real de unidades o mangas, no según el precio escrito.
- La venta y el recibo conservan el subtotal realmente cobrado.
- Al desactivar el precio manual se restaura el cálculo automático del producto.
- No se permite finalizar una venta si un precio manual está vacío o es igual a cero.

## Archivo modificado

- `frontend/src/App.jsx`

No se modificó MongoDB, Caja, autenticación ni el backend.
