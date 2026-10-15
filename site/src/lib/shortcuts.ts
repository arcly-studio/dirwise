// Klávesové zkratky se berou z README (jediný zdroj): první tabulka v sekci = hlavní,
// další (v <details>) = všechny. Buňky jsou Markdown jen s `kódem` → <kbd>.
import fs from "fs";
import path from "path";
import type { Lang } from "../i18n/texts";

export type Row = [keys: string, action: string];

const SOURCE: Record<Lang, { file: string; heading: string }> = {
  en: { file: "README.md", heading: "## Keyboard shortcuts" },
  cs: { file: "README.cs.md", heading: "## Klávesové zkratky" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cell = (s: string) => esc(s.trim()).replace(/`([^`]+)`/g, "<kbd>$1</kbd>");

export function shortcuts(lang: Lang): { main: Row[]; all: Row[] } {
  const { file, heading } = SOURCE[lang];
  // Kořen repa dává astro.config.mjs (__REPO_ROOT__) – nezávisle na adresáři, odkud běží build.
  const md = fs.readFileSync(path.join(__REPO_ROOT__, file), "utf8").replace(/\r\n/g, "\n");
  const start = md.indexOf(heading + "\n");
  if (start < 0) throw new Error(`${file}: chybí sekce ${heading}`);
  const end = md.indexOf("\n## ", start + heading.length);
  const section = md.slice(start, end < 0 ? undefined : end);

  const tables: Row[][] = [];
  let current: Row[] | null = null;
  for (const raw of section.split("\n")) {
    const line = raw.trimEnd();
    if (!line.startsWith("|")) { current = null; continue; }
    if (!current) { current = []; tables.push(current); continue; } // řádek záhlaví
    if (/^\|[\s|:-]+\|$/.test(line)) continue; // oddělovač |---|---|
    const cells = line.slice(1, -1).split("|");
    if (cells.length !== 2) throw new Error(`${file}: v tabulce zkratek čekám 2 sloupce (bez \| v buňkách): ${line}`);
    current.push([cell(cells[0]), cell(cells[1])]);
  }
  if (tables.length < 2) throw new Error(`${file}: čekám 2 tabulky zkratek, je ${tables.length}`);
  return { main: tables[0], all: tables[1] };
}
