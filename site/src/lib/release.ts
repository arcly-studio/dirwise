// Verze a velikost instalátoru pro řádek pod tlačítky – při buildu, ne v prohlížeči.
// Z posledního vydání na GitHubu (stejné, na které vede „Download installer“ = releases/latest):
// tag vX.Y.Z a asset Dirwise_X.Y.Z_x64-setup.exe. Bez sítě verze z package.json a velikost
// z lokálního bundle/nsis. Když velikost není známá, nezobrazí se (nic se nevymýšlí).
import fs from "fs";
import path from "path";

export type Release = { version: string; bytes: number | null };

const API = "https://api.github.com/repos/krystof2-ops/dirwise/releases/latest";

// MB jako ve Windows (1024²), s desetinnou čárkou/tečkou podle jazyka.
export const formatSize = (bytes: number, lang: string) =>
  `${(bytes / 1024 / 1024).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;

let cached: Promise<Release> | null = null;

export function release(): Promise<Release> {
  cached ??= load();
  return cached;
}

async function load(): Promise<Release> {
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(API, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = (await res.json()) as { tag_name: string; assets: { name: string; size: number }[] };
    const version = data.tag_name.replace(/^v/, "");
    const found = data.assets.find((a) => a.name === `Dirwise_${version}_x64-setup.exe`);
    if (!found) console.warn(`release: ve vydání v${version} chybí instalátor – velikost se nezobrazí`);
    return { version, bytes: found?.size ?? null };
  } catch (err) {
    console.warn(`release: ${(err as Error).message} – verze z package.json, velikost z lokálního buildu`);
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(__REPO_ROOT__, "package.json"), "utf8"));
  const version: string = pkg.version;
  const local = path.join(__REPO_ROOT__, "src-tauri/target/release/bundle/nsis", `Dirwise_${version}_x64-setup.exe`);
  if (fs.existsSync(local)) return { version, bytes: fs.statSync(local).size };
  console.warn(`release: velikost instalátoru ${version} neznámá – na webu se nezobrazí`);
  return { version, bytes: null };
}
