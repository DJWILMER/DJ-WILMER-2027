/* =========================================================
   Preferencias persistentes (localStorage)
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'djwilmer.zeno.prefs.v1';
  var HISTORY_KEY = 'djwilmer.zeno.history.v1';

  var defaults = {
    theme: 'caribe',
    volume: 0.85,
    muted: false,
    social: null,
    background: '',
    effects: true,
    reducedMotion: false,
    rotateLogo: true,
    autoPlay: false
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var val = JSON.parse(raw);
      return val === null || val === undefined ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* modo privado o cuota llena */ }
  }

  var Store = {
    defaults: defaults,

    get: function () {
      var saved = read(KEY, {});
      var out = {};
      for (var k in defaults) {
        out[k] = saved[k] === undefined ? defaults[k] : saved[k];
      }
      return out;
    },

    set: function (key, value) {
      var prefs = this.get();
      prefs[key] = value;
      write(KEY, prefs);
      return prefs;
    },

    reset: function () {
      write(KEY, defaults);
      return this.get();
    },

    /* ---------- Historial de canciones ---------- */
    history: function () {
      var list = read(HISTORY_KEY, []);
      return Array.isArray(list) ? list : [];
    },

    /**
     * Añade una canción al historial (más reciente primero).
     * Ignora duplicados y entradas vacías.
     */
    addHistory: function (entry) {
      if (!entry || !entry.title) return this.history();
      var list = this.history();
      var key = (entry.title || '').trim().toLowerCase();
      var exists = list.some(function (it) {
        return (it.title || '').trim().toLowerCase() === key;
      });
      if (exists) return list;

      list.unshift({
        title: entry.title,
        artist: entry.artist || '',
        time: entry.time || Date.now(),
        art: entry.art || ''
      });
      if (list.length > APP_CONFIG.player.historyMax) {
        list = list.slice(0, APP_CONFIG.player.historyMax);
      }
      write(HISTORY_KEY, list);
      return list;
    },

    clearHistory: function () {
      write(HISTORY_KEY, []);
      return [];
    }
  };

  window.Store = Store;
})();