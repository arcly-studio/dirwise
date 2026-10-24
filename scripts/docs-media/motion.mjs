// Motion-design video Dirwise (1080×1920, 30 fps) na hudbu 120 BPM, 18 s – animace, ne screencast.
// Celá scéna je jedna HTML stránka s funkcí render(t), která stav spočítá jen z času (žádné CSS animace);
// headless Chrome/Edge ji vykreslí snímek po snímku a ffmpeg přidá hudbu. UI (paleta Ctrl+K, sloupce,
// okno) je zjednodušené podle skutečné aplikace (docs/screenshots/command-palette.png, columns.png),
// náhledy fotek z docs/demo (photos.mjs). Střihy podle scénáře s nárazem (zoom + otřes 3 snímky),
// pohyby s pružinou / ease-out, směrové rozmazání pohybem podle rychlosti, zrno a vinětace.
// Konec se prolne do bílé = první snímek (smyčka).
// node scripts/docs-media/motion.mjs [--still 2.2,9.3,13.7] [--audio <m4a>] [--out <složka>]
//   --still = jen vybrané snímky jako PNG (náhled stylu); jinak celé video + mřížka po 0,5 s.
// node scripts/docs-media/motion.mjs --music <m4a> [--suffix -v2]
//   = jen vyměnit hudbu u hotového videa (obraz se nepřekódovává), výstup vedle s příponou.
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import { swapMusic } from "./music.mjs";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SOCIAL = root("dirwise-socialni-site/dirwise-socialni-site/");
const AUDIO = path.resolve(opt("--audio", `${SOCIAL}hudba/promo/dirwise-motion-120bpm.m4a`));
const OUT = path.resolve(opt("--out", `${SOCIAL}promo`));
const STILLS = opt("--still", null)?.split(",").map(Number);
const WORK = path.join(os.tmpdir(), "dirwise-motion-work");
const W = 1080, H = 1920, FPS = 30, DUR = 18;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- data pro stránku ----------
const SUMMER = root("docs/demo/Photos/Summer 2026/");
const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
// Náhledy zmenšené na 640 px (stránka je dekóduje jen jednou).
function photo(name) {
  const out = path.join(WORK, "photos", `${name}.jpg`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${SUMMER}${name}.jpg`, "-vf", "scale=640:-2", "-q:v", "3", out]);
  }
  return dataUri(out, "image/jpeg");
}
const MOSAIC = ["alpine-lake", "golden-hour", "lavender-field", "harbor-lights", "sunflowers", "lighthouse", "starry-sky",
  "waterfall", "vineyard", "sailing", "old-town", "mountain-hut", "coastline", "campfire", "canoe", "fishing-village",
  "island-ferry", "night-market", "sunrise-hike", "tide-pools", "sand-dunes", "rooftops", "kayaks"];
const PREVIEW = "farewell-sunset";
const files = fs.readdirSync(SUMMER).sort();
const at = files.indexOf(`${PREVIEW}.jpg`);
const DATA = {
  fps: FPS,
  icon: dataUri(root("app-icon.png"), "image/png"),
  photos: Object.fromEntries([...MOSAIC, PREVIEW].map((n) => [n, photo(n)])),
  // Sloupec Summer 2026: výřez seznamu tak, aby vybraná fotka byla v horní polovině.
  files: files.slice(Math.max(0, at - 7), at + 15),
  preview: { name: `${PREVIEW}.jpg`, size: `${(fs.statSync(`${SUMMER}${PREVIEW}.jpg`).size / 1024).toFixed(1)} KB` },
};
const FONTS = [500, 700, 800].map((w) => `@font-face{font-family:Inter;font-weight:${w};
  src:url(${dataUri(root(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`), "font/woff2")}) format("woff2")}`).join("\n");

// ---------- stránka (běží v prohlížeči; pageMain se vloží jako text) ----------
function pageMain(D) {
  const W = 1080, H = 1920, FPS = D.fps;
  const CUTS = [1.5, 3, 6, 8, 10, 12, 14, 16.5];
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const eOut = (p) => 1 - (1 - p) ** 3;
  const eOut5 = (p) => 1 - (1 - p) ** 5;
  const eIn = (p) => p ** 3;
  const eInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
  // Pružina: s = čas od startu (s), výsledek 0 → 1 s překmitem.
  const spring = (s, w = 16, d = 7) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));
  const lerp = (a, b, p) => a + (b - a) * p;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const show = (el, on) => { el.style.display = on ? "" : "none"; };
  const css = (el, s) => Object.assign(el.style, s);

  // Směrové rozmazání pohybem: SVG blur podle rychlosti (px za snímek).
  const filters = {};
  const mb = (el, key, dx, dy, k = 0.45) => {
    const sx = Math.min(36, Math.abs(dx) * k), sy = Math.min(36, Math.abs(dy) * k);
    if (sx < 0.6 && sy < 0.6) { el.style.filter = ""; return; }
    if (!filters[key]) {
      const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
      f.id = `mb-${key}`;
      ["x", "y", "width", "height"].forEach((a, i) => f.setAttribute(a, ["-50%", "-50%", "200%", "200%"][i]));
      const g = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
      f.append(g);
      $("defs").append(f);
      filters[key] = g;
    }
    filters[key].setAttribute("stdDeviation", `${sx.toFixed(1)} ${sy.toFixed(1)}`);
    el.style.filter = `url(#mb-${key})`;
  };
  const dt = 1 / FPS;

  // ---------- 0: ikony ----------
  const ICONS = [
    `<svg viewBox="0 0 100 100"><defs><linearGradient id="g0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f5f8"/><stop offset="1" stop-color="#dfe3ea"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g0)"/><circle cx="50" cy="50" r="20" fill="none" stroke="#9aa3b2" stroke-width="9"/></svg>`,
    `<svg viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe7ff"/><stop offset="1" stop-color="#cfc2f2"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g1)"/><path d="M50 26 L74 70 H26 Z" fill="#8f7fd0"/></svg>`,
    null,
    `<svg viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3f7ef"/><stop offset="1" stop-color="#b9e6d4"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g3)"/><rect x="28" y="30" width="44" height="9" rx="4.5" fill="#5bb495"/><rect x="28" y="46" width="34" height="9" rx="4.5" fill="#5bb495"/><rect x="28" y="62" width="40" height="9" rx="4.5" fill="#5bb495"/></svg>`,
    `<svg viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0e4"/><stop offset="1" stop-color="#f6cfb2"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#g4)"/><path d="M24 58 C34 40, 44 40, 50 54 S66 68, 76 46" fill="none" stroke="#e0915c" stroke-width="9" stroke-linecap="round"/></svg>`,
  ];
  $("icons").innerHTML = ICONS.map((s, i) => `<div class="ico" id="ico${i}">${s ?? `<img src="${D.icon}">`}</div>`).join("");
  const icoX = (i, t) => 540 + (i - 2) * 204 + (i === 2 ? 0 : Math.sign(i - 2) * eIn(prog(t, 1.05, 1.45)) * 1150 * (1 + 0.12 * Math.abs(i - 2)));
  const cursorPos = (t) => { const p = eInOut(prog(t, 0.35, 0.95)); return [lerp(990, 566, p), lerp(1660, 958, p)]; };
  function scene0(t) {
    for (let i = 0; i < 5; i++) {
      const el = $(`ico${i}`), s = t - (0.05 + 0.07 * Math.abs(i - 2));
      let k = spring(s, 15, 7.5);
      if (i === 2) k *= (1 - 0.1 * Math.sin(Math.PI * prog(t, 1.0, 1.12))) * (1 + 0.35 * eOut(prog(t, 1.1, 1.5)));
      css(el, { left: `${icoX(i, t) - 85}px`, transform: `scale(${k.toFixed(4)})` });
      mb(el, `i${i}`, icoX(i, t) - icoX(i, t - dt), 0);
    }
    const [x, y] = cursorPos(t), [x0, y0] = cursorPos(t - dt);
    css($("cursor"), { transform: `translate(${x}px,${y}px) scale(${1 - 0.15 * Math.sin(Math.PI * prog(t, 1.0, 1.1))})`, opacity: prog(t, 0.2, 0.32) * (1 - prog(t, 1.1, 1.25)) });
    mb($("cursor"), "cur", x - x0, y - y0, 0.35);
  }

  // ---------- 1: zoom do loga, pulz, střepy ----------
  const zoomS = (t) => 230 * Math.pow(22, eInOut(prog(t, 1.5, 1.95)));
  const pulse = (t) => [2.0, 2.25].reduce((a, k) => a + (t >= k ? 0.1 * Math.exp(-(t - k) * 13) : 0), 0);
  function scene1(t) {
    const S = zoomS(t), v = (S - zoomS(t - dt)) / S;
    css($("zoomIcon"), { width: `${S}px`, height: `${S}px`, left: `${540 - 0.52 * S}px`, top: `${930 - 0.56 * S}px`,
      opacity: 1 - prog(t, 1.9, 2.0), filter: v > 0.01 ? `blur(${Math.min(14, v * 60).toFixed(1)}px)` : "" });
    const f = $("folder");
    show(f, t >= 1.9 && t < 2.5);
    const k = lerp(2.4, 1, spring(t - 1.9, 13, 8)) * (1 + pulse(t));
    // Záře složky (a halo za ní) zesílí na každý pulz do rytmu.
    const g = pulse(t) / 0.1;
    css(f, { transform: `translate(-50%,-50%) scale(${k.toFixed(4)})`, opacity: prog(t, 1.9, 1.98),
      filter: `drop-shadow(0 0 ${(26 + 70 * g).toFixed(1)}px rgba(110,180,255,${(0.55 + 0.45 * g).toFixed(3)})) drop-shadow(0 30px 60px rgba(0,0,0,.55))` });
    css($("halo"), { opacity: ((0.12 + 0.5 * g) * prog(t, 1.9, 2.05) * (1 - prog(t, 2.5, 2.9))).toFixed(3),
      transform: `translate(-50%,-50%) scale(${(1 + 0.12 * g).toFixed(4)})` });
  }
  // Střepy: složka rozdělená na trojúhelníky, každý letí od středu a rotuje (stopy = rozmazání).
  let folderCanvas, shards;
  function initShards() {
    const img = $("folderImg");
    folderCanvas = document.createElement("canvas");
    folderCanvas.width = 640; folderCanvas.height = 520;
    folderCanvas.getContext("2d").drawImage(img, 0, 0, 640, 520);
    shards = [];
    const C = 8, R = 7, cw = 640 / C, ch = 520 / R;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = c * cw, y = r * ch, j = (r * C + c) * 2;
      const tri = (pts, n) => {
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
        const a = Math.atan2(cy - 260, cx - 320) + (rnd(n) - 0.5) * 0.8;
        shards.push({ pts, cx, cy, dx: Math.cos(a), dy: Math.sin(a), sp: 700 + rnd(n + 7) * 1100, rot: (rnd(n + 3) - 0.5) * 6 });
      };
      if ((r + c) % 2) { tri([[x, y], [x + cw, y], [x, y + ch]], j); tri([[x + cw, y], [x + cw, y + ch], [x, y + ch]], j + 1); }
      else { tri([[x, y], [x + cw, y + ch], [x, y + ch]], j); tri([[x, y], [x + cw, y], [x + cw, y + ch]], j + 1); }
    }
  }
  function drawShards(ctx, t) {
    const ox = 540 - 320, oy = 930 - 260;
    // Rázová vlna.
    const w = prog(t, 2.5, 2.85);
    if (w > 0 && w < 1) {
      ctx.strokeStyle = `rgba(255,255,255,${(1 - w) * 0.8})`; ctx.lineWidth = 14 * (1 - w) + 2;
      ctx.beginPath(); ctx.arc(540, 930, 120 + eOut(w) * 900, 0, Math.PI * 2); ctx.stroke();
    }
    for (const [lag, alpha] of [[0.024, 0.18], [0.012, 0.3], [0, 1]]) {
      const p = eOut(prog(t - lag, 2.5, 3.0));
      ctx.globalAlpha = alpha * (1 - prog(t, 2.8, 3.0));
      for (const s of shards) {
        ctx.save();
        ctx.translate(ox + s.cx + s.dx * s.sp * p, oy + s.cy + s.dy * s.sp * p);
        ctx.rotate(s.rot * p);
        ctx.scale(1 - 0.35 * p, 1 - 0.35 * p);
        ctx.translate(-s.cx, -s.cy);
        ctx.beginPath(); ctx.moveTo(...s.pts[0]); ctx.lineTo(...s.pts[1]); ctx.lineTo(...s.pts[2]); ctx.closePath(); ctx.clip();
        ctx.drawImage(folderCanvas, 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---------- 2: paleta Ctrl+K ----------
  const QUERY = "summer";
  const typed = (t) => QUERY.slice(0, QUERY.split("").filter((_, i) => t >= 3.55 + i * 0.12).length);
  const palY = (t) => lerp(1980, 600, spring(t - 3.0, 11, 6.5));
  const DEFAULT_ROWS = [
    ["folder", "website", "Recent · C:\\Demo\\Projects\\website"],
    ["bolt", "Split Window", "", "Ctrl+Shift+D"],
    ["bolt", "New Tab", "", "Ctrl+T"],
    ["bolt", "Appearance: Dark", ""],
    ["file", "Search files in the current folder", ""],
  ];
  const ROW_ICONS = {
    folder: `<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2h8.8A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill="#f2c94c"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z" fill="none" stroke="#c9c9cf" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z M14 3v4h4" fill="none" stroke="#c9c9cf" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  };
  const rowHtml = ([icon, title, sub, key], hi) => `<div class="row${hi ? " hi" : ""}"><i>${ROW_ICONS[icon]}</i><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</div>${key ? `<kbd>${key}</kbd>` : ""}</div>`;
  let lastRows = "";
  function scene2(t) {
    const y = palY(t), pal = $("pal");
    css(pal, { top: `${y}px`, transform: `scale(${(1.2 * lerp(0.9, 1, spring(t - 3.0, 11, 6.5))).toFixed(4)})` });
    mb(pal, "pal", 0, y - palY(t - dt), 0.35);
    const q = typed(t);
    const caretOn = (t >= 3.5 && t < 4.4) || Math.floor((t - 3) * 2.4) % 2 === 0;
    $("q").innerHTML = `${q}<span class="caret" style="opacity:${caretOn ? 1 : 0}"></span>`;
    const rows = q.length >= 2
      ? [["folder", "Summer 2026", "Recent · C:\\Demo\\Photos\\Summer 2026"], ["file", `Search files for “${q}” in the current folder`, ""]]
      : DEFAULT_ROWS;
    const html = rows.map((r, i) => rowHtml(r, i === 0)).join("");
    if (html !== lastRows) { $("rows").innerHTML = html; lastRows = html; }
    const hi = document.querySelector("#rows .hi");
    if (hi) hi.style.boxShadow = `inset 0 0 0 ${(2 * prog(t, 4.9, 5.1)).toFixed(1)}px #7fb4ff, 0 0 0 ${(16 * Math.exp(-Math.max(0, t - 5.5) * 9) * (t >= 5.5 ? 1 : 0)).toFixed(1)}px rgba(120,170,255,.25)`;
    sticker($("kCtrlK"), t, 3.12);
    sticker($("kEnter"), t, 5.5);
  }
  // Samolepka klávesy: od t0 naskočí (zvětšení → 1 s pružinou) a jiskřička.
  function sticker(el, t, t0) {
    show(el, t >= t0);
    if (t < t0) return;
    const s = t - t0, k = lerp(1.9, 1, spring(s, 22, 9));
    el.style.transform = `translate(-50%,-50%) rotate(${el.dataset.r}deg) scale(${k.toFixed(4)})`;
    const sp = el.querySelector(".spark");
    if (sp) css(sp, { opacity: 1 - prog(s, 0.05, 0.3), transform: `translate(-50%,-50%) scale(${(0.6 + eOut(prog(s, 0, 0.3)) * 0.9).toFixed(3)})` });
  }

  // ---------- 3: okno se sloupci ----------
  // Paleta po zvětšení 1,2× → okno; obsah okna je zvětšený CSS zoomem (#winInner), sloupce jedou hned od střihu.
  const PAL_RECT = [24, 600, 1032, 560], WIN_RECT = [30, 280, 1020, 1360];
  const COLS = [5.93, 6.0, 6.08];
  const colX = (i, t) => (1 - spring(t - COLS[i], 13, 7)) * -140;
  function scene3(t) {
    const p = eOut5(prog(t, 6.0, 6.35)), r = PAL_RECT.map((v, i) => lerp(v, WIN_RECT[i], p));
    css($("win"), { left: `${r[0]}px`, top: `${r[1]}px`, width: `${r[2]}px`, height: `${r[3]}px` });
    for (let i = 0; i < 3; i++) {
      const el = $(`col${i}`), x = colX(i, t);
      css(el, { transform: `translateX(${x.toFixed(1)}px)`, opacity: t >= COLS[i] ? 0.5 + 0.5 * prog(t, COLS[i], COLS[i] + 0.1) : 0 });
      mb(el, `col${i}`, x - colX(i, t - dt), 0);
    }
    $("sel1").classList.toggle("on", t >= COLS[0] + 0.15);
    $("sel2").classList.toggle("on", t >= COLS[1] + 0.2);
    $("pvImg").style.transform = `scale(${lerp(0.85, 1, spring(t - COLS[2], 14, 8)).toFixed(4)})`;
  }

  // ---------- 4: mozaika, 5: kinetická typografie ----------
  const CARDS = { 5: ["photos", "#2563EB", "#0A84FF"], 10: ["projects", "#7c3aed", "#a78bfa"], 16: ["notes", "#ea580c", "#fbbf24"],
    21: ["music", "#059669", "#34d399"], 26: ["tags", "#db2777", "#f472b6"] };
  const TILE = 236, GAP = 18, COLSN = 4, ROWSN = 9;
  const names = Object.keys(D.photos).filter((n) => n !== "farewell-sunset");
  const tiles = [];
  {
    let pi = 0, html = "";
    for (let i = 0; i < COLSN * ROWSN; i++) {
      const c = i % COLSN, r = Math.floor(i / COLSN);
      const x = c * (TILE + GAP), y = r * (TILE + GAP);
      const d = Math.hypot(x + TILE / 2 - 499, y + TILE / 2 - 1127);
      tiles.push({ d, sign: rnd(i) < 0.5 ? -1 : 1 });
      const card = CARDS[i];
      html += card
        ? `<div class="tile card" id="t${i}" style="left:${x}px;top:${y}px;background:linear-gradient(140deg,${card[1]},${card[2]})"><span>${card[0]}</span></div>`
        : `<div class="tile" id="t${i}" style="left:${x}px;top:${y}px;background-image:url(${D.photos[names[pi++ % names.length]]})"></div>`;
    }
    $("grid").innerHTML = html;
  }
  function scene4(t) {
    const cam = 1 + 0.12 * eOut(prog(t, 8, 10)) + 0.06 * eOut(prog(t, 10, 12));
    css($("grid"), { transform: `translate(${(1080 - 998) / 2}px,${-180 - 60 * eOut(prog(t, 8, 12))}px) scale(${cam.toFixed(4)})` });
    tiles.forEach((tl, i) => {
      const s = t - (7.82 + tl.d / 1000 * 0.75); // střed naskočí už na střihu 8,0
      css($(`t${i}`), { transform: `scale(${spring(s, 15, 7.5).toFixed(4)}) rotate(${((1 - spring(s, 12, 6)) * 9 * tl.sign).toFixed(2)}deg)`,
        opacity: prog(s, 0, 0.08) });
    });
    const blur = prog(t, 10, 10.2);
    $("s4").style.filter = blur > 0 ? `blur(${(22 * blur).toFixed(1)}px) brightness(${(1 - 0.5 * blur).toFixed(3)})` : "";
  }
  const WORDS = ["Find", "Preview", "Tag", "Split", "Move", "Flow"];
  const SHIFTS = [10.5, 11.0, 11.25, 11.5, 11.75];
  const LINE = 178;
  const listPos = (t) => SHIFTS.reduce((a, k) => a + spring(t - k, 20, 10), 0);
  $("words").innerHTML = WORDS.map((w, i) => `<div class="w${i === 5 ? " flow" : ""}" id="w${i}">${w}</div>`).join("");
  function scene5(t) {
    const pos = listPos(t), v = pos - listPos(t - dt);
    const list = $("words");
    css(list, { transform: `translateY(${(-pos * LINE).toFixed(1)}px)` });
    WORDS.forEach((_, i) => {
      const d = Math.abs(i - pos);
      css($(`w${i}`), { filter: d > 0.05 ? `blur(${Math.min(10, d * 9).toFixed(1)}px)` : "", opacity: (1 - Math.min(0.65, d * 0.5)).toFixed(3) });
    });
    if (Math.abs(v) > 0.02) mb(list, "words", 0, v * LINE, 0.4); else list.style.filter = "";
    // Rámeček na aktivní slovo – šířka podle slov kolem.
    const a = Math.floor(clamp(pos, 0, 5)), b = Math.min(5, a + 1), f = pos - a;
    const wa = $(`w${a}`).offsetWidth, wb = $(`w${b}`).offsetWidth;
    css($("frame"), { width: `${lerp(wa, wb, f) + 90}px`, opacity: prog(t, 10.0, 10.12),
      transform: `translate(-50%,-50%) scale(${(1 + 0.05 * Math.exp(-((t - SHIFTS.filter((k) => t >= k).at(-1)) || 9) * 14)).toFixed(4)})` });
    show($("s5"), true);
  }

  // ---------- 6: „Files, fast.“ + samolepky ----------
  const LINES = ["Files,", "fast."];
  const charTimes = [[12.0, 12.04, 12.08, 12.12, 12.16, 12.2], [12.5, 12.54, 12.58, 12.62, 12.66]];
  $("big").innerHTML = LINES.map((l, j) => `<div class="ln">${l.split("").map((ch, i) => `<span id="c${j}${i}">${ch}</span>`).join("")}</div>`).join("");
  function scene6(t) {
    LINES.forEach((l, j) => l.split("").forEach((_, i) => {
      const s = t - charTimes[j][i], el = $(`c${j}${i}`);
      css(el, { opacity: s >= 0 ? 1 : 0, transform: `scale(${s >= 0 ? lerp(1.35, 1, spring(s, 26, 11)).toFixed(4) : 1})` });
    }));
    const sw = prog(t, 12.6, 13.0);
    css($("big"), { transform: `translate(-50%,-50%) rotate(${(2.6 * Math.sin((t - 12.6) * Math.PI * 1.25) * sw).toFixed(3)}deg) scale(${(1 + 0.018 * Math.sin((t - 12.6) * Math.PI * 2) * sw).toFixed(4)})` });
    [["kCtrl", 12.25], ["kK", 12.75], ["kSpace", 13.25], ["kF5", 13.5]].forEach(([id, t0]) => sticker($(id), t, t0));
  }

  // ---------- 7: částice, 8: logo ----------
  let parts = [];
  function initParticles() {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle"; c.font = "800 230px Inter";
    c.fillText(LINES[0], 540, 790); c.fillText(LINES[1], 540, 1020);
    const src = [];
    let px = c.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6) if (px[(y * W + x) * 4 + 3] > 128) src.push([x, y]);
    c.clearRect(0, 0, W, H);
    c.drawImage($("iconImg"), 540 - 280, 900 - 280, 560, 560);
    px = c.getImageData(0, 0, W, H).data;
    const tgt = [];
    for (let y = 0; y < H; y += 7) for (let x = 0; x < W; x += 7) {
      const o = (y * W + x) * 4, r = px[o], g = px[o + 1], b = px[o + 2], a = px[o + 3];
      if (a < 200) continue;
      if (r > 200 && g > 200 && b > 200) tgt.push([x, y, "255,255,255"]);
      else if (b > r + 60) tgt.push([x, y, `${70 + (r >> 2)},${130 + (g >> 3)},255`]);
      else if (rnd(x * 7 + y) < 0.3) tgt.push([x, y, "60,80,130"]);
    }
    const N = Math.max(src.length, tgt.length);
    for (let i = 0; i < N; i++) {
      const s = src[i % src.length], g = tgt[Math.floor(rnd(i * 3.1) * tgt.length) % tgt.length] ?? tgt[i % tgt.length];
      const dx = s[0] - 540, dy = s[1] - 900;
      parts.push({ r0: Math.hypot(dx, dy), a0: Math.atan2(dy, dx), x: s[0], y: s[1], tx: g[0], ty: g[1], col: g[2],
        burst: 120 + rnd(i) * 420, spin: 2.4 + rnd(i + 9) * 1.8, ph: rnd(i + 5) * 6.28 });
    }
  }
  const partPos = (p, t) => {
    const s = prog(t, 14, 16.45);
    const r = p.r0 + p.burst * Math.sin(Math.PI * clamp(s * 1.2)) ;
    const a = p.a0 + p.spin * eInOut(s) * (p.r0 < 300 ? 1.3 : 1);
    const q = eInOut(prog(t, 15.45, 16.45));
    return [lerp(540 + r * Math.cos(a), p.tx, q), lerp(900 + r * Math.sin(a), p.ty, q)];
  };
  function drawParticles(ctx, t) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const fade = 1 - prog(t, 16.5, 16.66);
    const toWhite = 1 - prog(t, 14.0, 14.35);
    for (const p of parts) {
      const [x, y] = partPos(p, t), [x0, y0] = partPos(p, t - dt * 0.8);
      const tw = 0.65 + 0.35 * Math.sin(t * 18 + p.ph);
      const col = toWhite > 0 ? "255,255,255" : p.col;
      ctx.strokeStyle = `rgba(${col},${(tw * fade * 0.9).toFixed(3)})`;
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x + 0.01, y); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function scene8(t) {
    // Ikona z místa částic (střed 900) nahoru, pod ní „Dirwise“ a „Free on Microsoft Store“ (vedle sebe by se 1,5× nevešly).
    const m = eOut5(prog(t, 16.8, 17.2)), S = lerp(560, 430, m), cy = lerp(900, 700, m);
    css($("endIcon"), { width: `${S}px`, height: `${S}px`, left: `${540 - S / 2}px`, top: `${cy - S / 2}px`, opacity: prog(t, 16.42, 16.55) });
    const wm = eOut5(prog(t, 16.9, 17.3));
    css($("word"), { clipPath: `inset(0 0 ${((1 - wm) * 100).toFixed(1)}% 0)`, opacity: wm, transform: `translate(-50%, ${((1 - wm) * 70 - 50).toFixed(1)}%)` });
    const sub = eOut(prog(t, 17.15, 17.45));
    css($("sub"), { opacity: sub, transform: `translate(-50%, ${((1 - sub) * 30).toFixed(1)}px)` });
  }

  // ---------- zrno ----------
  const grain = $("grain"), gctx = grain.getContext("2d"), gimg = gctx.createImageData(grain.width, grain.height);
  function drawGrain(n) {
    let seed = n * 9973 + 1;
    const d = gimg.data;
    for (let i = 0; i < d.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = seed & 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    gctx.putImageData(gimg, 0, 0);
  }

  window.init = () => { initShards(); initParticles(); };
  window.render = (n) => {
    const t = n / FPS;
    // Náraz na střihu: 3 snímky zoom + otřes.
    const cut = CUTS.find((c) => n >= Math.round(c * FPS) && n < Math.round(c * FPS) + 3);
    const f = cut ? n - Math.round(cut * FPS) : -1;
    const IMP = [[1.06, 14, -9], [1.032, -8, 6], [1.012, 3, -2]];
    $("stage").style.transform = f >= 0 ? `translate(${IMP[f][1]}px,${IMP[f][2]}px) scale(${IMP[f][0]})` : "";

    show($("s0"), t < 1.5); if (t < 1.5) scene0(t);
    show($("s1"), t >= 1.5 && t < 3.0); if (t >= 1.5 && t < 3.0) scene1(t);
    show($("bokeh"), t >= 3.0 && t < 8.0);
    if (t >= 3.0 && t < 8.0) [...$("bokeh").children].forEach((b, i) =>
      b.style.transform = `translate(${(Math.sin(t * 0.7 + i) * 60).toFixed(1)}px,${(Math.cos(t * 0.5 + i * 2) * 80).toFixed(1)}px)`);
    show($("s2"), t >= 3.0 && t < 6.0); if (t >= 3.0 && t < 6.0) scene2(t);
    show($("s3"), t >= 6.0 && t < 8.0); if (t >= 6.0 && t < 8.0) scene3(t);
    show($("s4"), t >= 8.0 && t < 12.0); if (t >= 8.0 && t < 12.0) scene4(t);
    show($("s5"), t >= 10.0 && t < 12.0); if (t >= 10.0 && t < 12.0) scene5(t);
    show($("s6"), t >= 12.0 && t < 14.0); if (t >= 12.0 && t < 14.0) scene6(t);
    show($("dark"), t >= 14.0);
    show($("s8"), t >= 16.4); if (t >= 16.4) scene8(t);
    const fx = $("fx"), ctx = fx.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    if (t >= 2.5 && t < 3.0) drawShards(ctx, t);
    if (t >= 14.0 && t < 16.7) drawParticles(ctx, t);
    // Konec: prolnutí do bílé = začátek (smyčka).
    $("white").style.opacity = eInOut(prog(t, 17.7, 18 - 1 / FPS)).toFixed(3);
    // Vinětace (na bílé jemnější) a zrno.
    const light = t < 1.5 || t >= 17.7;
    $("vig").style.opacity = light ? 0.35 : 1;
    drawGrain(n);
  };
}

const page = () => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden;background:#fff}
body{font-family:Inter,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.ui{font-family:"Segoe UI Variable Text","Segoe UI",Inter,sans-serif}
#stage{position:absolute;inset:0;transform-origin:50% 45%}
.scene,.layer{position:absolute;inset:0}
#s0{background:#fff}
.ico{position:absolute;top:845px;width:170px;height:170px;filter:drop-shadow(0 14px 26px #0002)}
.ico svg,.ico img{width:100%;height:100%;display:block}
#cursor{position:absolute;left:0;top:0;width:58px;height:58px;transform-origin:4px 3px}
#s1{background:radial-gradient(85% 62% at 50% 48%,#0B1A3A 0%,#0d2350 38%,#0a4fb0 74%,#0A84FF 100%);overflow:hidden}
#halo{position:absolute;left:540px;top:930px;width:1100px;height:1100px;border-radius:50%;transform:translate(-50%,-50%);
 background:radial-gradient(closest-side,rgba(64,150,255,.55),rgba(64,150,255,0))}
#zoomIcon{position:absolute}
#folder{position:absolute;left:540px;top:930px;width:640px;height:520px}
#bokeh{position:absolute;inset:0;background:#0B0D12;overflow:hidden}
#bokeh div{position:absolute;border-radius:50%;filter:blur(70px);opacity:.75}
#pal{position:absolute;left:110px;width:860px;transform-origin:50% 0;background:rgba(40,40,44,.94);border:1.5px solid #ffffff22;border-radius:22px;
 box-shadow:0 40px 120px #000c;color:#f2f2f5;overflow:hidden}
#pal .in{display:flex;align-items:center;gap:20px;padding:28px 30px 22px;font-size:40px}
#pal .in svg{width:40px;height:40px}
.caret{display:inline-block;width:4px;height:44px;background:#3b9bff;margin-left:4px;vertical-align:-8px;border-radius:2px;box-shadow:0 0 12px #3b9bff}
#pal .chips{display:flex;gap:14px;padding:0 30px 20px;font-size:26px;color:#c4c4cc;align-items:center;border-bottom:1.5px solid #ffffff14}
#pal .chips b{background:#244f8c;color:#fff;padding:6px 16px;border-radius:10px;font-weight:600}
#pal .chips em{margin-left:auto;font-style:normal;font-size:21px;color:#8e8e96}
#rows{padding:12px}
.row{display:flex;align-items:center;gap:22px;padding:14px 20px;border-radius:14px;font-size:30px;min-height:88px}
.row i{width:36px;height:36px;flex:none}.row i svg{width:100%;height:100%}
.row div{display:flex;flex-direction:column}.row b{font-weight:500}.row small{font-size:21px;color:#b7c4d8;margin-top:2px}
.row kbd{margin-left:auto;font:22px "Segoe UI",sans-serif;color:#9a9aa2}
.row.hi{background:#1f4f8f}
.sticker{position:absolute;padding:20px 38px;border-radius:24px;background:#fff;color:#0B0D12;font:800 76px Inter,sans-serif;white-space:nowrap;
 box-shadow:0 9px 0 #c6d0e3,0 22px 50px #0007;transform-origin:50% 50%}
.spark{position:absolute;left:50%;top:50%;width:260px;height:260px;pointer-events:none}
#win{position:absolute;background:#1c1c1e;border:1.5px solid #ffffff1c;border-radius:20px;overflow:hidden;box-shadow:0 50px 140px #000d;color:#ececf0}
#winInner{position:absolute;left:0;top:0;width:773px;height:1030px;zoom:1.32;display:flex;flex-direction:column}
.tb{height:60px;display:flex;align-items:center;gap:14px;padding:0 22px;font-size:24px}
.tb img{width:28px;height:28px}.tb .ctl{margin-left:auto;display:flex;gap:46px;color:#d0d0d4;font-size:26px}
.tool{height:84px;display:flex;align-items:center;gap:22px;padding:0 26px;font-size:30px;font-weight:600;border-bottom:1.5px solid #ffffff10}
.tool .nav{color:#77777e;font-size:30px;letter-spacing:14px}.tool>svg{width:34px;height:34px}.tool .views{margin-left:auto;display:flex;gap:6px}
.tool .views span{width:52px;height:44px;border-radius:9px;display:grid;place-items:center}.tool .views .on{background:#3a3a40}
.body{flex:1;display:flex;background:#000;overflow:hidden}
.col{height:100%;border-right:1.5px solid #ffffff12;padding-top:8px;font-size:22px;overflow:hidden}
.it{display:flex;align-items:center;gap:10px;height:42px;padding:0 14px;white-space:nowrap}
.it svg{width:26px;height:26px;flex:none}.it.on{background:#164a85}
#col0{width:212px}#col1{width:268px;background:#1a1a1c}#col2{width:293px;padding:46px 20px 0;font-size:17px}
#pvImg{width:100%;aspect-ratio:1.6;background-size:cover;background-position:center;border-radius:6px;transform-origin:50% 50%}
.pvName{text-align:center;font-weight:700;font-size:22px;margin:28px 0 18px}
.meta{border-top:1.5px solid #ffffff18;padding-top:20px;display:grid;grid-template-columns:auto 1fr;row-gap:16px;color:#a8a8b0}
.meta b{text-align:right;font-weight:600;color:#ececf0}
.open{margin-top:80px;background:#0a66d6;color:#fff;text-align:center;font-weight:600;padding:16px;border-radius:10px;font-size:25px}
.status{height:52px;display:flex;align-items:center;padding:0 22px;font-size:21px;color:#b4b4ba;border-top:1.5px solid #ffffff10}
.status span{margin-left:auto}
#s4{position:absolute;inset:0;background:#0B0D12;overflow:hidden}
#grid{position:absolute;left:0;top:0;width:998px;height:${9 * 254}px;transform-origin:499px 1127px}
.tile{position:absolute;width:236px;height:236px;border-radius:26px;background-size:cover;background-position:center;box-shadow:0 16px 40px #0008}
.card{display:flex;align-items:flex-end;padding:22px}.card span{font:800 46px Inter,sans-serif;color:#fff;letter-spacing:-1px}
#s5{position:absolute;inset:0}
#wordsWrap{position:absolute;left:0;right:0;top:${960 - 89}px}
#words{display:flex;flex-direction:column;align-items:center}
.w{height:${178}px;line-height:${178}px;font:800 124px Inter,sans-serif;color:#fff;letter-spacing:-4px;white-space:nowrap;text-shadow:0 6px 30px #0006}
.w.flow{background:linear-gradient(90deg,#7fc0ff,#fff);-webkit-background-clip:text;color:transparent}
#frame{position:absolute;left:540px;top:960px;height:200px;border:8px solid #fff;border-radius:34px;box-shadow:0 0 50px #ffffff40}
#s6{position:absolute;inset:0;background:radial-gradient(100% 70% at 50% 40%,#2f8cff 0%,#0A84FF 30%,#2563EB 75%,#1e40af 100%)}
#big{position:absolute;left:540px;top:905px;transform-origin:50% 50%}
.ln{font:800 230px/230px Inter,sans-serif;color:#fff;letter-spacing:-8px;text-align:center;white-space:nowrap;text-shadow:0 10px 40px #0a2a8a66}
.ln span{display:inline-block;transform-origin:50% 70%}
#dark{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 47%,#141a2a 0%,#0B0D12 70%)}
#fx{position:absolute;inset:0}
#s8{position:absolute;inset:0}
#endIcon{position:absolute;filter:drop-shadow(0 30px 60px #000a)}
#word{position:absolute;left:540px;top:1090px;font:800 230px/1.1 Inter,sans-serif;color:#fff;letter-spacing:-9px;white-space:nowrap}
#sub{position:absolute;left:540px;top:1260px;font:700 74px Inter,sans-serif;color:#d6e4ff;white-space:nowrap;letter-spacing:-1px}
#white{position:absolute;inset:0;background:#fff;opacity:0}
#vig{position:absolute;inset:0;background:radial-gradient(120% 85% at 50% 48%,transparent 55%,rgba(0,0,0,.42) 100%);pointer-events:none}
#grain{position:absolute;inset:0;width:${W}px;height:${H}px;opacity:.08;mix-blend-mode:overlay}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs id="defs"></defs></svg>
<img id="iconImg" src="${DATA.icon}" style="display:none">
<img id="folderImg" style="display:none" src="data:image/svg+xml;base64,${Buffer.from(FOLDER_SVG).toString("base64")}">
<div id="stage">
  <div class="scene" id="s0"><div id="icons"></div>
    <svg id="cursor" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-2.6 1.2-3.4-6.7L5 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg></div>
  <div class="scene" id="s1"><div id="halo"></div><img id="zoomIcon" src="${DATA.icon}"><img id="folder" src="data:image/svg+xml;base64,${Buffer.from(FOLDER_SVG).toString("base64")}"></div>
  <div id="bokeh">${[["#2563EB", 120, 380, 520], ["#7c3aed", 700, 520, 460], ["#0ea5a4", 260, 1250, 520], ["#f97316", 760, 1480, 420],
    ["#0A84FF", 520, 900, 380], ["#db2777", 860, 180, 320]].map(([c, x, y, s]) => `<div style="background:${c};left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px"></div>`).join("")}</div>
  <div class="scene" id="s2">
    <div id="pal" class="ui"><div class="in"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="#d0d0d6" stroke-width="2"/><path d="M15.5 15.5 21 21" stroke="#d0d0d6" stroke-width="2" stroke-linecap="round"/></svg><span id="q"></span></div>
      <div class="chips"><b>All</b><span>Folders</span><span>Actions</span><span>Tags</span><em>Tab categories · Ctrl+Enter search files</em></div>
      <div id="rows"></div></div>
    <div class="sticker" id="kCtrlK" data-r="-7" style="left:300px;top:470px">Ctrl + K</div>
    <div class="sticker" id="kEnter" data-r="6" style="left:800px;top:1290px">Enter<svg class="spark" viewBox="0 0 100 100">${SPARK}</svg></div>
  </div>
  <div class="scene" id="s3"><div id="win" class="ui"><div id="winInner">
    <div class="tb"><img src="${DATA.icon}">Dirwise<span class="ctl"><span>─</span><span>☐</span><span>✕</span></span></div>
    <div class="tool"><span class="nav">‹ ›</span>${ICON.folder}<span>Summer 2026</span><span class="views"><span>${ICON.grid}</span><span>${ICON.list}</span><span class="on">${ICON.cols}</span></span></div>
    <div class="body">
      <div class="col" id="col0"><div class="it on" id="sel1">${ICON.folder}Summer 2026</div><div class="it">${ICON.image}city-at-night.jpg</div><div class="it">${ICON.image}forest-morning.jpg</div></div>
      <div class="col" id="col1">${DATA.files.map((f) => `<div class="it"${f === DATA.preview.name ? ' id="sel2"' : ""}>${f.endsWith(".mp4") ? ICON.video : ICON.image}${f}</div>`).join("")}</div>
      <div class="col" id="col2"><div id="pvImg" style="background-image:url(${DATA.photos[PREVIEW]})"></div><div class="pvName">${DATA.preview.name}</div>
        <div class="meta"><span>Kind</span><b>JPEG Image</b><span>Size</span><b>${DATA.preview.size}</b><span>Dimensions</span><b>1,600 × 1,000 px</b><span>Tags</span><b>—</b></div>
        <div class="open">Open</div></div>
    </div>
    <div class="status">C: › Home › Pictures › Summer 2026<span>1 of 52 selected</span></div>
  </div></div></div>
  <div id="s4"><div id="grid"></div></div>
  <div id="s5"><div id="frame"></div><div id="wordsWrap"><div id="words"></div></div></div>
  <div id="s6"><div id="big"></div>
    ${[["kCtrl", "Ctrl", 250, 470, -12], ["kK", "K", 840, 520, 10], ["kSpace", "Space", 330, 1290, -6], ["kF5", "F5", 820, 1330, 12]]
    .map(([id, k, x, y, r]) => `<div class="sticker" id="${id}" data-r="${r}" style="left:${x}px;top:${y}px">${k}<svg class="spark" viewBox="0 0 100 100">${SPARK}</svg></div>`).join("")}</div>
  <div id="dark"></div>
  <canvas id="fx" width="${W}" height="${H}"></canvas>
  <div id="s8"><img id="endIcon" src="${DATA.icon}"><div id="word">Dirwise</div><div id="sub">Free on Microsoft Store</div></div>
</div>
<div id="white"></div><div id="vig"></div><canvas id="grain" width="${W / 3}" height="${H / 3}"></canvas>
<script>(${pageMain.toString()})(${JSON.stringify({ fps: DATA.fps, icon: DATA.icon, photos: DATA.photos })});</script>
</body></html>`;

// Složka jako na ikoně aplikace (zadní díl světlejší, přední s gradientem, značky „|||·“).
const FOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 520">
<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a9cff"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
<linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f74ec"/><stop offset="1" stop-color="#1d4fc4"/></linearGradient></defs>
<path d="M30 70a40 40 0 0 1 40-40h170l60 56h270a40 40 0 0 1 40 40v40H30z" fill="url(#b)" stroke="#bcdcff" stroke-width="5"/>
<rect x="30" y="120" width="580" height="370" rx="40" fill="url(#f)" stroke="#cfe6ff" stroke-width="6"/>
<g fill="#fff"><rect x="110" y="235" width="16" height="150" rx="8"/><rect x="160" y="235" width="16" height="150" rx="8"/>
<rect x="250" y="235" width="16" height="150" rx="8"/><rect x="205" y="300" width="20" height="20" rx="5"/><rect x="300" y="300" width="20" height="20" rx="5"/></g></svg>`;
const SPARK = [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
  `<line x1="50" y1="50" x2="50" y2="6" transform="rotate(${a} 50 50)" stroke="#fff" stroke-width="${a % 90 ? 3 : 5}" stroke-linecap="round" stroke-dasharray="0 30 20 100"/>`).join("");
const ICON = {
  folder: `<svg viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2l2 2h8.8A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill="#f2c94c"/></svg>`,
  image: `<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z" fill="#e8eef8"/><rect x="8" y="10" width="8" height="7" rx="1" fill="#3b82f6"/></svg>`,
  video: `<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z" fill="#e8eef8"/><circle cx="12" cy="13.5" r="3.5" fill="#6b5b4b"/></svg>`,
  grid: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9c9cf" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`,
  list: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c9c9cf" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>`,
  cols: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9.2 4v16M14.8 4v16"/></svg>`,
};

// ---------- headless Chrome/Edge ----------
async function withChrome(fn) {
  const exe = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean).find((c) => fs.existsSync(c));
  if (!exe) throw new Error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>.");
  const PORT = 9335;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-motion-"));
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
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails));
      return r.result.value;
    };
    const html = path.join(WORK, "motion.html");
    fs.writeFileSync(html, page());
    await send("Page.navigate", { url: `file:///${html.replace(/\\/g, "/")}` });
    await sleep(500);
    for (let i = 0; i < 100 && !(await evaluate("typeof window.render === 'function'").catch(() => false)); i++) await sleep(100);
    await evaluate("Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]).then(() => init())");
    // Zahřátí: dlaždice mozaiky jsou CSS pozadí – jednou vykreslit, ať nejsou v prvních snímcích prázdné.
    for (const n of [100, 200, 300, 400]) { await evaluate(`render(${n})`); await sleep(400); }
    const shot = async (n, file, format = "jpeg") => {
      await evaluate(`render(${n}); new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
      const r = await send("Page.captureScreenshot", format === "png" ? { format } : { format, quality: 94 });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    };
    await fn(shot);
    ws.close();
  } finally {
    proc.kill();
    await sleep(500);
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
  }
}

// ---------- běh ----------
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
const TOTAL = DUR * FPS;
const MUSIC = opt("--music", null);
if (MUSIC) {
  const out = swapMusic(path.join(OUT, "dirwise-motion-1080x1920.mp4"), path.resolve(MUSIC), opt("--suffix", "-v2"));
  console.log(out);
} else if (STILLS) {
  await withChrome(async (shot) => {
    for (const t of STILLS) {
      const file = path.join(OUT, `motion-still-${t.toFixed(2)}s.png`);
      await shot(Math.round(t * FPS), file, "png");
      console.log(file);
    }
  });
} else {
  if (!fs.existsSync(AUDIO)) throw new Error(`chybí hudba: ${AUDIO}`);
  const frames = path.join(WORK, "frames");
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  await withChrome(async (shot) => {
    for (let n = 0; n < TOTAL; n++) {
      await shot(n, path.join(frames, `${String(n).padStart(4, "0")}.jpg`));
      if (n % 90 === 0) console.log(`snímek ${n}/${TOTAL}`);
    }
  });
  const out = path.join(OUT, "dirwise-motion-1080x1920.mp4");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(frames, "%04d.jpg"), "-i", AUDIO,
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-frames:v", String(TOTAL),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], { stdio: "inherit" });
  // Mřížka po 0,5 s (36 snímků) s časem.
  const grid = out.replace(/\.mp4$/, "-grid.png");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-vf",
    `select='not(mod(n\\,${FPS / 2}))',scale=240:-2,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.7,tile=9x4:padding=3:color=0x101010`,
    "-frames:v", "1", grid], { stdio: "inherit" });
  console.log(`${out}  ${(fs.statSync(out).size / 1048576).toFixed(1)} MB\n${grid}`);
}
