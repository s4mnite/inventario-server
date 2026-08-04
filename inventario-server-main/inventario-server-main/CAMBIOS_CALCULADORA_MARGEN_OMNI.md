# Calculadora de margen tipo Omni

## frontend/src/App.jsx

**Cambio realizado**
- Se agregó `Margen deseado (%)` al crear y editar productos.
- Al cambiar el margen, se calcula automáticamente el precio de venta con:
  `precio = costo / (1 - margen / 100)`.
- Al cambiar costo o precio, se recalcula el margen real.
- Se muestran por separado la ganancia por unidad y el margen real.
- El margen deseado se incluye al guardar el producto.

**Motivo**
- Usar margen comercial sobre el precio de venta, igual al criterio mostrado por Omni Calculator.
- Evitar confundir margen con recargo sobre costo.

## frontend/src/HuevosModule.jsx

**Cambio realizado**
- Se agregó `Margen deseado (%)` a la configuración de cada categoría de huevos.
- Al cambiar el margen, se calcula automáticamente el precio de venta por huevo.
- Al cambiar costo por caja o precio por huevo, se recalcula el margen real.
- Se muestran costo por huevo, margen real, ganancia por bandeja y ganancia por caja.
- El margen deseado queda guardado dentro de la configuración de la categoría.

**Motivo**
- Aplicar el mismo cálculo de margen a productos y huevos.
- Calcular la rentabilidad usando el costo real de la caja dividido en 180 huevos.

## No modificado
- Backend.
- MongoDB.
- Boletas.
- Stock.
- Ventas.
- Lotes y movimientos.
- Diseño de escritorio fuera de estos formularios.

## Verificación
- Se revisaron los bloques modificados en ambos archivos.
- No fue posible ejecutar `npm ci` ni `npm run build` porque el registro npm del entorno devolvió 404 para `yallist@3.1.1`.
