# Corrección del escáner USB en Ventas

## Archivo modificado
- `frontend/src/App.jsx`

## Cambios
- El buscador de Ventas queda listo para recibir códigos desde una pistola/escáner USB.
- Al escanear, el lector escribe el código y envía Enter: la app busca el producto y lo agrega al carrito.
- Si el producto ya estaba en el carrito, suma una unidad.
- Después de cada lectura, el cursor vuelve automáticamente al buscador.
- Si el código no existe, queda escrito y se muestra un aviso.
- Funciona tanto en Venta libre como en Venta de productos.
- Se corrigió la cámara para listar dispositivos mediante `navigator.mediaDevices.enumerateDevices()` y evitar el error `BrowserCodeReader.listVideoInputDevices is not a function`.

## Motivo
- Los escáneres USB funcionan como teclado y no necesitan abrir la cámara.
- La versión anterior dependía de una función de ZXing no disponible en algunas versiones.

## No modificado
- Backend y MongoDB.
- Stock, boletas, huevos y reportes.
- Diseño de escritorio y móvil fuera del buscador de Ventas.
