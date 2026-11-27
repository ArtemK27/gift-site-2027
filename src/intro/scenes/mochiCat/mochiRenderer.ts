/**
 * Velvet-gloss 2D Canvas renderer for the tactile Mochi Cat (Scene 4).
 *
 * Sculptural light-palette rendering (milky pearl, warm cream, icy mist, champagne gold):
 * 1. Dynamic contact shadow that tracks live belly extent & lift.
 * 2. Curled mochi tail nub following hip contour & bounce energy.
 * 3. Deformable plush cat ears seamlessly anchored to upper ring segments.
 * 4. Smooth C1 closed-spline mochi body with multi-stop 3D radial shading, bottom ambient
 *    wrap, champagne floor bounce, forehead kitten markings, inner porcelain rim, and top gloss.
 * 5. Tucked mochi front paws.
 * 6. Expressive deformable face (open sparkling eyes with blinking, > < squish, O_O surprised,
 *    ^ ^ happy, rosy pulsing blush, delicate whiskers & cat mouth).
 * 7. Miniature pastel-gold & cream New Year hat with fluffy snow cuff and secondary-spring pompom.
 */

import {
  MOCHI_REST_CENTER_Y,
  MOCHI_REST_RY,
  MOCHI_RING_COUNT,
  MOCHI_STAGE_SIZE,
  type MochiNode,
  type MochiSoftBodyState,
} from './mochiPhysics';
import type { MochiParticleSystem } from './mochiParticles';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Traces a C1-smooth closed midpoint quadratic Bezier loop through all ring nodes.
 */
function traceClosedSmoothRing(
  ctx: CanvasRenderingContext2D,
  nodes: ReadonlyArray<MochiNode>,
): void {
  const n = nodes.length;
  const last = nodes[n - 1];
  const first = nodes[0];
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
  for (let i = 0; i < n; i++) {
    const curr = nodes[i];
    const next = nodes[(i + 1) % n];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) * 0.5, (curr.y + next.y) * 0.5);
  }
  ctx.closePath();
}

interface BodyBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

function computeBodyBounds(nodes: ReadonlyArray<MochiNode>): BodyBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Renders the complete mochi cat and foreground particles onto the DPR-scaled logical stage.
 */
export function renderMochiCat(
  ctx: CanvasRenderingContext2D,
  state: MochiSoftBodyState,
  particles: MochiParticleSystem,
): void {
  ctx.clearRect(0, 0, MOCHI_STAGE_SIZE, MOCHI_STAGE_SIZE);

  const bounds = computeBodyBounds(state.nodes);

  // 1) Dynamic warm-cool contact shadow directly beneath the deformed belly
  drawContactShadow(ctx, bounds);

  // 2) Curled little mochi tail nub peeking from lower-right hip
  drawMochiTail(ctx, state);

  // 3) Outer ear silhouettes (back contours so head merges smoothly with ears)
  drawEarBaseLayer(ctx, state, 'left');
  drawEarBaseLayer(ctx, state, 'right');

  // 4) Main plush velvet-gloss pearl mochi body
  drawMochiBody(ctx, state, bounds);

  // 5) Seamless ear interior blend & warm blush inner-ear dimples
  drawEarInnerLayer(ctx, state, 'left');
  drawEarInnerLayer(ctx, state, 'right');

  // 6) Cute tucked front mochi paws resting near the lower belly
  drawMochiPaws(ctx, state);

  // 7) Live expressive face anchored to deformed center & stretch metrics
  drawMochiFace(ctx, state);

  // 8) Miniature pastel-gold & cream New Year hat with bouncy fluffy pompom
  drawNewYearHat(ctx, state);

  // 9) Floating pastel hearts & champagne gold sparkles
  particles.render(ctx);
}

function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  bounds: BodyBounds,
): void {
  const restBottom = MOCHI_REST_CENTER_Y + MOCHI_REST_RY - 5;
  const lift = Math.max(0, restBottom - bounds.maxY);
  const liftAttenuation = clamp(1 - lift / 95, 0.32, 1);

  const shadowCx = (bounds.minX + bounds.maxX) * 0.5;
  const shadowCy = Math.min(MOCHI_STAGE_SIZE - 26, Math.max(bounds.maxY + 4, restBottom + 4));
  const rx = bounds.width * 0.44 * (0.82 + 0.18 * liftAttenuation);
  const ry = 13.5 * (0.78 + 0.22 * liftAttenuation);

  ctx.save();
  ctx.translate(shadowCx, shadowCy);
  ctx.scale(1, ry / Math.max(1, rx));

  // Broad soft ambient mist shadow
  const outerGrad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx * 1.15);
  outerGrad.addColorStop(0, `rgba(98, 118, 138, ${(0.28 * liftAttenuation).toFixed(3)})`);
  outerGrad.addColorStop(0.55, `rgba(120, 138, 156, ${(0.14 * liftAttenuation).toFixed(3)})`);
  outerGrad.addColorStop(1, 'rgba(120, 138, 156, 0)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Warm champagne-taupe contact occlusion directly under the belly
  const coreGrad = ctx.createRadialGradient(0, -1, 2, 0, 0, rx * 0.72);
  coreGrad.addColorStop(0, `rgba(138, 110, 82, ${(0.22 * liftAttenuation).toFixed(3)})`);
  coreGrad.addColorStop(0.65, `rgba(138, 110, 82, ${(0.07 * liftAttenuation).toFixed(3)})`);
  coreGrad.addColorStop(1, 'rgba(138, 110, 82, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMochiTail(ctx: CanvasRenderingContext2D, state: MochiSoftBodyState): void {
  const n9 = state.nodes[9];
  const n10 = state.nodes[10];
  const baseX = (n9.x + n10.x) * 0.5 - 3;
  const baseY = (n9.y + n10.y) * 0.5;

  const wag =
    Math.sin(state.time * 2.8) * 0.11 +
    Math.sin(state.time * 9.5) * state.metrics.energy * 0.18;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(-0.18 + state.metrics.tilt * 0.5 + wag);

  const grad = ctx.createRadialGradient(8, -6, 2, 10, -2, 22);
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.55, '#F2F4F8');
  grad.addColorStop(1, '#DCE4EE');

  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(130, 146, 166, 0.25)';
  ctx.lineWidth = 1.15;

  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.bezierCurveTo(10, -14, 24, -10, 22, 1);
  ctx.bezierCurveTo(20, 11, 7, 13, -4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

interface EarGeometry {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  tipX: number;
  tipY: number;
  midX: number;
  midY: number;
  nx: number;
  ny: number;
  width: number;
}

function computeEarGeometry(state: MochiSoftBodyState, side: 'left' | 'right'): EarGeometry {
  // Left ear spans nodes[24..26] (-141°..-116°); Right ear spans nodes[2..4] (-64°..-39°)
  const a = side === 'left' ? state.nodes[24] : state.nodes[2];
  const b = side === 'left' ? state.nodes[26] : state.nodes[4];

  const midX = (a.x + b.x) * 0.5;
  const midY = (a.y + b.y) * 0.5;
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const chordLen = Math.max(16, Math.hypot(ex, ey));

  // Outward normal for CW chord (a -> b) in y-down screen coordinates is (+ey/len, -ex/len)
  const rawNx = ey / chordLen;
  const rawNy = -ex / chordLen;

  // Ears perk up slightly when surprised and tuck softly when squished
  const moodScale =
    state.metrics.emotion === 'surprised'
      ? 1.12
      : state.metrics.emotion === 'squish'
        ? 0.89
        : 1.0;

  const height = clamp(chordLen * 0.88, 22, 34) * moodScale;
  const splay = side === 'left' ? -0.14 : 0.14;
  const cosS = Math.cos(splay);
  const sinS = Math.sin(splay);
  const nx = rawNx * cosS - rawNy * sinS;
  const ny = rawNx * sinS + rawNy * cosS;

  return {
    ax: a.x,
    ay: a.y,
    bx: b.x,
    by: b.y,
    tipX: midX + nx * height,
    tipY: midY + ny * height,
    midX,
    midY,
    nx,
    ny,
    width: chordLen,
  };
}

function drawEarBaseLayer(
  ctx: CanvasRenderingContext2D,
  state: MochiSoftBodyState,
  side: 'left' | 'right',
): void {
  const g = computeEarGeometry(state, side);
  // Nudge anchor points slightly inward so ear merges smoothly behind main body contour
  const inX = -g.nx * 5;
  const inY = -g.ny * 5;

  const grad = ctx.createLinearGradient(g.tipX, g.tipY, g.midX, g.midY);
  grad.addColorStop(0, side === 'left' ? '#FFFFFF' : '#FCF9F3');
  grad.addColorStop(0.55, '#FAF6EE');
  grad.addColorStop(1, '#EFECE6');

  // Plush rounded mochi ear silhouette (cubic Beziers avoid pointy tips even during wide stretch)
  const tx = g.bx - g.ax;
  const ty = g.by - g.ay;
  const tLen = Math.max(1, Math.hypot(tx, ty));
  const ux = tx / tLen;
  const uy = ty / tLen;
  const tipRound = Math.min(7.5, g.width * 0.24);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g.ax + inX, g.ay + inY);
  ctx.bezierCurveTo(
    g.ax + g.nx * (g.width * 0.34),
    g.ay + g.ny * (g.width * 0.34),
    g.tipX - ux * tipRound,
    g.tipY - uy * tipRound,
    g.tipX,
    g.tipY,
  );
  ctx.bezierCurveTo(
    g.tipX + ux * tipRound,
    g.tipY + uy * tipRound,
    g.bx + g.nx * (g.width * 0.34),
    g.by + g.ny * (g.width * 0.34),
    g.bx + inX,
    g.by + inY,
  );
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(116, 132, 152, 0.34)';
  ctx.lineWidth = 1.25;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawEarInnerLayer(
  ctx: CanvasRenderingContext2D,
  state: MochiSoftBodyState,
  side: 'left' | 'right',
): void {
  const g = computeEarGeometry(state, side);

  // Soft seamless pearl patch over the ear-to-head junction to hide the body contour seam
  ctx.save();
  const patchGrad = ctx.createRadialGradient(
    g.midX + g.nx * 2,
    g.midY + g.ny * 2,
    1,
    g.midX + g.nx * 2,
    g.midY + g.ny * 2,
    g.width * 0.58,
  );
  patchGrad.addColorStop(0, side === 'left' ? '#FEFDFB' : '#FAF7F2');
  patchGrad.addColorStop(0.66, side === 'left' ? 'rgba(254,253,251,0.92)' : 'rgba(250,247,242,0.92)');
  patchGrad.addColorStop(1, 'rgba(250,247,242,0)');
  ctx.fillStyle = patchGrad;
  ctx.beginPath();
  ctx.arc(g.midX + g.nx * 2, g.midY + g.ny * 2, g.width * 0.58, 0, Math.PI * 2);
  ctx.fill();

  // Warm velvety pastel-rose inner ear cushion
  const pAx = g.midX + (g.ax - g.midX) * 0.48 + g.nx * 4.5;
  const pAy = g.midY + (g.ay - g.midY) * 0.48 + g.ny * 4.5;
  const pBx = g.midX + (g.bx - g.midX) * 0.48 + g.nx * 4.5;
  const pBy = g.midY + (g.by - g.midY) * 0.48 + g.ny * 4.5;
  const innerTipX = g.midX + (g.tipX - g.midX) * 0.68;
  const innerTipY = g.midY + (g.tipY - g.midY) * 0.68;

  const innerGrad = ctx.createLinearGradient(innerTipX, innerTipY, g.midX, g.midY);
  innerGrad.addColorStop(0, '#F4C5CB');
  innerGrad.addColorStop(0.55, '#E9AAB4');
  innerGrad.addColorStop(1, 'rgba(233, 170, 180, 0.35)');

  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.moveTo(pAx, pAy);
  ctx.quadraticCurveTo(innerTipX, innerTipY, pBx, pBy);
  ctx.quadraticCurveTo(g.midX + g.nx * 2, g.midY + g.ny * 2, pAx, pAy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMochiBody(
  ctx: CanvasRenderingContext2D,
  state: MochiSoftBodyState,
  bounds: BodyBounds,
): void {
  const { center, nodes, metrics } = state;

  ctx.save();
  traceClosedSmoothRing(ctx, nodes);
  ctx.clip();

  // 1) Volumetric 3D studio radial fill (porcelain milk -> warm cashmere pearl -> frosty rim)
  const lightX = center.x - bounds.width * 0.22;
  const lightY = center.y - bounds.height * 0.34;
  const gradRadius = Math.max(bounds.width, bounds.height) * 0.88;

  const bodyGrad = ctx.createRadialGradient(lightX, lightY, gradRadius * 0.06, center.x, center.y, gradRadius);
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.38, '#FEFBF6');
  bodyGrad.addColorStop(0.7, '#F3F0EA');
  bodyGrad.addColorStop(0.9, '#E2E7F0');
  bodyGrad.addColorStop(1, '#CFDCEB');

  ctx.fillStyle = bodyGrad;
  ctx.fillRect(bounds.minX - 6, bounds.minY - 6, bounds.width + 12, bounds.height + 12);

  // 2) Soft underside ambient shading for chubby 3D roundness
  const bellyShade = ctx.createLinearGradient(0, center.y + bounds.height * 0.06, 0, bounds.maxY + 4);
  bellyShade.addColorStop(0, 'rgba(142, 160, 182, 0)');
  bellyShade.addColorStop(0.58, 'rgba(138, 156, 178, 0.16)');
  bellyShade.addColorStop(1, 'rgba(116, 134, 158, 0.32)');
  ctx.fillStyle = bellyShade;
  ctx.fillRect(bounds.minX - 6, center.y, bounds.width + 12, bounds.maxY - center.y + 8);

  // 3) Warm champagne-cream subsurface bounce glow along the lower belly edge
  const bounceGrad = ctx.createRadialGradient(
    center.x,
    bounds.maxY - 4,
    6,
    center.x,
    bounds.maxY - 4,
    bounds.width * 0.45,
  );
  bounceGrad.addColorStop(0, 'rgba(246, 220, 184, 0.36)');
  bounceGrad.addColorStop(0.6, 'rgba(246, 220, 184, 0.12)');
  bounceGrad.addColorStop(1, 'rgba(246, 220, 184, 0)');
  ctx.fillStyle = bounceGrad;
  ctx.fillRect(bounds.minX - 6, bounds.maxY - 46, bounds.width + 12, 54);

  // 4) Glossy pearlescent forehead specular highlight (mochi-jelly satin luster)
  ctx.save();
  ctx.translate(center.x - bounds.width * 0.15, bounds.minY + bounds.height * 0.21);
  ctx.rotate(metrics.tilt - 0.22);
  const specRx = bounds.width * 0.22;
  const specRy = bounds.height * 0.1;
  const specGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, specRx);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.86)');
  specGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.36)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, specRx, specRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5) Three delicate champagne-cream tabby stripes on upper forehead
  const crown = nodes[0];
  ctx.save();
  ctx.translate(crown.x * 0.72 + center.x * 0.28, crown.y * 0.78 + center.y * 0.22 + 9);
  ctx.rotate(metrics.tilt);
  ctx.fillStyle = 'rgba(216, 191, 152, 0.34)';
  const stripeOffsets = [
    { x: -10, y: 1, rx: 2.3, ry: 6.2, rot: -0.16 },
    { x: 0, y: -1, rx: 2.6, ry: 7.4, rot: 0 },
    { x: 10, y: 1, rx: 2.3, ry: 6.2, rot: 0.16 },
  ];
  for (const st of stripeOffsets) {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 6) Crisp inner porcelain rim light
  traceClosedSmoothRing(ctx, nodes);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 3.2;
  ctx.stroke();

  ctx.restore();

  // Subtle refined outer hairline so white mochi pops cleanly against the frosted blue-pearl podium
  ctx.save();
  traceClosedSmoothRing(ctx, nodes);
  ctx.strokeStyle = 'rgba(114, 132, 152, 0.34)';
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();
}

function drawMochiPaws(ctx: CanvasRenderingContext2D, state: MochiSoftBodyState): void {
  const { nodes, center, metrics } = state;
  // Anchor paws gently between lower-belly nodes and center so they track deformations naturally
  const leftAnchor = nodes[16];
  const rightAnchor = nodes[12];

  const paws = [
    {
      x: leftAnchor.x * 0.68 + center.x * 0.32 + 4,
      y: leftAnchor.y * 0.82 + center.y * 0.18 - 1,
      rot: metrics.tilt - 0.18,
    },
    {
      x: rightAnchor.x * 0.68 + center.x * 0.32 - 4,
      y: rightAnchor.y * 0.82 + center.y * 0.18 - 1,
      rot: metrics.tilt + 0.18,
    },
  ];

  for (const paw of paws) {
    ctx.save();
    ctx.translate(paw.x, paw.y);
    ctx.rotate(paw.rot);

    // Subtle soft tucked shadow under paw
    ctx.fillStyle = 'rgba(128, 144, 164, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 3.2, 12.2, 7.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Plush round mochi paw pad
    const pawGrad = ctx.createRadialGradient(-3, -3, 1.5, 0, 0, 13);
    pawGrad.addColorStop(0, '#FFFFFF');
    pawGrad.addColorStop(0.65, '#F5F6FA');
    pawGrad.addColorStop(1, '#E0E8F2');

    ctx.fillStyle = pawGrad;
    ctx.strokeStyle = 'rgba(130, 146, 166, 0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12.2, 8.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Delicate tiny toe crease marks
    ctx.strokeStyle = 'rgba(148, 154, 168, 0.38)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.4, 2.2);
    ctx.lineTo(-3.8, 5.4);
    ctx.moveTo(3.4, 2.2);
    ctx.lineTo(3.8, 5.4);
    ctx.stroke();

    ctx.restore();
  }
}

function drawMochiFace(ctx: CanvasRenderingContext2D, state: MochiSoftBodyState): void {
  const { center, nodes, metrics } = state;

  // Blend center with left/right cheek midpoint so pulling a cheek playfully shifts the face
  const rightCheek = nodes[7];
  const leftCheek = nodes[21];
  const crown = nodes[0];
  const belly = nodes[14];

  const faceX = center.x * 0.62 + ((leftCheek.x + rightCheek.x) * 0.5) * 0.38;
  const faceY = center.y * 0.68 + ((crown.y + belly.y) * 0.5) * 0.32 + 4;

  // Tasteful clamped scale so face stretches/squishes cutely without losing charm
  const sx = clamp(1 + (metrics.stretchX - 1) * 0.42, 0.8, 1.24);
  const sy = clamp(1 + (metrics.stretchY - 1) * 0.38, 0.8, 1.2);

  ctx.save();
  ctx.translate(faceX, faceY);
  ctx.rotate(metrics.tilt * 0.85);
  ctx.scale(sx, sy);

  // 1) Rosy velvet blush cheeks
  const blushAlpha = clamp(metrics.blushIntensity, 0.25, 0.78);
  for (const dir of [-1, 1] as const) {
    const cx = dir * 34.5;
    const cy = 6.5;
    const blushGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14.5);
    blushGrad.addColorStop(0, `rgba(241, 152, 168, ${blushAlpha.toFixed(3)})`);
    blushGrad.addColorStop(0.55, `rgba(244, 174, 184, ${(blushAlpha * 0.45).toFixed(3)})`);
    blushGrad.addColorStop(1, 'rgba(244, 174, 184, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Extra cute tiny blush shimmer lines during squish or happy bounce
    if (metrics.emotion === 'squish' || metrics.emotion === 'happy') {
      ctx.strokeStyle = `rgba(232, 126, 146, ${(blushAlpha * 0.52).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 3.5, cy + 2.5);
      ctx.lineTo(cx - 1.5, cy - 2);
      ctx.moveTo(cx + 1.5, cy + 2.5);
      ctx.lineTo(cx + 3.5, cy - 2);
      ctx.stroke();
    }
  }

  // 2) Delicate cat whiskers
  ctx.strokeStyle = 'rgba(104, 96, 108, 0.32)';
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1] as const) {
    ctx.beginPath();
    ctx.moveTo(dir * 45, 2);
    ctx.quadraticCurveTo(dir * 54, 0.5, dir * 61, -1.5);
    ctx.moveTo(dir * 45, 7.5);
    ctx.quadraticCurveTo(dir * 54, 8.2, dir * 60, 10);
    ctx.stroke();
  }

  // 3) Expressive eyes according to live deformation emotion
  const eyeX = 22.5;
  const eyeY = -5;

  if (metrics.emotion === 'squish') {
    // Cozy scrunched > < happy squint
    ctx.strokeStyle = '#332B32';
    ctx.lineWidth = 2.65;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left eye: >
    ctx.beginPath();
    ctx.moveTo(-eyeX - 6.5, eyeY - 5);
    ctx.quadraticCurveTo(-eyeX + 4.5, eyeY, -eyeX - 6.5, eyeY + 5);
    ctx.stroke();

    // Right eye: <
    ctx.beginPath();
    ctx.moveTo(eyeX + 6.5, eyeY - 5);
    ctx.quadraticCurveTo(eyeX - 4.5, eyeY, eyeX + 6.5, eyeY + 5);
    ctx.stroke();
  } else if (metrics.emotion === 'surprised') {
    // Comical startled wide O_O eyes
    const wideScale = 1 + metrics.stretch * 0.16;
    for (const dir of [-1, 1] as const) {
      const ex = dir * eyeX;
      ctx.save();
      ctx.translate(ex, eyeY - 0.5);
      ctx.scale(wideScale, wideScale);

      // Glossy bright sclera ring
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#352D35';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.6, 8.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Startled glossy espresso pupil
      ctx.fillStyle = '#2B242B';
      ctx.beginPath();
      ctx.arc(0, 0.2, 4.1, 0, Math.PI * 2);
      ctx.fill();

      // Crisp starlight catchlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-1.8, -1.8, 1.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1.7, 1.9, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  } else if (metrics.emotion === 'happy') {
    // Blissful ^ ^ arched eyes after bouncy release
    ctx.strokeStyle = '#332B32';
    ctx.lineWidth = 2.65;
    ctx.lineCap = 'round';
    for (const dir of [-1, 1] as const) {
      const ex = dir * eyeX;
      ctx.beginPath();
      ctx.moveTo(ex - 7.5, eyeY + 2.5);
      ctx.quadraticCurveTo(ex, eyeY - 7.5, ex + 7.5, eyeY + 2.5);
      ctx.stroke();
    }
  } else {
    // IDLE: Eyes CLEARLY OPEN & sparkling (with rare smooth natural blink)
    const blink = metrics.blinkAmount;
    for (const dir of [-1, 1] as const) {
      const ex = dir * eyeX;
      if (blink > 0.78) {
        ctx.strokeStyle = '#342C33';
        ctx.lineWidth = 2.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - 6.5, eyeY + 1);
        ctx.quadraticCurveTo(ex, eyeY + 4, ex + 6.5, eyeY + 1);
        ctx.stroke();
      } else {
        const openScaleY = Math.max(0.18, 1 - blink * 0.92);
        ctx.save();
        ctx.translate(ex, eyeY);
        ctx.scale(1, openScaleY);

        // Deep glossy warm-espresso iris
        const eyeGrad = ctx.createLinearGradient(0, -8.2, 0, 8.2);
        eyeGrad.addColorStop(0, '#211B23');
        eyeGrad.addColorStop(0.65, '#332934');
        eyeGrad.addColorStop(1, '#4C3C44');
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.8, 8.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle warm honey-gold lower iris reflection
        ctx.fillStyle = 'rgba(222, 178, 122, 0.38)';
        ctx.beginPath();
        ctx.ellipse(0.4, 3.4, 3.9, 2.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main upper-left pearlescent catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-2.2, -2.7, 2.4, 2.6, -0.25, 0, Math.PI * 2);
        ctx.fill();

        // Tiny secondary sparkle catchlight
        ctx.fillStyle = 'rgba(255, 250, 240, 0.9)';
        ctx.beginPath();
        ctx.arc(2.2, 2.4, 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // 4) Miniature dusty-rose button nose
  ctx.fillStyle = '#DA949B';
  ctx.beginPath();
  ctx.moveTo(-3.4, 0.4);
  ctx.quadraticCurveTo(0, -0.8, 3.4, 0.4);
  ctx.quadraticCurveTo(0, 4.4, -3.4, 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(-0.9, 0.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // 5) Expressive mouth
  ctx.strokeStyle = '#3B3239';
  ctx.lineWidth = 2.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (metrics.emotion === 'surprised') {
    // Cute startled elongated oval mouth
    const mouthRy = 4.8 + metrics.stretch * 2.5;
    ctx.fillStyle = '#E2929D';
    ctx.beginPath();
    ctx.ellipse(0, 9.2, 4.0, mouthRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner rosy tongue highlight
    ctx.fillStyle = 'rgba(252, 206, 212, 0.72)';
    ctx.beginPath();
    ctx.ellipse(0, 9.2 + mouthRy * 0.25, 2.2, mouthRy * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (metrics.emotion === 'happy') {
    // Joyful open cat smile
    ctx.fillStyle = '#EB9CA7';
    ctx.beginPath();
    ctx.moveTo(-6.2, 5.4);
    ctx.quadraticCurveTo(0, 14.5, 6.2, 5.4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8.5, 5.2);
    ctx.quadraticCurveTo(-4.2, 9.2, 0, 4.5);
    ctx.quadraticCurveTo(4.2, 9.2, 8.5, 5.2);
    ctx.stroke();
  } else {
    // Classic cozy `:3` cat mouth (slightly tighter during squish)
    const dip = metrics.emotion === 'squish' ? 7.6 : 8.8;
    const width = metrics.emotion === 'squish' ? 7.4 : 8.6;
    ctx.beginPath();
    ctx.moveTo(-width, 5.6);
    ctx.quadraticCurveTo(-width * 0.48, dip, 0, 4.4);
    ctx.quadraticCurveTo(width * 0.48, dip, width, 5.6);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNewYearHat(ctx: CanvasRenderingContext2D, state: MochiSoftBodyState): void {
  // Crown sits cleanly between left ear (nodes[24..26]) and right ear (nodes[2..4])
  const nLeft = state.nodes[MOCHI_RING_COUNT - 1]; // node 27
  const nCrown = state.nodes[0];
  const nRight = state.nodes[1];
  const leftCheek = state.nodes[21];
  const rightCheek = state.nodes[7];
  const faceCenterX = state.center.x * 0.62 + ((leftCheek.x + rightCheek.x) * 0.5) * 0.38;

  // Blend crown X with faceCenterX so the hat stays perched gracefully centered during wide 2-finger stretches
  const rawCrownX = (nLeft.x + nCrown.x * 2 + nRight.x) * 0.25;
  const baseX = rawCrownX * 0.58 + faceCenterX * 0.42;
  const baseY = (nLeft.y + nCrown.y * 2 + nRight.y) * 0.25 + 2;

  const crownAngle = Math.atan2(nRight.y - nLeft.y, nRight.x - nLeft.x);
  const hatTilt = crownAngle + 0.14 + state.metrics.tilt * 0.25;

  // Hat scales gently with crown width so stretching the head carries the hat naturally
  const crownSpan = Math.hypot(nRight.x - nLeft.x, nRight.y - nLeft.y);
  const scale = clamp(crownSpan / 34, 0.86, 1.16);

  // Secondary spring offset for drooping Santa hat tip & fluffy pompom
  const pomDx = state.pompom.offsetX * 0.72;
  const pomDy = state.pompom.offsetY * 0.65;

  const tipX = 24 + pomDx;
  const tipY = -36 + pomDy;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(hatTilt);
  ctx.scale(scale, scale);

  // 1) Soft warm cast shadow right beneath the fur cuff onto the cat's head
  ctx.fillStyle = 'rgba(138, 126, 114, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 3.2, 22, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2) Pastel champagne-gold velvet hat cone curving playfully to the right
  const coneGrad = ctx.createLinearGradient(-16, -24, 24, 0);
  coneGrad.addColorStop(0, '#F8EBD0');
  coneGrad.addColorStop(0.38, '#E7CA8E');
  coneGrad.addColorStop(0.75, '#CFA660');
  coneGrad.addColorStop(1, '#B78C46');

  ctx.fillStyle = coneGrad;
  ctx.strokeStyle = 'rgba(154, 118, 60, 0.34)';
  ctx.lineWidth = 1.05;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-18.5, -1);
  ctx.bezierCurveTo(-13, -34, 10, -48 + pomDy * 0.5, tipX, tipY);
  ctx.bezierCurveTo(18 + pomDx * 0.5, -24 + pomDy * 0.3, 19.5, -13, 18.5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Silky champagne specular ridge along the left curve of the hat
  ctx.strokeStyle = 'rgba(255, 250, 236, 0.62)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12.5, -6);
  ctx.quadraticCurveTo(-7, -26, 7 + pomDx * 0.35, -35 + pomDy * 0.35);
  ctx.stroke();

  // Subtle decorative gold stitch stripe near cuff
  ctx.strokeStyle = 'rgba(255, 244, 214, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15.5, -6);
  ctx.quadraticCurveTo(0, -10.5, 15.5, -6);
  ctx.stroke();

  // 3) Plush milky-white fur trim cuff (overlapping soft snow clouds)
  const cuffPuffs = [
    { x: -17.5, y: 0.5, r: 6.4 },
    { x: -10.5, y: -1.2, r: 7.2 },
    { x: -3.2, y: -2.0, r: 7.5 },
    { x: 4.2, y: -1.9, r: 7.4 },
    { x: 11.2, y: -1.0, r: 7.0 },
    { x: 17.5, y: 0.6, r: 6.3 },
  ];

  for (const puff of cuffPuffs) {
    const pGrad = ctx.createRadialGradient(puff.x - 1.5, puff.y - 2, 1, puff.x, puff.y, puff.r);
    pGrad.addColorStop(0, '#FFFFFF');
    pGrad.addColorStop(0.7, '#F5F7FA');
    pGrad.addColorStop(1, '#E2E9F2');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft outer rim along bottom of fur cuff
  ctx.strokeStyle = 'rgba(136, 150, 168, 0.2)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-21, 3.6);
  ctx.quadraticCurveTo(0, 6.2, 21, 3.6);
  ctx.stroke();

  // 4) Fluffy bouncing snow-white pompom at the drooping tip
  const pomX = tipX + 3.5;
  const pomY = tipY + 3.5;

  // Subtle contact shade behind pompom
  ctx.fillStyle = 'rgba(138, 146, 160, 0.16)';
  ctx.beginPath();
  ctx.arc(pomX + 0.8, pomY + 2.2, 9.2, 0, Math.PI * 2);
  ctx.fill();

  const pomPuffs = [
    { dx: -3.4, dy: -2.4, r: 5.8 },
    { dx: 3.4, dy: -2.2, r: 5.6 },
    { dx: -3.2, dy: 2.6, r: 5.5 },
    { dx: 3.2, dy: 2.8, r: 5.5 },
    { dx: 0, dy: 0, r: 6.8 },
  ];

  for (const pp of pomPuffs) {
    const px = pomX + pp.dx;
    const py = pomY + pp.dy;
    const g = ctx.createRadialGradient(px - 1.5, py - 1.8, 0.8, px, py, pp.r);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.72, '#F5F7FA');
    g.addColorStop(1, '#DFE7F1');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, pp.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiny champagne glint star beside the pompom when lively
  const glintAlpha = clamp(0.35 + state.metrics.energy * 0.65, 0.35, 1);
  ctx.save();
  ctx.translate(pomX + 10.5, pomY - 7.5);
  ctx.fillStyle = `rgba(232, 194, 114, ${glintAlpha.toFixed(3)})`;
  const sr = 3.2 + state.metrics.energy * 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -sr);
  ctx.quadraticCurveTo(0.8, -0.8, sr, 0);
  ctx.quadraticCurveTo(0.8, 0.8, 0, sr);
  ctx.quadraticCurveTo(-0.8, 0.8, -sr, 0);
  ctx.quadraticCurveTo(-0.8, -0.8, 0, -sr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
