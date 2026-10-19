// Krátká vertikální videa (YouTube Shorts / TikTok) 1080×1920: jedna funkce na video.
// Záběry jsou skutečné – screencast z webview přes CDP (Page.startScreencast) při zvětšeném měřítku,
// výřez důležité části se jen ořízne (bez zvětšování). Nahoře titulek první 2 s, na konci 2 s karta s logem.
// Předpoklad: demo prostředí jako u demo.mjs (C:\Demo, mksettings.mjs, dev s demo-conf.json a CDP 9333).
// Okna se nedávají nahoru a obrazovka se nesnímá – během nahrávání jde normálně pracovat.
// node scripts/docs-media/shorts.mjs [column|palette|tabs …] [--out <složka>]   (ffmpeg v PATH, Chrome/Edge)
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { setup } from "./setup.mjs";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = path.resolve(outIdx >= 0 ? args.splice(outIdx, 2)[1] : path.join(os.tmpdir(), "dirwise-shorts"));
const WORK = path.join(os.tmpdir(), "dirwise-shorts-work");
const W = 1080, H = 1920, FPS = 30;
const TITLE_S = 2, END_S = 2, XFADE = 0.3;
const DEMO = "C:\\Demo";
const SUMMER = `${DEMO}\\Photos\\Summer 2026`;

// Fotky na výšku jen pro tohle video (v náhledu na telefonu méně černé plochy) + jedna na šířku na konci
// listování. Abecedně hned za coastline.jpg; vznikají v C:\Demo a po nahrávání se zase smažou.
const EXTRA = [
  ["coral-reef", 1000, 1600, ["0xff5d8f", "0x2ec4b6", "0x0b3d91"]],
  ["cypress-row", 1000, 1600, ["0x80ed99", "0x22577a", "0xffd36b"]],
  ["dawn-tower", 1000, 1600, ["0xff8a5b", "0x7b2cbf", "0xffc15e"]],
  ["desert-bloom", 1000, 1600, ["0xe9c46a", "0xe76f51", "0x264653"]],
  ["dock-at-noon", 1600, 1000, ["0xcbf3f0", "0x5b6cff", "0xf4a261"]],
];
const extraFile = (n) => `${SUMMER}\\${n}.jpg`;
function makeExtraPhotos() {
  EXTRA.forEach(([name, w, h, [a, b, c]], i) => {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi",
      "-i", `gradients=s=${w / 2}x${h / 2}:c0=${a}:c1=${b}:c2=${c}:n=3:seed=${503 + i * 11}:duration=1:speed=0`,
      "-vf", `gblur=sigma=24,scale=${w}:${h}`, "-frames:v", "1", "-q:v", "3", extraFile(name)]);
  });
}
const removeExtraPhotos = () => EXTRA.forEach(([n]) => fs.rmSync(extraFile(n), { force: true }));
// Soubor, který ve scéně tabs vznikne kopií F5.
const F5_COPY = `${DEMO}\\Projects\\meeting-notes.md`;

// ---------- překryvy (headless Chrome/Edge, jako brand.mjs) ----------
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const FONTS = [500, 800].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2")}`).join("\n");
const page = (body, css) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:transparent}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased;color:#fff}${css}</style></head><body>${body}</body></html>`;
const titlePage = (t) => page(`<div class="scrim"></div><h1>${t}</h1>`, `
.scrim{position:absolute;inset:0 0 auto 0;height:820px;background:linear-gradient(#000f 0%,#000e 50%,#0000 100%)}
h1{position:absolute;left:70px;right:70px;top:190px;font-weight:800;font-size:112px;line-height:1.05;letter-spacing:-3px;
 text-align:center;text-shadow:0 4px 30px #000a}`);
// Barvy tmavého tématu aplikace jako v brand.mjs.
const endPage = () => page(`<main><img src="${dataUri(root("app-icon.png"), "image/png")}"><h1>Dirwise</h1>
<p>Free &amp; open source<span>·</span>Microsoft Store</p></main>`, `
main{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
 background:radial-gradient(120% 80% at 30% 20%,#34343a 0%,#232325 45%,#161618 100%)}
img{width:360px;height:360px;filter:drop-shadow(0 18px 40px #0009)}
h1{font-weight:800;font-size:132px;letter-spacing:-4px;margin-top:40px}
p{font-weight:500;font-size:50px;color:#d6d6dc;margin-top:24px}span{margin:0 22px;color:#8a8a92}`);

async function renderOverlays(jobs) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((c) => fs.existsSync(c));
  if (!exe) throw new Error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>.");
  const PORT = 9334;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-shorts-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
    "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
      catch { await new Promise((r) => setTimeout(r, 200)); }
    }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
    };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    // Průhledné pozadí – titulek se pokládá přes video.
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    for (const [html, file] of jobs) {
      const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
      await send("Page.setDocumentContent", { frameId, html });
      await send("Runtime.evaluate", { expression: "Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])", awaitPromise: true });
      const r = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    }
    ws.close();
  } finally {
    proc.kill();
    await new Promise((r) => setTimeout(r, 500));
    // Prohlížeč může profil chvíli po ukončení ještě držet.
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  }
}

// ---------- ovládání aplikace ----------
// Kurzor a ukazatel kláves jako DOM overlay (screencast skutečný kurzor nekreslí), zvětšené pro telefon.
const overlay = `(() => {
  if (window.__hud) return;
  const cur = document.createElement("div");
  cur.style.cssText = "position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)";
  cur.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-2.6 1.2-3.4-6.7L5 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  const hud = document.createElement("div");
  hud.style.cssText = "position:fixed;left:0;top:0;transform:translate(-50%,-50%);z-index:2147483647;pointer-events:none;padding:12px 26px;border-radius:14px;background:rgba(20,20,20,.9);border:1px solid rgba(255,255,255,.18);color:#fff;font:700 32px Inter,system-ui,sans-serif;white-space:nowrap;opacity:0;transition:opacity .2s";
  document.body.append(cur, hud);
  addEventListener("mousemove", (e) => { const z = window.__zoom || 1; cur.style.transform = "translate(" + (e.clientX / z - 4) + "px," + (e.clientY / z - 3) + "px)"; }, true);
  addEventListener("mousedown", () => { cur.firstChild.style.transform = "scale(.85)"; setTimeout(() => (cur.firstChild.style.transform = ""), 150); }, true);
  let timer;
  window.__hud = (text, x, y, ms) => { hud.textContent = text; hud.style.left = x + "px"; hud.style.top = y + "px"; hud.style.opacity = "1"; clearTimeout(timer); timer = setTimeout(() => (hud.style.opacity = "0"), ms); };
})();`;

// Rozměry JPEG ze značky SOF (bez dalších závislostí).
function jpegSize(buf) {
  for (let i = 2; i < buf.length;) {
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error("JPEG bez SOF");
}
// Screencast WebView2 vrací snímky jen v měřítku obrazovky (deviceScaleFactor emulace ignoruje).
// Větší měřítko proto dává CSS zoom celé stránky – totéž, jako by Windows běžel na vyšším měřítku
// (rozložení se nemění: viewport se zvětší o stejný faktor).
async function screencastScale(c, width) {
  const buf = await new Promise((resolve) => {
    const on = (m) => {
      if (m.method !== "Page.screencastFrame") return;
      c.listeners.splice(c.listeners.indexOf(on), 1);
      c.send("Page.stopScreencast").catch(() => {});
      resolve(Buffer.from(m.params.data, "base64"));
    };
    c.listeners.push(on);
    c.send("Page.startScreencast", { format: "jpeg", quality: 50 });
  });
  return jpegSize(buf)[0] / width;
}

async function open(scene) {
  const c = await setup(scene.vw, scene.vh, { scale: 1 });
  const zoom = scene.scale / (await screencastScale(c, scene.vw));
  await c.size(Math.round(scene.vw * zoom), Math.round(scene.vh * zoom), 1);
  await c.evaluate(`document.documentElement.style.zoom = "${zoom}"; window.__zoom = ${zoom};`);
  await c.sleep(500);
  await c.evaluate(overlay);
  // Souřadnice myši jsou ve viewportu (zvětšené), výřezy a scéna v CSS px bez zoomu.
  let mouse = scene.mouse.map((v) => v * zoom);
  const a = { c, crop: scene.crops.main };
  const find = (expr) => c.evaluate(`(() => { const e = ${expr}; if (!e) return null; const r = e.getBoundingClientRect();
    return [Math.round(r.x + Math.min(r.width / 2, 80)), Math.round(r.y + r.height / 2)]; })()`);
  // Položka výpisu podle konce cesty (poslední viditelná – ve sloupcích je nejhlubší sloupec vpravo).
  a.item = (end) => find(`[...document.querySelectorAll("[data-path]")].filter((e) => e.dataset.path.endsWith(${JSON.stringify(end)}) && e.getBoundingClientRect().width > 0).pop()`);
  a.sel = (s, text) => find(`[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)}` : "true"} && e.getBoundingClientRect().width > 0)`);
  a.moveTo = async ([x, y], ms = 500) => {
    const steps = Math.max(1, Math.round(ms / 16)), [x0, y0] = mouse;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x - x0) * e, y: y0 + (y - y0) * e });
      await c.sleep(16);
    }
    mouse = [x, y];
  };
  a.click = async (p, what = "") => {
    if (!p) throw new Error(`nenalezeno: ${what}`);
    await a.moveTo(p);
    await c.sleep(120);
    await c.click(p[0], p[1]);
  };
  a.dblclick = async (p, what = "") => {
    if (!p) throw new Error(`nenalezeno: ${what}`);
    await a.moveTo(p);
    await c.sleep(120);
    for (const n of [1, 2]) {
      await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p[0], y: p[1], button: "left", clickCount: n });
      await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p[0], y: p[1], button: "left", clickCount: n });
    }
  };
  // Ukazatel klávesy ve spodní části aktuálního výřezu.
  a.zoom = zoom;
  a.hud = (text, ms = 1300) => {
    const { x, y, w, h } = a.crop;
    return c.evaluate(`window.__hud(${JSON.stringify(text)}, ${x + w / 2}, ${y + h * 0.84}, ${ms})`);
  };
  a.press = (k, code, vk, mods = 0, text) => c.key(k, code, vk, mods, text);
  // Výchozí stav: jedna záložka, bez rozdělení, bez dialogů, zadaná složka a zobrazení.
  a.reset = async (dir, view) => {
    for (let i = 0; i < 3; i++) await a.press("Escape", "Escape", 27);
    if (await c.evaluate(`document.querySelectorAll(".fw-panel").length > 1`)) await a.press("D", "KeyD", 68, 10);
    for (let i = 0; i < 10 && (await c.evaluate(`document.querySelectorAll("[role=tab]").length`)) > 1; i++) {
      await c.evaluate(`document.querySelectorAll('[aria-label="Close Tab"]')[0].click()`);
      await c.sleep(200);
    }
    await a.go(dir);
    await c.evaluate(`document.querySelector('[aria-label="View as ${view}"]').click()`);
    await c.sleep(800);
  };
  // Navigace přes pole cesty (Ctrl+L).
  a.go = async (dir) => {
    await a.press("l", "KeyL", 76, 2);
    await c.sleep(250);
    await c.send("Input.insertText", { text: dir });
    await a.press("Enter", "Enter", 13, 0, "\r");
    await c.sleep(700);
  };
  return a;
}

// Screencast: snímky jpeg s časem a značky přepnutí výřezu (obojí v sekundách od prvního snímku).
async function record(a, dir) {
  const { c } = a;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [], cuts = [];
  const on = (m) => {
    if (m.method !== "Page.screencastFrame") return;
    const f = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(m.params.data, "base64"));
    frames.push({ f, t: m.params.metadata.timestamp });
    c.send("Page.screencastFrameAck", { sessionId: m.params.sessionId }).catch(() => {});
  };
  c.listeners.push(on);
  await c.send("Page.startScreencast", { format: "jpeg", quality: 95, everyNthFrame: 1, maxWidth: 4000, maxHeight: 4000 });
  cuts.push({ t: Date.now() / 1000, crop: a.crop });
  return {
    // Přepnutí výřezu (střih) od tohoto okamžiku.
    cut: (crop) => { a.crop = crop; cuts.push({ t: Date.now() / 1000, crop }); },
    stop: async () => {
      const end = Date.now() / 1000;
      await c.send("Page.stopScreencast");
      c.listeners.splice(c.listeners.indexOf(on), 1);
      const t0 = frames[0].t;
      return {
        frames: frames.map((f, i) => ({ f: f.f, d: (frames[i + 1]?.t ?? end) - f.t })),
        cuts: cuts.map((k) => ({ t: Math.max(0, k.t - t0), crop: k.crop })),
        dur: end - t0,
      };
    },
  };
}

// ---------- scény ----------
// Viewport v CSS px; výřezy v CSS px s poměrem 9:16, scale = 1080 / šířka hlavního výřezu (výřez vyjde 1:1).
const SCENES = {
  column: {
    file: "dirwise-short-1-column-view.mp4",
    title: "Column view<br>on Windows",
    vw: 920, vh: 1636, scale: 1.5, mouse: [600, 900],
    // main = výpis bez sidebaru; preview = celý dialog náhledu (85 % okna).
    crops: { main: { x: 200, y: 0, w: 720, h: 1280 }, preview: { x: 60, y: 107, w: 800, h: 1422 } },
    async run(a, r) {
      const { c } = a;
      // Pod titulkem už je vidět seznam fotek (kořen C:\Demo by byl pod titulkem schovaný).
      await c.sleep(2000);
      await a.click(await a.item("\\coastline.jpg"), "coastline.jpg");
      await c.sleep(1300);
      await a.hud("↓");
      await a.press("ArrowDown", "ArrowDown", 40);
      await c.sleep(1100);
      await a.press("ArrowDown", "ArrowDown", 40);
      await c.sleep(1100);
      // Mezerník: náhled přes celé okno → střih na výřez dialogu.
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.preview);
      await a.hud("Space");
      await c.sleep(1700);
      for (let i = 0; i < 3; i++) {
        await a.hud("→", 900);
        await a.press("ArrowRight", "ArrowRight", 39);
        await c.sleep(1300);
      }
      await c.sleep(300);
      await a.press("Escape", "Escape", 27);
      r.cut(this.crops.main);
      await c.sleep(1300);
    },
    before: async (a) => {
      makeExtraPhotos();
      await a.reset(DEMO, "Columns");
      await a.click(await a.item(`${DEMO}\\Photos`), "Photos");
      await a.c.sleep(600);
      await a.click(await a.item("\\Summer 2026"), "Summer 2026");
      await a.c.sleep(900);
    },
    after: removeExtraPhotos,
  },
  palette: {
    file: "dirwise-short-2-ctrl-k.mp4",
    title: "Jump anywhere<br>with Ctrl+K",
    // Paleta je uprostřed okna (580 px) → širší okno, aby výřez 600 px nezabral sidebar.
    vw: 1000, vh: 1300, scale: 1.8, mouse: [640, 760],
    crops: { main: { x: 200, y: 0, w: 600, h: 1067 } },
    async run(a) {
      const { c } = a;
      const palette = async (query, label) => {
        await a.hud("Ctrl + K");
        await a.press("k", "KeyK", 75, 2);
        await c.sleep(600);
        await c.type(query, 150);
        await c.sleep(900);
        if (label) {
          // Klik na konkrétní výsledek (Enter by vzal první – soubory aktuální složky).
          await a.click(await a.sel(".fw-palette [role=option] *", label), label);
        } else {
          await a.press("Enter", "Enter", 13, 0, "\r");
        }
        await c.sleep(1500);
      };
      await c.sleep(1900);
      await palette("pic", "Pictures");
      await palette("sum", "Summer 2026");
      await palette("light", "Appearance: Light");
      await palette("split", "Split Window");
      await c.sleep(500);
    },
    before: (a) => a.reset(`${DEMO}\\Documents`, "Icons"),
  },
  tabs: {
    file: "dirwise-short-3-tabs-split.mp4",
    title: "Tabs +<br>split view",
    vw: 920, vh: 1636, scale: 1.5, mouse: [600, 900],
    crops: { main: { x: 200, y: 0, w: 720, h: 1280 } },
    async run(a) {
      const { c } = a;
      await c.sleep(1800);
      // Nová záložka (otevře aktuální složku) → o dvě úrovně výš → Documents.
      await a.hud("Ctrl + T");
      await a.press("t", "KeyT", 84, 2);
      await c.sleep(1000);
      await a.hud("Ctrl + ↑");
      for (let i = 0; i < 2; i++) {
        await a.press("ArrowUp", "ArrowUp", 38, 2);
        await c.sleep(650);
      }
      await a.dblclick(await a.item(`${DEMO}\\Documents`), "Documents");
      await c.sleep(1200);
      // Přepínání záložek.
      await a.click(await a.sel("[role=tab]", "Summer 2026"), "záložka Summer 2026");
      await c.sleep(1100);
      await a.click(await a.sel("[role=tab]", "Documents"), "záložka Documents");
      await c.sleep(1000);
      // Rozdělené okno, v pravém panelu Projects.
      await a.hud("Ctrl + Shift + D");
      await a.press("D", "KeyD", 68, 10);
      await c.sleep(1200);
      await a.hud("Tab");
      await a.press("Tab", "Tab", 9);
      await c.sleep(500);
      await a.go(`${DEMO}\\Projects`);
      await c.sleep(700);
      // F5 zkopíruje soubor z levého panelu do pravého.
      await a.click(await a.item("\\Documents\\meeting-notes.md"), "meeting-notes.md");
      await c.sleep(600);
      await a.hud("F5 = copy to other panel", 1600);
      await a.press("F5", "F5", 116);
      await c.sleep(2200);
    },
    before: async (a) => {
      fs.rmSync(F5_COPY, { force: true });
      await a.reset(SUMMER, "Icons");
    },
    after: () => fs.rmSync(F5_COPY, { force: true }),
  },
};

// ---------- skládání ----------
function compose(rec, scene, dir, titlePng, endPng, out) {
  const list = rec.frames.map((f) => `file '${f.f.replace(/\\/g, "/")}'\nduration ${f.d.toFixed(4)}`).join("\n")
    + `\nfile '${rec.frames.at(-1).f.replace(/\\/g, "/")}'\n`;
  const listFile = path.join(dir, "frames.txt");
  fs.writeFileSync(listFile, list);
  const s = jpegSize(fs.readFileSync(rec.frames[0].f))[0] / scene.vw;
  const segs = rec.cuts.map((k, i) => ({ ...k, end: rec.cuts[i + 1]?.t ?? rec.dur })).filter((k) => k.end - k.t > 0.01);
  const main = rec.dur;
  const parts = [`[0:v]fps=${FPS},split=${segs.length}${segs.map((_, i) => `[v${i}]`).join("")}`];
  segs.forEach((k, i) => {
    const { x, y, w, h } = k.crop;
    parts.push(`[v${i}]trim=start=${k.t.toFixed(3)}:end=${k.end.toFixed(3)},setpts=PTS-STARTPTS,` +
      `crop=${Math.round(w * s)}:${Math.round(h * s)}:${Math.round(x * s)}:${Math.round(y * s)},scale=${W}:${H}:flags=lanczos,setsar=1[s${i}]`);
  });
  parts.push(`${segs.map((_, i) => `[s${i}]`).join("")}concat=n=${segs.length}:v=1:a=0,format=yuv420p[app]`);
  parts.push(`[1:v]format=rgba,fade=t=out:st=${TITLE_S - 0.35}:d=0.35:alpha=1[tt]`);
  parts.push(`[app][tt]overlay=eof_action=pass:format=auto,format=yuv420p,fps=${FPS}[body]`);
  parts.push(`[2:v]fps=${FPS},format=yuv420p,setsar=1[end]`);
  parts.push(`[body][end]xfade=transition=fade:duration=${XFADE}:offset=${(main - XFADE).toFixed(3)},` +
    // Snímky jsou JPEG (plný rozsah) – výstup ve standardním TV rozsahu, jinak vyjde yuvj420p.
    `scale=in_range=auto:out_range=tv,format=yuv420p[v]`);
  const total = main - XFADE + END_S + XFADE;
  execFileSync("ffmpeg", ["-v", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", listFile,
    "-loop", "1", "-t", String(TITLE_S), "-i", titlePng,
    "-loop", "1", "-t", String(END_S + XFADE), "-i", endPng,
    "-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo",
    "-filter_complex", parts.join(";"), "-map", "[v]", "-map", "3:a",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
  return total;
}

// ---------- běh ----------
const names = args.length ? args : Object.keys(SCENES);
for (const n of names) if (!SCENES[n]) throw new Error(`neznámá scéna: ${n} (${Object.keys(SCENES).join(", ")})`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });
const endPng = path.join(WORK, "endcard.png");
await renderOverlays([[endPage(), endPng], ...names.map((n) => [titlePage(SCENES[n].title), path.join(WORK, `title-${n}.png`)])]);

for (const n of names) {
  const scene = SCENES[n];
  const a = await open(scene);
  try {
    await scene.before?.(a);
    a.crop = scene.crops.main;
    const dir = path.join(WORK, n);
    const r = await record(a, dir);
    await scene.run(a, r);
    const rec = await r.stop();
    const out = path.join(OUT, scene.file);
    const total = compose(rec, scene, dir, path.join(WORK, `title-${n}.png`), endPng, out);
    console.log(`${scene.file}  ${total.toFixed(1)} s  ${rec.frames.length} snímků  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
  } finally {
    await scene.after?.();
    // Zpět tmavé téma a výchozí okno (scéna palette přepíná na světlé).
    await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.setTheme("dark"))`).catch(() => {});
    await a.c.evaluate(`document.documentElement.style.zoom = ""`).catch(() => {});
    await a.c.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
    a.c.close();
  }
}
