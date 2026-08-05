# Corrección de precios por manga y promociones — 05-08-2026

## Archivo modificado

- `frontend/src/App.jsx`

## Comportamiento corregido

- Una cantidad igual a las unidades de una manga aplica el precio completo de manga.
- Los múltiplos de manga aplican el precio de manga por cada bloque completo.
- Las unidades restantes se cobran al precio normal o a la promoción configurada.
- Las promociones por cantidad se aplican por bloques completos y las unidades restantes conservan su precio normal.
- El cálculo se usa al agregar desde la grilla móvil, el buscador/escáner, el modal de venta y al cambiar cantidades en el carrito.
- El subtotal exacto se conserva en la venta y el recibo.
- El stock se descuenta por unidades reales: una manga de 8 descuenta 8 unidades.
- Al borrar la venta, el backend devuelve las mismas unidades reales al stock.

## Ejemplos

Con manga de 8 unidades a $9.390:

- 8 unidades = $9.390
- 16 unidades = $18.780
- 10 unidades = $9.390 + 2 unidades al precio normal

Con promoción de 3 unidades por $5.000:

- 3 unidades = $5.000
- 6 unidades = $10.000
- 7 unidades = $10.000 + 1 unidad al precio normal

Si un producto tiene manga y promoción activas, primero se aplican las mangas completas; luego la promoción a las unidades restantes y finalmente el precio normal.
