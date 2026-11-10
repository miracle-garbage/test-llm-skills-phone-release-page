import type * as THREE from "three";

export type Colorway = "titanium" | "aurora" | "lunar";

/**
 * Mutable, GSAP-friendly values. The scene reads these every frame and applies
 * them to post-processing, shader uniforms and internal part transforms.
 */
export interface StageParams {
  /** UnrealBloom strength, 0..2 */
  bloom: number;
  /** UnrealBloom radius, 0..1 */
  bloomRadius: number;
  /** Tone-mapping exposure, 0.5..2 */
  exposure: number;
  /** Film grain amount, 0..0.15 */
  grain: number;
  /** Chromatic aberration amount, 0..0.01 */
  chromatic: number;
  /** Vignette darkness, 0..1 */
  vignette: number;
  /** Screen wallpaper reveal, 0..1 */
  screenReveal: number;
  /** Exploded-view amount, 0..1 */
  explode: number;
  /** Background aurora intensity, 0..1.5 */
  background: number;
}

/**
 * The public contract between the WebGL stage (src/scene) and the DOM / scroll
 * choreography (src/scroll). The Lead owns integration, scene-dev owns the
 * implementation.
 */
export interface Stage {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** Camera look-at target, animated by the scroll timeline. */
  readonly lookTarget: THREE.Vector3;
  /** Root group of the phone. Animate position / rotation / scale. */
  readonly phone: THREE.Group;
  readonly params: StageParams;
  /** Resolve once the stage has rendered its first frame. */
  readonly ready: Promise<void>;

  setColorway(colorway: Colorway): void;
  /** Normalized pointer position, -1..1. */
  setPointer(x: number, y: number): void;
  /** Whole-page scroll progress, 0..1. Drives shader uniforms. */
  setScroll(progress: number): void;
  /** Light up one camera lens (0..2) with a bloom pulse. */
  pulseLens(index: number): void;
  /** CTA particle burst. */
  burst(): void;
  resize(width: number, height: number): void;
  start(): void;
  stop(): void;
  dispose(): void;
}
