# Corrección de la web móvil

## Archivo modificado
`frontend/src/index.css`

## Cambios
- Oculta el menú lateral de escritorio en teléfonos y tablets.
- Activa la barra inferior y el Inicio móvil incluso cuando Chrome informa un viewport ancho.
- Hace que el contenido use el 100% de la pantalla.
- Convierte grillas y paneles a una columna en móvil.
- Evita desbordamiento horizontal y páginas comprimidas.
- Mantiene la vista de escritorio para pantallas grandes.

## Motivo
En algunos teléfonos Chrome estaba mostrando la versión de escritorio comprimida. La corrección agrega reglas de respaldo basadas en ancho, ancho del dispositivo y tipo de puntero táctil.

## Datos no modificados
No se cambió backend, MongoDB, ventas, boletas, stock, huevos, caja ni clientes.
