# Arreglo de compilación — módulo Gastos

## frontend/src/GastosModule.jsx
- Se reconstruyó correctamente la separación de líneas OCR con `split(/\n+/)`.
- Se corrigió la unión del texto OCR con `join(" ")`.
- Se reemplazaron caracteres de control corruptos por límites de palabra `\b` en la detección de fecha.

**Motivo:** el archivo tenía una expresión regular cortada en varias líneas y Vite detenía la compilación con `Unterminated regular expression`.

## frontend/src/App.jsx
- Se eliminó una propiedad `background` duplicada en el botón de categorías.

**Motivo:** evitar la advertencia de esbuild y dejar un solo valor de fondo.

## Verificación
- `GastosModule.jsx` y `App.jsx` fueron analizados correctamente como JSX mediante el compilador TypeScript.
- No se modificaron el backend, MongoDB, ventas, stock, huevos ni gastos guardados.
