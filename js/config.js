/* =========================================================
   DJ WILMER EN VIVO — Configuración central
   Edita aquí las URLs: stream, metadatos, logo, redes, grupo.
   ========================================================= */
window.APP_CONFIG = {
  brand: {
    name: 'DJ WILMER',
    subtitle: 'EN VIVO',
    streamUrl: 'https://stream.zeno.fm/zzrxpmz2mv8uv',
    metaUrl: 'https://api.zeno.fm/mounts/metadata/subscribe/zzrxpmz2mv8uv',
    logo: 'https://i.ibb.co/mhw9LGh/DJ-WILMER-PNG-ORIGINAL.png',
    appUrl: 'https://wilmerdelgadocieza.blogspot.com/djwilmer',
    reviewUrl: 'https://de-todo-para-tu-emisora-ptd8.vercel.app//djwilmer#comentariosdemegaplay',
    privacyUrl: 'https://wilmerdelgadocieza.blogspot.com/'
  },

  /* Fondo por defecto: ilustración local de una chica escuchando música.
     Puedes sustituirlo por una foto (URL) o subir una imagen desde Ajustes. */
  background: {
    defaultArt: 'assets/img/bg-girl.svg',
    /* Ejemplo de foto remota:
       photo: 'https://tunaimagen.com/fondo.jpg' */
    photo: ''
  },

  /* Grupo de WhatsApp flotante */
  whatsappGroup: 'https://chat.whatsapp.com/HjONHx6yKRDJsT6LiTwKjF',

  /* Redes sociales del menú */
  social: [
    { id: 'whatsapp', label: 'WhatsApp', icon: 'i-whatsapp', url: 'https://wa.me/', color: '#25D366' },
    { id: 'facebook', label: 'Facebook', icon: 'i-facebook', url: 'https://www.facebook.com/', color: '#1877F2' },
    { id: 'instagram', label: 'Instagram', icon: 'i-instagram', url: 'https://www.instagram.com/', color: '#E1306C' },
    { id: 'youtube', label: 'YouTube', icon: 'i-youtube', url: 'https://www.youtube.com/', color: '#FF0000' },
    { id: 'tiktok', label: 'TikTok', icon: 'i-tiktok', url: 'https://www.tiktok.com/@djchochobarwilmer', color: '#25F4EE' },
    { id: 'x', label: 'X', icon: 'i-x', url: 'https://x.com/', color: '#e7e9ea' },
    { id: 'spotify', label: 'Spotify', icon: 'i-spotify', url: 'https://open.spotify.com/', color: '#1DB954' },
    { id: 'web', label: 'Web', icon: 'i-web', url: 'https://wilmerdelgadocieza.blogspot.com/', color: '#f0cb14' }
  ],

  player: {
    /* Segundos antes de reconectar tras una caída */
    reconnectBase: 2,
    reconnectMax: 20,
    /* Máximo de canciones guardadas en el historial */
    historyMax: 30,
    /* Envío del Referer hacia el stream (algunosICY lo requieren) */
    referrerPolicy: 'no-referrer-when-downgrade'
  },

  pwa: {
    cacheName: 'dj-wilmer-zeno-v1',
    shell: [
      './',
      './index.html',
      './css/styles.css',
      './js/config.js',
      './js/store.js',
      './js/theme.js',
      './js/api.js',
      './js/player.js',
      './js/ui.js',
      './js/app.js',
      './assets/img/bg-girl.svg',
      './manifest.webmanifest'
    ]
  }
};