import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PhoneModel } from "./phone";
import { StageEnvironment } from "./environment";
import { StageEffects } from "./effects";
import type { Colorway, Stage, StageParams } from "./types";

/**
 * Creates the procedural NOVA X1 Pro stage. The renderer / composer chain is
 * WebGLRenderer based (ACES + OutputPass); all textures and geometry are
 * generated at runtime, so there are no network assets to load.
 */
export function createStage(canvas: HTMLCanvasElement): Stage {
  const params: StageParams = {
    bloom: 0.95,
    bloomRadius: 0.62,
    exposure: 1.04,
    grain: 0.055,
    chromatic: 0.0015,
    vignette: 0.62,
    screenReveal: 0.35,
    explode: 0,
    background: 1
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x06070a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = params.exposure;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06070a);

  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0.45, 0.12, 9.3);
  const lookTarget = new THREE.Vector3(0.5, -0.02, 0);

  // Image based lighting: RoomEnvironment is procedural, no HDR download.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environmentTarget = pmrem.fromScene(room, 0.035);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.9;
  room.dispose();
  pmrem.dispose();

  const phone = new PhoneModel(params);
  scene.add(phone.root);

  const environment = new StageEnvironment(scene);
  phone.float.add(environment.burst.object);

  const effects = new StageEffects(renderer, scene, camera);

  const pointerTarget = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  let scrollTarget = 0;
  let scroll = 0;

  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  let elapsed = 0;
  let lastCalls = 0;
  let renderedFirstFrame = false;
  let started = false;
  let dprDropped = false;
  let sampleFrames = 0;
  let sampleTime = 0;

  let resolveReady: () => void = () => {
    /* reassigned below */
  };
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const timer = new THREE.Timer();
  timer.connect(document);

  function applySize(width: number, height: number): void {
    lastWidth = width;
    lastHeight = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    effects.resize(width, height, renderer.getPixelRatio());

    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    environment.resize(buffer.y, camera.fov);
  }

  function renderFrame(): void {
    timer.update();
    const rawDelta = timer.getDelta();
    const dt = Math.min(Math.max(rawDelta, 0), 0.05);
    elapsed += dt;

    // Damped pointer / scroll keep fast mouse moves from snapping the scene.
    pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 4.2));
    scroll += (scrollTarget - scroll) * (1 - Math.exp(-dt * 7));

    phone.update(dt, elapsed, params, pointer, scroll);
    environment.update(
      dt,
      elapsed,
      params,
      pointer,
      scroll,
      phone.accentColor,
      phone.accentSecondary
    );

    renderer.toneMappingExposure = params.exposure;
    effects.update(params, elapsed, scroll, phone.getBloomBoost());

    camera.lookAt(lookTarget);

    renderer.info.reset();
    effects.render();
    lastCalls = renderer.info.render.calls;

    if (!renderedFirstFrame) {
      renderedFirstFrame = true;
      console.info(
        "[NOVA stage] first frame · " +
          lastCalls +
          " draw calls · " +
          renderer.info.render.triangles +
          " triangles · dpr " +
          renderer.getPixelRatio()
      );
      resolveReady();
    }

    // Adaptive resolution: if we sustain under 45 fps, drop the DPR once.
    if (!dprDropped && elapsed > 2.2) {
      sampleFrames++;
      sampleTime += Math.max(rawDelta, 0.0001);
      if (sampleTime >= 2) {
        const fps = sampleFrames / sampleTime;
        if (fps < 45 && renderer.getPixelRatio() > 1.26) {
          renderer.setPixelRatio(1.25);
          applySize(lastWidth, lastHeight);
          dprDropped = true;
          console.info("[NOVA stage] adaptive dpr -> 1.25 (" + fps.toFixed(1) + " fps)");
        }
        sampleFrames = 0;
        sampleTime = 0;
      }
    }
  }

  function start(): void {
    if (started) return;
    started = true;
    renderer.setAnimationLoop(renderFrame);
  }

  function stop(): void {
    started = false;
    renderer.setAnimationLoop(null);
  }

  applySize(window.innerWidth, window.innerHeight);
  start();

  function dispose(): void {
    stop();
    timer.dispose();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (!mesh.material) return;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of list) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
        }
        const shader = material as THREE.ShaderMaterial;
        if (shader.uniforms) {
          for (const uniform of Object.values(shader.uniforms)) {
            if (uniform.value && (uniform.value as THREE.Texture).isTexture) {
              textures.add(uniform.value as THREE.Texture);
            }
          }
        }
      }
    });

    effects.dispose();

    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();

    environmentTarget.dispose();
    scene.environment = null;
    scene.background = null;
    scene.clear();

    renderer.dispose();
    renderer.renderLists.dispose();
  }

  return {
    canvas,
    renderer,
    scene,
    camera,
    lookTarget,
    phone: phone.root,
    params,
    ready,
    setColorway(colorway: Colorway): void {
      phone.setColorway(colorway);
    },
    setPointer(x: number, y: number): void {
      pointerTarget.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
    },
    setScroll(progress: number): void {
      scrollTarget = THREE.MathUtils.clamp(progress, 0, 1);
    },
    pulseLens(index: number): void {
      phone.pulseLens(index);
    },
    burst(): void {
      environment.burst.trigger();
    },
    resize(width: number, height: number): void {
      applySize(Math.max(1, width), Math.max(1, height));
    },
    start,
    stop,
    dispose
  };
}