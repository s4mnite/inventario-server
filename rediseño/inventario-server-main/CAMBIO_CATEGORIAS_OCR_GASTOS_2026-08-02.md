# Cambio: categorías de gastos y lectura de boletas

## frontend/src/GastosModule.jsx

### Cambios
- La categoría de gasto ahora incluye automáticamente todas las categorías existentes del inventario de productos.
- Se agregó una categoría independiente llamada `Huevos`.
- Se mantienen categorías operacionales: Combustible, Servicios, Arriendo, Aseo y Otros.
- Las compras clasificadas como una categoría de producto o Huevos se contabilizan como mercadería.
- Se fuerza la apariencia clara del selector en móvil para evitar el menú negro del navegador.
- La imagen de la boleta se amplía, convierte a alto contraste y luego se procesa con OCR.
- Se mejoró la detección de comercio, fecha, número de documento, total e IVA.
- El OCR prioriza textos cercanos a “TOTAL”, “MONTO TOTAL”, “A PAGAR” y “TOTAL PAGADO”.
- Los datos extraídos siguen siendo editables y deben confirmarse antes de guardar.

### Motivo
- Usar las mismas categorías reales que ya existen en el inventario.
- Separar claramente las compras de huevos.
- Evitar que el número de boleta sea confundido con el total.
- Mejorar la lectura de fotos con iluminación o contraste deficientes.

## frontend/src/App.jsx

### Cambio
- Se pasan las categorías del inventario al módulo Gastos.

### Motivo
- Mantener sincronizadas las categorías sin duplicarlas manualmente.

## Datos no modificados
- No se eliminan gastos existentes.
- No se altera stock, productos, huevos, boletas de venta ni MongoDB.
- No se modifica la API del backend.

## Verificación
- Se intentó ejecutar el build, pero el registro npm interno no entregó `yallist@3.1.1` (error 404).
