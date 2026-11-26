import * as THREE from 'three';
export { createGuideEnvironment, type GuideEnvironment } from './guideEnvironment';

export interface GuideObjectUpdateParams {
  dt: number;
  elapsed: number;
  scrollProgress: number;
  scrollVelocity: number;
  masterOpacity: number;
  reducedMotion: boolean;
}

/**
 * Swappable 3D guide object contract.
 * Replace `createGuideObjectModel` with any procedural rig or GLB loader wrapper
 * without changing scroll choreography or tap hit-testing in `CrystalGuide3D`.
 */
export interface GuideObjectModel {
  readonly root: THREE.Group;
  readonly hitRadius: number;
  update: (params: GuideObjectUpdateParams) => void;
  triggerPulse: (intensity?: number) => void;
  isAnimatingPulse: () => boolean;
  dispose: () => void;
}

interface InternalSpark {
  mesh: THREE.Mesh;
  radius: number;
  theta: number;
  phi: number;
  speed: number;
  phase: number;
  baseScale: number;
}

interface BurstSpark {
  sprite: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseScale: number;
  spinSpeed: number;
}

function createRadialGlowTexture(warmCore: boolean): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, 2, c, c, c);
    if (warmCore) {
      grad.addColorStop(0, 'rgba(255, 245, 205, 1)');
      grad.addColorStop(0.24, 'rgba(242, 188, 84, 0.92)');
      grad.addColorStop(0.55, 'rgba(210, 146, 48, 0.42)');
      grad.addColorStop(1, 'rgba(210, 146, 48, 0)');
    } else {
      grad.addColorStop(0, 'rgba(244, 212, 146, 0.45)');
      grad.addColorStop(0.45, 'rgba(136, 178, 214, 0.24)');
      grad.addColorStop(1, 'rgba(136, 178, 214, 0)');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStarSparkTexture(gold: boolean): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const halo = ctx.createRadialGradient(c, c, 2, c, c, c * 0.92);
    if (gold) {
      halo.addColorStop(0, 'rgba(255, 248, 214, 1)');
      halo.addColorStop(0.32, 'rgba(232, 176, 68, 0.82)');
      halo.addColorStop(0.7, 'rgba(196, 134, 38, 0.22)');
      halo.addColorStop(1, 'rgba(196, 134, 38, 0)');
    } else {
      halo.addColorStop(0, 'rgba(255, 255, 255, 1)');
      halo.addColorStop(0.36, 'rgba(148, 198, 236, 0.78)');
      halo.addColorStop(1, 'rgba(148, 198, 236, 0)');
    }
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Crisp 4-pointed diamond star core
    const arm = c * 0.82;
    const waist = c * 0.14;
    ctx.beginPath();
    ctx.moveTo(c, c - arm);
    ctx.lineTo(c + waist, c - waist);
    ctx.lineTo(c + arm, c);
    ctx.lineTo(c + waist, c + waist);
    ctx.lineTo(c, c + arm);
    ctx.lineTo(c - waist, c + waist);
    ctx.lineTo(c - arm, c);
    ctx.lineTo(c - waist, c - waist);
    ctx.closePath();
    ctx.fillStyle = gold ? '#D6952E' : '#85B8E2';
    ctx.fill();

    // Bright pinpoint center
    ctx.beginPath();
    ctx.arc(c, c, c * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF4';
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPulseRingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const grad = ctx.createRadialGradient(c, c, c * 0.52, c, c, c * 0.96);
    grad.addColorStop(0, 'rgba(235, 184, 78, 0)');
    grad.addColorStop(0.45, 'rgba(230, 174, 68, 0.78)');
    grad.addColorStop(0.72, 'rgba(255, 244, 206, 0.92)');
    grad.addColorStop(1, 'rgba(230, 174, 68, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a cut-crystal faceted bauble shell with crisp flat triangular jewel facets
 * and a softly leveled top seat for the scalloped champagne-gold crown cap.
 */
function createFacetedBaubleGeometry(radius: number): THREE.BufferGeometry {
  const raw = new THREE.IcosahedronGeometry(radius, 2);
  const nonIndexed = raw.index ? raw.toNonIndexed() : raw.clone();
  raw.dispose();

  const pos = nonIndexed.getAttribute('position');
  const crownSeatY = radius * 0.915;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > crownSeatY) {
      pos.setY(i, crownSeatY + (y - crownSeatY) * 0.28);
    }
  }
  pos.needsUpdate = true;
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

/**
 * Generates a scalloped vintage champagne-gold crown collar matching the reference ornaments.
 */
function createScallopedCrownGeometry(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.195, 0.255, 0.165, 16, 2, false);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const radial = Math.hypot(x, z);
    if (radial > 0.05) {
      const angle = Math.atan2(z, x);
      const flute = Math.sin(angle * 8) * 0.012;
      const bottomMask = y < -0.03 ? 1 : 0.35;
      const scale = (radial + flute * bottomMask) / radial;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
      if (y < -0.05) {
        pos.setY(i, y + Math.sin(angle * 8) * 0.018);
      }
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates the faceted cut-crystal New Year ornament ball with scalloped champagne-gold cap,
 * delicate hanging loop, luminous golden inner heart & suspended sparks, and dramatic tap pulse.
 */
export function createGuideObjectModel(envMap: THREE.Texture): GuideObjectModel {
  const root = new THREE.Group();
  const baubleGroup = new THREE.Group();
  const burstGroup = new THREE.Group();
  root.add(baubleGroup, burstGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const baubleRadius = 0.84;

  // Soft studio halo behind the crystal sphere
  const outerHaloTex = createRadialGlowTexture(false);
  const innerGlowTex = createRadialGlowTexture(true);
  const pulseRingTex = createPulseRingTexture();
  const goldStarTex = createStarSparkTexture(true);
  const iceStarTex = createStarSparkTexture(false);
  textures.push(outerHaloTex, innerGlowTex, pulseRingTex, goldStarTex, iceStarTex);

  const outerHaloMat = new THREE.SpriteMaterial({
    map: outerHaloTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });
  const outerHalo = new THREE.Sprite(outerHaloMat);
  outerHalo.scale.set(2.35, 2.35, 1);
  outerHalo.position.set(0, -0.02, -0.45);
  outerHalo.renderOrder = 0;
  root.add(outerHalo);
  materials.push(outerHaloMat);

  // Expanding golden shockwave ring shown on tap pulse
  const pulseRingMat = new THREE.SpriteMaterial({
    map: pulseRingTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const pulseRing = new THREE.Sprite(pulseRingMat);
  pulseRing.visible = false;
  pulseRing.renderOrder = 6;
  burstGroup.add(pulseRing);
  materials.push(pulseRingMat);

  // Warm golden heart glow clearly visible through transparent cut-crystal facets
  const innerGlowMat = new THREE.SpriteMaterial({
    map: innerGlowTex,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const innerGlow = new THREE.Sprite(innerGlowMat);
  innerGlow.scale.set(1.16, 1.16, 1);
  innerGlow.position.set(0, -0.04, 0);
  innerGlow.renderOrder = 2;
  baubleGroup.add(innerGlow);
  materials.push(innerGlowMat);

  // Warm inner light illuminating facets & gold crown from within
  const coreLight = new THREE.PointLight('#FFC95C', 1.45, 4.5);
  coreLight.position.set(0, -0.02, 0.1);
  baubleGroup.add(coreLight);

  // Luminous golden crystal core + 24 suspended internal golden & diamond micro-sparks
  const corePinGeo = new THREE.OctahedronGeometry(0.11, 0);
  const corePinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFE094'),
    emissive: new THREE.Color('#E8A030'),
    emissiveIntensity: 1.75,
    metalness: 0.65,
    roughness: 0.12,
    transparent: true,
    opacity: 0.96,
  });
  const corePin = new THREE.Mesh(corePinGeo, corePinMat);
  corePin.renderOrder = 2;
  baubleGroup.add(corePin);
  geometries.push(corePinGeo);
  materials.push(corePinMat);

  const internalSparkGeo = new THREE.OctahedronGeometry(0.036, 0);
  const internalGoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F8C862'),
    emissive: new THREE.Color('#DC9428'),
    emissiveIntensity: 1.45,
    metalness: 0.72,
    roughness: 0.14,
    transparent: true,
    opacity: 0.96,
  });
  const internalIceMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FFFFFF'),
    emissive: new THREE.Color('#8CC5F2'),
    emissiveIntensity: 1.05,
    metalness: 0.35,
    roughness: 0.08,
    transparent: true,
    opacity: 0.94,
  });
  geometries.push(internalSparkGeo);
  materials.push(internalGoldMat, internalIceMat);

  const internalSparks: InternalSpark[] = [];
  const internalSparkCount = 24;
  for (let i = 0; i < internalSparkCount; i++) {
    const t = i / internalSparkCount;
    const mesh = new THREE.Mesh(
      internalSparkGeo,
      i % 4 === 0 ? internalIceMat : internalGoldMat,
    );
    mesh.renderOrder = 3;
    const radius = 0.22 + ((i * 37) % 11) * 0.044;
    const theta = t * Math.PI * 2 * 2.618;
    const phi = 0.45 + ((i * 53) % 11) * 0.2;
    const baseScale = 0.72 + ((i * 19) % 7) * 0.12;
    mesh.scale.setScalar(baseScale);
    baubleGroup.add(mesh);
    internalSparks.push({
      mesh,
      radius,
      theta,
      phi,
      speed: 0.22 + (i % 5) * 0.07,
      phase: i * 1.13,
      baseScale,
    });
  }

  // Dual-pass cut-crystal shell: deep glacial-blue internal refraction + clear iridescent glass front
  const crystalGeo = createFacetedBaubleGeometry(baubleRadius);
  const backShellMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5A87B0'),
    emissive: new THREE.Color('#B27F32'),
    emissiveIntensity: 0.15,
    metalness: 0.34,
    roughness: 0.06,
    ior: 1.62,
    iridescence: 0.9,
    iridescenceIOR: 1.48,
    iridescenceThicknessRange: [180, 520],
    flatShading: true,
    envMap,
    envMapIntensity: 1.95,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
  });
  const backShell = new THREE.Mesh(crystalGeo, backShellMat);
  backShell.renderOrder = 1;

  const frontShellMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#BBD8EE'),
    metalness: 0.18,
    roughness: 0.025,
    ior: 1.66,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.012,
    iridescence: 1.0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [180, 520],
    flatShading: true,
    envMap,
    envMapIntensity: 2.35,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.5,
  });
  const frontShell = new THREE.Mesh(crystalGeo, frontShellMat);
  frontShell.renderOrder = 4;

  // Crisp cut-crystal facet ridge highlights for diamond-grade edge sparkle
  const edgesGeo = new THREE.EdgesGeometry(crystalGeo, 14);
  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color('#F8FCFF'),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const facetEdges = new THREE.LineSegments(edgesGeo, edgesMat);
  facetEdges.renderOrder = 5;

  baubleGroup.add(backShell, frontShell, facetEdges);
  geometries.push(crystalGeo, edgesGeo);
  materials.push(backShellMat, frontShellMat, edgesMat);

  // Scalloped antique champagne-gold crown cap + beaded rim + slender hanging loop
  const goldCapMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#DCAD5B'),
    emissive: new THREE.Color('#6E4912'),
    emissiveIntensity: 0.14,
    metalness: 0.94,
    roughness: 0.18,
    clearcoat: 0.72,
    clearcoatRoughness: 0.12,
    envMap,
    envMapIntensity: 2.1,
    transparent: true,
    opacity: 0.99,
  });
  materials.push(goldCapMat);

  const crownGroup = new THREE.Group();
  const crownCollarGeo = createScallopedCrownGeometry();
  const crownCollar = new THREE.Mesh(crownCollarGeo, goldCapMat);
  crownCollar.position.set(0, baubleRadius * 0.96, 0);
  crownCollar.renderOrder = 5;

  const crownRimGeo = new THREE.TorusGeometry(0.198, 0.022, 10, 28);
  const crownRim = new THREE.Mesh(crownRimGeo, goldCapMat);
  crownRim.rotation.x = Math.PI / 2;
  crownRim.position.set(0, baubleRadius * 1.055, 0);
  crownRim.renderOrder = 5;

  const finialGeo = new THREE.CylinderGeometry(0.068, 0.168, 0.072, 16);
  const finial = new THREE.Mesh(finialGeo, goldCapMat);
  finial.position.set(0, baubleRadius * 1.095, 0);
  finial.renderOrder = 5;

  const loopGeo = new THREE.TorusGeometry(0.118, 0.016, 12, 36);
  const loopMesh = new THREE.Mesh(loopGeo, goldCapMat);
  loopMesh.position.set(0, baubleRadius * 1.24, 0);
  loopMesh.renderOrder = 5;

  crownGroup.add(crownCollar, crownRim, finial, loopMesh);
  baubleGroup.add(crownGroup);
  geometries.push(crownCollarGeo, crownRimGeo, finialGeo, loopGeo);

  // Pre-allocated star-spark burst sprite pool (high contrast on light backgrounds, zero GC)
  const burstSparks: BurstSpark[] = [];
  const burstCount = 28;
  for (let i = 0; i < burstCount; i++) {
    const isGold = i % 4 !== 0;
    const mat = new THREE.SpriteMaterial({
      map: isGold ? goldStarTex : iceStarTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    sprite.renderOrder = 6;
    burstGroup.add(sprite);
    burstSparks.push({
      sprite,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
      maxLife: 1,
      baseScale: 0.19 + (i % 5) * 0.045,
      spinSpeed: (i % 2 === 0 ? 1 : -1) * (2.6 + (i % 4) * 0.9),
    });
  }

  let pulseSpinAngle = 0;
  let pulseSpinVel = 0;
  let pulseFlash = 0;
  let pulseRingAge = 1;
  let pulseScaleSpring = 0;
  let pulseScaleVel = 0;
  let activeBurstCount = 0;

  const baseOpacities = new Map<THREE.Material, number>([
    [outerHaloMat, 0.58],
    [innerGlowMat, 0.82],
    [corePinMat, 0.96],
    [internalGoldMat, 0.96],
    [internalIceMat, 0.94],
    [backShellMat, 0.56],
    [frontShellMat, 0.5],
    [edgesMat, 0.42],
    [goldCapMat, 0.99],
  ]);

  const triggerPulse = (intensity = 1) => {
    const clamped = Math.max(0.4, Math.min(1.8, intensity));
    pulseSpinVel = Math.min(15, pulseSpinVel + 9.0 * clamped);
    pulseFlash = Math.min(1.35, Math.max(pulseFlash, 1.15 * clamped));
    pulseRingAge = 0;
    pulseScaleVel += 1.9 * clamped;

    activeBurstCount = burstCount;
    for (let i = 0; i < burstCount; i++) {
      const s = burstSparks[i];
      const u = (i + 0.5) / burstCount;
      const phi = Math.acos(1 - 2 * u);
      const theta = i * 2.399963 + Math.random() * 0.4;
      const sinPhi = Math.sin(phi);
      const dirX = sinPhi * Math.cos(theta);
      const dirY = Math.cos(phi);
      const dirZ = sinPhi * Math.sin(theta) * 0.45;

      const startR = baubleRadius * (0.62 + Math.random() * 0.36);
      const speed = (1.55 + Math.random() * 1.85) * clamped;

      s.sprite.position.set(dirX * startR, dirY * startR, dirZ * startR);
      s.vx = dirX * speed;
      s.vy = dirY * speed + 0.25;
      s.vz = dirZ * speed;
      s.life = 0;
      s.maxLife = 0.72 + Math.random() * 0.44;
      s.sprite.scale.setScalar(0.01);
      s.sprite.material.opacity = 1;
      s.sprite.visible = true;
    }
  };

  const update = ({ dt, elapsed, masterOpacity, reducedMotion }: GuideObjectUpdateParams) => {
    const alpha = Math.max(0, Math.min(1, masterOpacity));

    pulseSpinVel *= Math.exp(-dt * 2.2);
    if (Math.abs(pulseSpinVel) < 0.015) pulseSpinVel = 0;
    if (!reducedMotion) {
      pulseSpinAngle += pulseSpinVel * dt;
    }

    pulseFlash *= Math.exp(-dt * 2.3);
    if (pulseFlash < 0.005) pulseFlash = 0;

    const springAcc = -95 * pulseScaleSpring - 11.5 * pulseScaleVel;
    pulseScaleVel += springAcc * dt;
    pulseScaleSpring = Math.max(-0.08, Math.min(0.13, pulseScaleSpring + pulseScaleVel * dt));
    if (Math.abs(pulseScaleSpring) < 0.0008 && Math.abs(pulseScaleVel) < 0.005) {
      pulseScaleSpring = 0;
      pulseScaleVel = 0;
    }

    const idleSpinY = reducedMotion ? 0 : elapsed * 0.26;
    baubleGroup.rotation.y = idleSpinY + pulseSpinAngle;
    baubleGroup.scale.setScalar(1 + (reducedMotion ? 0 : pulseScaleSpring));

    const breathe = reducedMotion ? 0 : Math.sin(elapsed * 2.1) * 0.08;
    corePin.rotation.y = -elapsed * 0.72;
    corePin.rotation.x = elapsed * 0.48;
    corePin.scale.setScalar(1 + pulseFlash * 1.05 + breathe * 0.5);
    corePinMat.emissiveIntensity = 1.75 + pulseFlash * 3.4 + breathe;
    coreLight.intensity = (1.45 + pulseFlash * 5.2) * alpha;

    const glowSize = 1.16 + pulseFlash * 1.15 + breathe * 0.3;
    innerGlow.scale.set(glowSize, glowSize, 1);
    outerHalo.scale.set(2.35 + pulseFlash * 0.85, 2.35 + pulseFlash * 0.85, 1);

    // Expanding golden ring flash on tap
    if (pulseRingAge < 1) {
      pulseRingAge = Math.min(1, pulseRingAge + dt * 1.75);
      const eased = 1 - Math.pow(1 - pulseRingAge, 2.4);
      const ringSize = 1.3 + eased * 2.25;
      pulseRing.scale.set(ringSize, ringSize, 1);
      pulseRingMat.opacity = (1 - pulseRingAge) * (1 - pulseRingAge) * 0.85 * alpha;
      pulseRing.visible = pulseRingAge < 0.99 && alpha > 0.05;
    } else {
      pulseRing.visible = false;
    }

    for (let i = 0; i < internalSparks.length; i++) {
      const sp = internalSparks[i];
      const ang = sp.theta + (reducedMotion ? 0 : elapsed * sp.speed + pulseSpinAngle * 0.35);
      const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.6 + sp.phase) * 0.04;
      const sinP = Math.sin(sp.phi);
      sp.mesh.position.set(
        sp.radius * sinP * Math.cos(ang),
        sp.radius * Math.cos(sp.phi) + bob,
        sp.radius * sinP * Math.sin(ang),
      );
      const twinkle = 0.68 + 0.42 * Math.sin(elapsed * 3.8 + sp.phase) + pulseFlash * 0.75;
      sp.mesh.scale.setScalar(sp.baseScale * twinkle);
      sp.mesh.rotation.y = elapsed * 1.6 + sp.phase;
    }

    if (activeBurstCount > 0) {
      let alive = 0;
      for (let i = 0; i < burstSparks.length; i++) {
        const s = burstSparks[i];
        if (!s.sprite.visible) continue;
        s.life += dt;
        if (s.life >= s.maxLife) {
          s.sprite.visible = false;
          continue;
        }
        alive += 1;
        const progress = s.life / s.maxLife;
        const drag = Math.exp(-dt * 2.1);
        s.vx *= drag;
        s.vy = s.vy * drag - 0.55 * dt;
        s.vz *= drag;

        s.sprite.position.x += s.vx * dt;
        s.sprite.position.y += s.vy * dt;
        s.sprite.position.z += s.vz * dt;
        s.sprite.material.rotation += s.spinSpeed * dt;

        const env = progress < 0.12 ? progress / 0.12 : Math.pow(1 - (progress - 0.12) / 0.88, 1.35);
        const flicker = 0.8 + 0.2 * Math.sin(elapsed * 20 + i * 1.7);
        s.sprite.scale.setScalar(Math.max(0.001, s.baseScale * (0.65 + env * 0.7)));
        s.sprite.material.opacity = Math.min(1, env * flicker * 0.98 * alpha);
      }
      activeBurstCount = alive;
    }

    baseOpacities.forEach((base, mat) => {
      if (mat === innerGlowMat) {
        mat.opacity = Math.min(1, (base + pulseFlash * 0.18) * alpha);
      } else if (mat === edgesMat) {
        mat.opacity = Math.min(0.76, (base + pulseFlash * 0.3) * alpha);
      } else {
        mat.opacity = base * alpha;
      }
    });
  };

  const isAnimatingPulse = () =>
    pulseFlash > 0.01 ||
    pulseRingAge < 0.99 ||
    Math.abs(pulseSpinVel) > 0.03 ||
    Math.abs(pulseScaleSpring) > 0.002 ||
    activeBurstCount > 0;

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  return {
    root,
    hitRadius: baubleRadius * 1.15,
    update,
    triggerPulse,
    isAnimatingPulse,
    dispose,
  };
}
