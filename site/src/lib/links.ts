// Odkazy mimo web (repo dříve finder-win, GitHub starou adresu přesměruje).
export const REPO = "https://github.com/krystof2-ops/dirwise";

export const links = {
  repo: REPO,
  latest: `${REPO}/releases/latest`,
  releases: `${REPO}/releases`,
  changelog: `${REPO}/blob/master/CHANGELOG.md`,
  issues: `${REPO}/issues`,
  // Formuláře v .github/ISSUE_TEMPLATE – předvyplněná šablona.
  bugReport: `${REPO}/issues/new?template=bug_report.yml`,
  security: `${REPO}/security/advisories/new`,
  license: `${REPO}/blob/master/LICENSE`,
  store: "https://apps.microsoft.com/detail/9MZ67726S65X?mode=direct",
};

// Stránka ve Storu v jazyce webu (jako README.cs.md).
export const storeLink = (lang: string) =>
  lang === "cs" ? "https://apps.microsoft.com/detail/9MZ67726S65X?hl=cs-cz&gl=CZ&mode=direct" : links.store;

export const WINGET = "winget install krystof2-ops.Dirwise";

// Stránky webu: "" = úvod, jinak "privacy/", "support/", "ideas/". Base cesta z configure-pages (/dirwise/).
export type PagePath = "" | "privacy/" | "support/" | "ideas/";
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, "/");
export const pageHref = (lang: string, path: PagePath = "") => `${BASE}${lang === "cs" ? "cs/" : ""}${path}`;
