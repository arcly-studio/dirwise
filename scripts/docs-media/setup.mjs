// Namapuje standardní složky na C:\Demo (bez jména uživatele), zahodí cloud sekci a z jednotek nechá jen
// místní disky (telefony, USB a síťové jednotky tohohle počítače se v záběrech neukážou),
// podvrhne typy menu + New, nastaví viewport a znovu načte stránku. Patch žije jen po dobu CDP session.
// Koš: výpis i počet jen z položek, které pocházejí z C:\Demo – skutečný obsah Koše se nikde neukáže.
// Předpoklad: složky z docs/demo zkopírované do C:\Demo a běžící dev s CDP na portu 9333.
import { connect } from "./cdp.mjs";

const MAP = {
  desktop: "C:\\Demo", downloads: "C:\\Demo\\Downloads", documents: "C:\\Demo\\Documents",
  pictures: "C:\\Demo\\Photos", music: "C:\\Demo\\Music", videos: "C:\\Demo\\Videos", home: "C:\\Demo",
};
// Menu + New: neutrální anglický seznam místo typů z registru tohohle počítače.
const SHELL_NEW = [
  { extension: ".docx", name: "Microsoft Word Document", itemName: null },
  { extension: ".xlsx", name: "Microsoft Excel Worksheet", itemName: null },
  { extension: ".pptx", name: "Microsoft PowerPoint Presentation", itemName: null },
  { extension: ".zip", name: "Compressed (zipped) Folder", itemName: "New Compressed (zipped) Folder" },
];
const patch = `(() => {
  const MAP = ${JSON.stringify(MAP)};
  const SHELL_NEW = ${JSON.stringify(SHELL_NEW)};
  const of = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const res = await of(input, init);
    if (url.startsWith("http://ipc.localhost/list_recycle_bin") && res.ok) {
      const items = (await res.json()).filter((i) => /^C:\\\\Demo(\\\\|$)/i.test(i.original_dir));
      window.__demoTrash = items;
      return new Response(JSON.stringify(items), { status: res.status, headers: res.headers });
    }
    if (url.startsWith("http://ipc.localhost/recycle_bin_state") && res.ok) {
      const items = window.__demoTrash ?? [];
      const state = { count: items.length, size: items.reduce((a, i) => a + i.size, 0) };
      return new Response(JSON.stringify(state), { status: res.status, headers: res.headers });
    }
    if (url.startsWith("http://ipc.localhost/list_shell_new") && res.ok) {
      return new Response(JSON.stringify(SHELL_NEW), { status: res.status, headers: res.headers });
    }
    if (!url.startsWith("http://ipc.localhost/get_favorites") || !res.ok) return res;
    const r = await res.json();
    const out = r.filter((s) => s.id !== "cloud").map((s) => ({ ...s,
      items: s.items.filter((i) => s.id !== "devices" || i.kind === "local")
        .map((i) => (i.id && MAP[i.id] ? { ...i, path: MAP[i.id] } : i)) }));
    return new Response(JSON.stringify(out), { status: res.status, headers: res.headers });
  };
  window.__demoPatched = true;
})();`;

export const panel = (v, view) => ({ path: "C:\\Demo\\" + v, view, sortKey: "name", sortDirection: "asc" });
export const TABS = { active: 0, items: [panel("Photos\\Summer 2026", "icon"), panel("Documents", "list"), panel("Projects", "column")] };

export async function setup(width = 1280, height = 800, { theme = "dark", language = "en", tabs = TABS, transparency = false, strength = "medium", scale = 1, emulate = true } = {}) {
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
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: patch });
  // emulate: false = skutečné okno (snímání obrazovky), velikost dá screen.ps1.
  if (emulate) await c.size(width, height, scale);
  await c.send("Page.reload", { ignoreCache: false });
  await c.sleep(4000);
  return c;
}

if (process.argv[1].endsWith("setup.mjs")) {
  const c = await setup();
  console.log(await c.evaluate("innerWidth + 'x' + innerHeight + ' patched=' + !!window.__demoPatched"));
  c.close();
}
