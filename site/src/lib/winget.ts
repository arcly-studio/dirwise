// Stav balíčku krystof2-ops.Dirwise ve winget – jediné místo pro web.
// "auto" = při buildu se zeptá GitHubu, jestli v microsoft/winget-pkgs existuje složka manifestu
// (objeví se až po sloučení PR); "available" / "pending" = ruční přepnutí, kdyby kontrola zlobila.
// README přepíná scripts/winget-status.mjs (stejná kontrola, řádky mezi značkami <!-- winget -->).
export const WINGET_STATUS: "auto" | "available" | "pending" = "auto";

const MANIFESTS = "https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/k/krystof2-ops/Dirwise";

let cached: Promise<boolean> | null = null;

/** true = balíček je ve winget-pkgs (štítek „coming soon“ pryč, věta v FAQ). */
export function wingetAvailable(): Promise<boolean> {
  cached ??= check();
  return cached;
}

async function check(): Promise<boolean> {
  if (WINGET_STATUS !== "auto") return WINGET_STATUS === "available";
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(MANIFESTS, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const entries = (await res.json()) as { type: string }[];
    // Složka s aspoň jednou verzí (podsložka 1.6.0 …).
    return Array.isArray(entries) && entries.some((e) => e.type === "dir");
  } catch (err) {
    // Bez odpovědi radši „coming soon“ než slib, který nemusí platit.
    console.warn(`winget: ${(err as Error).message} – zobrazí se „coming soon“`);
    return false;
  }
}
