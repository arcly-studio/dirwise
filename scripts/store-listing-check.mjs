// Kontrola textů pro Microsoft Store (docs/store-listing.md + docs/store-listing-i18n.md):
// délky polí podle limitů Partner Center a zakázaná slova (ochranná známka, pravidlo Store 10.1.3)
// i v přepisu do azbuky, čínštiny a korejštiny.
//   node scripts/store-listing-check.mjs          – jen kontrola, při chybě exit 1
//   node scripts/store-listing-check.mjs --write  – navíc zapíše počty znaků do nadpisů v store-listing-i18n.md
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FILES = ["docs/store-listing.md", "docs/store-listing-i18n.md"];
const I18N = "docs/store-listing-i18n.md";
const WRITE = process.argv.includes("--write");

// Limity Partner Center (learn.microsoft.com, ověřeno 2. 11. 2026). `own` = vlastní přísnější rezerva.
const LIMITS = {
  short: { max: 1000, own: 100 },
  desc: { max: 10000 },
  news: { max: 1500 },
  feature: { max: 200, count: 20 },
  keyword: { max: 40, own: 30, count: 7, words: 21 },
};

// Nadpis pole → typ (anglicky i česky; počty za „ — “ nebo „(“ se ignorují).
const FIELDS = [
  ["name", /^(Product name|Název produktu)\b/],
  ["short", /^(Short description|Krátký popis)\b/],
  ["desc", /^(Description|Popis)\b/],
  ["news", /^(What's new|Novinky)\b/],
  ["features", /^(Features|Funkce)\b/],
  ["keywords", /^(Keywords|Klíčová slova)\b/],
];

// Zakázaná slova. Latinka a azbuka s hranicí slova (písmeno před/za), CJK a korejština jako podřetězec.
const WORD = [
  "Finder", "macOS", "Mac", "Mac OS", "MacBook", "Macintosh", "Quick Look", "QuickLook", "Explorer", "Apple",
  "Финдер", "Файндер", "Мак", "Макинтош", "МакОС", "Мак ОС", "Макбук", "Эппл", "Эпл", "Квик Лук", "Быстрый просмотр",
  "Проводник", "Експлорер", "Эксплорер", "Швидкий перегляд", "Провідник", "Епл",
];
const SUBSTR = [
  "访达", "訪達", "苹果", "蘋果", "麦金塔", "麥金塔", "麦克", "快速查看", "快速查閱", "资源管理器", "資源管理器", "檔案總管",
  "파인더", "맥", "매킨토시", "애플", "퀵룩", "퀵 룩", "훑어보기", "탐색기",
];
// Azbuka se skloňuje: krátké „Мак“ jen s pádovými koncovkami (ne „макет“), delší kmeny s libovolnou koncovkou.
const ending = (w) =>
  /^[\p{Script=Cyrillic} ]+$/u.test(w) ? (w === "Мак" ? "(?:а|е|у|ом|ах|ам|ов|и)?" : "\\p{L}{0,3}") : "";
const FORBIDDEN = [
  ...WORD.map((w) => [w, new RegExp(`(?<!\\p{L})${w.replace(/ /g, "\\s+")}${ending(w)}(?!\\p{L})`, "iu")]),
  ...SUBSTR.map((w) => [w, new RegExp(w.replace(/ /g, "\\s*"), "u")]),
];

const len = (s) => [...s].length;
const errors = [];
const report = [];

function parse(file) {
  const lines = readFileSync(ROOT + file, "utf8").split("\n");
  const sections = [];
  let lang = null;
  let field = null;
  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      lang = { name: line.slice(3).trim(), fields: [] };
      sections.push(lang);
      field = null;
    } else if (line.startsWith("### ") && lang) {
      const title = line.slice(4).trim();
      const kind = FIELDS.find(([, re]) => re.test(title))?.[0] ?? null;
      field = { kind, title, line: i, body: [] };
      lang.fields.push(field);
    } else if (line.startsWith("---")) {
      field = null;
    } else if (field && !line.startsWith(">")) {
      field.body.push({ text: line, line: i });
    }
  });
  return { lines, sections };
}

function check(file) {
  const { lines, sections } = parse(file);
  for (const lang of sections) {
    for (const f of lang.fields) {
      const text = f.body.map((b) => b.text).join("\n").trim();
      const where = `${file} · ${lang.name} · ${f.title.replace(/\s+[—(].*$/, "")}`;
      // Zakázaná slova v celém poli.
      for (const b of f.body) {
        for (const [w, re] of FORBIDDEN) {
          if (re.test(b.text)) errors.push(`${where} (ř. ${b.line + 1}): zakázané slovo „${w}“`);
        }
      }
      let note = "";
      const over = (n, max, what) => {
        if (n > max) errors.push(`${where}: ${what} ${n} > ${max}`);
      };
      switch (f.kind) {
        case "name":
          if (text !== "Dirwise") errors.push(`${where}: název musí být „Dirwise“, je „${text}“`);
          note = `${len(text)} znaků`;
          break;
        case "short":
          over(len(text), LIMITS.short.own, "znaků");
          note = `${len(text)} / ${LIMITS.short.own} znaků (limit ${LIMITS.short.max})`;
          break;
        case "desc":
          over(len(text), LIMITS.desc.max, "znaků");
          note = `${len(text)} / ${LIMITS.desc.max} znaků`;
          break;
        case "news":
          over(len(text), LIMITS.news.max, "znaků");
          note = `${len(text)} / ${LIMITS.news.max} znaků`;
          break;
        case "features": {
          const items = f.body.map((b) => b.text.match(/^\d+\.\s+(.*)$/)?.[1]).filter(Boolean);
          over(items.length, LIMITS.feature.count, "položek");
          items.forEach((it, i) => over(len(it), LIMITS.feature.max, `položka ${i + 1}: znaků`));
          const longest = Math.max(...items.map(len));
          note = `${items.length} / ${LIMITS.feature.count} položek, nejdelší ${longest} / ${LIMITS.feature.max} znaků`;
          break;
        }
        case "keywords": {
          const kws = text.split(/\s*[,，、]\s*/).filter(Boolean);
          const words = kws.reduce((n, k) => n + k.split(/\s+/).length, 0);
          over(kws.length, LIMITS.keyword.count, "klíčových slov");
          kws.forEach((k) => over(len(k), LIMITS.keyword.own, `„${k}“: znaků`));
          over(words, LIMITS.keyword.words, "slov celkem");
          const longest = Math.max(...kws.map(len));
          note = `${kws.length} / ${LIMITS.keyword.count}, nejdelší ${longest} / ${LIMITS.keyword.max} znaků, ${words} / ${LIMITS.keyword.words} slov`;
          break;
        }
        default:
          errors.push(`${where}: neznámé pole`);
      }
      report.push(`${where.padEnd(64)} ${note}`);
      if (WRITE && file === I18N && f.kind) {
        const base = f.title.replace(/\s+—.*$/, "");
        lines[f.line] = `### ${base} — ${note}`;
      }
    }
  }
  if (WRITE && file === I18N) writeFileSync(ROOT + file, lines.join("\n"));
}

FILES.forEach(check);
console.log(report.join("\n"));
if (errors.length) {
  console.error(`\n${errors.length} chyb:\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`\nOK – limity i zakázaná slova v pořádku${WRITE ? `, počty zapsány do ${I18N}` : ""}.`);
