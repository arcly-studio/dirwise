// Po buildu: v HTML webu nesmí být „Finder“, „macOS“, „Quick Look“, „Explorer“ ani „Průzkumník“
// (pravidla Storu, CLAUDE.md). Výjimka: jediná věta „inspired by the macOS Finder“ v angličtině (/).
// Adresy (href, src, content s URL) se nekontrolují.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const FORBIDDEN = /finder|macos|quick\s*look|explorer|průzkumník/gi;
const ALLOWED = /inspired by the macOS Finder/gi;

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
let allowedTotal = 0;
for (const file of files) {
  const rel = path.relative(dist, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8").replace(/https?:\/\/[^\s"'<>)]+/g, "");
  const allowed = html.match(ALLOWED)?.length ?? 0;
  allowedTotal += allowed;
  if (allowed > 0 && rel !== "index.html") {
    console.error(`${rel}: věta „inspired by the macOS Finder“ smí být jen v anglické verzi`);
    errors++;
  }
  const rest = html.replace(ALLOWED, "");
  for (const m of rest.matchAll(FORBIDDEN)) {
    console.error(`${rel}: zakázané slovo „${m[0]}“ … ${rest.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ")}`);
    errors++;
  }
}
if (allowedTotal > 1) {
  console.error(`věta „inspired by the macOS Finder“ je na webu ${allowedTotal}×, smí být nanejvýš jednou`);
  errors++;
}
if (errors > 0) process.exit(1);
console.log(`check-words: ${files.length} HTML bez zakázaných slov`);
