/**
 * GLSL for the procedural NOVA X1 Pro stage. Everything is written for
 * WebGLRenderer + EffectComposer: custom passes output linear HDR values and
 * the OutputPass applies tone mapping / sRGB once, at the end of the chain.
 */

const COMMON = /* glsl */ `
float nHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float nNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(nHash(i), nHash(i + vec2(1.0, 0.0)), u.x),
    mix(nHash(i + vec2(0.0, 1.0)), nHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float nFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amplitude * nNoise(p);
    p = rot * p * 2.03 + 0.11;
    amplitude *= 0.5;
  }
  return value;
}
`;

export const backgroundVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const backgroundFragment = COMMON + /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uIntensity;
uniform vec2 uPointer;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform vec3 uAccent2;

varying vec2 vUv;

void main() {
  vec2 p = vUv - 0.5;
  p.x *= 1.62;

  float t = uTime * 0.018;
  vec2 q = p * 1.35 + vec2(uPointer.x * 0.035, uScroll * 0.20 - t);

  float warp = nFbm(q * 1.15 + nFbm(q * 0.62 + t * 1.4) * 0.85);
  float n = nFbm(q * 1.75 + warp * 1.05 + vec2(0.0, -uScroll * 0.28));

  float falloff = smoothstep(0.92, 0.08, length(p * vec2(1.0, 0.92)));
  float band = smoothstep(0.34, 0.86, n) * falloff;

  vec3 col = uBase;
  col += uAccent * band * 0.15;
  col += uAccent2 * pow(max(0.0, 1.0 - length(p * 1.55)), 3.2) * 0.07;

  // A faint far horizon behind the product keeps the black from going flat.
  col += uAccent * 0.016 * smoothstep(0.55, 0.0, abs(vUv.y - 0.54));

  // Keep the centre quiet: the phone and type own the middle of the frame.
  col *= 1.0 - 0.55 * smoothstep(0.12, 0.62, length(p * vec2(1.35, 1.0)));

  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

export const screenVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const screenFragment = COMMON + /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform float uScroll;
uniform float uReveal;
uniform vec2 uPointer;
uniform vec3 uAccent;

varying vec2 vUv;

vec3 sRGBToLinear(vec3 value) {
  vec3 low = value / 12.92;
  vec3 high = pow((value + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, step(vec3(0.04045), value));
}

void main() {
  vec2 uv = vUv;
  // Raw sRGB wallpaper -> linear working space. OutputPass applies the
  // ACES tone map and the single sRGB encode at the end of the chain.
  vec3 base = sRGBToLinear(texture2D(uMap, uv).rgb);

  // Flowing aurora confined to the upper third of the display.
  vec2 aq = vec2(uv.x * 2.1, uv.y * 3.4 - uTime * 0.026 - uScroll * 0.18);
  float aurora = nFbm(aq + nFbm(aq * 0.65 - uTime * 0.02) * 0.8);
  float mask = smoothstep(0.34, 0.96, uv.y) * smoothstep(0.02, 0.30, uv.y);
  base += uAccent * aurora * aurora * 0.14 * mask;

  // Slow diagonal reflection sweep.
  float diag = uv.x * 0.78 + uv.y * 0.62;
  float sweepPos = mod(uTime * 0.035, 1.9) - 0.35;
  float sweep = smoothstep(0.20, 0.0, abs(diag - sweepPos));
  base += vec3(0.42, 0.78, 0.74) * sweep * 0.04;

  // Reveal: a soft exposure edge plus a thin luminous scanline.
  float edge = mix(-0.04, 1.04, uReveal);
  float visible = smoothstep(edge + 0.045, edge - 0.045, uv.y);
  float scan = exp(-pow((uv.y - edge) / 0.0075, 2.0));
  base *= mix(0.52, 1.0, visible);
  base += uAccent * scan * (0.65 + 0.35 * sin(uTime * 3.2)) * 0.55;

  // Pointer-reactive sheen, barely there.
  float sheen = smoothstep(0.8, 0.0, length(uv - vec2(0.5 + uPointer.x * 0.22, 0.62 + uPointer.y * 0.14)));
  base += uAccent * sheen * 0.012;

  // Fine sensor grain. Multiplicative, so the blacks stay pure.
  float grain = nHash(uv * vec2(1024.0, 2048.0) + fract(uTime) * 61.0);
  base *= 1.0 + (grain - 0.5) * 0.09;

  // Rounded display corners, matching the front glass.
  float cornerR = 0.045;
  float cornerRy = 0.022;
  vec2 d = abs(uv - 0.5) - vec2(0.5 - cornerR, 0.5 - cornerRy);
  vec2 corner = max(d, 0.0) / vec2(cornerR, cornerRy);
  base *= 1.0 - smoothstep(1.0, 1.12, length(corner));

  // Soft falloff at the extreme border.
  vec2 c = uv - 0.5;
  base *= 1.0 - dot(c, c) * 0.30;

  gl_FragColor = vec4(max(base, 0.0), 1.0);
}
`;

export const dustVertex = /* glsl */ `
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uScroll;
uniform float uSizeScale;
uniform vec2 uPointer;

varying float vAlpha;
varying float vSeed;

void main() {
  vec3 p = position;

  float s = aSeed * 6.2831853;
  p.x += sin(uTime * 0.075 + s * 1.7) * 0.42 + uPointer.x * 0.30;
  p.y += cos(uTime * 0.061 + s * 1.3) * 0.34 + uScroll * 0.55;
  p.z += sin(uTime * 0.047 + s * 2.1) * 0.26;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = max(0.1, -mv.z);
  gl_PointSize = clamp(aSize * uSizeScale / depth, 0.6, 26.0);

  float twinkle = 0.55 + 0.45 * sin(uTime * 0.55 + s * 3.0);
  vAlpha = twinkle * smoothstep(1.2, 3.2, depth) * (1.0 - smoothstep(16.0, 26.0, depth));
  vSeed = aSeed;
}
`;

export const dustFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uOpacity;

varying float vAlpha;
varying float vSeed;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.02, d);
  float halo = smoothstep(0.5, 0.18, d);
  vec3 col = mix(uColor, uColor2, step(0.82, vSeed));
  float a = (core * 0.65 + halo * 0.35) * vAlpha * uOpacity;
  gl_FragColor = vec4(col, a);
}
`;

export const burstVertex = /* glsl */ `
attribute vec3 aDir;
attribute float aSpeed;
attribute float aSize;
attribute float aSeed;

uniform float uProgress;
uniform float uSizeScale;

varying float vAlpha;
varying float vMix;

void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float ease = 1.0 - pow(1.0 - p, 3.0);

  vec3 pos = position + aDir * (aSpeed * ease);
  pos.y -= p * p * (0.28 + aSeed * 0.35);
  pos.x += sin(aSeed * 18.0 + p * 4.0) * 0.03;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = max(0.1, -mv.z);
  gl_PointSize = clamp(aSize * (1.0 - p * 0.45) * uSizeScale / depth, 0.8, 20.0);

  vAlpha = pow(1.0 - p, 1.7) * (0.7 + 0.3 * sin(aSeed * 40.0 + p * 24.0));
  vMix = aSeed;
}
`;

export const burstFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

varying float vAlpha;
varying float vMix;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.04, d);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.35, 1.0, vMix));
  gl_FragColor = vec4(col, a * vAlpha * uIntensity);
}
`;

export const shaftVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const shaftFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;

varying vec2 vUv;

void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float edge = smoothstep(1.0, 0.05, x);
  float vert = smoothstep(0.0, 0.38, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
  float flicker = 0.82 + 0.18 * sin(uTime * 0.35 + vUv.y * 2.4);
  float a = edge * edge * vert * uOpacity * flicker;
  gl_FragColor = vec4(uColor, a);
}
`;

export const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: null },
    uGrain: { value: 0.05 },
    uChroma: { value: 0.0015 },
    uVignette: { value: 0.62 },
    uScroll: { value: 0 }
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uChroma;
uniform float uVignette;

varying vec2 vUv;

float gHash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float radius = dot(centered, centered);

  // Radial chromatic aberration, strongest in the corners.
  vec2 offset = centered * (uChroma * (0.35 + radius * 2.6));
  vec3 col;
  col.r = texture2D(tDiffuse, uv + offset).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - offset).b;

  // Vignette.
  float vig = smoothstep(1.02, 0.28, length(centered) * 1.42);
  col *= mix(1.0, vig, uVignette);

  // Extremely subtle display scanline.
  float scan = 0.5 + 0.5 * sin(uv.y * 720.0);
  col *= 1.0 - scan * 0.012;

  // Film grain, multiplicative so deep blacks do not turn into noise.
  float grain = gHash(uv * uResolution + fract(uTime) * 137.0);
  col *= 1.0 + (grain - 0.5) * uGrain * 1.1;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`
};