# Dirwise – kontext projektu

Stav k 27. 10. 2026: verze **1.6.1**, větev `master`, poslední commit `9f0555e`.

Tenhle soubor je přehled celého projektu na jednom místě: co aplikace umí, jak je postavená, kde co leží a jak se vydává. Závazná pravidla práce a známé pasti jsou v [CLAUDE.md](CLAUDE.md). Při rozporu platí CLAUDE.md a kód.

---

## 1. Co to je

**Dirwise** je zdarma a open source správce souborů pro Windows 10/11 (x64). Umí sloupcové zobrazení s náhledem, záložky, rozdělené okno, okamžitý náhled mezerníkem a paletu příkazů Ctrl+K.

Má instalátor do 3 MB, instaluje se jen pro uživatele bez práv správce. Nemá účet ani telemetrii; jediný síťový požadavek je denní kontrola verze na GitHub API, a ve verzi ze Storu ani ten ne.

| | |
|---|---|
| Vydavatel | Arcly Studio (do 1.6.0 „krystof2-ops“) |
| Licence | MIT, „Copyright (c) 2026 krystof2-ops“ – držitel se záměrně nemění |
| Repo | https://github.com/arcly-studio/dirwise (dřív `krystof2-ops/finder-win` → `krystof2-ops/dirwise`, GitHub přesměruje) |
| Web | https://arcly-studio.github.io/dirwise/ (en `/`, cs `/cs/`) |
| Microsoft Store | ID `9MZ67726S65X` |
| winget | `krystof2-ops.Dirwise` (README zatím ukazuje „coming soon“) |
| Binárka / proces | `dirwise.exe` (Cargo balíček `dirwise`) |
| Původní název | Finder-Win (do 1.5.2); složka repa se pořád jmenuje `finder-win` |
| Jazyky UI | čeština, angličtina |

Projekt vyvíjí jeden člověk s pomocí AI (Claude Code). Postup je po fázích, commity „Fáze N.x: …“ a vydání „Release X.Y.Z“.

---

## 2. Rychlá orientace

| Oblast | Kde |
|---|---|
| Hlavní stav a operace UI | `src/App.tsx` (~3 500 ř.) |
| Stav jednoho panelu | `src/panel.ts` (`usePanel`, volá se 2× kvůli rozdělenému oknu) |
| Registr příkazů a zkratek | `src/commands.ts` |
| Wrappery nad `invoke` | `src/fileops.ts` |
| Nastavení (settings.json) | `src/lib/storage.ts` |
| Překlady | `src/i18n/cs.ts`, `src/i18n/en.ts`, `src/i18n/index.ts` |
| UI komponenty | `src/components/` |
| Styly (Tailwind 4 + vlastní CSS, sklo, průhlednost) | `src/index.css` (~2 100 ř.) |
| Rust commandy a souborové operace | `src-tauri/src/main.rs` (~3 160 ř.) |
| Rust moduly WinAPI | `src-tauri/src/{clipboard,external_drop,native_drag,shellnew,fileop,recycle,snap,extensions}.rs` |
| Konfigurace Tauri | `src-tauri/tauri.conf.json`, `tauri.store.conf.json`, `capabilities/default.json` |
| Instalátor NSIS | `src-tauri/nsis/hooks.nsh`, `Czech.nsh` |
| Build pro Store (MSIX) | `scripts/build-msix.ps1` |
| Kontrola překladů | `scripts/i18n-check.mjs` |
| CI | `.github/workflows/{release,pages,winget-manifest}.yml` |
| winget manifest | `winget/` |
| Web (Astro) | `site/` |
| Screenshoty, demo, videa, grafika | `scripts/docs-media/`, `docs/` |
| Dokumentace | `README.md` + `README.cs.md` (vždy obě), `CHANGELOG.md`, `ROADMAP.md`, `PRIVACY.md`, `SECURITY.md`, `docs/store-listing.md` |

---

## 3. Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4 (`@tailwindcss/vite`).
  - Knihovny: `@tanstack/react-virtual` (virtualizace), `lucide-react` (ikony), `marked` + `dompurify` (náhled Markdownu), `@fontsource/inter`.
  - Pluginy Tauri: `@tauri-apps/plugin-store` a `plugin-clipboard-manager` (jen `writeText`).
- **Backend:** Rust (edition 2021), Tauri 2 (v Cargo.lock 2.11.5, wry 0.55.1), crate `windows` 0.61, `webview2-com` 0.38, `windows-core` 0.61.
  - Další crates: `notify` 8 (watcher), `walkdir` (hledání), `trash` (jen Zpět u smazání), `opener`, `dirs`, `png` + `base64` (ikony jako data URL), `encoding_rs` (CP1250/UTF-16 v náhledu textu).
- **Release profil:** `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`.
- **Bez updater pluginu:** aktualizace se jen oznámí proužkem s odkazem na GitHub.
- **Toolchain:** `rust-version` ani `rust-toolchain` nejsou nastavené. Kód potřebuje Rust ≥ 1.87 (`u32::is_multiple_of`).
- **Jen Windows:** `fileop.rs`, `recycle.rs` a `snap.rs` volají `windows` bez `#[cfg(windows)]`, takže se jinde nepřeloží.
- **Web:** Astro 7, GSAP + Lenis, sharp, Node 22.12+ (vlastní `site/package.json`).

---

## 4. Funkce z pohledu uživatele

### Procházení

**Zobrazení**
- Tři zobrazení: **Ikony** (virtualizovaná mřížka, buňka 96×118), **Seznam** (sloupce Název / Datum úpravy / Velikost / Druh) a **Sloupce**.
- Sloupce: sloupce po 240 px, vpravo informační panel 272 px. Ukazuje velký náhled, druh, velikost, data, délku a rozlišení videa, rozměry obrázku, počet stran PDF, štítky a tlačítko Otevřít.
- Mezi zobrazeními se přepíná prolnutím.

**Řazení, filtr a výběr**
- Řazení podle názvu, data, velikosti a druhu. Složky jsou vždy první, řazení je přirozené podle abecedy jazyka UI.
- Psaní do pole hledání filtruje aktuální složku (zpoždění 100 ms).
- Type-ahead skočí na položku podle prvních písmen. Funguje gumičkový výběr, Ctrl a Shift výběr.

**Náhledy v seznamu**
- Obrázky přes `asset:` protokol.
- Video (s odznakem ▶) a PDF ze shellu (`IShellItemImageFactory`), nejvýš pro 200 položek ve složce.

**Záložky**
- Ouška 120–240 px, každé má vlastní historii, zobrazení, řazení i výběr.
- Ouška jdou přerovnat tažením. Drop souborů na ouško je přesune, s Ctrl zkopíruje. Prostřední klik ouško zavře.
- Neaktivní záložky jsou jen `TabSnapshot`.
- Ukládají se, když jsou 2+ záložky **nebo** je zapnuté rozdělení.

**Rozdělené okno**
- Ctrl+Shift+D rozdělí okno na dva nezávislé panely, Tab přepíná mezi nimi.
- F5/F6 kopíruje / přesouvá výběr do druhého panelu.
- Dělicí čára jde posunout v rozsahu 25–75 %, dvojklik vrátí 1:1.
- V okně užším než 1000 px se rozdělení dočasně schová.

**Sidebar**
- Sekce:
  - **Rychlý přístup** – vlastní připnuté soubory i složky (`favorites` v settings.json; „Připnout do Rychlého přístupu“ v kontextovém menu);
  - **Tento počítač** – Plocha, Stažené soubory, Dokumenty…;
  - **Cloud** – OneDrive, iCloud;
  - **Disky** – místní, USB, síťové, optické mechaniky, telefony přes MTP; posledním řádkem je Koš;
  - **Nedávné** a **Štítky**.
- Disky se aktualizují samy (polling každých 1,5 s).
- Šířka 180–360 px (dvojklik vrátí 220), sekce jdou sbalit.

**Přípony**
- Chovají se jako v Průzkumníku: řídí se nastavením HideFileExt, NeverShowExt / AlwaysShowExt z registru a známými typy.
- Volba Windows / Vždy / Nikdy. Zobrazuje se jen upravený název, operace pracují s `entry.name`.

**Vzhled**
- Světlé / tmavé / podle systému.
- Skleněný vzhled je výchozí: titulek, toolbar a záložky leží na jedné rozmazané desce a výpis pod ní prosvítá.
- Volitelná **rozmazaná průhlednost okna (Acrylic)** se silou jemná / střední / silná. Jen na Windows 11 22H2+ se zapnutými Efekty průhlednosti. Neaktivní okno zneprůhlední.
- Titulková lišta Windows 11 se Snap Layouts.

### Náhled (mezerník)

Soubor se otevře s animací přiblížení z ikony. ←/→ přepíná soubory, pravý klik otevře menu.

| Typ | Přípony | Poznámka |
|---|---|---|
| Obrázky | jpg, jpeg, png, gif, webp, svg, bmp, ico | |
| PDF | pdf | v iframe |
| Video | mp4, m4v, webm, mov, mkv, avi | spouští se ztlumené |
| Audio | mp3, wav, flac, m4a, aac, ogg | |
| Markdown | md, markdown | `marked` + DOMPurify; zakázané jsou img, video, iframe, formuláře; odkazy http a mailto se otevřou ven |
| Text a zdrojáky | txt, log, csv, json, html, css, xml, toml, yaml, ini aj. | nejvýš 1 MiB; kódování podle BOM, UTF-8 nebo CP1250 |

Náhled nemají heic, tif, wmv a wma.

### Paleta příkazů (Ctrl+K)

- Prohledává složky (rychlý přístup, nedávné, záložky, podsložky), akce, štítky a typy z menu Nový. Shoda je fuzzy a nezáleží na diakritice.
- Prázdné pole nabídne 6 nedávných složek a 5 nejpoužívanějších akcí. Počítá se jen spuštění z palety (`commandUsage`).
- `tag:` filtruje štítky. Cesta (`C:\…`, `\\server`, `~`) vede rovnou do složky, u souboru ho odkryje.
- Ctrl+Enter / poslední řádek hledá soubory od aktuální složky.

### Hledání

- Enter v poli hledání spustí rekurzivní hledání v Rustu (walkdir) od aktuální složky. Ve sloupcovém zobrazení se hledá od nejhlubšího sloupce.
- Shoda: podřetězec názvu bez ohledu na velikost písmen. Odkazy se nenásledují.
- Přeskakuje `.git`, `node_modules` a Cargo `target`.
- Nejvýš 500 výsledků. Nové hledání zruší předchozí.
- Výsledky se po změnách na disku samy neobnovují.

### Souborové operace

**Schránka a tažení**
- Skutečná schránka Windows (CF_HDROP + Preferred DropEffect), takže Ctrl+C/X/V funguje s Průzkumníkem, Outlookem i prohlížeči. Vyjmuté položky jsou poloprůhledné.
- Drag & drop dovnitř z Průzkumníku nebo plochy na složku, ouško, sidebar nebo volnou plochu.
- Drag & drop ven nativním OLE dragem: kopie je výchozí, Shift přesouvá, Ctrl kopíruje.

**Vytváření**
- Tlačítko **+ Nový**: složka, textový dokument a typy z registru ShellNew (Word, Excel, ZIP…).
- Při kolizi dostane název „(2)“. Po vytvoření se rovnou přejmenovává.

**Přejmenování**
- Inline F2. Skrytá přípona se v poli neukazuje a po potvrzení se připojí zpět.
- Hromadné přejmenování není.

**Kopie a přesun**
- Dialog kolize nabízí Nahradit (u složky Sloučit), Ponechat obě (výchozí), Přeskočit, volbu „pro všechny“ a Zastavit.
- Duplikace (Ctrl+D) vytvoří „název (kopie).ext“.

**Mazání a Koš**
- Delete posílá do Koše, Shift+Delete maže trvale s potvrzením. Na svazku bez Koše se aplikace nejdřív zeptá.
- **Koš** v sidebaru zobrazí původní umístění, datum smazání a velikost. Umí Obnovit (nic nepřepíše), Smazat trvale a Vysypat Koš.

**Jako správce**
- **Pokračovat jako správce** v chráněných místech: mazání, přesun, vložení, přejmenování, nová složka.
- UAC výzvu ukáže IFileOperation, samotná aplikace jako správce nikdy neběží.

**Zpět / Znovu**
- Ctrl+Z / Ctrl+Y vrací posledních 50 operací (jen v paměti): přejmenování, přesun, kopie, vytvoření, smazání do Koše a změny štítků.
- Do historie se nezapisuje: „Nahradit“, operace jako správce, trvalé smazání a přesun tažením ven.

**Štítky**
- 7 barev: red, orange, yellow, green, blue, purple, grey. Ukládají se jen v settings.json, ne v souborovém systému.
- Nastavují se přes toolbar, kontextové menu a paletu. Kopie je zdědí, přejmenování a přesun je přenesou.
- Pohled jedné barvy je v sidebaru.

**Ostatní**
- Terminál: auto / Windows Terminal / PowerShell 7 / Windows PowerShell / cmd. Shift+klik na „Otevřít v terminálu“ nabídne výběr.
- Vlastnosti: velikost složky se počítá průběžně, nejvýš do 200 000 položek.
- Otevřít v aplikaci (dialog „openas“), Zobrazit v Průzkumníku, Kopírovat cestu, Sdílet.
- Stavový řádek ukazuje výběr a volné místo („1 z 52 vybráno · 120,7 GB volných“). Drobky lze přes Ctrl+L přepnout na editovatelnou cestu.

### Známá omezení (README)

- Jen Windows a jen jedno okno.
- Zpět jen v paměti; „Nahradit“ nejde vrátit.
- Telefony (MTP) se otevírají v Průzkumníku.
- Rekurzivní hledání jen podle názvu, max. 500 výsledků.

### Klávesové zkratky

Úplné tabulky jsou v README (sekce *Keyboard shortcuts* / *Klávesové zkratky*). Web je z nich parsuje, proto se musí zachovat formát dvou tabulek po dvou sloupcích.

| Zkratka | Akce |
|---|---|
| Ctrl+T / Ctrl+W | nová / zavřít záložku |
| Ctrl+Tab / Ctrl+Shift+Tab, Ctrl+1…8, Ctrl+9 | další / předchozí záložka, záložka podle pořadí, poslední záložka |
| Ctrl+K | paleta (Ctrl+Enter = hledat soubory) |
| Ctrl+Shift+D, Tab | rozdělit okno, přepnout panel |
| F5 / F6 | kopie / přesun do druhého panelu (jinak F5 = obnovit) |
| Mezerník | náhled |
| Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) | zpět / znovu |
| Ctrl+C / X / V, Ctrl+D | schránka, duplikovat |
| F2, Ctrl+Shift+N | přejmenovat, nová složka |
| Delete / Shift+Delete | do Koše / trvale |
| Ctrl+A | vybrat vše (ne ve sloupcích) |
| Ctrl+L, Ctrl+F | upravit cestu, hledání |
| Ctrl+R / F5 | obnovit |
| Ctrl+Shift+. | skryté soubory |
| Backspace / Alt+←, Alt+→, Alt+↑ / Ctrl+↑ | zpět, vpřed, nadřazená složka |
| Enter / Ctrl+↓ | otevřít |
| Myš 4/5, prostřední klik | zpět / vpřed; složka do nové záložky / zavřít ouško |

---

## 5. Frontend (`src/`)

### Stav

**`App.tsx`** je jedna velká komponenta bez Reduxu a bez globálního Contextu; jediný Context je `GlassInsetsContext`.

- Volá `usePanel({slot: 0|1})` dvakrát. `panel` = aktivní panel. `activeFns` je proxy se stabilní identitou, která vždy míří na aktuálně aktivní panel.
- Drží:
  - záložky (`tabs`, `activeTabId`) a rozdělení (`splitOn`, `activePanel`, `narrow`);
  - sekce sidebaru z `get_favorites`;
  - hlášky (`notice`: info zmizí po 2 s, chyba visí s „Podrobnostmi“) a dialogy (confirm, conflict jako Promise, properties, about, paleta, náhled);
  - zrcadlo schránky, historii Zpět/Znovu, stav Koše, terminály a typy ShellNew;
  - stav okna: `ready`, `windowFocused`, `acrylicAvailable`, aktualizace.
- Klávesy obsluhuje jeden `keydown` na `window`. Nejdřív `commandForKey` z registru, pak natvrdo šipky, Home/End, PgUp/PgDn, Enter, Esc, mezerník, type-ahead a Ctrl+1…9.
- Otevřený modál nebo `[data-fw-menu]` vypne globální zkratky.
- Pravý klik se globálně blokuje v capture fázi (kromě INPUT a TEXTAREA). Tabulka všech kontextových menu je v komentáři v `App.tsx` (kolem ř. 765).
- Watcher: `watch_dirs(paths, generation)` hlídá jen viditelné panely. Událost `dir-changed` přenačte viditelné panely kromě výsledků hledání.

**Ostatní stavové moduly**

- **`panel.ts`** – stav jednoho panelu: výpis, načítání, chyba, volné místo, přejmenování, editace cesty, `pendingSelect` (označit po dalším výpisu), gumička, `captureSnapshot` / `applySnapshot` a paměť scrollu.
  - Výpis jde přes `list_dir_stream`: prvních 300 položek hned, zbytek událostmi `dir-chunk`. Token je společný, `slot` je 0/1. Řadí frontend.
  - Kostra výpisu se ukáže po 400 ms.
- **`browser.ts`** – `useBrowserState`: nav, viewMode (výchozí `icon`), řazení, dotaz, filtr štítku, pohled Koše, hledání, výběr. `TabSnapshot` k tomu přidá scrollTop, sloupce a fokus sloupce.
- **`navigation.ts`** – reducer historie (`back` / `forward`). `direction` (back, forward, into, up, jump) volí animaci přechodu.
- **`columns.ts`** – `useColumns`: pole sloupců, načítá přes `list_dir` (řadí Rust). Umí `restore()` celé hierarchie a `refresh()`.
- **`undo.ts`** – `UndoOp`:
  - typy: `rename`, `move`, `copy`, `create`, `trash`, `tags`;
  - kopie a vytvoření se vrací smazáním do Koše; bez Koše `error.undoNoTrash`;
  - `trash` se vrací přes `restore_from_trash` podle času smazání.
- **`theme.ts`** – `ThemePreference`, zrcadlo v localStorage `finder-theme`, třída `.dark`, `syncWindowBackground`. Přepnutí tématu jde přes View Transition API.
- **`types.ts`** – `FileEntry`:
  - pole: `name`, `path`, `is_dir`, `size`, `modified` / `created` (unix **sekundy**), `extension` (bez tečky, malými písmeny), `hidden`, `is_symlink`, `ext_rule`;
  - dál `FavoriteSection`, `OpResult`, `StatResult`, `FileProperties`, `FolderStats`, `TagColor` a `RecentEntry` (`opened_at` v **ms**).

### Registr příkazů (`commands.ts`)

- Každý příkaz má `CommandId` a záznam v `DEFINITIONS`: titulek, zkratky, rozsah a příznak `palette`.
- Pořadí v `DEFINITIONS` určuje prioritu: vyhraje první povolený příkaz s danou klávesou. Proto je F5 při rozdělení kopie, jinak obnovit.
- Rozsahy zkratek: `global` (i při psaní do pole), `overlay` (i ve výsledcích, štítcích a Koši), `folder` (výchozí).
- Příkazy se zobrazují v paletě, v menu **Více** a na toolbaru:
  - menu Více: Zpět/Znovu | Nová záložka, Rozdělit, Paleta, Obnovit, Nadřazená | Zobrazit ▸ (Skryté, Přípony ▸) | Vzhled ▸ (téma + Průhlednost a síla) | Animace ▸ | Terminál ▸ | Jazyk ▸ | Kontrolovat aktualizace | O aplikaci;
  - toolbar: zpět, vpřed, rozdělit; tlačítko Nový otevírá stejné menu jako `newItem`.
- `checkUpdates` je **přepínač** „Kontrolovat aktualizace“, ne „zkontrolovat teď“. Ve Store buildu chybí.
- Mimo registr (natvrdo v `App.tsx` a komponentách): Ctrl+1…9, mezerník, šipky, Home/End, PgUp/PgDn, Enter, Esc, type-ahead, MB4/MB5 a prostřední klik.
- **Nový příkaz:** `CommandId` + `DEFINITIONS`, handler v `App.tsx` (`buildCommands`), texty do `cs.ts` i `en.ts`.

### Komponenty (`src/components/`)

| Komponenta | Co dělá |
|---|---|
| `TitleBar` | vlastní lišta 32 px, ikona + „Dirwise“; tlačítka Win11 46×32, hover u Maximalizovat z události `snap-button` |
| `Toolbar` | zpět/vpřed, název složky, Nový ▸, zobrazení, Seřadit, Sdílet, Štítky, Rozdělit, Více, hledání; šířku řídí container query `toolbar` |
| `TabBar` | ouška záložek, přerovnání (MIME `application/x-finder-win-tab`), drop souborů |
| `Sidebar` | Rychlý přístup, systémové sekce z `get_favorites`, Koš, nedávné, štítky; sbalení v localStorage `finder-sidebar-collapsed` |
| `ListView` / `IconView` / `ColumnView` | tři zobrazení; ColumnView obsahuje i InfoPanel |
| `QuickLook` | náhled na mezerník (komponenta se jmenuje historicky, v UI je to „Náhled / Preview“) |
| `SearchView` / `ResultsView` | rekurzivní hledání a společný seznam výsledků (Název, Kde je, Datum) |
| `TagView`, `TagDots` | pohled jednoho štítku (mizející cesty promaže jen při `missing === true`); puntíky štítků |
| `RecycleBinView` | Koš |
| `ConflictDialog`, `ConfirmDialog`, `PropertiesDialog`, `AboutDialog`, `Dialog` | dialogy; u nebezpečné akce má ConfirmDialog fokus na Zrušit |
| `StatusBar` | počty, volné místo, drobky / editace cesty (`can_list_dir`) |
| `ContextMenu` | menu s podmenu (i vnořenými), paletou štítků a položkami pro Shift (`shiftItems`) |
| `CommandPalette` | paleta Ctrl+K |
| `RenameInput` | inline přejmenování F2 |
| `Tooltip`, `ViewTransition`, `EmptyState` | tooltipy pro `data-tooltip`, přechody navigace + `Skeleton`, prázdný stav |
| `icons.tsx`, `icons/ShareWindows.tsx` | ikony složek a souborů, `Thumbnail` / `ShellThumbnail`; Fluent ikona Sdílet (MIT) |

### `src/lib/`

- **`storage.ts`** – settings.json přes tauri-plugin-store (autoSave 200 ms). Synchronní cache + `subscribe`, každé čtení se sanitizuje. Pomocné funkce `remapPath`, `copyTags`, `pathKey` (malá písmena) a `samePath`.
- **`useStorage.ts`** – `useSyncExternalStore` nad storage.
- **`dnd.ts`** – payload tažení, drop zvenku (`finderWinDrop:<id>`) a tažení ven (`NATIVE_DRAG_OUT = true` je přepínač pro rollback).
- **`rowDnd.ts`** – složky jako cíle dropu, modifikátory výběru.
- **`extensions.ts`** – zobrazované názvy podle `ext_rule` (`useDisplayNames`).
- **`glass.ts`** – Acrylic a podklad okna (`applyWindowBackdrop`), výšky skla (`GLASS_TOP` 109 = 32 + 40 + 37).
- **`motion.ts`** – animace podle `--dur-*` a `data-motion`.
- **`fileIcons.ts`** – ikony a náhledy ze shellu. LRU 500 položek / 16 MB, nejvýš 6 souběžných požadavků, líné načítání přes IntersectionObserver.
- **`filetypes.ts`** – tabulka přípona → druh, ikona a způsob náhledu.
- **`tags.ts`**, **`specialFolders.ts`** – barvy a popisky štítků, glyfy speciálních složek.
- **`updates.ts`** – kontrola aktualizací, viz kap. 9.
- **`rubberBand.tsx`**, **`rows.ts`**, **`dom.ts`**, **`viewHandle.ts`** – drobné pomocné moduly.

### Nastavení – `settings.json`

Soubor leží v `%APPDATA%\com.krystof2ops.finderwin\settings.json`, ve Store buildu v `…finderwin.store`.

| Klíč | Obsah / výchozí |
|---|---|
| `favorites` | `[{label, path, icon, type: file\|folder}]`, `[]` |
| `recents` | `[{path, name, type, opened_at(ms)}]`, max 20 (sidebar ukazuje 10) |
| `tags` | `{ "<cesta malými písmeny>": ["red", …] }` |
| `showHidden` | `null` = podle Průzkumníku (`explorer_shows_hidden`) |
| `sidebarWidth` | 220 (180–360) |
| `motion` | `system` / `on` / `off` |
| `extensions` | `windows` / `always` / `never` (v kódu `extensionMode`) |
| `language` | `system` / `en` / `cs` (system = čeština jen pro `navigator.language` začínající `cs`) |
| `theme` | `system` / `light` / `dark` |
| `terminal` | `auto` / `windowsTerminal` / `pwsh` / `powershell` / `cmd` |
| `tabs` | `{items: [{path, view, sortKey, sortDirection, second?, activePanel?}], active}` |
| `updates` | `{check: true, lastCheck: 0, latest: null \| {version, url}}` |
| `splitRatio` | 0,5 (0,25–0,75) |
| `commandUsage` | `{id: počet}` – jen spuštění z palety |
| `windowTransparency` | `false` |
| `transparencyStrength` | `subtle` / `medium` (výchozí) / `strong` |

- Při načtení se mažou staré klíče `transparency` a `transparencyStyle`.
- Globální řazení ani šířky sloupců se neukládají; řazení a zobrazení se pamatuje jen po záložkách.
- Store drží Rust v paměti, změna souboru na disku se projeví až po restartu.

### i18n

- Ploché slovníky `cs` / `en` (437 klíčů), typ `MessageKey = keyof typeof cs`.
- `t()` funguje i mimo React, v komponentách `useT()` / `useLocale()`. Fallback: aktuální jazyk → en → klíč.
- Plurály přes `Intl.PluralRules` (`{one, few, other}`), čísla v parametrech s oddělovači tisíců.
- **`scripts/i18n-check.mjs`** (TS AST, bez závislostí) běží v `npm run build`:
  - hlídá český text a JSX text mimo `src/i18n/`, plus texty v atributech `title`, `aria-label`, `placeholder`, `alt`, `data-tooltip` a vlastnostech `label`, `message`, `hint`, `confirmLabel`;
  - kontroluje stejné klíče v cs i en, plurály a shodné `{parametry}`;
  - výjimka jde označit komentářem `i18n-ignore`.

### Drobnosti

- `main.tsx` blokuje samotný Alt a F10. Jinak WebView2 přepne bezrámečkové okno do režimu systémové nabídky a aplikace „zamrzne“.
- `index.html` má natvrdo `lang="cs"` a `data-glass="on"`; i18n `lang` přepíše.
- `__STORE__` definuje `vite.config.ts` podle `FINDERWIN_STORE=1`.
- Chyby z `invoke` jsou `BackendFailure`; text se získá přes `errorText(err)`, ne `String(err)`.

---

## 6. Rust backend (`src-tauri/`)

### Základní typy

- **`AppError { key, args }`** – klíč i18n + argumenty (Text / Number / vnořený Error).
  - Konstruktory: `AppError::at(path, reason)` (`error.atPath`), `AppError::raw(msg)` (`error.unknown` + detail).
  - Kódy OS a HRESULT mapují na klíče `describe_io`, `describe_win` a `describe_hr` (fileop).
  - Překládá frontend (`localizeError`).
- **`FileEntry`** staví jediná funkce `make_entry`, kterou sdílí `list_dir`, `stat_paths` i hledání.
- Výstupní JSON je **snake_case** (`is_dir`, `ext_rule`, `original_dir`); výjimkou je `ShellNewItem` (camelCase).
- Argumenty commandů jsou v `invoke` camelCase. Vnořené struktury Tauri nepřevádí: `ElevatedItem.on_conflict` mapuje ručně `fileops.ts`.
- Systémová a chráněná jména (hidden+system) se nevypisují nikdy, skryté jen se `showHidden`.

### Commandy (56, všechny v `generate_handler!`)

Commandy jsou `#[tauri::command(async)]`. Výjimkou jsou sync `app_ready` a `window_is_active`, které běží na hlavním vlákně.

| Oblast | Commandy |
|---|---|
| Výpis | `list_dir` (řadí, jen sloupce), `list_dir_stream` (300 hned + `dir-chunk` po 500, neřadí, tokeny ve 2 slotech), `can_list_dir` |
| Metadata | `stat_paths` (skutečná velikost písmen, `missing` jen při NotFound), `get_file_properties`, `folder_stats` + `cancel_folder_stats` (IPC Channel, strop 200 000), `get_media_info` (IPropertyStore: délka, rozměry, strany; limit 2 s), `read_text_file` (≤ 1 MiB), `get_disk_free_space` |
| Ikony / náhledy | `get_file_icon` (32/64/128), `get_file_thumbnail` (64/128/256) – shell na STA vlákně, PNG data URL, disková cache |
| Hledání | `search_recursive`, `cancel_search` |
| Operace (std::fs) | `rename_path` (`validate_name`, MoveFileExW; změna jen velikosti písmen přes dočasný `.finder-win-rename-N`), `copy_path`, `move_path` (Rename / Replace / Skip; Replace u složky slučuje; přesun mezi svazky = kopie + smazání), `duplicate_path`, `create_folder`, `create_file`, `restore_from_trash`, `trash_is_permanent` |
| Operace (IFileOperation, `fileop.rs`) | `delete_paths` (Koš / trvale / elevate), `transfer_elevated`, `rename_elevated`, `create_folder_elevated` |
| Koš (`recycle.rs`) | `recycle_bin_state`, `list_recycle_bin`, `restore_recycled`, `purge_recycled`, `empty_recycle_bin` |
| Schránka (`clipboard.rs`) | `clipboard_write_files`, `clipboard_read_files`, `clipboard_has_files`, `clipboard_clear` |
| ShellNew (`shellnew.rs`) | `list_shell_new`, `create_shell_new`, `get_extension_icon` |
| Přípony (`extensions.rs`) | `extension_rules`, `explorer_hides_extensions` |
| Shell | `open_file`, `open_in_explorer` (`/select,`), `open_with` (`openas`), `open_device` (MTP přes explorer), `open_terminal`, `available_terminals` |
| Disky | `get_favorites` (oblíbené, cloud, zařízení: GetLogicalDrives, IOCTL kvůli USB, MTP přes Shell) |
| Watcher | `watch_dirs` (notify, nerekurzivně, generace; události se slučují 250 ms, nejdéle 1 s → `dir-changed`) |
| Okno | `explorer_shows_hidden`, `acrylic_supported` (build ≥ 22621), `system_transparency`, `set_window_backdrop`, `app_ready`, `window_is_active` |
| Nativní drag | `start_native_drag` |
| Aktualizace | `open_release_page` (jen 3 povolené prefixy URL, tag `[A-Za-z0-9.-]`; ve Store buildu vždy chyba) |

**Události do frontendu:** `dir-chunk`, `dir-changed`, `drives-changed`, `external-drop`, `native-drag-end`, `snap-button`, `window-active`. Průběh `folder_stats` jde přes Channel.

### Spuštění (`main()`)

1. **Před Builderem:** ve Store buildu `import_nsis_settings` – jednorázově převezme `settings.json` z NSIS verze, jen když vlastní soubor chybí a zdroj je platný JSON objekt.
2. **Pluginy:** `tauri-plugin-clipboard-manager`, `tauri-plugin-store`.
3. **Setup:**
   - zaoblené rohy (DWM), `external_drop::install`, `snap::install`;
   - pojistka, která okno ukáže po 1,5 s;
   - managed stavy `SearchState`, `FolderStatsState`, `DirWatcher`;
   - change emitter a drive watcher;
   - úklid cache (náhledy starší 30 dní, `.tmp`; ve Store i stará `finder-win-store`);
   - `shellnew::preload()`.
4. **Okno:** startuje skryté (`visible: false`) a ukáže ho až `app_ready` z frontendu, až jsou načtené písmo, nastavení a podklad.
5. **Události okna:** Resized / ScaleFactorChanged → `snap::reposition()`.

### Moduly

- **`fileop.rs`** – IFileOperation na vlastním STA vlákně, sink sbírá HRESULT po položkách.
  - Operace: Delete, Rename, Copy, Move, NewFolder, Restore, Purge.
  - Tichý režim. Elevace přes `FOFX_SHOWELEVATIONPROMPT | FOFX_REQUIREELEVATION`.
  - Koš: `FOFX_RECYCLEONDELETE | FOF_ALLOWUNDO | FOF_WANTNUKEWARNING`. Obnovení: `FOF_RENAMEONCOLLISION`.
  - `describe_hr` mapuje COPYENGINE_E_* na klíče i18n.
- **`recycle.rs`** – Koš přes Shell: `FOLDERID_RecycleBinFolder` + `BHID_EnumItems`.
  - Původní místo a datum z PSGUID_DISPLACED (pid 2/3), jméno z `PKEY_FileName`.
  - Obnovení a trvalé smazání běží nad položkami z výčtu Koše (ne podle cest, jinak by zůstal záznam `$I`). Frontend posílá jen id.
- **`clipboard.rs`** – CF_HDROP (DROPFILES, UTF-16) + „Preferred DropEffect“. OpenClipboard zkouší 10× po 25 ms, pak `error.clipboardBusy`.
- **`external_drop.rs`** – handler `WebMessageReceived` pro řetězcové zprávy `finderWinDrop:<id>`; cesty z `AdditionalObjects` → událost `external-drop`.
- **`native_drag.rs`** – tažení ven.
  - Postup: `BHID_DataObject` ze shellu → `SHDoDragDrop` na hlavním vlákně, vlastní `IDropSource` (`#[implement]`); Esc nebo pravé tlačítko tažení zruší.
  - Výsledek z „Logical Performed DropEffect“ → `native-drag-end`.
- **`shellnew.rs`** – menu Nový z HKCR `.<ext>\ShellNew`.
  - Zdroje: NullFile, Data nebo FileName (šablony). Command, Config a Handler se přeskakují.
  - Nejvýš 20 položek, bez .txt. Načte se jednou za běh.
- **`extensions.rs`** – pravidlo přípony z registru (0 neznámý, 1 známý, 2 NeverShowExt, 3 AlwaysShowExt; u přípony i ProgID). Cache po celý běh.
- **`snap.rs`** – Snap Layouts.
  - Neviditelné child okno `DirwiseSnapOverlay` nad HTML tlačítkem Maximalizovat vrací `HTMAXBUTTON`.
  - Subclass hlavního okna posílá `window-active` z WM_NCACTIVATE.
  - Rozměry 46×32 CSS px × scale musí sedět s `TitleBar.tsx`.

### Konfigurace

**`tauri.conf.json`**
- `productName` Dirwise, identifier `com.krystof2ops.finderwin`, verze z Cargo.toml.
- Okno 1200×780, min 900×600, `decorations: false`, `transparent: true`, `backgroundColor #00000000`, `visible: false`, `shadow: true`, `dragDropEnabled: false` (musí zůstat).
- CSP: `connect-src` povoluje navíc jen `https://api.github.com`. `assetProtocol.scope` je `**` (celý disk, kvůli náhledům).
- Bundle: jen NSIS, `installMode: currentUser`, jazyky English + Czech (vlastní `Czech.nsh`), `installerHooks: hooks.nsh`, publisher a copyright „Arcly Studio“.

**`tauri.store.conf.json`** (merge přes `--config`) mění jen identifier na `….store` a `connect-src` bez GitHubu.

**`capabilities/default.json`** povoluje: `core:default`, okno close / minimize / toggle-maximize / start-dragging / set-background-color, `clipboard-manager:allow-write-text`, `store:default`.

**NSIS `hooks.nsh`**
- Hook `NSIS_HOOK_PREINSTALL` dělá tři věci:
  - tichá odinstalace staré Finder-Win;
  - smazání staré cache;
  - přenos klíče vydavatele `Software\krystof2-ops\Dirwise` → `Software\Arcly Studio\Dirwise`. Interaktivně to dělá `.onGUIInit`, jinak by aktualizace z 1.6.0 hlásila „nelze odinstalovat“.
- Pojistka při kompilaci: `!error`, když se `MANUPRODUCTKEY` / `PRODUCTNAME` liší od očekávání. Změna publisher nebo productName tím shodí build instalátoru.

### Testy

- **`main.rs`:** `release_url_tests`, `settings_import_tests` a `trash_tests` (`#[ignore]`, sahá na skutečný Koš).
- **Ostatní moduly:**
  - `external_drop::tests` a `shellnew::tests`;
  - `extensions::tests` – čtou skutečný registr;
  - `fileop::tests::performs_queue_with_per_item_results` – **není** ignorovaný; pouští skutečný IFileOperation v %TEMP% a trvale maže jen své soubory.

---

## 7. Hlavní datové toky

**Otevření složky**
1. `panel.ts` zavolá `list_dir_stream(path, showHidden, token, slot)` a dostane prvních 300 položek.
2. Zbytek chodí událostmi `dir-chunk`; frontend řadí a filtruje.
3. `watch_dirs` hlídá viditelné složky; `dir-changed` vyvolá přenačtení.

**Ikony a náhledy**
- `fileIcons.ts` (fronta, LRU) volá `get_file_icon` / `get_file_thumbnail`.
- Rust: `IShellItemImageFactory` → PNG → data URL.
- Cache `%LOCALAPPDATA%\dirwise\{icons,thumbnails}\<fnv1a>.png`; marker `.none` označí typ bez náhledu.
- Ikony se cachují podle přípony, u exe, lnk, ico, url aj. podle cesty a mtime.
- Obrázky v náhledu jdou přímo přes `convertFileSrc` (`asset:`).

**Kopie a přesun**
1. Běžně `copy_path` / `move_path` (std::fs, bez průběhu a bez zrušení).
2. Při kolizi `ConflictDialog`.
3. Při odepření přístupu nabídka „Pokračovat jako správce“ → `transfer_elevated` (IFileOperation + UAC).
4. Výsledek jde do historie Zpět, kromě Nahradit a operací jako správce.

**Mazání**
- `delete_paths`: jedna operace IFileOperation pro celou dávku, výsledky po položkách.
- Zpět u smazání do Koše = `restore_from_trash` (crate `trash`).

**Drop z Průzkumníku**
1. HTML5 drop.
2. `chrome.webview.postMessageWithAdditionalObjects("finderWinDrop:<id>", files)`.
3. `external_drop.rs` → událost `external-drop {id, paths}`.
4. Zprávy musí být řetězce, viz CLAUDE.md.

**Tažení ven**
1. `dragstart` → `start_native_drag`.
2. OLE `SHDoDragDrop`.
3. `native-drag-end {effect}`.
- Nad vlastním oknem přijde jako HTML5 drop a jde interní cestou.

**Schránka**
- `clipboard_*` (CF_HDROP).
- Frontend drží jen zrcadlo kvůli zprůhlednění vyjmutých položek a znovu ho načte při návratu do okna.

**Zobrazení okna**
1. Okno startuje skryté.
2. Frontend načte písmo, nastavení a podklad, pak zavolá `app_ready`.
3. Rust okno ukáže a přepočítá overlay Snap. Pojistka po 1,5 s ho ukáže tak jako tak.

---

## 8. Kde leží data uživatele

| Co | Kde |
|---|---|
| Nastavení | `%APPDATA%\com.krystof2ops.finderwin\settings.json` (Store `…finderwin.store`) |
| WebView2 data | `%LOCALAPPDATA%\com.krystof2ops.finderwin` |
| Cache ikon a náhledů | `%LOCALAPPDATA%\dirwise\{icons,thumbnails}` (Store `dirwise-store`); náhledy se mažou po 30 dnech |
| localStorage | `finder-theme` (zrcadlo tématu pro první render), `finder-sidebar-collapsed` |
| Instalace NSIS | `%LOCALAPPDATA%\Dirwise`, klíč odinstalace HKCU `Uninstall\Dirwise`, `HKCU\Software\Arcly Studio\Dirwise` |

Dev build sdílí identifier i settings.json s nainstalovanou aplikací. Demo a snímky proto běží s `scripts/docs-media/demo-conf.json` (identifier `….demo`).

---

## 9. Distribuce a aktualizace

### GitHub release (NSIS)

1. Verze v `package.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock`, `package-lock.json`), záznam v `CHANGELOG.md`, commit „Release X.Y.Z“.
2. Push tagu `v*` spustí **`release.yml`** (windows-latest, Node 20, `tauri-action@v1`). Výsledek je **draft** release s `Dirwise_<verze>_x64-setup.exe`. Instalátor je nepodepsaný; text releasu radí SmartScreen → More info → Run anyway.
3. Draft se publikuje ručně. Publikování spustí **`winget-manifest.yml`**.
4. Po vydání: `gh workflow run pages.yml` (web bere verzi a velikost z releases/latest) a `node scripts/docs-media/buttons.mjs` (download tlačítka v `docs/buttons/`).
5. `release.yml` nespouští testy, clippy ani i18n check. Ty se pouští lokálně.

### winget

- Workflow přijme jen tag ve tvaru `vX.Y.Z`. Má dva joby:
  - **`manifest`:** stáhne instalátor, spočítá SHA256, přepíše `winget/*.yaml` a založí PR do repa (větev `winget/<tag>`);
  - **`winget-pkgs`:** `wingetcreate update --submit` (v1.12.13.0 s ověřeným SHA256, secret `WINGET_TOKEN`). Když balíček ve winget-pkgs ještě není nebo tam verze už je, skončí s `::warning::`.
- Manifest: schéma 1.12.0, `PackageIdentifier krystof2-ops.Dirwise`, `InstallerType nullsoft`, `Scope user`, `ProductCode Dirwise`, Publisher „Arcly Studio“.
- Stav ve winget-pkgs:
  - web: `site/src/lib/winget.ts` (`auto` = kontrola existence při buildu);
  - README: `node scripts/winget-status.mjs [available|pending]`.

### Microsoft Store (MSIX)

- `scripts/build-msix.ps1`:
  1. `FINDERWIN_STORE=1` + Cargo feature `store` + `tauri.store.conf.json`, `CARGO_TARGET_DIR=target/store`;
  2. assety z `app-icon.png`, AppxManifest, makepri;
  3. `makeappx` → nepodepsaný `bundle/msix/Dirwise_<verze>.0_x64.msix`.
- `-TestSign` jen pro lokální test (WACK), nikdy do Storu. `-SkipBuild` použije hotové exe.
- Identita se nemění: `Identity Name krystof02.Finder-Win`, `Application Id FinderWin`, Publisher CN z Partner Center. `PublisherDisplayName` „Arcly Studio“.
- Store build nemá kontrolu aktualizací ani žádné síťové požadavky. Má vlastní data i cache a při prvním startu převezme nastavení z NSIS verze.
- Texty listingu jsou v `docs/store-listing.md`. Pravidla ochranné známky (Store 10.1.1.1, 10.1.1.4, 10.1.3) jsou v CLAUDE.md – v názvu, UI, README ani textech pro Store nesmí být jména cizích produktů.

### Kontrola aktualizací (`src/lib/updates.ts`)

- Běží jen mimo Store build, při zapnutém `updates.check` a nejvýš jednou za 24 h, až po zobrazení okna.
- Jeden GET na `https://api.github.com/repos/arcly-studio/dirwise/releases/latest`.
- Proužek se ukáže, když je verze novější a URL projde regexem `RELEASE_PAGE`. Ten přijímá 3 prefixy: arcly-studio/dirwise, krystof2-ops/dirwise, krystof2-ops/finder-win.
- Verze ≤ 1.6.0 dostanou URL s `/arcly-studio/` a zamítnou ji, takže se o nových verzích nedozví. Mostové repo `krystof2-ops/finder-win` se nearchivuje.
- Po chybě se `lastCheck` neuloží, kontrola se zkusí při dalším startu. „Skrýt“ schová proužek do restartu.

---

## 10. CI (`.github/workflows/`)

| Workflow | Spouštěč | Co dělá |
|---|---|---|
| `release.yml` | push tagu `v*` | build NSIS přes tauri-action → draft release (jen `GITHUB_TOKEN`) |
| `winget-manifest.yml` | `release: published`, ruční s `tag` | PR s manifestem + odeslání do microsoft/winget-pkgs |
| `pages.yml` | push do master (`site/**`, screenshoty, brand, README, package.json, ikony), ruční, cron denně 4:17 UTC | build Astro webu (Node 22, `GITHUB_TOKEN` kvůli Discussions) → GitHub Pages; běží jen s `vars.PAGES_ENABLED == 'true'` nebo ručně |

Issue šablony v `.github/ISSUE_TEMPLATE/`:
- `bug_report.yml` – verze, zdroj instalace, verze Windows, popis;
- `feature_request.yml`;
- `config.yml` – odkazy „Support and known issues“ a „Ideas and voting“ na web.

---

## 11. Web (`site/`)

Astro, en `/` + cs `/cs/`, GitHub Pages na `https://arcly-studio.github.io/dirwise/`. Stará adresa krystof2-ops.github.io vrací 404.

**Stránky** (každá en i cs)
- Úvod: `Page.astro` = Hero, LiveDemo, bento 8 karet funkcí z výřezů `docs/screenshots/`, video `public/media/dirwise-demo.mp4`, zkratky parsované z README a FAQ.
- `privacy/` – drž v souladu s `PRIVACY.md`.
- `support/`
- `ideas/` – nápady z GitHub Discussions (kategorie Ideas) seřazené podle hlasů; giscus se načte až po kliknutí, vlákno = diskuse #15.

**Kostra a komponenty**
- `Layout.astro` + `Nav.astro`: hreflang, canonical, OG, přepínač jazyka, patička „© 2026 Arcly Studio · MIT“.
- `LiveDemo.astro` je okno aplikace v HTML/CSS se smyčkou ~10,5 s. Běží jen ve viditelné kartě, s „omezit pohyb“ je statické.

**Knihovny (`site/src/lib/`)**
- `release.ts` – verze a velikost instalátoru z releases/latest, fallback z `package.json` a lokálního bundle.
- `ideas.ts` – GraphQL. Lokálně bez tokenu vrátí null; v CI při chybě API build selže.
- `winget.ts`, `shortcuts.ts`, `links.ts`, `icons.ts`.

**Build**
- `prepare.mjs` vyrobí OG obrázek, favicony, hvězdy a českou podmnožinu Inter.
- `check-words.mjs` po buildu hledá v HTML zakázaná slova (jména cizích produktů a „explorer / průzkumník“). Toleruje jen URL a `com.krystof2ops.finderwin`.

**Animace**
- `site/src/scripts/motion.ts` (GSAP + Lenis). Na desktopu se načte hned, na mobilu až při první interakci.
- Bez JS a s „omezit pohyb“ nic nezůstane skryté.
- Podrobnosti a pasti jsou v `site/README.md`.

`src/index.css` aplikace má `@source not "../site"`, aby Tailwind neprocházel web.

---

## 12. Média a dokumentace (`docs/`, `scripts/docs-media/`)

### Výstupy

- `docs/screenshots/*.png` – 10 scén, 1280×800, bezztrátové PNG: hero-dark, hero-light, split-view, command-palette, previews, transparency, columns, tabs, recycle-bin, extensions.
- `docs/store/` – 1920×1080 pro Store. `docs/store/hero/` – „super hero art“.
- `docs/demo.gif` – 960 px, ~30 s.
- `docs/buttons/` – SVG tlačítka ke stažení.
- `docs/brand/` – profilovky a bannery.
- `docs/demo/` – demo data, jen lokálně (v `.gitignore`).

### Skripty

Jen node, Python na stroji není. Přes CDP se ovládá běžící dev build na portu 9333.

| Skript | Účel |
|---|---|
| `cdp.mjs`, `setup.mjs`, `mksettings.mjs`, `demo-conf.json` | CDP klient, patch IPC na `C:\Demo`, demo nastavení, oddělený identifier |
| `shots.mjs` | screenshoty (`--store` pro Store, argumentem jedna scéna) |
| `demo.mjs` | `docs/demo.gif` (ffmpeg gdigrab ze skutečné obrazovky) |
| `shorts.mjs` | 9 vertikálních videí 1080×1920 pro Shorts / TikTok / Reels |
| `opensource-short.mjs` | short ze stránek GitHubu (headless Chrome, port 9336) |
| `motion.mjs` | motion-design video 18 s na 120 BPM (port 9335), animace, ne screencast |
| `promo.mjs` | reklamní video ~31 s na 124 BPM, `portrait` / `landscape`, skutečné záběry + překryvná vrstva (port 9334) |
| `music.mjs` | výměna hudební stopy ve videu |
| `store-hero.mjs` | hero art pro Store (`--variant icons|columns`) |
| `photos.mjs` | doplní demo fotky (52 položek v `Summer 2026`) |
| `wallpaper.mjs`, `screen.ps1` | testovací tapeta, okna nahoru / dolů, snímek obrazovky |
| `buttons.mjs`, `brand.mjs` | download tlačítka, grafika pro sociální sítě |

### Pravidla a umístění

- Postup a pasti jsou v CLAUDE.md, sekce *Screenshoty a demo*.
- Jen skutečné snímky, nic skládaného.
- Testy s Košem smí trvale mazat jen vlastní soubory, ověřené podle cesty a času smazání.
- Výstupy videí a hudba leží v ignorované složce `dirwise-socialni-site/`. `promo.mjs` bere logo ze sourozeneckého repa `../arcly-studio/`.

---

## 13. Konvence (výtah z CLAUDE.md)

- **Texty UI** jen přes `t()` s klíči v `cs.ts` i `en.ts`, hlídá `npm run i18n:check`. Komentáře v kódu česky, soubory LF (výjimka: `*.ps1`, `*.bat` a `*.cmd` jsou CRLF podle `.gitattributes`).
- **Chyby:** Rust vrací `AppError { key, args }`, překládá frontend.
- **Commandy:** `#[tauri::command(async)]`, argumenty `invoke` v camelCase.
- **Commity:** „Fáze N.x: …“, vydání „Release X.Y.Z“. Bez push a tagů bez pokynu.
- **Dokumentace:** README vždy v obou verzích. Changelog jen v `CHANGELOG.md`.
- **Bez schválení:** žádné nové nativní závislosti ani víc než 150 řádků Rustu bez schváleného plánu. Žádná telemetrie a žádné další síťové požadavky.
- **Interní názvy, které zůstávají:** identifier `com.krystof2ops.finderwin`, env `FINDERWIN_STORE`, MIME `application/x-finder-win*`, zpráva `finderWinDrop:`, localStorage `finder-*`, winget ID, MSIX identita, LICENSE.

### Testy a build

```bash
npm run build
```

```bash
npx tsc --noEmit
```

V `src-tauri`:

```bash
cargo clippy -- -D warnings
```

```bash
cargo test
```

Skutečný Koš testuje jen `cargo test -- --ignored`.

```bash
npm run tauri dev
```

```bash
npm run tauri build
```

Instalátor vznikne v `src-tauri/target/release/bundle/nsis/`.

**Živé testy:**
- Dev spustit s `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9333`, pak CDP přes `http://127.0.0.1:9333/json/list`.
- UAC výzvu přes CDP potvrdit nejde, testuje se ručně.
- Když běží `dirwise.exe`, build přepisující binárku selže; použít jiný `CARGO_TARGET_DIR`.
- Osiřelý vite drží port 1420.

---

## 14. Historie verzí (stručně)

| Verze | Datum | Hlavní změny |
|---|---|---|
| 1.0.0 | 28. 9. 2026 | první veřejné vydání (ještě jako Finder-Win) |
| 1.1.0 | 1. 10. | vícenásobný výběr, ovládání klávesnicí, dialog kolize, ikony ze shellu, virtualizace, animace |
| 1.2.0 / 1.2.1 | 2. / 4. 10. | anglické UI a přepínač jazyka, plurály; nová ikona |
| 1.3.0 | 7. 10. | záložky, schránka Windows, drop z Průzkumníku, Zpět/Znovu, winget, kontrola aktualizací (**bez tagu**) |
| 1.4.0 | 7. 10. | rozdělené okno, paleta Ctrl+K a registr příkazů, náhledy videí a PDF, volba terminálu, český instalátor |
| 1.4.1 / 1.4.2 | 9. 10. | oprava dropu; tažení ven (OLE), tlačítko + Nový (ShellNew), PS7 zvlášť, názvy „(2)“ |
| 1.5.0–1.5.2 | 11. 10. | skleněný vzhled, průhlednost okna, kontrast WCAG; oprava prosvítání pod lištami; Koš v sidebaru, Pokračovat jako správce, Shift+Delete |
| 1.6.0 | 14. 10. | přejmenování na **Dirwise**, tlačítka Windows 11 se Snap Layouts, nový sidebar, jen rozmazaná průhlednost (Acrylic), přípony jako v Průzkumníku, responzivní toolbar, tichá odinstalace Finder-Win; vyšla i v Microsoft Storu |
| 1.6.1 | 21. 10. | ikona Sdílet ve stylu Windows 11 (PR #14 od přispěvatele), sjednocené ikony toolbaru, vydavatel Arcly Studio, nové adresy repa a webu |

Další milníky:

| Datum | Co se stalo |
|---|---|
| 15. 10. | web v Astro |
| 16. 10. | repo přejmenováno na `dirwise`; automatické odeslání do winget-pkgs |
| 18. 10. | stránka Ideas |
| 20. 10. | přesun do organizace arcly-studio |
| 24.–26. 10. | motion a promo videa, animace webu (GSAP + Lenis) |
| 27. 10. | README bez jmen cizích produktů |

---

## 15. Plán (`ROADMAP.md`)

- **1.6.2:** velikost ikon malá / střední / velká (64 / 96 / 128 px) v zobrazení Ikony.
  - Ovládání: menu Více → Zobrazit, paleta a Ctrl + kolečko. Ukládá se do settings.json.
  - Po vydání přetočit hero pro Store.
- **Později:**
  - štítky jiným tvarem než barevnými tečkami (např. pilulka);
  - ikona aplikace bez tmavého „squircle“ podkladu, ve stylu Windows 11;
  - dialog kolize s formulacemi Windows (Nahradit / Přeskočit / Ponechat obě).

---

## 16. Nalezené nesrovnalosti a drobný dluh (k 27. 10. 2026)

Nic z toho není opravené, jen zapsané:

**Dokumentace a šablony**
- `ROADMAP.md`:
  - položka „Ikona Sdílet podle Windows 11“ je hotová od 1.6.1, ale v plánu pořád visí;
  - soubor obsahuje jméno cizího systému.
- `site/README.md` ještě zmiňuje, že úvodní věta s cizím produktem smí být v README. Od 27. 10. tam není.
- `CHANGELOG.md` nemá sekci Unreleased; 1.3.0 nemá tag ani odkaz.
- `bug_report.yml` má placeholder verze „1.6.0“.

**CI**
- `release.yml`:
  - používá Node 20, zatímco Pages Node 22;
  - neověřuje tvar tagu (winget workflow bere jen `vX.Y.Z`);
  - tělo releasu obsahuje doslovné „x.y.z“.

**CLAUDE.md**
- Píše, že záložky se ukládají „jen při 2+ záložkách“. Ve skutečnosti i s jednou záložkou při zapnutém rozdělení (`App.tsx:1874`).
- Klíč v settings.json je `extensions`; `extensionMode` je jen název v kódu.

**Kód – frontend**
- Komentář v `commands.ts` u `buildCommands` uvádí `onRun`, ale `App.tsx` ho nepředává; použití se počítá v `onRunCommand` palety.
- Komentář u `transparencyBlur` v `commands.ts` je zastaralý.
- `src/assets/react.svg` je nepoužitý pozůstatek šablony.

**Kód – Rust**
- U `get_file_thumbnail` se pozdní náhled po timeoutu na disk uloží, přestože komentář tvrdí opak.
- `on_com_thread` spouští nové vlákno na každé volání a zaseknutá vlákna zůstávají viset.
- `shell_execute` bere 1,5 s bez odpovědi jako úspěch.
- `get_favorites` čeká na výčet telefonů (MTP) bez timeoutu.
- `cfg(not(windows))` větve v `main.rs` jsou mrtvý kód.
