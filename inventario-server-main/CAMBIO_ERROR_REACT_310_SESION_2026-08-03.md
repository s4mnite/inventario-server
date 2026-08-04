# Corrección React #310 al iniciar o reiniciar sesión

- Archivo: `frontend/src/App.jsx`
- Función: `setCurrentUser`
- Motivo: el componente contiene hooks exclusivos del área autenticada después del retorno de inicio de sesión. Cambiar `currentUser` dentro del mismo montaje provocaba un orden distinto de hooks y React mostraba el error minificado #310.
- Solución: guardar o eliminar la sesión en `localStorage` y recargar la aplicación para montar el componente desde cero con un orden estable de hooks.
- No modifica ni elimina ventas, caja, inventario ni historial de MongoDB.
