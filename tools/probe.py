"""Prueba automatica del reproductor DJ WILMER via Chrome DevTools Protocol.

    python tools/probe.py [url]

Levanta Edge en modo headless, carga la app, recoge errores de consola,
verifica el DOM tras unos segundos y comprueba el manifest.
"""
import asyncio
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

import websockets

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8731/index.html"
EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]
PORT = 9333


def find_edge():
    for c in EDGE_CANDIDATES:
        if os.path.exists(c):
            return c
    raise SystemExit("No se encontro Edge/Chrome")


def fetch_json(url, tries=40):
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(0.25)
    raise SystemExit("No se pudo hablar con el navegador en %s" % url)


CHECKS_AUDIO_CLICK = r"""
(() => {
  const b = document.getElementById('btnPlay').getBoundingClientRect();
  return JSON.stringify({ x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) });
})()
"""

CHECKS_AUDIO = r"""
(async () => {
  await new Promise(r => setTimeout(r, 5000));
  const a = Player.element;
  const cs = (s, p) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null; };
  const bar = document.querySelector('#eqRing b');
  return JSON.stringify({
    bodyPlaying: document.body.classList.contains('playing'),
    audioSrc: (a.currentSrc || a.src || '').slice(0, 60),
    readyState: a.readyState,
    networkState: a.networkState,
    error: a.error ? a.error.code : null,
    paused: a.paused,
    volume: Math.round(a.volume * 100),
    hintVisible: !document.getElementById('hint').hidden,
    eqBarAltura: bar ? bar.style.height : null,
    canvas: document.getElementById('particles').width + 'x' + document.getElementById('particles').height,
    fondoBlur: cs('#bgBlur', 'backgroundImage').slice(0, 60)
  });
})()
"""

CHECKS_LOAD = r"""
(() => JSON.stringify({
  config: typeof APP_CONFIG,
  store: typeof Store,
  theme: typeof Theme,
  meta: typeof MetaAPI,
  player: typeof Player,
  ui: typeof UI,
  scripts: Array.from(document.scripts).map(s => s.src.split('/').pop()).join(',')
}))()
"""

CHECKS = r"""
(() => {
  const q = s => document.querySelector(s);
  const qa = s => Array.from(document.querySelectorAll(s));
  const r = {};
  r.title = document.title;
  r.tema = document.documentElement.getAttribute('data-theme');
  r.hue = getComputedStyle(document.documentElement).getPropertyValue('--hue').trim();
  r.tarjetasTema = qa('.theme-card').length;
  r.tarjetaActiva = q('.theme-card.on') ? q('.theme-card.on').dataset.theme : null;
  r.redes = qa('#socials a').length;
  r.redesIds = qa('#socials a').map(a => a.dataset.id).join(',');
  r.barrasEq = qa('#eqRing b').length;
  r.artista = q('#artist').textContent.trim();
  r.cancion = q('#song').textContent.trim();
  r.historial = qa('#historyList li').length;
  r.historialTexto = qa('#historyList .t1').slice(0,3).map(e => e.textContent.trim()).join(' | ');
  r.logoSrc = q('#albumArt').getAttribute('src');
  r.fondo = getComputedStyle(q('#bgPhoto')).backgroundImage.slice(0, 90);
  r.drawerTheme = q('#drawerTheme').textContent.trim();
  r.fabHref = q('#fabWa').getAttribute('href');
  r.sw = !!navigator.serviceWorker.controller || (navigator.serviceWorker.getRegistrations ? 'registrando' : 'no');
  r.vol = q('#vol').value;
  r.volFill = q('#vol').style.getPropertyValue('--fill');
  r.iconosSprite = qa('.sprite symbol').length;
  r.playBtn = !!q('#btnPlay');
  return JSON.stringify(r);
})()
"""

CHECKS_PC = r"""
(() => {
  const p = document.querySelector('.player');
  const cs = getComputedStyle(p);
  const r = {
    playerWidth: Math.round(p.getBoundingClientRect().width),
    borderRadius: cs.borderRadius,
    backdrop: cs.backdropFilter || cs.webkitBackdropFilter,
    stageH: Math.round(document.querySelector('.stage').getBoundingClientRect().height),
    overflowBody: document.body.scrollHeight - window.innerHeight
  };
  return JSON.stringify(r);
})()
"""

CHECKS_MENU = r"""
(() => {
  document.getElementById('btnMenu').click();
  const open = document.getElementById('drawer').classList.contains('on');
  const items = document.querySelectorAll('.drawer-item').length;
  document.querySelector('[data-sheet="sheetThemes"]').click();
  const sheet = document.getElementById('sheetWrap').classList.contains('on');
  const visible = document.querySelector('.sheet.on') ? document.querySelector('.sheet.on').id : null;
  return JSON.stringify({ menuAbierto: open, itemsMenu: items, hojaAbierta: sheet, hoja: visible });
})()
"""

CHECKS_THEME = r"""
(() => {
  const before = document.documentElement.getAttribute('data-theme');
  const cards = Array.from(document.querySelectorAll('.theme-card'));
  cards[4].click();
  const after = document.documentElement.getAttribute('data-theme');
  const hue = getComputedStyle(document.documentElement).getPropertyValue('--hue').trim();
  const ls = localStorage.getItem('djwilmer.zeno.prefs.v1');
  cards[0].click();
  return JSON.stringify({ antes: before, despues: after, hue: hue, persistido: ls });
})()
"""


async def main():
    edge = find_edge()
    profile = tempfile.mkdtemp(prefix="djw-probe-")
    proc = subprocess.Popen([
        edge, "--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio",
        "--remote-debugging-port=%d" % PORT,
        "--user-data-dir=" + profile,
        "--window-size=430,932",
        "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        ver = fetch_json("http://127.0.0.1:%d/json/version" % PORT)
        ws_url = ver["webSocketDebuggerUrl"]
        print("Navegador:", ver.get("Browser"))

        async with websockets.connect(ws_url, max_size=40 * 1024 * 1024) as wsm:
            sid = 0
            queue = asyncio.Queue()
            logs = []

            async def reader():
                async for raw in wsm:
                    m = json.loads(raw)
                    method = m.get("method", "")
                    if method == "Runtime.consoleAPICalled":
                        args = " ".join(str(a.get("value", a.get("description", ""))) for a in m["params"].get("args", []))
                        logs.append(("console.%s" % m["params"]["type"], args))
                    elif method == "Runtime.exceptionThrown":
                        d = m["params"]["exceptionDetails"]
                        exc = d.get("exception") or {}
                        logs.append(("EXCEPTION", "%s | %s @ %s:%s" % (
                            d.get("text"), (exc.get("description") or "")[:400],
                            d.get("url", "?"), d.get("lineNumber"))))
                    elif method == "Log.entryAdded":
                        e = m["params"]["entry"]
                        logs.append(("log." + str(e.get("level")), "%s %s" % (e.get("text", ""), e.get("url", ""))))
                    await queue.put(m)

            task = asyncio.ensure_future(reader())

            async def send(method, params=None, session=None):
                nonlocal sid
                sid += 1
                msg = {"id": sid, "method": method, "params": params or {}}
                if session:
                    msg["sessionId"] = session
                await wsm.send(json.dumps(msg))
                while True:
                    raw = await queue.get()
                    if raw.get("id") == sid:
                        if "error" in raw:
                            raise RuntimeError("%s -> %s" % (method, raw["error"]))
                        return raw.get("result", {})

            # Adjuntar a una pestaña nueva
            tab = await send("Target.createTarget", {"url": "about:blank"})
            tgt = tab["targetId"]
            at = await send("Target.attachToTarget", {"targetId": tgt, "flatten": True})
            session = at["sessionId"]

            await send("Runtime.enable", {}, session)
            await send("Log.enable", {}, session)
            await send("Page.enable", {}, session)
            await send("Network.enable", {}, session)

            print("Cargando", URL)
            await send("Page.navigate", {"url": URL}, session)
            await asyncio.sleep(9)

            async def evaluate(expr):
                res = await send("Runtime.evaluate", {
                    "expression": expr, "returnByValue": True, "awaitPromise": True
                }, session)
                if res.get("exceptionDetails"):
                    return "ERROR: " + json.dumps(res["exceptionDetails"])[:400]
                return res.get("result", {}).get("value")

            print("\n=== ERRORES DE CONSOLA (temprano) ===")
            for lvl, msg in logs:
                print("  [%s] %s" % (lvl, msg[:500]))
            if not logs:
                print("  (ninguno)")

            print("\n=== SCRIPT LOADED ===")
            load = await evaluate(CHECKS_LOAD)
            if load:
                for k, v in json.loads(load).items():
                    print("  %-10s %s" % (k, v))

            print("\n=== ESTADO ===")
            state = json.loads(await evaluate(CHECKS))
            for k, v in state.items():
                print("  %-14s %s" % (k, v))

            print("\n=== PC (layout escritorio) ===")
            await send("Emulation.setDeviceMetricsOverride", {
                "width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False
            }, session)
            await asyncio.sleep(1.5)
            for k, v in json.loads(await evaluate(CHECKS_PC)).items():
                print("  %-14s %s" % (k, v))

            print("\n=== MENU Y HOJAS ===")
            for k, v in json.loads(await evaluate(CHECKS_MENU)).items():
                print("  %-14s %s" % (k, v))

            print("\n=== CAMBIO DE TEMA ===")
            await send("Emulation.setDeviceMetricsOverride", {
                "width": 430, "height": 932, "deviceScaleFactor": 2, "mobile": True
            }, session)
            await asyncio.sleep(1)
            for k, v in json.loads(await evaluate(CHECKS_THEME)).items():
                print("  %-14s %s" % (k, v))

            print("\n=== HISTORIAL ===")
            print("  " + (await evaluate(
                "(()=>{document.getElementById('btnHistory').click();"
                "return document.querySelectorAll('#historyList li').length + ' canciones'})()")))
            await evaluate("UI.closeSheet()")

            print("\n=== AUDIO EN VIVO ===")
            pos = json.loads(await evaluate(CHECKS_AUDIO_CLICK))
            for kind in ("mousePressed", "mouseReleased"):
                await send("Input.dispatchMouseEvent", {
                    "type": kind, "x": pos["x"], "y": pos["y"],
                    "button": "left", "clickCount": 1, "buttons": 1 if kind == "mousePressed" else 0
                }, session)
            audio = await evaluate(CHECKS_AUDIO)
            for k, v in json.loads(audio).items():
                print("  %-14s %s" % (k, v))

            print("\n=== MANIFIEST ===")
            m = await evaluate(
                "fetch('manifest.webmanifest').then(r=>r.json()).then(j=>JSON.stringify({"
                "name:j.name, icons:j.icons.length, atajo:j.shortcuts.length, display:j.display}))")
            print("  " + json.dumps(m, ensure_ascii=False))

            print("\n=== SERVICE WORKER ===")
            print("  " + str(await evaluate(
                "navigator.serviceWorker.getRegistrations().then(r=>r.length + ' registro(s), "
                "caches: ' + (caches.keys().then(k=>k.length)))")))

            print("\n=== GEOMETRIA MOVIL (430x932) ===")
            geo = await evaluate("""(() => {
                const r = s => { const e = document.querySelector(s); if (!e) return null;
                  const b = e.getBoundingClientRect();
                  return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
                const f = r('#fabWa'), q = r('.quickbar');
                return JSON.stringify({ vw: innerWidth, vh: innerHeight, fab: f, vol: r('.volume-row'),
                  quick: q, controls: r('.controls'), socials: r('.socials'), meta: r('.meta'), art: r('.artwork'),
                  fabTocaQuickbar: f && q ? (f.bottom > q.top && f.top < q.bottom) : null,
                  fabTocaVolumen: f && r('.volume-row') ? (f.bottom > r('.volume-row').top) : null });
            })()""")
            for k, v in json.loads(geo).items():
                print("  %-16s %s" % (k, v))

            print("\n=== RESPONSIVE ===")
            for w, h, mobile in ((360, 640, True), (390, 844, True), (768, 1024, True), (1440, 900, False)):
                await send("Emulation.setDeviceMetricsOverride", {
                    "width": w, "height": h, "deviceScaleFactor": 1, "mobile": mobile}, session)
                await asyncio.sleep(0.8)
                out = await evaluate("""(() => {
                    const p = document.querySelector('.player');
                    const f = document.querySelector('#fabWa').getBoundingClientRect();
                    const cs = getComputedStyle(p);
                    return JSON.stringify({
                        playerH: Math.round(p.getBoundingClientRect().height),
                        radio: cs.borderRadius,
                        scroll: p.scrollHeight - p.clientHeight,
                        quickVisible: document.querySelector('.quickbar').getBoundingClientRect().bottom <= innerHeight + 1,
                        playVisible: document.querySelector('#btnPlay').getBoundingClientRect().bottom <= innerHeight + 1,
                        fabLibre: f.bottom <= innerHeight && f.right <= innerWidth,
                        overflowX: document.documentElement.scrollWidth - innerWidth
                    });
                })()""")
                print("  %sx%s -> %s" % (w, h, out))
            print("\n=== PWA / RECURSOS ===")
            res = await evaluate("""(async () => {
                const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth + 'x' + i.naturalHeight); i.onerror = () => r('ERROR'); i.src = u; });
                const man = await fetch('manifest.webmanifest').then(r => r.json());
                const icons = [];
                for (const ic of man.icons) icons.push(ic.src + '=' + await load(ic.src));
                const logo = await load('https://i.ibb.co/mhw9LGh/DJ-WILMER-PNG-ORIGINAL.png');
                return JSON.stringify({
                    manifestLink: !!document.querySelector('link[rel=manifest]'),
                    manifestIcons: icons.join(' '),
                    fondoSvg: await load('assets/img/bg-girl.svg'),
                    logoRemoto: logo,
                    themeColor: document.querySelector('meta[name=theme-color]').content,
                    appleIcon: !!document.querySelector('link[rel=apple-touch-icon]'),
                    swScript: !!navigator.serviceWorker,
                    atajos: man.shortcuts.length
                });
            })()""")
            print("  " + str(res).encode("ascii", "backslashreplace").decode())
            caches_num = await evaluate(
                "caches.keys().then(k=>k.join(','))")
            print("  caches: %s" % caches_num)

            shot = await send("Page.captureScreenshot", {"format": "png"}, session)
            out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "probe-movil.png")
            with open(os.path.abspath(out), "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("\nCaptura:", os.path.abspath(out))

            print("\n=== CONSOLA (%d entradas) ===" % len(logs))
            for lvl, msg in logs:
                print("  [%s] %s" % (lvl, msg[:220]))

            task.cancel()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=6)
        except Exception:
            proc.kill()


asyncio.run(main())