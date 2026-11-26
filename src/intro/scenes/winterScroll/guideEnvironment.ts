import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface GuideEnvironment {
  readonly envMap: THREE.Texture;
  dispose: () => void;
}

/**
 * Builds a high-contrast jewelry studio PMREM reflection map from Three.js `RoomEnvironment`.
 * Tones down the default all-white room enclosure into deep glacial-slate negative-fill walls
 * while adding crisp specular key strips and warm champagne reflectors close to the origin so
 * cut-crystal facets exhibit vivid jewel dark/bright/gold contrast on bright pastel backgrounds.
 */
export function createGuideEnvironment(renderer: THREE.WebGLRenderer): GuideEnvironment {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const roomEnv = new RoomEnvironment();

  // Dial back RoomEnvironment's uniform white wall/box wash so facets don't turn chalky white
  roomEnv.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      obj.material.color.set('#1C344C');
      obj.material.roughness = 0.72;
    } else if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshBasicMaterial) {
      // Soften overly wide white HDR boxes while preserving bright specular punch
      obj.material.color.multiplyScalar(0.32);
    }
  });

  // Close-range negative-fill cards (deep winter sapphire/slate) + sharp crystal specular strips
  const studioPanels: Array<[number, number, string, number, [number, number, number]]> = [
    // Deep sapphire/slate negative-fill panels giving cut facets crisp dark refractive contrast
    [7.2, 5.2, '#0D2136', 1.0, [-3.6, -1.0, 2.2]],
    [7.0, 5.0, '#122940', 1.0, [3.8, -1.2, -1.8]],
    [8.0, 4.8, '#0F2438', 1.0, [0.0, -4.0, 0.8]],
    [6.4, 4.4, '#183452', 1.0, [2.4, 0.8, -4.0]],
    [6.4, 4.4, '#132B44', 1.0, [-2.8, 1.4, -3.6]],
    // Razor-crisp bright studio softboxes for dazzling diamond glints
    [2.6, 0.9, '#FFFFFF', 4.2, [2.6, 3.2, 2.8]],
    [1.8, 0.65, '#FFFFFF', 3.8, [-2.2, 3.4, 2.4]],
    [2.8, 0.9, '#CBE6FF', 2.4, [-3.4, 1.8, 1.8]],
    // Warm champagne-gold bounce strips matching the crown cap & golden heart
    [3.2, 1.3, '#FFD985', 2.9, [3.2, 1.2, 2.8]],
    [3.0, 1.2, '#F4BD5C', 2.5, [-2.6, -2.0, 3.0]],
    [2.4, 0.8, '#FFE9B2', 3.0, [0.4, -2.6, 3.2]],
  ];

  const tempGeos: THREE.BufferGeometry[] = [];
  const tempMats: THREE.Material[] = [];

  for (const [w, h, hex, intensity, pos] of studioPanels) {
    const geo = new THREE.PlaneGeometry(w, h);
    const col = new THREE.Color(hex).multiplyScalar(intensity);
    const mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    roomEnv.add(mesh);
    tempGeos.push(geo);
    tempMats.push(mat);
  }

  const target = pmrem.fromScene(roomEnv, 0.014);

  tempGeos.forEach((g) => g.dispose());
  tempMats.forEach((m) => m.dispose());
  roomEnv.dispose();
  pmrem.dispose();

  return {
    envMap: target.texture,
    dispose: () => target.dispose(),
  };
}
