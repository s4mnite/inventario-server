# Cambio: categorías reales en Gastos

## frontend/src/GastosModule.jsx

**Cambio realizado**
- Se eliminó la categoría genérica "Mercadería" del selector.
- Se agregó "Huevos" como categoría independiente.
- Se cargan automáticamente las categorías reales de productos desde el inventario.
- El selector se divide visualmente en: Huevos, Categorías de productos y Otros gastos.
- Se admite que las categorías lleguen como texto u objeto.

**Motivo**
- El selector anterior seguía mostrando categorías genéricas y no reflejaba las categorías del inventario.

**No se modificó**
- MongoDB, stock, ventas, boletas ya guardadas ni movimientos de huevos.
