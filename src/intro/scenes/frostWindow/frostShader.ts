export const FROST_VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FROST_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uBgTex;
uniform sampler2D uMaskTex;
uniform vec2 uResolution;
uniform vec2 uImgResolution;
uniform vec2 uParallax;
uniform float uTime;
uniform float uAutoMelt;
uniform vec4 uDrops[8]; // x, y (uv), radius (uv-y), alpha

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p = rot * p * 2.07 + vec2(13.1, 7.7);
    amp *= 0.5;
  }
  return value;
}

// Compute aspect-correct cover UV + subtle parallax margin
vec2 coverUv(vec2 uv) {
  float canvasAspect = uResolution.x / max(uResolution.y, 1.0);
  float imgAspect = uImgResolution.x / max(uImgResolution.y, 1.0);
  vec2 scale = vec2(1.0);
  if (canvasAspect > imgAspect) {
    scale.y = imgAspect / canvasAspect;
  } else {
    scale.x = canvasAspect / imgAspect;
  }
  // Slight 4% zoom headroom for live parallax without clamping edges
  vec2 centered = (uv - 0.5) * scale * 0.955 + 0.5;
  centered += uParallax * 0.018;
  return clamp(vec2(centered.x, 1.0 - centered.y), 0.002, 0.998);
}

// 9-tap frosted bokeh refraction blur
vec3 sampleFrosted(vec2 bgUv, vec2 refrOffset, float blurRadius) {
  vec3 acc = vec3(0.0);
  float total = 0.0;
  vec2 base = bgUv + refrOffset;

  // Golden angle spiral taps for creamy bokeh through frost
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float angle = fi * 2.39996;
    float r = sqrt((fi + 0.5) / 9.0) * blurRadius;
    vec2 tap = vec2(cos(angle), sin(angle)) * r;
    // Slight chromatic dispersion along refraction
    float rCh = texture2D(uBgTex, clamp(base + tap + refrOffset * 0.16, 0.002, 0.998)).r;
    float gCh = texture2D(uBgTex, clamp(base + tap, 0.002, 0.998)).g;
    float bCh = texture2D(uBgTex, clamp(base + tap - refrOffset * 0.16, 0.002, 0.998)).b;
    vec3 col = vec3(rCh, gCh, bCh);
    float w = 1.0 - r * 8.0;
    w = max(w, 0.25);
    acc += col * w;
    total += w;
  }
  return acc / total;
}

// Crisp circular starlight ice crystal micro-glints (no square noise artifacts)
float crystalSparkleField(vec2 p, float t) {
  vec2 grid = p * 42.0;
  vec2 id = floor(grid);
  vec2 gv = fract(grid) - 0.5;
  float rnd = hash(id);
  if (rnd < 0.78) return 0.0;
  vec2 jitter = (vec2(hash(id + 3.1), hash(id + 7.4)) - 0.5) * 0.55;
  float d = length(gv - jitter);
  float twinkle = 0.5 + 0.5 * sin(t * (1.8 + rnd * 2.4) + rnd * 40.0);
  return smoothstep(0.11, 0.0, d) * twinkle;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);

  // Crisp background image UV
  vec2 bgUv = coverUv(vUv);

  // Procedural multi-scale ice crystal texture
  float macroIce = fbm(p * 4.5 + vec2(1.2, 3.4));
  float fineCrystal = fbm(p * 22.0 + macroIce * 1.4);
  float crystalGlint = crystalSparkleField(p + uParallax * 0.03, uTime);

  // Ice surface normal from crystal height gradients
  float eps = 0.004;
  float hX = fbm((p + vec2(eps, 0.0)) * 18.0 + macroIce);
  float hY = fbm((p + vec2(0.0, eps)) * 18.0 + macroIce);
  float hC = fbm(p * 18.0 + macroIce);
  vec2 frostNormal = vec2(hX - hC, hY - hC) * 9.5;

  // Heat mask (WebGL texcoord y=0 is bottom, canvas y=0 is top)
  vec2 maskUv = vec2(vUv.x, 1.0 - vUv.y);
  float rawMask = texture2D(uMaskTex, maskUv).r;

  // Organic frosted crystal edge modulation
  float edgeNoise = (macroIce - 0.5) * 0.32 + (fineCrystal - 0.5) * 0.16;
  float radialAuto = length((vUv - vec2(0.5, 0.48)) * vec2(aspect, 1.0));
  float autoWave = smoothstep(0.0, 1.0, uAutoMelt * 1.45 - radialAuto * 0.65 + edgeNoise * 0.45);
  float melted = clamp(max(rawMask + edgeNoise * smoothstep(0.02, 0.45, rawMask), autoWave), 0.0, 1.0);
  float frostAmount = 1.0 - smoothstep(0.22, 0.78, melted);

  // Thicker frost around window corners (natural winter vignette)
  float cornerFrost = smoothstep(0.32, 0.95, length((vUv - 0.5) * vec2(aspect, 1.0)));
  frostAmount = clamp(frostAmount * (0.86 + cornerFrost * 0.24) * (1.0 - uAutoMelt * 0.98), 0.0, 1.0);

  // Sliding water droplets refraction on cleared glass
  vec2 dropRefract = vec2(0.0);
  float dropSpec = 0.0;
  float dropShade = 0.0;

  for (int i = 0; i < 8; i++) {
    vec4 d = uDrops[i];
    if (d.w > 0.01) {
      vec2 delta = vec2((vUv.x - d.x) * aspect, vUv.y - d.y);
      // Teardrop slight vertical elongation
      delta.y *= 0.78;
      float dist = length(delta);
      if (dist < d.z) {
        float normDist = dist / max(d.z, 0.0001);
        float dome = sqrt(max(0.0, 1.0 - normDist * normDist));
        vec2 n = delta / max(d.z, 0.0001);
        dropRefract -= n * dome * 0.032 * d.w;
        // Upper-left crisp sky reflection inside droplet
        float spec = pow(max(0.0, dot(normalize(vec3(-n.x, n.y, dome)), normalize(vec3(-0.35, 0.65, 0.7)))), 18.0);
        dropSpec += spec * d.w * 0.9;
        dropShade += smoothstep(0.55, 1.0, normDist) * smoothstep(-0.2, 0.9, -n.y) * 0.22 * d.w;
      }
    }
  }

  vec3 clearCol = texture2D(uBgTex, clamp(bgUv + dropRefract, 0.002, 0.998)).rgb;
  clearCol = clearCol * (1.0 - dropShade) + vec3(0.96, 0.98, 1.0) * dropSpec;

  // Refracted & bokeh-bloomed background seen through frost
  vec2 refrOffset = frostNormal * (0.014 + 0.012 * frostAmount);
  vec3 frostedBg = sampleFrosted(bgUv, refrOffset, 0.022 * frostAmount + 0.004);

  // Boost golden fairy-light glow diffusing softly inside the ice pane
  float luma = dot(frostedBg, vec3(0.299, 0.587, 0.114));
  vec3 warmGlow = frostedBg * smoothstep(0.52, 0.95, luma) * 0.32;

  // Milky-icy pearl frost surface with crystalline specular shimmer
  vec3 iceBase = mix(vec3(0.86, 0.91, 0.96), vec3(0.96, 0.98, 1.0), fineCrystal);
  vec3 frostCol = mix(frostedBg + warmGlow, iceBase, 0.36 + 0.28 * fineCrystal);
  frostCol += vec3(0.98, 0.99, 1.0) * crystalGlint * 0.55 * frostAmount;

  // Wet glistening thaw rim right along the melt frontier
  float thawRim = smoothstep(0.08, 0.42, frostAmount) * smoothstep(0.88, 0.42, frostAmount);
  vec3 color = mix(clearCol, frostCol, frostAmount);
  color += vec3(0.95, 0.98, 1.0) * thawRim * (0.14 + 0.12 * fineCrystal);

  // Subtle soft vignette in clear state to frame editorial white/pearl headline cleanly
  float topCalm = smoothstep(0.45, 1.0, vUv.y) * (1.0 - frostAmount) * 0.12;
  color = mix(color, vec3(0.11, 0.17, 0.24), topCalm);

  gl_FragColor = vec4(color, 1.0);
}
`;
