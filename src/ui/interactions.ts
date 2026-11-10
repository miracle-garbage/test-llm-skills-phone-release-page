import gsap from "gsap";
import type { Colorway } from "../scene/types";

export interface UIHandlers {
  onColorway: (colorway: Colorway) => void;
  onPulseLens: (index: number) => void;
  onBurst: () => void;
  onScrollTo: (target: string) => void;
}

interface ColorwayCopy {
  en: string;
  cn: string;
  note: string;
}

const COLORWAY_COPY: Record<Colorway, ColorwayCopy> = {
  titanium: { en: "TITANIUM", cn: "钛空灰", note: "哑光钛灰 / 冷静的金属" },
  aurora: { en: "AURORA", cn: "极光绿", note: "极光绿 / 深海般的偏光" },
  lunar: { en: "LUNAR", cn: "月岩白", note: "月岩白 / 落在表面上的光" }
};

const LENS_READOUT: string[] = [
  "24MM · F/1.6 · 200MP",
  "13MM · F/2.0 · 50MP",
  "120MM · F/2.6 · 64MP"
];

function isColorway(value: string | undefined): value is Colorway {
  return value === "titanium" || value === "aurora" || value === "lunar";
}

/**
 * Client-side micro-interactions. Everything is scoped to this closure: no
 * globals are exposed and nothing survives beyond the lifetime of the page.
 */
export function initUI(handlers: UIHandlers): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const passive = { passive: true } as const;

  initMagnetics();
  initTilt();
  initScrollLinks();
  initColorways();
  initLenses();
  initBurst();
  initAccordion();

  /* ------------------------------------------------------------------ *
   * magnetic buttons
   * ------------------------------------------------------------------ */
  function initMagnetics(): void {
    if (!fine || reduced) return;

    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((element) => {
      const xTo = gsap.quickTo(element, "x", { duration: 0.55, ease: "power3.out" });
      const yTo = gsap.quickTo(element, "y", { duration: 0.55, ease: "power3.out" });
      let rect = element.getBoundingClientRect();

      element.addEventListener(
        "pointerenter",
        () => {
          rect = element.getBoundingClientRect();
        },
        passive
      );

      element.addEventListener(
        "pointermove",
        (event: PointerEvent) => {
          const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.24;
          const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.36;
          xTo(gsap.utils.clamp(-10, 10, dx));
          yTo(gsap.utils.clamp(-10, 10, dy));
        },
        passive
      );

      element.addEventListener(
        "pointerleave",
        () => {
          xTo(0);
          yTo(0);
        },
        passive
      );
    });
  }

  /* ------------------------------------------------------------------ *
   * pointer tilt
   * ------------------------------------------------------------------ */
  function initTilt(): void {
    if (!fine || reduced) return;
    const MAX = 5.5;

    document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((element) => {
      gsap.set(element, { transformPerspective: 1000, transformOrigin: "50% 50%" });
      const rotX = gsap.quickTo(element, "rotationX", { duration: 0.7, ease: "power3.out" });
      const rotY = gsap.quickTo(element, "rotationY", { duration: 0.7, ease: "power3.out" });
      let rect = element.getBoundingClientRect();

      element.addEventListener(
        "pointerenter",
        () => {
          rect = element.getBoundingClientRect();
        },
        passive
      );

      element.addEventListener(
        "pointermove",
        (event: PointerEvent) => {
          const nx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
          const ny = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
          rotY(gsap.utils.clamp(-MAX, MAX, nx * MAX * 2));
          rotX(gsap.utils.clamp(-MAX, MAX, -ny * MAX * 2));
        },
        passive
      );

      element.addEventListener(
        "pointerleave",
        () => {
          rotX(0);
          rotY(0);
        },
        passive
      );
    });
  }

  /* ------------------------------------------------------------------ *
   * anchor navigation
   * ------------------------------------------------------------------ */
  function initScrollLinks(): void {
    document.querySelectorAll<HTMLElement>("[data-scroll-to]").forEach((element) => {
      element.addEventListener("click", (event: MouseEvent) => {
        const target = element.dataset.scrollTo;
        if (!target) return;
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        handlers.onScrollTo(target);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * colorways
   * ------------------------------------------------------------------ */
  function initColorways(): void {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-colorway]"));
    if (!buttons.length) return;

    const nameEn = document.querySelector<HTMLElement>(".colors__name-en");
    const nameCn = document.querySelector<HTMLElement>(".colors__name-cn");
    const note = document.querySelector<HTMLElement>(".colors__note");
    const display = document.querySelector<HTMLElement>(".colors__display");

    const select = (value: Colorway): void => {
      buttons.forEach((button) => {
        const active = button.dataset.colorway === value;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      const copy = COLORWAY_COPY[value];
      if (nameEn) nameEn.textContent = copy.en;
      if (nameCn) nameCn.textContent = copy.cn;
      if (note) note.textContent = copy.note;

      if (display && !reduced) {
        gsap.fromTo(
          display,
          { y: 14, autoAlpha: 0.15 },
          { y: 0, autoAlpha: 1, duration: 0.75, ease: "expo.out", overwrite: true }
        );
      }

      handlers.onColorway(value);
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.colorway;
        if (!isColorway(value)) return;
        select(value);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * camera lens selector
   * ------------------------------------------------------------------ */
  function initLenses(): void {
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-lens]"));
    if (!buttons.length) return;

    const readout = document.querySelector<HTMLElement>("[data-lens-readout]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.lens);
        if (!Number.isInteger(index) || index < 0 || index >= LENS_READOUT.length) return;

        buttons.forEach((other) => {
          const active = other === button;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-pressed", String(active));
        });

        if (readout) readout.textContent = LENS_READOUT[index];
        handlers.onPulseLens(index);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * CTA burst + ripple
   * ------------------------------------------------------------------ */
  function initBurst(): void {
    const button = document.querySelector<HTMLButtonElement>("[data-burst]");
    if (!button) return;

    button.addEventListener("click", (event: MouseEvent) => {
      handlers.onBurst();

      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.4;
      const originX = event.clientX || rect.left + rect.width / 2;
      const originY = event.clientY || rect.top + rect.height / 2;

      const ripple = document.createElement("span");
      ripple.className = "btn__ripple";
      gsap.set(ripple, {
        width: size,
        height: size,
        x: originX - rect.left - size / 2,
        y: originY - rect.top - size / 2,
        scale: 0,
        opacity: 0.5
      });
      button.appendChild(ripple);

      gsap.to(ripple, {
        scale: 1,
        opacity: 0,
        duration: reduced ? 0.001 : 0.95,
        ease: "power2.out",
        onComplete: () => ripple.remove()
      });

      if (!reduced) {
        gsap.fromTo(
          button,
          { scale: 0.96 },
          { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: true }
        );
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * specs accordion
   * ------------------------------------------------------------------ */
  function initAccordion(): void {
    interface Row {
      root: HTMLElement;
      trigger: HTMLButtonElement;
      panel: HTMLElement;
      inner: HTMLElement;
      chevron: HTMLElement | null;
    }

    const rows: Row[] = [];

    document.querySelectorAll<HTMLElement>("[data-acc]").forEach((root) => {
      const trigger = root.querySelector<HTMLButtonElement>(".acc__trigger");
      const panel = root.querySelector<HTMLElement>(".acc__panel");
      const inner = root.querySelector<HTMLElement>(".acc__inner");
      const chevron = root.querySelector<HTMLElement>(".acc__chev");
      if (!trigger || !panel || !inner) return;
      rows.push({ root, trigger, panel, inner, chevron });
    });

    if (!rows.length) return;

    const setChevron = (row: Row, open: boolean, animate: boolean): void => {
      if (!row.chevron) return;
      gsap.to(row.chevron, {
        rotation: open ? 135 : 0,
        duration: animate && !reduced ? 0.45 : 0.001,
        ease: "power3.inOut",
        overwrite: true
      });
    };

    const openRow = (row: Row, animate: boolean): void => {
      row.trigger.setAttribute("aria-expanded", "true");
      row.panel.setAttribute("aria-hidden", "false");
      row.root.classList.add("is-open");
      setChevron(row, true, animate);

      if (!animate || reduced) {
        row.panel.style.height = "auto";
        return;
      }

      const target = row.inner.offsetHeight;
      gsap.to(row.panel, {
        height: target,
        duration: 0.55,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          row.panel.style.height = "auto";
        }
      });
    };

    const closeRow = (row: Row, animate: boolean): void => {
      row.trigger.setAttribute("aria-expanded", "false");
      row.root.classList.remove("is-open");
      row.panel.setAttribute("aria-hidden", "true");
      setChevron(row, false, animate);

      if (!animate || reduced) {
        row.panel.style.height = "0px";
        return;
      }

      gsap.to(row.panel, {
        height: 0,
        duration: 0.4,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          row.panel.style.height = "0px";
        }
      });
    };

    rows.forEach((row) => {
      row.trigger.addEventListener("click", () => {
        const open = row.trigger.getAttribute("aria-expanded") === "true";
        if (open) {
          closeRow(row, true);
          return;
        }
        rows.forEach((other) => {
          if (other !== row && other.trigger.getAttribute("aria-expanded") === "true") {
            closeRow(other, true);
          }
        });
        openRow(row, true);
      });
    });

    rows.forEach((row) => {
      if (row.trigger.getAttribute("aria-expanded") === "true") openRow(row, false);
      else closeRow(row, false);
    });
  }
}