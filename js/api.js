/* =========================================================
   Metadatos e historial — Zeno.fm (SSE)
   Endpoint: /mounts/metadata/subscribe/<mount>
   Envía:    event:message  data:{"streamTitle":"Artista - Título"}
   ========================================================= */
(function () {
  'use strict';

  var es = null;          // EventSource
  var retry = 0;
  var timer = null;
  var listeners = { data: [], status: [] };
  var lastRaw = '';

  function emit(type, payload) {
    (listeners[type] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error('[meta]', e); }
    });
  }

  /** Quita prefijos/sufijos típicos de los Shoutcast/Icy: "(320)", "- 128k", etc. */
  function clean(text) {
    return String(text || '')
      .replace(/^\s*[-–—]\s*/, '')
      .replace(/\((?:live|on air|320|256|192|128)\)/ig, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "Artista - Título" -> { artist, title }. Si no hay guion, el texto va al título. */
  function splitTitle(raw) {
    var text = clean(raw);
    if (!text) return { artist: '', title: '' };
    var m = text.match(/^(.{1,60}?)\s+[-–]\s+(.+)$/);
    if (m) return { artist: clean(m[1]), title: clean(m[2]) };
    return { artist: '', title: text };
  }

  function parse(raw) {
    var d;
    try {
      d = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!d) return null;

    var title = d.streamTitle || d.title || d.song || d.now_playing || '';
    var s = splitTitle(title);
    var artist = clean(d.artist || d.djName || '') || s.artist;
    var song = clean(d.title || d.song || '') || s.title;

    return {
      raw: title,
      artist: artist,
      title: song || clean(title),
      art: d.artwork || d.art || d.cover || '',
      listeners: d.listenerCount || d.listeners || null,
      bitrate: d.bitrate || null,
      dj: clean(d.djName || d.dj || '') || artist,
      history: Array.isArray(d.songHistory) ? d.songHistory : null,
      time: Date.now()
    };
  }

  function connect() {
    disconnect(true);
    emit('status', { state: 'connecting' });

    try {
      es = new EventSource(APP_CONFIG.brand.metaUrl);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    es.onopen = function () {
      retry = 0;
      emit('status', { state: 'live' });
    };

    es.onmessage = function (ev) {
      var payload = parse(ev.data);
      if (!payload) return;
      lastRaw = ev.data;
      if (payload.title) Store.addHistory(payload);
      emit('data', payload);
    };

    es.addEventListener('ping', function () { /* latido del servidor */ });

    es.onerror = function () {
      emit('status', { state: 'reconnecting' });
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    disconnect(true);
    var wait = Math.min(
      APP_CONFIG.player.reconnectMax,
      APP_CONFIG.player.reconnectBase * Math.pow(1.6, retry++)
    );
    clearTimeout(timer);
    timer = setTimeout(connect, wait * 1000);
  }

  function disconnect(soft) {
    if (es) {
      es.onmessage = es.onopen = es.onerror = null;
      try { es.close(); } catch (e) {}
      es = null;
    }
    if (!soft) emit('status', { state: 'offline' });
  }

  window.MetaAPI = {
    connect: connect,
    disconnect: disconnect,
    refresh: connect,
    splitTitle: splitTitle,
    lastRaw: function () { return lastRaw; },
    on: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
      return function () {
        listeners[type] = listeners[type].filter(function (f) { return f !== fn; });
      };
    }
  };
})();