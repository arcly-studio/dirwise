// Odkazy mimo web. Repo zůstává krystof2-ops/finder-win do přejmenování (CLAUDE.md),
// GitHub pak starou adresu přesměruje; změní se jen REPO.
export const REPO = "https://github.com/krystof2-ops/finder-win";

export const links = {
  repo: REPO,
  latest: `${REPO}/releases/latest`,
  changelog: `${REPO}/blob/master/CHANGELOG.md`,
  privacy: `${REPO}/blob/master/PRIVACY.md`,
  issues: `${REPO}/issues`,
  license: `${REPO}/blob/master/LICENSE`,
  store: "https://apps.microsoft.com/detail/9MZ67726S65X?mode=direct",
};

// Stránka ve Storu v jazyce webu (jako README.cs.md).
export const storeLink = (lang: string) =>
  lang === "cs" ? "https://apps.microsoft.com/detail/9MZ67726S65X?hl=cs-cz&gl=CZ&mode=direct" : links.store;

export const WINGET = "winget install krystof2-ops.Dirwise";
