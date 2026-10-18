# Web Dirwise

Jednostránkový web (Astro, statický výstup) pro GitHub Pages. Angličtina na `/`, čeština na `/cs/`.

```sh
cd site
npm ci
npm run dev       # http://localhost:4321/dirwise/
npm run build     # dist/ + kontrola zakázaných slov (scripts/check-words.mjs)
npm run preview   # servíruje dist/
```

- Texty: `src/i18n/texts.ts`, texty živé ukázky okna `src/i18n/demo.ts` (shodné s UI aplikace). Klávesové zkratky se berou z `README.md` / `README.cs.md` (sekce Keyboard shortcuts / Klávesové zkratky), screenshoty přímo z `docs/screenshots/`, ikona z `app-icon.png`.
- `scripts/prepare.mjs` (spouští se před dev i build) zkopíruje `docs/brand/github-social.png` jako `public/og.png`, vyrobí favicony, hvězdné pole `public/media/stars.svg` (pevný seed) a podmnožinu písma `public/fonts/inter-cs.woff2` (jen Č Ď Ě Ň Ř Š Ť Ů Ž přes `subset-font`, ~6 kB místo 83 kB latin-ext) – tyto soubory nejsou v gitu.
- Živá ukázka (`src/components/LiveDemo.astro` + `src/styles/demo.css`): okno v HTML/CSS, stav v data-atributech `.dw` (loc, c1, c2, pal), smyčka ~10 s v malém skriptu, běží jen na obrazovce; s `prefers-reduced-motion` statický stav. Ikony z `lucide` (stejná verze jako aplikace) se vykreslí při buildu (`src/lib/icons.ts`).
- Řádek pod tlačítky (`src/lib/release.ts`): verze a velikost instalátoru z posledního vydání (GitHub API `releases/latest`, asset `Dirwise_<verze>_x64-setup.exe`, při buildu; v CI s `GITHUB_TOKEN`); bez sítě verze z `package.json` a velikost z `src-tauri/target/release/bundle/nsis/`; jinak se velikost nezobrazí. Po vydání spustit `gh workflow run pages.yml` (trigger na release nejde – github-pages nasazuje jen z výchozí větve).
- Živá ukázka má tlačítko pozastavení (WCAG 2.2.2) mimo `role="img"`; reaguje i na změnu „omezit pohyb“ za běhu.
- Karty funkcí: výřezy skutečných screenshotů – `focus`/`zoom` v `Page.astro` (CSS `object-position` + `transform`).
- `public/media/dirwise-demo.mp4` = demo video (H.264, `+faststart`, bez zvuku); načítá se až při doscrollování.
- `public/media/store-badge-{en,cs}.svg` = oficiální odznaky z `get.microsoft.com/images/` uložené lokálně (web nedělá požadavky na cizí servery).
- Nápady (`/ideas/`, `/cs/ideas/`, `src/components/Ideas.astro`): seznam z GitHub Discussions (kategorie Ideas) seřazený podle hlasů – při buildu přes GraphQL (`src/lib/ideas.ts`), potřebuje `GITHUB_TOKEN` (v CI `discussions: read`, lokálně `GITHUB_TOKEN=$(gh auth token) npm run build`); lokálně se bez tokenu nebo při chybě stránka sestaví bez seznamu, v CI se chyba 3× zopakuje a pak build selže (denní cron tak nepřepíše nasazený seznam prázdným). Uzavřené diskuse a úvodní příspěvek #15 (`WELCOME_DISCUSSION`) se vynechávají. giscus (mapping `number` = #15, téma `transparent_dark`, jazyk podle stránky) se načte až po kliknutí na „Load comments“ – jediné místo, kde web načítá něco z cizích serverů (popsané na stránce Soukromí). Workflow běží i denně (cron), aby se seznam obnovoval.
- Pravidla textů jako v aplikaci: žádné „Finder“, „macOS“, „Quick Look“, „Explorer“ / „Průzkumník“, bez výjimek (web je odkazovaný ze Store listingu; věta „inspired by the macOS Finder“ smí být jen v README). Build to hlídá.
- Bez cookies, trackerů a analytiky. Stránka v prohlížeči nedělá požadavky mimo vlastní doménu (síťové požadavky jsou jen při buildu na GitHub API) – výjimkou je giscus na stránce nápadů, a to až po kliknutí.

## Nasazení

Workflow `.github/workflows/pages.yml` (denně v 4:17 UTC, push do master při změně `site/`, `docs/screenshots/`, `docs/brand/`, README nebo ikony aplikace – jen s proměnnou `PAGES_ENABLED=true`; ručně přes workflow_dispatch). Adresa a base cesta se berou z `actions/configure-pages` (`SITE_URL`, `BASE_PATH`) – lokálně výchozí `https://krystof2-ops.github.io` + `/dirwise`.

Jednorázově zapnout Pages se zdrojem GitHub Actions a povolit nasazení při pushi (bez proměnné workflow na push nic nedělá):

```sh
gh api -X POST repos/krystof2-ops/dirwise/pages -f build_type=workflow
gh variable set PAGES_ENABLED --body true
gh workflow run pages.yml
```

`robots.txt` se generuje, ale na projektových Pages (`…github.io/dirwise/`) ho vyhledávače nečtou – platí jen v kořeni hostu. Sitemapu najdou přes `<link rel="sitemap">` nebo po odeslání v Search Console; s vlastní doménou je `robots.txt` v kořeni a funguje.

## Vlastní doména (zatím nenastavená)

U nasazení přes Actions se soubor `CNAME` nepoužívá – doména se nastavuje v repu a web se jí přizpůsobí sám (configure-pages pak vrátí prázdnou base cestu).

1. DNS: apex doména → záznamy `A` na `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (+ `AAAA` `2606:50c0:8000::153` … `8003::153`); subdoména `www` → `CNAME` na `krystof2-ops.github.io`.
2. `gh api -X PUT repos/krystof2-ops/dirwise/pages -f cname=<doména>` (nebo Settings → Pages → Custom domain), doménu ověřit v nastavení účtu (Settings → Pages → Verified domains).
3. Po vydání certifikátu: `gh api -X PUT repos/krystof2-ops/dirwise/pages -F https_enforced=true`.
4. Spustit workflow znovu (workflow_dispatch) – canonical, hreflang, sitemap a OG odkazy se přegenerují na novou adresu.
