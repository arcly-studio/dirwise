// Motion video #21 „Type. Jump. Done.“ (1080×1920, 30 fps, 14,4 s = 24 dob při 100 BPM) – kinetická typografie
// z palety Ctrl+K: „Type.“ (paleta, psaní „sum“), „Jump.“ (výsledek se rozbalí do mřížky fotek, pak rychlé
// skoky Documents / Projects / Music / Videos na každou dobu), „Done.“ (klávesy se slétnou a složí ikonu),
// karta s logem; konec se prolne do prvního snímku (smyčka). Jiná sekvence scén než motion.mjs (#10).
// Stav se počítá jen z času (render(t)), headless Chrome/Edge snímek po snímku, ffmpeg přidá hudbu.
// node scripts/docs-media/motion-typejump.mjs [--still 1,4,8] [--audio <m4a>] [--out <složka>]
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(opt("--out", path.join(os.tmpdir(), "dirwise-typejump")));
const AUDIO = opt("--audio", null);
const STILLS = opt("--still", null)?.split(",").map(Number);
const WORK = path.join(os.tmpdir(), "dirwise-typejump-work");
const W = 1080, H = 1920, FPS = 30, DUR = 14.4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUri = (f, mime) => `data:${mime};base64,${fs.readFileSync(f).toString("base64")}`;
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const SUMMER = root("docs/demo/Photos/Summer 2026/");
const PH = ["alpine-lake", "golden-hour", "lavender-field", "harbor-lights", "sunflowers", "lighthouse", "starry-sky",
  "waterfall", "coastline"];
function photo(n) {
  const o = path.join(WORK, `${n}.jpg`);
  if (!fs.existsSync(o)) execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${SUMMER}${n}.jpg`, "-vf", "scale=360:-2", "-q:v", "3", o]);
  return dataUri(o, "image/jpeg");
}
const DATA = { fps: FPS, icon: dataUri(root("app-icon.png"), "image/png"), photos: PH.map((n) => [n, photo(n)]) };
const FONTS = [500, 700, 800, 900].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2")}`).join("\n");

// ---------- stránka ----------
function pageMain(D) {
  const W = 1080, H = 1920, B = 0.6; // doba při 100 BPM
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (p) => 1 - (1 - p) ** 3;
  const eIn = (p) => p ** 3;
  const spring = (s, w = 15, d = 6.5) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));
  const css = (el, s) => Object.assign(el.style, s);
  const show = (el, on) => { el.style.display = on ? "" : "none"; };
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // Pozadí: hvězdy + perspektivní mřížka (synthwave), plátno.
  const cv = $("bg"), g = cv.getContext("2d");
  function bg(t, hue) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#05060f"); gr.addColorStop(0.55, `hsl(${hue},55%,9%)`); gr.addColorStop(1, `hsl(${hue + 30},60%,14%)`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const x = rnd(i) * W, y = rnd(i + 99) * H * 0.62, a = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.3 + i));
      g.fillStyle = `rgba(255,255,255,${a * 0.55})`; g.fillRect(x, y, 2.2, 2.2);
    }
    const hz = 1330; // horizont
    const glow = g.createRadialGradient(W / 2, hz, 10, W / 2, hz, 700);
    glow.addColorStop(0, `hsla(${hue + 40},90%,60%,.38)`); glow.addColorStop(1, "transparent");
    g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.strokeStyle = `hsla(${hue + 40},90%,65%,.42)`; g.lineWidth = 2;
    const off = (t / B) % 1;
    for (let k = 0; k < 14; k++) {
      const z = (k + 1 - off) / 14, y = hz + (H - hz) * z * z;
      g.globalAlpha = z; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.globalAlpha = 1;
    for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(W / 2 + k * 30, hz); g.lineTo(W / 2 + k * 260, H); g.stroke(); }
  }

  // Velké slovo nahoře (Type. / Jump. / Done.): náraz se pružinou na začátku úseku.
  const WORDS = [["Type.", 0, 4.8, "#5ab0ff"], ["Jump.", 4.8, 9.6, "#ffd25a"], ["Done.", 9.6, 12.0, "#6ee6be"]];
  function word(t) {
    const el = $("word");
    const w = WORDS.find(([, a, b]) => t >= a && t < b);
    if (!w) { show(el, false); return; }
    show(el, true);
    const s = spring(t - w[1], 18, 7), out = eIn(prog(t, w[2] - 0.18, w[2]));
    el.firstChild.textContent = w[0];
    css(el, { color: w[3], transform: `translate(-50%,0) scale(${0.4 + 0.6 * s + out * 0.5}) rotate(${(1 - s) * -6}deg)`, opacity: 1 - out });
  }

  // Klávesy (samolepky): text, poloha, čas stisku.
  function cap(el, label, x, y, sc, press, rot = 0, op = 1) {
    el.textContent = label;
    const p = press >= 0 && press < 0.18 ? 1 - Math.abs(press - 0.09) / 0.09 : 0;
    css(el, { left: `${x}px`, top: `${y}px`, opacity: op, transform: `translate(-50%,-50%) scale(${sc * (1 - p * 0.12)}) rotate(${rot}deg)`,
      boxShadow: `0 ${16 - p * 12}px 0 #aab3c8, 0 ${26 - p * 12}px 30px #0008` });
  }

  // Paleta: psaní „sum“ na doby, Enter na 3,6 s.
  const RES = [["Summer 2026", "C:\\Demo\\Photos\\Summer 2026"], ["Search files for “sum” in the current folder", ""]];
  function palette(t) {
    const el = $("pal");
    if (t < 0.9 || t >= 5.4) { show(el, false); return; }
    show(el, true);
    const s = spring(t - 0.9, 13, 7);
    const zoom = eIn(prog(t, 4.6, 5.4)); // výsledek se „rozbalí“ do okna
    css(el, { transform: `translate(-50%,-50%) scale(${(0.7 + 0.3 * s) * (1 + zoom * 2.4)})`, opacity: s * (1 - zoom) });
    const typed = "sum".slice(0, [1.8, 2.4, 3.0].filter((k) => t >= k).length);
    $("q").innerHTML = typed ? `${typed}<i style="opacity:${Math.floor(t * 3) % 2 ? 1 : 0}"></i>` : `<span class="ph">Search folders, actions and tags…</span>`;
    const rows = $("rows");
    rows.style.opacity = typed ? 1 : 0;
    rows.children[0].classList.toggle("on", t >= 3.0);
    rows.children[0].style.transform = t >= 3.6 && t < 3.8 ? "scale(0.97)" : "";
  }

  // Okno s mřížkou fotek (4,8–7,2 s): dlaždice naskočí na osminy.
  function grid(t) {
    const el = $("grid");
    if (t < 4.6 || t >= 7.2) { show(el, false); return; }
    show(el, true);
    const s = spring(t - 4.6, 11, 6), out = eIn(prog(t, 6.95, 7.2));
    css(el, { transform: `translate(-50%,-50%) scale(${(0.55 + 0.45 * s) * (1 - out * 0.3)}) rotate(${-2 * (1 - s)}deg)`, opacity: Math.min(1, s * 1.4) * (1 - out) });
    [...el.querySelectorAll(".tile")].forEach((tl, i) => {
      const p = spring(t - 4.9 - i * B / 4, 16, 8);
      css(tl, { transform: `scale(${p})`, opacity: clamp(p * 2) });
    });
  }

  // Rychlé skoky (7,2–9,6 s): na každou dobu jiná složka.
  const JUMPS = [["doc", "Documents", 210], ["pro", "Projects", 265], ["mus", "Music", 320], ["vid", "Videos", 15]];
  function jumps(t) {
    const el = $("jump");
    if (t < 7.2 || t >= 9.75) { show(el, false); return; }
    show(el, true);
    const i = Math.min(3, Math.floor((t - 7.2) / B)), lt = t - 7.2 - i * B, [q, name, hue] = JUMPS[i];
    const s = spring(lt, 20, 8), out = eIn(prog(t, 9.6, 9.75));
    $("jq").textContent = q; $("jn").textContent = name;
    css(el, { transform: `translate(-50%,-50%) scale(${(0.82 + 0.18 * s) * (1 - out)})`, opacity: 1 - out });
    css($("jn"), { transform: `translateX(${(1 - s) * 160}px)`, color: `hsl(${hue},90%,72%)` });
    $("jcount").textContent = `${i + 1} / 4`;
  }

  // Klávesy se slétnou (9,6–10,8 s) a složí ikonu (10,8 s), pak karta.
  const KEYS = ["Ctrl", "K", "Enter", "Space", "Tab", "F5", "Esc", "↓"];
  function finale(t) {
    const caps = [...document.querySelectorAll(".fly")];
    caps.forEach((el, i) => {
      if (t < 9.5 || t >= 10.9) { show(el, false); return; }
      show(el, true);
      const a = (i / KEYS.length) * Math.PI * 2 + 0.4, r0 = 760, p = eIn(prog(t, 9.6 + i * 0.04, 10.8));
      const r = r0 * (1 - p), x = W / 2 + Math.cos(a) * r, y = 1020 + Math.sin(a) * r * 0.9;
      cap(el, KEYS[i], x, y, 1 - p * 0.75, -1, (1 - p) * (i % 2 ? 24 : -24), 1);
    });
    const ic = $("icon");
    if (t < 10.75) { show(ic, false); } else {
      show(ic, true);
      const s = spring(t - 10.75, 12, 6), up = eOut(prog(t, 12.0, 12.6));
      css(ic, { transform: `translate(-50%,-50%) scale(${s * (1 - up * 0.35)})`, top: `${1020 - up * 170}px` });
    }
    const fl = $("flash");
    fl.style.opacity = t >= 10.8 && t < 11.2 ? 0.45 * (1 - prog(t, 10.8, 11.2)) : t >= 4.8 && t < 5.0 ? 0.5 * (1 - prog(t, 4.8, 5.0)) : 0;
    const rays = $("rays");
    show(rays, t >= 10.8 && t < 11.6);
    if (t >= 10.8) css(rays, { transform: `translate(-50%,-50%) scale(${0.6 + eOut(prog(t, 10.8, 11.6)) * 1.6}) rotate(${(t - 10.8) * 40}deg)`, opacity: 1 - prog(t, 10.9, 11.6) });
    const end = $("end");
    show(end, t >= 12.0);
    if (t >= 12.0) {
      [...end.children].forEach((c, i) => { const p = eOut(prog(t, 12.0 + i * 0.15, 12.5 + i * 0.15)); css(c, { opacity: p, transform: `translateY(${(1 - p) * 40}px)` }); });
    }
  }

  window.render = (n) => {
    const t = n / D.fps;
    const hue = t < 4.8 ? 222 : t < 9.6 ? 255 : 200;
    bg(t, hue);
    word(t); palette(t); grid(t); jumps(t); finale(t);
    // Klávesy Ctrl + K pod paletou (stisk 1,2 s), Enter (3,6 s).
    const kk = [...document.querySelectorAll(".k0")];
    const vis = t >= 0.3 && t < 4.7, a = spring(t - 0.3, 14, 7);
    kk.forEach((el, i) => {
      show(el, vis);
      if (!vis) return;
      const lab = ["Ctrl", "K", "Enter"][i], x = [330, 520, 760][i], press = [1.2, 1.2, 3.6][i];
      const appear = i === 2 ? spring(t - 3.3, 14, 7) : a;
      cap(el, lab, x, 1450, appear, t - press, [-6, 5, 4][i], i === 2 ? clamp(appear * 2) : 1);
    });
    // konec → první snímek (smyčka)
    $("fade").style.opacity = prog(t, 14.0, 14.4);
  };
  window.init = () => {
    const gr = $("tiles");
    D.photos.forEach(([n, src]) => { const d = document.createElement("div"); d.className = "tile";
      d.innerHTML = `<img src="${src}"><span>${n}.jpg</span>`; gr.append(d); });
    const fly = $("flies");
    for (let i = 0; i < 8; i++) { const d = document.createElement("div"); d.className = "cap fly"; fly.append(d); }
  };
}

function page() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1920px;overflow:hidden;background:#05060f;font-family:Inter,sans-serif;color:#fff}
  #bg{position:absolute;inset:0}
  #word{position:absolute;left:50%;top:330px;transform-origin:50% 60%;font-weight:900;font-size:230px;letter-spacing:-9px;
    text-shadow:0 10px 60px #000c, 0 0 40px currentColor}
  .cap{position:absolute;min-width:150px;height:140px;padding:0 34px;border-radius:30px;background:linear-gradient(#fff,#e9edf6);
    color:#101420;font:800 64px/140px Inter;text-align:center}
  #pal{position:absolute;left:50%;top:1010px;width:900px;border-radius:40px;background:#1c1e26f2;border:2px solid #ffffff22;
    box-shadow:0 40px 120px #000c,0 0 0 1px #000;overflow:hidden}
  #q{height:130px;padding:0 44px;font:500 54px/130px Inter;border-bottom:2px solid #ffffff18;display:flex;align-items:center}
  #q i{display:inline-block;width:5px;height:60px;background:#5ab0ff;margin-left:6px}
  #q .ph{color:#ffffff66;font-size:44px}
  .tabs{display:flex;gap:16px;padding:22px 40px 8px;font:700 30px Inter;color:#ffffff88}
  .tabs b{color:#fff;background:#0a84ff;border-radius:14px;padding:4px 18px}
  #rows{padding:12px 20px 26px}
  .row{display:flex;align-items:center;gap:26px;padding:20px 24px;border-radius:22px;font:600 42px Inter}
  .row small{display:block;font:500 28px Inter;color:#ffffff88;margin-top:6px}
  .row.on{background:#0a84ff}.row.on small{color:#ffffffcc}
  .fold{width:64px;height:52px;border-radius:10px;background:linear-gradient(#ffd96a,#f2b632);flex:none}
  .srch{width:56px;height:56px;border-radius:50%;border:6px solid #ffffff99;flex:none}
  #grid{position:absolute;left:50%;top:1060px;width:820px;border-radius:44px;background:#16171df5;border:2px solid #ffffff22;
    box-shadow:0 40px 120px #000c;padding:30px}
  #grid .bar{font:800 44px Inter;padding:4px 10px 24px;display:flex;align-items:center;gap:20px}
  #tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .tile{text-align:center;font:500 22px Inter;color:#ffffffaa}
  .tile img{width:100%;height:170px;object-fit:cover;border-radius:18px;display:block;margin-bottom:8px}
  #jump{position:absolute;left:50%;top:1040px;width:940px;text-align:center}
  #jump .chip{display:inline-flex;align-items:center;gap:26px;padding:26px 46px;border-radius:999px;background:#1c1e26ee;border:2px solid #ffffff26;font:600 58px Inter}
  #jump .chip span{color:#ffffff77;font-weight:800}
  #jn{display:block;font:900 170px Inter;letter-spacing:-6px;margin-top:60px;text-shadow:0 8px 50px #000c}
  #jcount{display:block;margin-top:30px;font:700 40px Inter;color:#ffffff88;letter-spacing:4px}
  #icon{position:absolute;left:50%;top:1020px;width:380px;height:380px;filter:drop-shadow(0 30px 70px #000c)}
  #rays{position:absolute;left:50%;top:1020px;width:900px;height:900px;border-radius:50%;
    background:repeating-conic-gradient(#ffffff33 0 4deg,transparent 4deg 22deg);-webkit-mask:radial-gradient(circle,transparent 30%,#000 32%,transparent 70%)}
  #end{position:absolute;left:0;right:0;top:1150px;text-align:center}
  #end h1{font:900 150px Inter;letter-spacing:-5px}
  #end p{font:700 52px Inter;margin-top:24px;color:#cfe3ff}
  #end p b{background:#5ab0ff;color:#0b0d16;border-radius:16px;padding:0 16px}
  #end small{display:block;font:600 38px Inter;color:#ffffffaa;margin-top:30px}
  #flash{position:absolute;inset:0;background:#fff;opacity:0}
  #fade{position:absolute;inset:0;background:#05060f;opacity:0}
  </style></head><body>
  <canvas id="bg" width="1080" height="1920"></canvas>
  <div id="word"><span></span></div>
  <div id="pal"><div id="q"></div><div class="tabs"><b>All</b><span>Folders</span><span>Actions</span><span>Tags</span></div>
    <div id="rows"><div class="row"><div class="fold"></div><div>Summer 2026<small>C:\\Demo\\Photos\\Summer 2026</small></div></div>
    <div class="row"><div class="srch"></div><div>Search files for “sum”<small>in the current folder</small></div></div></div></div>
  <div id="grid"><div class="bar"><div class="fold"></div>Summer 2026</div><div id="tiles"></div></div>
  <div id="jump"><div class="chip"><span>Ctrl+K</span><b id="jq"></b></div><b id="jn"></b><span id="jcount"></span></div>
  <div class="cap k0"></div><div class="cap k0"></div><div class="cap k0"></div>
  <div id="flies"></div>
  <div id="rays"></div>
  <img id="icon" src="${DATA.icon}">
  <div id="end"><h1>Dirwise</h1><p><b>Ctrl+K</b> → anywhere</p><small>Free · Open source · Microsoft Store</small></div>
  <div id="flash"></div><div id="fade"></div>
  <script>(${pageMain.toString()})(${JSON.stringify({ fps: FPS, photos: DATA.photos })});</script>
  </body></html>`;
}

async function withChrome(fn) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"]
    .filter(Boolean).find((c) => fs.existsSync(c));
  const PORT = 9336;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-tj-"));
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--no-first-run",
    "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
      try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { await sleep(200); }
    }
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pend = new Map();
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails));
      return r.result.value;
    };
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const html = path.join(WORK, "typejump.html");
    fs.writeFileSync(html, page());
    await send("Page.navigate", { url: `file:///${html.replace(/\\/g, "/")}` });
    for (let i = 0; i < 100 && !(await evaluate("typeof window.render === 'function'").catch(() => false)); i++) await sleep(100);
    await evaluate("document.fonts.ready.then(() => init()).then(() => Promise.all([...document.images].map((i) => i.decode())))");
    await evaluate("render(150)"); await sleep(300);
    await fn(async (n, file, format = "jpeg") => {
      await evaluate(`render(${n}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
      const r = await send("Page.captureScreenshot", format === "png" ? { format } : { format, quality: 94 });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    });
    ws.close();
  } finally {
    proc.kill(); await sleep(500);
    try { fs.rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  }
}

const TOTAL = Math.round(DUR * FPS);
if (STILLS) {
  await withChrome(async (shot) => { for (const t of STILLS) { const f = path.join(OUT, `tj-still-${t}.png`); await shot(Math.round(t * FPS), f, "png"); console.log(f); } });
} else {
  const frames = path.join(WORK, "frames");
  fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames);
  await withChrome(async (shot) => { for (let n = 0; n < TOTAL; n++) { await shot(n, path.join(frames, `${String(n).padStart(4, "0")}.jpg`)); if (n % 90 === 0) console.log(`snímek ${n}/${TOTAL}`); } });
  const out = path.join(OUT, "dirwise-21-type-jump.mp4");
  const audio = AUDIO ? ["-i", path.resolve(AUDIO)] : ["-f", "lavfi", "-t", String(DUR), "-i", "anullsrc=r=48000:cl=stereo"];
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(frames, "%04d.jpg"), ...audio,
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-frames:v", String(TOTAL),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], { stdio: "inherit" });
  console.log(out);
}
