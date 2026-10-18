// Texty webu. Pravidla jako v aplikaci (CLAUDE.md): žádné „Finder“, „macOS“, „Quick Look“ ani
// „Explorer“/„Průzkumník“ – bez výjimek (web odkazuje Store listing). Hlídá scripts/check-words.mjs.
// Jen pravdivé funkce podle README a PRIVACY.md – žádná vymyšlená čísla ani superlativy.
export type Lang = "en" | "cs";

export type FeatureKey =
  | "columns" | "palette" | "tabs" | "split" | "preview" | "transparency" | "trash" | "extensions";

type Feature = { title: string; text: string; alt: string };
type Faq = { q: string; a: string };

const en = {
  htmlLang: "en",
  ogLocale: "en_US",
  title: "Dirwise – a fast, keyboard-friendly file manager for Windows",
  description:
    "Dirwise is a free, open-source file manager for Windows 10 and 11 with column view, tabs, split view, instant preview and a Ctrl+K command palette. No account, no telemetry.",
  ogAlt: "Dirwise – a fast, keyboard-friendly file manager for Windows",
  skip: "Skip to content",
  langSwitch: "Language",
  mainNav: "Main",
  announceTag: "NEW",
  announce: "Dirwise 1.6 – now on Microsoft Store",
  nav: { features: "Features", download: "Download", faq: "FAQ", ideas: "Ideas", home: "Dirwise home" },
  heroLines: [["BROWSE IN ", "COLUMNS", "."], ["FIND IN SECONDS.", "", ""]] as [string, string, string][],
  heroSub: "A free, open-source file manager for Windows with column view, tabs, split view and a Ctrl+K command palette.",
  storeAlt: "Get it from Microsoft",
  installerBtn: "Download installer",
  soon: "coming soon",
  copy: "Copy",
  copied: "Copied",
  liveLabel: "Live example",
  featuresEyebrow: "Features",
  featuresTitle: "What Dirwise does",
  featuresLead: "A file manager built around the keyboard, with the views and tools you reach for every day.",
  features: {
    columns: {
      title: "Column view",
      text: "Miller columns with a preview pane – browse deep folder trees and see file details without opening anything.",
      alt: "Column view: Pictures, Summer 2026 and a photo preview with its size and dimensions",
    },
    palette: {
      title: "Ctrl+K command palette",
      text: "Find folders, actions and tags in one box; type a path to jump straight there.",
      alt: "Command palette with “dow” typed",
    },
    tabs: {
      title: "Tabs",
      text: "Each tab keeps its own history, view and selection; drop files on a tab to move them there.",
      alt: "Five tabs with different folders, Documents shown as a list",
    },
    split: {
      title: "Split view",
      text: "Ctrl+Shift+D opens two panels side by side; F5 and F6 copy or move to the other one.",
      alt: "Split view: Column view on the left, List view on the right",
    },
    preview: {
      title: "Instant preview",
      text: "Space previews images, PDF, video, audio, text, source code and Markdown.",
      alt: "Column view with a video preview, duration and resolution",
    },
    transparency: {
      title: "Acrylic transparency",
      text: "Optional blurred transparency on Windows 11 22H2 and later, in three strengths.",
      alt: "Dirwise with blurred transparency (Acrylic) over a colorful wallpaper",
    },
    trash: {
      title: "Recycle Bin",
      text: "Browse deleted items with their original location and restore them without overwriting anything.",
      alt: "Recycle Bin with four deleted items, their original location and date deleted",
    },
    extensions: {
      title: "Extensions like in Windows",
      text: "File extensions follow the Windows setting – or show them always or never.",
      alt: "More menu, View, File Extensions submenu with Like Windows, Always and Never",
    },
  } satisfies Record<FeatureKey, Feature>,
  videoEyebrow: "Demo",
  videoTitle: "See it in action",
  videoLabel:
    "Dirwise demo: files scrolling under the glass toolbar, blurred transparency turned on and its strength changed from the Ctrl+K command palette",
  play: "Play demo video",
  pause: "Pause demo video",
  shortcutsEyebrow: "Keyboard",
  shortcutsTitle: "Keyboard shortcuts",
  shortcutsLead: "The essentials. Everything else is in the full list.",
  shortcutKey: "Shortcut",
  shortcutAction: "Action",
  allShortcuts: "All shortcuts",
  faqEyebrow: "FAQ",
  faqTitle: "Questions and answers",
  faq: [
    {
      q: "Is Dirwise free?",
      a: "Yes. Dirwise is free and open source under the MIT license – no ads, no account, nothing to buy.",
    },
    {
      q: "Why does Windows show a SmartScreen warning?",
      a: "The installer from GitHub isn't code-signed, so SmartScreen shows “Windows protected your PC”. Click More info → Run anyway. The Microsoft Store version installs without this warning and updates through the Store.",
    },
    {
      q: "Does Dirwise collect any data?",
      a: "No – no telemetry, no analytics, no crash reports. The GitHub version asks the GitHub API at most once a day whether a new version exists (you can turn it off in More → Check for Updates); the Store version itself makes no network requests. Details are in the privacy policy.",
    },
    {
      q: "Does it work on Windows 10?",
      a: "Yes, on Windows 10 and 11 (x64). Blurred transparency needs Windows 11 22H2 or later – on older systems the option simply isn't offered.",
    },
    {
      q: "How can I contribute or translate?",
      a: "Bug reports, ideas and pull requests are welcome on GitHub. The interface is in English and Czech; texts live in the translation files in src/i18n, so a new language starts with a new file there.",
    },
  ] satisfies Faq[],
  wingetFaq: {
    q: "Can I install it with winget?",
    a: "Yes. Install with winget: winget install krystof2-ops.Dirwise – later versions come with winget upgrade krystof2-ops.Dirwise.",
  } satisfies Faq,
  footer: { github: "GitHub", changelog: "Changelog", support: "Support", ideas: "Ideas", privacy: "Privacy" },
  footerNav: "Links",
  footerNote: "Dirwise is free software under the MIT license.",
};

const cs: typeof en = {
  htmlLang: "cs",
  ogLocale: "cs_CZ",
  title: "Dirwise – rychlý správce souborů pro Windows ovladatelný klávesnicí",
  description:
    "Dirwise je bezplatný open-source správce souborů pro Windows 10 a 11 se sloupcovým zobrazením, záložkami, rozděleným oknem, rychlým náhledem a paletou příkazů Ctrl+K. Bez účtu a bez telemetrie.",
  ogAlt: "Dirwise – rychlý správce souborů pro Windows ovladatelný klávesnicí",
  skip: "Přeskočit na obsah",
  langSwitch: "Jazyk",
  mainNav: "Hlavní",
  announceTag: "NOVÉ",
  announce: "Dirwise 1.6 – nově v Microsoft Storu",
  nav: { features: "Funkce", download: "Stáhnout", faq: "Otázky", ideas: "Nápady", home: "Dirwise – úvod" },
  heroLines: [["PROCHÁZEJ VE ", "SLOUPCÍCH", "."], ["NAJDI ZA VTEŘINU.", "", ""]],
  heroSub: "Bezplatný open-source správce souborů pro Windows se sloupcovým zobrazením, záložkami, rozděleným oknem a paletou příkazů Ctrl+K.",
  storeAlt: "Získat od Microsoftu",
  installerBtn: "Stáhnout instalátor",
  soon: "brzy",
  copy: "Kopírovat",
  copied: "Zkopírováno",
  liveLabel: "Živá ukázka",
  featuresEyebrow: "Funkce",
  featuresTitle: "Co Dirwise umí",
  featuresLead: "Správce souborů stavěný pro klávesnici, se zobrazeními a nástroji, po kterých sáhneš každý den.",
  features: {
    columns: {
      title: "Sloupcové zobrazení",
      text: "Sloupce s panelem náhledu – projdeš i hluboké stromy složek a podrobnosti souboru vidíš bez otevírání.",
      alt: "Sloupcové zobrazení: Obrázky, Summer 2026 a náhled fotky s velikostí a rozměry",
    },
    palette: {
      title: "Paleta příkazů Ctrl+K",
      text: "Složky, akce i štítky najdeš v jednom poli; napiš cestu a jsi tam.",
      alt: "Paleta příkazů s napsaným „dow“",
    },
    tabs: {
      title: "Záložky",
      text: "Každá záložka má vlastní historii, zobrazení i výběr; soubory přesuneš puštěním na záložku.",
      alt: "Pět záložek s různými složkami, Documents jako seznam",
    },
    split: {
      title: "Rozdělené okno",
      text: "Ctrl+Shift+D otevře vedle sebe dva panely; F5 a F6 kopíruje nebo přesouvá do druhého.",
      alt: "Rozdělené okno: vlevo sloupcové zobrazení, vpravo seznam",
    },
    preview: {
      title: "Rychlý náhled",
      text: "Mezerník ukáže obrázky, PDF, video, zvuk, text, zdrojový kód i Markdown.",
      alt: "Sloupcové zobrazení s náhledem videa, délkou a rozlišením",
    },
    transparency: {
      title: "Průhlednost Acrylic",
      text: "Volitelná rozmazaná průhlednost ve Windows 11 22H2 a novějších, ve třech silách.",
      alt: "Dirwise s rozmazanou průhledností (Acrylic) nad barevnou tapetou",
    },
    trash: {
      title: "Koš",
      text: "Smazané položky i s původním umístěním; obnovíš je, aniž by se cokoli přepsalo.",
      alt: "Koš se čtyřmi smazanými položkami, jejich původním umístěním a datem smazání",
    },
    extensions: {
      title: "Přípony jako ve Windows",
      text: "Přípony souborů se řídí nastavením Windows – nebo je ukaž vždy či nikdy.",
      alt: "Menu Více, Zobrazit, podmenu Přípony souborů s volbami Podle Windows, Vždy a Nikdy",
    },
  },
  videoEyebrow: "Ukázka",
  videoTitle: "Podívej se, jak funguje",
  videoLabel:
    "Ukázka Dirwise: soubory se posouvají pod skleněnou lištou, zapnutí rozmazané průhlednosti a změna její síly z palety příkazů Ctrl+K",
  play: "Přehrát ukázku",
  pause: "Pozastavit ukázku",
  shortcutsEyebrow: "Klávesnice",
  shortcutsTitle: "Klávesové zkratky",
  shortcutsLead: "To hlavní. Všechno ostatní je v úplném seznamu.",
  shortcutKey: "Zkratka",
  shortcutAction: "Akce",
  allShortcuts: "Všechny zkratky",
  faqEyebrow: "Otázky",
  faqTitle: "Otázky a odpovědi",
  faq: [
    {
      q: "Je Dirwise zdarma?",
      a: "Ano. Dirwise je zdarma a open source pod licencí MIT – bez reklam, bez účtu a bez placených funkcí.",
    },
    {
      q: "Proč Windows ukazuje varování SmartScreen?",
      a: "Instalátor z GitHubu není digitálně podepsaný, takže SmartScreen ukáže „Systém Windows ochránil váš počítač“. Klikni na Další informace → Přesto spustit. Verze z Microsoft Storu se instaluje bez varování a aktualizuje se přes Store.",
    },
    {
      q: "Sbírá Dirwise nějaká data?",
      a: "Ne – žádná telemetrie, analytika ani hlášení pádů. Verze z GitHubu se nejvýš jednou denně zeptá GitHub API, jestli je nová verze (vypneš v Více → Kontrolovat aktualizace); verze z Microsoft Storu sama žádné síťové požadavky nedělá. Podrobnosti jsou v zásadách ochrany soukromí.",
    },
    {
      q: "Funguje ve Windows 10?",
      a: "Ano, ve Windows 10 i 11 (x64). Rozmazaná průhlednost potřebuje Windows 11 22H2 nebo novější – ve starších systémech se volba prostě nenabízí.",
    },
    {
      q: "Jak přispět nebo přeložit?",
      a: "Chyby, nápady i pull requesty vítáme na GitHubu. Rozhraní je anglicky a česky; texty jsou v překladových souborech v src/i18n, nový jazyk tedy začíná novým souborem tam.",
    },
  ],
  wingetFaq: {
    q: "Jde Dirwise nainstalovat přes winget?",
    a: "Ano. Instalace přes winget: winget install krystof2-ops.Dirwise – další verze pak přes winget upgrade krystof2-ops.Dirwise.",
  },
  footer: { github: "GitHub", changelog: "Seznam změn", support: "Podpora", ideas: "Nápady", privacy: "Soukromí" },
  footerNav: "Odkazy",
  footerNote: "Dirwise je svobodný software pod licencí MIT.",
};

export const texts: Record<Lang, typeof en> = { en, cs };
