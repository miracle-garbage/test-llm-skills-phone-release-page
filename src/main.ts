import "@fontsource-variable/space-grotesk";
import "@fontsource/instrument-serif";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/sections.css";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { sectionsHTML } from "./ui/sections";
import { initUI } from "./ui/interactions";
import { createStage } from "./scene/stage";
import { initMotion } from "./scroll/motion";
import type { Colorway } from "./scene/types";

gsap.registerPlugin(ScrollTrigger);

const content = document.querySelector<HTMLElement>("#content");
if (content) content.innerHTML = sectionsHTML;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    wheelMultiplier: 0.92,
    touchMultiplier: 1.35
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (!canvas) throw new Error("#stage canvas missing");

const stage = createStage(canvas);

function scrollTo(target: string): void {
  const el = document.querySelector<HTMLElement>(target);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.5 });
  else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
}

initUI({
  onColorway: (colorway: Colorway) => stage.setColorway(colorway),
  onPulseLens: (index: number) => stage.pulseLens(index),
  onBurst: () => stage.burst(),
  onScrollTo: scrollTo
});

const loader = document.querySelector<HTMLElement>("#loader");
const loaderPct = document.querySelector<HTMLElement>("#loader-pct");
const loaderBar = document.querySelector<HTMLElement>("#loader-bar");
const loaderInner = document.querySelector<HTMLElement>(".loader__inner");
const curtainTop = document.querySelector<HTMLElement>(".loader__curtain--t");
const curtainBottom = document.querySelector<HTMLElement>(".loader__curtain--b");

const progress = { value: 0 };

function renderProgress(): void {
  const value = Math.round(progress.value);
  if (loaderPct) loaderPct.textContent = String(value).padStart(2, "0");
  if (loaderBar) loaderBar.style.transform = `scaleX(${progress.value / 100})`;
}

document.body.classList.add("is-loading");
renderProgress();
gsap.to(progress, {
  value: 82,
  duration: 1.35,
  ease: "power2.out",
  onUpdate: renderProgress
});

function reveal(motion: ReturnType<typeof initMotion>): void {
  if (!loader) {
    document.body.classList.remove("is-loading");
    stage.start();
    motion.intro.play();
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      loader.style.display = "none";
      document.body.classList.remove("is-loading");
      ScrollTrigger.refresh();
    }
  });

  tl.to(loaderInner, { autoAlpha: 0, y: -26, duration: 0.5, ease: "power2.in" }, 0)
    .to(curtainTop, { yPercent: -101, duration: 1.15, ease: "expo.inOut" }, 0.08)
    .to(curtainBottom, { yPercent: 101, duration: 1.15, ease: "expo.inOut" }, 0.08)
    .to("#stage", { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.32)
    .add(() => motion.intro.play(), 0.18);

  stage.start();
}

async function boot(): Promise<void> {
  try {
    // Never let a stalled GPU/driver keep the page behind the loader forever.
    await Promise.race([
      Promise.all([stage.ready, document.fonts.ready]),
      new Promise<void>((resolve) => window.setTimeout(resolve, 9000))
    ]);
    await new Promise((resolve) => window.setTimeout(resolve, 650));

    const motion = initMotion(stage);
    (window as Window & { __NOVA__?: unknown }).__NOVA__ = { stage, motion };
    ScrollTrigger.refresh();

    gsap.to(progress, {
      value: 100,
      duration: 0.55,
      ease: "power2.inOut",
      onUpdate: renderProgress,
      onComplete: () => reveal(motion)
    });
  } catch (error) {
    console.error("[NOVA] boot failed", error);
    if (loader) loader.style.display = "none";
    document.body.classList.remove("is-loading");
    stage.start();
  }
}

void boot();