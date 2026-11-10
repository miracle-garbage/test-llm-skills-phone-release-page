import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import {
  backgroundFragment,
  backgroundVertex,
  burstFragment,
  burstVertex,
  dustFragment,
  dustVertex,
  shaftFragment,
  shaftVertex
} from "./shaders";
import type { StageParams } from "./types";

const WHITE = new THREE.Color(0xffffff);

function rand(): number {
  return Math.random();
}

class BurstParticles {
  readonly object: THREE.Points;

  private readonly uProgress = { value: 0 };
  private readonly uSizeScale = { value: 1200 };
  private readonly uColorA = { value: new THREE.Color(0xf4fffb) };
  private readonly uColorB = { value: new THREE.Color(0x5ef2d6) };

  private active = false;
  private time = 0;
  private readonly duration = 1.6;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  constructor(count = 320) {
    const positions = new Float32Array(count * 3);
    const dirs = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);

    const dir = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Start in a tight cluster, then fly out on random-ish paths.
      const r = Math.cbrt(rand()) * 0.13;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(rand() * 2 - 1);
      positions[i3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i3 + 1] = Math.cos(phi) * r;
      positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * r * 0.6;

      dir.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      dirs[i3] = dir.x;
      dirs[i3 + 1] = dir.y;
      dirs[i3 + 2] = dir.z;

      speeds[i] = 0.4 + Math.pow(rand(), 1.6) * 2.8;
      sizes[i] = 0.003 + rand() * 0.008;
      seeds[i] = rand();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("aDir", new THREE.BufferAttribute(dirs, 3));
    this.geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: this.uProgress,
        uSizeScale: this.uSizeScale,
        uColorA: this.uColorA,
        uColorB: this.uColorB,
        uIntensity: { value: 1.35 }
      },
      vertexShader: burstVertex,
      fragmentShader: burstFragment,
      transparent: true,
      depthWrite: false,
      // The CTA burst is light, not geometry: let it read in front of the body.
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    this.object = new THREE.Points(this.geometry, this.material);
    this.object.name = "cta_burst";
    this.object.frustumCulled = false;
    this.object.visible = false;
    this.object.renderOrder = 10;
  }

  setColor(color: THREE.Color): void {
    this.uColorB.value.copy(color);
  }

  setSizeScale(scale: number): void {
    this.uSizeScale.value = scale;
  }

  trigger(): void {
    this.time = 0;
    this.active = true;
    this.object.visible = true;
    this.uProgress.value = 0;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    const progress = Math.min(1, this.time / this.duration);
    this.uProgress.value = progress;
    if (progress >= 1) {
      this.active = false;
      this.object.visible = false;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Atmosphere + product lighting. The background is a single large plane with
 * FBM aurora; dust and the CTA burst are additive point sprites; everything
 * stays intentionally subtle so the phone and typography lead.
 */
export class StageEnvironment {
  readonly burst: BurstParticles;
  readonly group = new THREE.Group();

  private readonly bgUniforms: {
    uTime: { value: number };
    uScroll: { value: number };
    uIntensity: { value: number };
    uPointer: { value: THREE.Vector2 };
    uBase: { value: THREE.Color };
    uAccent: { value: THREE.Color };
    uAccent2: { value: THREE.Color };
  };

  private readonly dustUniforms: {
    uTime: { value: number };
    uScroll: { value: number };
    uSizeScale: { value: number };
    uPointer: { value: THREE.Vector2 };
    uColor: { value: THREE.Color };
    uColor2: { value: THREE.Color };
    uOpacity: { value: number };
  };

  private readonly dustColor = new THREE.Color(0xcfe9e2);
  private readonly shafts: Array<{ mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> }> = [];

  private readonly background: THREE.Mesh;
  private readonly dust: THREE.Points;
  private readonly backgroundGeometry: THREE.PlaneGeometry;
  private readonly dustGeometry: THREE.BufferGeometry;
  private readonly dustMaterial: THREE.ShaderMaterial;
  private readonly backgroundMaterial: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    // ------------------------------------------------------- lighting rig
    const hemisphere = new THREE.HemisphereLight(0x9fd8ff, 0x06080b, 0.42);
    scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff2e4, 3.4);
    key.position.set(5.2, 6.4, 7.4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x5ef2d6, 3.2);
    rim.position.set(-6.2, 2.2, -5.8);
    scene.add(rim);

    const rimWarm = new THREE.DirectionalLight(0xffb27a, 1.5);
    rimWarm.position.set(3.4, -3.2, -4.4);
    scene.add(rimWarm);

    const fill = new THREE.DirectionalLight(0x8fb6ff, 1.15);
    fill.position.set(-4.4, -2.6, 6.2);
    scene.add(fill);

    const kicker = new THREE.DirectionalLight(0xffffff, 0.9);
    kicker.position.set(0.4, -6.4, 2.4);
    scene.add(kicker);

    // Soft area sources give the titanium and the display glass the long,
    // keynote-style highlights that point lights cannot.
    RectAreaLightUniformsLib.init();

    const keyArea = new THREE.RectAreaLight(0xfff3e8, 4.6, 3.6, 4.6);
    keyArea.position.set(4.4, 2.0, 5.6);
    keyArea.lookAt(0.6, 0, 0);
    scene.add(keyArea);

    const rimArea = new THREE.RectAreaLight(0x8ffff0, 6.2, 1.3, 5.6);
    rimArea.position.set(-4.4, 0.8, -3.2);
    rimArea.lookAt(0.6, 0, 0);
    scene.add(rimArea);

    // Two area sources are enough: key for the front, rim for the edge glow.

    // --------------------------------------------------------- background
    this.backgroundGeometry = new THREE.PlaneGeometry(40, 24);
    this.bgUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uIntensity: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uBase: { value: new THREE.Color(0x06070a) },
      uAccent: { value: new THREE.Color(0x2b8f7f) },
      uAccent2: { value: new THREE.Color(0x2a4f8f) }
    };
    this.backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: this.bgUniforms,
      vertexShader: backgroundVertex,
      fragmentShader: backgroundFragment,
      depthWrite: false,
      depthTest: true
    });
    this.background = new THREE.Mesh(this.backgroundGeometry, this.backgroundMaterial);
    this.background.position.set(0, 0, -14);
    this.background.renderOrder = -10;
    this.background.name = "aurora_background";
    this.group.add(this.background);

    // --------------------------------------------------- volumetric shafts
    const shaftGeometry = new THREE.PlaneGeometry(2.8, 11);
    const shaftDefs: Array<{ x: number; y: number; z: number; rz: number; rx: number; sx: number; sy: number }> = [
      { x: -2.05, y: 0.25, z: -3.4, rz: 0.2, rx: 0, sx: 1, sy: 1 },
      { x: 2.25, y: 0.1, z: -3.9, rz: -0.16, rx: 0.05, sx: 1.15, sy: 1.1 },
      { x: 0.2, y: 0.5, z: -4.6, rz: 0.04, rx: -0.04, sx: 0.85, sy: 0.9 }
    ];
    for (const def of shaftDefs) {
      const uniforms: Record<string, THREE.IUniform> = {
        uColor: { value: new THREE.Color(0x5ef2d6) },
        uOpacity: { value: 0.05 },
        uTime: { value: 0 }
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: shaftVertex,
        fragmentShader: shaftFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(shaftGeometry, material);
      mesh.position.set(def.x, def.y, def.z);
      mesh.rotation.set(def.rx, 0, def.rz);
      mesh.scale.set(def.sx, def.sy, 1);
      mesh.renderOrder = -1;
      this.group.add(mesh);
      this.shafts.push({ mesh, uniforms });
    }

    // ---------------------------------------------------------------- dust
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (rand() * 2 - 1) * 7.2;
      positions[i3 + 1] = (rand() * 2 - 1) * 4.8;
      positions[i3 + 2] = -6 + rand() * 9.5;
      seeds[i] = rand();
      sizes[i] = 0.0018 + Math.pow(rand(), 1.8) * 0.0065;
    }
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    this.dustGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    this.dustUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSizeScale: { value: 1200 },
      uPointer: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color(0xcfe9e2) },
      uColor2: { value: new THREE.Color(0x5ef2d6) },
      uOpacity: { value: 0.55 }
    };
    this.dustMaterial = new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });
    this.dust = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dust.name = "dust_particles";
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 3;
    this.group.add(this.dust);

    // --------------------------------------------------------------- burst
    this.burst = new BurstParticles(320);

    scene.add(this.group);
  }

  update(
    dt: number,
    elapsed: number,
    params: StageParams,
    pointer: THREE.Vector2,
    scroll: number,
    accent: THREE.Color,
    accent2: THREE.Color
  ): void {
    this.bgUniforms.uTime.value = elapsed;
    this.bgUniforms.uScroll.value = scroll;
    this.bgUniforms.uIntensity.value = params.background;
    this.bgUniforms.uPointer.value.copy(pointer);
    this.bgUniforms.uAccent.value.copy(accent);
    this.bgUniforms.uAccent2.value.copy(accent2);

    this.dustUniforms.uTime.value = elapsed;
    this.dustUniforms.uScroll.value = scroll;
    this.dustUniforms.uPointer.value.copy(pointer);
    this.dustColor.copy(accent).lerp(WHITE, 0.68);
    this.dustUniforms.uColor.value.copy(this.dustColor);
    this.dustUniforms.uColor2.value.copy(accent);
    this.dustUniforms.uOpacity.value = 0.4 + params.background * 0.2;

    for (const shaft of this.shafts) {
      shaft.uniforms.uTime.value = elapsed;
      (shaft.uniforms.uColor.value as THREE.Color).copy(accent);
      shaft.uniforms.uOpacity.value = 0.045 * params.background;
    }

    this.burst.setColor(accent);
    this.burst.update(dt);
  }

  resize(drawingBufferHeight: number, fovDegrees: number): void {
    const scale = (drawingBufferHeight * 0.5) / Math.tan(THREE.MathUtils.degToRad(fovDegrees) * 0.5);
    this.dustUniforms.uSizeScale.value = scale;
    this.burst.setSizeScale(scale);
  }

  dispose(): void {
    this.backgroundGeometry.dispose();
    this.backgroundMaterial.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    for (const shaft of this.shafts) {
      shaft.mesh.geometry.dispose();
      (shaft.mesh.material as THREE.Material).dispose();
    }
    this.burst.dispose();
  }
}