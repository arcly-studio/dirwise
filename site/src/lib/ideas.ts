// Nápady z GitHub Discussions (kategorie Ideas) pro stránku /ideas/ – při buildu, ne v prohlížeči.
// GraphQL API vyžaduje token: v CI GITHUB_TOKEN (workflow má discussions: read), lokálně třeba
// GITHUB_TOKEN=$(gh auth token). Lokálně bez tokenu nebo při chybě vrátí null a stránka se sestaví bez seznamu;
// v CI se chyba 3× zopakuje a pak build selže – denní cron tak nepřepíše nasazený seznam prázdnou stránkou.
import { REPO } from "./links";

// Úvodní příspěvek v Ideas: na něj míří giscus (mapping „number“) a ze seznamu se vynechává.
export const WELCOME_DISCUSSION = 15;

// giscus: ID repa a kategorie Ideas (z GraphQL, nemění se).
export const GISCUS = {
  repo: "arcly-studio/dirwise",
  repoId: "R_kgDOT1fFWw",
  category: "Ideas",
  categoryId: "DIC_kwDOT1fFW84DI5oa",
};

export const NEW_IDEA = `${REPO}/discussions/new?category=ideas`;
export const ALL_IDEAS = `${REPO}/discussions/categories/ideas`;

export type Idea = { number: number; title: string; url: string; votes: number; comments: number };

const QUERY = `query($cat: ID!, $after: String) {
  repository(owner: "arcly-studio", name: "dirwise") {
    discussions(first: 100, after: $after, categoryId: $cat) {
      pageInfo { hasNextPage endCursor }
      nodes { number title url upvoteCount closed comments { totalCount } }
    }
  }
}`;

type Page = {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: { number: number; title: string; url: string; upvoteCount: number; closed: boolean; comments: { totalCount: number } }[];
};

let cached: Promise<Idea[] | null> | null = null;

/** Otevřené nápady podle hlasů (pak podle komentářů); null = data nejsou k dispozici. */
export function ideas(): Promise<Idea[] | null> {
  cached ??= load();
  return cached;
}

const CI = !!process.env.CI;

async function load(): Promise<Idea[] | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    if (CI) throw new Error("ideas: v CI chybí GITHUB_TOKEN");
    console.warn("ideas: chybí GITHUB_TOKEN – stránka nápadů bez seznamu");
    return null;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchAll(token);
    } catch (err) {
      const msg = (err as Error).message;
      if (!CI) {
        console.warn(`ideas: ${msg} – stránka nápadů bez seznamu`);
        return null;
      }
      if (attempt >= 3) throw new Error(`ideas: ${msg} (3 pokusy) – build se zastaví, nasazený web zůstane`);
      console.warn(`ideas: ${msg} – pokus ${attempt + 1} za ${attempt * 5} s`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

async function fetchAll(token: string): Promise<Idea[]> {
  const list: Idea[] = [];
  let after: string | null = null;
  // Pojistka proti nekonečné smyčce: nejvýš 10 stránek (1000 nápadů).
  for (let i = 0; i < 10; i++) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { cat: GISCUS.categoryId, after } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const json = (await res.json()) as { data?: { repository: { discussions: Page } }; errors?: { message: string }[] };
    if (json.errors?.length || !json.data) throw new Error(json.errors?.[0]?.message ?? "prázdná odpověď");
    const page = json.data.repository.discussions;
    for (const d of page.nodes) {
      // Uzavřené nápady (hotové / zamítnuté) a úvodní příspěvek se nevypisují.
      if (d.closed || d.number === WELCOME_DISCUSSION) continue;
      list.push({ number: d.number, title: d.title, url: d.url, votes: d.upvoteCount, comments: d.comments.totalCount });
    }
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return list.sort((a, b) => b.votes - a.votes || b.comments - a.comments || b.number - a.number);
}
