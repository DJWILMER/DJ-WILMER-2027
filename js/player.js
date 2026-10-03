/* =========================================================
   Motor de audio: stream en vivo, visualizador, reconexión,
   Media Session yEqualizer.
   ========================================================= */
(function () {
  'use strict';

  var audio, ctx, analyser, srcNode, rafId = null;
  var bars = [];
  var retries = 0;
  var wantPlay = false;
  var listeners = { state: [], level: [], error: [] };

  function emit(type, payload) {
    (listeners[type] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[player]', e); }
    });
  }

  function build() {
    audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.src = APP_CONFIG.brand.streamUrl;
    audio.referrerPolicy = APP_CONFIG.player.referrerPolicy;
    audio.loop = false;

    audio.addEventListener('playing', function () {
      retries = 0;
      emit('state', { playing: true, buffering: false });
      startVisualizer();
      syncMediaSession();
    });
    audio.addEventListener('pause', function () {
      emit('state', { playing: false, buffering: false });
      stopVisualizer();
    });
    audio.addEventListener('waiting', function () {
      emit('state', { buffering: true });
    });
    audio.addEventListener('playing', function () { emit('state', { buffering: false }); });
    audio.addEventListener('error', function () {
      emit('error', { code: audio.error ? audio.error.code : 0 });
      scheduleReconnect();
    });
    audio.addEventListener('ended', function () { scheduleReconnect(); });
    audio.addEventListener('volumechange', syncVolume);
  }

  function connectGraph() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
      }
      if (!analyser) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.78;
      }
      if (!srcNode) {
        srcNode = ctx.createMediaElementSource(audio);
        srcNode.connect(analyser);
        analyser.connect(ctx.destination);
      }
      return true;
    } catch (e) {
      console.warn('[player] Web Audio no disponible:', e);
      return false;
    }
  }

  function startVisualizer() {
    bars = Array.from({ length: 14 }, function () { return 0.18; });
    if (!connectGraph()) return fakeVisualizer();
    if (ctx.state === 'suspended') ctx.resume();
    var data = new Uint8Array(analyser.frequencyBinCount);
    cancelAnimationFrame(rafId);

    (function loop() {
      analyser.getByteFrequencyData(data);
      var step = Math.max(1, Math.floor(data.length / bars.length));
      for (var i = 0; i < bars.length; i++) {
        var sum = 0;
        for (var j = 0; j < step; j++) sum += data[i * step + j] || 0;
        var level = Math.min(1, (sum / step / 255) * 1.9);
        bars[i] += (level - bars[i]) * 0.32;
      }
      paint();
      emit('level', bars.slice());
      rafId = requestAnimationFrame(loop);
    })();
  }

  /* Reserva sintética: si el navegador no deja analizar el stream,
     el ecualizador sigue latiendo con una onda suave. */
  function fakeVisualizer() {
    var t = 0;
    cancelAnimationFrame(rafId);
    (function loop() {
      t += 0.05;
      for (var i = 0; i < bars.length; i++) {
        var v = 0.2 + Math.abs(Math.sin(t + i * 0.55)) * 0.45;
        bars[i] += (v - bars[i]) * 0.2;
      }
      paint();
      emit('level', bars.slice());
      rafId = requestAnimationFrame(loop);
    })();
  }

  function paint() {
    var out = [];
    for (var i = 0; i < bars.length; i++) {
      out.push(Math.round(12 + bars[i] * 88));
    }
    window.dispatchEvent(new CustomEvent('djw:levels', { detail: out }));
  }

  function stopVisualizer() {
    cancelAnimationFrame(rafId);
    rafId = null;
    bars = bars.map(function () { return 0.18; });
    paint();
  }

  function scheduleReconnect() {
    if (!wantPlay) return;
    var wait = Math.min(
      APP_CONFIG.player.reconnectMax,
      APP_CONFIG.player.reconnectBase * Math.pow(1.7, retries++)
    );
    setTimeout(function () {
      if (!wantPlay) return;
      audio.src = APP_CONFIG.brand.streamUrl + (APP_CONFIG.brand.streamUrl.indexOf('?') > -1 ? '&' : '?') + 'r=' + Date.now();
      audio.load();
      audio.play().catch(function () {});
    }, wait * 1000);
  }

  function syncVolume() {
    if (!audio) return;
    audio.volume = audio.muted ? 0 : Store.get().volume;
    Store.set('volume', audio.volume);
    Store.set('muted', audio.muted);
    emit('state', { volume: audio.volume, muted: audio.muted });
  }

  function syncMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var meta = window.UI ? window.UI.currentMeta() : { title: 'DJ WILMER EN VIVO', artist: '', art: '' };
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title || 'DJ WILMER EN VIVO',
      artist: meta.artist || 'STREAMING.DELGADO',
      album: 'Radio en vivo',
      artwork: [{
        src: meta.art || APP_CONFIG.brand.logo,
        sizes: '512x512',
        type: 'image/png'
      }]
    });
    navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  }

  var Player = {
    init: function () {
      build();
      var prefs = Store.get();
      audio.volume = prefs.volume;
      audio.muted = !!prefs.muted;

      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', function () { Player.play(); });
        navigator.mediaSession.setActionHandler('pause', function () { Player.pause(); });
        navigator.mediaSession.setActionHandler('stop', function () { Player.pause(); });
      }

      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && wantPlay && audio.paused) {
          audio.play().catch(function () {});
        }
      });

      return this;
    },

    get element() { return audio; },

    play: function () {
      if (!audio) this.init();
      wantPlay = true;
      connectGraph();
      var p = audio.play();
      if (p && p.catch) {
        p.catch(function () {
          emit('error', { blocked: true });
          emit('state', { playing: false, buffering: false });
        });
      }
      syncMediaSession();
    },

    pause: function () {
      wantPlay = false;
      if (audio) audio.pause();
      syncMediaSession();
    },

    toggle: function () {
      if (!audio || audio.paused) this.play();
      else this.pause();
      return audio ? !audio.paused : false;
    },

    get playing() { return !!audio && !audio.paused; },

    /** Refresca los metadatos de la pantalla de bloqueo. */
    sync: function () {
      syncMediaSession();
    },

    setVolume: function (v) {
      v = Math.max(0, Math.min(1, v));
      if (audio) { audio.volume = v; audio.muted = v === 0; }
      syncVolume();
    },

    toggleMute: function () {
      if (!audio) return false;
      audio.muted = !audio.muted;
      syncVolume();
      return audio.muted;
    },

    on: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      return function () {
        listeners[type] = listeners[type].filter(function (f) { return f !== fn; });
      };
    }
  };

  window.Player = Player;
})();