/* =========================================================
   Temas (10) — colores azul, verde, morado y azul caribeño
   Cada tema define --hue/--hue2 y el degradado de fondo.
   ========================================================= */
(function () {
  'use strict';

  var THEMES = [
    { id: 'caribe',  name: 'Azul Caribe',      emoji: '&#127754;', hue: 190, hue2: 205, grad: 'linear-gradient(160deg,#063a4f 0%,#0a6f8f 45%,#12b3c9 100%)' },
    { id: 'azul',    name: 'Azul Profundo',    emoji: '&#128089;', hue: 218, hue2: 232, grad: 'linear-gradient(160deg,#0b1a3a 0%,#15307a 45%,#2f6bff 100%)' },
    { id: 'verde',   name: 'Verde Esmeralda',  emoji: '&#128090;', hue: 152, hue2: 168, grad: 'linear-gradient(160deg,#04231a 0%,#0a6b4a 45%,#16c98d 100%)' },
    { id: 'morado',  name: 'Morado',           emoji: '&#128092;', hue: 272, hue2: 292, grad: 'linear-gradient(160deg,#1c0f3a 0%,#4a1f9c 45%,#9b4dff 100%)' },
    { id: 'menta',   name: 'Menta',            emoji: '&#127811;', hue: 168, hue2: 152, grad: 'linear-gradient(160deg,#042420 0%,#0c6b60 45%,#2ee6c4 100%)' },
    { id: 'neon',    name: 'Verde Neón',       emoji: '&#9889;', hue: 96,  hue2: 160, grad: 'linear-gradient(160deg,#04231a 0%,#146b2c 40%,#a3e635 100%)' },
    { id: 'electrico', name: 'Magenta',        emoji: '&#128151;', hue: 322, hue2: 278, grad: 'linear-gradient(160deg,#2a0a2b 0%,#8a1470 45%,#ff4fb0 100%)' },
    { id: 'ocaso',   name: 'Atardecer',        emoji: '&#127751;', hue: 22,  hue2: 320, grad: 'linear-gradient(160deg,#2b0f2c 0%,#a8391b 45%,#ff9d3d 100%)' },
    { id: 'dorado',  name: 'Dorado DJ',        emoji: '&#128081;', hue: 44,  hue2: 34,  grad: 'linear-gradient(160deg,#2b1e02 0%,#8a6308 45%,#f0cb14 100%)' },
    { id: 'noche',   name: 'Noche Índigo',     emoji: '&#127747;', hue: 246, hue2: 224, grad: 'linear-gradient(160deg,#05060f 0%,#151a4a 45%,#4f5bd5 100%)' }
  ];

  var Theme = {
    list: THEMES,

    get: function (id) {
      for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === id) return THEMES[i];
      }
      return THEMES[0];
    },

    current: function () {
      return this.get(Store.get().theme);
    },

    /** Aplica un tema y refleja su color en la barra del navegador. */
    apply: function (id) {
      var t = this.get(id);
      var root = document.documentElement;
      root.setAttribute('data-theme', t.id);
      root.style.setProperty('--hue', t.hue);
      root.style.setProperty('--hue2', t.hue2);
      root.style.setProperty('--bg-grad', t.grad);
      root.style.setProperty('--accent', 'hsl(' + t.hue + ' 95% 60%)');
      root.style.setProperty('--accent-2', 'hsl(' + t.hue2 + ' 92% 62%)');
      Store.set('theme', t.id);

      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', 'hsl(' + t.hue + ' 60% 12%)');
      return t;
    },

    next: function () {
      var cur = Store.get().theme;
      var i = THEMES.findIndex(function (t) { return t.id === cur; });
      return this.apply(THEMES[(i + 1) % THEMES.length].id);
    },

    /** Etiquetas legibles: "DJ WILMER · Azul Caribe" */
    title: function (id) {
      var t = this.get(id);
      return APP_CONFIG.brand.name + ' · ' + t.name;
    }
  };

  window.Theme = Theme;
})();