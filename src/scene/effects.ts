import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { gradeShader } from "./shaders";
import type { StageParams } from "./types";

/**
 * RenderPass -> UnrealBloom -> custom grade -> OutputPass.
 * Tone mapping / sRGB happen once in OutputPass, so every pass before it works
 * in the renderer's linear working color space.
 */
export class StageEffects {
  readonly composer: EffectComposer;
  readonly bloomPass: UnrealBloomPass;
  readonly gradePass: ShaderPass;
  private readonly outputPass: OutputPass;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly target: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderer = renderer;

    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
      type: THREE.HalfFloatType,
      samples: 2
    });

    this.composer = new EffectComposer(renderer, this.target);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)),
      0.95,
      0.62,
      0.58
    );
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(gradeShader);
    this.composer.addPass(this.gradePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.gradePass.uniforms.uResolution.value = new THREE.Vector2(size.x, size.y);
  }

  resize(width: number, height: number, dpr: number): void {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);

    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const resolution = this.gradePass.uniforms.uResolution.value as THREE.Vector2;
    resolution.set(size.x, size.y);
    this.bloomPass.setSize(size.x, size.y);
  }

  update(params: StageParams, elapsed: number, scroll: number, bloomBoost: number): void {
    this.bloomPass.strength = params.bloom + bloomBoost;
    this.bloomPass.radius = params.bloomRadius;

    const uniforms = this.gradePass.uniforms;
    uniforms.uTime.value = elapsed;
    uniforms.uGrain.value = params.grain;
    uniforms.uChroma.value = params.chromatic;
    uniforms.uVignette.value = params.vignette;
    uniforms.uScroll.value = scroll;
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.bloomPass.dispose();
    this.gradePass.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
  }
}