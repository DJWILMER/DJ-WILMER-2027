/* =========================================================
   Interfaz: menú, hojas, temas, historial, ajustes,
   botón flotante de WhatsApp, partículas y avisos.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var el = {
    body: document.body,
    drawer: $('#drawer'), scrim: $('#scrim'), btnMenu: $('#btnMenu'), btnCloseMenu: $('#btnCloseMenu'),
    wrap: $('#sheetWrap'), panel: $('#sheetPanel'),
    themeGrid: $('#themeGrid'), historyList: $('#historyList'), socialList: $('#socialList'), socials: $('#socials'),
    artist: $('#artist'), song: $('#song'), stats: $('#stats'), albumArt: $('#albumArt'),
    nowPillText: $('#nowPillText'), drawerTheme: $('#drawerTheme'), drawerLogo: $('#drawerLogo'),
    fab: $('#fabWa'), toast: $('#toast'), hint: $('#hint'),
    bgPhoto: $('#bgPhoto'), bgBlur: $('#bgBlur'), particles: $('#particles'),
    vol: $('#vol'), volOut: $('#volOut'),
    optRotate: $('#optRotate'), optEffects: $('#optEffects'), optReduced: $('#optReduced'),
    inpBg: $('#inpBg'), inpLogo: $('#inpLogo'), inpWa: $('#inpWa'), fileBg: $('#fileBg'),
    drawerWa: $('#drawerWa'), drawerInstall: $('#drawerInstall'), drawerShare: $('#drawerShare')
  };

  var meta = { artist: 'DJ WILMER', title: '', art: '', listeners: null, bitrate: null };
  var toastTimer = null;
  var deferredInstall = null;

  /* ---------------- Aviso (toast) ---------------- */
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('on'); }, 2200);
  }

  /* ---------------- Menú lateral ---------------- */
  function openMenu() {
    el.drawer.classList.add('on');
    el.scrim.classList.add('on');
    el.btnMenu.classList.add('on');
    el.btnMenu.setAttribute('aria-expanded', 'true');
    el.drawer.setAttribute('aria-hidden', 'false');
  }
  function closeMenu() {
    el.drawer.classList.remove('on');
    el.scrim.classList.remove('on');
    el.btnMenu.classList.remove('on');
    el.btnMenu.setAttribute('aria-expanded', 'false');
    el.drawer.setAttribute('aria-hidden', 'true');
  }
  function toggleMenu() {
    el.drawer.classList.contains('on') ? closeMenu() : openMenu();
  }

  /* ---------------- Hojas ---------------- */
  var openSheetId = null;

  function openSheet(id) {
    if (openSheetId === id) { closeSheet(); return; }
    openSheetId = id;
    closeMenu();
    $$('.sheet').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    el.wrap.classList.add('on');
    el.wrap.setAttribute('aria-hidden', 'false');
    if (id === 'sheetSettings') fillSettings();
  }
  function closeSheet() {
    openSheetId = null;
    el.wrap.classList.remove('on');
    el.wrap.setAttribute('aria-hidden', 'true');
    $$('.sheet').forEach(function (s) { s.classList.remove('on'); });
  }

  /* ---------------- Temas ---------------- */
  function buildThemes() {
    var cur = Store.get().theme;
    el.themeGrid.innerHTML = Theme.list.map(function (t) {
      return '<button class="theme-card' + (t.id === cur ? ' on' : '') + '" data-theme="' + t.id +
        '" style="--grad:' + t.grad + '">' +
        '<span class="tc-emoji">' + t.emoji + '</span>' +
        '<span class="tc-name">' + t.name + '</span></button>';
    }).join('');

    $$('.theme-card', el.themeGrid).forEach(function (card) {
      card.addEventListener('click', function () {
        var t = Theme.apply(card.dataset.theme);
        $$('.theme-card', el.themeGrid).forEach(function (c) { c.classList.toggle('on', c === card); });
        el.drawerTheme.textContent = t.name;
        document.title = Theme.title(t.id);
        toast('Tema ' + t.name + ' aplicado');
        paintBackground();
      });
    });
  }

  function syncOptions() {
    var p = Store.get();
    el.optRotate.checked = !!p.rotateLogo;
    el.optEffects.checked = !!p.effects;
    el.optReduced.checked = !!p.reducedMotion;
    el.body.classList.toggle('effects-off', !p.effects);
    el.body.classList.toggle('no-rotate', !p.rotateLogo);
    el.body.classList.toggle('reduced', !!p.reducedMotion);
    if (p.effects) startParticles(); else stopParticles();
  }

  /* ---------------- Fondo ---------------- */
  function paintBackground() {
    var custom = Store.get().background;
    var src = custom || APP_CONFIG.background.defaultArt;
    el.bgPhoto.style.backgroundImage = 'url("' + src + '")';
    el.bgBlur.style.backgroundImage = 'url("' + src + '")';
  }

  /* ---------------- Portada / logo ---------------- */
  function setArt(url) {
    meta.art = url;
    el.albumArt.src = url;
    el.drawerLogo.src = url;
  }

  /* ---------------- Redes sociales ---------------- */
  function getSocial() {
    var saved = Store.get().social;
    return Array.isArray(saved) && saved.length ? saved : APP_CONFIG.social;
  }

  function renderSocial() {
    var list = getSocial();
    var html = list.map(function (s) {
      return '<a href="' + s.url + '" target="_blank" rel="noopener" data-id="' + s.id + '" title="' + s.label + '" aria-label="' + s.label + '">' +
        '<svg><use href="#' + s.icon + '"></use></svg></a>';
    }).join('');
    el.socials.innerHTML = html;

    el.socialList.innerHTML = list.map(function (s, i) {
      return '<li><a href="' + s.url + '" target="_blank" rel="noopener" data-id="' + s.id + '">' +
        '<svg><use href="#' + s.icon + '"></use></svg><span>' + s.label + '</span>' +
        '<span class="edit" data-edit="' + i + '"><svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14.5 5.5 4 4"/></svg></span>' +
        '</a></li>';
    }).join('');

    $$('[data-edit]', el.socialList).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.preventDefault();
        editSocial(Number(b.dataset.edit));
      });
    });
  }

  function editSocial(i) {
    var list = getSocial().slice();
    var cur = list[i];
    var url = prompt('Enlace de ' + cur.label + ':', cur.url);
    if (url === null) return;
    var label = prompt('Nombre de la red:', cur.label);
    if (label === null) return;
    list[i] = { id: cur.id, label: label || cur.label, icon: cur.icon, url: url.trim() };
    Store.set('social', list);
    renderSocial();
    toast('Red actualizada');
  }

  /* ---------------- Historial ---------------- */
  function timeAgo(ts) {
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'ahora';
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' h';
    return Math.floor(s / 86400) + ' d';
  }

  function renderHistory() {
    var list = Store.history();
    if (!list.length) {
      el.historyList.innerHTML = '<li class="empty">Todavía no hay canciones en el historial.<br>En cuanto suene un tema nuevo aparecerá aquí.</li>';
      return;
    }
    el.historyList.innerHTML = list.map(function (it, i) {
      return '<li>' +
        '<span class="n">' + (i + 1) + '</span>' +
        '<span class="txt"><span class="t1">' + esc(it.title) + '</span>' +
        '<span class="t2">' + esc(it.artist || 'DJ WILMER') + ' · ' + timeAgo(it.time) + '</span></span>' +
        '<button class="go" data-copy="' + esc(it.title) + '" title="Copiar título" aria-label="Copiar título">' +
        '<svg viewBox="0 0 24 24"><path d="M9 9h11v11H9z"/><path d="M5 15H4V4h11v1"/></svg></button>' +
        '</li>';
    }).join('');

    $$('[data-copy]', el.historyList).forEach(function (b) {
      b.addEventListener('click', function () {
        copy(b.dataset.copy);
        toast('Título copiado');
      });
    });
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------------- Ajustes ---------------- */
  function fillSettings() {
    el.inpBg.value = Store.get().background || APP_CONFIG.background.photo || '';
    el.inpLogo.value = Store.get().logo || APP_CONFIG.brand.logo;
    el.inpWa.value = Store.get().waGroup || APP_CONFIG.whatsappGroup;
  }

  function share() {
    var data = {
      title: APP_CONFIG.brand.name + ' · Radio en vivo',
      text: 'Escucha ' + APP_CONFIG.brand.name + ' en vivo: ' + (meta.title || APP_CONFIG.brand.subtitle),
      url: APP_CONFIG.brand.appUrl
    };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else {
      copy(data.url);
      toast('Enlace copiado: ' + data.url);
    }
  }

  /* ---------------- Partículas ---------------- */
  var pctx = null, praf = null, dots = [];

  function startParticles() {
    if (praf) return;
    var c = el.particles;
    pctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    var W = function () { return c.clientWidth; };
    var H = function () { return c.clientHeight; };
    dots = Array.from({ length: Math.min(46, Math.round(window.innerWidth / 26)) }, function () {
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        r: Math.random() * 1.9 + .6,
        v: Math.random() * .28 + .08,
        a: Math.random() * .5 + .15
      };
    });
    (function loop() {
      pctx.clearRect(0, 0, W(), H());
      var hue = getComputedStyle(document.documentElement).getPropertyValue('--hue').trim() || '190';
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.y -= d.v;
        if (d.y < -4) { d.y = H() + 4; d.x = Math.random() * W(); }
        pctx.beginPath();
        pctx.fillStyle = 'hsla(' + hue + ',100%,80%,' + d.a + ')';
        pctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        pctx.fill();
      }
      praf = requestAnimationFrame(loop);
    })();
  }

  function stopParticles() {
    if (praf) cancelAnimationFrame(praf);
    praf = null;
    if (pctx) pctx.clearRect(0, 0, el.particles.clientWidth, el.particles.clientHeight);
  }

  function resize() {
    var c = el.particles;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.floor(c.clientWidth * dpr));
    c.height = Math.max(1, Math.floor(c.clientHeight * dpr));
    if (pctx) pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- Botón flotante arrastrable ---------------- */
  function initFab() {
    var node = el.fab;
    var drag = null;
    var KEY = 'djwilmer.zeno.fabpos.v1';

    function place(x, y, save) {
      var w = node.offsetWidth || 58, h = node.offsetHeight || 58;
      x = Math.max(8, Math.min(window.innerWidth - w - 8, x));
      y = Math.max(8, Math.min(window.innerHeight - h - 8, y));
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      node.style.right = 'auto';
      node.style.bottom = 'auto';
      if (save) { try { localStorage.setItem(KEY, JSON.stringify({ x: x, y: y })); } catch (e) {} }
    }

    function restore() {
      try {
        var p = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (p) place(p.x, p.y, false);
      } catch (e) {}
    }

    node.addEventListener('pointerdown', function (e) {
      var r = node.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
      node.setPointerCapture(e.pointerId);
      node.classList.add('dragging');
    });

    node.addEventListener('pointermove', function (e) {
      if (!drag) return;
      drag.moved = true;
      place(e.clientX - drag.dx, e.clientY - drag.dy, false);
    });

    node.addEventListener('pointerup', function (e) {
      if (!drag) return;
      node.classList.remove('dragging');
      var r = node.getBoundingClientRect();
      place(r.left, r.top, true);
      if (!drag.moved) {
        node.href = node.dataset.url || APP_CONFIG.whatsappGroup;
        window.open(node.href, '_blank', 'noopener');
      }
      drag = null;
    });

    node.href = APP_CONFIG.whatsappGroup;
    node.dataset.url = APP_CONFIG.whatsappGroup;
    restore();
    window.addEventListener('resize', function () {
      var r = node.getBoundingClientRect();
      if (r.left) place(r.left, r.top, true);
    });
  }

  /* ---------------- Ecualizador ---------------- */
  function initEq() {
    var ring = $('#eqRing');
    var n = 26;
    ring.innerHTML = new Array(n + 1).join('<b></b>');
    var bars = $$('b', ring);
    window.addEventListener('djw:levels', function (e) {
      var lv = e.detail;
      for (var i = 0; i < bars.length; i++) {
        var a = lv[i % lv.length];
        var b = lv[(i + 7) % lv.length];
        var v = (a + b) / 2;
        bars[i].style.height = (18 + v * 0.82) + '%';
        bars[i].style.opacity = 0.35 + v * 0.65;
      }
    });
  }

  /* ---------------- Eventos ---------------- */
  function bind() {
    el.btnMenu.addEventListener('click', toggleMenu);
    el.btnCloseMenu.addEventListener('click', closeMenu);
    el.scrim.addEventListener('click', function () { closeMenu(); closeSheet(); });

    $$('[data-sheet]').forEach(function (b) {
      b.addEventListener('click', function () { openSheet(b.dataset.sheet); });
    });
    $$('[data-close-sheet]').forEach(function (b) {
      b.addEventListener('click', closeSheet);
    });
    el.wrap.addEventListener('click', function (e) { if (e.target === el.wrap) closeSheet(); });
    $$('[data-link]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.link;
        window.open(k === 'review' ? APP_CONFIG.brand.reviewUrl : APP_CONFIG.brand.privacyUrl, '_blank', 'noopener');
      });
    });

    $('#btnShare').addEventListener('click', share);
    el.drawerShare.addEventListener('click', function () { closeMenu(); share(); });

    $('#btnClearHistory').addEventListener('click', function () {
      Store.clearHistory(); renderHistory(); toast('Historial vaciado');
    });
    $('#btnCopyHistory').addEventListener('click', function () {
      var txt = Store.history().map(function (h, i) { return (i + 1) + '. ' + h.title + (h.artist ? ' — ' + h.artist : ''); }).join('\n');
      if (!txt) return toast('No hay canciones que copiar');
      copy('DJ WILMER · Ahora suena\n\n' + txt);
      toast('Lista copiada');
    });

    el.optRotate.addEventListener('change', function () {
      Store.set('rotateLogo', el.optRotate.checked); syncOptions();
    });
    el.optEffects.addEventListener('change', function () {
      Store.set('effects', el.optEffects.checked); syncOptions();
    });
    el.optReduced.addEventListener('change', function () {
      Store.set('reducedMotion', el.optReduced.checked); syncOptions();
    });

    $('#btnApplyBg').addEventListener('click', function () {
      var v = el.inpBg.value.trim();
      if (v && !/^https?:\/\//i.test(v)) return toast('Usa una URL completa (https://…)');
      Store.set('background', v); paintBackground(); toast(v ? 'Fondo aplicado' : 'Fondo original');
    });
    $('#btnResetBg').addEventListener('click', function () {
      el.inpBg.value = ''; Store.set('background', ''); paintBackground(); toast('Fondo original');
    });
    $('#btnUploadBg').addEventListener('click', function () { el.fileBg.click(); });
    el.fileBg.addEventListener('change', function () {
      var f = el.fileBg.files && el.fileBg.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        Store.set('background', reader.result);
        paintBackground();
        toast('Imagen aplicada');
      };
      reader.readAsDataURL(f);
    });

    $('#btnApplyLogo').addEventListener('click', function () {
      var v = el.inpLogo.value.trim();
      if (!v) return;
      Store.set('logo', v); setArt(v); toast('Logo actualizado');
    });
    $('#btnResetLogo').addEventListener('click', function () {
      el.inpLogo.value = APP_CONFIG.brand.logo;
      Store.set('logo', ''); setArt(APP_CONFIG.brand.logo); toast('Logo original');
    });

    $('#btnApplyWa').addEventListener('click', function () {
      var v = el.inpWa.value.trim();
      if (!v) return toast('Escribe un enlace');
      Store.set('waGroup', v);
      el.fab.dataset.url = v; el.fab.href = v; el.drawerWa.href = v;
      toast('Grupo de WhatsApp guardado');
    });
    $('#btnResetSocial').addEventListener('click', function () {
      Store.set('social', null); renderSocial(); toast('Enlaces restaurados');
    });
    $('#btnResetAll').addEventListener('click', function () {
      if (!confirm('¿Restablecer temas, fondo, logo y redes por defecto?')) return;
      Store.reset();
      applyAll();
      closeSheet();
      toast('Configuración restablecida');
    });

    el.drawerWa.addEventListener('click', function () {
      el.drawerWa.href = Store.get().waGroup || APP_CONFIG.whatsappGroup;
    });

    $('#btnPlay').addEventListener('click', function () {
      var on = Player.toggle();
      el.hint.hidden = true;
    });
    $('#btnHistory').addEventListener('click', function () { openSheet('sheetHistory'); renderHistory(); });
    $('#btnMute').addEventListener('click', function () {
      Player.toggleMute();
      syncVolume();
    });
    el.vol.addEventListener('input', function () {
      Player.setVolume(Number(el.vol.value) / 100);
      syncVolume();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); closeMenu(); }
      if (e.code === 'Space' && !/input|textarea/i.test(e.target.tagName)) {
        e.preventDefault(); Player.toggle(); el.hint.hidden = true;
      }
    });

    /* Deslizar desde el borde izquierdo abre el menú */
    var sx = 0, sy = 0, swiping = false;
    document.addEventListener('touchstart', function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      swiping = sx < 34;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!swiping) return;
      var dx = e.touches[0].clientX - sx;
      var dy = Math.abs(e.touches[0].clientY - sy);
      if (dx > 46 && dy < 42) { openMenu(); swiping = false; }
    }, { passive: true });

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstall = e;
      el.drawerInstall.disabled = false;
      el.drawerInstall.innerHTML = '<svg><use href="#i-download"></use></svg> instalar aplicación';
    });
    el.drawerInstall.addEventListener('click', function () {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.then(function (r) {
          if (r.outcome === 'accepted') toast('Instalando DJ WILMER…');
          deferredInstall = null;
        });
      } else {
        toast('Abre el menú del navegador y elige «Agregar a la pantalla de inicio»');
      }
    });
    window.addEventListener('appinstalled', function () {
      toast('¡DJ WILMER instalado! Gracias por tu apoyo');
      el.drawerInstall.innerHTML = '<svg><use href="#i-check"></use></svg> app instalada';
    });
  }

  function syncVolume() {
    var v = Math.round((Store.get().volume || 0) * 100);
    el.vol.value = v;
    el.vol.style.setProperty('--fill', v + '%');
    el.volOut.textContent = v;
    el.body.classList.toggle('muted', !!Store.get().muted);
  }

  /* ---------------- Datos en vivo ---------------- */
  function applyMeta(d) {
    meta.artist = d.artist || meta.artist;
    meta.title = d.title || meta.title;
    if (d.art) meta.art = d.art;
    el.artist.textContent = (d.artist || 'DJ WILMER').toUpperCase();
    el.song.textContent = d.title || 'Sin información de la canción';
    el.nowPillText.textContent = d.artist ? 'SONANDO AHORA · ' + d.artist : 'SONANDO AHORA';
    if (d.art) setArt(d.art);

    var bits = [];
    if (d.listeners != null) bits.push(d.listeners + ' oyentes');
    if (d.bitrate) bits.push(d.bitrate + ' kbps');
    bits.push('Zeno.fm');
    el.stats.textContent = bits.join('   ·   ');
    el.stats.hidden = false;

    renderHistory();
    Player.sync();
  }

  /* ---------------- Aplicar todo ---------------- */
  function applyAll() {
    var p = Store.get();
    var t = Theme.apply(p.theme);
    el.drawerTheme.textContent = t.name;
    document.title = Theme.title(p.theme);
    buildThemes();
    syncOptions();
    renderSocial();
    renderHistory();
    paintBackground();
    setArt(p.logo || APP_CONFIG.brand.logo);
    el.fab.dataset.url = p.waGroup || APP_CONFIG.whatsappGroup;
    el.fab.href = el.fab.dataset.url;
    el.drawerWa.href = el.fab.dataset.url;
    syncVolume();
  }

  window.UI = {
    init: function () {
      initEq();
      bind();
      applyAll();
      return this;
    },
    toast: toast,
    currentMeta: function () { return meta; },
    onMeta: applyMeta,
    renderHistory: renderHistory,
    share: share,
    openSheet: openSheet,
    closeSheet: closeSheet
  };
})();