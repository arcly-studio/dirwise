// Výchozí stav demo prostředí: záložky, téma, jazyk, průhlednost, viewport a reload.
// Náhradu cest (standardní složky → C:\Demo, Koš jen z C:\Demo, typy menu + New) i pojistku
// vkládá connect() z cdp.mjs do každého načtení stránky – viz CLAUDE.md, Screenshoty a demo.
// Předpoklad: složky z docs/demo zkopírované do C:\Demo a běžící dev s demo-conf.json a CDP na 9333.
import { connect } from "./cdp.mjs";

export const panel = (v, view) => ({ path: "C:\\Demo\\" + v, view, sortKey: "name", sortDirection: "asc" });
export const TABS = { active: 0, items: [panel("Photos\\Summer 2026", "icon"), panel("Documents", "list"), panel("Projects", "column")] };

export async function setup(width = 1280, height = 800, { theme = "dark", language = "en", tabs = TABS, transparency = false, strength = "medium", scale = 1, emulate = true } = {}) {
  // Pojistka (CLAUDE.md): záložky jen pod C:\Demo; identifier, náhradu cest a výpis hlídá connect().
  const panels = tabs.items.flatMap((tab) => [tab, tab.second].filter(Boolean));
  const outside = panels.find((p) => !/^C:\\Demo(\\|$)/i.test(p.path));
  if (outside) {
    console.error(`POJISTKA DEMO: záložka mimo C:\\Demo (${outside.path}) – skript končí.`);
    process.exit(3);
  }
  const c = await connect();
  await c.send("Page.enable");
  // Výchozí stav (záložky, téma, jazyk, průhlednost) přes modul storage z vite dev serveru.
  await c.evaluate(`import("/src/lib/storage.ts").then(async (s) => {
    await s.setSavedTabs(${JSON.stringify(tabs)});
    await s.setTheme(${JSON.stringify(theme)});
    await s.setLanguage(${JSON.stringify(language)});
    await s.setTransparencyStrength(${JSON.stringify(strength)});
    await s.setWindowTransparency(${JSON.stringify(transparency)});
    window.onbeforeunload = null;
    return true;
  })`);
  // emulate: false = skutečné okno (snímání obrazovky), velikost dá screen.ps1.
  if (emulate) await c.size(width, height, scale);
  // Náhradu cest vloží connect() do nového načtení; po reloadu send() sám ověří, že platí
  // a výpis je v C:\Demo (jinak exit 3).
  await c.send("Page.reload", { ignoreCache: false });
  await c.sleep(4000);
  await c.assertDemo();
  return c;
}

if (process.argv[1].endsWith("setup.mjs")) {
  const c = await setup();
  console.log(await c.evaluate("innerWidth + 'x' + innerHeight + ' patched=' + !!window.__demoPatched"));
  c.close();
}
