// Animační vrstva webu: GSAP (ScrollTrigger, SplitText) + Lenis (plynulý scroll).
// Načítá ji Layout.astro až v JS (desktop hned, mobil po `load`), takže bez JS, při chybě nebo s „omezit
// pohyb“ je všechno vidět. Počáteční skryté stavy drží CSS jen pod `html[data-motion="pending"]`
// (site.css); tady se přepnou na inline styly GSAPu a atribut se změní na "on".
// Pravidla: jen transform a opacity, každý prvek se objeví jen jednou (kromě scrub efektů),
// délky 0,6–0,9 s s ease-out. Hero nadpis po slovech z masky (~0,9 s).
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

/*! Bundled third-party code (site/THIRD-PARTY-LICENSES.md):
 * GSAP 3.15.0 (gsap, ScrollTrigger, SplitText) – Copyright 2008-2026, GreenSock. All rights reserved.
 *   Subject to the terms at https://gsap.com/standard-license
 * Lenis 1.3.27 – Copyright (c) 2024 darkroom.engineering – MIT License
 *   https://github.com/darkroomengineering/lenis/blob/main/LICENSE
 */
gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const EASE = "power3.out";
/** Nad šířkou 768 px plné animace (hero intro, parallax, Lenis); pod ní jen jemné odhalení sekcí. */
const DESKTOP = "(min-width: 768px)";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

/** Prvky odhalované při scrollu: na úvodu a Nápadech `data-reveal`, na textových stránkách podle tříd. */
const REVEAL = "[data-reveal], .doc-head, .doc > section, .foot";

let mm: gsap.MatchMedia | null = null;
let introDone = false;
/** Do tohoto času (performance.now) se navigace neschovává – plynulý skok na kotvu, hash po načtení. */
let navHoldUntil = 0;
let lenis: Lenis | null = null;

/** Všechno vrátit (inline styly GSAPu, SplitText, Lenis) a ukázat obsah bez animací – při jakékoli chybě. */
export function abort() {
  try {
    mm?.revert();
  } catch {
    /* revert sám selhal – aspoň sundat atribut níž */
  }
  mm = null;
  html.removeAttribute("data-motion");
}

export function init() {
  // Pojistka v Layout.astro už atribut sundala (pomalá síť) nebo platí „omezit pohyb“ → nic neanimovat.
  if (html.dataset.motion !== "pending" || html.dataset.motionInit) return;
  html.dataset.motionInit = "1";
  if (location.hash) navHoldUntil = performance.now() + 1500;

  try {
    mm = gsap.matchMedia();
    // Callback běží jen při shodě aspoň jedné podmínky – desktop + mobile pokrývají všechny šířky.
    mm.add(
      { desktop: DESKTOP, mobile: "not all and (min-width: 768px)", fine: "(hover: hover) and (pointer: fine)", reduce: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const { desktop, fine, reduce } = ctx.conditions as Record<string, boolean>;
        if (reduce) {
          html.removeAttribute("data-motion");
          return;
        }
        // Posluchače svázané s tímto během – při přepnutí desktop/mobil nebo „omezit pohyb“ se odregistrují.
        const ac = new AbortController();
        const signal = ac.signal;
        let heroParts: HeroParts | null = null;
        let ro: ResizeObserver | null = null;
        try {
          // Počáteční stavy inline (CSS pod "pending" je drží jen do této chvíle).
          // Na mobilu se modul načítá až po interakci – skrýt jen to, co je ještě pod oknem (nic neblikne).
          const unseen = (el: Element) => desktop || el.getBoundingClientRect().top > innerHeight;
          const revealTargets = $$(REVEAL).filter((el) => !el.dataset.revealed && unseen(el));
          // Patička jen prolne: posun dolů by na krátké stránce (Nápady) prodloužil dokument, objevil by se
          // posuvník a obsah by uskočil (CLS). Ostatní prvky jsou nad ní s rezervou.
          if (revealTargets.length) gsap.set(revealTargets, { opacity: 0, y: (_: number, el: Element) => revealY(el), scale: (_: number, el: Element) => (isCard(el) ? 0.94 : 1) });
          // Intro jen při prvním zobrazení nahoře – ne po přepnutí z mobilu, po odscrollování ani při kotvě
          // v adrese (/#faq: prohlížeč stránku hned posune k cíli).
          if (desktop && !introDone && scrollY < 50 && !targetOf(location.hash)) heroParts = setupHero();
          introDone = true;
          html.dataset.motion = "on";

          if (desktop) {
            if (fine) lenis = setupLenis();
            if (heroParts) heroIntro(heroParts);
            heroBackdrop(!!heroParts);
            liveParallax();
            cardsParallax();
            videoScale();
            if (fine) magneticBadge(signal);
          }
          reveals(revealTargets, signal);
          keyCaps(unseen);
          progressBar();
          hideOnScroll(signal);
          anchors(signal);
          ro = refreshOnResize();
        } catch (err) {
          // Chyba uprostřed nastavení: nenechat obsah s opacity 0 – vrátit vše (mimo tento callback).
          queueMicrotask(abort);
          console.error(err);
        }

        return () => {
          ac.abort();
          ro?.disconnect();
          if (ro) clearTimeout(refreshTimer);
          lenis?.destroy();
          lenis = null;
          html.classList.remove("lenis", "lenis-smooth", "lenis-scrolling", "lenis-stopped");
          heroParts?.split.revert();
        };
      },
    );
  } catch (err) {
    abort();
    console.error(err);
  }
}

/* ---------- Lenis ---------- */

function setupLenis() {
  const l = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  l.on("scroll", ScrollTrigger.update);
  const tick = (time: number) => l.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  const origDestroy = l.destroy.bind(l);
  l.destroy = () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33); // výchozí hodnoty GSAPu
    origDestroy();
  };
  return l;
}

const targetOf = (hash: string) => {
  try {
    const id = decodeURIComponent(hash.slice(1));
    return id ? document.getElementById(id) : null;
  } catch {
    return null;
  }
};

/** Kotvy v menu a „Přeskočit na obsah“: s Lenisem plynule, fokus na cíl jako u nativního skoku.
 *  Odsazení pod navigaci dává jen `scroll-margin-top` v site.css – Lenis ho při scrollTo započítá sám
 *  (stejně jako nativní skok bez Lenisu a hash při načtení z podstránky). */
function anchors(signal: AbortSignal) {
  document.addEventListener(
    "click",
    (e) => {
      if (!lenis || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!a || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const el = targetOf(url.hash);
      if (!el) return;
      e.preventDefault();
      if (url.hash !== location.hash) history.pushState(null, "", url.hash);
      if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
      el.focus({ preventScroll: true });
      navHoldUntil = performance.now() + 1200;
      lenis.scrollTo(el, { duration: 1 });
    },
    { signal },
  );
}

/* ---------- Hero ---------- */

type HeroParts = { split: SplitText; rest: HTMLElement[]; live: HTMLElement | null; accent: HTMLElement | null };

function setupHero(): HeroParts | null {
  const title = $(".hero-title");
  if (!title) return null;
  // Čtený název: řádky oddělené mezerou (aria: "auto" by je slepil – „COLUMNS.FIND“).
  const label = $$(".hero-line", title).map((l) => l.textContent?.trim()).join(" ");
  // Po slovech (ne po písmenech): kerning uvnitř slov zůstane, takže po split.revert() nic neposkočí.
  // Gradient textu přebírá každé slovo (CSS `.hero-title .hw`) – background-clip rodiče na transformovaných
  // potomcích nefunguje; poloha a výška gradientu se dopočítají, aby navazoval jako na celém nadpisu.
  // mask: "words" obalí každé slovo prvkem s overflow: clip (třída hw-mask) – slovo z něj vyjede zespodu.
  const split = new SplitText(title, { type: "words", wordsClass: "hw", mask: "words", aria: "auto" });
  title.setAttribute("aria-label", label);
  const t = title.getBoundingClientRect();
  for (const w of split.words as HTMLElement[]) {
    if (w.closest("em")) continue; // zvýrazněné slovo má vlastní modrý gradient
    const r = w.getBoundingClientRect();
    w.style.backgroundSize = `100% ${t.height}px`;
    w.style.backgroundPosition = `0 ${t.top - r.top}px`;
  }
  gsap.set(split.words, { yPercent: 100 });
  const rest = [".hero-sub", ".hero-cta", ".hero-meta", ".winget"].map((s) => $(s)).filter(Boolean) as HTMLElement[];
  gsap.set(rest, { opacity: 0, y: 18 });
  const live = $(".dw-wrap");
  if (live) gsap.set(live, { opacity: 0, y: 56 });
  return { split, rest, live, accent: $("em", title) };
}

function heroIntro({ split, rest, live, accent }: HeroParts) {
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  // Slova z masky: 0,7 s každé, rozložení startů 0,2 s → nadpis celý za ~0,9 s.
  tl.to(split.words, { yPercent: 0, duration: 0.7, ease: "power4.out", stagger: { amount: 0.2 } }, 0)
    .to(rest, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.35);
  if (live) tl.to(live, { opacity: 1, y: 0, duration: 0.9 }, 0.4);
  if (accent) {
    // Zvýrazněné slovo se „rozsvítí“: světelný pruh přejede zleva doprava (--sweep, CSS .hero-title em .hw)
    // a záře (drop-shadow) se krátce zesílí. Výchozí hodnoty = klidový stav z CSS, po dojetí se nic nezmění.
    const words = $$(".hw", accent);
    tl.fromTo(words, { "--sweep": "100%" }, { "--sweep": "0%", duration: 0.9, ease: "power2.inOut" }, 0.6)
      .to(accent, { filter: "drop-shadow(0 0 44px rgba(74, 168, 255, 0.95))", duration: 0.45, ease: "power2.out", yoyo: true, repeat: 1 }, 0.65);
  }
  tl.eventCallback("onComplete", () => {
    // Původní DOM nadpisu (gradient, výběr textu, aria) a vyčištění inline stylů.
    split.revert();
    gsap.set(rest, { clearProps: "opacity,transform" });
    if (live) gsap.set(live, { clearProps: "opacity,transform" });
  });
}

/** Okno živé ukázky: lehký 3D náklon, který se při scrollu narovná a přiblíží (scrub). */
function liveParallax() {
  const live = $(".live");
  const stage = $(".dw-stage");
  if (!live || !stage) return;
  // Od začátku stránky (náklon 20°, 0,88) do chvíle, kdy je střed okna uprostřed obrazovky (rovně, 1).
  // Perspektiva přímo v transformaci okna – CSS perspective na předkovi by platila jen pro přímé potomky.
  gsap.fromTo(
    stage,
    { rotateX: 20, scale: 0.88, transformPerspective: 1600, transformOrigin: "50% 100%" },
    { rotateX: 0, scale: 1, transformPerspective: 1600, ease: "none", scrollTrigger: { trigger: live, start: 0, end: "center center", scrub: 0.5 } },
  );
}

/** Záře a hvězdy za hero: při načtení se rozsvítí, při scrollu se posunou pomaleji než obsah a ztlumí se. */
function heroBackdrop(intro: boolean) {
  const sky = $(".hero-sky");
  const glow = $(".hero-glow");
  if (!sky || !glow) return;
  if (intro) gsap.fromTo(glow, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.9, ease: EASE, clearProps: "opacity,transform" });
  else gsap.set(glow, { clearProps: "opacity,transform" });
  gsap.to(sky, { y: 160, scale: 1.12, opacity: 0.45, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.5 } });
}

/** Magnetický odznak Store: jde za kurzorem do ±8 px, jen s jemnou myší. */
function magneticBadge(signal: AbortSignal) {
  const badge = $(".store-badge");
  if (!badge) return;
  const xTo = gsap.quickTo(badge, "x", { duration: 0.4, ease: "power3" });
  const yTo = gsap.quickTo(badge, "y", { duration: 0.4, ease: "power3" });
  badge.addEventListener(
    "pointermove",
    (e) => {
      const r = badge.getBoundingClientRect();
      xTo(((e.clientX - (r.left + r.width / 2)) / r.width) * 16);
      yTo(((e.clientY - (r.top + r.height / 2)) / r.height) * 16);
    },
    { signal },
  );
  badge.addEventListener("pointerleave", () => { xTo(0); yTo(0); }, { signal });
}

/* ---------- Sekce ---------- */

const isCard = (el: Element) => el.classList.contains("card");
/** Výchozí posun dolů: karty 60 px, ostatní 40 px, patička 0 (posun by na krátké stránce prodloužil
 *  dokument, objevil by se posuvník a obsah by uskočil – CLS). */
const revealY = (el: Element) => (isCard(el) ? 60 : el.classList.contains("foot") ? 0 : 40);

const show = (els: HTMLElement[], stagger = 0.08) => {
  for (const el of els) el.dataset.revealed = "1";
  const cards = els.some(isCard);
  gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: cards ? 0.8 : 0.7, ease: EASE, stagger: cards ? 0.1 : stagger, overwrite: "auto", clearProps: "opacity,transform" });
};

/** Odhalení prvků při scrollu – jednou (once), po dávkách se stagger. Prvek, na který přejde fokus
 *  klávesnicí dřív, než ho scroll odhalí (Tab u spodního okraje), se ukáže hned. */
function reveals(targets: HTMLElement[], signal: AbortSignal) {
  if (!targets.length) return;
  // Karty a ostatní prvky v oddělených dávkách – každá dávka má vlastní pohyb a stagger.
  for (const group of [targets.filter(isCard), targets.filter((el) => !isCard(el))]) {
    if (!group.length) continue;
    ScrollTrigger.batch(group, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => {
        const rest = (batch as HTMLElement[]).filter((el) => el.dataset.revealed !== "1");
        if (rest.length) show(rest);
      },
    });
  }
  document.addEventListener(
    "focusin",
    (e) => {
      const el = (e.target as Element).closest<HTMLElement>(REVEAL);
      if (el && el.dataset.revealed !== "1" && targets.includes(el)) show([el], 0);
    },
    { signal },
  );
}

/** Klávesy v sekci zkratek „vyskočí“ jako stisknuté – jednou, společně s kartou. */
function keyCaps(unseen: (el: Element) => boolean) {
  const cards = $$(".keys li").filter((li) => !li.dataset.keysDone && unseen(li));
  for (const li of cards) {
    const caps = $$("kbd", li);
    if (!caps.length) continue;
    gsap.set(caps, { scale: 0.55, y: -10 });
    ScrollTrigger.create({
      trigger: li,
      start: "top 90%", // stejně jako odhalení karty
      once: true,
      onEnter: () => {
        li.dataset.keysDone = "1";
        // Lehký přestřel = „stisk“ klávesy.
        gsap.to(caps, { scale: 1, y: 0, duration: 0.65, ease: "back.out(3)", stagger: 0.08, delay: 0.15, clearProps: "transform" });
      },
    });
  }
}

/** Screenshoty v kartách funkcí: parallax ±30 px (scrub). Obrázky jsou už zvětšené (zoom 1,25–2 × kolem
 *  ohniska, Page.astro) a přesahují rámeček nahoře nejméně o 7,5 % výšky; scale 1,08 přidá další 4 %,
 *  takže se ani u nejnižšího přesahu okraj neodkryje. */
function cardsParallax() {
  for (const card of $$(".bento .card")) {
    const pic = $(".card-shot picture", card);
    if (!pic) continue;
    gsap.fromTo(pic, { y: -30, scale: 1.08 }, { y: 30, scale: 1.08, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } });
  }
}

/** Demo video: rámeček se při vjezdu zvětší z 0,8 na plnou velikost (scrub). */
function videoScale() {
  const frame = $(".video .frame");
  if (!frame) return;
  gsap.fromTo(frame, { scale: 0.8 }, { scale: 1, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "top 25%", scrub: 0.5 } });
}

/* ---------- Detaily ---------- */

/** Proužek průběhu scrollu nahoře (scaleX, scrub). */
function progressBar() {
  const bar = $(".scroll-progress");
  if (!bar) return;
  gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
}

/** Navigace se schová při scrollu dolů a ukáže při scrollu nahoru nebo při fokusu klávesnicí dovnitř. */
function hideOnScroll(signal: AbortSignal) {
  const nav = $(".nav-wrap");
  if (!nav) return;
  let hidden = false;
  const reveal = () => {
    if (!hidden) return;
    hidden = false;
    gsap.to(nav, { yPercent: 0, duration: 0.4, ease: "power2.out", overwrite: true });
  };
  const hide = () => {
    if (hidden || nav.contains(document.activeElement) || performance.now() < navHoldUntil) return;
    hidden = true;
    gsap.to(nav, { yPercent: -140, duration: 0.4, ease: "power2.out", overwrite: true });
  };
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (self.scroll() < 120 || self.direction !== 1) reveal();
      else hide();
    },
  });
  nav.addEventListener("focusin", reveal, { signal });
}

/** Výška stránky se mění i bez změny okna (FAQ <details>, giscus, poster videa) – přepočítat
 *  ScrollTriggery (konec „max“ u proužku průběhu, polohy spouštěčů). */
let refreshTimer = 0;
function refreshOnResize() {
  if (!("ResizeObserver" in window)) return null;
  let last = document.body.offsetHeight;
  const ro = new ResizeObserver(() => {
    const h = document.body.offsetHeight;
    if (h === last) return;
    last = h;
    clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  });
  ro.observe(document.body);
  return ro;
}
