// Po buildu: v HTML webu nesmí být „Finder“, „macOS“, „Quick Look“, „Explorer“ ani „Průzkumník“
// (pravidla Storu, CLAUDE.md) – bez výjimek, web je odkazovaný ze Store listingu.
// Adresy (href, src, content s URL) se nekontrolují, stejně jako interní identifier aplikace
// com.krystof2ops.finderwin v cestách k datům (Soukromí) – záměrně se nemění (CLAUDE.md).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const FORBIDDEN = /finder|macos|quick\s*look|explorer|průzkumník/gi;

const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".html")) files.push(p);
  }
};
walk(dist);
if (files.length === 0) throw new Error("check-words: v dist/ není žádné HTML");

let errors = 0;
for (const file of files) {
  const rel = path.relative(dist, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8").replace(/https?:\/\/[^\s"'<>)]+/g, "").replace(/com\.krystof2ops\.finderwin\b/g, "");
  for (const m of html.matchAll(FORBIDDEN)) {
    console.error(`${rel}: zakázané slovo „${m[0]}“ … ${html.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ")}`);
    errors++;
  }
}
if (errors > 0) process.exit(1);
console.log(`check-words: ${files.length} HTML bez zakázaných slov`);
