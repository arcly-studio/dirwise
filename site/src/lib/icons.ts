// Ikony lucide (stejná knihovna i verze jako aplikace) jako inline SVG – vykreslí se při buildu, bez JS.
import * as lucide from "lucide";

type IconNode = [tag: string, attrs: Record<string, string | number>][];

export function icon(name: keyof typeof lucide, size = 16, extra = ""): string {
  const node = lucide[name] as unknown as IconNode;
  if (!Array.isArray(node)) throw new Error(`lucide: ikona ${String(name)} neexistuje`);
  const children = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${children}</svg>`;
}
