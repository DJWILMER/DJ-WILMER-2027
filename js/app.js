/* =========================================================
   Arranque de DJ WILMER
   ========================================================= */
(function () {
  'use strict';

  function boot() {
    if (!window.APP_CONFIG) {
      document.body.innerHTML = '<p style="padding:40px;color:#fff;font-family:sans-serif">Falta js/config.js</p>';
      return;
    }

    Player.init();
    UI.init();

    /* Estado del reproductor -> clases del body */
    Player.on('state', function (s) {
      if (s.playing !== undefined) {
        document.body.classList.toggle('playing', s.playing);
        if (s.playing) UI.toast ? null : null;
      }
      if (s.buffering !== undefined) document.body.classList.toggle('buffering', s.buffering);
      if (s.volume !== undefined) {
        document.body.classList.toggle('muted', s.muted);
      }
    });

    Player.on('error', function (e) {
      if (e.blocked) {
        var hint = document.getElementById('hint');
        if (hint) hint.hidden = false;
      } else if (e.code === 4 || e.code === 2) {
        document.body.classList.add('buffering');
      }
    });

    /* Metadatos en vivo */
    MetaAPI.on('data', function (d) { UI.onMeta(d); });
    MetaAPI.on('status', function (s) {
      if (s.state === 'reconnecting') {
        document.body.classList.add('buffering');
      } else if (s.state === 'live') {
        document.body.classList.remove('buffering');
      }
    });
    MetaAPI.connect();

    /* Refresca el historial al volver a la app */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        MetaAPI.refresh();
        UI.renderHistory();
      }
    });

    /* Autoplay opcional (normalmente bloqueado: se muestra el aviso) */
    if (Store.get().autoPlay) {
      Player.play();
      document.getElementById('hint').hidden = true;
    }

    /* Service worker */
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (err) {
          console.warn('[sw] No se pudo registrar:', err);
        });
      });
    }

    /* Sin conexión */
    window.addEventListener('offline', function () { UI.toast('Sin conexión — reintentando…'); });
    window.addEventListener('online', function () { UI.toast('Conexión restablecida'); MetaAPI.refresh(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();