// Animační vrstva webu: GSAP (ScrollTrigger, SplitText) + Lenis (plynulý scroll).
// Načítá ji Layout.astro až v JS (desktop hned, mobil po `load`), takže bez JS, při chybě nebo s „omezit
// pohyb“ je všechno vidět. Počáteční skryté stavy drží CSS jen pod `html[data-motion="pending"]`
// (site.css); tady se přepnou na inline styly GSAPu a atribut se změní na "on".
// Pravidla: jen transform a opacity, každý prvek se objeví jen jednou (kromě scrub efektů),
// většina animací 0,4–0,7 s s ease-out. Hero nadpis po slovech do ~0,8 s.
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
          if (revealTargets.length) gsap.set(revealTargets, { opacity: 0, y: (_: number, el: Element) => (el.classList.contains("foot") ? 0 : 24) });
          // Intro jen při prvním zobrazení nahoře – ne po přepnutí z mobilu, po odscrollování ani při kotvě
          // v adrese (/#faq: prohlížeč stránku hned posune k cíli).
          if (desktop && !introDone && scrollY < 50 && !targetOf(location.hash)) heroParts = setupHero();
          introDone = true;
          html.dataset.motion = "on";

          if (desktop) {
            if (fine) lenis = setupLenis();
            if (heroParts) heroIntro(heroParts);
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

type HeroParts = { split: SplitText; rest: HTMLElement[]; live: HTMLElement | null };

function setupHero(): HeroParts | null {
  const title = $(".hero-title");
  if (!title) return null;
  // Čtený název: řádky oddělené mezerou (aria: "auto" by je slepil – „COLUMNS.FIND“).
  const label = $$(".hero-line", title).map((l) => l.textContent?.trim()).join(" ");
  // Po slovech (ne po písmenech): kerning uvnitř slov zůstane, takže po split.revert() nic neposkočí.
  // Gradient textu přebírá každé slovo (CSS `.hero-title .hw`) – background-clip rodiče na transformovaných
  // potomcích nefunguje; poloha a výška gradientu se dopočítají, aby navazoval jako na celém nadpisu.
  const split = new SplitText(title, { type: "words", wordsClass: "hw", aria: "auto" });
  title.setAttribute("aria-label", label);
  const t = title.getBoundingClientRect();
  for (const w of split.words as HTMLElement[]) {
    if (w.closest("em")) continue; // zvýrazněné slovo má vlastní modrý gradient
    const r = w.getBoundingClientRect();
    w.style.backgroundSize = `100% ${t.height}px`;
    w.style.backgroundPosition = `0 ${t.top - r.top}px`;
  }
  gsap.set(split.words, { yPercent: 40, opacity: 0 });
  const rest = [".hero-sub", ".hero-cta", ".hero-meta", ".winget"].map((s) => $(s)).filter(Boolean) as HTMLElement[];
  gsap.set(rest, { opacity: 0, y: 18 });
  const live = $(".dw-wrap");
  if (live) gsap.set(live, { opacity: 0, y: 56 });
  return { split, rest, live };
}

function heroIntro({ split, rest, live }: HeroParts) {
  const tl = gsap.timeline({ defaults: { ease: EASE } });
  // Slova: 0,5 s každé, rozložení startů 0,3 s → celkem ~0,8 s.
  tl.to(split.words, { yPercent: 0, opacity: 1, duration: 0.5, stagger: { amount: 0.3 } }, 0)
    .to(rest, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 }, 0.3);
  if (live) tl.to(live, { opacity: 1, y: 0, duration: 0.7 }, 0.35);
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
  gsap.set(live, { perspective: 1400 });
  gsap.fromTo(
    stage,
    { rotateX: 9, scale: 0.965, transformOrigin: "50% 100%" },
    { rotateX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: live, start: "top 95%", end: "top 35%", scrub: 0.4 } },
  );
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

const show = (els: HTMLElement[], stagger = 0.07) => {
  for (const el of els) el.dataset.revealed = "1";
  gsap.to(els, { opacity: 1, y: 0, duration: 0.55, ease: EASE, stagger, overwrite: "auto", clearProps: "opacity,transform" });
};

/** Odhalení prvků při scrollu – jednou (once), po dávkách se stagger. Prvek, na který přejde fokus
 *  klávesnicí dřív, než ho scroll odhalí (Tab u spodního okraje), se ukáže hned. */
function reveals(targets: HTMLElement[], signal: AbortSignal) {
  if (!targets.length) return;
  ScrollTrigger.batch(targets, {
    start: "top 92%",
    once: true,
    onEnter: (batch) => {
      const rest = (batch as HTMLElement[]).filter((el) => el.dataset.revealed !== "1");
      if (rest.length) show(rest);
    },
  });
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
    gsap.set(caps, { scale: 0.8 });
    ScrollTrigger.create({
      trigger: li,
      start: "top 92%",
      once: true,
      onEnter: () => {
        li.dataset.keysDone = "1";
        // Lehký přestřel = „stisk“ klávesy.
        gsap.to(caps, { scale: 1, duration: 0.45, ease: "back.out(1.7)", stagger: 0.05, delay: 0.1, clearProps: "transform" });
      },
    });
  }
}

/** Screenshoty v kartách funkcí: jemný parallax ±3 % (scrub). Obrázky jsou už zvětšené (zoom 1,25–2 ×
 *  kolem ohniska, Page.astro) a přesahují rámeček nahoře i dole víc než o 3 %, takže se neodkryje okraj. */
function cardsParallax() {
  for (const card of $$(".bento .card")) {
    const pic = $(".card-shot picture", card);
    if (!pic) continue;
    gsap.fromTo(pic, { yPercent: -3 }, { yPercent: 3, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } });
  }
}

/** Demo video: rámeček se při vjezdu zvětší z 0,93 na plnou velikost (scrub). */
function videoScale() {
  const frame = $(".video .frame");
  if (!frame) return;
  gsap.fromTo(frame, { scale: 0.93 }, { scale: 1, ease: "none", scrollTrigger: { trigger: frame, start: "top 92%", end: "top 45%", scrub: 0.4 } });
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
