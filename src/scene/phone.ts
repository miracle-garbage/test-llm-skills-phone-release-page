import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  createBatteryTexture,
  createChipTexture,
  createCircuitTexture,
  createLogoTexture,
  createWallpaperTexture
} from "./textures";
import { screenFragment, screenVertex } from "./shaders";
import type { Colorway, StageParams } from "./types";

const WIDTH = 2.0;
const HEIGHT = 4.25;
const DEPTH = 0.34;

interface ColorwaySpec {
  frame: number;
  frameMetalness: number;
  frameRoughness: number;
  back: number;
  backRoughness: number;
  accent: number;
  accent2: number;
  logo: number;
}

const COLORWAYS: Record<Colorway, ColorwaySpec> = {
  titanium: {
    frame: 0x96918a,
    frameMetalness: 1,
    frameRoughness: 0.22,
    back: 0x14161a,
    backRoughness: 0.14,
    accent: 0x5ef2d6,
    accent2: 0xff7a45,
    logo: 0xd9fff5
  },
  aurora: {
    frame: 0x3d6c60,
    frameMetalness: 0.96,
    frameRoughness: 0.27,
    back: 0x06110e,
    backRoughness: 0.17,
    accent: 0x5effc0,
    accent2: 0x2f9dff,
    logo: 0xc9ffe9
  },
  lunar: {
    frame: 0xe9e5da,
    frameMetalness: 0.32,
    frameRoughness: 0.4,
    back: 0xe4dfd3,
    backRoughness: 0.22,
    accent: 0xffb27a,
    accent2: 0xfff1dc,
    logo: 0x4a433a
  }
};

interface ExplodeLayer {
  group: THREE.Group;
  dx: number;
  dy: number;
  dz: number;
}

/**
 * Procedural NOVA X1 Pro. All meshes live under a floating inner group so the
 * idle motion never fights the scroll timeline that drives the root group.
 */
export class PhoneModel {
  readonly root = new THREE.Group();
  readonly float = new THREE.Group();

  private readonly layers: ExplodeLayer[] = [];

  private readonly frameMat: THREE.MeshPhysicalMaterial;
  private readonly backMat: THREE.MeshPhysicalMaterial;
  private readonly buttonMat: THREE.MeshPhysicalMaterial;
  private readonly logoMat: THREE.MeshBasicMaterial;
  private readonly islandMat: THREE.MeshPhysicalMaterial;
  private readonly frontGlassMat: THREE.MeshPhysicalMaterial;

  private readonly lensRings: THREE.MeshStandardMaterial[] = [];
  private readonly lensGlasses: THREE.MeshPhysicalMaterial[] = [];
  private readonly pulses = [0, 0, 0];

  private readonly uTime = { value: 0 };
  private readonly uScroll = { value: 0 };
  private readonly uReveal = { value: 0 };
  private readonly uPointer = { value: new THREE.Vector2() };
  private readonly uAccent = { value: new THREE.Color(COLORWAYS.titanium.accent) };

  private readonly targetFrame = new THREE.Color(COLORWAYS.titanium.frame);
  private readonly targetBack = new THREE.Color(COLORWAYS.titanium.back);
  private readonly targetAccent = new THREE.Color(COLORWAYS.titanium.accent);
  private readonly targetAccent2 = new THREE.Color(COLORWAYS.titanium.accent2);
  private readonly targetLogo = new THREE.Color(COLORWAYS.titanium.logo);

  private readonly accent = new THREE.Color(COLORWAYS.titanium.accent);
  private readonly accent2 = new THREE.Color(COLORWAYS.titanium.accent2);

  private targetMetalness = COLORWAYS.titanium.frameMetalness;
  private targetRoughness = COLORWAYS.titanium.frameRoughness;
  private targetBackRoughness = COLORWAYS.titanium.backRoughness;

  private explode = 0;
  private reveal = 0;

  private backGroup!: THREE.Group;
  private screenGroup!: THREE.Group;

  private readonly target = new THREE.Vector3();

  constructor(params: StageParams) {
    this.root.name = "NOVA_X1_PRO";
    this.float.name = "phone_float";
    this.root.add(this.float);

    this.frameMat = new THREE.MeshPhysicalMaterial({
      color: COLORWAYS.titanium.frame,
      metalness: COLORWAYS.titanium.frameMetalness,
      roughness: COLORWAYS.titanium.frameRoughness,
      clearcoat: 0.55,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.45,
      dithering: true
    });

    this.backMat = new THREE.MeshPhysicalMaterial({
      color: COLORWAYS.titanium.back,
      metalness: 0.22,
      roughness: COLORWAYS.titanium.backRoughness,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      envMapIntensity: 1.45,
      dithering: true
    });

    this.buttonMat = new THREE.MeshPhysicalMaterial({
      color: 0x6b6760,
      metalness: 0.95,
      roughness: 0.3,
      clearcoat: 0.4,
      envMapIntensity: 1.1
    });

    this.islandMat = new THREE.MeshPhysicalMaterial({
      color: 0x23262b,
      metalness: 0.82,
      roughness: 0.34,
      clearcoat: 0.6,
      clearcoatRoughness: 0.16,
      envMapIntensity: 1.15
    });

    this.frontGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x040709,
      metalness: 0.08,
      roughness: 0.045,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6
    });

    this.logoMat = new THREE.MeshBasicMaterial({
      map: createLogoTexture(),
      color: COLORWAYS.titanium.logo,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: true
    });

    this.buildBack();
    this.buildScreen(params);
    this.buildInternals();
    this.setColorway("titanium");
  }

  // ------------------------------------------------------------------ back

  private buildBack(): void {
    const back = new THREE.Group();
    back.name = "layer_back_cover";
    this.backGroup = back;

    const body = new THREE.Mesh(new RoundedBoxGeometry(WIDTH, HEIGHT, DEPTH, 6, 0.15), this.frameMat);
    body.name = "titanium_frame";
    back.add(body);

    // Slightly proud glass panel with a deep, calm reflection.
    const backGlass = new THREE.Mesh(new RoundedBoxGeometry(1.96, 4.2, 0.018, 5, 0.1), this.backMat);
    backGlass.position.z = -0.173;
    back.add(backGlass);

    // Logo sits on the back glass, facing -Z. Rotating the plane keeps the
    // texture readable when the design chapter spins the phone around.
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), this.logoMat);
    logo.position.set(0, -0.58, -0.1845);
    logo.rotation.y = Math.PI;
    back.add(logo);

    this.buildCameraIsland(back);
    this.buildSideDetails(back);

    this.float.add(back);
    // The back panel is removed and laid beside the stack: the performance
    // chapter views the phone from the back, so a pure -Z move would hide the
    // internals behind it.
    this.layers.push({ group: back, dx: 2.15, dy: 0, dz: -1.22 });
  }

  private buildCameraIsland(parent: THREE.Group): void {
    const island = new THREE.Group();
    island.name = "camera_island";
    island.position.set(0.4, 1.42, -0.23);

    const plate = new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.1, 0.14, 4, 0.09), this.islandMat);
    island.add(plate);

    const step = new THREE.Mesh(
      new RoundedBoxGeometry(1.0, 1.0, 0.016, 3, 0.075),
      new THREE.MeshPhysicalMaterial({
        color: 0x1b1e22,
        metalness: 0.55,
        roughness: 0.42,
        clearcoat: 0.7,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.2
      })
    );
    step.position.z = -0.074;
    island.add(step);

    const barrelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.075, 40, 1);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshPhysicalMaterial({
      color: 0x191c20,
      metalness: 0.95,
      roughness: 0.26,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.2
    });

    const bezelGeo = new THREE.TorusGeometry(0.185, 0.013, 12, 56);
    const innerBezelGeo = new THREE.TorusGeometry(0.15, 0.007, 8, 48);
    const glassGeo = new THREE.CircleGeometry(0.153, 48);
    glassGeo.rotateY(Math.PI);
    const coreGeo = new THREE.CircleGeometry(0.084, 32);
    coreGeo.rotateY(Math.PI);

    const glassMatBase = {
      color: 0x020407,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.1
    } as const;

    const positions: Array<[number, number]> = [
      [-0.25, 0.25],
      [-0.25, -0.25],
      [0.25, 0.25]
    ];

    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[i];
      const lens = new THREE.Group();
      lens.position.set(x, y, 0);

      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.z = -0.1;
      lens.add(barrel);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x0b1113,
        metalness: 0.9,
        roughness: 0.22,
        emissive: new THREE.Color(COLORWAYS.titanium.accent),
        emissiveIntensity: 0.3
      });
      this.lensRings.push(ringMat);

      const bezel = new THREE.Mesh(bezelGeo, ringMat);
      bezel.position.z = -0.142;
      lens.add(bezel);

      const innerBezel = new THREE.Mesh(innerBezelGeo, barrelMat);
      innerBezel.position.z = -0.144;
      lens.add(innerBezel);

      const glassMat = new THREE.MeshPhysicalMaterial({ ...glassMatBase });
      this.lensGlasses.push(glassMat);

      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.z = -0.145;
      lens.add(glass);

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x04100f,
        metalness: 0.6,
        roughness: 0.12,
        emissive: new THREE.Color(COLORWAYS.titanium.accent),
        emissiveIntensity: 0.18
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.z = -0.147;
      lens.add(core);

      island.add(lens);
    }

    // LED flash.
    const flashRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.083, 0.009, 8, 40),
      barrelMat
    );
    flashRing.position.set(0.25, -0.25, -0.143);
    island.add(flashRing);

    const flashGeo = new THREE.CircleGeometry(0.074, 32);
    flashGeo.rotateY(Math.PI);
    const flash = new THREE.Mesh(
      flashGeo,
      new THREE.MeshStandardMaterial({
        color: 0x3a3022,
        metalness: 0.2,
        roughness: 0.35,
        emissive: new THREE.Color(0xfff1cf),
        emissiveIntensity: 0.7
      })
    );
    flash.position.set(0.25, -0.25, -0.145);
    island.add(flash);

    parent.add(island);
  }

  private buildSideDetails(parent: THREE.Group): void {
    const buttonGeo = new RoundedBoxGeometry(0.03, 0.56, 0.11, 2, 0.012);
    const power = new THREE.Mesh(buttonGeo, this.buttonMat);
    power.position.set(1.007, 0.52, 0);
    parent.add(power);

    const volumeGeo = new RoundedBoxGeometry(0.03, 0.38, 0.11, 2, 0.012);
    const volumeTop = new THREE.Mesh(volumeGeo, this.buttonMat);
    volumeTop.position.set(-1.007, 0.86, 0);
    parent.add(volumeTop);

    const volumeBottom = new THREE.Mesh(volumeGeo, this.buttonMat);
    volumeBottom.position.set(-1.007, 0.36, 0);
    parent.add(volumeBottom);

    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0x1d1f22,
      metalness: 0.4,
      roughness: 0.72
    });
    const antennaGeo = new THREE.BoxGeometry(0.022, 0.075, 0.352);
    for (const x of [-1.0, 1.0]) {
      for (const y of [-1.85, 1.85]) {
        const line = new THREE.Mesh(antennaGeo, antennaMat);
        line.position.set(x, y, 0);
        parent.add(line);
      }
    }

    // Bottom edge: USB-C and a row of speaker perforations.
    const portMat = new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.4, roughness: 0.5 });
    const port = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.018, 0.06, 2, 0.008), portMat);
    port.position.set(0, -2.132, 0);
    parent.add(port);

    const pinholeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10, 1);
    const holes = new THREE.InstancedMesh(pinholeGeo, portMat, 12);
    const dummy = new THREE.Object3D();
    let index = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        dummy.position.set(side * (0.35 + i * 0.05), -2.132, 0);
        dummy.updateMatrix();
        holes.setMatrixAt(index, dummy.matrix);
        index++;
      }
    }
    holes.instanceMatrix.needsUpdate = true;
    parent.add(holes);
  }

  // ---------------------------------------------------------------- screen

  private buildScreen(params: StageParams): void {
    const screen = new THREE.Group();
    screen.name = "layer_display";
    this.screenGroup = screen;

    const frontGlass = new THREE.Mesh(
      new RoundedBoxGeometry(1.96, 4.2, 0.014, 5, 0.1),
      this.frontGlassMat
    );
    frontGlass.name = "screen_front_glass";
    frontGlass.position.z = 0.176;
    screen.add(frontGlass);

    const panel = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 4.06, 0.024, 3, 0.07),
      new THREE.MeshStandardMaterial({
        color: 0x020708,
        metalness: 0.35,
        roughness: 0.3,
        emissive: new THREE.Color(0x03201d),
        emissiveIntensity: 0.25
      })
    );
    panel.position.z = 0.157;
    screen.add(panel);

    const wallpaper = createWallpaperTexture();
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: wallpaper },
        uTime: this.uTime,
        uScroll: this.uScroll,
        uReveal: this.uReveal,
        uPointer: this.uPointer,
        uAccent: this.uAccent
      },
      vertexShader: screenVertex,
      fragmentShader: screenFragment
    });
    const display = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 3.98), material);
    display.name = "screen_display";
    display.position.z = 0.184;
    screen.add(display);

    // A physical sheet of glass over the panel, so environment reflections
    // travel across the display as the phone turns.
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(1.86, 4.02),
      // Additive glass: it only *adds* reflections. Normal blending would
      // veil the display with the material's diffuse response.
      new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        metalness: 0,
        roughness: 0.03,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        envMapIntensity: 0.9
      })
    );
    overlay.name = "screen_glass_overlay";
    overlay.position.z = 0.186;
    overlay.renderOrder = 2;
    screen.add(overlay);

    this.float.add(screen);
    this.layers.push({ group: screen, dx: 0, dy: 0.04, dz: 1.2 });
    this.reveal = params.screenReveal;
  }

  // -------------------------------------------------------------- internals

  private buildInternals(): void {
    const circuit = createCircuitTexture();
    const chipTex = createChipTexture();
    const batteryTex = createBatteryTexture();

    // Mainboard ---------------------------------------------------------
    const boardGroup = new THREE.Group();
    boardGroup.name = "layer_mainboard";

    const board = new THREE.Mesh(
      new RoundedBoxGeometry(1.58, 1.86, 0.035, 3, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x06100e, metalness: 0.6, roughness: 0.5 })
    );
    board.position.set(0.04, 0.94, 0.005);
    boardGroup.add(board);

    const boardFaceMat = new THREE.MeshStandardMaterial({
      map: circuit,
      emissive: new THREE.Color(0x9fffee),
      emissiveMap: circuit,
      emissiveIntensity: 0.85,
      metalness: 0.35,
      roughness: 0.42
    });
    const boardFace = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 1.8), boardFaceMat);
    boardFace.position.set(0.04, 0.94, 0.024);
    boardGroup.add(boardFace);

    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 1.8), boardFaceMat);
    boardBack.position.set(0.04, 0.94, -0.014);
    boardBack.rotation.y = Math.PI;
    boardGroup.add(boardBack);

    const chip = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.46, 0.04, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x060b0c, metalness: 0.5, roughness: 0.35 })
    );
    chip.position.set(0.02, 1.24, 0.045);
    boardGroup.add(chip);

    const chipFaceMat = new THREE.MeshStandardMaterial({
      map: chipTex,
      emissive: new THREE.Color(0xbfffee),
      emissiveMap: chipTex,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.35
    });
    const chipFace = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), chipFaceMat);
    chipFace.position.set(0.02, 1.24, 0.066);
    boardGroup.add(chipFace);

    const chipBack = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), chipFaceMat);
    chipBack.position.set(0.02, 1.24, 0.024);
    chipBack.rotation.y = Math.PI;
    boardGroup.add(chipBack);

    const memory = new THREE.Mesh(
      new RoundedBoxGeometry(0.3, 0.24, 0.03, 2, 0.015),
      new THREE.MeshStandardMaterial({ color: 0x0b1113, metalness: 0.55, roughness: 0.4 })
    );
    memory.position.set(-0.44, 1.38, 0.045);
    boardGroup.add(memory);

    const shield = new THREE.Mesh(
      new RoundedBoxGeometry(0.52, 0.4, 0.025, 2, 0.02),
      new THREE.MeshPhysicalMaterial({ color: 0x9ba3a7, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 })
    );
    shield.position.set(0.36, 0.5, 0.042);
    boardGroup.add(shield);

    this.float.add(boardGroup);
    this.layers.push({ group: boardGroup, dx: 0.14, dy: 0.06, dz: 0.52 });

    // Battery -----------------------------------------------------------
    const batteryGroup = new THREE.Group();
    batteryGroup.name = "layer_battery";

    const battery = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 1.7, 0.06, 4, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0c0f12, metalness: 0.42, roughness: 0.52 })
    );
    battery.position.set(0, -0.78, -0.02);
    batteryGroup.add(battery);

    const labelMat = new THREE.MeshStandardMaterial({
      map: batteryTex,
      metalness: 0.3,
      roughness: 0.5,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: batteryTex,
      emissiveIntensity: 0.12
    });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.56), labelMat);
    label.position.set(0, -0.78, 0.012);
    batteryGroup.add(label);

    const labelBack = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.56), labelMat);
    labelBack.position.set(0, -0.78, -0.053);
    labelBack.rotation.y = Math.PI;
    batteryGroup.add(labelBack);

    this.float.add(batteryGroup);
    this.layers.push({ group: batteryGroup, dx: -0.12, dy: -0.1, dz: 0.14 });

    // Vapour chamber + charging coil -----------------------------------
    const vapourGroup = new THREE.Group();
    vapourGroup.name = "layer_vapour_chamber";

    const chamber = new THREE.Mesh(
      new RoundedBoxGeometry(1.5, 1.78, 0.026, 3, 0.03),
      new THREE.MeshPhysicalMaterial({ color: 0x2a2320, metalness: 0.95, roughness: 0.34, envMapIntensity: 1.1 })
    );
    chamber.position.set(0, -0.78, -0.078);
    vapourGroup.add(chamber);

    const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.3 });
    const coilOuter = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.013, 10, 72), copper);
    coilOuter.position.set(0, -0.78, -0.058);
    vapourGroup.add(coilOuter);

    const coilInner = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.011, 10, 64), copper);
    coilInner.position.set(0, -0.78, -0.058);
    vapourGroup.add(coilInner);

    const coilOuterBack = new THREE.Mesh(coilOuter.geometry, copper);
    coilOuterBack.position.set(0, -0.78, -0.098);
    vapourGroup.add(coilOuterBack);

    const coilInnerBack = new THREE.Mesh(coilInner.geometry, copper);
    coilInnerBack.position.set(0, -0.78, -0.098);
    vapourGroup.add(coilInnerBack);

    this.float.add(vapourGroup);
    this.layers.push({ group: vapourGroup, dx: 0.08, dy: -0.08, dz: -0.18 });

    // Camera module -----------------------------------------------------
    const moduleGroup = new THREE.Group();
    moduleGroup.name = "layer_camera_module";

    const moduleMat = new THREE.MeshPhysicalMaterial({
      color: 0x11161a,
      metalness: 0.8,
      roughness: 0.32,
      clearcoat: 0.4,
      envMapIntensity: 1
    });
    const moduleBox = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.1, 3, 0.06), moduleMat);
    moduleBox.position.set(0.4, 1.42, -0.045);
    moduleGroup.add(moduleBox);

    const barrelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 28, 1);
    barrelGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x050a0c,
      metalness: 0.2,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.8
    });
    const moduleLenses: Array<[number, number]> = [
      [0.2, 0.2],
      [0.2, -0.2],
      [-0.2, 0.2]
    ];
    for (const [lx, ly] of moduleLenses) {
      const barrel = new THREE.Mesh(barrelGeo, moduleMat);
      barrel.position.set(0.4 + lx, 1.42 + ly, 0.03);
      moduleGroup.add(barrel);

      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), lensMat);
      glass.position.set(0.4 + lx, 1.42 + ly, 0.061);
      moduleGroup.add(glass);

      // The exploded performance shot looks at the module from the back.
      const rearBarrel = new THREE.Mesh(barrelGeo, moduleMat);
      rearBarrel.position.set(0.4 + lx, 1.42 + ly, -0.12);
      moduleGroup.add(rearBarrel);

      const rearGlass = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), lensMat);
      rearGlass.position.set(0.4 + lx, 1.42 + ly, -0.151);
      rearGlass.rotation.y = Math.PI;
      moduleGroup.add(rearGlass);
    }

    this.float.add(moduleGroup);
    this.layers.push({ group: moduleGroup, dx: -0.16, dy: 0.08, dz: -0.62 });

    // Display driver strip: visible when the exploded stacks are seen from behind.
    const driverMat = new THREE.MeshStandardMaterial({
      map: circuit,
      emissive: new THREE.Color(0x9fffee),
      emissiveMap: circuit,
      emissiveIntensity: 0.4,
      metalness: 0.4,
      roughness: 0.5
    });
    const driver = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.42), driverMat);
    driver.position.set(0, 1.5, 0.142);
    driver.rotation.y = Math.PI;
    this.screenGroup.add(driver);

    // Inner face of the removed back cover.
    const linerMat = new THREE.MeshStandardMaterial({
      map: circuit,
      color: 0x243230,
      emissive: new THREE.Color(0x2f6a5f),
      emissiveMap: circuit,
      emissiveIntensity: 0.22,
      metalness: 0.6,
      roughness: 0.52
    });
    const liner = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 4.13), linerMat);
    liner.position.set(0, 0, 0.172);
    this.backGroup.add(liner);
  }

  // ------------------------------------------------------------------- api

  setColorway(colorway: Colorway): void {
    const spec = COLORWAYS[colorway];
    this.targetFrame.setHex(spec.frame);
    this.targetBack.setHex(spec.back);
    this.targetAccent.setHex(spec.accent);
    this.targetAccent2.setHex(spec.accent2);
    this.targetLogo.setHex(spec.logo);
    this.targetMetalness = spec.frameMetalness;
    this.targetRoughness = spec.frameRoughness;
    this.targetBackRoughness = spec.backRoughness;
  }

  pulseLens(index: number): void {
    const i = Math.round(index);
    if (i < 0 || i > 2) return;
    this.pulses[i] = 1;
  }

  getBloomBoost(): number {
    return (this.pulses[0] + this.pulses[1] + this.pulses[2]) * 0.55;
  }

  get accentColor(): THREE.Color {
    return this.accent;
  }

  get accentSecondary(): THREE.Color {
    return this.accent2;
  }

  get isExploded(): number {
    return this.explode;
  }

  update(
    dt: number,
    elapsed: number,
    params: StageParams,
    pointer: THREE.Vector2,
    scroll: number
  ): void {
    const k = 1 - Math.exp(-dt * 3.1);
    const colorK = 1 - Math.exp(-dt * 2.4);

    this.frameMat.color.lerp(this.targetFrame, colorK);
    this.frameMat.metalness = THREE.MathUtils.lerp(this.frameMat.metalness, this.targetMetalness, k);
    this.frameMat.roughness = THREE.MathUtils.lerp(this.frameMat.roughness, this.targetRoughness, k);
    this.backMat.color.lerp(this.targetBack, colorK);
    this.backMat.roughness = THREE.MathUtils.lerp(this.backMat.roughness, this.targetBackRoughness, k);
    this.buttonMat.color.copy(this.frameMat.color).multiplyScalar(0.82);
    this.logoMat.color.lerp(this.targetLogo, colorK);
    this.islandMat.color.copy(this.backMat.color).lerp(this.targetFrame, 0.18);

    this.accent.lerp(this.targetAccent, colorK);
    this.accent2.lerp(this.targetAccent2, colorK);
    this.uAccent.value.copy(this.accent);

    for (const ring of this.lensRings) ring.emissive.copy(this.accent);
    for (const glass of this.lensGlasses) glass.emissive.copy(this.accent);

    // Lens pulses decay independently: the stage only adds a bloom boost.
    for (let i = 0; i < 3; i++) {
      if (this.pulses[i] > 0) this.pulses[i] = Math.max(0, this.pulses[i] - dt * 1.55);
      const p = this.pulses[i];
      this.lensRings[i].emissiveIntensity = 0.26 + p * 5.4;
      this.lensGlasses[i].emissiveIntensity = p * 1.35;
    }

    // Exploded view.
    const ek = 1 - Math.exp(-dt * 4.2);
    this.explode += (params.explode - this.explode) * ek;
    for (const layer of this.layers) {
      layer.group.position.set(layer.dx * this.explode, layer.dy * this.explode, layer.dz * this.explode);
    }

    // Screen uniforms, damped so GSAP-driven params read smoothly.
    this.uTime.value = elapsed;
    this.uScroll.value = scroll;
    this.reveal += (params.screenReveal - this.reveal) * (1 - Math.exp(-dt * 5));
    this.uReveal.value = this.reveal;
    this.uPointer.value.copy(pointer);

    // Idle float + pointer parallax. Small on purpose: the root group is the
    // scroll timeline's territory.
    const calm = 1 - this.explode * 0.55;
    const px = pointer.x * 0.055 * calm;
    const py = pointer.y * 0.035 * calm;
    this.float.position.x += (px - this.float.position.x) * (1 - Math.exp(-dt * 2.6));
    this.float.position.y += (Math.sin(elapsed * 0.62) * 0.038 + py - this.float.position.y) * (1 - Math.exp(-dt * 2.6));
    this.float.rotation.y = Math.sin(elapsed * 0.31) * 0.014 * calm + pointer.x * 0.035 * calm;
    this.float.rotation.x = Math.sin(elapsed * 0.43) * 0.009 * calm - pointer.y * 0.022 * calm;
    this.float.rotation.z = Math.sin(elapsed * 0.27) * 0.006 * calm;
  }

  dispose(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    this.root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const material = mesh.material;
      const list = Array.isArray(material) ? material : [material];
      for (const item of list) {
        if (!item) continue;
        materials.add(item);
        for (const value of Object.values(item)) {
          if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
        }
      }
    });

    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }
}