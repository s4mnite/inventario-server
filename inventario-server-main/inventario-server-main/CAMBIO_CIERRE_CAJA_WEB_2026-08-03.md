# Corrección: cierre de caja en la web

## frontend/src/App.jsx
- Sincroniza el estado de caja abierta desde MongoDB al entrar a la web.
- Corrige el cierre cuando localStorage conserva una caja o ID antiguo.
- Valida el monto contado.
- Muestra `Cerrando...` mientras se procesa y evita doble clic.
- Solo confirma el cierre después de recibir respuesta JSON válida del servidor.
- Muestra errores reales del backend sin dejar la pantalla bloqueada.

## server/index.js
- El cierre exige empresa y caja en estado `abierta`.
- Busca por ID + empresa + estado; si el ID local está desactualizado, reintenta por empresa.
- Usa `updateOne` y luego vuelve a leer la caja cerrada para confirmar el guardado.
- Evita cerrar una caja de otro negocio.

## Verificación
- `server/index.js` pasó `node --check`.
- El build del frontend no pudo ejecutarse en este entorno porque el registro npm interno no encontró `yallist@3.1.1`.
