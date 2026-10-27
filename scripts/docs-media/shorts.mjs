// Krátká vertikální videa (YouTube Shorts / TikTok) 1080×1920: jedna funkce na video.
// Záběry jsou skutečné – screencast z webview přes CDP (Page.startScreencast) při zvětšeném měřítku,
// výřez důležité části se jen ořízne (bez zvětšování). Nahoře titulek první 2 s, na konci 2 s karta s logem.
// Scéna `appearance` (průhlednost) se nahrává ze skutečné obrazovky (ffmpeg gdigrab, okno před testovací
// tapetou jako demo.mjs) – screencast webview nativní Acrylic neukáže; okno je na chvíli nad ostatními.
// Předpoklad: demo prostředí jako u demo.mjs (C:\Demo, mksettings.mjs, dev s demo-conf.json a CDP 9333).
// Ostatní scény okna nedávají nahoru a obrazovku nesnímají – během nahrávání jde normálně pracovat.
// Koš: scény undo a recycle mažou jen vlastní demo soubory z C:\Demo a po nahrání je vrátí (obnovení
// v aplikaci; co zbyde v Koši, se trvale smaže jen podle cesty + času smazání a zkopíruje z docs/demo).
// node scripts/docs-media/shorts.mjs [column|palette|tabs|undo|shortcuts|recycle|thumbnails|tags|appearance …]
//   [--out <složka>]   (ffmpeg v PATH, Chrome/Edge)
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { setup } from "./setup.mjs";
import { announceFocus, stage } from "./wallpaper.mjs";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT = path.resolve(outIdx >= 0 ? args.splice(outIdx, 2)[1] : path.join(os.tmpdir(), "dirwise-shorts"));
const WORK = path.join(os.tmpdir(), "dirwise-shorts-work");
const W = 1080, H = 1920, FPS = 30;
const TITLE_S = 2, END_S = 2, XFADE = 0.3;
const DEMO = "C:\\Demo";
const SUMMER = `${DEMO}\\Photos\\Summer 2026`;
const DEMO_SRC = root("docs/demo/");
// Kopie z docs/demo zpátky do C:\Demo (cesty si odpovídají).
const restoreDemo = (p) => fs.cpSync(DEMO_SRC + p.replace(/^C:\\Demo\\/, ""), p, { recursive: true });

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
// Soubor, který ve scénách tabs a shortcuts vznikne kopií F5.
const F5_COPY = `${DEMO}\\Projects\\meeting-notes.md`;

// Videa jen pro scénu thumbnails: barevné animované přechody (ffmpeg), Windows z nich dělá náhledy
// jako z každého mp4. Složka Trip 2026 vzniká v C:\Demo\Videos a po nahrání se smaže.
const TRIP = `${DEMO}\\Videos\\Trip 2026`;
const TRIP_VIDEOS = [
  ["airport-morning", ["0x8ecae6", "0x219ebc", "0xffb703"]], ["beach-sunset", ["0xff7b54", "0xffb26b", "0x3a0ca3"]],
  ["boat-ride", ["0x00b4d8", "0x0077b6", "0xcaf0f8"]], ["city-lights", ["0x2b2d42", "0xef233c", "0xffd166"]],
  ["coastal-road", ["0x06d6a0", "0x118ab2", "0xffd166"]], ["forest-trail", ["0x1b4332", "0x40916c", "0xd8f3dc"]],
  ["harbor-evening", ["0x7209b7", "0xf72585", "0x4cc9f0"]], ["lake-swim", ["0x48cae4", "0x0096c7", "0x90e0ef"]],
  ["market-walk", ["0xf4a261", "0xe76f51", "0x2a9d8f"]], ["mountain-pass", ["0x6c757d", "0xadb5bd", "0x4361ee"]],
  ["old-town", ["0xd4a373", "0xfefae0", "0x606c38"]], ["rooftop-dinner", ["0x5a189a", "0xff9e00", "0x240046"]],
];
function makeTripVideos() {
  fs.mkdirSync(TRIP, { recursive: true });
  TRIP_VIDEOS.forEach(([name, [a, b, c]], i) => {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi",
      "-i", `gradients=s=640x360:c0=${a}:c1=${b}:c2=${c}:n=3:seed=${701 + i * 7}:duration=3:speed=0.08`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart",
      `${TRIP}\\${name}.mp4`]);
  });
}
const removeTripVideos = () => fs.rmSync(TRIP, { recursive: true, force: true });
// PDF pro náhled mezerníkem: skutečné dokumenty (tisk z headless Chrome). contract.pdf v demo datech je
// prázdný (0 B), po nahrání se vrátí z docs/demo; invoice je navíc a smaže se.
const PDFS = [[`${DEMO}\\Documents\\contract.pdf`, "Service Agreement", "Agreement No. 2026-0417"],
  [`${DEMO}\\Documents\\invoice-2026-10.pdf`, "Invoice", "Invoice No. 2026-10-031"]];
const removePdfs = () => { fs.rmSync(PDFS[1][0], { force: true }); restoreDemo(PDFS[0][0]); };

// Scéna peek: dočasná složka se šesti typy souborů (Markdown, fotka, PDF, zvuk, kód, video) – abecedně
// v pořadí listování šipkou. Fotka a video jsou kopie demo dat, zvuk je vlastní skladba z docs-media
// (sociální složka, jinak ticho z ffmpeg), PDF se tiskne z headless Chrome. Po nahrání se smaže.
const KIT = `${DEMO}\\Projects\\launch-kit`;
const KIT_MD = `# Launch kit

Everything for the **autumn release** in one folder.

## Checklist

1. Cover photo – *done*
2. Invoice for the print shop
3. Jingle for the teaser
4. Final styles for the landing page

> Press Space on any file to check it before sending.

| Asset | Owner | Due |
|---|---|---|
| cover.jpg | Ana | Mon |
| teaser.mp4 | Leo | Wed |
| styles.css | Mia | Fri |

## Notes

- Export the cover at **2400 px** wide.
- Keep the jingle under 15 seconds.
- Brand blue is \`#0a84ff\` (see styles.css).
- Send the invoice by **Thursday**.

## Next steps

- Review the teaser cut
- Book the launch post
`;
const KIT_CSS = `/* Landing page – autumn release */
:root {
  --brand: #0a84ff;
  --ink: #1d1d1f;
  --paper: #fbfbfd;
  --radius: 14px;
}

.hero {
  display: grid;
  place-items: center;
  min-height: 70vh;
  background: linear-gradient(160deg, var(--brand), #5e5ce6);
  color: white;
}

.hero h1 {
  font: 800 clamp(2.5rem, 6vw, 5rem) / 1.05 Inter, sans-serif;
  letter-spacing: -0.03em;
}

.button {
  padding: 0.9em 1.6em;
  border-radius: var(--radius);
  background: white;
  color: var(--brand);
}
`;
function makeKit() {
  fs.rmSync(KIT, { recursive: true, force: true });
  fs.mkdirSync(KIT, { recursive: true });
  fs.writeFileSync(`${KIT}\\brief.md`, KIT_MD);
  fs.copyFileSync(`${SUMMER}\\alpine-lake.jpg`, `${KIT}\\cover.jpg`);
  fs.writeFileSync(`${KIT}\\styles.css`, KIT_CSS);
  fs.copyFileSync(`${DEMO}\\Videos\\city-drive.mp4`, `${KIT}\\teaser.mp4`);
  const jingle = root("dirwise-socialni-site/dirwise-socialni-site/hudba/05-ambient-focus.mp3");
  if (fs.existsSync(jingle)) fs.copyFileSync(jingle, `${KIT}\\jingle.mp3`);
  else execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "20", `${KIT}\\jingle.mp3`]);
}
const KIT_FILES = ["brief.md", "cover.jpg", "invoice.pdf", "jingle.mp3", "styles.css", "teaser.mp4"].map((f) => `${KIT}\\${f}`);

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
// Jedna strana A4 s neutrálním textem (demo dokument, žádná skutečná firma).
const pdfPage = (title, no) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}body{font-family:Inter,sans-serif;color:#1f2328;padding:60px 64px;font-size:13px;line-height:1.55}
h1{font-size:34px;font-weight:800;letter-spacing:-1px;margin-bottom:6px}.no{color:#6b7280;margin-bottom:36px}
h2{font-size:15px;font-weight:800;margin:26px 0 8px}p{margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin:14px 0}td,th{padding:8px 10px;border-bottom:1px solid #d0d7de;text-align:left}
th{font-weight:800;background:#f6f8fa}.sig{margin-top:60px;display:flex;gap:60px}.sig div{flex:1;border-top:1px solid #1f2328;padding-top:8px}
</style></head><body><h1>${title}</h1><div class="no">${no} · Prepared 12 October 2026</div>
<h2>1. Scope</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae sapien vel nibh sagittis
malesuada. Praesent in dui nec risus tincidunt interdum. Vivamus euismod, lorem id laoreet aliquet, enim risus
fermentum arcu, a mattis sem justo nec velit.</p>
<h2>2. Deliverables</h2><table><tr><th>Item</th><th>Description</th><th>Qty</th><th>Amount</th></tr>
<tr><td>A-01</td><td>Discovery workshop</td><td>2</td><td>1 200,00</td></tr>
<tr><td>A-02</td><td>Design and prototyping</td><td>1</td><td>3 400,00</td></tr>
<tr><td>A-03</td><td>Implementation phase</td><td>1</td><td>8 900,00</td></tr>
<tr><td>A-04</td><td>Support (monthly)</td><td>12</td><td>2 400,00</td></tr></table>
<h2>3. Terms</h2><p>Donec feugiat, nunc sit amet gravida porttitor, nunc odio consequat nisi, non pharetra nibh
sem et nulla. Curabitur vehicula ligula id dolor fringilla, in volutpat leo luctus. Morbi dictum, lacus eget
tristique faucibus, augue erat laoreet nulla, vitae rhoncus lacus justo eget metus.</p>
<p>Aliquam erat volutpat. Suspendisse potenti. Nulla facilisi. Sed at ligula at nunc congue pulvinar eget a
orci. Quisque consequat, nibh in sollicitudin aliquam, justo mi cursus arcu, ut congue nisi augue a sem.</p>
<div class="sig"><div>Client</div><div>Provider</div></div></body></html>`;

// jobs: [html, soubor] = PNG 1080×1920 s průhledným pozadím; [html, soubor, "pdf"] = A4 PDF.
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
    for (const [html, file, kind] of jobs) {
      const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
      await send("Page.setDocumentContent", { frameId, html });
      await send("Runtime.evaluate", { expression: "Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])", awaitPromise: true });
      const r = kind === "pdf"
        ? await send("Page.printToPDF", { printBackground: true, paperWidth: 8.27, paperHeight: 11.69, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 })
        : await send("Page.captureScreenshot", { format: "png" });
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
// __hud(text, x, y, ms, size): size = velikost písma v CSS px (výchozí 32; velký štítek klávesy 56).
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
  window.__hud = (text, x, y, ms, size) => {
    const s = size || 32;
    hud.style.fontSize = s + "px"; hud.style.padding = Math.round(s * 0.4) + "px " + Math.round(s * 0.8) + "px"; hud.style.borderRadius = Math.round(s * 0.45) + "px";
    hud.textContent = text; hud.style.left = x + "px"; hud.style.top = y + "px"; hud.style.opacity = "1"; clearTimeout(timer); timer = setTimeout(() => (hud.style.opacity = "0"), ms);
  };
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
  let c, zoom, unstage;
  if (scene.screen) {
    // Skutečné okno před tapetou (snímá se obrazovka), rozložení 1:1 v px obrazovky (100 %).
    c = await setup(scene.screen.win.W, scene.screen.win.H, { emulate: false, theme: scene.theme ?? "dark" });
    unstage = await stage(scene.screen.win, scene.screen.area ?? scene.screen.win);
    await announceFocus(c);
    zoom = 1;
  } else {
    c = await setup(scene.vw, scene.vh, { scale: 1, theme: scene.theme ?? "dark" });
    zoom = scene.scale / (await screencastScale(c, scene.vw));
    await c.size(Math.round(scene.vw * zoom), Math.round(scene.vh * zoom), 1);
    await c.evaluate(`document.documentElement.style.zoom = "${zoom}"; window.__zoom = ${zoom};`);
  }
  await c.sleep(500);
  await c.evaluate(overlay);
  // Souřadnice myši jsou ve viewportu (zvětšené), výřezy a scéna v CSS px bez zoomu.
  let mouse = scene.mouse.map((v) => v * zoom);
  const a = { c, crop: scene.crops.main, unstage };
  const find = (expr) => c.evaluate(`(() => { const e = ${expr}; if (!e) return null; const r = e.getBoundingClientRect();
    return [Math.round(r.x + Math.min(r.width / 2, 80)), Math.round(r.y + r.height / 2)]; })()`);
  // Položka výpisu podle konce cesty (poslední viditelná – ve sloupcích je nejhlubší sloupec vpravo).
  a.item = (end) => find(`[...document.querySelectorAll("[data-path]")].filter((e) => e.dataset.path.endsWith(${JSON.stringify(end)}) && e.getBoundingClientRect().width > 0).pop()`);
  a.sel = (s, text) => find(`[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)}` : "true"} && e.getBoundingClientRect().width > 0)`);
  // Prvek, jehož text začíná daným řetězcem (tlačítka v sidebaru mají za názvem počet).
  a.selStart = (s, text) => find(`[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}) && e.getBoundingClientRect().width > 0)`);
  // Viditelné položky výpisu od zadané výšky (CSS px bez zoomu) – pod titulkem prvních 2 s je vidět jen
  // spodní část výřezu, akce v první vteřině proto míří na položky níž v seznamu.
  a.itemsBelow = (minY) => c.evaluate(`[...document.querySelectorAll("[data-path]")].map((e) => [e, e.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && r.y / (window.__zoom || 1) >= ${minY})
    .map(([e, r]) => ({ path: e.dataset.path, p: [Math.round(r.x + Math.min(r.width / 2, 80)), Math.round(r.y + r.height / 2)] }))`);
  a.moveTo = async ([x, y], ms = 500) => {
    const steps = Math.max(1, Math.round(ms / 16)), [x0, y0] = mouse;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x - x0) * e, y: y0 + (y - y0) * e });
      await c.sleep(16);
    }
    mouse = [x, y];
  };
  // mods: 1 Alt, 2 Ctrl, 8 Shift (výběr více položek).
  const press = async (p, button, mods = 0) => {
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p[0], y: p[1], button, clickCount: 1, modifiers: mods });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p[0], y: p[1], button, clickCount: 1, modifiers: mods });
  };
  a.click = async (p, what = "", mods = 0) => {
    if (!p) throw new Error(`nenalezeno: ${what}`);
    await a.moveTo(p);
    await c.sleep(120);
    a.onInput?.("click");
    await press(p, "left", mods);
  };
  a.rclick = async (p, what = "") => {
    if (!p) throw new Error(`nenalezeno: ${what}`);
    await a.moveTo(p);
    await c.sleep(120);
    await press(p, "right");
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
  // Ukazatel klávesy ve spodní části aktuálního výřezu; size = velikost písma (56 = velký štítek).
  // at = svislá poloha ve výřezu (0 nahoře, 1 dole).
  a.zoom = zoom;
  a.hud = (text, ms = 1300, size = 32, at = 0.84) => {
    const { x, y, w, h } = a.crop;
    return c.evaluate(`window.__hud(${JSON.stringify(text)}, ${x + w / 2}, ${y + h * at}, ${ms}, ${size})`);
  };
  // onInput: záznam si zapisuje časy kláves a kliků (zvukové efekty v hudbě na přesný okamžik).
  a.press = (k, code, vk, mods = 0, text) => { a.onInput?.(k); return c.key(k, code, vk, mods, text); };
  // Pojmenovaný okamžik záznamu (titulky kroků ve composeLens).
  a.mark = (id) => a.onInput?.(`mark:${id}`);
  // Paleta Ctrl+K: dotaz a Enter, nebo klik na konkrétní výsledek (Enter by vzal první – soubory aktuální složky).
  a.palette = async (query, label, { size = 32, typing = 150 } = {}) => {
    await a.hud("Ctrl + K", 1300, size);
    await a.press("k", "KeyK", 75, 2);
    await c.sleep(600);
    await c.type(query, typing);
    await c.sleep(900);
    if (label) await a.click(await a.sel(".fw-palette [role=option] *", label), label);
    else await a.press("Enter", "Enter", 13, 0, "\r");
  };
  // Přímé volání Rust commandu (příprava a úklid scén, ne záběry).
  a.invoke = (cmd, params) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(params)})`);
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
  const frames = [], cuts = [], inputs = [];
  a.onInput = (k) => inputs.push({ t: Date.now() / 1000, k });
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
      a.onInput = null;
      const t0 = frames[0].t;
      const list = frames.map((f, i) => `file '${f.f.replace(/\\/g, "/")}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join("\n")
        + `\nfile '${frames.at(-1).f.replace(/\\/g, "/")}'\n`;
      const listFile = path.join(dir, "frames.txt");
      fs.writeFileSync(listFile, list);
      return {
        input: ["-f", "concat", "-safe", "0", "-i", listFile],
        s: jpegSize(fs.readFileSync(frames[0].f))[0] / a.sceneVw,
        cuts: cuts.map((k) => ({ t: Math.max(0, k.t - t0), crop: k.crop })),
        inputs: inputs.map((k) => ({ t: Math.max(0, k.t - t0), k: k.k })),
        dur: end - t0, frames: frames.length,
      };
    },
  };
}

// Skutečná obrazovka: ffmpeg gdigrab výřezu okna (bezztrátově), jediný výřez bez střihů.
async function recordScreen(a, dir, win) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const mp4 = path.join(dir, "screen.mp4");
  const rec = spawn("ffmpeg", ["-v", "error", "-y", "-f", "gdigrab", "-framerate", String(FPS), "-draw_mouse", "0",
    "-offset_x", String(win.X), "-offset_y", String(win.Y), "-video_size", `${win.W}x${win.H}`, "-i", "desktop",
    "-c:v", "libx264rgb", "-crf", "0", "-preset", "ultrafast", mp4], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => { rec.on("exit", resolve); rec.on("error", reject); });
  await a.c.sleep(1500);
  return {
    cut: () => { throw new Error("střih v záznamu obrazovky není podporovaný"); },
    stop: async () => {
      if (rec.exitCode === null) rec.stdin.write("q");
      await done;
      const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString().trim());
      return { input: ["-i", mp4], s: 1, cuts: [{ t: 0, crop: a.crop }], dur, frames: Math.round(dur * FPS) };
    },
  };
}

// ---------- scény ----------
// Viewport v CSS px; výřezy v CSS px s poměrem 9:16, scale = 1080 / šířka hlavního výřezu (výřez vyjde 1:1).
// Titulek zakrývá první 2 s horních ~43 % obrazu – akce v první vteřině musí být ve spodní části
// (položky níž v seznamu, náhled přes celé okno, kontextové menu u položky).
const TALL = { vw: 920, vh: 1636, scale: 1.5, mouse: [600, 900],
  // main = výpis bez sidebaru; preview = celý dialog náhledu (85 % okna).
  crops: { main: { x: 200, y: 0, w: 720, h: 1280 }, preview: { x: 60, y: 107, w: 800, h: 1422 } } };
// Se sidebarem (štítky, Koš): užší viewport, výřez je celé okno.
const SIDE = { vw: 720, vh: 1280, scale: 1.5, mouse: [450, 800], crops: { main: { x: 0, y: 0, w: 720, h: 1280 } } };

// Koš: položky, které scéna smazala (cesta + čas), se po nahrání vrátí – co v Koši zbylo, se trvale smaže
// jen podle cesty a času smazání a zkopíruje z docs/demo.
async function cleanupTrashed(a, paths, since) {
  const missing = paths.filter((p) => !fs.existsSync(p));
  if (missing.length === 0) return;
  const mine = (await a.invoke("list_recycle_bin", {})).filter((i) =>
    missing.includes(`${i.original_dir}\\${i.name}`) && i.deleted >= since - 5);
  if (mine.length > 0) await a.invoke("purge_recycled", { ids: mine.map((i) => i.id), elevate: false });
  for (const p of missing) restoreDemo(p);
}

const SCENES = {
  column: {
    file: "dirwise-short-1-column-view.mp4",
    title: "Column view<br>on Windows",
    ...TALL,
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
      await c.sleep(1900);
      for (const [q, label] of [["pic", "Pictures"], ["sum", "Summer 2026"], ["light", "Appearance: Light"], ["split", "Split Window"]]) {
        await a.palette(q, label);
        await c.sleep(1500);
      }
      await c.sleep(500);
    },
    before: (a) => a.reset(`${DEMO}\\Documents`, "Icons"),
  },
  tabs: {
    file: "dirwise-short-3-tabs-split.mp4",
    title: "Tabs +<br>split view",
    ...TALL,
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
  // Delete pošle fotky do Koše, Ctrl+Z je vrátí (restore_from_trash) – nejdřív jedna, pak tři najednou.
  undo: {
    file: "dirwise-short-4-ctrl-z-undo.mp4",
    title: "Ctrl+Z undoes<br>deletes too",
    ...TALL,
    deleted: [], since: 0,
    async run(a) {
      const { c } = a;
      this.since = Math.floor(Date.now() / 1000);
      // Položky ve spodní polovině výřezu (pod titulkem).
      const items = await a.itemsBelow(700);
      if (items.length < 6) throw new Error("málo položek pod titulkem");
      this.deleted = [items[0], items[2], items[3], items[4]].map((i) => i.path);
      await c.sleep(300);
      await a.click(items[0].p, items[0].path);
      await c.sleep(500);
      await a.hud("Delete", 1200, 56);
      await a.press("Delete", "Delete", 46);
      await c.sleep(2200);
      await a.hud("Ctrl + Z", 1400, 56);
      await a.press("z", "KeyZ", 90, 2);
      await c.sleep(2600);
      // Tři položky najednou (klik + Shift+klik).
      await a.click(items[2].p, items[2].path);
      await c.sleep(400);
      await a.click(items[4].p, items[4].path, 8);
      await c.sleep(700);
      await a.hud("Delete", 1200, 56);
      await a.press("Delete", "Delete", 46);
      await c.sleep(2200);
      await a.hud("Ctrl + Z", 1400, 56);
      await a.press("z", "KeyZ", 90, 2);
      await c.sleep(2800);
    },
    before: (a) => a.reset(SUMMER, "Icons"),
    after(a) { return cleanupTrashed(a, this.deleted, this.since); },
  },
  // Pět zkratek za sebou, každá s velkým štítkem: Space, Ctrl+K, Ctrl+T, Ctrl+Shift+D, F5.
  shortcuts: {
    file: "dirwise-short-5-shortcuts.mp4",
    title: "5 shortcuts for<br>faster browsing",
    ...TALL,
    async run(a, r) {
      const { c } = a;
      const BIG = 56;
      // 1) Space – náhled fotky ze spodní části výpisu (vidět i pod titulkem).
      const items = await a.itemsBelow(700);
      await c.sleep(200);
      await a.click(items[1].p, items[1].path);
      await c.sleep(400);
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.preview);
      await a.hud("Space", 1500, BIG);
      await c.sleep(1700);
      await a.press("Escape", "Escape", 27);
      r.cut(this.crops.main);
      await c.sleep(500);
      // 2) Ctrl+K – skok do Documents.
      await a.palette("doc", "Documents", { size: BIG, typing: 120 });
      await c.sleep(1300);
      // 3) Ctrl+T – nová záložka.
      await a.hud("Ctrl + T", 1300, BIG);
      await a.press("t", "KeyT", 84, 2);
      await c.sleep(1500);
      // 4) Ctrl+Shift+D – rozdělené okno, vpravo Projects.
      await a.hud("Ctrl + Shift + D", 1400, BIG);
      await a.press("D", "KeyD", 68, 10);
      await c.sleep(1300);
      await a.press("Tab", "Tab", 9);
      await c.sleep(300);
      await a.go(`${DEMO}\\Projects`);
      await c.sleep(500);
      // 5) F5 – kopie do druhého panelu.
      await a.click(await a.item("\\Documents\\meeting-notes.md"), "meeting-notes.md");
      await c.sleep(500);
      await a.hud("F5 = copy", 1500, BIG);
      await a.press("F5", "F5", 116);
      await c.sleep(2000);
    },
    before: async (a) => {
      fs.rmSync(F5_COPY, { force: true });
      await a.reset(SUMMER, "Icons");
    },
    after: () => fs.rmSync(F5_COPY, { force: true }),
  },
  // Koš: fotka smazaná klávesou Delete + dvě položky smazané předem, Koš v sidebaru, obnovení a návrat do složky.
  recycle: {
    file: "dirwise-short-6-recycle-bin.mp4",
    title: "Restore from the<br>Recycle Bin",
    ...SIDE,
    pre: [`${DEMO}\\Documents\\quarterly-report.txt`, `${DEMO}\\Downloads\\setup.msi`],
    deleted: [], since: 0,
    async run(a) {
      const { c } = a;
      const items = await a.itemsBelow(700);
      this.deleted = [items[1].path];
      await c.sleep(200);
      await a.click(items[1].p, items[1].path);
      await c.sleep(400);
      await a.hud("Delete", 1200, 56);
      await a.press("Delete", "Delete", 46);
      await c.sleep(1300);
      await a.click(await a.selStart("button", "Recycle Bin"), "Recycle Bin v sidebaru");
      await c.sleep(1400);
      const row = (p) => a.sel(`[role=option][data-tooltip="${p.replace(/\\/g, "\\\\")}"]`);
      await a.click(await row(items[1].path), "řádek fotky");
      await c.sleep(600);
      await a.click(await a.sel("button", "Restore"), "Restore");
      await c.sleep(1400);
      // Zbytek: první + Shift+klik na poslední, Restore.
      await a.click(await row(this.pre[0]), "řádek quarterly-report.txt");
      await c.sleep(400);
      await a.click(await row(this.pre[1]), "řádek setup.msi", 8);
      await c.sleep(600);
      await a.click(await a.sel("button", "Restore"), "Restore");
      await c.sleep(1300);
      // Zpátky do složky – fotka je na místě.
      await a.go(SUMMER);
      await c.sleep(1500);
    },
    async before(a) {
      this.since = Math.floor(Date.now() / 1000);
      await a.invoke("delete_paths", { paths: this.pre, permanent: false, elevate: false });
      await a.reset(SUMMER, "Icons");
      await a.c.sleep(500);
    },
    after(a) { return cleanupTrashed(a, [...this.pre, ...this.deleted], this.since); },
  },
  // Náhledy videí (Windows je dělá z každého mp4) + náhled videa a PDF mezerníkem. PDF na tomhle stroji
  // nemají thumbnail handler (ikona), proto se PDF ukazuje jen v náhledu.
  thumbnails: {
    file: "dirwise-short-7-thumbnails.mp4",
    title: "Video thumbnails<br>+ PDF preview",
    ...TALL,
    async run(a, r) {
      const { c } = a;
      await c.sleep(100);
      // 1) Přehrání videa v náhledu (dialog je vidět i pod titulkem).
      await a.click(await a.item("\\Videos\\city-drive.mp4"), "city-drive.mp4");
      await c.sleep(300);
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.preview);
      await a.hud("Space", 1400, 48);
      await c.sleep(2300);
      await a.press("Escape", "Escape", 27);
      r.cut(this.crops.main);
      await c.sleep(600);
      // 2) Složka s 12 videi – náhledy naskakují živě.
      await a.dblclick(await a.item("\\Trip 2026"), "Trip 2026");
      await c.sleep(2800);
      // 3) PDF v Documents.
      await a.palette("doc", "Documents", { size: 48 });
      await c.sleep(1200);
      await a.click(await a.item("\\Documents\\contract.pdf"), "contract.pdf");
      await c.sleep(400);
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.preview);
      await a.hud("Space", 1400, 48);
      await c.sleep(2400);
      await a.press("Escape", "Escape", 27);
      r.cut(this.crops.main);
      await c.sleep(600);
    },
    before: async (a) => {
      makeTripVideos();
      await a.reset(`${DEMO}\\Videos`, "Icons");
      await a.c.sleep(1200);
    },
    after: async (a) => {
      removeTripVideos();
      removePdfs();
      // Nedávné: dočasná složka a PDF by zůstaly v sidebaru dalších scén.
      for (const p of [TRIP, `${DEMO}\\Videos\\city-drive.mp4`, ...PDFS.map(([f]) => f)]) {
        await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.removeRecent(${JSON.stringify(p)}))`);
      }
    },
  },
  // Štítky: pravý klik → Tags → barva (jedna fotka, pak dvě najednou), v sidebaru filtr podle barvy.
  // Pod CSS zoomem aplikace umístí kontextové menu na 1,5násobek souřadnic kliku (clientX/Y bere jako CSS px),
  // proto pravý klik jen na položky v prvním sloupci (4 na řádek) nahoře – menu pak přistane níž a víc vpravo,
  // ve viditelné části pod titulkem; u dalších sloupců by vyjelo za pravý okraj.
  tags: {
    file: "dirwise-short-8-tags.mp4",
    title: "Tag your files<br>with colors",
    ...SIDE,
    tagged: [],
    async run(a) {
      const { c } = a;
      const all = await a.itemsBelow(0);
      const items = [all[0], all[4], all[8]];
      if (items.some((i) => !i)) throw new Error("málo položek");
      this.tagged = items.map((i) => i.path);
      const tag = async (color) => {
        await a.moveTo(await a.sel(".fw-menu-item", "Tags"), 300);
        await c.sleep(500);
        const dot = await a.sel(`button[aria-label="Tag ${color}"]`);
        if (!dot) throw new Error(`nenalezeno: Tag ${color} – ${await c.evaluate(`JSON.stringify({ menu: [...document.querySelectorAll(".fw-menu-item")].map((e) => e.textContent.trim() + "@" + Math.round(e.getBoundingClientRect().y)), popovers: document.querySelectorAll(".fw-popover").length })`)}`);
        await a.click(dot, `Tag ${color}`);
        await c.sleep(700);
        await a.press("Escape", "Escape", 27);
        await c.sleep(300);
      };
      await c.sleep(100);
      await a.rclick(items[0].p, items[0].path);
      await c.sleep(600);
      await tag("Red");
      // Dvě položky najednou (klik + Ctrl+klik).
      await a.click(items[2].p, items[2].path);
      await c.sleep(300);
      await a.click(items[1].p, items[1].path, 2);
      await c.sleep(300);
      await a.rclick(items[1].p, items[1].path);
      await c.sleep(600);
      await tag("Green");
      // Filtr v sidebaru.
      await a.click(await a.selStart("button", "Red"), "štítek Red v sidebaru");
      await c.sleep(1300);
      await a.click(await a.selStart("button", "Green"), "štítek Green v sidebaru");
      await c.sleep(1500);
    },
    before: (a) => a.reset(SUMMER, "Icons"),
    async after(a) {
      // Nejdřív pryč ze zobrazení štítku (jinak si aplikace štítky uloží znovu), pak smazat.
      await a.go(SUMMER);
      await a.c.sleep(500);
      for (const p of this.tagged) await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.clearTags(${JSON.stringify(p)}))`);
      await a.c.sleep(500);
    },
  },
  // Světlé → tmavé téma, pak rozmazaná průhlednost (Acrylic) a silnější stupeň – skutečná obrazovka,
  // okno 900×1032 (minimální šířka okna je 900) vlevo nahoře před testovací tapetou, výřez 580×1032 uprostřed
  // (paleta Ctrl+K je uprostřed okna) zvětšený na 1080×1920.
  appearance: {
    file: "dirwise-short-9-dark-transparent.mp4",
    title: "Dark mode +<br>transparency",
    theme: "light",
    screen: { win: { X: 0, Y: 0, W: 900, H: 1032 }, area: { X: 0, Y: 0, W: 1920, H: 1032 } },
    mouse: [450, 700],
    crops: { main: { x: 160, y: 0, w: 580, h: 1032 } },
    async run(a) {
      const { c } = a;
      await c.sleep(200);
      await a.palette("dark", "Appearance: Dark", { size: 44, typing: 90 });
      await c.sleep(1500);
      await a.palette("transp", "Transparency: Turn On", { size: 44, typing: 90 });
      await c.sleep(2300);
      await a.palette("strong", "Transparency Strength: Strong", { size: 44, typing: 90 });
      await c.sleep(2400);
    },
    before: async (a) => {
      await a.reset(SUMMER, "Icons");
      await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.setWindowTransparency(false))`);
      await a.c.sleep(600);
    },
    after: async (a) => {
      await a.c.evaluate(`import("/src/lib/storage.ts").then(async (s) => { await s.setWindowTransparency(false); await s.setTransparencyStrength("medium"); })`);
    },
  },
  // Náhled mezerníkem napříč typy: Space otevře Markdown, šipka → listuje fotkou, PDF, zvukem, kódem
  // a videem, Space zavře. brief.md je vybraný předem – náhled přes celé okno je vidět i pod titulkem.
  // Štítky kláves nahoře ve výřezu (ne v dolních 20 %).
  peek: {
    file: "dirwise-short-13-peek.mp4",
    title: "Peek at any file<br>with Space",
    // Užší okno než TALL: náhled je 85 % okna, text Markdownu a kódu tak v telefonu vyjde čitelně.
    vw: 560, vh: 996, scale: 1080 / 560, mouse: [380, 700],
    crops: { main: { x: 0, y: 0, w: 560, h: 996 }, preview: { x: 30, y: 54, w: 500, h: 889 } },
    prepare: makeKit,
    pdfs: [[pdfPage("Invoice", "Invoice No. 2026-10-031"), `${KIT}\\invoice.pdf`, "pdf"]],
    async run(a, r) {
      const { c } = a;
      await c.sleep(250);
      await a.hud("Space", 1200, 42, 0.7);
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.preview);
      await c.sleep(2700);
      for (const [label, ms] of [["Photo", 1900], ["PDF", 2000], ["Audio", 1800], ["Code", 1900], ["Video", 2300]]) {
        await a.hud(`→  ${label}`, 1300, 34, 0.15);
        await a.press("ArrowRight", "ArrowRight", 39);
        await c.sleep(ms);
      }
      await a.hud("Space = close", 1100, 34, 0.5);
      await a.press(" ", "Space", 32, 0, " ");
      r.cut(this.crops.main);
      await c.sleep(1100);
    },
    before: async (a) => {
      await a.reset(KIT, "Icons");
      await a.c.sleep(1500);
      await a.click(await a.item("\\launch-kit\\brief.md"), "brief.md");
      // Kurzor mimo výřez náhledu (jinak by zakrýval text).
      await a.moveTo([545 * a.zoom, 980 * a.zoom], 200);
      await a.c.sleep(600);
    },
    after: async (a) => {
      // Pryč z dočasné složky, smazat ji a vyčistit Nedávné.
      await a.go(`${DEMO}\\Projects`);
      fs.rmSync(KIT, { recursive: true, force: true });
      for (const p of [KIT, ...KIT_FILES]) {
        await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.removeRecent(${JSON.stringify(p)}))`);
      }
    },
  },
  // Tip: stavový řádek. Nahoře výpis (hlavní část okna bez sidebaru), pod ním lupa – zvětšený výřez
  // stavového řádku (počty vpravo, od kroku s5 drobky cesty vlevo). Titulky kroků mimo záběr aplikace
  // podle značek a.mark(); skládá composeLens.
  statusbar: {
    file: "dirwise-short-14-status-bar.mp4",
    title: "How many files<br>are in here?",
    // Celé okno (stavový řádek jde přes celou šířku, drobky cesty jsou vlevo pod sidebarem).
    vw: 760, vh: 640, scale: 2.6, mouse: [560, 420],
    crops: { main: { x: 0, y: 0, w: 760, h: 640 } },
    accent: "#ffd25a",
    chip: "DIRWISE TIP #1",
    steps: [["s1", "Items + [free space]"], ["s2", "Click → [selected]"], ["s3", "Ctrl+A → [all of them]"],
      ["s4", "Ctrl+F, type → [matches]"], ["s5", "Click the path → [jump up]"]],
    compose: (...p) => composeLens(...p),
    async run(a) {
      const { c } = a;
      await c.sleep(2000);
      a.mark("s1");
      await c.sleep(2100);
      a.mark("s2");
      const items = await a.itemsBelow(300);
      await a.click(items[1].p, items[1].path);
      await c.sleep(1900);
      a.mark("s3");
      await a.press("a", "KeyA", 65, 2);
      await c.sleep(1900);
      a.mark("s4");
      // Nejdřív zrušit výběr – jinak by filtr ukázal „2 of 2 selected“ místo „2 of 52 (filtered)“.
      await a.press("Escape", "Escape", 27);
      await c.sleep(150);
      await a.press("f", "KeyF", 70, 2);
      await c.sleep(300);
      await c.type("beach", 120);
      await c.sleep(1700);
      await a.press("Escape", "Escape", 27);
      await c.sleep(300);
      a.mark("s5");
      // Předposlední drobek = nadřazená složka (C:\Demo\Photos).
      const crumbs = await c.evaluate(`[...document.querySelectorAll(".fw-statusbar button")].map((e) => {
        const r = e.getBoundingClientRect(); return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)]; })`);
      await a.click(crumbs.at(-2), "drobek nadřazené složky");
      await c.sleep(2100);
    },
    async before(a) {
      await a.reset(SUMMER, "Icons");
      await a.c.sleep(800);
      // Stavový řádek v CSS px bez zoomu (lupa a rámečky se počítají z něj).
      this.bar = await a.c.evaluate(`(() => { const r = document.querySelector(".fw-statusbar").getBoundingClientRect(), z = window.__zoom || 1;
        return { x: r.x / z, y: r.y / z, w: r.width / z, h: r.height / z }; })()`);
    },
    async after(a) {
      for (const p of [SUMMER, `${DEMO}\\Photos`]) {
        await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.removeRecent(${JSON.stringify(p)}))`);
      }
    },
  },
};

// Rozložení scény s lupou (statusbar): 1080×1920, nahoře štítek + titulek kroku, uprostřed aplikace,
// pod ní zvětšený výřez stavového řádku – vše nad dolními 20 %.
const LENS = { appY: 420, lensY: 1372, lensW: 1040, capY: 268 };
function lensGeometry(scene) {
  const app = scene.crops.main, k = W / app.w, bar = scene.bar;
  // Výřez lupy 270 CSS px: počty (vpravo) i drobky (vlevo) se vejdou a písmo vyjde ~3,8× větší.
  const half = Math.min(270, Math.round(bar.w / 2));
  const lens = { right: { x: bar.x + bar.w - half, y: bar.y, w: half, h: bar.h }, left: { x: bar.x, y: bar.y, w: half, h: bar.h } };
  const lensH = Math.round((bar.h * LENS.lensW) / half / 2) * 2;
  // Stavový řádek ve zvětšeném záběru aplikace (px výsledného videa).
  const inApp = (r) => ({ x: (r.x - app.x) * k, y: LENS.appY + (r.y - app.y) * k, w: r.w * k, h: r.h * k });
  return { k, lens, lensH, appH: Math.round(app.h * k / 2) * 2, inApp };
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const accentText = (t, acc) => esc(t).replace(/\[(.+?)\]/g, `<b style="background:${acc}">$1</b>`);
function lensOverlays(scene, n) {
  const g = lensGeometry(scene), acc = scene.accent;
  const chip = `<div class="chip">${esc(scene.chip)}</div>`;
  const css = `.chip{position:absolute;left:50%;top:150px;transform:translateX(-50%);padding:8px 30px;border-radius:40px;
  border:3px solid #fff9;background:#0008;color:${acc};font-weight:800;font-size:40px;letter-spacing:1px;white-space:nowrap}
  h2{position:absolute;left:30px;right:30px;top:${LENS.capY}px;text-align:center;font-weight:800;font-size:76px;letter-spacing:-2px;line-height:1.1}
  h2 b{color:#14161c;border-radius:18px;padding:0 16px;font-weight:800}
  .box{position:absolute;border:5px solid ${acc};border-radius:22px;box-shadow:0 10px 40px #000a}
  .hl{position:absolute;border:4px solid ${acc};border-radius:8px}
  .ln{position:absolute;width:4px;background:${acc}}`;
  // Rámeček lupy + zvýraznění stavového řádku v aplikaci a spojnice, zvlášť pro pravou a levou polovinu.
  const frame = (side) => {
    const hl = g.inApp(g.lens[side]), lx = (W - LENS.lensW) / 2;
    const ly = LENS.lensY, bx = Math.round(hl.x + hl.w / 2);
    return page(`${chip}<div class="hl" style="left:${hl.x - 4}px;top:${hl.y - 4}px;width:${hl.w + 8}px;height:${hl.h + 8}px"></div>
      <div class="ln" style="left:${bx - 2}px;top:${hl.y + hl.h + 4}px;height:${ly - 10 - (hl.y + hl.h + 4)}px"></div>
      <div class="box" style="left:${lx - 10}px;top:${ly - 10}px;width:${LENS.lensW + 20}px;height:${g.lensH + 20}px"></div>`, css);
  };
  const title = page(`<div class="scrim"></div>${chip}<h1>${scene.title}</h1>`, `${css}
    .scrim{position:absolute;inset:0 0 auto 0;height:900px;background:linear-gradient(#000f 0%,#000e 55%,#0000 100%)}
    h1{position:absolute;left:60px;right:60px;top:250px;font-weight:800;font-size:108px;line-height:1.05;letter-spacing:-3px;text-align:center;text-shadow:0 4px 30px #000a}`);
  return [[title, path.join(WORK, `title-${n}.png`)], [frame("right"), path.join(WORK, `${n}-frame-right.png`)],
    [frame("left"), path.join(WORK, `${n}-frame-left.png`)],
    ...scene.steps.map(([id, text]) => [page(`<h2>${accentText(text, acc)}</h2>`, css), path.join(WORK, `${n}-${id}.png`)])];
}
function composeLens(rec, out, titlePng, endPng, scene, n) {
  const { s } = rec, g = lensGeometry(scene), main = rec.dur;
  const mark = Object.fromEntries(rec.inputs.filter((i) => i.k.startsWith("mark:")).map((i) => [i.k.slice(5), i.t]));
  const tSwitch = mark.s5 ?? main;
  const px = (r) => `crop=${Math.round(r.w * s)}:${Math.round(r.h * s)}:${Math.round(r.x * s)}:${Math.round(r.y * s)}`;
  const app = scene.crops.main, lx = (W - LENS.lensW) / 2;
  const inputs = [...rec.input, "-loop", "1", "-t", String(TITLE_S), "-i", titlePng, "-loop", "1", "-t", String(END_S + XFADE), "-i", endPng,
    "-loop", "1", "-t", main.toFixed(3), "-i", path.join(WORK, `${n}-frame-right.png`),
    "-loop", "1", "-t", main.toFixed(3), "-i", path.join(WORK, `${n}-frame-left.png`)];
  const steps = scene.steps.filter(([id]) => mark[id] !== undefined);
  steps.forEach(([id]) => inputs.push("-loop", "1", "-t", main.toFixed(3), "-i", path.join(WORK, `${n}-${id}.png`)));
  const total = main - XFADE + END_S + XFADE;
  inputs.push("-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=r=48000:cl=stereo");
  const audioIdx = 5 + steps.length;
  const parts = [`[0:v]fps=${FPS},trim=duration=${main.toFixed(3)},setpts=PTS-STARTPTS,split=3[a][r][l]`,
    `[a]${px(app)},scale=${W}:${g.appH}:flags=lanczos,setsar=1[app]`,
    `[r]${px(g.lens.right)},scale=${LENS.lensW}:${g.lensH}:flags=lanczos,setsar=1[lr]`,
    `[l]${px(g.lens.left)},scale=${LENS.lensW}:${g.lensH}:flags=lanczos,setsar=1[ll]`,
    `color=c=0x101114:s=${W}x${H}:r=${FPS}:d=${main.toFixed(3)}[bg]`,
    `[bg][app]overlay=0:${LENS.appY}[b0]`,
    `[b0][lr]overlay=${lx}:${LENS.lensY}:enable='lt(t,${tSwitch.toFixed(3)})'[b1]`,
    `[b1][ll]overlay=${lx}:${LENS.lensY}:enable='gte(t,${tSwitch.toFixed(3)})'[b2]`,
    `[b2][3:v]overlay=0:0:enable='lt(t,${tSwitch.toFixed(3)})'[b3]`,
    `[b3][4:v]overlay=0:0:enable='gte(t,${tSwitch.toFixed(3)})'[c0]`];
  steps.forEach(([id], i) => {
    const t0 = mark[id], t1 = i + 1 < steps.length ? mark[steps[i + 1][0]] : main;
    parts.push(`[c${i}][${5 + i}:v]overlay=0:0:enable='between(t,${t0.toFixed(3)},${(t1 - 0.001).toFixed(3)})'[c${i + 1}]`);
  });
  parts.push(`[1:v]format=rgba,fade=t=out:st=${TITLE_S - 0.35}:d=0.35:alpha=1[tt]`);
  parts.push(`[c${steps.length}][tt]overlay=eof_action=pass:format=auto,format=yuv420p,fps=${FPS}[body]`);
  parts.push(`[2:v]fps=${FPS},format=yuv420p,setsar=1[end]`);
  parts.push(`[body][end]xfade=transition=fade:duration=${XFADE}:offset=${(main - XFADE).toFixed(3)},scale=in_range=auto:out_range=tv,format=yuv420p[v]`);
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", parts.join(";"), "-map", "[v]", "-map", `${audioIdx}:a`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], { stdio: "inherit" });
  return total;
}

// ---------- skládání ----------
function compose(rec, out, titlePng, endPng) {
  const { s } = rec;
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
    // Snímky jsou JPEG / RGB (plný rozsah) – výstup ve standardním TV rozsahu, jinak vyjde yuvj420p.
    `scale=in_range=auto:out_range=tv,format=yuv420p[v]`);
  const total = main - XFADE + END_S + XFADE;
  execFileSync("ffmpeg", ["-v", "error", "-y",
    ...rec.input,
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
// prepare: dočasné soubory scény, které musí existovat už při tisku PDF.
for (const n of names) SCENES[n].prepare?.();
await renderOverlays([[endPage(), endPng], ...names.map((n) => [titlePage(SCENES[n].title), path.join(WORK, `title-${n}.png`)]),
  ...(names.includes("thumbnails") ? PDFS.map(([file, title, no]) => [pdfPage(title, no), file, "pdf"]) : []),
  ...names.flatMap((n) => SCENES[n].pdfs ?? [])]);

for (const n of names) {
  const scene = SCENES[n];
  const a = await open(scene);
  a.sceneVw = scene.vw;
  try {
    await scene.before?.(a);
    a.crop = scene.crops.main;
    const dir = path.join(WORK, n);
    const r = scene.screen ? await recordScreen(a, dir, scene.screen.win) : await record(a, dir);
    await scene.run(a, r);
    const rec = await r.stop();
    const out = path.join(OUT, scene.file);
    // Překryvy scény s lupou závisí na poloze stavového řádku změřené v before().
    if (scene.compose) await renderOverlays(lensOverlays(scene, n));
    const total = (scene.compose ?? compose)(rec, out, path.join(WORK, `title-${n}.png`), endPng, scene, n);
    // Časování pro hudbu: délka videa, začátek závěrečné karty, střihy a vstupy (klávesy, kliky).
    fs.writeFileSync(out.replace(/\.mp4$/i, ".timing.json"), JSON.stringify({ total, endcard: rec.dur - XFADE,
      cuts: rec.cuts.map((k) => k.t), inputs: rec.inputs ?? [] }, null, 1));
    console.log(`${scene.file}  ${total.toFixed(1)} s  ${rec.frames} snímků  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
  } finally {
    try { await scene.after?.(a); } catch (err) { console.error(`úklid scény ${n} selhal:`, err.message); }
    // Zpět tmavé téma a výchozí okno (scény palette a appearance přepínají na světlé).
    await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.setTheme("dark"))`).catch(() => {});
    await a.c.evaluate(`document.documentElement.style.zoom = ""`).catch(() => {});
    await a.c.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
    a.c.close();
    try { a.unstage?.(); } catch {}
  }
}
