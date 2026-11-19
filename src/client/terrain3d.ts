import * as THREE from 'three';
import { WORLD_ZONES } from '../data/zonesData';
import {
  SANCTUARY_CENTER,
  WORLD_HEIGHT,
  WORLD_SCALE,
  WORLD_WIDTH,
  getTerrainHeight,
  getZoneAt,
} from '../shared/gameTypes';
import type { ZoneId } from '../shared/gameTypes';
import type { GraphicsQuality } from './settingsStorage';
import type { SkyUniforms } from './weatherController';

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function createGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#dde2e9';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1.5 + Math.random() * 4;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.07)';
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 44);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSkyDome(): { mesh: THREE.Mesh; uniforms: SkyUniforms } {
  const uniforms: SkyUniforms = {
    uTime: { value: 0 },
    uTopColor: { value: new THREE.Color(0x3b82f6) },
    uHorizonColor: { value: new THREE.Color(0xa5d8ff) },
    uSunDir: { value: new THREE.Vector3(0.45, 0.52, 0.72).normalize() },
  };

  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y * 1.15, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.62));

        if (dir.y > 0.04) {
          vec2 uv = dir.xz / (dir.y + 0.28) * 1.8 + vec2(uTime * 0.02, uTime * 0.008);
          float n = noise(uv) * 0.65 + noise(uv * 2.2) * 0.35;
          float cloudMask = smoothstep(0.56, 0.68, n) * smoothstep(0.04, 0.25, dir.y);
          vec3 cloudCol = mix(uHorizonColor, vec3(1.0, 0.99, 0.96), 0.78);
          col = mix(col, cloudCol, cloudMask * 0.65);
        }

        float sunAmt = max(dot(dir, uSunDir), 0.0);
        col += vec3(1.0, 0.88, 0.68) * pow(sunAmt, 24.0) * 0.55;
        col += vec3(1.0, 0.96, 0.88) * smoothstep(0.997, 0.9992, sunAmt) * 0.95;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const skyGeo = new THREE.SphereGeometry(380, 24, 16);
  const mesh = new THREE.Mesh(skyGeo, skyMat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function createAnimatedLavaMaterial(uTime: { value: number }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 7.5;
        float wave = sin(p.x + uTime * 1.3) * cos(p.y - uTime * 1.1) + sin((p.x + p.y) * 1.6 - uTime * 1.8) * 0.5;
        float glow = smoothstep(-0.2, 0.85, wave);
        vec3 crust = vec3(0.28, 0.07, 0.05);
        vec3 magma = vec3(1.45, 0.42, 0.08);
        vec3 hot = vec3(1.9, 1.25, 0.25);
        vec3 col = mix(crust, magma, glow);
        col = mix(col, hot, smoothstep(0.7, 1.0, glow));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

export interface ZoneBarrierVisual {
  zoneId: ZoneId;
  group: THREE.Group;
  curtain: THREE.Mesh;
  runeMat: THREE.MeshStandardMaterial;
}

export interface TerrainSystem {
  skyUniforms: SkyUniforms;
  update: (elapsed: number, centerX: number, centerZ: number) => void;
  updateBarriers: (unlockedZones: ZoneId[]) => void;
  setQuality: (quality: GraphicsQuality) => void;
  dispose: () => void;
}

export function createOpenWorldEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number
): TerrainSystem {
  const disposables: Array<{ dispose: () => void }> = [];
  const uSharedTime = { value: 0 };

  // 1. Soft-gradient Anime Sky Dome
  const { mesh: skyMesh, uniforms: skyUniforms } = createSkyDome();
  scene.add(skyMesh);
  disposables.push(skyMesh.geometry, skyMesh.material as THREE.Material);

  // 2. Non-linear Branching Open-World Heightfield (3600x3200 -> 360m x 320m)
  const spanX = 480;
  const spanZ = 440;
  const segX = 180;
  const segZ = 160;

  const geo = new THREE.PlaneGeometry(spanX, spanZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const centerX = (WORLD_WIDTH * WORLD_SCALE) / 2;
  const centerZ = (WORLD_HEIGHT * WORLD_SCALE) / 2;
  geo.translate(centerX, 0, centerZ);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cTmp = new THREE.Color();

  const cSanctuary = new THREE.Color(0x748294);
  const cSanctuaryGold = new THREE.Color(0xb29a62);
  const cWoods = new THREE.Color(0x3a8248);
  const cWoodsLush = new THREE.Color(0x55a85f);
  const cRiver = new THREE.Color(0x2d8bb8);
  const cSnow = new THREE.Color(0xdbeafe);
  const cSnowDeep = new THREE.Color(0x93c5fd);
  const cCrucible = new THREE.Color(0x31234a);
  const cRoad = new THREE.Color(0x9b8967);
  const cRuins = new THREE.Color(0x4a435c);
  const cCaldera = new THREE.Color(0x3a2024);
  const cMagma = new THREE.Color(0x882419);
  const cMountain = new THREE.Color(0x28323e);

  const sx = SANCTUARY_CENTER.x;
  const sy = SANCTUARY_CENTER.y;

  const roadDist = (wx: number, wy: number) => {
    const wobble = Math.sin(wx * 0.008 + wy * 0.007) * 32;
    const dWoods = distToSegment(wx + wobble, wy, sx, sy, 540, 980);
    const dHighlands = distToSegment(wx + wobble, wy, sx, sy, 1960, 420);
    const dCrucible = distToSegment(wx, wy + wobble, sx, sy, 2660, 640);
    const dRuins = distToSegment(wx + wobble, wy, sx, sy, 980, 2780);
    const dCaldera = distToSegment(wx, wy + wobble, sx, sy, 3040, 2340);
    return Math.min(dWoods, dHighlands, dCrucible, dRuins, dCaldera);
  };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const wx = x / WORLD_SCALE;
    const wy = z / WORLD_SCALE;

    let h = getTerrainHeight(wx, wy);

    const outX = Math.max(0, -x, x - WORLD_WIDTH * WORLD_SCALE);
    const outZ = Math.max(0, -z, z - WORLD_HEIGHT * WORLD_SCALE);
    const outDist = Math.hypot(outX, outZ);
    if (outDist > 0) {
      const ridgeNoise = Math.sin(x * 0.14) * Math.cos(z * 0.14) * 3.5 + Math.cos(x * 0.06) * 2.2;
      h += Math.min(26, outDist * 0.42) + Math.max(0, ridgeNoise);
    }

    // Winding shallow stream curving across Whispering Woods
    const streamCenterX = 940 + Math.sin(wy * 0.0045) * 145;
    const inStream = outDist <= 1 && wx < 1380 && wy > 550 && wy < 2050 && Math.abs(wx - streamCenterX) < 42;
    if (inStream && roadDist(wx, wy) > 58) {
      h -= 0.42;
    }

    pos.setY(i, h);

    if (outDist > 4) {
      cTmp.copy(cMountain);
    } else {
      const zoneId = getZoneAt(wx, wy).id;
      if (zoneId === 'sanctuary') {
        const dPlaza = Math.hypot(wx - sx, wy - sy);
        cTmp.copy(dPlaza < 210 ? cSanctuaryGold : cSanctuary);
      } else if (zoneId === 'woods') {
        const n = (Math.sin(x * 0.25) + Math.cos(z * 0.25)) * 0.5 + 0.5;
        cTmp.copy(cWoods).lerp(cWoodsLush, n * 0.65);
        if (inStream && roadDist(wx, wy) > 58) {
          cTmp.lerp(cRiver, 0.72);
        }
      } else if (zoneId === 'highlands') {
        const dCrucible = Math.hypot(wx - 2660, wy - 640);
        if (dCrucible < 220) {
          cTmp.copy(cCrucible);
        } else {
          const n = (Math.sin(x * 0.18) + Math.cos(z * 0.22)) * 0.5 + 0.5;
          cTmp.copy(cSnow).lerp(cSnowDeep, n * 0.42);
        }
      } else if (zoneId === 'ruins') {
        cTmp.copy(cRuins);
      } else {
        const dCal = Math.hypot(wx - 3040, wy - 2340);
        cTmp.copy(dCal < 220 ? cMagma : cCaldera);
      }

      const dRoad = roadDist(wx, wy);
      if (dRoad < 66 && Math.hypot(wx - sx, wy - sy) > 190) {
        const roadBlend = 1 - dRoad / 66;
        cTmp.lerp(cRoad, zoneId === 'highlands' ? roadBlend * 0.42 : roadBlend * 0.65);
      }
    }

    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const groundTex = createGroundTexture(maxAnisotropy);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(geo, groundMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  disposables.push(geo, groundTex, groundMat);

  // 3. Animated Caldera Magma Lake (centered at wx=3040, wy=2340 -> x=304, z=234)
  const lavaGeo = new THREE.CircleGeometry(21, 24);
  lavaGeo.rotateX(-Math.PI / 2);
  const lavaMat = createAnimatedLavaMaterial(uSharedTime);
  const lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
  lavaMesh.position.set(304, -1.28, 234);
  scene.add(lavaMesh);
  disposables.push(lavaGeo, lavaMat);

  // 3b. Frozen Highland Glacier Mirror Pond
  const icePondGeo = new THREE.CircleGeometry(14, 24);
  icePondGeo.rotateX(-Math.PI / 2);
  const icePondMat = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.85,
  });
  const icePond = new THREE.Mesh(icePondGeo, icePondMat);
  icePond.position.set(205, getTerrainHeight(2050, 620) + 0.14, 62);
  scene.add(icePond);
  disposables.push(icePondGeo, icePondMat);

  // 3c. Eclipse Crucible Ritual Altar Ring (World Boss Arena at 2660, 640)
  const crucibleGeo = new THREE.RingGeometry(15.5, 17.2, 36);
  crucibleGeo.rotateX(-Math.PI / 2);
  const crucibleMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crucibleRing = new THREE.Mesh(crucibleGeo, crucibleMat);
  crucibleRing.position.set(266, getTerrainHeight(2660, 640) + 0.12, 64);
  scene.add(crucibleRing);
  disposables.push(crucibleGeo, crucibleMat);

  // 4. Non-Linear Zone Barrier Gates
  const barriers: ZoneBarrierVisual[] = [];
  for (const zDef of WORLD_ZONES) {
    if (zDef.unlockedByDefault) continue;
    const bx = zDef.gateX * WORLD_SCALE;
    const bz = zDef.gateY * WORLD_SCALE;
    const by = getTerrainHeight(zDef.gateX, zDef.gateY);

    const grp = new THREE.Group();
    grp.position.set(bx, by, bz);
    grp.rotation.y = zDef.gateAngle;

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.4 });
    const runeMat = new THREE.MeshStandardMaterial({
      color: zDef.barrierColorHex,
      emissive: zDef.barrierColorHex,
      emissiveIntensity: 1.6,
    });

    const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 8.5, 10), pillarMat);
    pLeft.position.set(0, 4.2, -16);
    const pRight = pLeft.clone();
    pRight.position.z = 16;

    const orbLeft = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), runeMat);
    orbLeft.position.set(0, 9.2, -16);
    const orbRight = orbLeft.clone();
    orbRight.position.z = 16;

    const curtainGeo = new THREE.PlaneGeometry(34, 10);
    curtainGeo.rotateY(Math.PI / 2);
    const curtainMat = new THREE.MeshBasicMaterial({
      color: zDef.barrierColorHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(0, 4.5, 0);

    grp.add(pLeft, pRight, orbLeft, orbRight, curtain);
    scene.add(grp);
    disposables.push(pLeft.geometry, orbLeft.geometry, curtainGeo, pillarMat, runeMat, curtainMat);
    barriers.push({ zoneId: zDef.id, group: grp, curtain, runeMat });
  }

  // 5. GPU-Animated Wind-Swaying Instanced Grass (Whispering Woods)
  const grassCount = 1350;
  const grassGeo = new THREE.ConeGeometry(0.18, 0.72, 4);
  grassGeo.translate(0, 0.36, 0);
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4ca35a,
    roughness: 0.85,
  });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uSharedTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float sway = sin(uTime * 2.4 + position.y * 2.0 + instanceMatrix[3][0] * 0.45 + instanceMatrix[3][2] * 0.35) * 0.14 * max(0.0, position.y);
      transformed.x += sway;
      transformed.z += sway * 0.5;
      `
    );
  };

  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  grassInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const grassColor = new THREE.Color();
  let placed = 0;
  let attempts = 0;
  while (placed < grassCount && attempts < grassCount * 5) {
    attempts++;
    const wx = 260 + Math.random() * 1150;
    const wy = 480 + Math.random() * 1550;
    if (getZoneAt(wx, wy).id !== 'woods') continue;
    if (roadDist(wx, wy) < 62) continue;
    const x = wx * WORLD_SCALE;
    const z = wy * WORLD_SCALE;
    const y = getTerrainHeight(wx, wy);

    dummy.position.set(x, y - 0.04, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const sc = 0.7 + Math.random() * 0.85;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    grassInst.setMatrixAt(placed, dummy.matrix);
    grassColor.setHSL(0.32 + Math.random() * 0.05, 0.48, 0.42 + Math.random() * 0.14);
    grassInst.setColorAt(placed, grassColor);
    placed++;
  }
  grassInst.count = placed;
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  scene.add(grassInst);
  disposables.push(grassGeo, grassMat);

  // 6. Batched Distant Perimeter Pines
  const treeCount = 160;
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e3629, roughness: 0.9 });
  const foliageGeo = new THREE.ConeGeometry(1.75, 4.6, 8);
  foliageGeo.translate(0, 4.2, 0);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x24563a, roughness: 0.8 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  const worldW = WORLD_WIDTH * WORLD_SCALE;
  const worldH = WORLD_HEIGHT * WORLD_SCALE;
  for (let i = 0; i < treeCount; i++) {
    const side = i % 4;
    let x = 0;
    let z = 0;
    if (side === 0) {
      x = -45 + Math.random() * 35;
      z = -25 + Math.random() * (worldH + 50);
    } else if (side === 1) {
      x = worldW + 8 + Math.random() * 35;
      z = -25 + Math.random() * (worldH + 50);
    } else if (side === 2) {
      x = -25 + Math.random() * (worldW + 50);
      z = -45 + Math.random() * 32;
    } else {
      x = -25 + Math.random() * (worldW + 50);
      z = worldH + 8 + Math.random() * 32;
    }

    const wx = x / WORLD_SCALE;
    const wy = z / WORLD_SCALE;
    const outX = Math.max(0, -x, x - worldW);
    const outZ = Math.max(0, -z, z - worldH);
    const outDist = Math.hypot(outX, outZ);
    const h =
      getTerrainHeight(wx, wy) +
      (outDist > 0
        ? Math.min(26, outDist * 0.42) +
          Math.max(0, Math.sin(x * 0.14) * Math.cos(z * 0.14) * 3.5 + Math.cos(x * 0.06) * 2.2)
        : 0);

    dummy.position.set(x, h - 0.2, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.85 + Math.random() * 0.7;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    foliage.setMatrixAt(i, dummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;
  scene.add(trunks, foliage);
  disposables.push(trunkGeo, trunkMat, foliageGeo, foliageMat);

  return {
    skyUniforms,
    update(elapsed: number, camCenterX: number, camCenterZ: number) {
      uSharedTime.value = elapsed;
      skyUniforms.uTime.value = elapsed;
      skyMesh.position.set(camCenterX, 0, camCenterZ);
      for (const b of barriers) {
        if (b.curtain.visible) {
          const mat = b.curtain.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.18 + Math.sin(elapsed * 3.2) * 0.06;
        }
      }
    },
    updateBarriers(unlockedZones: ZoneId[]) {
      const set = new Set(unlockedZones);
      for (const b of barriers) {
        const unlocked = set.has(b.zoneId);
        b.curtain.visible = !unlocked;
        if (unlocked) {
          b.runeMat.color.setHex(0x10b981);
          b.runeMat.emissive.setHex(0x10b981);
        } else {
          const zDef = WORLD_ZONES.find((z) => z.id === b.zoneId);
          const col = zDef?.barrierColorHex || 0x38bdf8;
          b.runeMat.color.setHex(col);
          b.runeMat.emissive.setHex(col);
        }
      }
    },
    setQuality(quality: GraphicsQuality) {
      if (quality === 'low') {
        grassInst.count = Math.floor(placed * 0.35);
      } else if (quality === 'medium') {
        grassInst.count = Math.floor(placed * 0.7);
      } else {
        grassInst.count = placed;
      }
      grassInst.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
