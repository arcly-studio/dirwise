// Reklamní video Dirwise na hudbu 124 BPM (1 doba = 0,484 s, takt = 1,935 s, 16 taktů = 30,97 s):
// 1080×1920 (TikTok / Shorts) a 1920×1080 (YouTube, trailer pro Store) ze stejných záběrů.
// Záběry jsou skutečné jako v shorts.mjs: screencast webview přes CDP (Page.startScreencast) při zvětšeném
// měřítku, jen záběr průhlednosti (Acrylic) ze skutečné obrazovky (ffmpeg gdigrab, okno před testovací tapetou
// – okno je na pár sekund nad ostatními). Akce v záznamu jsou naplánované na doby (`at(doba)`), střihy padají
// na snímek round(doba × 0,484 × 30) – tolerance pod půl snímku. Záběry se nezrychlují.
// Kamera: u záběrů funkcí výřez kolem místa akce (na výšku 1,8×, na šířku 1,3×) s pomalým panem mezi body,
// které záznam zapíše z DOM (RECS.cam, a.point / a.box); celé okno jen drop, Real thumbnails, vzhled, razítka.
// Texty, štítky kláves, „razítka“, karty s logem, náraz na dropu (zoom 1,08 → 1 + bílý záblesk 2 snímky)
// jsou vrstva z headless Chrome/Edge (snímek po snímku), podklad a okno se záběrem skládá ffmpeg.
// Předpoklad: demo prostředí jako u demo.mjs (C:\Demo, mksettings.mjs, dev s demo-conf.json a CDP 9333).
// Koš: jen vlastní demo soubory z C:\Demo; co po záznamu zbyde v Koši, se trvale smaže jen podle cesty + času
// smazání a zkopíruje z docs/demo (jako shorts.mjs).
// node scripts/docs-media/promo.mjs [portrait|landscape] [--compose] [--audio <m4a>] [--out <složka>]
//   [--only <záznam,…>]   --compose = jen složit z posledních záznamů (bez aplikace); vedle videí vzniká kontrolní mřížka 1 snímek/s.
// node scripts/docs-media/promo.mjs [portrait|landscape] --music <m4a> [--suffix -v2]
//   = jen vyměnit hudbu u hotových videí (obraz se nepřekódovává), výstupy vedle s příponou.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { setup } from "./setup.mjs";
import { announceFocus, screen, stage } from "./wallpaper.mjs";
import { swapMusic } from "./music.mjs";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const SOCIAL = root("dirwise-socialni-site/dirwise-socialni-site/");
const AUDIO = path.resolve(opt("--audio", `${SOCIAL}hudba/promo/dirwise-promo-124bpm.m4a`));
const OUT = path.resolve(opt("--out", `${SOCIAL}promo`));
const ARCLY = path.resolve(opt("--arcly", root("../arcly-studio/logo/png/arcly-logo-on-dark-2000w.png")));
// --only palette,look = přetočit jen vybrané záznamy (ostatní zůstanou z minulého běhu).
const ONLY = opt("--only", null)?.split(",");
const COMPOSE_ONLY = args.includes("--compose") && args.splice(args.indexOf("--compose"), 1);
const MUSIC = opt("--music", null), SUFFIX = opt("--suffix", "-v2");
const WORK = path.join(os.tmpdir(), "dirwise-promo-work");
const FPS = 30, BEAT = 60 / 124, BEATS = 64;
const frame = (beat) => Math.round(beat * BEAT * FPS);
const TOTAL = frame(BEATS);
const DEMO = "C:\\Demo";
const SUMMER = `${DEMO}\\Photos\\Summer 2026`;
const DEMO_SRC = root("docs/demo/");
const restoreDemo = (p) => fs.cpSync(DEMO_SRC + p.replace(/^C:\\Demo\\/, ""), p, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- formáty ----------
// win = okno se záběrem ve výstupu (px); rec = viewport záznamu v CSS px, výřez v CSS px (poměr jako win),
// side = scény se sidebarem; screen = okno pro záznam obrazovky (px) a jeho výřez;
// zoom = přiblížení místa akce u záběrů funkcí (kamera, viz RECS.cam).
const FORMATS = {
  portrait: {
    file: "dirwise-promo-1080x1920.mp4", W: 1080, H: 1920,
    // Nahoře texty (bezpečná zóna pod horní lištou TikToku), pod nimi okno; spodních 20 % jen záběr.
    win: { x: 0, y: 560, w: 1080, h: 1360, r: [40, 40, 0, 0] },
    rec: { vw: 920, vh: 907, scale: 1.5, crop: { x: 200, y: 0, w: 720, h: 907 } },
    side: { vw: 720, vh: 907, crop: { x: 0, y: 0, w: 720, h: 907 } },
    screen: { win: { X: 0, Y: 0, W: 900, H: 1032 }, crop: { x: 40, y: 0, w: 820, h: 1032 } },
    head: "left:60px;right:60px;top:170px;height:380px;align-items:center;text-align:center",
    key: [540, 1390], stamps: "left:0;right:0;top:700px;height:640px;align-items:center",
    text: 104, sub: 92, keySize: 64, bigKey: 104, link: true, zoom: 1.8,
  },
  landscape: {
    file: "dirwise-promo-1920x1080.mp4", W: 1920, H: 1080,
    // Texty vlevo v úzkém sloupci, okno se záběrem vpravo (~2/3 šířky, mírně přes pravý okraj).
    win: { x: 700, y: 140, w: 1280, h: 800, r: [20, 20, 20, 20] },
    rec: { vw: 960, vh: 600, scale: 1.5, crop: { x: 0, y: 0, w: 960, h: 600 } },
    side: { vw: 960, vh: 600, crop: { x: 0, y: 0, w: 960, h: 600 } },
    // Štítky bez CSS zoomu (1:1 s oknem ve výstupu): pod zoomem aplikace posadí kontextové menu
    // na 1,5násobek souřadnic a na nízkém okně ho vytlačí mimo obraz.
    // S kamerou 1,3× vychází stejné měřítko UI jako u ostatních záběrů (960 CSS px na 1280 px).
    tags: { vw: 1280, vh: 800, scale: 1, crop: { x: 0, y: 0, w: 1280, h: 800 } },
    // Celé okno 1:1 (záběry vzhledu jsou bez přiblížení).
    screen: { win: { X: 0, Y: 0, W: 1280, H: 800 }, crop: { x: 0, y: 0, w: 1280, h: 800 } },
    head: "left:72px;width:560px;top:0;bottom:0;align-items:flex-start;text-align:left",
    key: [1310, 862], stamps: "left:72px;width:560px;top:0;bottom:0;align-items:flex-start",
    text: 92, sub: 90, keySize: 48, bigKey: 92, link: false, zoom: 1.3,
  },
};

// ---------- střihová tabulka (doby od začátku, 4 doby = takt) ----------
// [od, počet dob, zdroj]; zdroj = záznam, značka v něm (výchozí t0 = doba 0 scénáře) a posun v dobách.
// Záběry funkcí jdou přes kameru záznamu (RECS.cam); celé okno: drop (full), Real thumbnails, vzhled, razítka.
const SHOTS = [
  [0, 1, null], // úvodní titulek přes celý obraz
  [1, 1, { rec: "thumbs", b: 3 }], [2, 1, { rec: "palette", b: 1.3 }], [3, 1, { rec: "look", mark: "strong", b: 2 }],
  [4, 2, null], // DROP: logo
  [6, 2, { rec: "preview", b: -2.2, full: true }],
  [8, 4, { rec: "palette", b: 0 }], [12, 4, { rec: "preview", b: 0 }], [16, 4, { rec: "columns", b: 0 }],
  [20, 4, { rec: "tabs", b: 0 }], [24, 4, { rec: "split", b: 0 }], [28, 4, { rec: "undo", b: 0 }],
  [32, 4, { rec: "recycle", b: 0 }], [36, 4, { rec: "thumbs", b: 0 }], [40, 4, { rec: "tags", b: 0 }],
  [44, 1, { rec: "look", b: -1 }], [45, 1, { rec: "look", mark: "dark", b: 0.6 }], [46, 2, { rec: "look", mark: "transp", b: 0.8 }],
  [48, 1, { rec: "preview", b: 0.4 }], [49, 1, { rec: "palette", b: 1.4 }], [50, 1, { rec: "split", b: 0.5 }], [51, 1, { rec: "undo", b: 2.3 }],
  [52, 4, { rec: "look", mark: "strong", b: 3 }],
  [56, 8, null], // závěr
];
// Texty: [od, počet dob, nadpis, podnadpis]; max. 6 slov na obrazovce.
const TEXTS = [
  [1, 3, "Your file manager wastes your time"],
  [6, 2, "Meet Dirwise", "Free Windows file manager"],
  [8, 4, "Ctrl+K – jump anywhere"], [12, 4, "Space – instant preview"], [16, 4, "Column view"], [20, 4, "Tabs"],
  [24, 4, "Split view + F5 copy"], [28, 4, "Oops? Ctrl+Z"], [32, 4, "Restore in one click"], [36, 4, "Real thumbnails"],
  [40, 4, "Color tags"], [44, 4, "Dark mode + Acrylic"],
];
// Štítky kláves ve chvíli stisku (doby sedí s plánem záznamů níž); BIG = takt 12 bez textu, štítek místo nadpisu.
const KEYS = [[8, 1.5, "Ctrl + K"], [10, 1.5, "Enter"], [12, 2, "Space"], [14, 1, "→"], [15, 1, "→"], [20, 1.5, "Ctrl + T"],
  [24, 1.5, "Ctrl + Shift + D"], [27, 1, "F5"], [28, 1.5, "Delete"], [30, 2, "Ctrl + Z"]];
const BIG_KEYS = [[48, 1, "Space"], [49, 1, "Ctrl + K"], [50, 1, "Ctrl + Shift + D"], [51, 1, "Ctrl + Z"]];
const STAMPS = [[52, "Free"], [53, "Open source"], [54, "Under 3 MB"], [55, "No tracking"]];
const CARDS = { hook: [0, 1], logo: [4, 2], end: [56, 8] };

// ---------- headless Chrome/Edge (vrstvy) ----------
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const FONTS = [700, 800].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2")}`).join("\n");
// Pozadí jako karta s logem v shorts.mjs (barvy tmavého tématu aplikace).
const BG = "radial-gradient(120% 80% at 30% 20%,#34343a 0%,#232325 45%,#161618 100%)";

async function withChrome(W, H, fn) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((c) => fs.existsSync(c));
  if (!exe) throw new Error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>.");
  const PORT = 9334;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-promo-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
    "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); }
      catch { await sleep(200); }
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
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const load = async (html) => {
      const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
      await send("Page.setDocumentContent", { frameId, html });
      await send("Runtime.evaluate", { expression: "Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode())])", awaitPromise: true });
    };
    const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
    const shot = async (file) => fs.writeFileSync(file, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    await fn({ load, evaluate, shot });
    ws.close();
  } finally {
    proc.kill();
    await sleep(500);
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  }
}

const doc = (F, body, css = "") => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${F.W}px;height:${F.H}px;overflow:hidden;background:transparent}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;position:relative}${css}</style></head><body>${body}</body></html>`;

// Obdélník se zaoblenými rohy [lh, ph, pd, ld] jako SVG cesta.
function rrect({ x, y, w, h, r: [a, b, c, d] }) {
  return `M${x + a} ${y}H${x + w - b}${b ? `A${b} ${b} 0 0 1 ${x + w} ${y + b}` : ""}V${y + h - c}${c ? `A${c} ${c} 0 0 1 ${x + w - c} ${y + h}` : ""}` +
    `H${x + d}${d ? `A${d} ${d} 0 0 1 ${x} ${y + h - d}` : ""}V${y + a}${a ? `A${a} ${a} 0 0 1 ${x + a} ${y}` : ""}Z`;
}
// Podklad (pozadí + stín okna) a maska (pozadí s otvorem pro záběr + jemný okraj), obojí PNG.
async function renderPlates(F, dir) {
  const { W, H, win } = F;
  const radius = win.r.map((v) => `${v}px`);
  const box = `left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;border-radius:${radius[0]} ${radius[1]} ${radius[2]} ${radius[3]}`;
  await withChrome(W, H, async (b) => {
    await b.load(doc(F, `<div class="bg"></div><div class="win"></div>`,
      `.bg{position:absolute;inset:0;background:${BG}}.win{position:absolute;${box};background:#000;box-shadow:0 30px 90px #000b,0 8px 24px #0008}`));
    await b.shot(path.join(dir, "bg.png"));
    await b.load(doc(F, `<div class="bg"></div><div class="edge"></div>`,
      `.bg{position:absolute;inset:0;background:${BG};clip-path:path(evenodd,"M0 0H${W}V${H}H0Z ${rrect(win)}")}
       .edge{position:absolute;${box};box-shadow:inset 0 0 0 1px #ffffff26}`));
    await b.shot(path.join(dir, "mask.png"));
  });
}

// Vrstva nad záběrem: snímek po snímku podle tabulek nahoře (stav se počítá z čísla snímku, ne z času prohlížeče).
async function renderOverlay(F, dir) {
  const fr = (b) => frame(b);
  const data = {
    texts: TEXTS.map(([b, n, t, sub]) => ({ s: fr(b), e: fr(b + n), t, sub })),
    keys: KEYS.map(([b, n, t]) => ({ s: fr(b), e: fr(b + n), t })),
    big: BIG_KEYS.map(([b, n, t]) => ({ s: fr(b), e: fr(b + n), t })),
    stamps: STAMPS.map(([b, t]) => ({ s: fr(b), e: fr(56), t })),
    hook: CARDS.hook.map((v, i) => fr(i ? CARDS.hook[0] + v : v)),
    logo: CARDS.logo.map((v, i) => fr(i ? CARDS.logo[0] + v : v)),
    end: CARDS.end.map((v, i) => fr(i ? CARDS.end[0] + v : v)),
    beat: BEAT * FPS, link: F.link,
  };
  const icon = dataUri(root("app-icon.png"), "image/png");
  const portrait = F.H > F.W;
  const css = `
.layer{position:absolute;display:flex;flex-direction:column;justify-content:center}
.head{${F.head};gap:14px}
.t{font-weight:800;line-height:1.02;letter-spacing:-0.03em;text-shadow:0 3px 18px #0008,0 1px 3px #0006}
.h{font-size:${F.text}px}.s{font-size:${F.sub}px;font-weight:700;color:#e4e4ea;letter-spacing:-0.025em}
.card{position:absolute;inset:0;background:${BG};display:flex;flex-direction:column;align-items:center;justify-content:center;visibility:hidden}
.hook .h{font-size:${portrait ? 124 : 112}px;max-width:${portrait ? 940 : 1400}px;text-align:center}
.logo img{width:${portrait ? 420 : 330}px;height:${portrait ? 420 : 330}px;filter:drop-shadow(0 20px 50px #000a)}
.logo .h{font-size:${portrait ? 132 : 120}px;margin-top:${portrait ? 46 : 30}px}
.end img.icon{width:${portrait ? 340 : 250}px;height:${portrait ? 340 : 250}px;filter:drop-shadow(0 18px 40px #0009)}
.end .name{font-size:${portrait ? 150 : 124}px;margin-top:${portrait ? 34 : 18}px}
.end .store{font-size:${portrait ? 70 : 58}px;font-weight:700;margin-top:${portrait ? 30 : 18}px}
.end .link{font-size:${portrait ? 62 : 50}px;font-weight:700;font-style:italic;color:#c9c9d2;margin-top:${portrait ? 26 : 16}px}
.end img.arcly{position:absolute;left:50%;transform:translateX(-50%);width:${portrait ? 320 : 280}px;${portrait ? "top:1430px" : "bottom:64px"};opacity:.9}
.end .stack{display:flex;flex-direction:column;align-items:center;${portrait ? "margin-top:-180px" : "margin-top:-40px"}}
.key{position:absolute;left:${F.key[0]}px;top:${F.key[1]}px;transform:translate(-50%,-50%);padding:${Math.round(F.keySize * 0.4)}px ${Math.round(F.keySize * 0.8)}px;
 border-radius:${Math.round(F.keySize * 0.45)}px;background:rgba(20,20,20,.9);border:1px solid rgba(255,255,255,.18);
 font:700 ${F.keySize}px Inter,sans-serif;white-space:nowrap;box-shadow:0 10px 30px #0007}
.big{position:absolute;${F.head};display:flex;flex-direction:column;justify-content:center}
.big span{padding:${Math.round(F.bigKey * 0.32)}px ${Math.round(F.bigKey * 0.62)}px;border-radius:${Math.round(F.bigKey * 0.36)}px;background:rgba(20,20,20,.92);
 border:2px solid rgba(255,255,255,.22);font:700 ${F.bigKey}px Inter,sans-serif;white-space:nowrap;box-shadow:0 12px 40px #0008}
.stamps{${F.stamps};gap:26px}
.stamps span{display:inline-block;white-space:nowrap;padding:14px 38px;border:6px solid #fff;border-radius:22px;background:rgba(18,18,20,.88);
 font-weight:800;font-size:${portrait ? 96 : 90}px;letter-spacing:-0.03em;line-height:1.05;box-shadow:0 14px 40px #000a;visibility:hidden}
.flash{position:absolute;inset:0;background:#fff;opacity:0}`;
  const body = `
<div class="layer head"><div class="t h" id="h"></div><div class="t s" id="s"></div></div>
<div class="key" id="key"></div>
<div class="big" id="big"><span></span></div>
<div class="layer stamps" id="stamps">${STAMPS.map(([, t], i) => `<span style="--r:${[-3, 2, -2, 3][i]}deg">${t}</span>`).join("")}</div>
<div class="card hook" id="hook"><div class="t h">${TEXTS[0][2]}</div></div>
<div class="card logo" id="logo"><img src="${icon}"><div class="t h">Dirwise</div></div>
<div class="card end" id="end"><div class="stack"><img class="icon" src="${icon}"><div class="t name">Dirwise</div>
 <div class="t store">Get it on Microsoft Store</div>${F.link ? `<div class="t link">Link in bio</div>` : ""}</div>
 <img class="arcly" src="${dataUri(ARCLY, "image/png")}"></div>
<div class="flash" id="flash"></div>
<script>
const D = ${JSON.stringify(data)};
const $ = (id) => document.getElementById(id);
const clamp = (v) => Math.max(0, Math.min(1, v));
const out3 = (p) => 1 - (1 - p) ** 3;
// Nájezd 150 ms (4,5 snímku): posun zespodu + zprůhlednění.
const slide = (el, n, s, dy = 46) => { const e = out3(clamp((n - s) / 4.5)); el.style.opacity = e; el.style.transform = "translateY(" + ((1 - e) * dy).toFixed(1) + "px)"; return e.toFixed(2); };
const show = (el, on) => { el.style.visibility = on ? "visible" : "hidden"; };
window.frame = (n) => {
  const key = [];
  const t = D.texts.find((x) => n >= x.s && n < x.e);
  show($("h").parentNode, !!t);
  if (t) { $("h").textContent = t.t; $("s").textContent = t.sub || ""; $("s").style.display = t.sub ? "" : "none"; key.push(t.t, slide($("h").parentNode, n, t.s)); }
  const k = D.keys.find((x) => n >= x.s && n < x.e);
  show($("key"), !!k);
  if (k) { $("key").textContent = k.t; const o = clamp(Math.min((n - k.s + 1) / 3, (k.e - n) / 3)); $("key").style.opacity = o; key.push(k.t, o.toFixed(2)); }
  const g = D.big.find((x) => n >= x.s && n < x.e);
  show($("big"), !!g);
  if (g) { const sp = $("big").firstChild; sp.textContent = g.t; const e = out3(clamp((n - g.s + 1) / 3)); sp.style.transform = "scale(" + (1.25 - 0.25 * e).toFixed(3) + ")"; key.push(g.t, e.toFixed(2)); }
  // Razítka: na každou dobu jedno, dopadne ze zvětšení 1,4 a zůstane.
  [...$("stamps").children].forEach((sp, i) => {
    const x = D.stamps[i], on = n >= x.s && n < x.e;
    show(sp, on);
    if (on) { const e = out3(clamp((n - x.s + 1) / 4)); sp.style.opacity = e; sp.style.transform = "rotate(var(--r)) scale(" + (1.4 - 0.4 * e).toFixed(3) + ")"; key.push(x.t, e.toFixed(2)); }
  });
  const hook = n >= D.hook[0] && n < D.hook[1];
  show($("hook"), hook);
  if (hook) key.push("hook", slide($("hook").firstChild, n, D.hook[0]));
  // DROP: celý obraz zoom 1,08 → 1 (8 snímků), logo z 0,8 naroste, bílý záblesk 2 snímky.
  const logo = n >= D.logo[0] && n < D.logo[1];
  show($("logo"), logo);
  if (logo) {
    const m = n - D.logo[0];
    const z = 1 + 0.08 * (1 - clamp(m / 8)) ** 2;
    const g2 = 0.8 + 0.2 * out3(clamp(m / 9)) + 0.05 * (m / (D.logo[1] - D.logo[0]));
    $("logo").style.transform = "scale(" + z.toFixed(4) + ")";
    $("logo").firstChild.style.transform = "scale(" + g2.toFixed(4) + ")";
    key.push("logo", m);
  }
  $("flash").style.opacity = n === D.logo[0] ? 0.9 : n === D.logo[0] + 1 ? 0.45 : 0;
  // Závěr: logo + název, po 2 dobách Store, po taktu Link in bio; Arcly Studio od začátku.
  const end = n >= D.end[0] && n < D.end[1];
  show($("end"), end);
  if (end) {
    const m = n - D.end[0], st = $("end").querySelector(".stack").children;
    key.push("end", slide(st[0], m, 0, 30), slide(st[1], m, 0), slide(st[2], m, Math.round(2 * D.beat)));
    if (st[3]) key.push(slide(st[3], m, Math.round(4 * D.beat)));
    key.push(slide($("end").querySelector(".arcly"), m, Math.round(1 * D.beat), 0));
  }
  return JSON.stringify(key);
};
</script>`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await withChrome(F.W, F.H, async (b) => {
    await b.load(doc(F, body, css));
    let prev = null;
    for (let n = 0; n < TOTAL; n++) {
      const file = path.join(dir, `${String(n).padStart(4, "0")}.png`);
      // Až po vykreslení změny – jinak snímek zachytí předchozí stav (vrstva by byla o snímek pozadu).
      const k = await b.evaluate(`Promise.resolve(frame(${n})).then((k) => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(k)))))`);
      if (k === prev) fs.copyFileSync(path.join(dir, `${String(n - 1).padStart(4, "0")}.png`), file);
      else await b.shot(file);
      prev = k;
    }
  });
}

// ---------- ovládání aplikace (jako shorts.mjs) ----------
// Kurzor jako DOM overlay (screencast skutečný kurzor nekreslí).
const cursor = `(() => {
  if (window.__cursor) return;
  const cur = document.createElement("div");
  cur.style.cssText = "position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)";
  cur.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-2.6 1.2-3.4-6.7L5 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.body.append(cur);
  addEventListener("mousemove", (e) => { const z = window.__zoom || 1; cur.style.transform = "translate(" + (e.clientX / z - 4) + "px," + (e.clientY / z - 3) + "px)"; }, true);
  addEventListener("mousedown", () => { cur.firstChild.style.transform = "scale(.85)"; setTimeout(() => (cur.firstChild.style.transform = ""), 150); }, true);
  window.__cursor = true;
})();`;

function jpegSize(buf) {
  for (let i = 2; i < buf.length;) {
    const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error("JPEG bez SOF");
}
// Screencast WebView2 vrací snímky v měřítku obrazovky – větší měřítko dává CSS zoom celé stránky.
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

function controls(c, zoom, mouse0) {
  let mouse = mouse0;
  const a = { c, zoom, marks: {} };
  const find = (expr) => c.evaluate(`(() => { const e = ${expr}; if (!e) return null; const r = e.getBoundingClientRect();
    return [Math.round(r.x + Math.min(r.width / 2, 80)), Math.round(r.y + r.height / 2)]; })()`);
  // Položka podle konce cesty: poslední viditelná (ve sloupcích nejhlubší), s first první (levý panel).
  a.item = (end, first = false) => find(`[...document.querySelectorAll("[data-path]")].filter((e) => e.dataset.path.endsWith(${JSON.stringify(end)}) && e.getBoundingClientRect().width > 0)${first ? "[0]" : ".pop()"}`);
  a.sel = (s, text) => find(`[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)}` : "true"} && e.getBoundingClientRect().width > 0)`);
  a.selStart = (s, text) => find(`[...document.querySelectorAll(${JSON.stringify(s)})].find((e) => e.textContent.trim().startsWith(${JSON.stringify(text)}) && e.getBoundingClientRect().width > 0)`);
  a.itemsBelow = (minY) => c.evaluate(`[...document.querySelectorAll("[data-path]")].map((e) => [e, e.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && r.y / (window.__zoom || 1) >= ${minY})
    .map(([e, r]) => ({ path: e.dataset.path, p: [Math.round(r.x + Math.min(r.width / 2, 80)), Math.round(r.y + r.height / 2)] }))`);
  // Přejezd podle skutečného času – CDP volání při běžícím screencastu trvají různě dlouho.
  a.moveTo = async ([x, y], ms = 260) => {
    const [x0, y0] = mouse, start = Date.now();
    for (let t = 0; t < 1;) {
      t = Math.min(1, (Date.now() - start) / ms);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + (x - x0) * e, y: y0 + (y - y0) * e });
      if (t < 1) await c.sleep(12);
    }
    mouse = [x, y];
  };
  a.press = (k, code, vk, mods = 0, text) => c.key(k, code, vk, mods, text);
  const button = async (p, button, clickCount = 1, mods = 0) => {
    await c.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p[0], y: p[1], button, clickCount, modifiers: mods });
    await c.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p[0], y: p[1], button, clickCount, modifiers: mods });
  };
  // Hodiny scénáře: doba 0 = t0 (za `lead` s), at(b) čeká na dobu b; značky jsou v epoch sekundách.
  a.clock = (lead = 1.5) => {
    const t0 = Date.now() / 1000 + lead;
    a.marks.t0 = t0;
    return async (b) => { const ms = (t0 + b * BEAT) * 1000 - Date.now(); if (ms > 0) await c.sleep(ms); };
  };
  a.mark = (name) => { a.marks[name] = Date.now() / 1000; };
  // Kamera: body akce v CSS px viewportu, ze kterých se při skládání počítá výřez. Bod = [x, y],
  // prvek = [střed x, střed y, šířka, výška, center] – větší než výřez se zarovná k levému/hornímu okraji,
  // s center: true na střed (náhled: fotka uprostřed dialogu).
  a.focus = {};
  a.point = (name, p) => { if (p) a.focus[name] = [p[0] / zoom, p[1] / zoom]; };
  a.box = async (name, expr, center = false) => {
    const r = await c.evaluate(`(() => { const e = ${expr}; if (!e) return null; const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2, r.width, r.height]; })()`);
    if (!r) throw new Error(`kamera: nenalezeno ${name}`);
    a.focus[name] = [...r.map((v) => v / zoom), center];
  };
  // Klik přesně na dobu b: cíl se hledá dobu předem (opakovaně, prvek se může teprve vykreslit), pak přejezd myší.
  a.clickAt = async (at, b, target, what, { right = false, double = false, mods = 0 } = {}) => {
    await at(b - 1);
    let p = null;
    for (let i = 0; i < 20 && !(p = await target()); i++) await c.sleep(40);
    if (!p) throw new Error(`nenalezeno: ${what}`);
    a.point(what, p);
    await a.moveTo(p);
    await at(b);
    const late = (Date.now() / 1000 - a.marks.t0) / BEAT - b;
    if (late > 0.15) console.warn(`  klik „${what}“ o ${late.toFixed(2)} doby později než doba ${b}`);
    if (double) { await button(p, "left", 1); await button(p, "left", 2); }
    else await button(p, right ? "right" : "left", 1, mods);
  };
  a.click = async (p, what = "") => {
    if (!p) throw new Error(`nenalezeno: ${what}`);
    await a.moveTo(p, 400);
    await c.sleep(100);
    await button(p, "left");
  };
  a.invoke = (cmd, params) => c.evaluate(`window.__TAURI_INTERNALS__.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(params)})`);
  // Navigace přes pole cesty (Ctrl+L); fast = bez čekání (uvnitř záběru).
  a.go = async (dir, fast = false) => {
    await a.press("l", "KeyL", 76, 2);
    await c.sleep(fast ? 40 : 250);
    // Text pole nemusí být označený (pak by se cesta připsala) – nejdřív Ctrl+A.
    await a.press("a", "KeyA", 65, 2);
    await c.send("Input.insertText", { text: dir });
    await a.press("Enter", "Enter", 13, 0, "\r");
    if (!fast) await c.sleep(700);
  };
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
  // Paleta (příprava záběru vzhledu): dotaz a klik na výsledek.
  a.palette = async (query, label) => {
    await a.press("k", "KeyK", 75, 2);
    await c.sleep(450);
    await c.type(query, 70);
    await c.sleep(500);
    await a.click(await a.sel(".fw-palette [role=option] *", label), label);
  };
  return a;
}

// Koš: co scéna smazala a v Koši zůstalo, se trvale smaže jen podle cesty + času smazání a vrátí z docs/demo.
async function cleanupTrashed(a, paths, since) {
  const missing = paths.filter((p) => !fs.existsSync(p));
  if (missing.length === 0) return;
  const mine = (await a.invoke("list_recycle_bin", {})).filter((i) =>
    missing.includes(`${i.original_dir}\\${i.name}`) && i.deleted >= since - 5);
  if (mine.length > 0) await a.invoke("purge_recycled", { ids: mine.map((i) => i.id), elevate: false });
  for (const p of missing) restoreDemo(p);
}

// ---------- záznamy ----------
const F5_COPY = `${DEMO}\\Projects\\meeting-notes.md`;
// Složka s videi i fotkami pro „Real thumbnails“: videa = barevné animované přechody (ffmpeg), fotky = kopie
// demo fotek. Vzniká v C:\Demo\Videos a po záznamu se smaže.
const TRIP = `${DEMO}\\Videos\\Trip 2026`;
const TRIP_VIDEOS = [
  ["airport-morning", ["0x8ecae6", "0x219ebc", "0xffb703"]], ["beach-sunset", ["0xff7b54", "0xffb26b", "0x3a0ca3"]],
  ["boat-ride", ["0x00b4d8", "0x0077b6", "0xcaf0f8"]], ["city-lights", ["0x2b2d42", "0xef233c", "0xffd166"]],
  ["harbor-evening", ["0x7209b7", "0xf72585", "0x4cc9f0"]], ["lake-swim", ["0x48cae4", "0x0096c7", "0x90e0ef"]],
  ["market-walk", ["0xf4a261", "0xe76f51", "0x2a9d8f"]], ["rooftop-dinner", ["0x5a189a", "0xff9e00", "0x240046"]],
];
function makeTrip() {
  if (fs.existsSync(TRIP)) throw new Error(`${TRIP} už existuje – nechávám ho být`);
  fs.mkdirSync(TRIP);
  TRIP_VIDEOS.forEach(([name, [x, y, z]], i) => {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi",
      "-i", `gradients=s=640x360:c0=${x}:c1=${y}:c2=${z}:n=3:seed=${701 + i * 7}:duration=3:speed=0.08`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart",
      `${TRIP}\\${name}.mp4`]);
  });
  fs.readdirSync(SUMMER).filter((f) => f.endsWith(".jpg")).slice(0, 10).forEach((f) => fs.copyFileSync(`${SUMMER}\\${f}`, `${TRIP}\\${f}`));
}

// Každý záznam: before (příprava, mimo záběr), run (doby od t0 jako ve střihové tabulce a KEYS), after (úklid).
const RECS = {
  // Paleta nabízí složky z oblíbených, nedávných, záložek a podsložek – Summer 2026 se předem otevře
  // dvojklikem (zapíše se do nedávných), skok pak vede z Documents.
  palette: {
    cam: [[0, "pal"]],
    async before(a) {
      await a.reset(`${DEMO}\\Photos`, "Icons");
      await a.c.evaluate(`document.querySelector("[data-path$='Summer 2026']").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`);
      await a.c.sleep(700);
      await a.go(`${DEMO}\\Documents`);
    },
    async run(a) {
      const at = a.clock();
      await at(0);
      await a.press("k", "KeyK", 75, 2);
      await a.c.sleep(150);
      await a.box("pal", `document.querySelector(".fw-palette")`);
      await at(1);
      await a.c.type("sum", 45);
      await at(2);
      await a.press("Enter", "Enter", 13, 0, "\r");
      await at(4.8);
    },
  },
  preview: {
    cam: [[0, "dlg"]],
    async before(a) {
      await a.reset(SUMMER, "Icons");
      const items = await a.itemsBelow(150);
      await a.click(items[5]?.p, "fotka");
      await a.c.sleep(500);
    },
    async run(a) {
      const at = a.clock(1.8);
      await at(0);
      await a.press(" ", "Space", 32, 0, " ");
      await a.c.sleep(250);
      await a.box("dlg", `document.querySelector("[role=dialog]")`, true);
      await at(2);
      await a.press("ArrowRight", "ArrowRight", 39);
      await at(3);
      await a.press("ArrowRight", "ArrowRight", 39);
      await at(4.8);
      await a.press("Escape", "Escape", 27);
    },
  },
  columns: {
    cam: [[0, "Photos"], [1, "Summer 2026"], [2, "coastline.jpg"], [3.4, "pane"]],
    before: (a) => a.reset(DEMO, "Columns"),
    async run(a) {
      const at = a.clock();
      await a.clickAt(at, 0, () => a.item(`${DEMO}\\Photos`), "Photos");
      await a.clickAt(at, 1, () => a.item("\\Summer 2026"), "Summer 2026");
      await a.clickAt(at, 2, () => a.item("\\coastline.jpg"), "coastline.jpg");
      await at(3);
      await a.press("ArrowDown", "ArrowDown", 40);
      await a.c.sleep(150);
      await a.box("pane", `[...document.querySelectorAll(".fw-column-pane")].pop()`);
      await at(4.8);
    },
  },
  tabs: {
    cam: [[0, "tab"], [1.75, "záložka Summer 2026"], [2.5, "záložka Documents"]],
    before: (a) => a.reset(SUMMER, "Icons"),
    async run(a) {
      const at = a.clock();
      await at(0);
      await a.press("t", "KeyT", 84, 2);
      await a.c.sleep(150);
      await a.box("tab", `[...document.querySelectorAll("[role=tab]")].pop()`);
      await at(1);
      await a.go(`${DEMO}\\Documents`, true);
      // Přepnutá záložka se chvíli vykresluje – kliky dřív, ať je na konci taktu obsah vidět.
      await a.clickAt(at, 1.75, () => a.sel("[role=tab]", "Summer 2026"), "záložka Summer 2026");
      await a.clickAt(at, 2.5, () => a.sel("[role=tab]", "Documents"), "záložka Documents");
      await at(4.8);
    },
  },
  // Kamera z vybraného souboru na druhý panel, kam F5 kopíruje.
  split: {
    cam: [[1, "file"], [3, "right"]],
    async before(a) {
      fs.rmSync(F5_COPY, { force: true });
      await a.reset(`${DEMO}\\Documents`, "Icons");
      const p = await a.item("\\Documents\\meeting-notes.md");
      a.point("file", p);
      await a.click(p, "meeting-notes.md");
    },
    async run(a) {
      const at = a.clock();
      await at(0);
      await a.press("D", "KeyD", 68, 10);
      await at(1);
      await a.press("Tab", "Tab", 9);
      await a.go(`${DEMO}\\Projects`, true);
      await a.box("right", `document.querySelectorAll(".fw-panel")[1]`);
      // Soubor v levém panelu (pravý může ještě ukazovat Documents, a.item by vzal poslední shodu).
      await a.clickAt(at, 2, () => a.item("\\Documents\\meeting-notes.md", true), "meeting-notes.md");
      await at(3);
      await a.press("F5", "F5", 116);
      await at(4.8);
    },
    after: () => fs.rmSync(F5_COPY, { force: true }),
  },
  undo: {
    cam: [[0, "item"]],
    deleted: [], since: 0,
    async before(a) {
      await a.reset(SUMMER, "Icons");
      const items = await a.itemsBelow(150);
      this.deleted = [items[6].path];
      a.point("item", items[6].p);
      await a.click(items[6].p, items[6].path);
      await a.c.sleep(400);
    },
    async run(a) {
      this.since = Math.floor(Date.now() / 1000);
      const at = a.clock();
      await at(0);
      await a.press("Delete", "Delete", 46);
      await at(2);
      await a.press("z", "KeyZ", 90, 2);
      await at(4.8);
    },
    after(a) { return cleanupTrashed(a, this.deleted, this.since); },
  },
  recycle: {
    side: true,
    cam: [[0, "Recycle Bin v sidebaru"], [1, "řádek quarterly-report.txt"], [2, "Restore"]],
    pre: [`${DEMO}\\Documents\\quarterly-report.txt`, `${DEMO}\\Downloads\\setup.msi`],
    since: 0,
    async before(a) {
      this.since = Math.floor(Date.now() / 1000);
      await a.invoke("delete_paths", { paths: this.pre, permanent: false, elevate: false });
      await a.reset(SUMMER, "Icons");
    },
    async run(a) {
      const at = a.clock();
      const row = (p) => a.sel(`[role=option][data-tooltip="${p.replace(/\\/g, "\\\\")}"]`);
      await a.clickAt(at, 0, () => a.selStart("button", "Recycle Bin"), "Recycle Bin v sidebaru");
      await a.clickAt(at, 1, () => row(this.pre[0]), "řádek quarterly-report.txt");
      await a.clickAt(at, 2, () => a.sel("button", "Restore"), "Restore");
      await at(4.8);
    },
    after(a) { return cleanupTrashed(a, this.pre, this.since); },
  },
  thumbs: {
    async before(a) {
      makeTrip();
      await a.reset(`${DEMO}\\Videos`, "Icons");
      // Náhledy se vygenerují předem (Windows je dělá z každého mp4), v záběru pak naskočí hned.
      await a.go(TRIP);
      await a.c.sleep(4000);
      await a.go(`${DEMO}\\Videos`);
      await a.c.sleep(800);
    },
    async run(a) {
      const at = a.clock();
      await a.clickAt(at, 0, () => a.item("\\Trip 2026"), "Trip 2026", { double: true });
      await at(2);
      await a.c.wheel(...(await a.c.evaluate(`[innerWidth / 2, innerHeight / 2]`)), 160 * a.zoom, 12, 30);
      await at(4.8);
    },
    async after(a) {
      await a.go(`${DEMO}\\Videos`);
      fs.rmSync(TRIP, { recursive: true, force: true });
      await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.removeRecent(${JSON.stringify(TRIP)}))`);
    },
  },
  // Pod CSS zoomem aplikace umístí kontextové menu na 1,5násobek souřadnic kliku – pravý klik jen vlevo nahoře.
  tags: {
    side: true, tagged: [],
    // Na konci kamera na seznam vpravo – vyfiltrované položky jsou nahoře.
    cam: [[0, "item"], [1.35, "Tag Red"], [2.2, "štítek Red v sidebaru"], [3.2, "list"]],
    async before(a) {
      // Pohled štítku se poprvé načítá déle než takt – jednou se otevře předem.
      await a.c.evaluate(`[...document.querySelectorAll("button")].find((e) => e.textContent.trim().startsWith("Red")).click()`);
      await a.c.sleep(1500);
      await a.reset(SUMMER, "Icons");
      // Na nízkém okně je sekce Tags pod okrajem sidebaru – sidebar se posune dolů.
      await a.c.evaluate(`(() => { let e = [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("Red"));
        while (e && e.scrollHeight <= e.clientHeight + 1) e = e.parentElement; if (e) e.scrollTop = e.scrollHeight; })()`);
    },
    async run(a) {
      const items = await a.itemsBelow(0);
      this.tagged = [items[0].path];
      a.point("item", items[0].p);
      await a.box("list", `document.querySelector(".fw-panel")`);
      const at = a.clock();
      await a.clickAt(at, 0, async () => items[0].p, items[0].path, { right: true });
      await at(0.5);
      await a.moveTo(await a.sel(".fw-menu-item", "Tags"), 200);
      await a.clickAt(at, 1.35, () => a.sel(`button[aria-label="Tag Red"]`), "Tag Red");
      await at(1.7);
      await a.press("Escape", "Escape", 27);
      await a.clickAt(at, 2.2, () => a.selStart("button", "Red"), "štítek Red v sidebaru");
      await at(4.8);
    },
    async after(a) {
      await a.go(SUMMER);
      for (const p of this.tagged) await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.clearTags(${JSON.stringify(p)}))`);
      await a.c.sleep(300);
    },
  },
  // Světlé → tmavé → rozmazaná průhlednost → silná; skutečná obrazovka, mezi stavy se střihá.
  look: {
    screen: true,
    before: async (a) => {
      await a.reset(SUMMER, "Icons");
      await a.c.evaluate(`import("/src/lib/storage.ts").then((s) => s.setWindowTransparency(false))`);
      await a.c.sleep(600);
    },
    async run(a) {
      // Okno občas ztratí aktivaci (neaktivní okno aplikace záměrně kreslí bez průhlednosti) – po každé
      // změně se znovu aktivuje a stav se ověří.
      const front = async (name) => {
        screen("front");
        await a.c.sleep(300);
        if (await a.c.evaluate(`document.documentElement.hasAttribute("data-inactive")`)) throw new Error(`okno není aktivní (${name})`);
        a.mark(name);
      };
      const at = a.clock(2);
      await at(1);
      await a.palette("dark", "Appearance: Dark");
      await front("dark");
      await a.c.sleep(1500);
      await a.palette("transp", "Transparency: Turn On");
      await front("transp");
      await a.c.sleep(2400);
      await a.palette("strong", "Transparency Strength: Strong");
      await front("strong");
      await a.c.sleep(3400);
    },
    after: async (a) => {
      await a.c.evaluate(`import("/src/lib/storage.ts").then(async (s) => { await s.setWindowTransparency(false); await s.setTransparencyStrength("medium"); })`);
    },
  },
};

// Screencast: snímky s časem, výstup = concat seznam + značky v sekundách od prvního snímku.
async function castRecord(a, dir) {
  const { c } = a;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const on = (m) => {
    if (m.method !== "Page.screencastFrame") return;
    const f = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(m.params.data, "base64"));
    frames.push({ f, t: m.params.metadata.timestamp });
    c.send("Page.screencastFrameAck", { sessionId: m.params.sessionId }).catch(() => {});
  };
  c.listeners.push(on);
  await c.send("Page.startScreencast", { format: "jpeg", quality: 95, everyNthFrame: 1, maxWidth: 4000, maxHeight: 4000 });
  return async () => {
    const end = Date.now() / 1000;
    await c.send("Page.stopScreencast");
    c.listeners.splice(c.listeners.indexOf(on), 1);
    const t0 = frames[0].t;
    const list = frames.map((f, i) => `file '${path.basename(f.f)}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join("\n")
      + `\nfile '${path.basename(frames.at(-1).f)}'\n`;
    fs.writeFileSync(path.join(dir, "frames.txt"), list);
    return { input: ["-f", "concat", "-safe", "0", "-i", "frames.txt"], s: jpegSize(fs.readFileSync(frames[0].f))[0] / a.vw,
      marks: Object.fromEntries(Object.entries(a.marks).map(([k, v]) => [k, v - t0])), dur: end - t0, focus: a.focus };
  };
}
// Skutečná obrazovka: ffmpeg gdigrab okna (bezztrátově); začátek záznamu = konec − délka souboru.
async function screenRecord(a, dir, win) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const rec = spawn("ffmpeg", ["-v", "error", "-y", "-f", "gdigrab", "-framerate", String(FPS), "-draw_mouse", "0",
    "-offset_x", String(win.X), "-offset_y", String(win.Y), "-video_size", `${win.W}x${win.H}`, "-i", "desktop",
    "-c:v", "libx264rgb", "-crf", "0", "-preset", "ultrafast", path.join(dir, "screen.mkv")], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => { rec.on("exit", resolve); rec.on("error", reject); });
  await a.c.sleep(1200);
  return async () => {
    const end = Date.now() / 1000;
    if (rec.exitCode === null) rec.stdin.write("q");
    await done;
    const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
      path.join(dir, "screen.mkv")]).toString().trim());
    const t0 = end - dur;
    return { input: ["-i", "screen.mkv"], s: 1, marks: Object.fromEntries(Object.entries(a.marks).map(([k, v]) => [k, v - t0])), dur };
  };
}

// Po reloadu ze setup() se aplikace občas vykresluje déle než jeho 4 s.
async function ready(c) {
  for (let i = 0; i < 50; i++) {
    if (await c.evaluate(`!!document.body && !!document.querySelector('[aria-label="View as Icons"]')`).catch(() => false)) return c;
    await c.sleep(200);
  }
  throw new Error("aplikace se po reloadu nevykreslila");
}

async function recordFormat(name) {
  const F = FORMATS[name];
  const dir = path.join(WORK, name);
  fs.mkdirSync(dir, { recursive: true });
  // Screencast: jedna stránka, viewport a výřez podle scény (bez sidebaru / se sidebarem).
  const c = await ready(await setup(F.rec.vw, F.rec.vh, { scale: 1 }));
  const base = await screencastScale(c, F.rec.vw);
  try {
    for (const [n, R] of Object.entries(RECS).filter(([n, R]) => !R.screen && (!ONLY || ONLY.includes(n)))) {
      // Viewport podle scény: vlastní (F[n]), se sidebarem, nebo výchozí; měřítko jen přes CSS zoom.
      const v = F[n] ?? (R.side ? F.side : F.rec);
      const zoom = (v.scale ?? F.rec.scale) / base;
      await c.evaluate(`document.documentElement.style.zoom = "${zoom}"; window.__zoom = ${zoom};`);
      await c.size(Math.round(v.vw * zoom), Math.round(v.vh * zoom), 1);
      await c.sleep(400);
      await c.evaluate(cursor);
      const a = controls(c, zoom, [v.vw * zoom * 0.6, v.vh * zoom * 0.6]);
      a.vw = v.vw;
      try {
        await R.before?.(a);
        const stop = await castRecord(a, path.join(dir, n));
        await R.run(a);
        const meta = { ...(await stop()), crop: v.crop };
        fs.writeFileSync(path.join(dir, n, "meta.json"), JSON.stringify(meta));
        console.log(`${name}/${n}: ${meta.dur.toFixed(1)} s`);
      } finally {
        try { await R.after?.(a); } catch (err) { console.error(`úklid ${n} selhal:`, err.message); }
      }
    }
  } finally {
    await c.evaluate(`document.documentElement.style.zoom = ""`).catch(() => {});
    await c.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
    c.close();
  }
  if (ONLY && !ONLY.includes("look")) return;
  // Průhlednost: skutečné okno před tapetou, rozložení 1:1 v px obrazovky.
  const { win, crop } = F.screen;
  const c2 = await ready(await setup(win.W, win.H, { emulate: false, theme: "light" }));
  let unstage;
  const a = controls(c2, 1, [win.W * 0.6, win.H * 0.6]);
  try {
    unstage = await stage(win, { X: 0, Y: 0, W: 1920, H: 1032 });
    await announceFocus(c2);
    await c2.evaluate(cursor);
    await RECS.look.before(a);
    const stop = await screenRecord(a, path.join(dir, "look"), win);
    await RECS.look.run(a);
    const meta = { ...(await stop()), crop };
    fs.writeFileSync(path.join(dir, "look", "meta.json"), JSON.stringify(meta));
    console.log(`${name}/look: ${meta.dur.toFixed(1)} s`);
  } finally {
    try { await RECS.look.after(a); } catch (err) { console.error("úklid look selhal:", err.message); }
    await c2.evaluate(`import("/src/lib/storage.ts").then((s) => s.setTheme("dark"))`).catch(() => {});
    c2.close();
    try { unstage?.(); } catch {}
  }
}

// ---------- skládání ----------
const ff = (argv, cwd) => execFileSync("ffmpeg", ["-v", "error", "-y", ...argv], { stdio: "inherit", cwd });

// Kamera: výřez 1/zoom kolem bodu akce (meta.focus), mezi body pomalý pan (smoothstep, nejvýš 0,9 s), který
// do bodu dorazí ve chvíli akce. Záběr se nejdřív zvětší 2× – pan pak jde po menších krocích než po pixelu zdroje.
function camera(zoom, meta, src, keys) {
  const { x, y, w, h } = meta.crop, s = meta.s, U = 2;
  const fw = Math.round(w * s * U), fh = Math.round(h * s * U);
  const rw = 2 * Math.round(fw / zoom / 2), rh = 2 * Math.round(fh / zoom / 2);
  const clamp = (v, max) => Math.min(Math.max(v, 0), max);
  const px = s * U, margin = 12 * px;
  // Levý/horní okraj výřezu: na střed bodu, nebo k začátku prvku, který je větší než výřez.
  const edge = (c, size, origin, r, full, center) =>
    clamp(size && !center && size * px > r ? (c - size / 2 - origin) * px - margin : (c - origin) * px - r / 2, full - r);
  const pts = keys.map(([b, name]) => {
    const f = meta.focus?.[name];
    if (!f) throw new Error(`kamera ${src.rec}: chybí bod „${name}“`);
    return { t: (b - src.b) * BEAT, x: edge(f[0], f[2], x, rw, fw, f[4]), y: edge(f[1], f[3], y, rh, fh, f[4]) };
  });
  const expr = (k) => {
    let e = pts.at(-1)[k].toFixed(1);
    for (let i = pts.length - 2; i >= 0; i--) {
      const a = pts[i], b = pts[i + 1], te = b.t, ts = Math.max(a.t, te - 0.9), d = te - ts;
      const p = `((t-${ts.toFixed(3)})/${d.toFixed(3)})`;
      e = d > 0.01
        ? `if(lt(t,${ts.toFixed(3)}),${a[k].toFixed(1)},if(lt(t,${te.toFixed(3)}),${a[k].toFixed(1)}+(${(b[k] - a[k]).toFixed(1)})*${p}*${p}*(3-2*${p}),${e}))`
        : `if(lt(t,${te.toFixed(3)}),${a[k].toFixed(1)},${e})`;
    }
    return e;
  };
  return `scale=${fw}:${fh}:flags=lanczos,crop=${rw}:${rh}:'${expr("x")}':'${expr("y")}',`;
}

function composeFormat(name) {
  const F = FORMATS[name];
  const dir = path.join(WORK, name);
  const segDir = path.join(dir, "segments");
  fs.rmSync(segDir, { recursive: true, force: true });
  fs.mkdirSync(segDir, { recursive: true });
  const bg = path.join(dir, "bg.png"), mask = path.join(dir, "mask.png");
  const { win } = F;
  const list = [];
  SHOTS.forEach(([b, n, src], i) => {
    const frames = frame(b + n) - frame(b);
    const out = path.join(segDir, `s${String(i).padStart(2, "0")}.mkv`);
    list.push(`file '${path.basename(out)}'`);
    const enc = ["-frames:v", String(frames), "-r", String(FPS), "-c:v", "libx264rgb", "-crf", "0", "-preset", "ultrafast", out];
    if (!src) {
      ff(["-loop", "1", "-framerate", String(FPS), "-i", bg, "-vf", "format=rgb24", ...enc]);
      return;
    }
    const recDir = path.join(dir, src.rec);
    const meta = JSON.parse(fs.readFileSync(path.join(recDir, "meta.json"), "utf8"));
    const start = meta.marks[src.mark ?? "t0"] + src.b * BEAT;
    if (start < 0 || start + n * BEAT > meta.dur + 0.05) throw new Error(`${name}: záběr ${src.rec}@${src.b} mimo záznam (${start.toFixed(2)} s z ${meta.dur.toFixed(2)} s)`);
    const { x, y, w, h } = meta.crop, s = meta.s;
    const cam = !src.full && RECS[src.rec].cam ? camera(F.zoom, meta, src, RECS[src.rec].cam) : "";
    const filter = `[1:v]fps=${FPS},trim=start=${start.toFixed(4)},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=2,` +
      `crop=${Math.round(w * s)}:${Math.round(h * s)}:${Math.round(x * s)}:${Math.round(y * s)},${cam}` +
      `scale=${win.w}:${win.h}:flags=lanczos,format=rgb24[f];[0:v]format=rgb24[bg];[bg][f]overlay=${win.x}:${win.y}[a];` +
      `[a][2:v]overlay=0:0:format=auto,format=rgb24`;
    // Cesty ke snímkům v concat seznamu jsou relativní – ffmpeg běží ve složce záznamu.
    ff(["-loop", "1", "-framerate", String(FPS), "-i", bg, ...meta.input, "-loop", "1", "-framerate", String(FPS), "-i", mask,
      "-filter_complex", filter, ...enc], recDir);
  });
  fs.writeFileSync(path.join(segDir, "list.txt"), list.join("\n") + "\n");
  const base = path.join(dir, "base.mkv");
  ff(["-f", "concat", "-safe", "0", "-i", path.join(segDir, "list.txt"), "-c", "copy", base]);
  const out = path.join(OUT, F.file);
  // -r u vstupu: časy přesně N/30 (MKV je zaokrouhluje na ms a overlay by pak snímky posunul).
  ff(["-r", String(FPS), "-i", base, "-framerate", String(FPS), "-i", path.join(dir, "overlay", "%04d.png"), "-i", AUDIO,
    "-filter_complex", "[0:v][1:v]overlay=format=auto,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p[v]",
    "-map", "[v]", "-map", "2:a", "-frames:v", String(TOTAL),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out]);
  // Kontrolní mřížka: 1 snímek/s (t = 0,5; 1,5; …) s časem.
  const cols = F.H > F.W ? 8 : 6, tw = F.H > F.W ? 270 : 480;
  const sheet = path.join(OUT, F.file.replace(/\.mp4$/, "-grid.png"));
  ff(["-i", out, "-vf", `select='eq(mod(n\\,${FPS})\\,${FPS / 2})',scale=${tw}:-2,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':` +
    `text='%{pts\\:hms}':x=8:y=8:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.7,tile=${cols}x${Math.ceil(31 / cols)}:padding=4:color=0x101010`,
    "-frames:v", "1", sheet]);
  console.log(`${F.file}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB  mřížka ${path.basename(sheet)}`);
}

// ---------- běh ----------
const names = args.length ? args : Object.keys(FORMATS);
for (const n of names) if (!FORMATS[n]) throw new Error(`neznámý formát: ${n} (${Object.keys(FORMATS).join(", ")})`);
if (MUSIC) {
  for (const n of names) console.log(swapMusic(path.join(OUT, FORMATS[n].file), path.resolve(MUSIC), SUFFIX));
  process.exit(0);
}
if (!fs.existsSync(AUDIO)) throw new Error(`chybí hudba: ${AUDIO}`);
fs.mkdirSync(OUT, { recursive: true });
if (!COMPOSE_ONLY) for (const n of names) await recordFormat(n);
for (const n of names) {
  const F = FORMATS[n], dir = path.join(WORK, n);
  fs.mkdirSync(dir, { recursive: true });
  await renderPlates(F, dir);
  await renderOverlay(F, path.join(dir, "overlay"));
  composeFormat(n);
}
