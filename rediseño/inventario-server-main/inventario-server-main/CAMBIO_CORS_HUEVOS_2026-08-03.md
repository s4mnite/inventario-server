# Corrección CORS para carga de Huevos — 2026-08-03

## Problema
La web no podía cargar `/api/huevos` porque el navegador bloqueaba la solicitud previa CORS: el frontend enviaba el encabezado `Cache-Control`, pero el backend no lo incluía en `Access-Control-Allow-Headers`.

## Cambios
- `frontend/src/HuevosModule.jsx`: se eliminó el encabezado manual `Cache-Control: no-cache` de la consulta de huevos. Se conserva `cache: "no-store"`, que evita caché sin agregar un encabezado CORS innecesario.
- `server/index.js`: CORS ahora admite `Cache-Control` y `Pragma` como respaldo de compatibilidad.
- `server/server/index.js`: se aplicó la misma compatibilidad al servidor alternativo incluido en el proyecto.
- `frontend/src/index.js`: se aplicó la misma compatibilidad a la copia de servidor incluida en frontend.

## Datos
No se borran ni modifican huevos, movimientos, ventas, cajas, inventario ni documentos de MongoDB. El cambio solo corrige el transporte HTTP entre web y backend.
