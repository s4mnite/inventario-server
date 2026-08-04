# Corrección de estructura de Render y cierre de caja

- Se eliminó la copia anidada `inventario-server-main/` que había quedado dentro del proyecto.
- `frontend/` y `server/` vuelven a estar directamente en la raíz esperada por Render.
- Se corrigió la detección de caja abierta en `index.js` y `server/index.js`.
- Una caja con fecha de cierre ya no puede volver a considerarse abierta aunque conserve un estado antiguo.
- No se eliminan ni modifican ventas, boletas, inventario o documentos de MongoDB.
