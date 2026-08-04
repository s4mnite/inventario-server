# Corrección real: categorías y lectura OCR de gastos

## Archivo modificado

### `frontend/src/GastosModule.jsx`

**Cambios realizados**

- Se reemplazó el selector nativo de categorías por un selector propio de la app.
- El selector ya no abre el menú negro del navegador/Android.
- Muestra las categorías reales del inventario, más una categoría independiente `Huevos`.
- Mantiene las categorías operacionales: Combustible, Servicios, Arriendo, Aseo y Otros.
- El OCR ahora conserva las líneas originales de la boleta; antes se mezclaban y eso confundía comercio, folio y total.
- La foto se procesa en dos versiones: escala de grises con contraste y blanco/negro.
- Se ejecutan dos pasadas de lectura y se utiliza el resultado con mayor confianza.
- Se mejoró la búsqueda de total para no confundirlo con RUT, folio, número de boleta, fecha, vuelto o caja.
- Se mejoró la detección de comercio, fecha, IVA y número de documento.
- Se agregó acceso para ver la foto original y el texto leído por OCR antes de guardar.

**Motivo**

- El selector anterior dependía del menú nativo del teléfono y aparecía negro y sobredimensionado.
- La limpieza anterior eliminaba los saltos de línea del OCR, lo que provocaba datos mezclados e incorrectos.

## No modificado

- No se cambió MongoDB.
- No se borraron gastos existentes.
- No se cambió stock, ventas, boletas de venta, lotes ni huevos.
