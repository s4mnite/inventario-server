# Corrección de compilación — Gastos

## Archivo modificado
`frontend/src/GastosModule.jsx`

## Cambio realizado
Se reparó la cadena usada para combinar los resultados del OCR:

```js
.filter(Boolean).join("\n");
```

## Motivo
El archivo tenía la cadena partida en dos líneas, lo que provocaba:

`Unterminated string literal`

Ese error impedía que Vite compilara el frontend y bloqueaba el despliegue en Render.

## Verificación
- `GastosModule.jsx`: sintaxis JSX validada.
- `App.jsx`: sintaxis JSX validada.
- `HuevosModule.jsx`: sintaxis JSX validada.

No se modificaron categorías, gastos guardados, stock, boletas, huevos, ventas ni MongoDB.
