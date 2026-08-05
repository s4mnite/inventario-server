# Corrección de sincronización de Huevos

## Problema
El navegador enviaba el encabezado `Cache-Control` al consultar `/api/huevos`, pero el backend no lo permitía en CORS. La petición preflight podía fallar y el frontend mostraba la copia local antigua.

## Cambios
- `server/index.js`: se permiten `Cache-Control` y `Pragma` en CORS.
- `frontend/src/HuevosModule.jsx`: la consulta de Huevos ya no envía manualmente `Cache-Control`; mantiene `cache: "no-store"`.
- Se eliminan del ZIP las copias anidadas y carpetas duplicadas. La raíz conserva únicamente `frontend/`, `server/` y archivos de configuración.

## Datos
No se modifican documentos de MongoDB, inventario, movimientos, ventas ni caja.
