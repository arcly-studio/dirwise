// Přepne řádky o wingetu v README.md a README.cs.md (mezi značkami <!-- winget:… --> … <!-- /winget -->).
// Bez argumentu se zeptá GitHubu, jestli je krystof2-ops.Dirwise v microsoft/winget-pkgs (stejná kontrola
// jako web, site/src/lib/winget.ts); `available` / `pending` stav vynutí. Commit README spustí i nasazení webu.
import fs from "fs";
import { fileURLToPath } from "url";

const MANIFESTS = "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/k/krystof2-ops/Dirwise";
const CMD = "`winget install krystof2-ops.Dirwise`";

const TEXT = {
  "README.md": {
    available: { hero: `or: ${CMD}`, install: `Install with winget: ${CMD}` },
    pending: {
      hero: `or: ${CMD} *(coming soon)*`,
      install: `Also coming: **winget** (${CMD}; the manifest is in [\`winget/\`](winget)).`,
    },
  },
  "README.cs.md": {
    available: { hero: `nebo: ${CMD}`, install: `Instalace přes winget: ${CMD}` },
    pending: {
      hero: `nebo: ${CMD} *(brzy)*`,
      install: `Připravujeme: **winget** (${CMD}; manifest je ve složce [\`winget/\`](winget)).`,
    },
  },
};

async function available() {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(MANIFESTS, { headers, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`GitHub API ${res.status} – stav zadej ručně (available / pending)`);
  return (await res.json()).some((e) => e.type === "dir");
}

const arg = process.argv[2];
if (arg && arg !== "available" && arg !== "pending") throw new Error("použití: node scripts/winget-status.mjs [available|pending]");
const state = arg ?? ((await available()) ? "available" : "pending");

for (const [file, texts] of Object.entries(TEXT)) {
  const p = fileURLToPath(new URL(`../${file}`, import.meta.url));
  const src = fs.readFileSync(p, "utf8");
  let found = 0;
  const out = src.replace(/<!-- winget:(hero|install) -->[^\n]*?<!-- \/winget -->/g, (_, key) => {
    found++;
    return `<!-- winget:${key} -->${texts[state][key]}<!-- /winget -->`;
  });
  if (found !== 2) throw new Error(`${file}: čekám 2 značky winget, nalezeno ${found}`);
  if (out !== src) fs.writeFileSync(p, out);
  console.log(`${file}: winget ${state}${out === src ? " (beze změny)" : ""}`);
}
