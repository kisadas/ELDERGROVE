import * as THREE from 'three';
import { ITEMS_DATA } from '../data/itemsData';
import type { EquippedGear, HeroClass, MonsterKind, MountId, PetId } from '../shared/gameTypes';

export interface ArticulatedRig {
  root: THREE.Group;
  body: THREE.Group;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  cape?: THREE.Object3D;
  leftWing?: THREE.Object3D;
  rightWing?: THREE.Object3D;
  head?: THREE.Object3D;
  orbitAccessory?: THREE.Object3D;
  contactShadow: THREE.Mesh;
  // Live equipment attachment targets
  weaponMats?: THREE.MeshStandardMaterial[];
  weaponGroup?: THREE.Object3D;
  armorMats?: THREE.MeshStandardMaterial[];
  accessoryHalo?: THREE.Mesh;
  saddleMat?: THREE.MeshStandardMaterial;
  equipKey?: string;
}

const SHARED_OUTLINE_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x0b0e14,
  side: THREE.BackSide,
});

export function setOutlinesEnabled(enabled: boolean) {
  SHARED_OUTLINE_MATERIAL.visible = enabled;
}

function makeAnimeRealMat(params: {
  color: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  emissive?: number;
  emissiveIntensity?: number;
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
  rimColor?: number;
  rimStrength?: number;
}): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: params.color,
    roughness: params.roughness ?? 0.45,
    metalness: params.metalness ?? 0.12,
    clearcoat: params.clearcoat ?? 0.18,
    clearcoatRoughness: 0.32,
    emissive: params.emissive ?? 0x000000,
    emissiveIntensity: params.emissiveIntensity ?? 1.0,
    side: params.side ?? THREE.FrontSide,
    transparent: params.transparent ?? false,
    opacity: params.opacity ?? 1.0,
  });

  const rimStr = params.rimStrength ?? 0.34;
  if (rimStr > 0) {
    const rimCol = new THREE.Color(params.rimColor ?? 0xdbeafe);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: rimCol };
      shader.uniforms.uRimStrength = { value: rimStr };
      shader.fragmentShader =
        `uniform vec3 uRimColor;\nuniform float uRimStrength;\n` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        vec3 viewDirRim = normalize(vViewPosition);
        float fresnelRim = pow(1.0 - clamp(abs(dot(normalize(vNormal), viewDirRim)), 0.0, 1.0), 2.6);
        gl_FragColor.rgb += uRimColor * smoothstep(0.25, 0.85, fresnelRim) * uRimStrength;
        #include <dithering_fragment>
        `
      );
    };
  }
  return mat;
}

function addSubtleOutlines(targetGroup: THREE.Object3D, thickness = 1.028) {
  const meshes: THREE.Mesh[] = [];
  targetGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh && !obj.userData.skipOutline) {
      meshes.push(obj);
    }
  });
  for (const mesh of meshes) {
    const mat = mesh.material;
    if (!Array.isArray(mat) && (mat.transparent || mat.side === THREE.DoubleSide)) {
      continue;
    }
    const outline = new THREE.Mesh(mesh.geometry, SHARED_OUTLINE_MATERIAL);
    outline.scale.setScalar(thickness);
    outline.userData.isOutline = true;
    outline.userData.skipOutline = true;
    outline.castShadow = false;
    outline.receiveShadow = false;
    mesh.add(outline);
  }
}

let cachedShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedShadowTex = tex;
  return tex;
}

function makeContactShadow(radius: number): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2.2, radius * 2.2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.04;
  mesh.userData.skipOutline = true;
  return mesh;
}

// Sculpted non-blocky torso profile via LatheGeometry
function createSculptedTorsoGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.01, -0.42),
    new THREE.Vector2(0.24, -0.38),
    new THREE.Vector2(0.21, -0.14), // slim anime waist
    new THREE.Vector2(0.32, 0.16),  // sculpted chest
    new THREE.Vector2(0.34, 0.34),  // shoulders
    new THREE.Vector2(0.14, 0.44),  // collarbone
    new THREE.Vector2(0.01, 0.46),
  ];
  return new THREE.LatheGeometry(pts, 18);
}

// Sculpted non-blocky tapered boot/greave via LatheGeometry
function createSculptedBootGeo(): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.01, -0.18),
    new THREE.Vector2(0.115, -0.16),
    new THREE.Vector2(0.095, -0.02),
    new THREE.Vector2(0.115, 0.14),
    new THREE.Vector2(0.09, 0.22),
    new THREE.Vector2(0.01, 0.22),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

// Sculpted flowing beveled cape via ExtrudeGeometry
function createFlowingCapeGeo(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.24, 0);
  shape.quadraticCurveTo(-0.34, -0.55, -0.44, -1.12);
  shape.quadraticCurveTo(0, -1.24, 0.44, -1.12);
  shape.quadraticCurveTo(0.34, -0.55, 0.24, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
    curveSegments: 10,
  });
  return geo;
}

// Sculpted double-edged beveled sword blade
function createSculptedBladeGeo(length = 1.38, width = 0.095): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(width, 0.12);
  s.lineTo(width * 0.72, length * 0.84);
  s.lineTo(0, length);
  s.lineTo(-width * 0.72, length * 0.84);
  s.lineTo(-width, 0.12);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
}

const CLASS_PALETTES: Record<
  HeroClass,
  { primary: number; trim: number; metal: number; cape: number; skin: number; hair: number; rim: number }
> = {
  warrior: { primary: 0x2a456b, trim: 0xf59e0b, metal: 0xdbeafe, cape: 0xb91c1c, skin: 0xf7ceb0, hair: 0x3b2618, rim: 0xfde68a },
  mage: { primary: 0x3730a3, trim: 0xfbbf24, metal: 0xe2e8f0, cape: 0x5b21b6, skin: 0xfadcc4, hair: 0x4a2518, rim: 0x93c5fd },
  archer: { primary: 0x15803d, trim: 0xd97706, metal: 0xcbd5e1, cape: 0x3f6212, skin: 0xf7ceb0, hair: 0x9a3412, rim: 0x6ee7b7 },
  healer: { primary: 0xf1f5f9, trim: 0xfacc15, metal: 0xfef08a, cape: 0xd97706, skin: 0xfadcc4, hair: 0xd97706, rim: 0xfef08a },
  assassin: { primary: 0x1e1b24, trim: 0xf43f5e, metal: 0x94a3b8, cape: 0x881337, skin: 0xf2ccb0, hair: 0x0f172a, rim: 0xfda4af },
  summoner: { primary: 0x4c1d95, trim: 0xc084fc, metal: 0xe9d5ff, cape: 0x6b21a8, skin: 0xf6d6bc, hair: 0x1e1b4b, rim: 0xd8b4fe },
};

export function createHeroRig(heroClass: HeroClass, isLocal: boolean): ArticulatedRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const contactShadow = makeContactShadow(0.95);
  root.add(contactShadow);

  const ringGeo = new THREE.RingGeometry(0.88, 1.04, 36);
  const ringMat = new THREE.MeshBasicMaterial({
    color: isLocal ? 0xfbbf24 : 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isLocal ? 0.85 : 0.55,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.userData.skipOutline = true;
  root.add(ring);

  const palette = CLASS_PALETTES[heroClass] || CLASS_PALETTES.warrior;

  const primaryMat = makeAnimeRealMat({ color: palette.primary, roughness: 0.5, metalness: 0.18, rimColor: palette.rim, rimStrength: 0.34 });
  const trimMat = makeAnimeRealMat({ color: palette.trim, roughness: 0.28, metalness: 0.65, clearcoat: 0.4, rimColor: 0xfef3c7, rimStrength: 0.42 });
  const armorMetalMat = makeAnimeRealMat({ color: palette.metal, roughness: 0.26, metalness: 0.72, clearcoat: 0.35, rimColor: 0xffffff, rimStrength: 0.45 });
  const capeMat = makeAnimeRealMat({ color: palette.cape, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide, rimColor: palette.rim, rimStrength: 0.22 });
  const skinMat = makeAnimeRealMat({ color: palette.skin, roughness: 0.62, metalness: 0.0, clearcoat: 0.08, rimStrength: 0.16 });
  const hairMat = makeAnimeRealMat({ color: palette.hair, roughness: 0.42, metalness: 0.08, clearcoat: 0.32, rimColor: palette.rim, rimStrength: 0.28 });

  const weaponMats: THREE.MeshStandardMaterial[] = [];
  const armorMats: THREE.MeshStandardMaterial[] = [primaryMat, armorMetalMat];

  // Sculpted tapered legs & contoured greaves
  const bootGeo = createSculptedBootGeo();
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.88, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.34, 8, 12), primaryMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    const boot = new THREE.Mesh(bootGeo, trimMat);
    boot.position.set(0, -0.66, 0.02);
    boot.castShadow = true;
    const toeCap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), trimMat);
    toeCap.scale.set(0.95, 0.7, 1.35);
    toeCap.position.set(0, -0.78, 0.11);
    legPivot.add(thigh, boot, toeCap);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  body.add(leftLeg, rightLeg);

  // Sculpted tapered torso & chest armor
  const torso = new THREE.Mesh(
    createSculptedTorsoGeo(),
    heroClass === 'warrior' ? armorMetalMat : primaryMat
  );
  torso.position.y = 1.28;
  torso.castShadow = true;
  body.add(torso);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 10, 20), trimMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.96;
  body.add(belt);

  if (heroClass === 'mage' || heroClass === 'healer' || heroClass === 'summoner') {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.52, 0.72, 20, 1, true), primaryMat);
    robe.position.y = 0.64;
    robe.castShadow = true;
    robe.userData.skipOutline = true;
    body.add(robe);
  }

  // Contoured multi-layered pauldrons
  const pauldronGeo = new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const leftPauldron = new THREE.Mesh(pauldronGeo, heroClass === 'warrior' ? armorMetalMat : trimMat);
  leftPauldron.position.set(-0.4, 1.61, 0);
  leftPauldron.rotation.z = 0.45;
  const rightPauldron = leftPauldron.clone();
  rightPauldron.position.x = 0.4;
  rightPauldron.rotation.z = -0.45;
  body.add(leftPauldron, rightPauldron);

  // Flowing sculpted cape
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 1.62, -0.22);
  const capeMesh = new THREE.Mesh(createFlowingCapeGeo(), capeMat);
  capeMesh.position.set(0, 0, -0.04);
  capeMesh.rotation.x = 0.16;
  capeMesh.castShadow = true;
  capePivot.add(capeMesh);
  body.add(capePivot);

  // Smooth Anime-Realistic Head, Expressive Eyes, Layered Bangs & Hair Locks
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.98, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.18, 12), skinMat);
  neck.position.y = -0.24;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), skinMat);
  head.scale.set(0.96, 1.04, 0.96);
  head.castShadow = true;
  headGroup.add(neck, head);

  // Expressive anime eyes (sclera + colored iris)
  const eyeColor = heroClass === 'assassin' ? 0xf43f5e : heroClass === 'mage' ? 0x3b82f6 : 0x0f172a;
  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const irisMat = new THREE.MeshBasicMaterial({ color: eyeColor });
  const makeEye = (ex: number) => {
    const eg = new THREE.Group();
    eg.position.set(ex, 0.01, 0.225);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 8), scleraMat);
    sclera.scale.set(1.0, 1.15, 0.5);
    sclera.userData.skipOutline = true;
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), irisMat);
    iris.position.z = 0.014;
    iris.scale.set(0.95, 1.2, 0.55);
    iris.userData.skipOutline = true;
    eg.add(sclera, iris);
    return eg;
  };
  headGroup.add(makeEye(-0.088), makeEye(0.088));

  // Layered anime hair cap + sculpted bangs locks
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.278, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairMat
  );
  hairCap.rotation.x = -0.26;
  headGroup.add(hairCap);

  const lockGeo = new THREE.ConeGeometry(0.068, 0.28, 10);
  for (let b = -2; b <= 2; b++) {
    const bang = new THREE.Mesh(lockGeo, hairMat);
    bang.position.set(b * 0.065, 0.14, 0.22 - Math.abs(b) * 0.025);
    bang.rotation.x = Math.PI * 0.88;
    bang.rotation.z = b * 0.14;
    bang.userData.skipOutline = true;
    headGroup.add(bang);
  }
  const backHair = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 12), hairMat);
  backHair.position.set(0, -0.06, -0.24);
  backHair.rotation.x = Math.PI * 0.84;
  headGroup.add(backHair);

  if (heroClass === 'warrior') {
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 10, 20), trimMat);
    circlet.rotation.x = Math.PI / 2 - 0.1;
    circlet.position.y = 0.14;
    headGroup.add(circlet);
  } else if (heroClass === 'mage') {
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 10, 20), trimMat);
    crown.rotation.x = Math.PI / 2 - 0.15;
    crown.position.y = 0.16;
    headGroup.add(crown);
  } else if (heroClass === 'healer') {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.028, 10, 24),
      makeAnimeRealMat({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.4 })
    );
    halo.position.set(0, 0.36, -0.12);
    halo.rotation.x = 0.25;
    halo.userData.skipOutline = true;
    headGroup.add(halo);
  } else if (heroClass === 'summoner') {
    const lHorn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 10), trimMat);
    lHorn.position.set(-0.19, 0.24, 0.06);
    lHorn.rotation.z = 0.35;
    const rHorn = lHorn.clone();
    rHorn.position.x = 0.19;
    rHorn.rotation.z = -0.35;
    headGroup.add(lHorn, rHorn);
  } else if (heroClass === 'assassin' || heroClass === 'archer') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.44, 16), capeMat);
    hood.position.set(0, 0.16, -0.09);
    hood.rotation.x = -0.45;
    headGroup.add(hood);
  }
  body.add(headGroup);

  // Floating Accessory Halo (lit/tinted when Accessory gear is equipped)
  const accessoryMat = makeAnimeRealMat({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
    roughness: 0.15,
    metalness: 0.4,
  });
  const accessoryHalo = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), accessoryMat);
  accessoryHalo.position.set(0.48, 2.15, -0.18);
  accessoryHalo.visible = false;
  accessoryHalo.userData.skipOutline = true;
  body.add(accessoryHalo);

  // Smooth Tapered Arms & Sculpted Class Weapons
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.42, 1.56, 0);
  const lArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 8, 10), primaryMat);
  lArmMesh.position.y = -0.24;
  leftArm.add(lArmMesh);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.42, 1.56, 0);
  const rArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 8, 10), primaryMat);
  rArmMesh.position.y = -0.24;
  rightArm.add(rArmMesh);

  let orbitAccessory: THREE.Object3D | undefined;
  let weaponGroup: THREE.Object3D | undefined;

  if (heroClass === 'warrior') {
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0, -0.46, 0.12);
    swordGroup.rotation.x = Math.PI * 0.38;
    const bladeMat = makeAnimeRealMat({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.18, clearcoat: 0.5, rimColor: 0xffffff });
    weaponMats.push(bladeMat);
    const blade = new THREE.Mesh(createSculptedBladeGeo(1.42, 0.1), bladeMat);
    blade.position.set(0, 0.08, -0.015);
    blade.castShadow = true;
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10), trimMat);
    guard.rotation.z = Math.PI / 2;
    guard.position.y = 0.08;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.26, 10), capeMat);
    grip.position.y = -0.08;
    swordGroup.add(blade, guard, grip);
    rightArm.add(swordGroup);
    weaponGroup = swordGroup;

    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.07, 16), armorMetalMat);
    shield.rotation.x = Math.PI / 2;
    shield.position.set(-0.14, -0.24, 0.22);
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 18), trimMat);
    shieldRim.position.set(-0.14, -0.24, 0.27);
    leftArm.add(shield, shieldRim);
  } else if (heroClass === 'mage') {
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0, -0.42, 0.18);
    staffGroup.rotation.x = Math.PI * 0.25;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.048, 1.85, 12), trimMat);
    shaft.position.y = 0.55;
    const crystalMat = makeAnimeRealMat({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 1.6, roughness: 0.15, clearcoat: 0.8 });
    weaponMats.push(crystalMat);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crystalMat);
    crystal.position.y = 1.62;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 24), trimMat);
    halo.position.y = 1.62;
    orbitAccessory = halo;
    staffGroup.add(shaft, crystal, halo);
    rightArm.add(staffGroup);
    weaponGroup = staffGroup;
  } else if (heroClass === 'archer') {
    const bowMat = makeAnimeRealMat({ color: palette.trim, roughness: 0.35, metalness: 0.45, clearcoat: 0.3 });
    weaponMats.push(bowMat);
    const bowCurve = new THREE.TorusGeometry(0.62, 0.036, 10, 24, Math.PI * 1.05);
    const bowMesh = new THREE.Mesh(bowCurve, bowMat);
    bowMesh.rotation.z = -Math.PI * 0.52;
    bowMesh.rotation.y = Math.PI / 2;
    bowMesh.position.set(-0.08, -0.35, 0.32);
    leftArm.add(bowMesh);
    weaponGroup = bowMesh;

    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.65, 12), trimMat);
    quiver.position.set(0.16, 1.45, -0.3);
    quiver.rotation.z = -0.35;
    body.add(quiver);
  } else if (heroClass === 'healer') {
    const maceGroup = new THREE.Group();
    maceGroup.position.set(0, -0.42, 0.16);
    maceGroup.rotation.x = Math.PI * 0.32;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 1.1, 10), trimMat);
    handle.position.y = 0.35;
    const sunOrbMat = makeAnimeRealMat({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.5, clearcoat: 0.7 });
    weaponMats.push(sunOrbMat);
    const sunOrb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 1), sunOrbMat);
    sunOrb.position.y = 0.98;
    orbitAccessory = sunOrb;
    maceGroup.add(handle, sunOrb);
    rightArm.add(maceGroup);
    weaponGroup = maceGroup;

    const tome = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 6), trimMat);
    tome.position.set(-0.06, -0.42, 0.24);
    tome.rotation.x = -0.4;
    leftArm.add(tome);
  } else if (heroClass === 'assassin') {
    const daggerMat = makeAnimeRealMat({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.1, metalness: 0.7, roughness: 0.2 });
    weaponMats.push(daggerMat);
    const makeDagger = () => {
      const dg = new THREE.Group();
      dg.position.set(0, -0.45, 0.14);
      dg.rotation.x = Math.PI * 0.44;
      const blade = new THREE.Mesh(createSculptedBladeGeo(0.75, 0.065), daggerMat);
      blade.position.y = 0.05;
      const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), armorMetalMat);
      guard.rotation.z = Math.PI / 2;
      dg.add(blade, guard);
      return dg;
    };
    const rDag = makeDagger();
    rightArm.add(rDag);
    leftArm.add(makeDagger());
    weaponGroup = rDag;
  } else if (heroClass === 'summoner') {
    const rodGroup = new THREE.Group();
    rodGroup.position.set(0, -0.42, 0.16);
    rodGroup.rotation.x = Math.PI * 0.28;
    const rodShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.55, 10), trimMat);
    rodShaft.position.y = 0.45;
    const gemMat = makeAnimeRealMat({ color: 0xd8b4fe, emissive: 0xa855f7, emissiveIntensity: 1.6, clearcoat: 0.8 });
    weaponMats.push(gemMat);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), gemMat);
    gem.position.y = 1.32;
    rodGroup.add(rodShaft, gem);
    rightArm.add(rodGroup);
    weaponGroup = rodGroup;

    const grimoirePivot = new THREE.Group();
    grimoirePivot.position.set(-0.62, 1.55, 0.28);
    const book = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.09, 6),
      makeAnimeRealMat({ color: 0x6b21a8, emissive: 0x9333ea, emissiveIntensity: 0.9 })
    );
    book.rotation.x = Math.PI / 2;
    grimoirePivot.add(book);
    orbitAccessory = grimoirePivot;
    body.add(grimoirePivot);
  }

  body.add(leftArm, rightArm);
  addSubtleOutlines(body, 1.028);

  return {
    root,
    body,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    cape: capePivot,
    head: headGroup,
    orbitAccessory,
    contactShadow,
    weaponMats,
    weaponGroup,
    armorMats,
    accessoryHalo,
  };
}

export function applyHeroEquipmentVisuals(
  rig: ArticulatedRig,
  heroClass: HeroClass,
  equipment?: EquippedGear
) {
  if (!equipment) return;
  const key = `${equipment.weapon || ''}|${equipment.armor || ''}|${equipment.accessory || ''}`;
  if (rig.equipKey === key) return;
  rig.equipKey = key;

  const pal = CLASS_PALETTES[heroClass] || CLASS_PALETTES.warrior;

  if (rig.weaponMats && rig.weaponMats.length > 0) {
    const wDef = equipment.weapon ? ITEMS_DATA[equipment.weapon] : null;
    for (const mat of rig.weaponMats) {
      if (wDef) {
        mat.color.setHex(wDef.modelStyle.colorHex);
        if (wDef.modelStyle.glowHex) {
          mat.emissive.setHex(wDef.modelStyle.glowHex);
          mat.emissiveIntensity = 0.85;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.setHex(pal.metal);
        mat.emissive.setHex(0x000000);
      }
    }
    if (rig.weaponGroup && wDef?.modelStyle.scale) {
      rig.weaponGroup.scale.setScalar(wDef.modelStyle.scale);
    } else if (rig.weaponGroup) {
      rig.weaponGroup.scale.setScalar(1);
    }
  }

  if (rig.armorMats && rig.armorMats.length > 0) {
    const aDef = equipment.armor ? ITEMS_DATA[equipment.armor] : null;
    const baseMat = rig.armorMats[0];
    const secMat = rig.armorMats[1];
    if (aDef) {
      baseMat.color.setHex(aDef.modelStyle.colorHex);
      if (secMat) {
        secMat.color.setHex(aDef.modelStyle.colorHex);
        if (aDef.modelStyle.glowHex) {
          secMat.emissive.setHex(aDef.modelStyle.glowHex);
          secMat.emissiveIntensity = 0.35;
        }
      }
    } else {
      baseMat.color.setHex(pal.primary);
      if (secMat) {
        secMat.color.setHex(pal.metal);
        secMat.emissive.setHex(0x000000);
      }
    }
  }

  if (rig.accessoryHalo) {
    const accDef = equipment.accessory ? ITEMS_DATA[equipment.accessory] : null;
    if (accDef) {
      rig.accessoryHalo.visible = true;
      const mat = rig.accessoryHalo.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(accDef.modelStyle.colorHex);
      mat.emissive.setHex(accDef.modelStyle.glowHex || accDef.modelStyle.colorHex);
    } else {
      rig.accessoryHalo.visible = false;
    }
  }
}

export function applyMountEquipmentVisuals(rig: ArticulatedRig, mountGearId: string | null | undefined) {
  if (!rig.saddleMat) return;
  const gDef = mountGearId ? ITEMS_DATA[mountGearId] : null;
  if (gDef) {
    rig.saddleMat.color.setHex(gDef.modelStyle.colorHex);
    rig.saddleMat.emissive.setHex(gDef.modelStyle.glowHex || 0x000000);
    rig.saddleMat.emissiveIntensity = gDef.modelStyle.glowHex ? 0.5 : 0;
  } else {
    rig.saddleMat.color.setHex(0x78350f);
    rig.saddleMat.emissive.setHex(0x000000);
    rig.saddleMat.emissiveIntensity = 0;
  }
}

export function animateHeroRig(
  rig: ArticulatedRig,
  isMoving: boolean,
  attackAlpha: number,
  time: number,
  isDead: boolean,
  jumpOffsetY: number,
  isMounted = false,
  comboStep: 1 | 2 | 3 = 1,
  isFlying = false
) {
  if (rig.accessoryHalo && rig.accessoryHalo.visible) {
    rig.accessoryHalo.rotation.y = time * 2.4;
    rig.accessoryHalo.position.y = 2.15 + Math.sin(time * 3) * 0.08;
  }

  if (isDead) {
    rig.body.position.y = 0.25;
    rig.body.rotation.x = -Math.PI * 0.45;
    rig.body.rotation.z = 0;
    return;
  }

  if (isMounted) {
    const gallopBob = isFlying
      ? Math.sin(time * 3.8) * 0.12
      : isMoving
        ? Math.abs(Math.sin(time * 13)) * 0.09
        : Math.sin(time * 2.5) * 0.03;
    rig.body.position.y = 0.92 + gallopBob + jumpOffsetY;
    rig.body.rotation.x = isFlying ? 0.22 : isMoving ? 0.14 : 0.06;
    rig.body.rotation.z = 0;
    rig.contactShadow.visible = false;

    if (rig.leftLeg && rig.rightLeg) {
      rig.leftLeg.rotation.x = -0.92;
      rig.leftLeg.rotation.z = -0.34;
      rig.rightLeg.rotation.x = -0.92;
      rig.rightLeg.rotation.z = 0.34;
    }

    if (rig.leftArm && rig.rightArm) {
      rig.leftArm.rotation.x = -0.75;
      rig.leftArm.rotation.z = 0;
      if (attackAlpha > 0) {
        const sw = Math.sin(attackAlpha * Math.PI);
        rig.rightArm.rotation.x = -sw * 1.75 - 0.3;
        rig.rightArm.rotation.y = comboStep === 2 ? -sw * 0.7 : sw * 0.6;
        rig.rightArm.rotation.z = comboStep === 3 ? -sw * 0.4 : 0;
      } else {
        rig.rightArm.rotation.x = -0.62;
        rig.rightArm.rotation.y = 0;
        rig.rightArm.rotation.z = 0;
      }
    }
    if (rig.cape) {
      rig.cape.rotation.x =
        isFlying || isMoving ? 0.78 + Math.sin(time * 16) * 0.2 : 0.22 + Math.sin(time * 2.5) * 0.05;
    }
    if (rig.orbitAccessory) {
      rig.orbitAccessory.rotation.y = time * 2.6;
    }
    return;
  }

  rig.contactShadow.visible = true;
  const stride = isMoving ? Math.sin(time * 11.5) * 0.76 : Math.sin(time * 2.2) * 0.04;
  const bob = isMoving ? Math.abs(Math.sin(time * 11.5)) * 0.12 : Math.sin(time * 2.2) * 0.03;

  const atkSwing = attackAlpha > 0 ? Math.sin(attackAlpha * Math.PI) : 0;
  rig.body.position.y = bob + jumpOffsetY + (comboStep === 3 ? atkSwing * 0.22 : 0);
  rig.body.rotation.x = (isMoving ? 0.12 : 0) + (comboStep === 3 ? atkSwing * 0.26 : atkSwing * 0.14);
  rig.body.rotation.z = atkSwing * (comboStep === 2 ? -0.14 : 0.14);
  rig.contactShadow.scale.setScalar(Math.max(0.5, 1 - jumpOffsetY * 0.18));

  if (rig.leftLeg && rig.rightLeg) {
    rig.leftLeg.rotation.x = stride;
    rig.leftLeg.rotation.z = 0;
    rig.rightLeg.rotation.x = -stride;
    rig.rightLeg.rotation.z = 0;
  }

  if (rig.leftArm && rig.rightArm) {
    if (attackAlpha > 0) {
      if (comboStep === 1) {
        rig.rightArm.rotation.x = -atkSwing * 2.0 - 0.25;
        rig.rightArm.rotation.y = atkSwing * 0.85;
        rig.rightArm.rotation.z = -atkSwing * 0.45;
        rig.leftArm.rotation.x = -stride * 0.5 + atkSwing * 0.4;
        rig.leftArm.rotation.z = 0.2;
      } else if (comboStep === 2) {
        rig.rightArm.rotation.x = -atkSwing * 1.65 - 0.25;
        rig.rightArm.rotation.y = -atkSwing * 0.95;
        rig.rightArm.rotation.z = atkSwing * 0.55;
        rig.leftArm.rotation.x = -atkSwing * 0.9;
        rig.leftArm.rotation.z = -0.2;
      } else {
        rig.rightArm.rotation.x = -atkSwing * 2.55 - 0.15;
        rig.rightArm.rotation.y = atkSwing * 0.45;
        rig.rightArm.rotation.z = -atkSwing * 0.3;
        rig.leftArm.rotation.x = -atkSwing * 1.45;
        rig.leftArm.rotation.z = 0.35;
      }
    } else {
      rig.leftArm.rotation.x = -stride * 0.78;
      rig.leftArm.rotation.z = 0;
      rig.rightArm.rotation.x = stride * 0.78;
      rig.rightArm.rotation.y = 0;
      rig.rightArm.rotation.z = 0;
    }
  }

  if (rig.cape) {
    rig.cape.rotation.x =
      isMoving || atkSwing > 0.1
        ? 0.54 + Math.sin(time * 13) * 0.16 + atkSwing * 0.25
        : 0.12 + Math.sin(time * 2.5) * 0.05;
  }

  if (rig.orbitAccessory) {
    rig.orbitAccessory.rotation.y = time * 2.6;
    rig.orbitAccessory.rotation.x = Math.sin(time * 1.8) * 0.4;
  }
}

export function createMountRig(mountId: MountId): ArticulatedRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const isHeavyFlyer =
    mountId === 'dragon' || mountId === 'wyvern' || mountId === 'phoenix' || mountId === 'griffin' || mountId === 'pegasus';
  const contactShadow = makeContactShadow(isHeavyFlyer ? 1.5 : 1.2);
  root.add(contactShadow);

  const makeQuadrupedLeg = (x: number, z: number, mat: THREE.Material, legLen = 0.75) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, legLen, z);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, legLen * 0.7, 6, 12), mat);
    leg.position.y = -legLen * 0.45;
    leg.castShadow = true;
    pivot.add(leg);
    return pivot;
  };

  const makeWingPair = (wingMat: THREE.Material, span = 1.65, yPos = 1.38) => {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(span, 0.95);
    wingShape.lineTo(span * 1.15, -0.35);
    wingShape.lineTo(span * 0.62, -0.2);
    wingShape.lineTo(span * 0.28, -0.65);
    wingShape.closePath();
    const wingGeo = new THREE.ShapeGeometry(wingShape);

    const leftWing = new THREE.Group();
    leftWing.position.set(-0.34, yPos, 0.15);
    const lWingMesh = new THREE.Mesh(wingGeo, wingMat);
    lWingMesh.rotation.y = Math.PI;
    lWingMesh.rotation.x = -0.25;
    lWingMesh.castShadow = true;
    leftWing.add(lWingMesh);

    const rightWing = new THREE.Group();
    rightWing.position.set(0.34, yPos, 0.15);
    const rWingMesh = new THREE.Mesh(wingGeo, wingMat);
    rWingMesh.rotation.x = -0.25;
    rWingMesh.castShadow = true;
    rightWing.add(rWingMesh);

    return { leftWing, rightWing };
  };

  if (mountId === 'wolf') {
    const furMat = makeAnimeRealMat({ color: 0x475569, roughness: 0.75, rimColor: 0x38bdf8, rimStrength: 0.4 });
    const runeMat = makeAnimeRealMat({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.5 });
    const saddleMat = makeAnimeRealMat({ color: 0x78350f, roughness: 0.55, rimStrength: 0.2 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.15, 8, 14), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.92;
    torso.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.12, 16), saddleMat);
    saddle.scale.set(0.95, 1, 1.2);
    saddle.position.set(0, 1.32, -0.05);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.52, 12), furMat);
    neck.position.set(0, 1.25, 0.68);
    neck.rotation.x = 0.45;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), furMat);
    head.scale.set(0.92, 0.95, 1.25);
    head.position.set(0, 1.46, 0.96);
    head.castShadow = true;

    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 10), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 1.42, 1.32);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.042, 8, 20), runeMat);
    collar.position.set(0, 1.15, 0.6);
    collar.rotation.x = 0.65;

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 10), furMat);
    tail.position.set(0, 1.02, -0.95);
    tail.rotation.x = -1.1;

    const fl = makeQuadrupedLeg(-0.26, 0.52, furMat);
    const fr = makeQuadrupedLeg(0.26, 0.52, furMat);
    const bl = makeQuadrupedLeg(-0.26, -0.52, furMat);
    const br = makeQuadrupedLeg(0.26, -0.52, furMat);

    body.add(torso, saddle, neck, head, snout, collar, tail, fl, fr, bl, br);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, contactShadow, saddleMat };
  }

  if (mountId === 'cat') {
    const coatMat = makeAnimeRealMat({ color: 0xd97706, roughness: 0.65, rimColor: 0xfef08a, rimStrength: 0.42 });
    const maneMat = makeAnimeRealMat({ color: 0xfef08a, roughness: 0.7, rimStrength: 0.3 });
    const saddleMat = makeAnimeRealMat({ color: 0x4c1d95, roughness: 0.5, rimStrength: 0.25 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.2, 8, 14), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.96;
    torso.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 16), saddleMat);
    saddle.position.set(0, 1.33, -0.05);

    const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), maneMat);
    ruff.position.set(0, 1.24, 0.65);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), coatMat);
    head.position.set(0, 1.46, 0.95);
    head.castShadow = true;

    const lEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), coatMat);
    lEar.position.set(-0.18, 1.76, 0.9);
    lEar.rotation.z = 0.25;
    const rEar = lEar.clone();
    rEar.position.x = 0.18;
    rEar.rotation.z = -0.25;

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.15, 10), coatMat);
    tail.position.set(0, 1.12, -1.02);
    tail.rotation.x = -0.95;

    const fl = makeQuadrupedLeg(-0.24, 0.54, coatMat, 0.8);
    const fr = makeQuadrupedLeg(0.24, 0.54, coatMat, 0.8);
    const bl = makeQuadrupedLeg(-0.24, -0.54, coatMat, 0.8);
    const br = makeQuadrupedLeg(0.24, -0.54, coatMat, 0.8);

    body.add(torso, saddle, ruff, head, lEar, rEar, tail, fl, fr, bl, br);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, contactShadow, saddleMat };
  }

  if (mountId === 'stag') {
    const coatMat = makeAnimeRealMat({ color: 0x059669, roughness: 0.55, rimColor: 0x6ee7b7, rimStrength: 0.45 });
    const crystalMat = makeAnimeRealMat({ color: 0x6ee7b7, emissive: 0x10b981, emissiveIntensity: 1.5, clearcoat: 0.8 });
    const saddleMat = makeAnimeRealMat({ color: 0x78350f, roughness: 0.5, rimStrength: 0.2 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.18, 8, 14), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 1.08;
    torso.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 16), saddleMat);
    saddle.position.set(0, 1.44, -0.05);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 0.68, 12), coatMat);
    neck.position.set(0, 1.45, 0.72);
    neck.rotation.x = 0.32;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), coatMat);
    head.scale.set(0.85, 0.9, 1.3);
    head.position.set(0, 1.78, 0.96);

    const lAntler = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.68, 8), crystalMat);
    lAntler.position.set(-0.22, 2.22, 0.88);
    lAntler.rotation.z = 0.35;
    lAntler.rotation.x = -0.2;
    const rAntler = lAntler.clone();
    rAntler.position.x = 0.22;
    rAntler.rotation.z = -0.35;

    const fl = makeQuadrupedLeg(-0.24, 0.52, coatMat, 0.92);
    const fr = makeQuadrupedLeg(0.24, 0.52, coatMat, 0.92);
    const bl = makeQuadrupedLeg(-0.24, -0.52, coatMat, 0.92);
    const br = makeQuadrupedLeg(0.24, -0.52, coatMat, 0.92);

    body.add(torso, saddle, neck, head, lAntler, rAntler, fl, fr, bl, br);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, contactShadow, saddleMat };
  }

  if (mountId === 'pegasus') {
    const coatMat = makeAnimeRealMat({ color: 0xf8fafc, roughness: 0.35, clearcoat: 0.4, rimColor: 0x7dd3fc, rimStrength: 0.48 });
    const maneMat = makeAnimeRealMat({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.2 });
    const wingMat = makeAnimeRealMat({ color: 0xe0f2fe, emissive: 0x7dd3fc, emissiveIntensity: 0.45, side: THREE.DoubleSide });
    const saddleMat = makeAnimeRealMat({ color: 0x1d4ed8, roughness: 0.4, rimStrength: 0.3 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.25, 8, 14), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 1.05;
    torso.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.14, 16), saddleMat);
    saddle.position.set(0, 1.45, -0.05);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.72, 12), coatMat);
    neck.position.set(0, 1.44, 0.75);
    neck.rotation.x = 0.38;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), coatMat);
    head.scale.set(0.85, 0.9, 1.35);
    head.position.set(0, 1.78, 1.04);

    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 8), maneMat);
    horn.position.set(0, 2.02, 1.15);
    horn.rotation.x = 0.55;

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 10), maneMat);
    tail.rotation.x = -Math.PI * 0.42;
    tail.position.set(0, 0.96, -1.12);

    const { leftWing, rightWing } = makeWingPair(wingMat, 1.75, 1.38);
    const fl = makeQuadrupedLeg(-0.26, 0.56, coatMat, 0.88);
    const fr = makeQuadrupedLeg(0.26, 0.56, coatMat, 0.88);
    const bl = makeQuadrupedLeg(-0.26, -0.56, coatMat, 0.88);
    const br = makeQuadrupedLeg(0.26, -0.56, coatMat, 0.88);

    body.add(torso, saddle, neck, head, horn, tail, leftWing, rightWing, fl, fr, bl, br);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, leftWing, rightWing, contactShadow, saddleMat };
  }

  if (mountId === 'griffin') {
    const coatMat = makeAnimeRealMat({ color: 0xd97706, roughness: 0.5, rimColor: 0xfef08a, rimStrength: 0.42 });
    const featherMat = makeAnimeRealMat({ color: 0xf8fafc, roughness: 0.4, rimColor: 0x93c5fd, rimStrength: 0.45 });
    const beakMat = makeAnimeRealMat({ color: 0xfacc15, metalness: 0.4, roughness: 0.25 });
    const wingMat = makeAnimeRealMat({ color: 0xf1f5f9, side: THREE.DoubleSide, rimColor: 0x93c5fd, rimStrength: 0.35 });
    const saddleMat = makeAnimeRealMat({ color: 0x7c2d12, roughness: 0.5 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.2, 8, 14), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 1.04;
    torso.castShadow = true;

    const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.14, 16), saddleMat);
    saddle.position.set(0, 1.44, -0.05);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), featherMat);
    chest.position.set(0, 1.32, 0.64);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), featherMat);
    head.position.set(0, 1.66, 0.94);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 1.62, 1.24);

    const { leftWing, rightWing } = makeWingPair(wingMat, 1.8, 1.4);
    const fl = makeQuadrupedLeg(-0.28, 0.54, featherMat, 0.85);
    const fr = makeQuadrupedLeg(0.28, 0.54, featherMat, 0.85);
    const bl = makeQuadrupedLeg(-0.28, -0.54, coatMat, 0.85);
    const br = makeQuadrupedLeg(0.28, -0.54, coatMat, 0.85);

    body.add(torso, saddle, chest, head, beak, leftWing, rightWing, fl, fr, bl, br);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, leftWing, rightWing, contactShadow, saddleMat };
  }

  // Winged Dragon / Wyvern / Phoenix
  const isWyvern = mountId === 'wyvern';
  const isPhoenix = mountId === 'phoenix';

  const scaleMat = makeAnimeRealMat({
    color: isPhoenix ? 0xea580c : isWyvern ? 0x4c1d95 : 0x991b1b,
    roughness: 0.36,
    metalness: 0.28,
    rimColor: isPhoenix ? 0xfde047 : isWyvern ? 0xc084fc : 0xf97316,
    rimStrength: 0.48,
  });
  const emberMat = makeAnimeRealMat({
    color: isPhoenix ? 0xfef08a : isWyvern ? 0xd8b4fe : 0xf97316,
    emissive: isPhoenix ? 0xf59e0b : isWyvern ? 0x9333ea : 0xea580c,
    emissiveIntensity: 1.6,
  });
  const wingMat = makeAnimeRealMat({
    color: isPhoenix ? 0xf97316 : isWyvern ? 0x2e1065 : 0x450a0a,
    emissive: isPhoenix ? 0xd97706 : isWyvern ? 0x581c87 : 0x000000,
    emissiveIntensity: isPhoenix ? 0.55 : isWyvern ? 0.35 : 0,
    side: THREE.DoubleSide,
    rimColor: isPhoenix ? 0xfde047 : isWyvern ? 0xc084fc : 0xf97316,
    rimStrength: 0.32,
  });
  const saddleMat = makeAnimeRealMat({ color: 0x1e293b, roughness: 0.45, rimStrength: 0.25 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.3, 8, 14), scaleMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.y = 1.04;
  torso.castShadow = true;

  const saddle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.14, 16), saddleMat);
  saddle.position.set(0, 1.48, -0.05);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.65, 12), scaleMat);
  neck.position.set(0, 1.42, 0.82);
  neck.rotation.x = 0.55;

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.78, 10), scaleMat);
  head.rotation.x = Math.PI * 0.55;
  head.position.set(0, 1.72, 1.18);
  head.castShadow = true;

  const lHorn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 8), emberMat);
  lHorn.position.set(-0.18, 1.94, 0.98);
  lHorn.rotation.x = -0.5;
  lHorn.rotation.z = 0.3;
  const rHorn = lHorn.clone();
  rHorn.position.x = 0.18;
  rHorn.rotation.z = -0.3;

  const { leftWing, rightWing } = makeWingPair(wingMat, isPhoenix ? 1.95 : 1.75, 1.38);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.35, 10), isPhoenix ? emberMat : scaleMat);
  tail.rotation.x = -Math.PI * 0.45;
  tail.position.set(0, 0.92, -1.2);

  const fl = makeQuadrupedLeg(-0.32, 0.58, scaleMat, 0.85);
  const fr = makeQuadrupedLeg(0.32, 0.58, scaleMat, 0.85);
  const bl = makeQuadrupedLeg(-0.32, -0.58, scaleMat, 0.85);
  const br = makeQuadrupedLeg(0.32, -0.58, scaleMat, 0.85);

  body.add(torso, saddle, neck, head, lHorn, rHorn, leftWing, rightWing, tail, fl, fr, bl, br);
  addSubtleOutlines(body, 1.025);
  return { root, body, leftArm: fl, rightArm: fr, leftLeg: bl, rightLeg: br, leftWing, rightWing, contactShadow, saddleMat };
}

export function animateMountRig(
  rig: ArticulatedRig,
  _mountId: MountId,
  isMoving: boolean,
  time: number,
  jumpOffsetY: number,
  isFlying = false
) {
  const gallop = isFlying ? 0.55 : isMoving ? Math.sin(time * 13) * 0.65 : Math.sin(time * 2.5) * 0.05;
  const bob = isFlying
    ? Math.sin(time * 3.8) * 0.12
    : isMoving
      ? Math.abs(Math.sin(time * 13)) * 0.09
      : Math.sin(time * 2.5) * 0.03;
  rig.body.position.y = bob + jumpOffsetY;
  rig.body.rotation.x = isFlying ? (isMoving ? 0.18 : 0.06) : 0;
  rig.contactShadow.scale.setScalar(Math.max(0.35, 1 - jumpOffsetY * 0.14));

  if (rig.leftArm && rig.rightArm && rig.leftLeg && rig.rightLeg) {
    rig.leftArm.rotation.x = gallop;
    rig.rightArm.rotation.x = gallop * 0.92;
    rig.leftLeg.rotation.x = isFlying ? 0.65 : -gallop;
    rig.rightLeg.rotation.x = isFlying ? 0.65 : -gallop * 0.92;
  }

  if (rig.leftWing && rig.rightWing) {
    const flapSpeed = isFlying ? (isMoving ? 11.5 : 8.2) : isMoving || jumpOffsetY > 0.1 ? 10 : 3.2;
    const flapAmp = isFlying ? 0.65 : isMoving || jumpOffsetY > 0.1 ? 0.55 : 0.18;
    const flap = Math.sin(time * flapSpeed) * flapAmp;
    rig.leftWing.rotation.z = flap;
    rig.rightWing.rotation.z = -flap;
  }
}

export function createPetRig(petId: PetId): ArticulatedRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const contactShadow = makeContactShadow(0.45);
  root.add(contactShadow);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  if (petId === 'slime_pup') {
    const mat = makeAnimeRealMat({ color: 0x22c55e, transparent: true, opacity: 0.88, clearcoat: 0.9, rimColor: 0x86efac });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.68), mat);
    dome.position.y = 0.12;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), makeAnimeRealMat({ color: 0x86efac, emissive: 0x22c55e, emissiveIntensity: 1.5 }));
    core.position.y = 0.3;
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    lEye.position.set(-0.14, 0.3, 0.34);
    const rEye = lEye.clone();
    rEye.position.x = 0.14;
    body.add(dome, core, lEye, rEye);
    return { root, body, orbitAccessory: core, contactShadow };
  }

  if (petId === 'wisp' || petId === 'celestial_fairy') {
    const isFairy = petId === 'celestial_fairy';
    const coreMat = makeAnimeRealMat({
      color: isFairy ? 0xc084fc : 0xfbbf24,
      emissive: isFairy ? 0xa855f7 : 0xf59e0b,
      emissiveIntensity: 1.6,
    });
    const wingMat = makeAnimeRealMat({
      color: isFairy ? 0xf5d0fe : 0xfef08a,
      emissive: isFairy ? 0xd946ef : 0xfde047,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), coreMat);
    orb.position.y = 0.8;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 24), wingMat);
    halo.position.y = 0.8;

    const wingGeo = new THREE.PlaneGeometry(0.42, 0.28);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.22, 0.86, -0.05);
    const lw = new THREE.Mesh(wingGeo, wingMat);
    lw.position.x = -0.22;
    leftWing.add(lw);

    const rightWing = new THREE.Group();
    rightWing.position.set(0.22, 0.86, -0.05);
    const rw = new THREE.Mesh(wingGeo, wingMat);
    rw.position.x = 0.22;
    rightWing.add(rw);

    body.add(orb, halo, leftWing, rightWing);
    return { root, body, orbitAccessory: halo, leftWing, rightWing, contactShadow };
  }

  if (petId === 'owl' || petId === 'mini_drake') {
    const isDrake = petId === 'mini_drake';
    const bodyMat = makeAnimeRealMat({
      color: isDrake ? 0xef4444 : 0x38bdf8,
      roughness: 0.4,
      rimColor: isDrake ? 0xfb923c : 0xe0f2fe,
      rimStrength: 0.45,
    });
    const wingMat = makeAnimeRealMat({
      color: isDrake ? 0x991b1b : 0xe0f2fe,
      side: THREE.DoubleSide,
    });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), bodyMat);
    torso.scale.set(0.9, 1.15, 1.0);
    torso.position.y = 0.82;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), makeAnimeRealMat({ color: 0xfacc15 }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.92, 0.3);

    const wingGeo = new THREE.PlaneGeometry(0.55, 0.26);
    const leftWing = new THREE.Group();
    leftWing.position.set(-0.26, 0.88, 0);
    const lw = new THREE.Mesh(wingGeo, wingMat);
    lw.position.x = -0.26;
    leftWing.add(lw);

    const rightWing = new THREE.Group();
    rightWing.position.set(0.26, 0.88, 0);
    const rw = new THREE.Mesh(wingGeo, wingMat);
    rw.position.x = 0.26;
    rightWing.add(rw);

    body.add(torso, beak, leftWing, rightWing);
    addSubtleOutlines(body, 1.03);
    return { root, body, leftWing, rightWing, contactShadow };
  }

  // Quadruped pets: fox, ferret, spirit_wolf
  const colorMap: Record<string, number> = {
    fox: 0xf97316,
    ferret: 0xd97706,
    spirit_wolf: 0x6366f1,
  };
  const furMat = makeAnimeRealMat({
    color: colorMap[petId] || 0xf97316,
    roughness: 0.55,
    rimColor: 0xfef08a,
    rimStrength: 0.4,
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.46, 6, 12), furMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.y = 0.38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), furMat);
  head.position.set(0, 0.54, 0.34);
  const lEar = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), furMat);
  lEar.position.set(-0.11, 0.72, 0.32);
  const rEar = lEar.clone();
  rEar.position.x = 0.11;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 8), furMat);
  tail.position.set(0, 0.5, -0.45);
  tail.rotation.x = -1.0;

  body.add(torso, head, lEar, rEar, tail);
  addSubtleOutlines(body, 1.03);
  return { root, body, contactShadow };
}

export function animatePetRig(rig: ArticulatedRig, petId: PetId, isMoving: boolean, time: number) {
  if (petId === 'slime_pup') {
    const hop = Math.abs(Math.sin(time * (isMoving ? 10 : 4))) * 0.25;
    rig.body.position.y = hop;
    if (rig.orbitAccessory) rig.orbitAccessory.rotation.y = time * 3;
    return;
  }
  if (rig.leftWing && rig.rightWing) {
    rig.body.position.y = Math.sin(time * 4.5) * 0.16;
    const flap = Math.sin(time * (isMoving ? 14 : 9)) * 0.55;
    rig.leftWing.rotation.z = flap;
    rig.rightWing.rotation.z = -flap;
    if (rig.orbitAccessory) rig.orbitAccessory.rotation.y = time * 2.5;
    return;
  }
  rig.body.position.y = isMoving ? Math.abs(Math.sin(time * 12)) * 0.14 : Math.sin(time * 3) * 0.03;
}

export function createSummonRig(kind: 'wolf_spirit' | 'rune_sentinel'): ArticulatedRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const contactShadow = makeContactShadow(0.8);
  root.add(contactShadow);

  const mat = makeAnimeRealMat({
    color: kind === 'wolf_spirit' ? 0x38bdf8 : 0xc084fc,
    emissive: kind === 'wolf_spirit' ? 0x0284c7 : 0x9333ea,
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.88,
  });

  if (kind === 'wolf_spirit') {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 8, 12), mat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.75;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 10), mat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.96, 0.58);
    body.add(torso, head);
    return { root, body, contactShadow };
  }

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), mat);
  core.position.y = 1.4;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.06, 10, 24),
    makeAnimeRealMat({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 1.4 })
  );
  ring.position.y = 1.4;
  body.add(core, ring);
  return { root, body, orbitAccessory: ring, contactShadow };
}

export function createMonsterRig(kind: MonsterKind): ArticulatedRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const scaleMap: Record<MonsterKind, number> = {
    slime: 0.9,
    boar: 1.05,
    golem: 1.45,
    frost_wolf: 1.15,
    ice_golem: 1.55,
    frost_valkyrie: 1.15,
    stalker: 1.05,
    imp: 0.95,
    knight: 1.4,
    wyrmling: 1.25,
    boss_treant: 2.35,
    boss_frost: 2.45,
    boss_lich: 2.3,
    boss_wyrm: 2.6,
    boss_world_eclipse: 2.85,
  };
  const s = scaleMap[kind] || 1;
  const contactShadow = makeContactShadow(1.0 * s);
  root.add(contactShadow);

  const eyeMat = new THREE.MeshBasicMaterial({ color: kind.startsWith('boss_') ? 0xfde047 : 0xfef2f2 });

  if (kind === 'slime') {
    const outerMat = makeAnimeRealMat({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.85,
      roughness: 0.12,
      clearcoat: 0.9,
      rimColor: 0x86efac,
      rimStrength: 0.5,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), outerMat);
    dome.position.y = 0.2;
    dome.castShadow = true;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      makeAnimeRealMat({ color: 0x16a34a, emissive: 0x22c55e, emissiveIntensity: 1.2 })
    );
    core.position.y = 0.52;
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), eyeMat);
    lEye.position.set(-0.26, 0.56, 0.72);
    const rEye = lEye.clone();
    rEye.position.x = 0.26;
    body.add(dome, core, lEye, rEye);
    return { root, body, orbitAccessory: core, contactShadow };
  }

  if (kind === 'boar' || kind === 'frost_wolf') {
    const isWolf = kind === 'frost_wolf';
    const furMat = makeAnimeRealMat({
      color: isWolf ? 0x64748b : 0x78350f,
      roughness: 0.72,
      rimColor: isWolf ? 0x7dd3fc : 0xfdba74,
      rimStrength: 0.36,
    });
    const accentMat = makeAnimeRealMat({
      color: isWolf ? 0x7dd3fc : 0xfef3c7,
      emissive: isWolf ? 0x0284c7 : 0x000000,
      emissiveIntensity: isWolf ? 0.85 : 0,
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.9, 8, 12), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.82;
    torso.castShadow = true;
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 10), furMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.85, 0.95);
    const lTusk = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 8), accentMat);
    lTusk.position.set(-0.22, 0.92, 0.9);
    lTusk.rotation.x = 0.4;
    lTusk.rotation.z = 0.3;
    const rTusk = lTusk.clone();
    rTusk.position.x = 0.22;
    rTusk.rotation.z = -0.3;
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    lEye.position.set(-0.22, 0.98, 0.72);
    lEye.userData.skipOutline = true;
    const rEye = lEye.clone();
    rEye.position.x = 0.22;
    body.add(torso, snout, lTusk, rTusk, lEye, rEye);
    addSubtleOutlines(body, 1.025);
    return { root, body, contactShadow };
  }

  if (kind === 'golem' || kind === 'ice_golem' || kind === 'boss_treant') {
    const isIce = kind === 'ice_golem';
    const isTreant = kind === 'boss_treant';
    if (isTreant) body.scale.setScalar(2.15);
    else if (isIce) body.scale.setScalar(1.22);

    const bodyMat = makeAnimeRealMat({
      color: isTreant ? 0x452b19 : isIce ? 0x7dd3fc : 0x475569,
      roughness: isIce ? 0.18 : 0.82,
      clearcoat: isIce ? 0.8 : 0.05,
      rimColor: isTreant ? 0x4ade80 : isIce ? 0xe0f2fe : 0x94a3b8,
      rimStrength: 0.42,
    });
    const canopyMat = makeAnimeRealMat({
      color: isTreant ? 0x15803d : isIce ? 0x38bdf8 : 0x3f6212,
      roughness: 0.65,
    });
    const coreMat = makeAnimeRealMat({
      color: isTreant ? 0x34d399 : isIce ? 0xbae6fd : 0xf59e0b,
      emissive: isTreant ? 0x10b981 : isIce ? 0x0284c7 : 0xd97706,
      emissiveIntensity: 1.7,
    });

    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.84, 1), bodyMat);
    torso.position.y = 1.65;
    torso.castShadow = true;
    const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), coreMat);
    chestCore.position.set(0, 1.68, 0.72);
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.54, 1), canopyMat);
    crown.position.y = 2.52;
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 8, 12), bodyMat);
    leftArm.position.set(-1.08, 1.48, 0.12);
    leftArm.castShadow = true;
    const rightArm = leftArm.clone();
    rightArm.position.x = 1.08;
    const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.52, 8, 10), bodyMat);
    lLeg.position.set(-0.42, 0.44, 0);
    const rLeg = lLeg.clone();
    rLeg.position.x = 0.42;
    body.add(torso, chestCore, crown, leftArm, rightArm, lLeg, rLeg);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm, rightArm, orbitAccessory: chestCore, contactShadow };
  }

  if (kind === 'stalker' || kind === 'knight' || kind === 'boss_frost' || kind === 'boss_lich' || kind === 'frost_valkyrie') {
    const isBossFrost = kind === 'boss_frost';
    const isBossLich = kind === 'boss_lich';
    const isKnight = kind === 'knight';
    const isValk = kind === 'frost_valkyrie';

    const boneOrArmorMat = makeAnimeRealMat({
      color: isBossFrost ? 0x0284c7 : isBossLich ? 0x3b0764 : isValk ? 0xe0f2fe : isKnight ? 0x1e1b4b : 0xcbd5e1,
      roughness: isBossFrost ? 0.18 : 0.4,
      metalness: isKnight ? 0.75 : 0.35,
      clearcoat: isBossFrost ? 0.85 : 0.25,
      rimColor: isBossFrost || isValk ? 0x7dd3fc : isBossLich ? 0xc084fc : isKnight ? 0x818cf8 : 0xfca5a5,
      rimStrength: 0.48,
    });
    const trimMat = makeAnimeRealMat({
      color: isBossFrost || isValk ? 0x38bdf8 : isBossLich ? 0xc084fc : isKnight ? 0x818cf8 : 0xdc2626,
      emissive: isBossFrost || isValk ? 0x0284c7 : isBossLich ? 0x9333ea : isKnight ? 0x4f46e5 : 0x991b1b,
      emissiveIntensity: 1.25,
    });

    const scale = isBossFrost ? 2.25 : isBossLich ? 2.15 : isKnight ? 1.45 : isValk ? 1.1 : 1.05;
    body.scale.setScalar(scale);

    const torso = new THREE.Mesh(createSculptedTorsoGeo(), boneOrArmorMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), boneOrArmorMat);
    head.position.y = 1.95;
    const lHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.48, 10), trimMat);
    lHorn.position.set(-0.22, 2.24, 0);
    lHorn.rotation.z = 0.45;
    const rHorn = lHorn.clone();
    rHorn.position.x = 0.22;
    rHorn.rotation.z = -0.45;
    const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), trimMat);
    lEye.position.set(-0.1, 1.98, 0.24);
    lEye.userData.skipOutline = true;
    const rEye = lEye.clone();
    rEye.position.x = 0.1;

    const rightArm = new THREE.Group();
    rightArm.position.set(0.46, 1.55, 0);
    const blade = new THREE.Mesh(createSculptedBladeGeo(1.45, 0.11), trimMat);
    blade.position.set(0, 0.15, 0.35);
    blade.rotation.x = Math.PI * 0.42;
    rightArm.add(blade);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.46, 1.55, 0);
    const offhand = new THREE.Mesh(createSculptedBladeGeo(0.95, 0.08), trimMat);
    offhand.position.set(0, 0.05, 0.3);
    offhand.rotation.x = Math.PI * 0.4;
    leftArm.add(offhand);

    const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.56, 6, 10), boneOrArmorMat);
    lLeg.position.set(-0.2, 0.44, 0);
    const rLeg = lLeg.clone();
    rLeg.position.x = 0.2;

    body.add(torso, head, lHorn, rHorn, lEye, rEye, rightArm, leftArm, lLeg, rLeg);
    addSubtleOutlines(body, 1.025);
    return { root, body, leftArm, rightArm, leftLeg: lLeg, rightLeg: rLeg, contactShadow };
  }

  // Imp / Wyrmling / Boss Wyrm / Eclipse Sovereign World Boss
  const isBoss = kind === 'boss_wyrm';
  const isWorldBoss = kind === 'boss_world_eclipse';
  const isImp = kind === 'imp';
  const scaleMat = makeAnimeRealMat({
    color: isWorldBoss ? 0x1e1b4b : isBoss ? 0x7f1d1d : isImp ? 0xea580c : 0xb91c1c,
    roughness: 0.34,
    metalness: isWorldBoss ? 0.55 : 0.25,
    rimColor: isWorldBoss ? 0xfde047 : 0xfdba74,
    rimStrength: isWorldBoss ? 0.65 : 0.48,
  });
  const bellyMat = makeAnimeRealMat({
    color: isWorldBoss ? 0xfde047 : 0xf97316,
    emissive: isWorldBoss ? 0xf59e0b : 0xea580c,
    emissiveIntensity: isWorldBoss ? 1.85 : isBoss ? 1.5 : 1.0,
  });
  const wingMat = makeAnimeRealMat({
    color: isWorldBoss ? 0x4c1d95 : isBoss ? 0x450a0a : 0x7c2d12,
    emissive: isWorldBoss ? 0x7e22ce : 0x000000,
    emissiveIntensity: isWorldBoss ? 0.45 : 0,
    side: THREE.DoubleSide,
    rimColor: isWorldBoss ? 0xfde047 : 0xf97316,
    rimStrength: 0.32,
  });

  const rigScale = isWorldBoss ? 2.72 : isBoss ? 2.45 : isImp ? 0.88 : 1.2;
  body.scale.setScalar(rigScale);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.88, 8, 14), scaleMat);
  torso.position.y = 1.45;
  torso.rotation.x = 0.35;
  torso.castShadow = true;

  const chestGlow = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), bellyMat);
  chestGlow.position.set(0, 1.38, 0.28);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.85, 10), scaleMat);
  head.rotation.x = Math.PI * 0.55;
  head.position.set(0, 2.02, 0.68);
  head.castShadow = true;

  const lHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 8), bellyMat);
  lHorn.position.set(-0.22, 2.34, 0.45);
  lHorn.rotation.x = -0.5;
  lHorn.rotation.z = 0.3;
  const rHorn = lHorn.clone();
  rHorn.position.x = 0.22;
  rHorn.rotation.z = -0.3;

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(1.5, 0.85);
  wingShape.lineTo(1.8, -0.35);
  wingShape.lineTo(0.95, -0.2);
  wingShape.lineTo(0.45, -0.65);
  wingShape.closePath();
  const wingGeo = new THREE.ShapeGeometry(wingShape);

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.32, 1.72, -0.1);
  const lWingMesh = new THREE.Mesh(wingGeo, wingMat);
  lWingMesh.rotation.y = Math.PI;
  lWingMesh.rotation.x = -0.3;
  lWingMesh.castShadow = true;
  leftWing.add(lWingMesh);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.32, 1.72, -0.1);
  const rWingMesh = new THREE.Mesh(wingGeo, wingMat);
  rWingMesh.rotation.x = -0.3;
  rWingMesh.castShadow = true;
  rightWing.add(rWingMesh);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.45, 10), scaleMat);
  tail.rotation.x = -Math.PI * 0.42;
  tail.position.set(0, 0.85, -0.95);

  const lEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  lEye.position.set(-0.16, 2.08, 0.85);
  lEye.userData.skipOutline = true;
  const rEye = lEye.clone();
  rEye.position.x = 0.16;

  let orbitAccessory: THREE.Object3D | undefined;
  if (isWorldBoss) {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 10, 32), bellyMat);
    halo.position.set(0, 1.85, -0.2);
    halo.userData.skipOutline = true;
    body.add(halo);
    orbitAccessory = halo;
  }

  body.add(torso, chestGlow, head, lHorn, rHorn, lEye, rEye, leftWing, rightWing, tail);
  addSubtleOutlines(body, 1.025);
  return { root, body, leftWing, rightWing, orbitAccessory, contactShadow };
}

export function animateMonsterRig(
  rig: ArticulatedRig,
  kind: MonsterKind,
  isMoving: boolean,
  aiState: string,
  windupProgress: number,
  time: number
) {
  if (kind === 'slime') {
    const hop = isMoving ? Math.abs(Math.sin(time * 7)) * 0.45 : Math.abs(Math.sin(time * 3)) * 0.15;
    rig.body.position.y = hop;
    const squash = 1 - hop * 0.25;
    rig.body.scale.set(1 + hop * 0.2, squash, 1 + hop * 0.2);
    if (rig.orbitAccessory) rig.orbitAccessory.rotation.y = time * 2;
    return;
  }

  if (rig.leftWing && rig.rightWing) {
    const flapSpeed = aiState === 'windup' ? 14 : 6.5;
    const flapAmp = aiState === 'windup' ? 0.65 : 0.42;
    const flap = Math.sin(time * flapSpeed) * flapAmp;
    rig.leftWing.rotation.z = flap;
    rig.rightWing.rotation.z = -flap;
    rig.body.position.y = Math.sin(time * 3.5) * 0.25 + (aiState === 'windup' ? windupProgress * 0.65 : 0);
    if (rig.orbitAccessory) {
      rig.orbitAccessory.rotation.z = time * 1.4;
    }
  } else {
    const stride = isMoving ? Math.sin(time * 9) * 0.55 : 0;
    rig.body.position.y = isMoving ? Math.abs(Math.sin(time * 9)) * 0.12 : 0;
    if (rig.leftLeg && rig.rightLeg) {
      rig.leftLeg.rotation.x = stride;
      rig.rightLeg.rotation.x = -stride;
    }
    if (rig.leftArm && rig.rightArm) {
      if (aiState === 'windup') {
        rig.rightArm.rotation.x = -windupProgress * 2.1;
        rig.leftArm.rotation.x = -windupProgress * 1.4;
      } else {
        rig.rightArm.rotation.x = stride * 0.7;
        rig.leftArm.rotation.x = -stride * 0.7;
      }
    }
  }
}

export function createObstacleProp(
  kind: 'tree' | 'pillar' | 'boulder' | 'shrine' | 'ice_crystal',
  radiusWorld: number
): THREE.Group {
  const group = new THREE.Group();
  const r = radiusWorld * 0.1;

  if (kind === 'tree') {
    const trunkMat = makeAnimeRealMat({ color: 0x4a3222, roughness: 0.85, rimStrength: 0.12 });
    const leafMat1 = makeAnimeRealMat({ color: 0x1e5631, roughness: 0.65, rimColor: 0x86efac, rimStrength: 0.25 });
    const leafMat2 = makeAnimeRealMat({ color: 0x2e7d47, roughness: 0.6, rimColor: 0x86efac, rimStrength: 0.3 });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.36, r * 1.6, 12), trunkMat);
    trunk.position.y = r * 0.8;
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(r * 1.05, r * 1.65, 14), leafMat1);
    cone1.position.y = r * 1.95;
    cone1.castShadow = true;
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.82, r * 1.45, 14), leafMat2);
    cone2.position.y = r * 2.85;
    cone2.castShadow = true;
    const cone3 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 1.15, 12), leafMat2);
    cone3.position.y = r * 3.65;
    cone3.castShadow = true;

    group.add(trunk, cone1, cone2, cone3);
    addSubtleOutlines(group, 1.02);
    return group;
  }

  if (kind === 'ice_crystal') {
    const iceMat = makeAnimeRealMat({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      clearcoat: 0.95,
      transparent: true,
      opacity: 0.88,
      rimColor: 0xe0f2fe,
      rimStrength: 0.6,
    });
    const spire1 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, r * 3.8, 6), iceMat);
    spire1.position.y = r * 1.8;
    spire1.castShadow = true;
    const spire2 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, r * 2.6, 6), iceMat);
    spire2.position.set(r * 0.55, r * 1.2, r * 0.3);
    spire2.rotation.z = -0.35;
    const spire3 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, r * 2.1, 6), iceMat);
    spire3.position.set(-r * 0.5, r * 1.0, -r * 0.25);
    spire3.rotation.z = 0.3;
    group.add(spire1, spire2, spire3);
    return group;
  }

  if (kind === 'pillar' || kind === 'shrine') {
    const isShrine = kind === 'shrine';
    const stoneMat = makeAnimeRealMat({
      color: isShrine ? 0x64748b : 0x474157,
      roughness: 0.65,
      rimColor: isShrine ? 0x6ee7b7 : 0xc084fc,
      rimStrength: 0.25,
    });
    const runeMat = makeAnimeRealMat({
      color: isShrine ? 0x34d399 : 0xa855f7,
      emissive: isShrine ? 0x10b981 : 0x9333ea,
      emissiveIntensity: 1.6,
    });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 1.05, 0.8, 14), stoneMat);
    plinth.position.y = 0.4;
    plinth.castShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.65, r * 0.75, isShrine ? 4.4 : 3.4, 14), stoneMat);
    shaft.position.y = isShrine ? 2.6 : 2.1;
    shaft.castShadow = true;
    const cap = new THREE.Mesh(new THREE.TorusGeometry(r * 0.68, 0.16, 10, 20), runeMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = isShrine ? 4.2 : 3.2;

    group.add(plinth, shaft, cap);
    addSubtleOutlines(group, 1.02);
    return group;
  }

  const rockMat = makeAnimeRealMat({ color: 0x2b1d20, roughness: 0.8, rimColor: 0xf87171, rimStrength: 0.28 });
  const magmaMat = makeAnimeRealMat({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.6 });
  const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 1.0, 1), rockMat);
  mainRock.position.y = r * 0.68;
  mainRock.scale.set(1.0, 1.35, 0.9);
  mainRock.castShadow = true;
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(r * 0.42, 0), magmaMat);
  crystal.position.set(r * 0.35, r * 1.1, r * 0.25);
  group.add(mainRock, crystal);
  addSubtleOutlines(group, 1.02);
  return group;
}

export function createSanctuaryFountain(): { group: THREE.Group; crystal: THREE.Mesh; ring: THREE.Mesh } {
  const group = new THREE.Group();
  const marbleMat = makeAnimeRealMat({ color: 0x94a3b8, roughness: 0.35, clearcoat: 0.35, rimStrength: 0.2 });
  const goldMat = makeAnimeRealMat({ color: 0xd99b26, metalness: 0.8, roughness: 0.22, rimColor: 0xfef08a, rimStrength: 0.45 });
  const waterMat = makeAnimeRealMat({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.15,
    transparent: true,
    opacity: 0.85,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.6, 28), marbleMat);
  base.position.y = 0.3;
  base.receiveShadow = true;
  base.castShadow = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.28, 12, 32), goldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.65;

  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.15, 32), waterMat);
  water.position.y = 0.58;

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 2.4, 14), marbleMat);
  spire.position.y = 1.6;
  spire.castShadow = true;

  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.95, 0),
    makeAnimeRealMat({ color: 0x6ee7b7, emissive: 0x10b981, emissiveIntensity: 1.8, clearcoat: 0.8 })
  );
  crystal.position.y = 3.85;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 10, 32), goldMat);
  ring.position.y = 3.85;

  group.add(base, rim, water, spire, crystal, ring);
  group.traverse((o) => {
    o.userData.interactKind = 'fountain';
  });
  return { group, crystal, ring };
}

export function createQuartermasterNpc(): THREE.Group {
  const group = new THREE.Group();
  const rig = createHeroRig('warrior', false);
  rig.root.remove(rig.root.children[rig.root.children.length - 1]);
  rig.root.remove(rig.root.children[rig.root.children.length - 1]);
  group.add(rig.root);

  const ironMat = makeAnimeRealMat({ color: 0x334155, metalness: 0.75, roughness: 0.4, rimStrength: 0.25 });
  const emberMat = makeAnimeRealMat({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.8 });

  const anvilBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.58, 0.65, 10), ironMat);
  anvilBase.position.set(-1.9, 0.32, 0.4);
  anvilBase.castShadow = true;
  const anvilTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 0.3, 8), ironMat);
  anvilTop.position.set(-1.9, 0.78, 0.4);
  anvilTop.castShadow = true;

  const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.45, 0.7, 12), ironMat);
  brazier.position.set(-2.2, 0.35, -1.2);
  const coals = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), emberMat);
  coals.position.set(-2.2, 0.72, -1.2);

  group.add(anvilBase, anvilTop, brazier, coals);
  group.traverse((o) => {
    o.userData.interactKind = 'quartermaster';
  });
  return group;
}

export function createQuestNpc(
  heroClass: HeroClass = 'healer',
  beaconColor = 0xfde047,
  npcId?: string
): { group: THREE.Group; beacon: THREE.Mesh } {
  const group = new THREE.Group();
  const rig = createHeroRig(heroClass, false);
  rig.root.remove(rig.root.children[rig.root.children.length - 1]);
  rig.root.remove(rig.root.children[rig.root.children.length - 1]);
  group.add(rig.root);

  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    makeAnimeRealMat({ color: beaconColor, emissive: beaconColor, emissiveIntensity: 1.8 })
  );
  beacon.position.y = 2.85;
  group.add(beacon);

  group.traverse((o) => {
    o.userData.interactKind = 'npc';
    if (npcId) o.userData.npcId = npcId;
  });

  return { group, beacon };
}
