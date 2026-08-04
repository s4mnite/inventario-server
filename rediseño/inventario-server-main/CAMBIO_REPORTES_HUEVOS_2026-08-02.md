# Cambio: Reportes diarios de huevos

## Archivo modificado: frontend/src/HuevosModule.jsx

### Cambio realizado
- Se agregó la pestaña **Reportes** dentro del módulo de Huevos.
- Permite filtrar por **día, semana o mes**.
- Muestra ventas de huevos, costo de lo vendido, ganancia estimada y pérdida del período.
- Separa las pérdidas en **merma, rotos y trizados**.
- Incluye detalle por categoría: Súper, Extra, Primera, Segunda y Tercera.
- Calcula el valor perdido usando el costo guardado en cada movimiento/lote.
- Permite exportar el reporte en CSV compatible con Excel.

### Motivo
Necesitas revisar diariamente cuánto se vendió y cuánto se perdió exclusivamente en huevos, separado del inventario general.

## Archivo modificado: frontend/src/index.css

### Cambio realizado
- Se agregaron ajustes responsive para que las tarjetas y filtros del reporte se adapten a móvil, tablet y escritorio.

### Motivo
Evitar que el reporte se desordene o quede cortado en teléfonos.

## Datos no modificados
- No se borran boletas.
- No se modifica el stock.
- No se eliminan lotes ni movimientos.
- No se cambia MongoDB ni el backend.
- El reporte se construye a partir de los movimientos de huevos ya guardados.

## Verificación
Se intentó ejecutar la compilación, pero el registro npm del entorno no entregó la dependencia `yallist@3.1.1` (error 404). Por eso no fue posible completar `npm run build` dentro de este entorno.
