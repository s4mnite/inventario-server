# Corrección API Gastos en Render

## server/index.js
- Se agregaron GET, POST y DELETE de `/api/gastos` al backend que Render ejecuta realmente.
- Se agregó `/api/gastos/upload-boleta` con Cloudinary.
- Las compras vinculadas actualizan stock y costo promedio ponderado.
- Los gastos quedan separados por empresa/usuario.

## frontend/src/GastosModule.jsx
- Se evita intentar parsear HTML como JSON.
- Si el backend no está actualizado, muestra un error legible en vez de `Unexpected token <`.

## Motivo
El ZIP anterior agregó las rutas a `server.cjs`, pero el servicio de Render usa `server/index.js`; por eso `/api/gastos` devolvía una página HTML 404.
