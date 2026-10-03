# DJ WILMER · RADIO EN VIVO — Player PWA

Reproductor instalable de radio con el diseño del player de Mega Play: carátula
circular giratoria con ecualizador detrás, menú lateral, botón gigante de play,
redes sociales, botón flotante de WhatsApp y **10 temas de color**.
Sin dependencias ni compilación: HTML, CSS y JavaScript nativo.

```
Logo       https://i.ibb.co/mhw9LGh/DJ-WILMER-PNG-ORIGINAL.png
Audio      https://stream.zeno.fm/zzrxpmz2mv8uv
Metadatos  https://api.zeno.fm/mounts/metadata/subscribe/zzrxpmz2mv8uv
WhatsApp   https://chat.whatsapp.com/HjONHx6yKRDJsT6LiTwKjF
```

## Cómo abrirlo

Hace falta servirlo por `http(s)`. Abrir `index.html` con doble clic funciona
salvo el service worker (que exige servidor) y los metadatos (que exigen `http`).

```powershell
python tools\serve.py 8731     # luego abre http://127.0.0.1:8731
```

Sirve en cualquier hosting estático: Netlify, Vercel, Cloudflare Pages, GitHub
Pages, nginx, `npx serve`. **En producción, HTTPS es obligatorio** para que la
app sea instalable.

## Los 10 temas

Se cambian desde **Temas** (botón rápido, menú lateral o el menú inferior).
El color se guarda y se aplica a botones, chips, ecualizador, foco y barra del
navegador.

| Tema | Color | |
|---|---|---|
| Azul Caribe | turquesa | tema por defecto |
| Azul Profundo | azul | |
| Verde Esmeralda | verde | |
| Morado | morado | |
| Menta | verde azulado | |
| Verde Neón | lima | |
| Magenta | fucsia | |
| Atardecer | naranja | |
| Dorado DJ | dorado | |
| Noche Índigo | índigo | |

## Qué incluye

**Reproducción**
- Audio en vivo con play/pausa, volumen, silencio y estado de carga.
- Reconexión automática con espera progresiva si se corta el stream.
- Ecualizador de 26 barras detrás de la carátula, alimentado por Web Audio
  (con animación de reserva si el navegador no deja analizar el stream).
- Media Session: título, artista y portada en la pantalla de bloqueo.
- Tecla `Espacio` para play/pausa. Volumen y tema se recuerdan.

**Metadatos e historial**
- Conexión SSE a la API de Zeno.fm: artista, título y hora en vivo.
- "Artista - Título" se separa solo, limpiando prefijos como `(320)` o `- 128k`.
- Historial de hasta 30 canciones, guardado en el dispositivo, con copiar
  título, copiar la lista completa y limpiar.
- Se refresca al volver a primer plano.

**Menú y hojas**
- Menú lateral con 9 accesos: temas, historial, redes, ajustes, grupo de
  WhatsApp, instalar, calificar, compartir y políticas.
- Hojas inferiores: Temas, Historial, Redes y Ajustes.
- Se abre deslizando desde el borde izquierdo; se cierra con `Esc`.

**Redes sociales**
- 8 iconos en el reproductor y en la hoja de redes: WhatsApp, Facebook,
  Instagram, YouTube, TikTok, X, Spotify y web.
- Cada enlace se edita desde la hoja de Redes (nombre y URL) y se guarda.

**Botón flotante de WhatsApp**
- Apunta al grupo de WhatsApp, es **arrastrable** y recuerda su posición.
- Indicador de mensajes nuevos con pulso.

**Personalización**
- Fondo: ilustración propia de una chica escuchando música
  (`assets/img/bg-girl.svg`), una foto por URL o una imagen subida desde el
  dispositivo. Se aplica también como fondo difuminado.
- Logo/carátula: por URL, con botón para volver al original.

**Efectos**
- Fondo con degradado animado, halo pulsante y partículas en canvas.
- Cristal esmerilado, brillo en la carátula, reflejo, anillo punteado giratorio
  alrededor del play y onda expansiva al tocar.
- Se pueden desactivar los efectos y el logo giratorio, y forzar movimiento
  reducido.

**PWA**
- `manifest.webmanifest` con iconos 64/180/192/512 y maskable, color de tema y
  2 accesos directos.
- Service worker: shell cacheado para arrancar sin conexión; audio y metadatos
  siempre por red.
- Aviso de "toca ▶" cuando el navegador bloquea el autoplay.

## Estructura

```
index.html                 Estructura + sprite SVG de iconos
manifest.webmanifest       Metadatos de la PWA
sw.js                      Service worker
css/styles.css             Tokens de tema, layout, efectos, responsive
js/config.js               URLs, redes sociales y ajustes por defecto  <- edita aquí
js/store.js                Preferencias e historial en localStorage
js/theme.js                Los 10 temas
js/api.js                  Metadatos de Zeno.fm (SSE) y limpieza de titulos
js/player.js               Audio, ecualizador, reconexion, Media Session
js/ui.js                   Menu, hojas, ajustes, boton flotante, particulas
js/app.js                  Arranque
assets/img/bg-girl.svg     Fondo: chica con auriculares escuchando musica
assets/icons/*.png         Iconos de la app
tools/serve.py             Servidor local multi-hilo
tools/make-icons.ps1       Regenera los iconos PNG
tools/probe.py             Prueba automatica por DevTools Protocol
```

## Personalizar

**Cambiar radio, logo o redes** — `js/config.js`. Si editas la lista `social`,
pulsa "Restaurar enlaces por defecto" en la hoja de Redes (o borra
`djwilmer.zeno.prefs.v1` del almacenamiento local) para que se adopten los
valores nuevos.

**Cambiar o añadir temas** — `js/theme.js` (`id`, `name`, `hue`, `hue2`,
`grad`). El CSS solo necesita recibir `--hue` y `--hue2`.

**Cambiar colores de un tema** — el degradado `grad` de `js/theme.js` alimenta
fondo, menú, hojas y botón de instalar.

**Regenerar iconos** (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
```

## Comprobado en navegador

`tools/probe.py` carga la app en Edge/Chrome headless, la prueba y la deja
screenshot. Última ejecución: 10 tarjetas de tema activas, 8 redes, 26 barras de
ecualizador animándose, metadatos en vivo llegando de Zeno.fm, historial
llenándose, audio en `readyState 3` con la pista sonando, menú y hojas
abriendo, cambio de tema persistido en `localStorage`, manifest con 5 iconos y 2
accesos, service worker registrado, botón flotante sin solaparse con la barra
inferior en 360×640, 390×844, 768×1024 y 1440×900, y **cero errores de
JavaScript**.

```powershell
python tools\serve.py 8731
python tools\probe.py
```

## Notas

- El navegador puede bloquear el autoplay: aparece un aviso para tocar ▶.
- `localStorage` ronda 5 MB por origen: no subas imágenes de más de 1500 px
  como fondo (usa una URL en su lugar).
- El historial es local: si borras los datos del sitio, se limpia.
- El endpoint de historial de Zeno.fm devuelve lista vacía, así que el historial
  se arma con los cambios de título que llegan por el stream.