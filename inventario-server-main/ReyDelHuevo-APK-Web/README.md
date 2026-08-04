# Rey del Huevo APK

Aplicación Android que abre la web oficial `https://78fe.onrender.com` dentro de una WebView preparada para:

- cámara y lector de códigos;
- carga de fotos y boletas;
- navegación atrás;
- descargas y enlaces externos;
- almacenamiento web y sesión iniciada;
- actualización automática: los cambios publicados en la web aparecen en la APK sin recompilar.

## Generar APK gratis desde GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta.
3. Abre la pestaña **Actions**.
4. Entra a **Generar APK** y pulsa **Run workflow**.
5. Al finalizar, descarga el artefacto **ReyDelHuevo-APK**.
6. Dentro estará `app-debug.apk`.

## Cambiar URL

Edita esta línea en:

`app/src/main/java/com/reydelhuevo/app/MainActivity.kt`

```kotlin
private val webUrl = "https://78fe.onrender.com"
```
