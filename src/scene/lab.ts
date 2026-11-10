import "@fontsource-variable/space-grotesk";
import "@fontsource/instrument-serif";
import "@fontsource/instrument-serif/400-italic.css";

import { createStage } from "./stage";
import type { Colorway, Stage } from "./types";

interface LabWindow extends Window {
  __novaLab?: {
    ready: boolean;
    drawCalls: number;
    color: Colorway;
    explode: number;
    stage: Stage;
  };
}

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
if (!canvas) throw new Error("#scene canvas missing");

const stage = createStage(canvas);

const search = new URLSearchParams(window.location.search);
const colorParam = search.get("color");
const initialColor: Colorway =
  colorParam === "aurora" || colorParam === "lunar" ? colorParam : "titanium";
const initialExplode = search.get("explode") === "1";

const chips = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-color]"));
const explodeButton = document.querySelector<HTMLButtonElement>("#toggle-explode");
const statCalls = document.querySelector<HTMLElement>("#stat-calls");
const statFps = document.querySelector<HTMLElement>("#stat-fps");
const statExplode = document.querySelector<HTMLElement>("#stat-explode");

// Lab framing mirrors the hero chapter of the scroll timeline.
function frameHero(): void {
  stage.phone.position.set(1.35, 0, 0);
  stage.phone.rotation.set(0.03, -0.42, -0.03);
  stage.phone.scale.setScalar(1);
  stage.camera.position.set(0.45, 0.12, 9.3);
  stage.lookTarget.set(0.5, -0.02, 0);
}

function frameExploded(): void {
  stage.phone.position.set(1.1, 0, 0);
  stage.phone.rotation.set(0.03, -0.55, -0.02);
  stage.phone.scale.setScalar(1);
  stage.camera.position.set(0.55, 0.16, 10.15);
  stage.lookTarget.set(0.72, 0, 0);
}

function applyColor(color: Colorway): void {
  stage.setColorway(color);
  for (const chip of chips) {
    chip.classList.toggle("is-active", chip.dataset.color === color);
  }
}

function setExploded(on: boolean): void {
  stage.params.explode = on ? 1 : 0;
  stage.params.screenReveal = on ? 0.62 : 1;
  explodeButton?.classList.toggle("is-active", on);
  statExplode?.classList.toggle("is-on", on);
  if (on) frameExploded();
  else frameHero();
}

// Initial state from the URL so the lead can shoot ?color=aurora&explode=1.
applyColor(initialColor);
stage.params.screenReveal = initialExplode ? 0.62 : 1;
if (initialExplode) {
  stage.params.explode = 1;
  explodeButton?.classList.add("is-active");
  statExplode?.classList.add("is-on");
  frameExploded();
} else {
  frameHero();
}

for (const chip of chips) {
  chip.addEventListener("click", () => {
    const value = chip.dataset.color;
    if (value === "titanium" || value === "aurora" || value === "lunar") applyColor(value);
  });
}

explodeButton?.addEventListener("click", () => {
  setExploded(stage.params.explode < 0.5);
});

let lensIndex = 0;
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "1") applyColor("titanium");
  else if (key === "2") applyColor("aurora");
  else if (key === "3") applyColor("lunar");
  else if (key === "e") setExploded(stage.params.explode < 0.5);
  else if (key === "b") stage.burst();
  else if (key === "l") {
    stage.pulseLens(lensIndex);
    lensIndex = (lensIndex + 1) % 3;
  }
});

window.addEventListener(
  "pointermove",
  (event) => {
    stage.setPointer(
      (event.clientX / window.innerWidth) * 2 - 1,
      -((event.clientY / window.innerHeight) * 2 - 1)
    );
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  stage.resize(window.innerWidth, window.innerHeight);
});

// Lightweight HUD telemetry.
let frameCount = 0;
let fps = 0;
let fpsStart = performance.now();
function countFrames(): void {
  frameCount++;
  const now = performance.now();
  if (now - fpsStart >= 500) {
    fps = (frameCount * 1000) / (now - fpsStart);
    frameCount = 0;
    fpsStart = now;
  }
  requestAnimationFrame(countFrames);
}
requestAnimationFrame(countFrames);

window.setInterval(() => {
  if (statCalls) statCalls.textContent = stage.renderer.info.render.calls + " calls";
  if (statFps) statFps.textContent = fps.toFixed(0) + " fps";
  if (statExplode) statExplode.textContent = "EXPLODE " + stage.params.explode.toFixed(2);
}, 400);

window.addEventListener("beforeunload", () => stage.dispose());

void stage.ready.then(() => {
  document.body.dataset.ready = "true";
  (window as LabWindow).__novaLab = {
    ready: true,
    drawCalls: stage.renderer.info.render.calls,
    color: initialColor,
    explode: initialExplode ? 1 : 0,
    stage
  };
});