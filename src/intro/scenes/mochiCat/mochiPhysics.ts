/**
 * Pure 2D soft-body jelly physics engine for the tactile Mochi Cat (Scene 4).
 *
 * Model:
 * - Closed ring of 28 spring-coupled nodes forming a plush daifuku-mochi silhouette + 1 central node.
 * - Structural perimeter springs, 2-step & 3-step bending springs, radial spokes, and soft cross chords.
 * - True polygon area preservation (shoelace pressure force) so 2-finger pinch puffs vertically
 *   and 2-finger pull stretches into a wide bouncy mochi pancake.
 * - Multi-touch `Map<number, DragAnchor>` with Gaussian neighborhood weights and rubber tanh clamping.
 * - Sub-stepped integration + radial/angular winding constraints guarantee zero blow-ups or inversions.
 * - Secondary damped spring for the Santa hat pompom + deformation metrics driving live emotions.
 */

export const MOCHI_STAGE_SIZE = 310;
export const MOCHI_REST_CENTER_X = 155;
export const MOCHI_REST_CENTER_Y = 172;
export const MOCHI_REST_RX = 76;
export const MOCHI_REST_RY = 59;
export const MOCHI_RING_COUNT = 28;

export type MochiEmotion = 'idle' | 'squish' | 'surprised' | 'happy';

export interface MochiNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  restOffsetX: number;
  restOffsetY: number;
  restRadius: number;
  restAngle: number;
}

interface SpringConstraint {
  a: number; // 0..RING_COUNT-1 or RING_COUNT for center
  b: number;
  restLen: number;
  stiffness: number;
}

export interface DragAnchor {
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  /** Soft-clamped effective anchor coords */
  clampedX: number;
  clampedY: number;
  weights: number[];
  centerWeight: number;
  grabOffsetX: number[];
  grabOffsetY: number[];
  centerOffsetX: number;
  centerOffsetY: number;
  maxDisplacement: number;
}

export interface MochiMetrics {
  stretchX: number;
  stretchY: number;
  maxNodeStretch: number;
  stretch: number; // 0..1 normalized stretch intensity
  squeeze: number; // 0..1 normalized compression intensity
  energy: number; // 0..1 normalized kinetic jiggle energy
  areaRatio: number; // currentArea / restArea
  tilt: number; // radians, clamped subtle body tilt
  emotion: MochiEmotion;
  blinkAmount: number; // 0 (open) .. 1 (closed)
  blushIntensity: number; // 0..1
  activePointers: number;
}

export interface PointerStartResult {
  hit: boolean;
  intensity: number;
  x: number;
  y: number;
}

export interface PointerReleaseResult {
  released: boolean;
  bounced: boolean;
  intensity: number;
  originX: number;
  originY: number;
}

export interface PompomSpring {
  offsetX: number;
  offsetY: number;
  vx: number;
  vy: number;
}

export interface MochiSoftBodyState {
  nodes: MochiNode[];
  center: MochiNode;
  springs: SpringConstraint[];
  anchors: Map<number, DragAnchor>;
  restArea: number;
  restWidth: number;
  restHeight: number;
  avgEdgeLen: number;
  time: number;
  pokeTimer: number;
  pokeDipY: number;
  releaseBounceTimer: number;
  blinkTimer: number;
  blinkPhase: number;
  prevCrownX: number;
  prevCrownY: number;
  pompom: PompomSpring;
  metrics: MochiMetrics;
}

const SUBSTEPS = 5;
const MAX_FRAME_DT = 1 / 30;
const MAX_NODE_SPEED = 1450;
const MAX_PULL_DISTANCE = 108;
const GRAB_SIGMA = 44;
const HIT_PADDING = 54;

const PERIMETER_K = 195;
const BEND2_K = 92;
const BEND3_K = 38;
const SPOKE_K = 62;
const CHORD_QUAD_K = 14;
const CHORD_DIAM_K = 10;
const CENTER_HOME_K = 520;
const CENTROID_COUPLE_K = 95;
const SHAPE_MATCH_K = 56;
const COASTER_GRIP_K = 74;
const PRESSURE_STRENGTH = 12800;
const DRAG_SPRING_K = 980;
const DRAG_DAMPING = 16;

const MAX_BODY_TILT = 0.28;
const MAX_NODE_ANGLE_DEV = 0.52;
const MIN_NODE_ANGLE_GAP = 0.095;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function wrapAngle(angle: number): number {
  let a = (angle + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

function softClampDelta(dx: number, dy: number, maxDist: number): { dx: number; dy: number } {
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-5) return { dx: 0, dy: 0 };
  const clampedDist = maxDist * Math.tanh(dist / maxDist);
  const scale = clampedDist / dist;
  return { dx: dx * scale, dy: dy * scale };
}

/**
 * Shoelace signed polygon area.
 * In screen coordinates (y-down) with clockwise ring winding, a valid non-inverted polygon has area > 0.
 */
export function computeRingSignedArea(nodes: ReadonlyArray<Pick<MochiNode, 'x' | 'y'>>): number {
  const n = nodes.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum * 0.5;
}

function getNodeByIndex(state: MochiSoftBodyState, index: number): MochiNode {
  return index === MOCHI_RING_COUNT ? state.center : state.nodes[index];
}

export function createMochiSoftBody(): MochiSoftBodyState {
  const nodes: MochiNode[] = [];

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const theta = -Math.PI / 2 + (i / MOCHI_RING_COUNT) * Math.PI * 2;
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Chubby daifuku-mochi silhouette: slightly fuller lower cheeks, gently settled flat belly
    const cheekBulge = s > 0 ? 1 + 0.082 * Math.sin(s * Math.PI) : 1 - 0.025 * -s;
    const bottomFlatten = s > 0.42 ? 1 - 0.095 * ((s - 0.42) / 0.58) ** 2 : 1;

    const restOffsetX = c * MOCHI_REST_RX * cheekBulge;
    const restOffsetY = s * MOCHI_REST_RY * bottomFlatten;
    const restRadius = Math.hypot(restOffsetX, restOffsetY);

    nodes.push({
      x: MOCHI_REST_CENTER_X + restOffsetX,
      y: MOCHI_REST_CENTER_Y + restOffsetY,
      vx: 0,
      vy: 0,
      restOffsetX,
      restOffsetY,
      restRadius,
      restAngle: theta,
    });
  }

  const center: MochiNode = {
    x: MOCHI_REST_CENTER_X,
    y: MOCHI_REST_CENTER_Y,
    vx: 0,
    vy: 0,
    restOffsetX: 0,
    restOffsetY: 0,
    restRadius: 0,
    restAngle: 0,
  };

  // Precompute bounding rest width, height, area, and average edge length
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let totalEdge = 0;

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const n = nodes[i];
    const next = nodes[(i + 1) % MOCHI_RING_COUNT];
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
    totalEdge += Math.hypot(next.x - n.x, next.y - n.y);
  }

  const restArea = computeRingSignedArea(nodes);
  const restWidth = maxX - minX;
  const restHeight = maxY - minY;
  const avgEdgeLen = totalEdge / MOCHI_RING_COUNT;

  // Build spring mesh (perimeter, bending, radial spokes, cross-bracing)
  const springs: SpringConstraint[] = [];
  const addSpring = (a: number, b: number, stiffness: number) => {
    const na = a === MOCHI_RING_COUNT ? center : nodes[a];
    const nb = b === MOCHI_RING_COUNT ? center : nodes[b];
    springs.push({
      a,
      b,
      restLen: Math.hypot(nb.x - na.x, nb.y - na.y),
      stiffness,
    });
  };

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    addSpring(i, (i + 1) % MOCHI_RING_COUNT, PERIMETER_K);
    addSpring(i, (i + 2) % MOCHI_RING_COUNT, BEND2_K);
    addSpring(i, (i + 3) % MOCHI_RING_COUNT, BEND3_K);
    addSpring(i, MOCHI_RING_COUNT, SPOKE_K);

    // Quad chords (every node to +7)
    addSpring(i, (i + 7) % MOCHI_RING_COUNT, CHORD_QUAD_K);
    // Diameters (only half loop to avoid duplicates)
    if (i < MOCHI_RING_COUNT / 2) {
      addSpring(i, i + MOCHI_RING_COUNT / 2, CHORD_DIAM_K);
    }
  }

  const crown = nodes[0];

  return {
    nodes,
    center,
    springs,
    anchors: new Map<number, DragAnchor>(),
    restArea,
    restWidth,
    restHeight,
    avgEdgeLen,
    time: 0,
    pokeTimer: 0,
    pokeDipY: 0,
    releaseBounceTimer: 0,
    blinkTimer: 2.9,
    blinkPhase: 0,
    prevCrownX: crown.x,
    prevCrownY: crown.y,
    pompom: { offsetX: 0, offsetY: 0, vx: 0, vy: 0 },
    metrics: {
      stretchX: 1,
      stretchY: 1,
      maxNodeStretch: 1,
      stretch: 0,
      squeeze: 0,
      energy: 0,
      areaRatio: 1,
      tilt: 0,
      emotion: 'idle',
      blinkAmount: 0,
      blushIntensity: 0.36,
      activePointers: 0,
    },
  };
}

/**
 * Checks whether a point is inside or comfortably near the mochi body so mobile touches feel forgiving.
 */
export function isPointNearMochi(state: MochiSoftBodyState, x: number, y: number): boolean {
  const dxC = (x - state.center.x) / (MOCHI_REST_RX + HIT_PADDING);
  const dyC = (y - state.center.y) / (MOCHI_REST_RY + HIT_PADDING);
  if (dxC * dxC + dyC * dyC <= 1.15) return true;

  const hitSq = HIT_PADDING * HIT_PADDING;
  for (let i = 0; i < state.nodes.length; i++) {
    const n = state.nodes[i];
    const dx = x - n.x;
    const dy = y - n.y;
    if (dx * dx + dy * dy <= hitSq) return true;
  }
  return false;
}

/**
 * Registers a touch/pointer grab on the mochi body (supports 1, 2, or more simultaneous pointers).
 */
export function startMochiPointer(
  state: MochiSoftBodyState,
  pointerId: number,
  rawX: number,
  rawY: number,
): PointerStartResult {
  const x = clamp(rawX, 12, MOCHI_STAGE_SIZE - 12);
  const y = clamp(rawY, 12, MOCHI_STAGE_SIZE - 12);
  const hit = isPointNearMochi(state, x, y);
  if (!hit) {
    return { hit: false, intensity: 0, x, y };
  }

  const twoSigmaSq = 2 * GRAB_SIGMA * GRAB_SIGMA;
  const weights: number[] = new Array(MOCHI_RING_COUNT);
  const grabOffsetX: number[] = new Array(MOCHI_RING_COUNT);
  const grabOffsetY: number[] = new Array(MOCHI_RING_COUNT);

  let maxWeight = 0;
  let nearestIdx = 0;
  let nearestDistSq = Infinity;

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const n = state.nodes[i];
    const dx = n.x - x;
    const dy = n.y - y;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestIdx = i;
    }
    const w = Math.exp(-distSq / twoSigmaSq);
    weights[i] = w;
    grabOffsetX[i] = clamp(dx, -64, 64);
    grabOffsetY[i] = clamp(dy, -64, 64);
    if (w > maxWeight) maxWeight = w;
  }

  // Ensure grabbing slightly outside the rim still firmly catches the nearest cheek/ear lobe
  if (maxWeight < 0.72) {
    const boost = 0.88 / Math.max(maxWeight, 0.08);
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      weights[i] = Math.min(1, weights[i] * boost);
    }
    weights[nearestIdx] = 1;
  }

  const distCenter = Math.hypot(state.center.x - x, state.center.y - y);
  const centerWeight = distCenter < 48 ? 0.45 * (1 - distCenter / 48) : 0;

  const anchor: DragAnchor = {
    pointerId,
    startX: x,
    startY: y,
    x,
    y,
    clampedX: x,
    clampedY: y,
    weights,
    centerWeight,
    grabOffsetX,
    grabOffsetY,
    centerOffsetX: clamp(state.center.x - x, -42, 42),
    centerOffsetY: clamp(state.center.y - y, -42, 42),
    maxDisplacement: 0,
  };

  state.anchors.set(pointerId, anchor);
  state.pokeTimer = 0.24;
  state.pokeDipY = 6.5;

  // Immediate tactile squish impulse on touch-down so even a quick tap feels juicy
  const isCenterPoke = distCenter < 46;
  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const n = state.nodes[i];
    const relX = n.x - state.center.x;
    const relY = n.y - state.center.y;
    if (isCenterPoke) {
      // Plush downward squish: slightly widens horizontally & flattens vertically
      n.vx += relX * 1.9;
      n.vy += -relY * 1.85 + 32;
    } else {
      const w = weights[i];
      if (w > 0.15) {
        // Gentle local finger dimple inward
        n.vx += (state.center.x - n.x) * 1.15 * w;
        n.vy += (state.center.y - n.y) * 1.15 * w;
      }
    }
  }
  state.center.vy += isCenterPoke ? 42 : 16;

  const intensity = clamp(0.45 + (state.anchors.size > 1 ? 0.3 : 0) + (isCenterPoke ? 0.15 : 0.05), 0.3, 1);
  return { hit: true, intensity, x, y };
}

/**
 * Updates an active pointer's target coordinates with soft rubbery stretch clamping.
 */
export function moveMochiPointer(
  state: MochiSoftBodyState,
  pointerId: number,
  rawX: number,
  rawY: number,
): void {
  const anchor = state.anchors.get(pointerId);
  if (!anchor) return;

  anchor.x = rawX;
  anchor.y = rawY;

  // Soft-clamp delta relative to grab origin so pulling feels chewy and never snaps wildly
  const soft = softClampDelta(rawX - anchor.startX, rawY - anchor.startY, MAX_PULL_DISTANCE);
  const candidateX = anchor.startX + soft.dx;
  const candidateY = anchor.startY + soft.dy;

  // Keep effective anchor comfortably inside canvas bounds without double-squashing reach
  anchor.clampedX = clamp(candidateX, 16, MOCHI_STAGE_SIZE - 16);
  anchor.clampedY = clamp(candidateY, 22, MOCHI_STAGE_SIZE - 16);

  const disp = Math.hypot(anchor.clampedX - anchor.startX, anchor.clampedY - anchor.startY);
  if (disp > anchor.maxDisplacement) {
    anchor.maxDisplacement = disp;
  }
}

/**
 * Releases a pointer and triggers a snappy jelly rebound pulse if the body was stretched or squished.
 */
export function releaseMochiPointer(
  state: MochiSoftBodyState,
  pointerId: number,
): PointerReleaseResult {
  const anchor = state.anchors.get(pointerId);
  if (!anchor) {
    return {
      released: false,
      bounced: false,
      intensity: 0,
      originX: state.center.x,
      originY: state.center.y,
    };
  }

  state.anchors.delete(pointerId);

  const currentPull = Math.hypot(anchor.clampedX - anchor.startX, anchor.clampedY - anchor.startY);
  const effectivePull = Math.max(currentPull, anchor.maxDisplacement * 0.72);
  const wasDeformed = effectivePull > 12 || state.metrics.stretch > 0.14 || state.metrics.squeeze > 0.14;

  // Give a slight crisp spring-back kick toward rest so releasing feels delectably jiggly
  if (wasDeformed) {
    const kickBoost = clamp(effectivePull / 78, 0.25, 1.0);
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const w = anchor.weights[i];
      if (w > 0.12) {
        const n = state.nodes[i];
        const targetX = state.center.x + n.restOffsetX;
        const targetY = state.center.y + n.restOffsetY;
        n.vx += (targetX - n.x) * 2.1 * w * kickBoost;
        n.vy += (targetY - n.y) * 2.1 * w * kickBoost;
      }
    }
    state.releaseBounceTimer = 0.72;
  }

  const intensity = clamp(0.28 + effectivePull / 84 + state.metrics.stretch * 0.45, 0.25, 1);

  return {
    released: true,
    bounced: wasDeformed,
    intensity,
    originX: anchor.clampedX,
    originY: anchor.clampedY,
  };
}

/**
 * Accessible keyboard / programmatic gentle squish pulse.
 */
export function triggerAccessibleSquish(state: MochiSoftBodyState): PointerReleaseResult {
  state.pokeTimer = 0.34;
  state.pokeDipY = 8;
  state.releaseBounceTimer = 0.75;

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const n = state.nodes[i];
    const relX = n.x - state.center.x;
    const relY = n.y - state.center.y;
    n.vx += relX * 4.4;
    n.vy += -relY * 4.2 + 48;
  }
  state.center.vy += 65;

  return {
    released: true,
    bounced: true,
    intensity: 0.7,
    originX: state.center.x,
    originY: state.center.y - 24,
  };
}

/**
 * Advances soft-body physics, area pressure, multi-touch anchors, anti-inversion constraints,
 * secondary pompom pendulum, and emotion state machine.
 */
export function stepMochiSoftBody(
  state: MochiSoftBodyState,
  rawDt: number,
  reducedMotion = false,
): MochiMetrics {
  const dt = clamp(Number.isFinite(rawDt) ? rawDt : 1 / 60, 0.001, MAX_FRAME_DT);
  state.time += dt;

  if (state.pokeTimer > 0) {
    state.pokeTimer = Math.max(0, state.pokeTimer - dt);
  }
  state.pokeDipY *= Math.pow(0.08, dt);

  if (state.releaseBounceTimer > 0) {
    state.releaseBounceTimer = Math.max(0, state.releaseBounceTimer - dt);
  }

  // Natural idle blinking (eyes remain OPEN ~96% of the time)
  let blinkAmount = 0;
  if (!reducedMotion) {
    state.blinkTimer -= dt;
    if (state.blinkTimer <= 0) {
      state.blinkPhase += dt / 0.145; // smooth 145ms blink
      if (state.blinkPhase >= 1) {
        state.blinkPhase = 0;
        // Deterministic pseudo-random interval between 3.2s and 5.1s
        state.blinkTimer = 3.2 + ((Math.sin(state.time * 12.9898) * 43758.5453) % 1 + 1) % 1 * 1.9;
      } else {
        blinkAmount = Math.sin(state.blinkPhase * Math.PI);
      }
    }
  }

  // Gentle volume-preserving idle breathing
  const breathWave = reducedMotion ? 0 : Math.sin(state.time * 2.15);
  const breathScaleX = 1 + 0.017 * breathWave;
  const breathScaleY = 1 - 0.017 * breathWave;

  const anchorList = Array.from(state.anchors.values());
  const hasAnchors = anchorList.length > 0;
  const isTwoFinger = anchorList.length >= 2;

  // Precompute per-node competitive anchor dominance when 2+ fingers grab simultaneously
  // so each finger cleanly claims the half of the cat closest to it (smooth pancake / pinch!)
  const nodeAnchorGrabSum = new Float32Array(MOCHI_RING_COUNT);
  const effectiveWeights: number[][] = anchorList.map(() => new Array(MOCHI_RING_COUNT).fill(0));

  if (hasAnchors) {
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      let bestW = 0;
      let bestA = -1;
      for (let a = 0; a < anchorList.length; a++) {
        const w = anchorList[a].weights[i];
        if (w > bestW) {
          bestW = w;
          bestA = a;
        }
      }
      for (let a = 0; a < anchorList.length; a++) {
        let w = anchorList[a].weights[i];
        if (isTwoFinger && a !== bestA) {
          // Attenuate competing finger weight on nodes strongly claimed by the opposite finger
          w *= 0.16;
        }
        effectiveWeights[a][i] = w;
        if (w > nodeAnchorGrabSum[i]) nodeAnchorGrabSum[i] = w;
      }
    }
  }

  const subDt = dt / SUBSTEPS;
  const freeDampPerSub = Math.pow(reducedMotion ? 0.84 : 0.954, subDt * 60);
  const heldDampPerSub = Math.pow(0.915, subDt * 60);

  const fx = new Float32Array(MOCHI_RING_COUNT + 1);
  const fy = new Float32Array(MOCHI_RING_COUNT + 1);
  const projAngles = new Float64Array(MOCHI_RING_COUNT);
  const projRadii = new Float64Array(MOCHI_RING_COUNT);
  const hitAngleWall = new Uint8Array(MOCHI_RING_COUNT);
  const hitRadialWall = new Uint8Array(MOCHI_RING_COUNT);

  for (let step = 0; step < SUBSTEPS; step++) {
    fx.fill(0);
    fy.fill(0);

    // 1) Spring network (perimeter, bending, radial spokes, cross-bracing)
    for (let s = 0; s < state.springs.length; s++) {
      const sp = state.springs[s];
      const na = getNodeByIndex(state, sp.a);
      const nb = getNodeByIndex(state, sp.b);
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-5) continue;

      const forceMag = sp.stiffness * (dist - sp.restLen);
      const ux = dx / dist;
      const uy = dy / dist;

      // Mild relative velocity damping along spring axis prevents high-frequency buzz
      const relVx = nb.vx - na.vx;
      const relVy = nb.vy - na.vy;
      const dampMag = (relVx * ux + relVy * uy) * 3.8;

      const total = forceMag + dampMag;
      const dfx = ux * total;
      const dfy = uy * total;

      fx[sp.a] += dfx;
      fy[sp.a] += dfy;
      fx[sp.b] -= dfx;
      fy[sp.b] -= dfy;
    }

    // 2) True Area / Volume Preservation (internal mochi pressure)
    // Strictly gated to valid positive-area loops so pressure can NEVER implode or spin a folded loop
    const currentArea = computeRingSignedArea(state.nodes);
    const areaRatio = clamp(currentArea / state.restArea, 0.25, 2.6);
    const pressure =
      currentArea > state.restArea * 0.2
        ? clamp((1 - areaRatio) * PRESSURE_STRENGTH, -5200, 11800)
        : 0;

    if (pressure !== 0) {
      for (let i = 0; i < MOCHI_RING_COUNT; i++) {
        const nextIdx = (i + 1) % MOCHI_RING_COUNT;
        const a = state.nodes[i];
        const b = state.nodes[nextIdx];
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const edgeLen = Math.hypot(ex, ey);
        if (edgeLen < 1e-4) continue;

        // Outward normal for clockwise winding in y-down screen coordinates: (+ey/len, -ex/len)
        let nx = ey / edgeLen;
        let ny = -ex / edgeLen;
        // Double-check normal points outward from `center` (immune to any local edge crease)
        const midX = (a.x + b.x) * 0.5 - state.center.x;
        const midY = (a.y + b.y) * 0.5 - state.center.y;
        if (nx * midX + ny * midY < 0) {
          const midLen = Math.hypot(midX, midY);
          if (midLen > 1e-4) {
            nx = midX / midLen;
            ny = midY / midLen;
          }
        }

        const edgeWeight = Math.min(2.2, edgeLen / state.avgEdgeLen) * 0.5;
        const pfx = nx * pressure * edgeWeight;
        const pfy = ny * pressure * edgeWeight;

        fx[i] += pfx;
        fy[i] += pfy;
        fx[nextIdx] += pfx;
        fy[nextIdx] += pfy;
      }
    }

    // 3) Center home anchor, centroid coupling & gentle shape-matching around bounded tilt
    const c = state.center;
    const homeY = MOCHI_REST_CENTER_Y + state.pokeDipY;
    fx[MOCHI_RING_COUNT] += (MOCHI_REST_CENTER_X - c.x) * CENTER_HOME_K;
    fy[MOCHI_RING_COUNT] += (homeY - c.y) * CENTER_HOME_K;

    // Estimate instantaneous body rotation (bounded) and mean ring centroid so face never detaches
    let crossSum = 0;
    let dotSum = 0;
    let ringMeanX = 0;
    let ringMeanY = 0;
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      ringMeanX += n.x;
      ringMeanY += n.y;
      const rx = n.x - c.x;
      const ry = n.y - c.y;
      crossSum += n.restOffsetX * ry - n.restOffsetY * rx;
      dotSum += n.restOffsetX * rx + n.restOffsetY * ry;
    }
    ringMeanX /= MOCHI_RING_COUNT;
    ringMeanY /= MOCHI_RING_COUNT;
    fx[MOCHI_RING_COUNT] += (ringMeanX - c.x) * CENTROID_COUPLE_K;
    fy[MOCHI_RING_COUNT] += (ringMeanY - c.y) * CENTROID_COUPLE_K;

    const bodyTilt = clamp(Math.atan2(crossSum, Math.max(1, dotSum)), -MAX_BODY_TILT, MAX_BODY_TILT);
    const cosT = Math.cos(bodyTilt);
    const sinT = Math.sin(bodyTilt);

    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      const sx = n.restOffsetX * breathScaleX;
      const sy = n.restOffsetY * breathScaleY;
      const targetX = c.x + (sx * cosT - sy * sinT);
      const targetY = c.y + (sx * sinT + sy * cosT);

      // Soften shape-match on strongly grabbed nodes so mochi dough stretches dramatically!
      const grab = nodeAnchorGrabSum[i];
      const kShape = SHAPE_MATCH_K * (1 - 0.72 * grab);
      fx[i] += (targetX - n.x) * kShape;
      fy[i] += (targetY - n.y) * kShape;

      // Subtle coaster friction on ungrabbed side during 1-finger pull so one cheek stretches
      // elastically instead of sliding the whole body; disabled in 2-finger mode so pinching
      // puffs top & bottom freely via area preservation.
      if (anchorList.length === 1 && grab < 0.35) {
        const gripWeight = 1 - grab / 0.35;
        const restWorldX = MOCHI_REST_CENTER_X + sx;
        const restWorldY = homeY + sy;
        fx[i] += (restWorldX - n.x) * COASTER_GRIP_K * gripWeight;
        fy[i] += (restWorldY - n.y) * COASTER_GRIP_K * gripWeight;
      }
    }

    // 4) Multi-touch drag anchors (1 or 2+ fingers) with sector-safe target clamping
    if (hasAnchors) {
      for (let a = 0; a < anchorList.length; a++) {
        const anchor = anchorList[a];
        const wArr = effectiveWeights[a];
        const pullGain = isTwoFinger ? DRAG_SPRING_K * 1.15 : DRAG_SPRING_K;

        for (let i = 0; i < MOCHI_RING_COUNT; i++) {
          const w = wArr[i];
          if (w < 0.04) continue;
          const n = state.nodes[i];
          const rawDesiredX = anchor.clampedX + anchor.grabOffsetX[i];
          const rawDesiredY = anchor.clampedY + anchor.grabOffsetY[i];

          // Prevent circular swirl gestures from pulling a node across `center` into the opposite hemisphere
          const ddx = rawDesiredX - c.x;
          const ddy = rawDesiredY - c.y;
          const dDist = Math.hypot(ddx, ddy);
          const baseAngle = n.restAngle + bodyTilt;
          const dAngle = dDist > 1e-4 ? Math.atan2(ddy, ddx) : baseAngle;
          const safeAngle = baseAngle + clamp(wrapAngle(dAngle - baseAngle), -MAX_NODE_ANGLE_DEV * 1.15, MAX_NODE_ANGLE_DEV * 1.15);
          const safeDist = clamp(dDist, n.restRadius * 0.48, n.restRadius * 2.05);
          const desiredX = c.x + Math.cos(safeAngle) * safeDist;
          const desiredY = c.y + Math.sin(safeAngle) * safeDist;

          fx[i] += (desiredX - n.x) * pullGain * w - n.vx * DRAG_DAMPING * w;
          fy[i] += (desiredY - n.y) * pullGain * w - n.vy * DRAG_DAMPING * w;
        }

        if (anchor.centerWeight > 0.02 && !isTwoFinger) {
          const desiredCx = anchor.clampedX + anchor.centerOffsetX;
          const desiredCy = anchor.clampedY + anchor.centerOffsetY;
          fx[MOCHI_RING_COUNT] += (desiredCx - c.x) * 280 * anchor.centerWeight;
          fy[MOCHI_RING_COUNT] += (desiredCy - c.y) * 280 * anchor.centerWeight;
        }
      }
    }

    // 5) Semi-implicit Euler integration with speed clamp & velvety damping
    const damp = hasAnchors ? heldDampPerSub : freeDampPerSub;

    c.vx = clamp((c.vx + fx[MOCHI_RING_COUNT] * subDt) * damp, -MAX_NODE_SPEED, MAX_NODE_SPEED);
    c.vy = clamp((c.vy + fy[MOCHI_RING_COUNT] * subDt) * damp, -MAX_NODE_SPEED, MAX_NODE_SPEED);
    c.x = clamp(c.x + c.vx * subDt, MOCHI_REST_CENTER_X - 28, MOCHI_REST_CENTER_X + 28);
    c.y = clamp(c.y + c.vy * subDt, MOCHI_REST_CENTER_Y - 28, MOCHI_REST_CENTER_Y + 26);

    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      n.vx = clamp((n.vx + fx[i] * subDt) * damp, -MAX_NODE_SPEED, MAX_NODE_SPEED);
      n.vy = clamp((n.vy + fy[i] * subDt) * damp, -MAX_NODE_SPEED, MAX_NODE_SPEED);
      n.x += n.vx * subDt;
      n.y += n.vy * subDt;
    }

    // Rotational viscosity: bleed away any net rigid-body spin momentum so swirling never creates a vortex
    let omegaSum = 0;
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      const rx = n.x - c.x;
      const ry = n.y - c.y;
      const rSq = Math.max(200, rx * rx + ry * ry);
      omegaSum += (rx * n.vy - ry * n.vx) / rSq;
    }
    const avgOmega = omegaSum / MOCHI_RING_COUNT;
    if (Math.abs(avgOmega) > 0.05) {
      const bleed = avgOmega * 0.34;
      for (let i = 0; i < MOCHI_RING_COUNT; i++) {
        const n = state.nodes[i];
        const rx = n.x - c.x;
        const ry = n.y - c.y;
        n.vx -= -ry * bleed;
        n.vy -= rx * bleed;
      }
    }

    // 6) Bulletproof Polar Sector Envelope & Monotonic Winding Projection
    // Mathematically guarantees a strictly star-shaped, positive-area CW polygon around `center`
    // on every frame — zero collapse, zero inversion, zero self-sustaining spin!
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      const rx = n.x - c.x;
      const ry = n.y - c.y;
      const dist = Math.hypot(rx, ry);
      const minDist = n.restRadius * 0.48;
      const maxDist = n.restRadius * 2.05;
      const clampedDist = clamp(dist, minDist, maxDist);

      const baseAngle = n.restAngle + bodyTilt;
      const rawAngle = dist > 1e-4 ? Math.atan2(ry, rx) : baseAngle;
      const relAngle = wrapAngle(rawAngle - baseAngle);
      const clampedRel = clamp(relAngle, -MAX_NODE_ANGLE_DEV, MAX_NODE_ANGLE_DEV);

      projAngles[i] = baseAngle + clampedRel;
      projRadii[i] = clampedDist;
      hitAngleWall[i] = clampedRel !== relAngle ? 1 : 0;
      hitRadialWall[i] = clampedDist !== dist ? 1 : 0;
    }

    // Enforce strict clockwise separation in unwrapped angle space (2 cyclic relaxation passes)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < MOCHI_RING_COUNT; i++) {
        const next = (i + 1) % MOCHI_RING_COUNT;
        const nextAngle = next === 0 ? projAngles[0] + Math.PI * 2 : projAngles[next];
        const gap = nextAngle - projAngles[i];
        if (gap < MIN_NODE_ANGLE_GAP) {
          const corr = (MIN_NODE_ANGLE_GAP - gap) * 0.52;
          const baseI = state.nodes[i].restAngle + bodyTilt;
          const baseNext = state.nodes[next].restAngle + bodyTilt;
          projAngles[i] = clamp(
            projAngles[i] - corr,
            baseI - MAX_NODE_ANGLE_DEV,
            baseI + MAX_NODE_ANGLE_DEV,
          );
          projAngles[next] = clamp(
            projAngles[next] + corr,
            baseNext - MAX_NODE_ANGLE_DEV,
            baseNext + MAX_NODE_ANGLE_DEV,
          );
          hitAngleWall[i] = 1;
          hitAngleWall[next] = 1;
        }
      }
    }

    // Write back projected coordinates & passively damp wall-violating velocity (zero energy injection)
    for (let i = 0; i < MOCHI_RING_COUNT; i++) {
      const n = state.nodes[i];
      const a = projAngles[i];
      const r = projRadii[i];
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const newX = clamp(c.x + cosA * r, 14, MOCHI_STAGE_SIZE - 14);
      const newY = clamp(c.y + sinA * r, 26, MOCHI_STAGE_SIZE - 18);

      if (hitAngleWall[i] || hitRadialWall[i]) {
        const vr = n.vx * cosA + n.vy * sinA;
        const vt = -n.vx * sinA + n.vy * cosA;
        const nextVr = hitRadialWall[i] ? vr * 0.18 : vr;
        const nextVt = hitAngleWall[i] ? vt * 0.12 : vt * 0.85;
        n.vx = nextVr * cosA - nextVt * sinA;
        n.vy = nextVr * sinA + nextVt * cosA;
      }

      n.x = newX;
      n.y = newY;
    }
  }

  // Secondary spring physics for the Santa hat pompom driven by crown motion
  const crown = state.nodes[0];
  const crownVx = (crown.x - state.prevCrownX) / dt;
  const crownVy = (crown.y - state.prevCrownY) / dt;
  state.prevCrownX = crown.x;
  state.prevCrownY = crown.y;

  const pom = state.pompom;
  const pomTargetX = clamp(-crownVx * 0.032, -16, 16);
  const pomTargetY = clamp(-crownVy * 0.028, -14, 14);
  pom.vx += (pomTargetX - pom.offsetX) * 145 * dt;
  pom.vy += (pomTargetY - pom.offsetY) * 145 * dt;
  const pomDamp = Math.pow(0.86, dt * 60);
  pom.vx *= pomDamp;
  pom.vy *= pomDamp;
  pom.offsetX = clamp(pom.offsetX + pom.vx * dt, -20, 20);
  pom.offsetY = clamp(pom.offsetY + pom.vy * dt, -18, 18);

  // Compute deformation metrics & live emotion state
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxNodeStretch = 1;
  let sumSpeedSq = 0;
  let crossSum = 0;
  let dotSum = 0;

  for (let i = 0; i < MOCHI_RING_COUNT; i++) {
    const n = state.nodes[i];
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;

    const rx = n.x - state.center.x;
    const ry = n.y - state.center.y;
    const ratio = Math.hypot(rx, ry) / Math.max(1, n.restRadius);
    if (ratio > maxNodeStretch) maxNodeStretch = ratio;

    sumSpeedSq += n.vx * n.vx + n.vy * n.vy;
    crossSum += n.restOffsetX * ry - n.restOffsetY * rx;
    dotSum += n.restOffsetX * rx + n.restOffsetY * ry;
  }

  const stretchX = (maxX - minX) / state.restWidth;
  const stretchY = (maxY - minY) / state.restHeight;
  const finalAreaRatio = computeRingSignedArea(state.nodes) / state.restArea;
  const rmsSpeed = Math.sqrt(sumSpeedSq / MOCHI_RING_COUNT);
  const energy = clamp(rmsSpeed / 260, 0, 1);

  const axisStretch = Math.max(stretchX - 1, stretchY - 1);
  const localStretch = (maxNodeStretch - 1) * 0.85;
  const stretch = clamp(Math.max(axisStretch, localStretch) / 0.45, 0, 1);

  const axisSqueeze = Math.max(0, 1 - Math.min(stretchX, stretchY));
  const pokeBoost = state.pokeTimer > 0 ? 0.24 * (state.pokeTimer / 0.24) : 0;
  const squeeze = clamp(axisSqueeze / 0.28 + pokeBoost, 0, 1);

  const tilt = clamp(Math.atan2(crossSum, Math.max(1, dotSum)), -0.34, 0.34);

  // Hysteresis-stabilized emotion transitions
  const prevEmotion = state.metrics.emotion;
  const surprisedThreshold = prevEmotion === 'surprised' ? 0.34 : 0.44;
  let emotion: MochiEmotion = 'idle';

  if (stretch >= surprisedThreshold || maxNodeStretch >= (prevEmotion === 'surprised' ? 1.24 : 1.32)) {
    emotion = 'surprised';
  } else if (hasAnchors || squeeze >= 0.22 || state.pokeTimer > 0.04) {
    emotion = 'squish';
  } else if (state.releaseBounceTimer > 0 && (energy > 0.08 || state.releaseBounceTimer > 0.22)) {
    emotion = 'happy';
  } else {
    emotion = 'idle';
  }

  const targetBlush =
    emotion === 'squish'
      ? 0.68
      : emotion === 'happy'
        ? 0.62
        : emotion === 'surprised'
          ? 0.46
          : 0.34;
  const blushIntensity =
    state.metrics.blushIntensity + (targetBlush - state.metrics.blushIntensity) * Math.min(1, dt * 9);

  state.metrics = {
    stretchX,
    stretchY,
    maxNodeStretch,
    stretch,
    squeeze,
    energy,
    areaRatio: finalAreaRatio,
    tilt,
    emotion,
    blinkAmount: emotion === 'idle' ? blinkAmount : 0,
    blushIntensity,
    activePointers: state.anchors.size,
  };

  return state.metrics;
}
