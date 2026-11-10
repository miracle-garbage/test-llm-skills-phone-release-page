import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Stage } from "../scene/types";

gsap.registerPlugin(ScrollTrigger);

interface PhoneState {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
}

interface SceneState {
  phone: PhoneState;
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  params: Record<string, number>;
}

const PI = Math.PI;

const SCENES: Record<string, SceneState> = {
  hero: {
    phone: { x: 1.55, y: 0, z: 0, rx: 0.04, ry: -0.42, rz: -0.035, scale: 1 },
    camera: { x: 0.45, y: 0.12, z: 9.3 },
    target: { x: 0.5, y: -0.02, z: 0 },
    params: { bloom: 0.95, bloomRadius: 0.62, exposure: 1.04, screenReveal: 0.35, explode: 0, background: 1, grain: 0.055, chromatic: 0.0015, vignette: 0.62 }
  },
  design: {
    phone: { x: 1.02, y: 0.06, z: 0, rx: 0.02, ry: PI, rz: 0.02, scale: 1 },
    camera: { x: 0.38, y: 0.08, z: 8.7 },
    target: { x: 0.62, y: 0.02, z: 0 },
    params: { bloom: 0.8, bloomRadius: 0.5, exposure: 1, screenReveal: 0.2, explode: 0, background: 0.85, grain: 0.05, chromatic: 0.001, vignette: 0.7 }
  },
  display: {
    phone: { x: 1.3, y: 0.08, z: 0.12, rx: 0.015, ry: 2 * PI, rz: 0, scale: 1.02 },
    camera: { x: 1.12, y: 0.16, z: 6.85 },
    target: { x: 1.24, y: 0.14, z: 0.1 },
    params: { bloom: 1.05, bloomRadius: 0.7, exposure: 1.05, screenReveal: 1, explode: 0, background: 0.7, grain: 0.045, chromatic: 0.0015, vignette: 0.58 }
  },
  camera: {
    phone: { x: -1.35, y: 0.04, z: 0, rx: 0.02, ry: 3 * PI, rz: -0.02, scale: 1.02 },
    camera: { x: -0.55, y: 0.22, z: 6.5 },
    target: { x: -1.32, y: 0.08, z: 0 },
    params: { bloom: 0.92, bloomRadius: 0.55, exposure: 1, screenReveal: 0, explode: 0, background: 0.8, grain: 0.055, chromatic: 0.002, vignette: 0.66 }
  },
  performance: {
    phone: { x: 1.12, y: 0.02, z: 0, rx: 0.02, ry: 3 * PI + 0.24, rz: 0.015, scale: 1 },
    camera: { x: 0.18, y: 0.32, z: 7.9 },
    target: { x: 1.06, y: 0.02, z: 0 },
    params: { bloom: 1.15, bloomRadius: 0.72, exposure: 1.08, screenReveal: 0, explode: 1, background: 0.75, grain: 0.06, chromatic: 0.0025, vignette: 0.64 }
  },
  colors: {
    phone: { x: 0, y: 0, z: 0, rx: 0.01, ry: 4 * PI, rz: 0, scale: 1 },
    camera: { x: 0, y: 0.18, z: 8.4 },
    target: { x: 0, y: 0.02, z: 0 },
    params: { bloom: 0.95, bloomRadius: 0.6, exposure: 1.02, screenReveal: 0.55, explode: 0, background: 0.95, grain: 0.05, chromatic: 0.0012, vignette: 0.6 }
  },
  gallery: {
    phone: { x: 0, y: -0.5, z: -1.5, rx: 0, ry: 4 * PI + 0.5, rz: 0, scale: 0.98 },
    camera: { x: 0, y: 0.16, z: 9.6 },
    target: { x: 0, y: 0, z: 0 },
    params: { bloom: 0.72, bloomRadius: 0.5, exposure: 0.98, screenReveal: 0.3, explode: 0, background: 0.5, grain: 0.06, chromatic: 0.002, vignette: 0.72 }
  },
  specs: {
    phone: { x: 0, y: 0, z: -1.8, rx: 0, ry: 4 * PI + 0.18, rz: 0, scale: 0.9 },
    camera: { x: 0, y: 0.1, z: 9.2 },
    target: { x: 0, y: 0, z: 0 },
    params: { bloom: 0.6, bloomRadius: 0.4, exposure: 0.95, screenReveal: 0.1, explode: 0, background: 0.42, grain: 0.05, chromatic: 0.001, vignette: 0.78 }
  },
  cta: {
    phone: { x: 0, y: -0.08, z: 0, rx: 0.02, ry: 4 * PI - 0.18, rz: 0, scale: 1.04 },
    camera: { x: 0, y: 0.1, z: 8 },
    target: { x: 0, y: 0.02, z: 0 },
    params: { bloom: 1.35, bloomRadius: 0.8, exposure: 1.12, screenReveal: 0.9, explode: 0, background: 1.15, grain: 0.06, chromatic: 0.0022, vignette: 0.55 }
  }
};

const COMPACT = "(max-width: 760px)";

function stateFor(id: string): SceneState | null {
  const base = SCENES[id];
  if (!base) return null;
  if (!window.matchMedia(COMPACT).matches) return base;
  return {
    phone: {
      ...base.phone,
      x: base.phone.x * 0.18,
      y: base.phone.y - 0.25,
      scale: base.phone.scale * 0.82
    },
    camera: { x: base.camera.x * 0.3, y: base.camera.y + 0.1, z: base.camera.z * 1.16 },
    target: { x: base.target.x * 0.15, y: base.target.y, z: base.target.z },
    params: base.params
  };
}

function splitChars(root: HTMLElement): void {
  if (root.dataset.split === "done") return;
  if (root.children.length > 0) return;
  const text = root.textContent ?? "";
  root.textContent = "";
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch;
    frag.appendChild(span);
  }
  root.appendChild(frag);
  root.dataset.split = "done";
}

export interface Motion {
  intro: gsap.core.Timeline;
  master: gsap.core.Timeline;
}

export function initMotion(stage: Stage): Motion {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sceneEls = gsap.utils.toArray<HTMLElement>("[data-scene]");

  const nav = document.querySelector<HTMLElement>("#nav");
  const secNum = document.querySelector<HTMLElement>("#sec-num");
  const scrollBar = document.querySelector<HTMLElement>("#scroll-bar");

  // Split the hero headline before building the intro timeline.
  document.querySelectorAll<HTMLElement>(".hero__title .line__inner").forEach(splitChars);

  const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

  if (!reduced) {
    intro
      .fromTo("#nav", { yPercent: -130, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1 }, 0)
      .from(".hero .eyebrow", { autoAlpha: 0, y: 18, duration: 0.9 }, 0.18)
      .from(".hero__title .char", { autoAlpha: 0, yPercent: 115, rotate: 6, duration: 1.15, stagger: 0.032 }, 0.22)
      .from(".hero__cn", { autoAlpha: 0, y: 22, duration: 0.9 }, 0.62)
      .from(".hero__lead", { autoAlpha: 0, y: 22, duration: 0.9 }, 0.72)
      .from(".hero__meta > *", { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.07 }, 0.84)
      .from(".hero__scroll", { autoAlpha: 0, duration: 0.8 }, 1.0)
      .from(".rail", { autoAlpha: 0, x: 18, duration: 0.8 }, 1.05);
  }

  // ---------- scroll-linked 3D choreography ----------
  const master = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: {
      trigger: "#content",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.15,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        stage.setScroll(self.progress);
        if (scrollBar) scrollBar.style.transform = `scaleY(${self.progress.toFixed(4)})`;
        updateRail(self.progress);
      }
    }
  });

  // Give the timeline a real 0..1 duration so tweens can be placed as fractions.
  master.to({}, { duration: 1 }, 0);

  function applyState(state: SceneState, duration: number, at: number): void {
    master.to(stage.phone.position, { x: state.phone.x, y: state.phone.y, z: state.phone.z, duration }, at);
    master.to(stage.phone.rotation, { x: state.phone.rx, y: state.phone.ry, z: state.phone.rz, duration }, at);
    master.to(stage.phone.scale, { x: state.phone.scale, y: state.phone.scale, z: state.phone.scale, duration }, at);
    master.to(stage.camera.position, { ...state.camera, duration }, at);
    master.to(stage.lookTarget, { ...state.target, duration }, at);
    master.to(stage.params, { ...state.params, duration }, at);
  }

  function progressAt(el: HTMLElement): number {
    const total = ScrollTrigger.maxScroll(window);
    if (total <= 0) return 0;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return gsap.utils.clamp(0, 1, (top - window.innerHeight * 0.55) / total);
  }

  const positions: number[] = [];

  sceneEls.forEach((el, index) => {
    const state = stateFor(el.dataset.scene ?? "");
    if (!state) return;
    const at = progressAt(el);
    positions.push(at);
    if (reduced || index === 0 || at <= 0) {
      gsap.set(stage.phone.position, { x: state.phone.x, y: state.phone.y, z: state.phone.z });
      gsap.set(stage.phone.rotation, { x: state.phone.rx, y: state.phone.ry, z: state.phone.rz });
      gsap.set(stage.phone.scale, { x: state.phone.scale, y: state.phone.scale, z: state.phone.scale });
      gsap.set(stage.camera.position, state.camera);
      gsap.set(stage.lookTarget, state.target);
      gsap.set(stage.params, state.params);
      return;
    }
    if (reduced) return;
    const start = Math.max(0, at - 0.075);
    applyState(state, 0.07, start);
  });

  function updateRail(progress: number): void {
    if (!secNum) return;
    let active = 0;
    for (let i = 0; i < positions.length; i++) {
      if (progress >= positions[i] - 0.03) active = i;
    }
    secNum.textContent = String(Math.min(active + 1, positions.length || 9)).padStart(2, "0");
  }

  // ---------- section reveals ----------
  if (!reduced) {
    gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        y: 36,
        autoAlpha: 0,
        duration: 1.05,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
      });
    });

    gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((group) => {
      const lines = group.querySelectorAll<HTMLElement>(".line__inner");
      if (!lines.length) return;
      gsap.from(lines, {
        yPercent: 120,
        duration: 1.15,
        ease: "expo.out",
        stagger: 0.09,
        scrollTrigger: { trigger: group, start: "top 85%" }
      });
    });
  }

  // ---------- number counters ----------
  gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count ?? "0");
    const decimals = Number(el.dataset.decimals ?? "0");
    const suffix = el.dataset.suffix ?? "";
    const counter = { value: 0 };
    gsap.to(counter, {
      value: end,
      duration: reduced ? 0 : 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: () => {
        el.textContent = counter.value.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + suffix;
      }
    });
  });

  // ---------- gallery horizontal ----------
  const gallery = document.querySelector<HTMLElement>("#gallery");
  const track = document.querySelector<HTMLElement>("[data-gallery-track]");
  if (gallery && track && !reduced) {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 24);
    const trackTween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: gallery,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    gsap.utils.toArray<HTMLElement>("[data-gallery-card]").forEach((card) => {
      const media = card.querySelector<HTMLElement>(".gallery__media");
      if (!media) return;
      gsap.fromTo(
        media,
        { xPercent: -5 },
        {
          xPercent: 5,
          ease: "none",
          scrollTrigger: {
            containerAnimation: trackTween,
            trigger: card,
            start: "left right",
            end: "right left",
            scrub: true
          }
        }
      );
    });
  }

  // ---------- nav behaviour ----------
  if (nav) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        nav.classList.toggle("is-scrolled", self.scroll() > 40);
        nav.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 360);
      }
    });
  }

  // ---------- camera lens sequence ----------
  const cameraSection = document.querySelector<HTMLElement>("#camera");
  if (cameraSection && !reduced) {
    ScrollTrigger.create({
      trigger: cameraSection,
      start: "top 55%",
      once: true,
      onEnter: () => {
        [0, 1, 2].forEach((i) => window.setTimeout(() => stage.pulseLens(i), 260 * i));
      }
    });
  }

  // ---------- responsive / cleanup ----------
  const onResize = (): void => {
    stage.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize, { passive: true });

  const onVisibility = (): void => {
    if (document.hidden) stage.stop();
    else stage.start();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return { intro, master };
}