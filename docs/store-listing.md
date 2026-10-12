# Microsoft Store listing – Finder-Win

Texty pro Partner Center (Store listing), anglicky a česky. Limity Partner Center: krátký popis ≤ 100 znaků (vlastní rezerva, Partner Center dovolí víc), popis ≤ 10 000, každá feature ≤ 200 znaků, max. 20 features, klíčová slova max. 7 (každé ≤ 30 znaků).

- **Category:** Utilities & tools → File managers (alternativa: Productivity)
- **Privacy policy URL:** https://github.com/krystof2-ops/finder-win/blob/master/PRIVACY.md
- **Website:** https://github.com/krystof2-ops/finder-win
- **Support contact:** https://github.com/krystof2-ops/finder-win/issues
- **Screenshots (1920×1080):** `docs/store/hero-dark.png`, `hero-light.png`, `split-view.png`, `command-palette.png`, `previews.png`, `transparency.png` (snímky Store = viewport 1280×720 se škálováním 1,5, `shots.mjs --store`)
- **System requirements (Additional system requirements):** Windows 10 1809 or later, x64; Microsoft Edge WebView2 Runtime (part of Windows 11, on Windows 10 installed by Windows Update)
- **Store logo:** `src-tauri/icons/Square310x310Logo.png` (nebo `app-icon.png` 1024×1024)

---

## English (en-us)

### Product name
Finder-Win

### Short description (≤ 100)
A clean file manager for Windows: column view, tabs, split view, quick preview and Ctrl+K.

### Description
Finder-Win is a clean, keyboard-friendly file manager for Windows.

Browse deep folder trees in Column view with a preview pane, or switch to Icons and List. Open folders in tabs, each with its own history, view and sorting. Split the window into two panels and copy or move files between them with F5 / F6.

Press Ctrl+K to open the command palette: jump to favorites, recent folders and tabs, run any action, or type a path. Press Space for a quick preview – images, PDF, video, audio, text, source code and Markdown.

Finder-Win works with the real Windows clipboard, so you can copy files to and from other apps such as Outlook or your browser. Drag & drop works both ways: drag files in from other windows or the desktop, and drag them out to other windows, the desktop, a browser upload, Discord or an e-mail. The New button creates folders, text documents and every file type Windows offers in its New menu. Undo and redo cover the last 50 operations, including deletions (restored from the Recycle Bin). The Recycle Bin is right in the sidebar: restore items, delete them permanently or empty it. In protected places, such as the root of the C: drive, choose Continue as Administrator and confirm the Windows prompt.

A translucent glass look is the default. Turn on Transparency in More → Appearance for a transparent window – the desktop and other windows show through the app. Choose the strength from three levels.

Light and dark mode follow Windows. The interface is in English and Czech.

Privacy: no telemetry, no account, no ads. The Microsoft Store version itself makes no network requests – updates come from the Store.

### What's new
Version 1.5.2
- Recycle Bin in the sidebar: see where items came from and when they were deleted, restore them, delete them permanently or empty the Recycle Bin.
- Continue as Administrator: deleting, moving, copying, renaming and creating folders in protected places now asks Windows for confirmation instead of failing.
- Shift+Delete deletes permanently (with confirmation).
- Clearer error messages that name each failed item and the reason.
- With Transparency on, files no longer show through under the top bar and the status bar.

### Features (max 20)
1. Column view with a preview pane, plus Icons and List views
2. Tabs with their own history, view and sorting
3. Split view: two panels, F5 / F6 copy and move between them
4. Command palette (Ctrl+K) for folders, actions, tags and paths
5. Quick preview (Space) for images, PDF, video, audio, text and Markdown
6. Video and PDF thumbnails with duration, resolution and page count
7. Real Windows clipboard; drag & drop to and from other apps, the desktop, browser, Discord and e-mail
8. New button: folder, text document and the Windows New file types
9. Undo / redo for the last 50 file operations
10. Glass look with optional window transparency; light and dark mode that follows Windows; English and Czech
11. Recycle Bin in the sidebar: restore, delete permanently, empty

### Keywords (max 7)
> Pravidlo Store 10.1.3: klíčová slova nesmí obsahovat Mac, macOS, Finder ani Explorer (v žádném jazyce).

file manager, tabbed file manager, file browser, column view, tabs, dual pane, split view

---

## Čeština (cs-cz)

### Název produktu
Finder-Win

### Krátký popis (≤ 100)
Přehledný správce souborů pro Windows: sloupce, záložky, rozdělené okno, rychlý náhled a Ctrl+K.

### Popis
Finder-Win je přehledný správce souborů pro Windows, ovladatelný i klávesnicí.

Hluboké stromy složek procházíš ve sloupcovém zobrazení s náhledovým panelem, nebo přepneš na Ikony a Seznam. Složky otevíráš v záložkách, každá má vlastní historii, zobrazení a řazení. Okno rozdělíš na dva panely a soubory mezi nimi kopíruješ nebo přesouváš klávesami F5 / F6.

Ctrl+K otevře paletu příkazů: skok na oblíbené a nedávné složky či záložky, libovolná akce nebo zadání cesty. Mezerník otevře rychlý náhled – obrázky, PDF, video, zvuk, text, zdrojáky i Markdown.

Finder-Win používá skutečnou schránku Windows, takže soubory kopíruješ z i do jiných aplikací, třeba Outlooku nebo prohlížeče. Přetahování funguje oběma směry: soubory přetáhneš dovnitř z jiných oken nebo z plochy a ven do jiných oken, na plochu, do prohlížeče, Discordu nebo e-mailu. Tlačítko Nový vytvoří složku, textový dokument i jakýkoli typ souboru z nabídky Nový ve Windows. Zpět a Znovu fungují pro posledních 50 operací včetně mazání (obnoví z Koše). Koš je přímo v postranním panelu: položky obnovíš, trvale smažeš nebo koš vysypeš. V chráněných místech, třeba v kořeni disku C:, zvolíš Pokračovat jako správce a potvrdíš výzvu Windows.

Výchozí je skleněný vzhled s poloprůhlednými panely. V Více → Vzhled zapneš Průhlednost: průhledné okno, za aplikací prosvítá plocha a okna. Vybereš sílu ze tří úrovní.

Světlý a tmavý režim se řídí Windows. Rozhraní je česky a anglicky.

Soukromí: žádná telemetrie, žádný účet, žádné reklamy. Verze z Microsoft Storu sama nedělá žádné síťové požadavky – aktualizace přicházejí ze Storu.

### Novinky
Verze 1.5.2
- Koš v postranním panelu: odkud položky pocházejí a kdy byly smazány, obnovení, trvalé smazání i vysypání koše.
- Pokračovat jako správce: mazání, přesun, kopírování, přejmenování a nové složky v chráněných místech si místo chyby vyžádají potvrzení Windows.
- Shift+Delete maže trvale (s potvrzením).
- Srozumitelnější chybové hlášky – u každé položky název a důvod.
- Při zapnuté průhlednosti už pod horní lištou a stavovým řádkem neprosvítají soubory.

### Funkce (max 20)
1. Sloupcové zobrazení s náhledovým panelem, k tomu Ikony a Seznam
2. Záložky s vlastní historií, zobrazením a řazením
3. Rozdělené okno: dva panely, F5 / F6 kopíruje a přesouvá mezi nimi
4. Paleta příkazů (Ctrl+K) pro složky, akce, štítky a cesty
5. Rychlý náhled (mezerník) pro obrázky, PDF, video, zvuk, text a Markdown
6. Náhledy videí a PDF s délkou, rozlišením a počtem stran
7. Skutečná schránka Windows; přetahování z i do jiných aplikací, na plochu, do prohlížeče, Discordu a e-mailu
8. Tlačítko Nový: složka, textový dokument a typy souborů z nabídky Nový ve Windows
9. Zpět / Znovu pro posledních 50 operací
10. Skleněný vzhled s volitelnou průhledností okna; světlý a tmavý režim podle Windows; čeština a angličtina
11. Koš v postranním panelu: obnovení, trvalé smazání, vysypání

### Klíčová slova (max 7)
> Pravidlo Store 10.1.3: klíčová slova nesmí obsahovat Mac, macOS, Finder ani Explorer (v žádném jazyce).

správce souborů, záložky složek, prohlížeč souborů, sloupcové zobrazení, rozdělené okno, dva panely, file manager
