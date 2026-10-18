<div align="center">

<img src="src-tauri/icons/128x128.png" width="96" height="96" alt="Ikona Dirwise">

# Dirwise

**Rychlý správce souborů pro Windows ovladatelný klávesnicí – sloupcové zobrazení, záložky, rozdělené okno, rychlý náhled a Ctrl+K.**

[English](README.md) · **Čeština** · [Web](https://krystof2-ops.github.io/dirwise/cs/) · [Podpora](https://krystof2-ops.github.io/dirwise/cs/support/) · [Nápady](https://krystof2-ops.github.io/dirwise/cs/ideas/) · [Soukromí](https://krystof2-ops.github.io/dirwise/cs/privacy/)

[![Poslední verze](https://img.shields.io/github/v/release/krystof2-ops/dirwise)](https://github.com/krystof2-ops/dirwise/releases/latest)
[![Stažení](https://img.shields.io/github/downloads/krystof2-ops/dirwise/total)](https://github.com/krystof2-ops/dirwise/releases)
[![Licence](https://img.shields.io/github/license/krystof2-ops/dirwise)](LICENSE)
![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?logo=windows)
[![Listed on Open Source Alternatives](https://www.opensourcealternatives.to/badge-osa.svg)](https://www.opensourcealternatives.to)

<p align="center"><a href="https://github.com/krystof2-ops/dirwise/releases/latest"><img src="docs/buttons/download-cs.svg" alt="Stáhnout pro Windows" height="68"></a></p>

<p align="center"><a href="https://apps.microsoft.com/detail/9MZ67726S65X?hl=cs-cz&gl=CZ&mode=direct"><img src="https://get.microsoft.com/images/cs%20dark.svg" alt="Získat od Microsoftu" width="200"></a></p>

<!-- winget:hero -->nebo: `winget install krystof2-ops.Dirwise` *(brzy)*<!-- /winget -->

<img src="docs/demo.gif" width="960" alt="Ukázka Dirwise: soubory zajíždějí pod skleněný toolbar, zapnutí rozmazané průhlednosti a změna její síly z palety Ctrl+K">

</div>

Dirwise (dříve Finder-Win) je inspirován macOS Finderem, vytvořený pro Windows.

## Proč Dirwise?

- **Sloupcové zobrazení** – Miller columns s náhledovým panelem, pro procházení hlubokých stromů složek. Průzkumník nic takového nemá.
- **Klávesnice na prvním místě** – Ctrl+K otevře paletu příkazů se složkami, akcemi a štítky; mezerník otevře náhled.
- **Dva panely v jednom okně** – rozdělené okno s kopírováním a přesunem přes F5 / F6, bez druhého okna Průzkumníku.
- **Malý a lokální** – instalátor pod 3 MB (Tauri: Rust + WebView2), instaluje se pro uživatele bez práv správce, bez účtu a bez telemetrie.

## Funkce

### Procházení po svém

<picture>
  <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/hero-light.png">
  <img src="docs/screenshots/hero-dark.png" alt="Zobrazení Ikony s náhledy obrázků a videí a třemi záložkami">
</picture>

- Zobrazení **Ikony, Seznam a Sloupce**; náhledy obrázků, videí (s odznakem ▶) a PDF.
- **Záložky** – zaoblené čipy, každá s vlastní historií, zobrazením, řazením a výběrem; přerovnání tažením, soubor puštěný na záložku se přesune do její složky.
- **Přípony jako v Průzkumníku** – zástupci (.lnk, .url) je neukazují nikdy, ostatní soubory podle nastavení Windows „Skrýt přípony známých typů souborů“, nebo zvol Vždy / Nikdy ve Více → Zobrazit → Přípony souborů. Přejmenování skrytou příponu zachová.
- **Světlý a tmavý režim** podle Windows, nebo nastavený v Více → Vzhled. Rozhraní česky a anglicky.

### Skleněný vzhled a průhlednost

![Dirwise s rozmazanou průhledností (Acrylic) nad barevnou tapetou](docs/screenshots/transparency.png)

- **Skleněný vzhled jako výchozí** – titulek, toolbar a záložky leží na jedné poloprůhledné rozmazané desce a výpis pod ní při scrollu prosvítá; skleněná jsou i menu, paleta příkazů a tooltipy.
- **Rozmazané průhledné okno** – za aplikací rozmazaně prosvítá plocha a ostatní okna (Acrylic jako ve Windows 11), ve třech silách: jemná, střední a silná. Text drží kontrast WCAG AA nad světlou, tmavou i pestrou tapetou. Ve výchozím stavu vypnuté.
- **Zapnutí** v Více → Vzhled → Průhlednost, nebo z palety příkazů (Ctrl+K, napiš „průhlednost“).
- Potřebuje Windows 11 22H2 nebo novější se zapnutými Efekty průhlednosti; ve Windows 10 a starších Windows 11 se volba nenabízí. Okno bez fokusu je plné, jako ostatní okna Windows.

### Rozdělené okno

![Rozdělené okno: vlevo Sloupce, vpravo Seznam](docs/screenshots/split-view.png)

- **Ctrl+Shift+D** rozdělí okno na dva nezávislé panely; `Tab` mezi nimi přepíná.
- **F5 / F6** zkopíruje nebo přesune výběr do druhého panelu, jako v Total Commanderu.
- Poměr panelů jde táhnout dělicí čárou (dvojklik = 1:1) a ukládá se.

### Paleta příkazů

![Paleta příkazů s napsaným „dow“](docs/screenshots/command-palette.png)

- **Ctrl+K** hledá složky (Rychlý přístup, nedávné, záložky, podsložky), akce a štítky.
- `~` nebo cestu můžeš zadat přímo; **Ctrl+Enter** hledá soubory v aktuální složce.
- U akcí je vidět klávesová zkratka a nejpoužívanější příkazy jsou nahoře.

### Náhledy

![Sloupcové zobrazení s náhledem videa, délkou a rozlišením](docs/screenshots/previews.png)

- Náhledový sloupec ukáže náhled a u videí **délku a rozlišení**, u obrázků rozměry, u PDF počet stran.
- **Mezerník** otevře náhled pro obrázky, PDF, video, zvuk, text a zdrojáky i vykreslený Markdown; ←/→ přepíná soubory.
- Náhledy a ikony se cachují lokálně v `%LOCALAPPDATA%\dirwise`.

### Běžná práce se soubory

- **Skutečná schránka Windows** – Ctrl+C / Ctrl+X / Ctrl+V fungují s Průzkumníkem, Outlookem i prohlížeči.
- **Drag & drop oběma směry** – soubory jde pustit dovnitř z Průzkumníku nebo z plochy a přetáhnout ven do Průzkumníku, na plochu, do uploadu v prohlížeči, do Discordu nebo do e-mailu. Výchozí je kopie, `Shift` přesouvá.
- **Tlačítko + Nový** v toolbaru – Složka, Textový dokument a všechny typy z nabídky Nový ve Windows (Word, Excel, ZIP …); také v kontextovém menu (Nový ▸) a v paletě příkazů. Kolize názvů dostanou „(2)“ jako v Průzkumníku.
- **Terminály** – PowerShell 7 a Windows PowerShell jsou v Více → Terminál zvlášť; `Shift`+klik na Otevřít v terminálu nabídne libovolný nainstalovaný terminál.
- **Zpět / Znovu** (Ctrl+Z / Ctrl+Y) pro posledních 50 přejmenování, přesunů, kopií, nových položek, smazání a změn štítků.
- **Koš** v postranním panelu – seznam smazaných položek (původní umístění, datum, velikost), Obnovit bez přepsání čehokoli, Smazat trvale, Vysypat koš.
- **Pokračovat jako správce** – v chráněných místech (např. kořen C:\) to nabídne mazání, přesun, vkládání, přejmenování i nová složka a Windows požádá o potvrzení (UAC), jako Průzkumník; aplikace sama jako správce nikdy neběží.
- **Titulková lišta jako ve Windows 11** – vlevo malá ikona a název, vpravo standardní tlačítka Minimalizovat / Maximalizovat / Zavřít včetně Snap Layouts při najetí na Maximalizovat.
- **Postranní panel** s Rychlým přístupem (připnuté složky; v kontextovém menu „Připnout do Rychlého přístupu“), Tento počítač (Plocha, Stažené, Dokumenty …), Cloudem, Disky (s Košem), Nedávnými a Štítky. Disky se aktualizují po připojení USB. V zobrazení Ikony se při výběru podbarví celá dlaždice.
- **Stavový řádek** ukazuje výběr a volné místo, např. „1 z 52 vybráno · volno 120,7 GB“.

## Klávesové zkratky

| Zkratka | Akce |
|---|---|
| `Ctrl+T` | Nová záložka |
| `Ctrl+W` | Zavřít záložku |
| `Ctrl+K` | Paleta příkazů (`Ctrl+Enter` = hledat soubory) |
| `Ctrl+Shift+D` | Rozdělit okno na dva panely |
| `F5` / `F6` | Kopírovat / přesunout výběr do druhého panelu (rozdělené okno) |
| `Mezerník` | Náhled |
| `Ctrl+Z` / `Ctrl+Y` | Zpět / znovu |

<details>
<summary>Všechny zkratky</summary>

| Zkratka | Akce |
|---|---|
| `↑` `↓` `←` `→` | Posun výběru (Ikony po mřížce, Sloupce mezi sloupci) |
| `Shift` + šipky / klik | Rozšířit výběr |
| `Ctrl` + klik | Přidat / odebrat položku z výběru |
| `Home` / `End`, `PgUp` / `PgDn` | První / poslední položka, o stránku nahoru / dolů |
| Psaní písmen | Skok na položku, jejíž název jimi začíná |
| `Enter` / `Ctrl+↓` | Otevřít vybranou položku |
| `Backspace` / `Alt+←` | Zpět |
| `Alt+→` | Vpřed |
| `Alt+↑` / `Ctrl+↑` | Nadřazená složka |
| `Ctrl+L` | Editace cesty |
| `Ctrl+F` | Pole hledání (`Enter` = rekurzivní hledání, `↓` = do výsledků, `Esc` = vymazat) |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Kopírovat / vyjmout / vložit (schránka Windows) |
| `Ctrl+Shift+Z` | Znovu |
| `Tab` | Přepnout aktivní panel (rozdělené okno) |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Další / předchozí záložka |
| `Ctrl+1` … `Ctrl+9` | Záložka 1–8 / poslední záložka |
| `Ctrl+D` | Duplikovat |
| `Ctrl+A` | Vybrat vše (ne ve sloupcovém zobrazení) |
| `Ctrl+Shift+N` | Nová složka |
| `F2` | Přejmenovat |
| `Delete` | Přesunout do koše (v Koši: smazat trvale) |
| `Shift+Delete` | Smazat trvale (s potvrzením) |
| `Ctrl+R` / `F5` | Obnovit (`F5` mimo rozdělené okno) |
| `Ctrl+Shift+.` | Zobrazit / skrýt skryté soubory |
| `Esc` | Zrušit výběr; zavřít výsledky hledání; zavřít menu a dialogy |
| `←` / `→`, `Esc` | Předchozí / další soubor, zavřít (v náhledu) |
| Tlačítko myši 4 / 5 | Zpět / vpřed |
| Prostřední klik na složku / záložku | Otevřít v nové záložce / zavřít záložku |

</details>

## Instalace

1. Stáhni `Dirwise_…_x64-setup.exe` z [poslední verze](https://github.com/krystof2-ops/dirwise/releases/latest) a spusť ho. Instaluje se jen pro aktuálního uživatele, práva správce nejsou potřeba.
2. Instalátor není digitálně podepsaný, takže Windows SmartScreen ukáže „Systém Windows ochránil váš počítač“. Klikni na **Další informace** → **Přesto spustit**.

Aktualizace z Finder-Win 1.5.x: instalátor Dirwise starou verzi sám tiše odinstaluje (žádná druhá instalace vedle) a nastavení zůstane. Připnutí na hlavním panelu je potřeba udělat znovu.

Nebo si aplikaci nainstaluj z [Microsoft Storu](https://apps.microsoft.com/detail/9MZ67726S65X?hl=cs-cz&gl=CZ) – bez varování SmartScreen, aktualizace přicházejí přes Store.

<!-- winget:install -->Připravujeme: **winget** (`winget install krystof2-ops.Dirwise`; manifest je ve složce [`winget/`](winget)).<!-- /winget -->

<details>
<summary>Známá omezení</summary>

- Jen pro Windows.
- Historie Zpět platí jen za běhu aplikace. Soubor přepsaný volbou *Nahradit* se vrátit nedá.
- Telefony a fotoaparáty (MTP) jsou v panelu vidět, ale otevřou se v Průzkumníku Windows.
- Rekurzivní hledání porovnává jen názvy souborů a končí na 500 výsledcích.
- Záložky ano, víc oken ne.

</details>

## Soukromí

Dirwise dělá jediný druh síťového požadavku: nejvýš jednou denně se zeptá GitHub API (`api.github.com/repos/krystof2-ops/dirwise/releases/latest`), jestli existuje novější verze, a pokud ano, ukáže proužek s odkazem na stránku vydání. Žádná telemetrie, nic o tobě ani o tvých souborech se neodesílá. Vypnout jde v Více → Kontrolovat aktualizace. Úplné [zásady ochrany soukromí](https://krystof2-ops.github.io/dirwise/cs/privacy/).

## Sestavení ze zdrojáků

Potřebuješ [Node.js](https://nodejs.org/) 20+, [Rust](https://rustup.rs/) (stable), [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) („Vývoj desktopových aplikací pomocí C++“) a WebView2 (ve Windows 10/11 už je).

```powershell
npm install
npm run tauri dev     # vývojový režim
npm run tauri build   # instalátor → src-tauri/target/release/bundle/nsis/
```

## Přispívání

Chyby a pull requesty vítány v [Issues](https://github.com/krystof2-ops/dirwise/issues); vylepšení navrhuj a hlasuj pro ně na stránce [Nápady](https://krystof2-ops.github.io/dirwise/cs/ideas/); pomoc a známé problémy jsou na stránce [Podpora](https://krystof2-ops.github.io/dirwise/cs/support/). Před PR spusť `npm run build` a v `src-tauri` `cargo clippy -- -D warnings` a `cargo test`. Texty UI jdou přes překlady v `src/i18n/` (čeština a angličtina). Bezpečnostní problémy: viz [SECURITY.md](SECURITY.md).

Dirwise vzniká s pomocí AI (Claude Code). Autor řídí návrh, testuje a kontroluje každou verzi.

Seznam změn je v [CHANGELOG.md](CHANGELOG.md) (anglicky).

## Licence

[MIT](LICENSE)
