// Demo fotky do docs/demo/Photos (složka je jen lokálně, viz CLAUDE.md): krajiny jako
// ilustrace s jasnými tvary a kontrastem (obloha, slunce, hory, jezero s odrazem, moře,
// město, pole), ať náhledy v mřížce i v panelu vypadají jako fotky, ne jako barevný šum.
// Scéna se vybere podle názvu souboru, náhoda je odvozená od názvu (stejný výsledek
// při každém běhu). Vykresluje headless Chrome/Edge přes CDP (port 9334) do JPEG 1600×1000;
// tři videa v Summer 2026 jsou z těch krajin (ffmpeg).
// node scripts/docs-media/photos.mjs [--force]   (bez --force jen chybějící; CHROME=<exe>)
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawn } from "child_process";
import { fileURLToPath } from "url";

const PHOTOS = fileURLToPath(new URL("../../docs/demo/Photos/", import.meta.url));
const SUMMER = [
  "alpine-lake", "old-town", "sunrise-hike", "picnic", "lighthouse", "market-day",
  "rainy-street", "night-market", "canoe", "lavender-field", "cliff-walk", "campfire",
  "fishing-village", "rooftops", "sand-dunes", "waterfall", "vineyard", "sailing",
  "bike-ride", "golden-hour", "festival", "starry-sky",
  "pier-at-dusk", "orchard", "street-food", "tide-pools", "hilltop-view", "train-window",
  "lakeside-cabin", "kayaks", "sunflowers", "ice-cream", "beach-volleyball", "harbor-morning",
  "forest-path", "boardwalk", "summer-rain", "museum-day", "evening-swim", "mountain-hut",
  "berry-picking", "farewell-sunset",
  // Původních sedm fotek z docs/demo (dřív rozmazané přechody).
  "beach-day", "coastline", "harbor-lights", "island-ferry", "mountain-trail", "sunset-over-lake", "wildflowers",
];
const FILES = [
  ...SUMMER.map((n) => [n, `${PHOTOS}Summer 2026/${n}.jpg`]),
  ["city-at-night", `${PHOTOS}city-at-night.jpg`],
  ["forest-morning", `${PHOTOS}forest-morning.jpg`],
];
const W = 1600;
const H = 1000;

// --- náhoda podle názvu ---
function rng(name) {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Míchání barev (#rrggbb) — vzdálené vrstvy blednou do barvy obzoru.
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");

// Denní doba: obloha (nahoře, uprostřed, u obzoru), slunce, tmavé siluety.
const TIMES = {
  day: { sky: ["#2f6fd1", "#76b3ef", "#d8ecfb"], sun: "#fff6d8", land: "#2f5d3a", far: "#6f93b8", water: "#2a6db5" },
  sunset: { sky: ["#2b2a6b", "#d9576b", "#ffc46b"], sun: "#ffe3a1", land: "#2a1d3a", far: "#8b4d78", water: "#5a3d72" },
  golden: { sky: ["#3b6fb0", "#f2b46a", "#ffe1a3"], sun: "#fff1c4", land: "#4a4024", far: "#b08a6a", water: "#4f78a8" },
  dawn: { sky: ["#34507f", "#e7a3a6", "#fde3c4"], sun: "#fff0d6", land: "#33424f", far: "#9a8fa8", water: "#6a7fa6" },
  night: { sky: ["#03061a", "#111a4a", "#2b3778"], sun: "#f4f1e0", land: "#05070f", far: "#141b3d", water: "#0b1230" },
  rain: { sky: ["#5d6773", "#8a939d", "#b7bec6"], sun: null, land: "#36423a", far: "#76818c", water: "#55606b" },
};

function timeOf(n) {
  if (/night|starry|city-at|harbor-lights|campfire/.test(n)) return "night";
  if (/sunset|dusk|farewell|evening/.test(n)) return "sunset";
  if (/golden|vineyard|sunflower|lavender/.test(n)) return "golden";
  if (/sunrise|morning/.test(n)) return "dawn";
  if (/rain/.test(n)) return "rain";
  return "day";
}

function kindOf(n) {
  if (/dunes/.test(n)) return "dunes";
  if (/town|street|market|rooftops|museum|festival|food|city|train|ice-cream|bike/.test(n)) return "city";
  if (/lavender|sunflower|wildflower|vineyard|orchard|berry|picnic/.test(n)) return "fields";
  if (/beach|coast|tide|sailing|island|ferry|kayak|boardwalk|pier|harbor|lighthouse|fishing|swim|volleyball/.test(n)) return "sea";
  return "mountains";
}

function scene(name) {
  const r = rng(name);
  const rr = (a, b) => a + r() * (b - a);
  const T = TIMES[timeOf(name)];
  const kind = kindOf(name);
  const night = T === TIMES.night;
  const horizon = kind === "city" ? rr(640, 720) : rr(540, 620);
  const out = [];
  const defs = [];

  // Obloha
  defs.push(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${T.sky[0]}"/><stop offset="0.62" stop-color="${T.sky[1]}"/><stop offset="1" stop-color="${T.sky[2]}"/></linearGradient>`);
  out.push(`<rect width="${W}" height="${horizon + 2}" fill="url(#sky)"/>`);

  // Hvězdy a měsíc / slunce
  const sunX = rr(380, 1220);
  const sunY = horizon - (night ? rr(330, 450) : T === TIMES.day ? rr(260, 400) : rr(40, 150));
  if (night) {
    for (let i = 0; i < (name.includes("starry") ? 420 : 160); i++) {
      out.push(`<circle cx="${rr(0, W).toFixed(0)}" cy="${rr(0, horizon - 40).toFixed(0)}" r="${rr(0.6, 2.2).toFixed(1)}" fill="#fff" opacity="${rr(0.35, 1).toFixed(2)}"/>`);
    }
    if (name.includes("starry")) {
      out.push(`<ellipse cx="${W / 2}" cy="${horizon * 0.45}" rx="900" ry="90" fill="#9fb4ff" opacity="0.12" transform="rotate(-18 ${W / 2} ${horizon * 0.45})"/>`);
    }
  }
  if (T.sun) {
    const sr = night ? 46 : T === TIMES.day ? 58 : 88;
    defs.push(`<radialGradient id="glow"><stop offset="0" stop-color="${T.sun}" stop-opacity="0.85"/><stop offset="1" stop-color="${T.sun}" stop-opacity="0"/></radialGradient>`);
    out.push(`<circle cx="${sunX}" cy="${sunY}" r="${sr * 4.2}" fill="url(#glow)" opacity="${night ? 0.35 : 0.7}"/>`);
    out.push(`<circle cx="${sunX}" cy="${sunY}" r="${sr}" fill="${T.sun}"/>`);
  }

  // Mraky
  const clouds = T === TIMES.rain ? 9 : night ? 1 : Math.floor(rr(2, 6));
  for (let i = 0; i < clouds; i++) {
    const cx = rr(0, W), cy = rr(70, horizon - 160), s = rr(0.7, 1.6);
    const col = T === TIMES.rain ? "#c9cfd6" : T === TIMES.sunset ? "#ffb3a0" : T === TIMES.golden ? "#fff0d8" : "#ffffff";
    const op = T === TIMES.rain ? 0.75 : night ? 0.12 : 0.85;
    out.push(`<g fill="${col}" opacity="${op}" transform="translate(${cx.toFixed(0)} ${cy.toFixed(0)}) scale(${s.toFixed(2)})">
      <ellipse cx="0" cy="0" rx="120" ry="34"/><ellipse cx="-60" cy="-14" rx="62" ry="38"/><ellipse cx="40" cy="-26" rx="70" ry="48"/><ellipse cx="110" cy="-6" rx="56" ry="30"/></g>`);
  }

  // Hřeben hor jako polygon: náhodná procházka s několika vrcholy.
  const ridge = (base, amp, step, color, sharp = 1) => {
    const pts = [];
    let y = base - rr(0, amp);
    for (let x = -20; x <= W + 20; x += step) {
      y += rr(-amp, amp) * 0.35 * sharp;
      y = Math.min(base, Math.max(base - amp * 1.6, y));
      pts.push(`${x},${y.toFixed(0)}`);
    }
    return `<polygon points="-20,${horizon + 2} ${pts.join(" ")} ${W + 20},${horizon + 2}" fill="${color}"/>`;
  };
  // Hory s výraznými vrcholy (štíty) – pro horské scény.
  const peaks = (base, height, count, color, snow) => {
    let s = `<polygon points="-20,${horizon + 2} `;
    const caps = [];
    const xs = Array.from({ length: count }, (_, i) => (W / count) * (i + rr(0.2, 0.8)));
    let prevX = -20;
    for (const px of xs) {
      const ph = base - rr(height * 0.6, height);
      const vx = (prevX + px) / 2;
      s += `${vx.toFixed(0)},${(base - rr(0, height * 0.35)).toFixed(0)} ${px.toFixed(0)},${ph.toFixed(0)} `;
      if (snow) caps.push(`<polygon points="${(px - 46).toFixed(0)},${(ph + 60).toFixed(0)} ${px.toFixed(0)},${ph.toFixed(0)} ${(px + 52).toFixed(0)},${(ph + 66).toFixed(0)} ${(px + 14).toFixed(0)},${(ph + 48).toFixed(0)} ${(px - 12).toFixed(0)},${(ph + 62).toFixed(0)}" fill="#f4f7fb" opacity="0.92"/>`);
      prevX = px;
    }
    s += `${W + 20},${(base - rr(0, height * 0.4)).toFixed(0)} ${W + 20},${horizon + 2}" fill="${color}"/>`;
    return s + caps.join("");
  };

  const pine = (x, y, h, color) =>
    `<g fill="${color}"><rect x="${x - h * 0.03}" y="${y - h * 0.12}" width="${h * 0.06}" height="${h * 0.12}"/>` +
    [0, 1, 2].map((k) => `<polygon points="${x - h * (0.26 - k * 0.06)},${y - h * (0.1 + k * 0.28)} ${x},${y - h * (0.5 + k * 0.25)} ${x + h * (0.26 - k * 0.06)},${y - h * (0.1 + k * 0.28)}"/>`).join("") + "</g>";
  const house = (x, y, w, color, roof, lit) =>
    `<rect x="${x}" y="${y - w * 0.6}" width="${w}" height="${w * 0.6}" fill="${color}"/>` +
    `<polygon points="${x - w * 0.08},${y - w * 0.6} ${x + w / 2},${y - w * 1.0} ${x + w * 1.08},${y - w * 0.6}" fill="${roof}"/>` +
    `<rect x="${x + w * 0.35}" y="${y - w * 0.42}" width="${w * 0.22}" height="${w * 0.2}" fill="${lit ? "#ffd27a" : "#cfe3f2"}"/>`;
  const boat = (x, y, s, sail = true) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-60 0 L60 0 L42 22 L-44 22 Z" fill="${night ? "#1a1f33" : "#7a3b2a"}"/>` +
    (sail ? `<polygon points="-4,-4 -4,-120 44,-8" fill="${night ? "#c9d3ff" : "#fbfbf5"}"/><polygon points="-10,-6 -10,-96 -46,-8" fill="${night ? "#aab6ee" : "#e9e6da"}"/>` : "") + "</g>";

  // Voda pod obzorem s odrazem slunce a hor.
  const water = (top, reflect) => {
    defs.push(`<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(T.water, T.sky[2], 0.35)}"/><stop offset="1" stop-color="${mix(T.water, "#000000", 0.35)}"/></linearGradient>`);
    let s = `<rect y="${top}" width="${W}" height="${H - top}" fill="url(#water)"/>`;
    if (reflect) s += `<g transform="translate(0 ${2 * top}) scale(1 -1)" opacity="0.28">${reflect}</g>`;
    if (T.sun) {
      for (let i = 0; i < 26; i++) {
        const y = top + 8 + i * i * 0.6 + i * 6;
        if (y > H) break;
        const w = rr(30, 140) * (1 + i * 0.12);
        s += `<rect x="${(sunX - w / 2 + rr(-20, 20)).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(2 + i * 0.25).toFixed(1)}" rx="2" fill="${T.sun}" opacity="${(0.75 - i * 0.025).toFixed(2)}"/>`;
      }
    }
    for (let i = 0; i < 40; i++) {
      const y = rr(top + 10, H);
      s += `<rect x="${rr(0, W).toFixed(0)}" y="${y.toFixed(0)}" width="${rr(40, 180).toFixed(0)}" height="2" fill="#ffffff" opacity="${(0.05 + (y - top) / H * 0.12).toFixed(2)}"/>`;
    }
    return s;
  };

  if (kind === "mountains") {
    const far = peaks(horizon, rr(260, 360), Math.floor(rr(3, 5)), mix(T.far, T.sky[2], 0.35), T !== TIMES.night && !/campfire|hike/.test(name));
    const mid = ridge(horizon, rr(90, 150), 60, mix(T.land, T.far, 0.45));
    out.push(far, mid);
    if (name.includes("waterfall")) {
      const x = rr(500, 1100);
      out.push(`<rect x="${x}" y="${horizon - 220}" width="34" height="222" fill="#eef6ff" opacity="0.9"/><rect x="${x + 8}" y="${horizon - 220}" width="6" height="222" fill="#ffffff"/>`);
    }
    out.push(water(horizon, far + mid));
    // Břeh s lesem v popředí
    const shoreY = rr(820, 900);
    out.push(`<path d="M0 ${shoreY} Q ${W * 0.3} ${shoreY - 60} ${W * 0.55} ${shoreY - 10} T ${W} ${shoreY - 40} V ${H} H 0 Z" fill="${mix(T.land, "#000000", 0.25)}"/>`);
    const trees = /forest/.test(name) ? 34 : 16;
    for (let i = 0; i < trees; i++) {
      const x = r() < 0.5 ? rr(-20, W * 0.32) : rr(W * 0.7, W + 20);
      out.push(pine(x, rr(shoreY + 10, H + 40), rr(160, 380), mix(T.land, "#000000", rr(0.3, 0.6))));
    }
    if (/cabin|hut/.test(name)) out.push(house(rr(560, 900), shoreY + 18, 150, "#8a5a3c", "#4a2f22", T !== TIMES.day));
    if (/canoe|kayak/.test(name)) out.push(boat(rr(600, 1000), horizon + 160, 1.2, false));
    if (name.includes("campfire")) {
      const fx = rr(700, 900), fy = shoreY + 70;
      defs.push(`<radialGradient id="fire"><stop offset="0" stop-color="#ffb347" stop-opacity="0.9"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>`);
      out.push(`<circle cx="${fx}" cy="${fy}" r="220" fill="url(#fire)"/><polygon points="${fx - 34},${fy} ${fx},${fy - 90} ${fx + 34},${fy}" fill="#ffcf5a"/><polygon points="${fx - 18},${fy} ${fx + 4},${fy - 56} ${fx + 20},${fy}" fill="#fff1b8"/>`);
    }
  } else if (kind === "sea") {
    const island = r() < 0.6 || /island|coast|cliff/.test(name);
    const land = island ? ridge(horizon, rr(60, 120), 70, mix(T.far, T.sky[2], 0.3)) : "";
    out.push(land);
    out.push(water(horizon, land));
    if (/coast|lighthouse|cliff/.test(name)) {
      const side = r() < 0.5;
      const cliff = side
        ? `<path d="M0 ${horizon - 160} L ${W * 0.28} ${horizon - 120} L ${W * 0.36} ${H} L 0 ${H} Z" fill="${mix(T.land, "#000000", 0.2)}"/>`
        : `<path d="M${W} ${horizon - 170} L ${W * 0.7} ${horizon - 130} L ${W * 0.62} ${H} L ${W} ${H} Z" fill="${mix(T.land, "#000000", 0.2)}"/>`;
      out.push(cliff);
      if (name.includes("lighthouse")) {
        const lx = side ? W * 0.18 : W * 0.82, ly = horizon - 140;
        out.push(`<polygon points="${lx - 30},${ly} ${lx - 18},${ly - 230} ${lx + 18},${ly - 230} ${lx + 30},${ly}" fill="#f4f4f0"/>` +
          [0, 1, 2].map((k) => `<polygon points="${lx - 28 + k * 3},${ly - 40 - k * 70} ${lx - 25 + k * 3},${ly - 75 - k * 70} ${lx + 25 - k * 3},${ly - 75 - k * 70} ${lx + 28 - k * 3},${ly - 40 - k * 70}" fill="#d43a3a"/>`).join("") +
          `<rect x="${lx - 22}" y="${ly - 270}" width="44" height="40" fill="${night ? "#ffe27a" : "#2b2b2b"}"/><polygon points="${lx - 28},${ly - 270} ${lx},${ly - 300} ${lx + 28},${ly - 270}" fill="#d43a3a"/>`);
      }
    }
    if (/sailing|ferry|harbor|fishing|tide|beach-day|swim/.test(name)) {
      for (let i = 0; i < (name.includes("sailing") ? 4 : 2); i++) out.push(boat(rr(200, 1400), horizon + rr(20, 120), rr(0.5, 1.1), !name.includes("ferry")));
    }
    if (name.includes("ferry")) out.push(`<g transform="translate(${rr(500, 1000)} ${horizon + 40})"><rect x="-150" y="-30" width="300" height="34" fill="#f2f2f2"/><rect x="-110" y="-62" width="200" height="34" fill="#e8e8e8"/><rect x="-20" y="-96" width="40" height="36" fill="#d43a3a"/><path d="M-170 2 L170 2 L150 30 L-150 30 Z" fill="#20334f"/></g>`);
    if (/harbor|fishing|pier/.test(name)) {
      const by = horizon + 6;
      for (let i = 0; i < 9; i++) out.push(house(60 + i * 120 + rr(-10, 10), by, rr(70, 100), ["#d9644a", "#e8b04b", "#4f86c6", "#f2efe6", "#6aa37a"][i % 5], "#6b3b2a", night));
    }
    if (/beach|volleyball|tide|boardwalk|pier|swim/.test(name)) {
      const sy = rr(780, 860);
      out.push(`<path d="M0 ${sy} Q ${W * 0.4} ${sy - 50} ${W} ${sy + 10} V ${H} H 0 Z" fill="${mix("#e9cf9a", T.sky[1], 0.15)}"/>`);
      out.push(`<path d="M0 ${sy} Q ${W * 0.4} ${sy - 50} ${W} ${sy + 10}" stroke="#ffffff" stroke-width="6" fill="none" opacity="0.7"/>`);
      if (/boardwalk|pier/.test(name)) for (let i = 0; i < 16; i++) out.push(`<rect x="${W * 0.35 + i * 6}" y="${horizon + 20 + i * 24}" width="${180 + i * 30}" height="14" fill="#8a6244" transform="translate(${-i * 18} 0)"/>`);
      if (name.includes("volleyball")) out.push(`<rect x="560" y="${sy - 230}" width="8" height="240" fill="#333"/><rect x="1040" y="${sy - 230}" width="8" height="240" fill="#333"/><rect x="568" y="${sy - 228}" width="472" height="70" fill="none" stroke="#fafafa" stroke-width="4" stroke-dasharray="10 8"/><circle cx="${rr(700, 900)}" cy="${sy - 330}" r="26" fill="#ffd23f"/>`);
      if (name.includes("tide")) for (let i = 0; i < 7; i++) out.push(`<ellipse cx="${rr(100, 1500)}" cy="${rr(sy + 30, H - 30)}" rx="${rr(40, 110)}" ry="${rr(10, 24)}" fill="${T.water}" opacity="0.8"/>`);
    }
  } else if (kind === "dunes") {
    // Podklad pod obzorem, ať mezi hřbety neprosvítá černá.
    out.push(`<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="#e3a25b"/>`);
    for (let k = 0; k < 4; k++) {
      const y = horizon + k * 110;
      const c = mix("#e3a25b", "#7a3e1d", k * 0.2);
      out.push(`<path d="M0 ${y} Q ${rr(200, 600)} ${y - rr(80, 160)} ${rr(700, 900)} ${y - 20} T ${W} ${y - rr(20, 80)} V ${H} H 0 Z" fill="${c}"/>`);
    }
  } else if (kind === "fields") {
    out.push(ridge(horizon, rr(50, 90), 80, mix(T.far, T.sky[2], 0.3)));
    const rowCol = /lavender/.test(name) ? "#8a5cc4" : /vineyard/.test(name) ? "#3f6b2e" : /sunflower/.test(name) ? "#e6b422" : "#5a8f3a";
    out.push(`<path d="M0 ${horizon} Q ${W / 2} ${horizon - 40} ${W} ${horizon + 10} V ${H} H 0 Z" fill="${mix(rowCol, T.land, 0.5)}"/>`);
    if (/lavender|vineyard/.test(name)) {
      for (let i = -12; i <= 12; i++) {
        out.push(`<polygon points="${W / 2 + i * 10},${horizon + 4} ${W / 2 + i * 14},${horizon + 4} ${W / 2 + i * 170 + 60},${H} ${W / 2 + i * 170 - 20},${H}" fill="${rowCol}"/>`);
      }
    } else {
      const flowers = /sunflower/.test(name) ? ["#ffcc1a"] : ["#ff5d8f", "#ffd23f", "#ffffff", "#8a5cc4", "#ff8a3d"];
      for (let i = 0; i < 520; i++) {
        const y = rr(horizon + 20, H + 20);
        const s = 2 + ((y - horizon) / (H - horizon)) * (/sunflower/.test(name) ? 26 : 12);
        const c = flowers[Math.floor(r() * flowers.length)];
        const x = rr(0, W);
        out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="${c}"/>`);
        // Slunečnice: hnědý střed květu.
        if (/sunflower/.test(name) && s > 8) out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s * 0.4).toFixed(1)}" fill="#5b3a1a"/>`);
      }
    }
    if (/orchard|berry|picnic/.test(name)) {
      for (let i = 0; i < 7; i++) {
        const x = rr(80, W - 80), y = rr(horizon + 60, horizon + 260), s = rr(60, 120);
        out.push(`<rect x="${x - 8}" y="${y - 10}" width="16" height="${s * 0.8}" fill="#5b3a26"/><circle cx="${x}" cy="${y - s * 0.3}" r="${s * 0.6}" fill="#3e7d32"/>` +
          Array.from({ length: 6 }, () => `<circle cx="${(x + rr(-s * 0.4, s * 0.4)).toFixed(0)}" cy="${(y - s * 0.3 + rr(-s * 0.35, s * 0.35)).toFixed(0)}" r="7" fill="${name.includes("berry") ? "#5b2b8a" : "#d6312b"}"/>`).join(""));
      }
      if (name.includes("picnic")) out.push(`<polygon points="560,920 1040,900 1120,990 480,1000" fill="#d43a3a"/><polygon points="600,940 700,936 690,960 590,964" fill="#ffffff" opacity="0.8"/>`);
    }
  } else {
    // Město: dvě řady domů, okna rozsvícená v noci.
    const back = mix(T.far, T.sky[2], 0.2);
    const front = mix(T.land, "#1a1a1a", 0.4);
    for (const [layer, color, minH, maxH] of [[0, back, 120, 360], [1, front, 80, 260]]) {
      let x = -10;
      while (x < W) {
        const bw = rr(70, 170), bh = rr(minH, maxH);
        const y = horizon + layer * 120 - bh;
        out.push(`<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${bw.toFixed(0)}" height="${(H - y).toFixed(0)}" fill="${color}"/>`);
        if (layer === 1 || night) {
          for (let wy = y + 18; wy < horizon + layer * 120 - 10; wy += 34) {
            for (let wx = x + 12; wx < x + bw - 20; wx += 28) {
              const on = night ? r() < 0.55 : r() < 0.25;
              out.push(`<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="14" height="18" fill="${on ? "#ffd27a" : mix(color, "#ffffff", 0.18)}" opacity="${on ? 0.95 : 0.6}"/>`);
            }
          }
        }
        if (layer === 1 && r() < 0.5) out.push(`<polygon points="${x - 6},${y} ${x + bw / 2},${y - bw * 0.45} ${x + bw + 6},${y}" fill="${mix("#8b3a2a", T.land, 0.3)}"/>`);
        x += bw + rr(0, 14);
      }
    }
    out.push(`<rect y="${horizon + 120}" width="${W}" height="${H - horizon - 120}" fill="${mix(front, "#000000", 0.35)}"/>`);
    if (/market|festival|food|night-market/.test(name)) {
      for (let i = 0; i < 22; i++) out.push(`<circle cx="${(40 + i * 72).toFixed(0)}" cy="${(horizon + 40 + Math.sin(i / 2) * 26).toFixed(0)}" r="9" fill="${["#ffd23f", "#ff5d8f", "#4fc3f7", "#80ed99"][i % 4]}"/>`);
      for (let i = 0; i < 6; i++) { const x = 90 + i * 250; out.push(`<polygon points="${x},${horizon + 150} ${x + 90},${horizon + 100} ${x + 180},${horizon + 150}" fill="${["#d43a3a", "#f2efe6", "#2a7ab0"][i % 3]}"/><rect x="${x + 10}" y="${horizon + 150}" width="160" height="70" fill="#6b4a33"/>`); }
    }
    if (name.includes("train")) out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#1c1f26" stroke-width="120"/><rect x="60" y="60" width="${W - 120}" height="${H - 120}" rx="40" fill="none" stroke="#2b2f38" stroke-width="20"/>`);
  }

  if (T === TIMES.rain) {
    for (let i = 0; i < 320; i++) { const x = rr(0, W), y = rr(0, H); out.push(`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 14).toFixed(0)}" y2="${(y + 46).toFixed(0)}" stroke="#e8eef5" stroke-width="2" opacity="0.35"/>`); }
  }

  // Jemná vinětace a zrno, ať to působí jako fotka.
  defs.push(`<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></radialGradient>`);
  defs.push(`<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(rr(1, 99))}"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.09 0"/></filter>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#vig)"/>`, `<rect width="${W}" height="${H}" filter="url(#grain)"/>`);

  return `<!doctype html><html><head><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}</style></head><body>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join("")}</defs>${out.join("")}</svg></body></html>`;
}

function findBrowser() {
  const cands = [process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].filter(Boolean);
  const exe = cands.find((c) => fs.existsSync(c));
  if (!exe) { console.error("Nenašel jsem Chrome ani Edge – nastav CHROME=<cesta k exe>."); process.exit(1); }
  return exe;
}

const force = process.argv.includes("--force");
const todo = FILES.filter(([, file]) => force || !fs.existsSync(file));
if (todo.length === 0) console.log("fotky jsou hotové (--force přegeneruje všechny)");

const PORT = 9334;
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dirwise-photos-"));
const proc = spawn(findBrowser(), ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`,
  "--no-first-run", "--hide-scrollbars", "--force-color-profile=srgb", "about:blank"], { stdio: "ignore" });
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

try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const frameId = (await send("Page.getFrameTree")).frameTree.frame.id;
  for (const [name, file] of todo) {
    await send("Page.setDocumentContent", { frameId, html: scene(name) });
    await new Promise((r) => setTimeout(r, 60));
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 88, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log("ok", name);
  }
} finally {
  ws.close();
  proc.kill();
  await new Promise((r) => setTimeout(r, 500));
  // Prohlížeč profil chvíli drží – úklid s opakováním, selhání nevadí (je v %TEMP%).
  try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch {}
}

// Videa v Summer 2026: pár vteřin pomalého přiblížení přes vygenerovanou krajinu (první
// snímek = náhled v mřížce). ffmpeg z PATH, záložně alias z WinGet Links (viz CLAUDE.md).
const VIDEOS = [["boat-trip", "sailing"], ["drone-flight", "alpine-lake"], ["lake-timelapse", "sunset-over-lake"]];
const ffmpeg = [process.env.FFMPEG, path.join(process.env.LOCALAPPDATA ?? "", "Microsoft/WinGet/Links/ffmpeg.exe")]
  .find((p) => p && fs.existsSync(p)) ?? "ffmpeg";
for (const [video, source] of VIDEOS) {
  const out = `${PHOTOS}Summer 2026/${video}.mp4`;
  if (!force && fs.existsSync(out)) continue;
  execFileSync(ffmpeg, ["-v", "error", "-y", "-loop", "1", "-i", `${PHOTOS}Summer 2026/${source}.jpg`,
    "-vf", "scale=3200:-1,zoompan=z='1+0.0012*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1280x800:fps=30",
    "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", out]);
  console.log("ok", video);
}
