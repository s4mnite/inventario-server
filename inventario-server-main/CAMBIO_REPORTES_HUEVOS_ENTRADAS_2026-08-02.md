# Reportes de huevos: entradas e inventario

## Archivo modificado: frontend/src/HuevosModule.jsx

### Cambios
- Se restauró la pestaña Reportes dentro de Huevos.
- Se agregaron stock inicial, entradas reales, valor de entradas, traspasos y stock final.
- Las transferencias entre lotes se muestran separadas y no cuentan como compra nueva.
- El reporte diario/semanal/mensual mantiene ventas, costo, ganancia, merma, rotos, trizados y valor perdido.
- La exportación CSV/Excel incluye todas las nuevas columnas.
- Se mantuvo la lógica de incremento sobre costo para huevos.

### Motivo
Permitir revisar cuánto inventario de huevos ingresó realmente, cuánto se trasladó entre lotes, cuánto se vendió o perdió y cuál fue el stock final del período.

### Datos no modificados
No se borran lotes, movimientos, boletas, productos ni stock existente.
