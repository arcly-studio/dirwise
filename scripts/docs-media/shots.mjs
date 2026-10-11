// Screenshoty do docs/screenshots (viz CLAUDE.md, sekce Screenshoty a demo).
// node scripts/docs-media/shots.mjs [jméno …]   (bez argumentu všech šest)
// Výchozí vzhled (Průhlednost vypnutá). Scéna transparency je skutečný snímek
// obrazovky: okno s „čistou“ průhledností před testovací tapetou (wallpaper.mjs).
// --store: 1920×1080 do docs/store/ (Microsoft Store chce aspoň 1366×768) – viewport 1280×720
// se škálováním 1,5, ať rozložení odpovídá README a výpis jde odscrollovat pod sklo.
import fs from "fs";
import { fileURLToPath } from "url";
import { setup, panel, TABS } from "./setup.mjs";
import { announceFocus, screen, stage } from "./wallpaper.mjs";

const ALL = ["hero-dark", "hero-light", "split-view", "command-palette", "previews", "transparency"];
const STORE = process.argv.includes("--store");
const args = process.argv.slice(2).filter((a) => a !== "--store");
const which = args.length > 0 ? args : ALL;
const [W, H, SCALE] = STORE ? [1280, 720, 1.5] : [1280, 800, 1];
const OUT = fileURLToPath(new URL(STORE ? "../../docs/store/" : "../../docs/screenshots/", import.meta.url));
fs.mkdirSync(OUT, { recursive: true });

async function helpers(c) {
  // Klik na prvek podle selektoru (a volitelně textu) skutečnou myší přes CDP.
  const clickEl = async (sel, text, nth = 0) => {
    const pos = await c.evaluate(`(() => {
      const els = [...document.querySelectorAll(${JSON.stringify(sel)})]
        .filter((e) => ${text ? `e.textContent.trim() === ${JSON.stringify(text)} || e.getAttribute("aria-label") === ${JSON.stringify(text)}` : "true"})
        .filter((e) => e.getBoundingClientRect().width > 0);
      const e = els[${nth}];
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    })()`);
    if (!pos) throw new Error(`nenalezeno: ${sel} ${text ?? ""}`);
    await c.click(pos[0], pos[1]);
    await c.sleep(400);
  };
  const ctrl = (k, code, vk, shift = false) => c.key(k, code, vk, shift ? 10 : 2);
  const palette = async (q) => {
    await ctrl("k", "KeyK", 75);
    await c.sleep(400);
    await c.type(q, 60);
    await c.sleep(500);
  };
  const enter = () => c.key("Enter", "Enter", 13, 0, "\r");
  const esc = () => c.key("Escape", "Escape", 27);
  return { clickEl, ctrl, palette, enter, esc };
}

const ICON = (c, h) => h.clickEl("[data-path]", "harbor-lights.jpg");
// Hero 1.5: výpis odjetý pod skleněnou lištu, ať je sklo vidět (posun kolečkem nad obsahem).
const HERO = async (c, h) => {
  await c.wheel(Math.round(W * 0.55), Math.round(H * 0.6), 150, 6);
  await c.sleep(1200);
  await ICON(c, h);
  await c.sleep(1500);
};
const scenes = {
  "hero-dark": { run: HERO },
  "hero-light": { opts: { theme: "light" }, run: HERO },
  "split-view": {
    opts: { tabs: { active: 2, items: [TABS.items[0], TABS.items[1], panel("Projects", "column")] } },
    async run(c, h) {
      await h.clickEl("[data-path]", "website");
      await c.sleep(600);
      const panels = await c.evaluate("document.querySelectorAll('[data-view]').length");
      if (panels < 2) await h.ctrl("d", "KeyD", 68, true);
      await c.sleep(1200);
      // Klik do prázdna v pravém panelu ho aktivuje.
      await c.click(Math.round(W * 0.67), Math.round(H * 0.75));
      await c.sleep(400);
      await h.ctrl("l", "KeyL", 76);
      await c.sleep(400);
      await c.send("Input.insertText", { text: "C:\\Demo\\Photos\\Summer 2026" });
      await h.enter();
      await c.sleep(1200);
      await h.clickEl("button[role=radio]", "View as List");
      await c.sleep(1500);
    },
  },
  "command-palette": { async run(c, h) { await h.palette("dow"); await c.sleep(800); } },
  transparency: {
    opts: { theme: "dark", transparency: true, strength: "medium", style: "clear", emulate: false },
    // README: okno 1280×800 přes celý snímek; Store: okno 1600×900 na tapetě přes
    // celou obrazovku 1920×1080 (primární monitor, 100 %).
    real: STORE
      ? { win: { X: 160, Y: 90, W: 1600, H: 900 }, area: { X: 0, Y: 0, W: 1920, H: 1080 } }
      : { win: { X: 200, Y: 120, W: 1280, H: 800 } },
    async run(c) { await c.wheel(Math.round(W * 0.55), Math.round(H * 0.6), 150, 6); await c.sleep(1500); },
  },
  previews: {
    opts: { tabs: { active: 0, items: [panel("Videos", "column"), TABS.items[1], TABS.items[2]] } },
    async run(c, h) { await h.clickEl("[data-path]", "city-drive.mp4"); await c.sleep(2500); },
  },
};

for (const name of which) {
  const scene = scenes[name];
  const c = await setup(W, H, { ...scene.opts, scale: SCALE });
  const h = await helpers(c);
  if (scene.real) {
    const unstage = await stage(scene.real.win, scene.real.area);
    try {
      await announceFocus(c);
      await c.sleep(1500);
      try { await scene.run(c, h); } catch (e) { console.error(e.message); }
      // Kurzor myši CDP nehýbe — hover stavy bez kurzoru.
      await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
      await c.sleep(500);
      screen("shot", { ...(scene.real.area ?? scene.real.win), Out: `${OUT}${name}.png` });
    } finally {
      unstage();
    }
  } else {
    await c.sleep(1500);
    try { await scene.run(c, h); } catch (e) { console.error(e.message); }
    await c.shot(`${OUT}${name}.png`);
  }
  console.log("ok", name);
  c.close();
}
