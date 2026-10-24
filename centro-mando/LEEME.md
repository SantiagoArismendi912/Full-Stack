# Centro de Mando Jornexa — demo 3D

Sitio estático (sin build): se publica tal cual, por ejemplo en Cloudflare Pages (carpeta raíz = `centro-mando/`).

## Qué incluye
- Ciudad 3D (Three.js desde CDN) con la grúa torre animada y el hotel que crece al convertir el prospecto en cliente.
- **Historia de ~90 s con voz** (locución de Nyla + música + efectos en `assets/demo-audio.mp3`) y subtítulos (`subtitulos.js`).
- **Control en la línea de tiempo:** reiniciar, ±5 s, pausar/reproducir, velocidad 0.5×/1×/2×, barra con los 4 actos y botón de sonido.
  Atajos: espacio (pausa), ← / → (±5 s). La voz sigue al reloj: pausar, mover la barra o cambiar la velocidad también la afectan.
- Modo Explorar: sin voz, para recorrer sedes, copiloto y chat.

## Sonido
Los navegadores bloquean el audio automático hasta que la persona toca la página: en ese caso aparece el aviso
«Toca para activar la voz y la música». Los subtítulos se muestran siempre durante la historia. `?video=1` desactiva voz,
subtítulos y controles (para grabar).

## Publicar
Sube la carpeta completa. El servidor debe aceptar peticiones `Range` para el audio (Cloudflare lo hace por defecto).

## Cambiar el guion
`historia.js` (eventos y cámara por tiempo, en ms) y `subtitulos.js` (texto por tiempo, en s). Si cambias la voz, reemplaza
`assets/demo-audio.mp3` y ajusta esos tiempos.

## Icono y anclaje (logo de Jornexa)
Reemplaza el icono por defecto de Cloudflare: pestaña del navegador, favoritos, «Añadir a pantalla de inicio» (iOS y Android).
- **Método:** los recursos de marca viven en `https://recursos.dvelaris.com/` (bucket R2 `jornexa-recursos`) y la página los
  enlaza por URL, sin copiarlos al repositorio. Icono actual: `jornexa-opcion-3-turquesa-192.png`.
- En el `<head>` de `index.html`: `rel="icon"` (192 px), `rel="apple-touch-icon"`, `rel="manifest"` y `theme-color` `#072E73`.
- `manifest.webmanifest`: nombre, nombre corto «Jornexa», colores de marca y el icono.
- **Cambiar el logo:** sube un archivo nuevo al bucket (mejor con nombre nuevo, no reemplazar el anterior) y cambia la URL en
  `index.html` y en `manifest.webmanifest`.
- **Pendientes opcionales:** versión de 512 px (para instalar como app) y una imagen de 1200×630 para la vista previa al compartir
  el enlace en LinkedIn (`og:image`).
- Los navegadores guardan los iconos en caché: para ver el cambio, recarga con Ctrl+F5 o abre una ventana de incógnito.
