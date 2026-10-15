# Web Dirwise

Jednostránkový web (Astro, statický výstup) pro GitHub Pages. Angličtina na `/`, čeština na `/cs/`.

```sh
cd site
npm ci
npm run dev       # http://localhost:4321/dirwise/
npm run build     # dist/ + kontrola zakázaných slov (scripts/check-words.mjs)
npm run preview   # servíruje dist/
```

- Texty: `src/i18n/texts.ts`. Klávesové zkratky se berou z `README.md` / `README.cs.md` (sekce Keyboard shortcuts / Klávesové zkratky), screenshoty přímo z `docs/screenshots/`, ikona z `app-icon.png`.
- `scripts/prepare.mjs` (spouští se před dev i build) zkopíruje `docs/brand/github-social.png` jako `public/og.png` a vyrobí favicony – tyto soubory nejsou v gitu.
- `public/media/dirwise-demo.mp4` = demo video (H.264, `+faststart`, bez zvuku); načítá se až při doscrollování.
- `public/media/store-badge-{en,cs}.svg` = oficiální odznaky z `get.microsoft.com/images/` uložené lokálně (web nedělá požadavky na cizí servery).
- Pravidla textů jako v aplikaci: žádné „Finder“, „macOS“, „Quick Look“, „Explorer“ / „Průzkumník“; jediná výjimka je věta „Inspired by the macOS Finder, built for Windows.“ v angličtině. Build to hlídá.
- Bez cookies, trackerů a analytiky.

## Nasazení

Workflow `.github/workflows/pages.yml` (push do master při změně `site/`, `docs/screenshots/`, `docs/brand/`, README nebo ikony aplikace – jen s proměnnou `PAGES_ENABLED=true`; ručně přes workflow_dispatch). Adresa a base cesta se berou z `actions/configure-pages` (`SITE_URL`, `BASE_PATH`) – lokálně výchozí `https://krystof2-ops.github.io` + `/dirwise`.

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
