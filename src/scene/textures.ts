import * as THREE from "three";

/** Shared font stacks: the lab page may not have loaded webfonts yet, so the
 *  canvases fall back gracefully and are redrawn once document.fonts is ready. */
const SANS = '"Space Grotesk Variable", "Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const MONO = '"SFMono-Regular", "JetBrains Mono", Consolas, monospace';

type Align = "left" | "center";

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: Align = "center"
): void {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, chars.length - 1);
  let cursor = align === "center" ? x - total / 2 : x;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 1024 x 2048 lock screen: deep teal / black, the 09:41 clock, a NOVA X1 Pro
 * wordmark, a fine instrument grid and edge ticks. Redrawn after fonts load so
 * the display is crisp in the display chapter close-up.
 */
export function createWallpaperTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for the wallpaper");

  const draw = (): void => {
    ctx.clearRect(0, 0, width, height);

    const base = ctx.createLinearGradient(0, 0, width * 0.35, height);
    base.addColorStop(0, "#0a2422");
    base.addColorStop(0.28, "#061714");
    base.addColorStop(0.66, "#02090a");
    base.addColorStop(1, "#010304");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * 0.78, height * 0.14, 0, width * 0.78, height * 0.14, 680);
    glow.addColorStop(0, "rgba(72, 224, 198, 0.18)");
    glow.addColorStop(0.45, "rgba(30, 120, 118, 0.10)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const low = ctx.createRadialGradient(width * 0.18, height * 0.78, 0, width * 0.18, height * 0.78, 620);
    low.addColorStop(0, "rgba(16, 82, 92, 0.14)");
    low.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = low;
    ctx.fillRect(0, 0, width, height);

    // Fine instrument grid.
    ctx.save();
    ctx.strokeStyle = "rgba(126, 247, 223, 0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // Orbit geometry around the wordmark.
    ctx.save();
    ctx.strokeStyle = "rgba(186, 255, 240, 0.075)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, 398, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(186, 255, 240, 0.035)";
    ctx.setLineDash([2, 14]);
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, 330, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Edge ticks, like a precision instrument.
    ctx.save();
    ctx.strokeStyle = "rgba(168, 255, 236, 0.13)";
    ctx.lineWidth = 2;
    for (let y = 320; y <= 1780; y += 48) {
      const major = (y - 320) % 192 === 0;
      ctx.beginPath();
      ctx.moveTo(34, y + 0.5);
      ctx.lineTo(34 + (major ? 26 : 14), y + 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 34, y + 0.5);
      ctx.lineTo(width - 34 - (major ? 26 : 14), y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // Corner brackets.
    ctx.save();
    ctx.strokeStyle = "rgba(150, 255, 236, 0.16)";
    ctx.lineWidth = 2;
    const inset = 44;
    const len = 46;
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 1, 1],
      [width - inset, inset, -1, 1],
      [inset, height - inset, 1, -1],
      [width - inset, height - inset, -1, -1]
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + sx * len, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * len);
      ctx.stroke();
    }
    ctx.restore();

    // Status row.
    ctx.save();
    ctx.fillStyle = "rgba(230, 255, 248, 0.86)";
    ctx.font = "600 30px " + MONO;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("09:41", 84, 176);

    ctx.fillStyle = "rgba(190, 255, 240, 0.55)";
    ctx.font = "500 18px " + MONO;
    drawTracked(ctx, "NOVA OS 9  ·  X1 PRO", 84, 214, 2, "left");

    // signal bars
    ctx.fillStyle = "rgba(225, 255, 248, 0.8)";
    for (let i = 0; i < 4; i++) {
      const barHeight = 8 + i * 5;
      ctx.fillRect(812 + i * 11, 166 - barHeight, 5, barHeight);
    }
    // wifi
    ctx.strokeStyle = "rgba(225, 255, 248, 0.8)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(886, 168, 8 + i * 7, Math.PI * 1.22, Math.PI * 1.78);
      ctx.stroke();
    }
    // battery
    ctx.strokeStyle = "rgba(225, 255, 248, 0.66)";
    ctx.lineWidth = 2;
    ctx.strokeRect(928, 148, 38, 20);
    ctx.fillStyle = "rgba(225, 255, 248, 0.8)";
    ctx.fillRect(932, 152, 25, 12);
    ctx.fillRect(968, 154, 3, 8);
    ctx.restore();

    // Faint date.
    ctx.save();
    ctx.fillStyle = "rgba(220, 255, 247, 0.44)";
    ctx.font = "500 22px " + SANS;
    drawTracked(ctx, "MONDAY 09 JUNE", 84, 268, 5, "left");
    ctx.restore();

    // Lock-screen hairline + world clock flavour.
    ctx.save();
    ctx.strokeStyle = "rgba(160, 255, 238, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(84, height * 0.325);
    ctx.lineTo(width - 84, height * 0.325);
    ctx.stroke();
    ctx.restore();

    // Wordmark.
    ctx.save();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(234, 255, 249, 0.95)";
    ctx.shadowColor = "rgba(94, 242, 214, 0.55)";
    ctx.shadowBlur = 44;
    ctx.font = "700 158px " + SANS;
    drawTracked(ctx, "NOVA", width * 0.5, height * 0.512, 26, "center");
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(196, 255, 241, 0.62)";
    ctx.font = "500 28px " + SANS;
    drawTracked(ctx, "X1 PRO", width * 0.5, height * 0.548, 20, "center");
    ctx.restore();

    // Small mid-screen annotation.
    ctx.save();
    ctx.fillStyle = "rgba(170, 255, 237, 0.34)";
    ctx.font = "400 18px " + MONO;
    drawTracked(ctx, "LIGHT ENGINEERED", width * 0.5, height * 0.585, 7, "center");
    ctx.restore();

    // Bottom cluster.
    ctx.save();
    ctx.fillStyle = "rgba(200, 255, 243, 0.36)";
    ctx.font = "500 19px " + MONO;
    drawTracked(ctx, "09 JUN  ·  SHANGHAI", width * 0.5, height * 0.905, 3, "center");

    ctx.fillStyle = "rgba(230, 255, 248, 0.5)";
    ctx.font = "600 22px " + SANS;
    drawTracked(ctx, "NOVA", width * 0.5, height * 0.935, 8, "center");
    ctx.restore();

    // Home indicator.
    ctx.save();
    ctx.fillStyle = "rgba(225, 255, 247, 0.42)";
    const barW = 320;
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = height - 72;
    const r = barH / 2;
    ctx.beginPath();
    ctx.moveTo(barX + r, barY);
    ctx.lineTo(barX + barW - r, barY);
    ctx.arc(barX + barW - r, barY + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(barX + r, barY + barH);
    ctx.arc(barX + r, barY + r, r, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  draw();

  // The wallpaper is sampled by a custom ShaderMaterial which decodes sRGB
  // explicitly. Uploading it as a raw RGBA texture (NoColorSpace) makes that
  // decode deterministic and prevents any double-gamma ambiguity.
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  if (typeof document !== "undefined" && document.fonts) {
    void document.fonts.ready.then(() => {
      draw();
      texture.needsUpdate = true;
    });
  }

  return texture;
}

/** Elegant back-cover mark: a thin ring, a geometric N, a tiny NOVA wordmark. */
export function createLogoTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for the logo");

  const draw = (): void => {
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 214, 132, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(256, 214, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(206, 258);
    ctx.lineTo(206, 170);
    ctx.lineTo(306, 258);
    ctx.lineTo(306, 170);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
    ctx.font = "600 42px " + SANS;
    drawTracked(ctx, "NOVA", 256, 428, 16, "center");
    ctx.restore();
  };

  draw();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  if (typeof document !== "undefined" && document.fonts) {
    void document.fonts.ready.then(() => {
      draw();
      texture.needsUpdate = true;
    });
  }

  return texture;
}

/** Mainboard artwork: PCB traces, pads and silkscreen. Used as map + emissiveMap. */
export function createCircuitTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 620;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for the circuit board");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#071411");
  bg.addColorStop(0.55, "#040d0b");
  bg.addColorStop(1, "#071011");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const rand = mulberry32(20260609);

  // Copper-ish ground pour hints.
  ctx.save();
  ctx.strokeStyle = "rgba(94, 242, 214, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const y = 24 + i * 42;
    ctx.beginPath();
    ctx.moveTo(18, y + 0.5);
    ctx.lineTo(width - 18, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Traces with 45 degree elbows.
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 34; i++) {
    const x = 26 + Math.floor(rand() * 44) * 10;
    const y = 26 + Math.floor(rand() * 56) * 10;
    const horizontal = rand() > 0.45;
    const length = 50 + Math.floor(rand() * 150);
    const alpha = 0.10 + rand() * 0.22;
    ctx.strokeStyle = "rgba(94, 242, 214, " + alpha.toFixed(3) + ")";
    ctx.lineWidth = rand() > 0.8 ? 2.4 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (horizontal) {
      ctx.lineTo(x + length * 0.62, y);
      ctx.lineTo(x + length, y + (rand() > 0.5 ? 18 : -18));
    } else {
      ctx.lineTo(x, y + length * 0.62);
      ctx.lineTo(x + (rand() > 0.5 ? 18 : -18), y + length);
    }
    ctx.stroke();

    if (rand() > 0.55) {
      ctx.fillStyle = "rgba(120, 255, 232, 0.45)";
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Chip footprint / keep-out.
  ctx.save();
  ctx.strokeStyle = "rgba(120, 255, 232, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(126, 176, 260, 236);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(94, 242, 214, 0.05)";
  ctx.fillRect(126, 176, 260, 236);
  ctx.restore();

  // Solder pads.
  ctx.save();
  ctx.fillStyle = "rgba(196, 255, 240, 0.30)";
  for (let i = 0; i < 48; i++) {
    const x = 60 + Math.floor(rand() * 40) * 10;
    const y = 60 + Math.floor(rand() * 50) * 10;
    ctx.fillRect(x, y, 5, 3);
  }
  ctx.restore();

  // Silkscreen.
  ctx.save();
  ctx.fillStyle = "rgba(202, 255, 242, 0.34)";
  ctx.font = "500 15px " + MONO;
  drawTracked(ctx, "NOVA X1  ·  MAIN LOGIC", 28, height - 34, 2.5, "left");
  ctx.fillStyle = "rgba(202, 255, 242, 0.18)";
  ctx.font = "400 12px " + MONO;
  drawTracked(ctx, "N1-SOC / 3NM / REV.C", 28, height - 14, 2, "left");
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Battery wrap: graphite panel, capacity type, hazard microtype. */
export function createBatteryTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 620;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for the battery");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#101317");
  bg.addColorStop(0.6, "#0a0c0f");
  bg.addColorStop(1, "#12151a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  ctx.fillStyle = "rgba(232, 244, 240, 0.42)";
  ctx.font = "600 18px " + MONO;
  drawTracked(ctx, "NOVA  ·  ENERGY CELL", 44, 66, 3, "left");

  ctx.fillStyle = "rgba(238, 250, 246, 0.78)";
  ctx.font = "700 110px " + SANS;
  drawTracked(ctx, "5600", 44, 210, 4, "left");
  ctx.fillStyle = "rgba(238, 250, 246, 0.48)";
  ctx.font = "500 34px " + SANS;
  drawTracked(ctx, "mAh", 44, 252, 6, "left");

  ctx.fillStyle = "rgba(210, 240, 234, 0.36)";
  ctx.font = "400 18px " + MONO;
  drawTracked(ctx, "Li-ion polymer  ·  3.87V  ·  22.5Wh", 44, 306, 1.5, "left");
  drawTracked(ctx, "CELL 04 / 2026  ·  MADE ON EARTH", 44, 334, 1.5, "left");

  // A quiet barcode block.
  const rand = mulberry32(770311);
  ctx.fillStyle = "rgba(226, 248, 242, 0.24)";
  let x = 44;
  for (let i = 0; i < 46; i++) {
    const w = rand() > 0.5 ? 3 : 1.5;
    ctx.fillRect(x, height - 104, w, 42);
    x += w + 2 + rand() * 3;
    if (x > width - 60) break;
  }

  ctx.fillStyle = "rgba(190, 220, 214, 0.22)";
  ctx.font = "400 12px " + MONO;
  drawTracked(ctx, "DO NOT PUNCTURE · DO NOT HEAT · RECYCLE", 44, height - 44, 1.5, "left");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Silicon top: dark package with luminous N1 die print. */
export function createChipTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for the chip");

  ctx.fillStyle = "#04090a";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(94, 242, 214, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, size - 28, size - 28);

  // Die grid.
  ctx.strokeStyle = "rgba(94, 242, 214, 0.10)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const p = 14 + (i * (size - 28)) / 8;
    ctx.beginPath();
    ctx.moveTo(p, 14);
    ctx.lineTo(p, size - 14);
    ctx.moveTo(14, p);
    ctx.lineTo(size - 14, p);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(214, 255, 244, 0.9)";
  ctx.font = "700 76px " + SANS;
  drawTracked(ctx, "N1", size / 2, 148, 4, "center");

  ctx.fillStyle = "rgba(160, 255, 235, 0.5)";
  ctx.font = "500 14px " + MONO;
  drawTracked(ctx, "NOVA SILICON", size / 2, 186, 4, "center");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}