# Lotes actualizados y pérdidas unificadas

Archivo modificado: `frontend/src/HuevosModule.jsx`.

- Cada lote conserva sus ventas, ingresos, merma, rotos y trizados por fecha; ya no se acumulan en el lote más nuevo.
- El stock disponible del lote vigente se reconcilia con el inventario actual de MongoDB.
- Merma y Rotos se muestran juntos como `Pérdidas (Merma + Rotos)`.
- Trizados continúa separado.
- No se modificaron caja, ventas generales, backend ni datos almacenados.
