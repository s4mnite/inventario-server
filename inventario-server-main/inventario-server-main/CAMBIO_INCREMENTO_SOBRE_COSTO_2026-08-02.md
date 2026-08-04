# Cambio: incremento sobre costo

## Criterio aplicado
La aplicación dejó de mostrar el porcentaje como margen sobre el precio de venta.
Ahora usa incremento o recargo sobre el costo:

- Incremento (%) = (Precio de venta - Costo) / Costo × 100
- Precio sugerido = Costo × (1 + Incremento / 100)
- Ganancia = Precio de venta - Costo

Ejemplo:
- Costo: $3.300
- Incremento: 18%
- Precio sugerido: $3.894
- Ganancia: $594

## Archivos modificados

### frontend/src/lib/utils.js
- Se agregaron las funciones compartidas `calcIncrementPct` y `priceFromIncrement`.
- Motivo: mantener una sola fórmula para productos y huevos.

### frontend/src/App.jsx
- El formulario de productos ahora incluye `Incremento sobre el costo (%)`.
- Al cambiar costo o incremento, recalcula el precio de venta.
- Al cambiar el precio, recalcula el incremento real.
- Los reportes de productos calculan el porcentaje sobre el costo.
- Se reemplazaron las etiquetas visuales de margen por incremento.

### frontend/src/HuevosModule.jsx
- La configuración de cada categoría incluye incremento sobre costo.
- El precio por huevo se calcula desde el costo por caja y el incremento.
- Los reportes de rentabilidad de huevos usan ganancia/costo.
- Se muestra ganancia por huevo e incremento real.

### server.cjs
- Se añadió `incrementoPct` a los esquemas de productos y huevos.
- Motivo: evitar que MongoDB descarte el porcentaje configurado.

## Datos no eliminados
- No borra productos.
- No borra boletas.
- No reinicia stock.
- No elimina lotes ni movimientos de huevos.
