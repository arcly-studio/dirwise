// Texty webu. Pravidla jako v aplikaci (CLAUDE.md): žádné „Finder“, „macOS“, „Quick Look“ ani
// „Explorer“/„Průzkumník“ – výjimkou je jediná věta `inspired` v angličtině. Hlídá scripts/check-words.mjs.
export type Lang = "en" | "cs";

export type FeatureKey = "columns" | "tabs" | "split" | "palette" | "preview" | "transparency";

const en = {
  htmlLang: "en",
  ogLocale: "en_US",
  title: "Dirwise – a fast, keyboard-friendly file manager for Windows",
  description:
    "Dirwise is a free, open-source file manager for Windows 10 and 11 with column view, tabs, split view, instant preview and a Ctrl+K command palette. No account, no telemetry.",
  skip: "Skip to content",
  langSwitch: "Language",
  tagline: "A fast, keyboard-friendly file manager for Windows.",
  lead: "Column view, tabs, split view, instant preview and a Ctrl+K command palette. Free and open source.",
  inspired: "Inspired by the macOS Finder, built for Windows.",
  storeAlt: "Get it from Microsoft",
  download: "Download from GitHub",
  downloadNote: "Installer under 3 MB · Windows 10 and 11 · no admin rights",
  winget: "winget",
  soon: "coming soon",
  copy: "Copy",
  copied: "Copied",
  demoTitle: "See it in action",
  demoLabel:
    "Dirwise demo: files scrolling under the glass toolbar, blurred transparency turned on and its strength changed from the Ctrl+K command palette",
  play: "Play demo video",
  pause: "Pause demo video",
  ogAlt: "Dirwise – a fast, keyboard-friendly file manager for Windows",
  featuresTitle: "Everything within reach",
  features: {
    columns: {
      title: "Column view",
      text: "Miller columns with a preview pane. Browse deep folder trees and see details of every file without opening it.",
      alt: "Column view: Pictures, Summer 2026 and a photo preview with its size and dimensions",
    },
    tabs: {
      title: "Tabs",
      text: "Each tab keeps its own history, view, sorting and selection. Drag to reorder, drop files on a tab to move them there.",
      alt: "Five tabs with different folders, Documents shown as a list",
    },
    split: {
      title: "Split view",
      text: "Ctrl+Shift+D puts two independent panels side by side. F5 and F6 copy or move the selection to the other one.",
      alt: "Split view: Column view on the left, List view on the right",
    },
    palette: {
      title: "Command palette",
      text: "Ctrl+K finds folders, actions and tags. Type a path to jump there, Ctrl+Enter searches files in the current folder.",
      alt: "Command palette with “dow” typed",
    },
    preview: {
      title: "Instant preview",
      text: "Space previews images, PDF, video, audio, text, source code and Markdown. The preview column shows duration, resolution and page count.",
      alt: "Column view with a video preview, duration and resolution",
    },
    transparency: {
      title: "Acrylic transparency",
      text: "Optional blurred transparency on Windows 11 22H2 and later, in three strengths, with text that stays readable on any wallpaper.",
      alt: "Dirwise with blurred transparency (Acrylic) over a colorful wallpaper",
    },
  } satisfies Record<FeatureKey, { title: string; text: string; alt: string }>,
  shortcutsTitle: "Keyboard shortcuts",
  shortcutsLead: "Built for the keyboard. The essentials:",
  shortcutKey: "Shortcut",
  shortcutAction: "Action",
  allShortcuts: "All shortcuts",
  privacyTitle: "Private by design",
  privacy: [
    {
      title: "No telemetry",
      text: "No telemetry or analytics: nothing about you or your files is sent anywhere. The GitHub version asks GitHub once a day whether a new release exists (you can turn it off); the Store version itself makes no network requests.",
    },
    {
      title: "No account",
      text: "Install and go: no sign-in, no ads. It installs for the current user, without administrator rights.",
    },
    {
      title: "Open source",
      text: "MIT licensed. Read the code, build it yourself and report issues on GitHub.",
    },
  ],
  footer: { github: "GitHub", changelog: "Changelog", privacy: "Privacy", issues: "Issues" },
  footerNav: "Links",
  footerNote: "Dirwise is free software under the MIT license.",
};

const cs: typeof en = {
  htmlLang: "cs",
  ogLocale: "cs_CZ",
  title: "Dirwise – rychlý správce souborů pro Windows ovladatelný klávesnicí",
  description:
    "Dirwise je bezplatný open-source správce souborů pro Windows 10 a 11 se sloupcovým zobrazením, záložkami, rozděleným oknem, rychlým náhledem a paletou příkazů Ctrl+K. Bez účtu a bez telemetrie.",
  skip: "Přeskočit na obsah",
  langSwitch: "Jazyk",
  tagline: "Rychlý správce souborů pro Windows ovladatelný klávesnicí.",
  lead: "Sloupcové zobrazení, záložky, rozdělené okno, rychlý náhled a paleta příkazů Ctrl+K. Zdarma a open source.",
  inspired: "",
  storeAlt: "Získat od Microsoftu",
  download: "Stáhnout z GitHubu",
  downloadNote: "Instalátor do 3 MB · Windows 10 a 11 · bez práv správce",
  winget: "winget",
  soon: "brzy",
  copy: "Kopírovat",
  copied: "Zkopírováno",
  demoTitle: "Podívej se, jak funguje",
  demoLabel:
    "Ukázka Dirwise: soubory se posouvají pod skleněnou lištou, zapnutí rozmazané průhlednosti a změna její síly z palety příkazů Ctrl+K",
  play: "Přehrát ukázku",
  pause: "Pozastavit ukázku",
  ogAlt: "Dirwise – rychlý správce souborů pro Windows ovladatelný klávesnicí",
  featuresTitle: "Všechno po ruce",
  features: {
    columns: {
      title: "Sloupcové zobrazení",
      text: "Sloupce s panelem náhledu. Projdeš i hluboké stromy složek a u každého souboru hned vidíš podrobnosti, i bez otevření.",
      alt: "Sloupcové zobrazení: Obrázky, Summer 2026 a náhled fotky s velikostí a rozměry",
    },
    tabs: {
      title: "Záložky",
      text: "Každá záložka má vlastní historii, zobrazení, řazení i výběr. Pořadí změníš přetažením, soubory přesuneš puštěním na záložku.",
      alt: "Pět záložek s různými složkami, Documents jako seznam",
    },
    split: {
      title: "Rozdělené okno",
      text: "Ctrl+Shift+D otevře vedle sebe dva nezávislé panely. F5 a F6 zkopíruje nebo přesune výběr do druhého z nich.",
      alt: "Rozdělené okno: vlevo sloupcové zobrazení, vpravo seznam",
    },
    palette: {
      title: "Paleta příkazů",
      text: "Ctrl+K najde složky, akce i štítky. Napiš cestu a jsi tam, Ctrl+Enter hledá soubory v aktuální složce.",
      alt: "Paleta příkazů s napsaným „dow“",
    },
    preview: {
      title: "Rychlý náhled",
      text: "Mezerník ukáže obrázky, PDF, video, zvuk, text, zdrojový kód i Markdown. Sloupec náhledu ukazuje délku, rozlišení a počet stran.",
      alt: "Sloupcové zobrazení s náhledem videa, délkou a rozlišením",
    },
    transparency: {
      title: "Průhlednost Acrylic",
      text: "Volitelná rozmazaná průhlednost ve Windows 11 22H2 a novějších, ve třech silách a s textem čitelným na jakékoli tapetě.",
      alt: "Dirwise s rozmazanou průhledností (Acrylic) nad barevnou tapetou",
    },
  },
  shortcutsTitle: "Klávesové zkratky",
  shortcutsLead: "Stavěný pro klávesnici. To hlavní:",
  shortcutKey: "Zkratka",
  shortcutAction: "Akce",
  allShortcuts: "Všechny zkratky",
  privacyTitle: "Soukromí v základu",
  privacy: [
    {
      title: "Bez telemetrie",
      text: "Žádná telemetrie ani analytika: nic o tobě ani o tvých souborech se nikam neposílá. Verze z GitHubu se jednou denně zeptá GitHubu, jestli je nová verze (dá se vypnout); verze z Microsoft Storu sama žádné síťové požadavky nedělá.",
    },
    {
      title: "Bez účtu",
      text: "Nainstalovat a hotovo: žádné přihlašování ani reklamy. Instaluje se jen pro aktuálního uživatele, bez práv správce.",
    },
    {
      title: "Open source",
      text: "Licence MIT. Kód si můžeš přečíst i sestavit, chyby hlásit na GitHubu.",
    },
  ],
  footer: { github: "GitHub", changelog: "Seznam změn", privacy: "Soukromí", issues: "Hlášení chyb" },
  footerNav: "Odkazy",
  footerNote: "Dirwise je svobodný software pod licencí MIT.",
};

export const texts: Record<Lang, typeof en> = { en, cs };
