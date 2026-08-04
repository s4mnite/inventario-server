# Corrección: reportes de huevos y sincronización

## frontend/src/HuevosModule.jsx

- Corrige el filtro diario para respetar literalmente la fecha elegida en el movimiento (`YYYY-MM-DD`).
- Evita que la zona horaria de Chile mueva movimientos al día anterior.
- Merma, rotos y trizados ahora aparecen en el reporte del día correspondiente.
- Agrega ingreso de huevos unitarios para merma, rotos y trizados.
- Sincroniza inventario y movimientos de huevos con MongoDB cada 8 segundos.
- También actualiza al volver a la ventana, recuperar conexión o regresar a la app.
- Conserva `localStorage` como respaldo; no se borra ni reemplaza datos confirmados del servidor.
- Las respuestas de huevos se solicitan sin caché para que PC, móvil y APK vean la misma información.
