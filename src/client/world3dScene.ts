import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MOUNTS_DATA } from '../data/mountsData';
import { NPCS_DATA, QUEST_LIST } from '../data/questsData';
import {
  DEFAULT_UNLOCKED_ZONES,
  QUARTERMASTER_NPC,
  SANCTUARY_CENTER,
  SANCTUARY_FOUNTAIN,
  WORLD_OBSTACLES,
  WORLD_SCALE,
  getTerrainHeight,
} from '../shared/gameTypes';
import type {
  CombatEvent,
  LootDrop,
  MountId,
  PetId,
  PlayerState,
  WorldSnapshot,
  ZoneId,
} from '../shared/gameTypes';
import type { FpsCapOption, GameSettings, GraphicsQuality } from './settingsStorage';
import {
  animateHeroRig,
  animateMonsterRig,
  animateMountRig,
  animatePetRig,
  applyHeroEquipmentVisuals,
  applyMountEquipmentVisuals,
  createHeroRig,
  createMonsterRig,
  createMountRig,
  createObstacleProp,
  createPetRig,
  createQuartermasterNpc,
  createQuestNpc,
  createSanctuaryFountain,
  createSummonRig,
  setOutlinesEnabled,
} from './models3d';
import type { ArticulatedRig } from './models3d';
import { createOpenWorldEnvironment } from './terrain3d';
import type { TerrainSystem } from './terrain3d';
import { WeatherController } from './weatherController';

const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouseNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function lerpAngle(a: number, b: number, t: number): number {
  const diff = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + diff * t;
}

interface TrackedPlayer {
  rig: ArticulatedRig;
  heroClass: string;
  mountRig: ArticulatedRig | null;
  mountId: MountId | null;
  wx: number;
  wy: number;
  flightHeight: number;
  facing: number;
  lastX: number;
  lastY: number;
  lastAttackAt: number;
  jumpVel: number;
  jumpY: number;
}

interface TrackedPet {
  rig: ArticulatedRig;
  petId: PetId;
  wx: number;
  wy: number;
  facing: number;
}

interface TrackedMonster {
  rig: ArticulatedRig;
  kind: string;
  wx: number;
  wy: number;
  facing: number;
  lastX: number;
  lastY: number;
  telegraphMesh?: THREE.Group;
  telegraphFill?: THREE.Mesh;
}

interface TrackedSummon {
  rig: ArticulatedRig;
  kind: 'wolf_spirit' | 'rune_sentinel';
  wx: number;
  wy: number;
  facing: number;
}

interface Active3DVfx {
  mesh: THREE.Object3D;
  kind: 'aoe' | 'slash' | 'level_up' | 'particles' | 'flash' | 'speed_lines';
  createdAt: number;
  durationMs: number;
  maxScale: number;
}

interface FloatingLabel {
  id: string;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  isCrit: boolean;
  createdAt: number;
  durationMs: number;
}

export interface ChatBubble {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  durationMs: number;
}

export interface QuestObjectiveGuide {
  x: number;
  y: number;
  title: string;
  stageLabel: string;
}

export type InteractiveTarget =
  | { kind: 'npc'; npcId: string }
  | { kind: 'quartermaster' }
  | { kind: 'fountain' };

export class Eldergrove3DWorld {
  private container: HTMLElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D | null;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private isSoftwareGl: boolean;
  private clock = new THREE.Clock();

  private snapshot: WorldSnapshot | null = null;
  private localPlayerId: string | null = null;
  private localFlightHeight = 0;
  private flightClimbInput = false;
  private flightDescendInput = false;
  private localIsMounted = false;
  private localMountId: MountId | null = null;

  private playerEntities = new Map<string, TrackedPlayer>();
  private petEntities = new Map<string, TrackedPet>();
  private monsterEntities = new Map<string, TrackedMonster>();
  private summonEntities = new Map<string, TrackedSummon>();
  private projectileMeshes = new Map<string, THREE.Mesh>();
  private lootMeshes = new Map<string, THREE.Group>();
  private obstacleProps: THREE.Group[] = [];
  private interactables: THREE.Object3D[] = [];
  private vfxList: Active3DVfx[] = [];
  private floatingLabels: FloatingLabel[] = [];
  private chatBubbles: ChatBubble[] = [];
  private questObjective: QuestObjectiveGuide | null = null;
  private questGuideGroup: THREE.Group;

  private fountainRefs: { group: THREE.Group; crystal: THREE.Mesh; ring: THREE.Mesh };
  private npcBeacons: { id: string; mesh: THREE.Mesh }[] = [];
  private terrainSystem: TerrainSystem;
  private weatherController: WeatherController;

  private graphicsQuality: GraphicsQuality = 'high';
  private bloomEnabled = true;
  private fpsCap: FpsCapOption = 144;
  private lodDistance = 95;

  public cameraYaw = Math.PI * 0.5;
  public cameraPitch = 0.48;
  public cameraDistance = 13.5;
  public cameraSensitivity = 1.0;
  private shoulderOffset = 0;
  private camTarget = new THREE.Vector3(SANCTUARY_CENTER.x * WORLD_SCALE, 2.5, SANCTUARY_CENTER.y * WORLD_SCALE);
  private localPlayerWx = SANCTUARY_CENTER.x;
  private localPlayerWy = SANCTUARY_CENTER.y;

  private frameId = 0;
  private disposed = false;

  private projGeo = new THREE.SphereGeometry(0.28, 10, 10);
  private arrowGeo = new THREE.ConeGeometry(0.14, 1.1, 6);
  private particleGeo = new THREE.SphereGeometry(0.14, 6, 6);
  private speedLineGeo = new THREE.BoxGeometry(0.08, 0.08, 1.8);

  constructor(
    container: HTMLElement,
    overlayCanvas: HTMLCanvasElement,
    onContextLost?: () => void
  ) {
    this.container = container;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      onContextLost?.();
    });

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x88b4dc);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x88b4dc, 0.0082);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(54, aspect, 0.3, 420);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x9bd0ff, 0x3b4a33, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.15);
    this.sunLight.position.set(55, 65, 115);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 32;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.58);
    rimLight.position.set(-40, 28, -50);
    this.scene.add(rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.terrainSystem = createOpenWorldEnvironment(this.scene, maxAniso);
    this.weatherController = new WeatherController(this.scene);

    for (const obs of WORLD_OBSTACLES) {
      const prop = createObstacleProp(obs.kind, obs.radius);
      const px = obs.x * WORLD_SCALE;
      const pz = obs.y * WORLD_SCALE;
      const py = getTerrainHeight(obs.x, obs.y);
      prop.position.set(px, py, pz);
      prop.rotation.y = (obs.x * 0.13 + obs.y * 0.07) % (Math.PI * 2);
      this.scene.add(prop);
      this.obstacleProps.push(prop);
    }

    this.fountainRefs = createSanctuaryFountain();
    this.fountainRefs.group.position.set(
      SANCTUARY_FOUNTAIN.x * WORLD_SCALE,
      getTerrainHeight(SANCTUARY_FOUNTAIN.x, SANCTUARY_FOUNTAIN.y),
      SANCTUARY_FOUNTAIN.y * WORLD_SCALE
    );
    this.scene.add(this.fountainRefs.group);
    this.interactables.push(this.fountainRefs.group);

    const bram = createQuartermasterNpc();
    bram.position.set(
      QUARTERMASTER_NPC.x * WORLD_SCALE,
      getTerrainHeight(QUARTERMASTER_NPC.x, QUARTERMASTER_NPC.y),
      QUARTERMASTER_NPC.y * WORLD_SCALE
    );
    bram.rotation.y = -Math.PI * 0.25;
    this.scene.add(bram);
    this.interactables.push(bram);

    // Spawn Quest, Merchant & Job Master NPCs
    const npcStyleMap: Record<string, { heroClass: 'healer' | 'archer' | 'warrior' | 'mage'; col: number; rot: number }> = {
      npc_lyra: { heroClass: 'healer', col: 0xfde047, rot: Math.PI * 0.18 },
      npc_elena: { heroClass: 'archer', col: 0xfbbf24, rot: Math.PI * 0.82 },
      npc_kaelen: { heroClass: 'warrior', col: 0x60a5fa, rot: Math.PI * 0.22 },
      npc_maeve: { heroClass: 'mage', col: 0x38bdf8, rot: -Math.PI * 0.35 },
    };

    for (const npc of Object.values(NPCS_DATA)) {
      const st = npcStyleMap[npc.id] || { heroClass: 'healer', col: 0xfde047, rot: 0 };
      const built = createQuestNpc(st.heroClass, st.col, npc.id);
      built.group.position.set(npc.x * WORLD_SCALE, getTerrainHeight(npc.x, npc.y), npc.y * WORLD_SCALE);
      built.group.rotation.y = st.rot;
      this.scene.add(built.group);
      this.npcBeacons.push({ id: npc.id, mesh: built.beacon });
      this.interactables.push(built.group);
    }

    // 3D Quest navigation arrow beacon hovering near player
    this.questGuideGroup = new THREE.Group();
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.6,
    });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 12), arrowMat);
    cone.rotation.x = Math.PI / 2;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.75, 10), arrowMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.65;
    this.questGuideGroup.add(cone, shaft);
    this.questGuideGroup.visible = false;
    this.scene.add(this.questGuideGroup);

    if (!this.isSoftwareGl) {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.28, 0.35, 0.85);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
      this.renderer.compile(this.scene, this.camera);
    }

    this.resize();
    this.startLoop();
  }

  public applySettings(settings: GameSettings) {
    this.cameraSensitivity = Math.max(0.1, Math.min(2.0, settings.cameraSensitivity));
    this.graphicsQuality = settings.graphicsQuality;
    this.bloomEnabled = settings.bloomEnabled && !this.isSoftwareGl;
    this.fpsCap = settings.fpsCap;
    setOutlinesEnabled(settings.outlinesEnabled);
    if (this.bloomPass) {
      this.bloomPass.strength = settings.bloomEnabled ? settings.bloomIntensity : 0;
    }
    this.shoulderOffset = settings.shoulderView ? 1.6 : 0;

    this.terrainSystem.setQuality(settings.graphicsQuality);
    this.weatherController.setQuality(settings.graphicsQuality);

    const dpr = window.devicePixelRatio || 1;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.lodDistance = 55;
    } else if (settings.graphicsQuality === 'low') {
      this.renderer.setPixelRatio(1);
      this.sunLight.castShadow = false;
      this.lodDistance = 42;
    } else if (settings.graphicsQuality === 'medium') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.5));
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.width !== 1024) {
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      this.lodDistance = 68;
    } else {
      this.renderer.setPixelRatio(Math.min(dpr, 2));
      this.sunLight.castShadow = true;
      if (this.sunLight.shadow.mapSize.width !== 2048) {
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      this.lodDistance = 105;
    }
    this.resize();
  }

  public resize() {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.overlayCanvas.width = Math.floor(w * dpr);
    this.overlayCanvas.height = Math.floor(h * dpr);
    this.overlayCanvas.style.width = `${w}px`;
    this.overlayCanvas.style.height = `${h}px`;
    if (this.overlayCtx) {
      this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  public setLocalPlayerId(id: string) {
    this.localPlayerId = id;
  }

  public setQuestObjective(guide: QuestObjectiveGuide | null) {
    this.questObjective = guide;
  }

  public addChatBubble(senderId: string, senderName: string, text: string) {
    this.chatBubbles = this.chatBubbles.filter((b) => b.senderId !== senderId);
    this.chatBubbles.push({
      id: `bubble_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId,
      senderName,
      text: text.slice(0, 120),
      createdAt: performance.now(),
      durationMs: 5400,
    });
  }

  public setFlightControls(
    climb: boolean,
    descend: boolean,
    isMounted: boolean,
    mountId: MountId | null
  ) {
    this.flightClimbInput = climb;
    this.flightDescendInput = descend;
    this.localIsMounted = isMounted;
    this.localMountId = mountId;
  }

  public getLocalFlightHeight(): number {
    return Number(this.localFlightHeight.toFixed(2));
  }

  public setPointerLocked(locked: boolean) {
    try {
      if (locked) {
        if (document.pointerLockElement !== this.renderer.domElement) {
          this.renderer.domElement.requestPointerLock?.();
        }
      } else if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore browser pointer lock rejections inside sandboxed frames
    }
  }

  public raycastInteractiveTarget(clientX: number, clientY: number): InteractiveTarget | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_mouseNdc, this.camera);
    const hits = _raycaster.intersectObjects(this.interactables, true);
    for (const hit of hits) {
      if (hit.distance > 42) continue;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.interactKind === 'npc' && obj.userData.npcId) {
          return { kind: 'npc', npcId: obj.userData.npcId as string };
        }
        if (obj.userData.interactKind === 'quartermaster') {
          return { kind: 'quartermaster' };
        }
        if (obj.userData.interactKind === 'fountain') {
          return { kind: 'fountain' };
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  public triggerLocalJump(isMounted = false, mountId: MountId | null = null) {
    if (!this.localPlayerId) return;
    if (isMounted && mountId && MOUNTS_DATA[mountId]?.canFly) {
      if (this.localFlightHeight < 0.8) {
        this.localFlightHeight = 0.85;
      }
      return;
    }
    const tracked = this.playerEntities.get(this.localPlayerId);
    if (tracked && tracked.jumpY <= 0.02) {
      const mountJump = isMounted && mountId ? MOUNTS_DATA[mountId].jumpPower : 9.2;
      tracked.jumpVel = mountJump;
    }
  }

  public getCameraAimAngle(clientX?: number, clientY?: number): {
    aimAngle: number;
    aimX: number;
    aimY: number;
  } {
    const local = this.localPlayerId ? this.playerEntities.get(this.localPlayerId) : null;
    const px = local ? local.wx : SANCTUARY_CENTER.x;
    const py = local ? local.wy : SANCTUARY_CENTER.y;

    if (clientX !== undefined && clientY !== undefined) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      _mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const groundY = getTerrainHeight(px, py);
      _groundPlane.set(new THREE.Vector3(0, 1, 0), -groundY);
      _raycaster.setFromCamera(_mouseNdc, this.camera);
      if (_raycaster.ray.intersectPlane(_groundPlane, _vec3)) {
        const targetWx = _vec3.x / WORLD_SCALE;
        const targetWy = _vec3.z / WORLD_SCALE;
        return {
          aimAngle: Math.atan2(targetWy - py, targetWx - px),
          aimX: targetWx,
          aimY: targetWy,
        };
      }
    }

    const fwdX = Math.sin(this.cameraYaw);
    const fwdZ = Math.cos(this.cameraYaw);
    return {
      aimAngle: Math.atan2(fwdZ, fwdX),
      aimX: px + fwdX * 140,
      aimY: py + fwdZ * 140,
    };
  }

  private getEffectiveUnlockedZones(snap: WorldSnapshot, localPlayer: PlayerState | undefined): ZoneId[] {
    if (!localPlayer) return [...DEFAULT_UNLOCKED_ZONES];
    const set = new Set<ZoneId>(localPlayer.unlockedZones || DEFAULT_UNLOCKED_ZONES);
    if (localPlayer.groupId) {
      const grp = snap.groups.find((g) => g.id === localPlayer.groupId);
      if (grp?.unlockedZones) {
        for (const z of grp.unlockedZones) set.add(z);
      }
    }
    return Array.from(set);
  }

  public applySnapshot(snap: WorldSnapshot) {
    this.snapshot = snap;
    const now = performance.now();

    if (snap.weather) {
      this.weatherController.setWeather(snap.weather);
    }

    const localPlayer = snap.players.find((p) => p.id === this.localPlayerId);
    this.terrainSystem.updateBarriers(this.getEffectiveUnlockedZones(snap, localPlayer));

    for (const ce of snap.events) {
      this.spawnEventVfx(ce, now);
    }

    // Reconcile players, equipment visuals, mounts & pets
    const seenPlayers = new Set<string>();
    const seenPets = new Set<string>();
    for (const p of snap.players) {
      seenPlayers.add(p.id);
      let tracked = this.playerEntities.get(p.id);
      if (!tracked || tracked.heroClass !== p.heroClass) {
        if (tracked) {
          this.scene.remove(tracked.rig.root);
          if (tracked.mountRig) this.scene.remove(tracked.mountRig.root);
        }
        const rig = createHeroRig(p.heroClass, p.id === this.localPlayerId);
        this.scene.add(rig.root);
        tracked = {
          rig,
          heroClass: p.heroClass,
          mountRig: null,
          mountId: null,
          wx: p.x,
          wy: p.y,
          flightHeight: p.flightHeight || 0,
          facing: p.facingAngle,
          lastX: p.x,
          lastY: p.y,
          lastAttackAt: p.lastAttackAt,
          jumpVel: 0,
          jumpY: 0,
        };
        this.playerEntities.set(p.id, tracked);
      }

      applyHeroEquipmentVisuals(tracked.rig, p.heroClass, p.equipment);

      const desiredMount = p.isMounted && p.activeMount ? p.activeMount : null;
      if (tracked.mountId !== desiredMount) {
        if (tracked.mountRig) {
          this.scene.remove(tracked.mountRig.root);
          tracked.mountRig = null;
        }
        tracked.mountId = desiredMount;
        if (desiredMount) {
          tracked.mountRig = createMountRig(desiredMount);
          this.scene.add(tracked.mountRig.root);
        }
      }
      if (tracked.mountRig) {
        applyMountEquipmentVisuals(tracked.mountRig, p.equipment?.mountGear);
      }

      if (p.activePet) {
        seenPets.add(p.id);
        let tPet = this.petEntities.get(p.id);
        if (!tPet || tPet.petId !== p.activePet.id) {
          if (tPet) this.scene.remove(tPet.rig.root);
          const rig = createPetRig(p.activePet.id);
          this.scene.add(rig.root);
          tPet = {
            rig,
            petId: p.activePet.id,
            wx: p.activePet.x,
            wy: p.activePet.y,
            facing: p.activePet.facingAngle,
          };
          this.petEntities.set(p.id, tPet);
        }
      }
    }
    for (const [id, tracked] of this.playerEntities.entries()) {
      if (!seenPlayers.has(id)) {
        this.scene.remove(tracked.rig.root);
        if (tracked.mountRig) this.scene.remove(tracked.mountRig.root);
        this.playerEntities.delete(id);
      }
    }
    for (const [id, tPet] of this.petEntities.entries()) {
      if (!seenPets.has(id)) {
        this.scene.remove(tPet.rig.root);
        this.petEntities.delete(id);
      }
    }

    // Reconcile summons
    const seenSummons = new Set<string>();
    for (const sm of snap.summons || []) {
      seenSummons.add(sm.id);
      let tracked = this.summonEntities.get(sm.id);
      if (!tracked || tracked.kind !== sm.kind) {
        if (tracked) this.scene.remove(tracked.rig.root);
        const rig = createSummonRig(sm.kind);
        this.scene.add(rig.root);
        tracked = {
          rig,
          kind: sm.kind,
          wx: sm.x,
          wy: sm.y,
          facing: sm.facingAngle,
        };
        this.summonEntities.set(sm.id, tracked);
      }
    }
    for (const [id, tracked] of this.summonEntities.entries()) {
      if (!seenSummons.has(id)) {
        this.scene.remove(tracked.rig.root);
        this.summonEntities.delete(id);
      }
    }

    // Reconcile monsters
    const seenMonsters = new Set<string>();
    for (const m of snap.monsters) {
      seenMonsters.add(m.id);
      if (!this.monsterEntities.has(m.id)) {
        const rig = createMonsterRig(m.kind);
        this.scene.add(rig.root);
        this.monsterEntities.set(m.id, {
          rig,
          kind: m.kind,
          wx: m.x,
          wy: m.y,
          facing: m.facingAngle,
          lastX: m.x,
          lastY: m.y,
        });
      }
    }
    for (const [id, tracked] of this.monsterEntities.entries()) {
      if (!seenMonsters.has(id)) {
        this.scene.remove(tracked.rig.root);
        if (tracked.telegraphMesh) this.scene.remove(tracked.telegraphMesh);
        this.monsterEntities.delete(id);
      }
    }

    // Reconcile projectiles
    const seenProj = new Set<string>();
    for (const pr of snap.projectiles) {
      seenProj.add(pr.id);
      let mesh = this.projectileMeshes.get(pr.id);
      if (!mesh) {
        const isArrow = pr.kind === 'arrow' || pr.kind === 'pierce_arrow';
        const mat = new THREE.MeshStandardMaterial({
          color: pr.color,
          emissive: pr.color,
          emissiveIntensity: 1.5,
          roughness: 0.2,
        });
        mesh = new THREE.Mesh(isArrow ? this.arrowGeo : this.projGeo, mat);
        if (isArrow) mesh.rotation.x = Math.PI / 2;
        this.scene.add(mesh);
        this.projectileMeshes.set(pr.id, mesh);
      }
      const px = pr.x * WORLD_SCALE;
      const pz = pr.y * WORLD_SCALE;
      const py = getTerrainHeight(pr.x, pr.y) + 1.2;
      mesh.position.set(px, py, pz);
      if (pr.kind === 'arrow' || pr.kind === 'pierce_arrow') {
        mesh.rotation.set(Math.PI / 2, 0, -Math.atan2(pr.vy, pr.vx) + Math.PI / 2);
      }
    }
    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!seenProj.has(id)) {
        this.scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        this.projectileMeshes.delete(id);
      }
    }

    // Reconcile loot drops
    const seenLoot = new Set<string>();
    for (const drop of snap.loot) {
      seenLoot.add(drop.id);
      if (!this.lootMeshes.has(drop.id)) {
        const grp = this.createLootMesh(drop);
        grp.position.set(
          drop.x * WORLD_SCALE,
          getTerrainHeight(drop.x, drop.y),
          drop.y * WORLD_SCALE
        );
        this.scene.add(grp);
        this.lootMeshes.set(drop.id, grp);
      }
    }
    for (const [id, grp] of this.lootMeshes.entries()) {
      if (!seenLoot.has(id)) {
        this.scene.remove(grp);
        this.lootMeshes.delete(id);
      }
    }
  }

  private createLootMesh(drop: LootDrop): THREE.Group {
    const grp = new THREE.Group();
    if (drop.kind === 'gold') {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.2 })
      );
      coin.rotation.x = Math.PI / 2;
      coin.position.y = 0.65;
      grp.add(coin);
    } else if (drop.kind === 'orb') {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 1.4, roughness: 0.15 })
      );
      orb.position.y = 0.7;
      grp.add(orb);
    } else {
      const colMap: Record<string, number> = {
        common: 0xcbd5e1,
        uncommon: 0x34d399,
        rare: 0x60a5fa,
        epic: 0xc084fc,
        legendary: 0xf59e0b,
      };
      const col = colMap[drop.rarity] || 0x60a5fa;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.3 })
      );
      crystal.position.y = 0.95;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.28, drop.rarity === 'legendary' ? 6.2 : 4.2, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.y = drop.rarity === 'legendary' ? 3.1 : 2.1;
      grp.add(crystal, beam);
    }
    return grp;
  }

  private spawnEventVfx(ce: CombatEvent, now: number) {
    if (this.vfxList.length > 28) return;

    const wx = ce.x * WORLD_SCALE;
    const wz = ce.y * WORLD_SCALE;
    const wy = getTerrainHeight(ce.x, ce.y);

    if (ce.text) {
      this.floatingLabels.push({
        id: ce.id,
        x: wx,
        y: wy + 2.4,
        z: wz,
        text: ce.text,
        color: ce.color || '#F8FAFC',
        isCrit: !!ce.isCrit || ce.type === 'level_up' || ce.type === 'zone_unlock' || ce.type === 'world_boss',
        createdAt: now,
        durationMs: ce.type === 'level_up' || ce.type === 'zone_unlock' || ce.type === 'world_boss' ? 1600 : 880,
      });
    }

    if (ce.type === 'aoe' || ce.type === 'level_up' || ce.type === 'world_boss' || ce.type === 'pet_pickup') {
      const r = (ce.radius || (ce.type === 'world_boss' ? 200 : ce.type === 'pet_pickup' ? 32 : 90)) * WORLD_SCALE;
      const ringGeo = new THREE.RingGeometry(0.62, 1.0, 28);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ce.color || '#F59E0B',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(wx, wy + 0.15, wz);

      if (ce.type === 'level_up' || ce.type === 'world_boss') {
        const grp = new THREE.Group();
        grp.position.set(wx, wy, wz);
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(ce.type === 'world_boss' ? 2.2 : 1.1, ce.type === 'world_boss' ? 3.0 : 1.4, ce.type === 'world_boss' ? 18 : 10, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: ce.color || 0xfbbf24, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false })
        );
        pillar.position.y = ce.type === 'world_boss' ? 9 : 5;
        mesh.position.set(0, 0.2, 0);
        grp.add(mesh, pillar);
        this.scene.add(grp);
        this.vfxList.push({ mesh: grp, kind: 'level_up', createdAt: now, durationMs: ce.type === 'world_boss' ? 1400 : 1100, maxScale: r });
      } else {
        this.scene.add(mesh);
        this.vfxList.push({ mesh, kind: 'aoe', createdAt: now, durationMs: ce.type === 'pet_pickup' ? 280 : 380, maxScale: r });

        if (ce.type !== 'pet_pickup') {
          const flashMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.55, 10, 8),
            new THREE.MeshBasicMaterial({ color: ce.color || '#FDE047', transparent: true, opacity: 0.9, depthWrite: false })
          );
          flashMesh.position.set(wx, wy + 1.0, wz);
          this.scene.add(flashMesh);
          this.vfxList.push({ mesh: flashMesh, kind: 'flash', createdAt: now, durationMs: 190, maxScale: Math.max(1.8, r * 0.42) });

          if (this.graphicsQuality !== 'low') {
            const pGroup = new THREE.Group();
            pGroup.position.set(wx, wy + 0.65, wz);
            const pMat = new THREE.MeshBasicMaterial({ color: ce.color || '#F59E0B', transparent: true, opacity: 0.9 });
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              const pMesh = new THREE.Mesh(this.particleGeo, pMat);
              pMesh.position.set(Math.cos(ang) * 0.45, 0, Math.sin(ang) * 0.45);
              pGroup.add(pMesh);
            }
            this.scene.add(pGroup);
            this.vfxList.push({ mesh: pGroup, kind: 'particles', createdAt: now, durationMs: 390, maxScale: Math.max(1.6, r * 0.45) });
          }
        }
      }
    } else if (ce.type === 'slash') {
      const r = (ce.radius || 85) * WORLD_SCALE;
      const step = ce.comboStep || 1;
      const isFinisher = step === 3;
      const arcGeo = new THREE.RingGeometry(r * (isFinisher ? 0.35 : 0.48), r * (isFinisher ? 1.15 : 0.98), 20, 1, -1.05, 2.1);
      const arcMat = new THREE.MeshBasicMaterial({
        color: ce.color || (isFinisher ? '#FDE047' : '#FBBF24'),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isFinisher ? 0.95 : 0.85,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(arcGeo, arcMat);
      mesh.rotation.x = -Math.PI / 2 + (step === 1 ? 0.22 : step === 2 ? -0.22 : 0.04);
      mesh.rotation.z = -(ce.angle || 0);
      mesh.position.set(wx, wy + 1.18, wz);
      this.scene.add(mesh);
      this.vfxList.push({ mesh, kind: 'slash', createdAt: now, durationMs: isFinisher ? 270 : 210, maxScale: isFinisher ? 1.38 : 1.18 });

      if (isFinisher) {
        const lineGroup = new THREE.Group();
        lineGroup.position.set(wx, wy + 1.15, wz);
        lineGroup.rotation.y = Math.PI / 2 - (ce.angle || 0);
        const lineMat = new THREE.MeshBasicMaterial({ color: ce.color || '#FEF08A', transparent: true, opacity: 0.9, depthWrite: false });
        for (let i = 0; i < 6; i++) {
          const streak = new THREE.Mesh(this.speedLineGeo, lineMat);
          const spread = (i - 2.5) * 0.45;
          streak.position.set(spread, (i % 2) * 0.35, 1.4 + (i % 3) * 0.5);
          lineGroup.add(streak);
        }
        this.scene.add(lineGroup);
        this.vfxList.push({ mesh: lineGroup, kind: 'speed_lines', createdAt: now, durationMs: 240, maxScale: 1.9 });
      }
    }
  }

  private startLoop() {
    let lastRenderAt = 0;

    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();

      if (!this.isSoftwareGl && this.fpsCap > 0) {
        const minInterval = 1000 / this.fpsCap;
        if (now - lastRenderAt < minInterval - 0.8) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
      }
      lastRenderAt = now;

      const delta = Math.min(0.1, this.clock.getDelta());
      const elapsed = this.clock.getElapsedTime();

      this.updateEntities(delta, elapsed, now);
      if (this.bloomEnabled && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      this.renderScreenOverlay(now);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private updateEntities(delta: number, elapsed: number, now: number) {
    const snap = this.snapshot;
    if (!snap) return;

    this.fountainRefs.crystal.rotation.y = elapsed * 1.1;
    this.fountainRefs.crystal.position.y = 3.85 + Math.sin(elapsed * 2.2) * 0.22;
    this.fountainRefs.ring.rotation.x = Math.sin(elapsed * 1.4) * 0.6;
    this.fountainRefs.ring.rotation.y = -elapsed * 1.6;

    for (const b of this.npcBeacons) {
      b.mesh.rotation.y = elapsed * 1.8;
      b.mesh.position.y = 2.85 + Math.sin(elapsed * 2.5) * 0.14;
    }

    for (const grp of this.lootMeshes.values()) {
      grp.rotation.y = elapsed * 2.2;
    }

    // Integrate smooth flight altitude for local player
    const canLocalFly =
      this.localIsMounted && this.localMountId && MOUNTS_DATA[this.localMountId]?.canFly;
    if (canLocalFly && this.localMountId) {
      const maxH = MOUNTS_DATA[this.localMountId].maxFlightHeight;
      if (this.flightClimbInput) {
        this.localFlightHeight = Math.min(maxH, this.localFlightHeight + 9.5 * delta);
      } else if (this.flightDescendInput) {
        this.localFlightHeight = Math.max(0, this.localFlightHeight - 10.5 * delta);
      }
    } else if (this.localFlightHeight > 0) {
      this.localFlightHeight = Math.max(0, this.localFlightHeight - 14.0 * delta);
    }

    for (const p of snap.players) {
      const tracked = this.playerEntities.get(p.id);
      if (!tracked) continue;

      const dMove = Math.hypot(p.x - tracked.wx, p.y - tracked.wy);
      if (dMove > 180) {
        tracked.wx = p.x;
        tracked.wy = p.y;
      } else {
        tracked.wx = THREE.MathUtils.damp(tracked.wx, p.x, 14, delta);
        tracked.wy = THREE.MathUtils.damp(tracked.wy, p.y, 14, delta);
      }

      if (p.id === this.localPlayerId) {
        tracked.flightHeight = this.localFlightHeight;
      } else {
        tracked.flightHeight = THREE.MathUtils.damp(tracked.flightHeight, p.flightHeight || 0, 10, delta);
      }

      if (tracked.jumpY > 0 || tracked.jumpVel > 0) {
        tracked.jumpY += tracked.jumpVel * delta;
        tracked.jumpVel -= 24 * delta;
        if (tracked.jumpY <= 0) {
          tracked.jumpY = 0;
          tracked.jumpVel = 0;
        }
      }

      const targetRotY = Math.PI / 2 - p.facingAngle;
      tracked.facing = lerpAngle(tracked.facing, targetRotY, Math.min(1, delta * 14));

      const px = tracked.wx * WORLD_SCALE;
      const pz = tracked.wy * WORLD_SCALE;
      const py = getTerrainHeight(tracked.wx, tracked.wy);
      const fh = tracked.flightHeight;

      tracked.rig.root.position.set(px, py + fh, pz);
      tracked.rig.body.rotation.y = tracked.facing;
      tracked.rig.contactShadow.position.y = -fh + 0.04;

      const speedMoved = Math.hypot(p.x - tracked.lastX, p.y - tracked.lastY);
      tracked.lastX = THREE.MathUtils.damp(tracked.lastX, p.x, 10, delta);
      tracked.lastY = THREE.MathUtils.damp(tracked.lastY, p.y, 10, delta);
      const isMoving = speedMoved > 0.6;

      const sinceAtk = Date.now() - p.lastAttackAt;
      const attackAlpha = sinceAtk >= 0 && sinceAtk < 260 ? sinceAtk / 260 : 0;
      const isFlying = p.isMounted && fh > 0.25;
      animateHeroRig(
        tracked.rig,
        isMoving,
        attackAlpha,
        elapsed,
        p.isDead,
        tracked.jumpY,
        p.isMounted,
        p.comboStep || 1,
        isFlying
      );

      if (tracked.mountRig && tracked.mountId) {
        tracked.mountRig.root.position.set(px, py + fh, pz);
        tracked.mountRig.body.rotation.y = tracked.facing;
        tracked.mountRig.contactShadow.position.y = -fh + 0.04;
        animateMountRig(tracked.mountRig, tracked.mountId, isMoving, elapsed, tracked.jumpY, isFlying);
      }

      const tPet = this.petEntities.get(p.id);
      if (tPet && p.activePet) {
        tPet.wx = THREE.MathUtils.damp(tPet.wx, p.activePet.x, 12, delta);
        tPet.wy = THREE.MathUtils.damp(tPet.wy, p.activePet.y, 12, delta);
        const petPx = tPet.wx * WORLD_SCALE;
        const petPz = tPet.wy * WORLD_SCALE;
        const petPy = getTerrainHeight(tPet.wx, tPet.wy) + (isFlying ? fh + 1.1 : 0);
        tPet.rig.root.position.set(petPx, petPy, petPz);
        tPet.facing = lerpAngle(tPet.facing, Math.PI / 2 - p.activePet.facingAngle, Math.min(1, delta * 12));
        tPet.rig.body.rotation.y = tPet.facing;
        animatePetRig(tPet.rig, tPet.petId, isMoving, elapsed);
      }

      if (p.id === this.localPlayerId) {
        this.localPlayerWx = tracked.wx;
        this.localPlayerWy = tracked.wy;
        this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, px, 10, delta);
        this.camTarget.y = THREE.MathUtils.damp(
          this.camTarget.y,
          py + fh + (p.isMounted ? 2.2 : 1.65) + tracked.jumpY * 0.45,
          10,
          delta
        );
        this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, pz, 10, delta);

        const targetFov = isFlying && isMoving ? 60 : p.isMounted && isMoving ? 57.5 : 54;
        if (Math.abs(this.camera.fov - targetFov) > 0.05) {
          this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, delta * 6));
          this.camera.updateProjectionMatrix();
        }

        const horizDist = Math.cos(this.cameraPitch) * this.cameraDistance;
        const vertDist = Math.sin(this.cameraPitch) * this.cameraDistance;
        const camX = this.camTarget.x - Math.sin(this.cameraYaw) * horizDist + Math.cos(this.cameraYaw) * this.shoulderOffset;
        const camZ = this.camTarget.z - Math.cos(this.cameraYaw) * horizDist - Math.sin(this.cameraYaw) * this.shoulderOffset;
        const terrainUnderCam = getTerrainHeight(camX / WORLD_SCALE, camZ / WORLD_SCALE);
        const camY = Math.max(terrainUnderCam + 1.1, this.camTarget.y + vertDist);

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.camTarget);

        this.sunLight.position.set(px + 24, py + fh + 42, pz + 18);
        this.sunLight.target.position.set(px, py + fh, pz);

        if (this.questObjective) {
          const targetPx = this.questObjective.x * WORLD_SCALE;
          const targetPz = this.questObjective.y * WORLD_SCALE;
          const dx = targetPx - px;
          const dz = targetPz - pz;
          const angle = Math.atan2(dx, dz);
          this.questGuideGroup.visible = true;
          const bob = Math.sin(elapsed * 4.5) * 0.16;
          const dist = Math.hypot(dx, dz);
          const orbitDist = Math.min(2.8, Math.max(1.6, dist * 0.04));
          this.questGuideGroup.position.set(
            px + Math.sin(angle) * orbitDist,
            py + fh + (p.isMounted ? 1.6 : 1.1) + bob,
            pz + Math.cos(angle) * orbitDist
          );
          this.questGuideGroup.rotation.y = angle;
        } else {
          this.questGuideGroup.visible = false;
        }
      }
    }

    this.terrainSystem.update(elapsed, this.camTarget.x, this.camTarget.z);
    this.weatherController.update(
      delta,
      this.camTarget.x,
      this.camTarget.y,
      this.camTarget.z,
      this.localPlayerWx,
      this.localPlayerWy,
      this.sunLight,
      this.hemiLight,
      this.scene,
      this.terrainSystem.skyUniforms
    );

    for (const prop of this.obstacleProps) {
      prop.visible = this.camTarget.distanceTo(prop.position) < this.lodDistance + 22;
    }

    for (const sm of snap.summons || []) {
      const tracked = this.summonEntities.get(sm.id);
      if (!tracked) continue;
      tracked.wx = THREE.MathUtils.damp(tracked.wx, sm.x, 12, delta);
      tracked.wy = THREE.MathUtils.damp(tracked.wy, sm.y, 12, delta);
      const sx = tracked.wx * WORLD_SCALE;
      const sz = tracked.wy * WORLD_SCALE;
      const sy = getTerrainHeight(tracked.wx, tracked.wy);
      tracked.rig.root.position.set(sx, sy, sz);
      tracked.rig.body.rotation.y = Math.PI / 2 - sm.facingAngle;
      tracked.rig.body.position.y = Math.sin(elapsed * 4.5) * 0.16;
      if (tracked.rig.orbitAccessory) {
        tracked.rig.orbitAccessory.rotation.y = elapsed * 3.0;
        tracked.rig.orbitAccessory.rotation.x = Math.sin(elapsed * 2) * 0.5;
      }
    }

    for (const m of snap.monsters) {
      const tracked = this.monsterEntities.get(m.id);
      if (!tracked) continue;

      const dMove = Math.hypot(m.x - tracked.wx, m.y - tracked.wy);
      if (dMove > 180) {
        tracked.wx = m.x;
        tracked.wy = m.y;
      } else {
        tracked.wx = THREE.MathUtils.damp(tracked.wx, m.x, 12, delta);
        tracked.wy = THREE.MathUtils.damp(tracked.wy, m.y, 12, delta);
      }

      const targetRotY = Math.PI / 2 - m.facingAngle;
      tracked.facing = lerpAngle(tracked.facing, targetRotY, Math.min(1, delta * 10));

      const mx = tracked.wx * WORLD_SCALE;
      const mz = tracked.wy * WORLD_SCALE;
      const my = getTerrainHeight(tracked.wx, tracked.wy);

      tracked.rig.root.position.set(mx, my, mz);
      tracked.rig.body.rotation.y = tracked.facing;

      const withinLod = m.isBoss || this.camTarget.distanceTo(tracked.rig.root.position) <= this.lodDistance;
      tracked.rig.root.visible = withinLod;
      if (!withinLod) {
        if (tracked.telegraphMesh) tracked.telegraphMesh.visible = false;
        continue;
      }

      const isMoving = m.aiState === 'chase';
      animateMonsterRig(tracked.rig, m.kind, isMoving, m.aiState, m.windupProgress, elapsed);

      if (m.aiState === 'windup' && m.windupProgress > 0) {
        if (!tracked.telegraphMesh) {
          const grp = new THREE.Group();
          const outer = new THREE.Mesh(
            new THREE.RingGeometry(0.92, 1.0, 32),
            new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false })
          );
          outer.rotation.x = -Math.PI / 2;
          const fill = new THREE.Mesh(
            new THREE.CircleGeometry(1.0, 32),
            new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.28, depthWrite: false })
          );
          fill.rotation.x = -Math.PI / 2;
          grp.add(outer, fill);
          this.scene.add(grp);
          tracked.telegraphMesh = grp;
          tracked.telegraphFill = fill;
        }
        const tx = m.windupX * WORLD_SCALE;
        const tz = m.windupY * WORLD_SCALE;
        const ty = getTerrainHeight(m.windupX, m.windupY) + 0.14;
        const r = m.windupRadius * WORLD_SCALE;
        tracked.telegraphMesh.visible = true;
        tracked.telegraphMesh.position.set(tx, ty, tz);
        tracked.telegraphMesh.scale.set(r, 1, r);
        if (tracked.telegraphFill) {
          tracked.telegraphFill.scale.setScalar(Math.max(0.05, m.windupProgress));
        }
      } else if (tracked.telegraphMesh) {
        tracked.telegraphMesh.visible = false;
      }
    }

    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const v = this.vfxList[i];
      const t = (now - v.createdAt) / v.durationMs;
      if (t >= 1) {
        this.scene.remove(v.mesh);
        v.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry !== this.particleGeo && child.geometry !== this.speedLineGeo) {
              child.geometry.dispose();
            }
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
        this.vfxList.splice(i, 1);
        continue;
      }
      if (v.kind === 'aoe') {
        const sc = v.maxScale * (0.25 + t * 0.75);
        v.mesh.scale.setScalar(sc);
        const mat = (v.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - t) * 0.85;
      } else if (v.kind === 'slash') {
        v.mesh.scale.setScalar(0.85 + t * 0.35 * v.maxScale);
        const mat = (v.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 1 - t;
      } else if (v.kind === 'flash') {
        v.mesh.scale.setScalar(1 + t * v.maxScale);
        const mat = (v.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - t) * 0.9;
      } else if (v.kind === 'speed_lines') {
        v.mesh.scale.set(1 + t * 0.5, 1, 1 + t * v.maxScale);
        v.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            (c.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
          }
        });
      } else if (v.kind === 'particles') {
        v.mesh.scale.setScalar(1 + t * v.maxScale);
        v.mesh.position.y += delta * 1.6;
        v.mesh.rotation.y += delta * 2.5;
        v.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            (c.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
          }
        });
      } else if (v.kind === 'level_up') {
        v.mesh.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
        v.mesh.traverse((c) => {
          if (c instanceof THREE.Mesh) {
            (c.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.5;
          }
        });
      }
    }
  }

  private getNpcQuestMarker(npcId: string, localPlayer?: PlayerState): string {
    if (!localPlayer) return '';
    const hasReadyTurnIn = localPlayer.activeQuests.some((aq) => {
      const q = QUEST_LIST.find((qd) => qd.id === aq.questId);
      return q && q.turnInNpcId === npcId && (aq.completed || aq.progress >= q.targetCount);
    });
    if (hasReadyTurnIn) return '[?] ';
    const hasAvailable = QUEST_LIST.some(
      (q) =>
        q.giverNpcId === npcId &&
        localPlayer.level >= q.requiredLevel &&
        !localPlayer.completedQuestIds.includes(q.id) &&
        !localPlayer.activeQuests.some((aq) => aq.questId === q.id)
    );
    if (hasAvailable) return '[!] ';
    return '';
  }

  private projectNpcLabel(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    label: string,
    color: string,
    w: number,
    h: number
  ) {
    _vec3b.set(wx * WORLD_SCALE, getTerrainHeight(wx, wy) + 2.85, wy * WORLD_SCALE);
    _vec3b.project(this.camera);
    if (
      _vec3b.z <= 1 &&
      this.camera.position.distanceTo(
        _vec3.set(wx * WORLD_SCALE, getTerrainHeight(wx, wy), wy * WORLD_SCALE)
      ) < 54
    ) {
      const sx = (_vec3b.x * 0.5 + 0.5) * w;
      const sy = (-_vec3b.y * 0.5 + 0.5) * h;
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(11, 14, 20, 0.92)';
      ctx.lineWidth = 3;
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = color;
      ctx.fillText(label, sx, sy);
    }
  }

  private renderScreenOverlay(now: number) {
    const ctx = this.overlayCtx;
    const snap = this.snapshot;
    if (!ctx || !snap) return;

    const w = this.overlayCanvas.clientWidth || window.innerWidth;
    const h = this.overlayCanvas.clientHeight || window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    const localPlayer = snap.players.find((p) => p.id === this.localPlayerId);

    for (const m of snap.monsters) {
      const tracked = this.monsterEntities.get(m.id);
      if (!tracked) continue;
      const headHeight = m.isBoss ? 5.6 : m.kind === 'golem' || m.kind === 'knight' || m.kind === 'ice_golem' ? 3.6 : 2.3;
      _projVec.set(
        tracked.rig.root.position.x,
        tracked.rig.root.position.y + headHeight,
        tracked.rig.root.position.z
      );
      _projVec.project(this.camera);
      if (_projVec.z > 1) continue;

      const distCam = this.camera.position.distanceTo(tracked.rig.root.position);
      if (distCam > 55 && !m.isBoss) continue;

      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;

      const barW = m.isBoss ? 116 : 56;
      const barH = m.isBoss ? 7 : 5;
      ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
      ctx.fillRect(sx - barW / 2 - 1, sy - 1, barW + 2, barH + 2);
      ctx.fillStyle = m.isBoss ? '#F97316' : '#EF4444';
      ctx.fillRect(sx - barW / 2, sy, barW * Math.max(0, m.hp / m.maxHp), barH);

      ctx.font = m.isBoss ? '700 12px "Cinzel", serif' : '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = m.isBoss ? '#FDBA74' : '#F1F5F9';
      ctx.strokeStyle = 'rgba(11, 14, 20, 0.9)';
      ctx.lineWidth = 3;
      const phaseTag = m.isBoss && m.phase ? ` [P${m.phase}]` : '';
      const label = now < m.stunnedUntil ? `${m.name} (Stunned)` : `Lv.${m.level} ${m.name}${phaseTag}`;
      ctx.strokeText(label, sx, sy - 6);
      ctx.fillText(label, sx, sy - 6);
    }

    for (const p of snap.players) {
      const tracked = this.playerEntities.get(p.id);
      if (!tracked) continue;
      _projVec.set(
        tracked.rig.root.position.x,
        tracked.rig.root.position.y + (p.isMounted ? 3.55 : 2.75) + tracked.jumpY,
        tracked.rig.root.position.z
      );
      _projVec.project(this.camera);
      if (_projVec.z > 1) continue;

      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;
      const isMe = p.id === this.localPlayerId;

      const barW = 58;
      ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
      ctx.fillRect(sx - barW / 2 - 1, sy - 1, barW + 2, 6);
      ctx.fillStyle = isMe ? '#10B981' : '#38BDF8';
      ctx.fillRect(sx - barW / 2, sy, barW * Math.max(0, p.hp / p.maxHp), 4);

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(11, 14, 20, 0.9)';
      ctx.lineWidth = 3;
      const text = `Lv.${p.level} ${p.name}${p.isDead ? ' (Fallen)' : ''}`;
      ctx.strokeText(text, sx, sy - 6);
      ctx.fillStyle = isMe ? '#FDE68A' : '#E2E8F0';
      ctx.fillText(text, sx, sy - 6);
    }

    // NPC & Fountain Labels with dynamic [!] / [?] Quest Status Markers & Click hint
    this.projectNpcLabel(ctx, SANCTUARY_FOUNTAIN.x, SANCTUARY_FOUNTAIN.y, 'Healing Fountain [Click / Hit]', '#34D399', w, h);
    this.projectNpcLabel(ctx, QUARTERMASTER_NPC.x, QUARTERMASTER_NPC.y, 'Quartermaster Bram [Click]', '#FBBF24', w, h);
    for (const npc of Object.values(NPCS_DATA)) {
      const marker = this.getNpcQuestMarker(npc.id, localPlayer);
      this.projectNpcLabel(ctx, npc.x, npc.y, `${marker}${npc.name} [Click]`, npc.accentColor, w, h);
    }

    for (let i = this.floatingLabels.length - 1; i >= 0; i--) {
      const lbl = this.floatingLabels[i];
      const t = (now - lbl.createdAt) / lbl.durationMs;
      if (t >= 1) {
        this.floatingLabels.splice(i, 1);
        continue;
      }
      _projVec.set(lbl.x, lbl.y + t * 1.8, lbl.z);
      _projVec.project(this.camera);
      if (_projVec.z > 1) continue;

      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;

      ctx.save();
      ctx.globalAlpha = 1 - Math.pow(t, 1.7);
      ctx.font = lbl.isCrit
        ? '700 16px "JetBrains Mono", monospace'
        : '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(11, 14, 20, 0.95)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(lbl.text, sx, sy);
      ctx.fillStyle = lbl.color;
      ctx.fillText(lbl.text, sx, sy);
      ctx.restore();
    }

    // Floating 3D Chat Speech Bubbles over character heads
    for (let i = this.chatBubbles.length - 1; i >= 0; i--) {
      const b = this.chatBubbles[i];
      const age = now - b.createdAt;
      if (age >= b.durationMs) {
        this.chatBubbles.splice(i, 1);
        continue;
      }
      const tracked = this.playerEntities.get(b.senderId);
      if (!tracked) continue;

      const headY = tracked.rig.root.position.y + 3.85 + (tracked.jumpY || 0);
      _projVec.set(tracked.rig.root.position.x, headY, tracked.rig.root.position.z);
      _projVec.project(this.camera);
      if (_projVec.z > 1) continue;

      const distCam = this.camera.position.distanceTo(tracked.rig.root.position);
      if (distCam > 75) continue;

      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;

      const alpha = age > b.durationMs - 600 ? (b.durationMs - age) / 600 : Math.min(1, age / 150);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      const words = b.text.split(' ');
      const lines: string[] = [];
      let curLine = '';
      for (const word of words) {
        const test = curLine ? `${curLine} ${word}` : word;
        if (ctx.measureText(test).width > 200) {
          if (curLine) lines.push(curLine);
          curLine = word;
        } else {
          curLine = test;
        }
      }
      if (curLine) lines.push(curLine);

      let maxTextW = 60;
      for (const l of lines) {
        maxTextW = Math.max(maxTextW, ctx.measureText(l).width);
      }
      const padX = 14;
      const padY = 8;
      const lineH = 16;
      const bubbleW = maxTextW + padX * 2;
      const bubbleH = lines.length * lineH + padY * 2;
      const bx = sx - bubbleW / 2;
      const by = sy - bubbleH - 14;

      // Cel-shaded bubble card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 10);
      ctx.fill();
      ctx.stroke();

      // Tail pointing to head
      ctx.beginPath();
      ctx.moveTo(sx - 6, by + bubbleH);
      ctx.lineTo(sx, by + bubbleH + 8);
      ctx.lineTo(sx + 6, by + bubbleH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], sx, by + padY + (li + 0.8) * lineH);
      }
      ctx.restore();
    }

    // 2D Screen Overlay for Active Quest Objective & Compass
    if (this.questObjective) {
      const qWx = this.questObjective.x;
      const qWy = this.questObjective.y;
      const qWorldX = qWx * WORLD_SCALE;
      const qWorldZ = qWy * WORLD_SCALE;
      const qWorldY = getTerrainHeight(qWx, qWy) + 2.5;

      _projVec.set(qWorldX, qWorldY, qWorldZ);
      _projVec.project(this.camera);

      const distMeters = Math.round(
        Math.hypot(this.localPlayerWx - qWx, this.localPlayerWy - qWy) * 0.1
      );

      ctx.save();
      if (_projVec.z <= 1) {
        let sx = (_projVec.x * 0.5 + 0.5) * w;
        let sy = (-_projVec.y * 0.5 + 0.5) * h;

        const margin = 48;
        const isOffScreen = sx < margin || sx > w - margin || sy < margin || sy > h - margin;

        if (isOffScreen) {
          const cx = w / 2;
          const cy = h / 2;
          const angle = Math.atan2(sy - cy, sx - cx);
          sx = Math.max(margin, Math.min(w - margin, cx + Math.cos(angle) * (w / 2 - margin)));
          sy = Math.max(margin, Math.min(h - margin, cy + Math.sin(angle) * (h / 2 - margin)));

          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(sx, sy, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(`${distMeters}m`, sx, sy + 24);
        } else {
          const pulse = Math.sin(now * 0.005) * 2.5;
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(sx, sy, 11 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#FEF08A';
          ctx.strokeStyle = 'rgba(11, 14, 20, 0.95)';
          ctx.lineWidth = 3.5;
          ctx.textAlign = 'center';
          ctx.strokeText(`✦ ${this.questObjective.title}`, sx, sy - 18);
          ctx.fillText(`✦ ${this.questObjective.title}`, sx, sy - 18);

          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeText(`${distMeters}m · ${this.questObjective.stageLabel}`, sx, sy + 24);
          ctx.fillText(`${distMeters}m · ${this.questObjective.stageLabel}`, sx, sy + 24);
        }
      } else {
        const sx = w / 2;
        const sy = h - 36;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`✦ Objective Behind (${distMeters}m)`, sx, sy - 18);
      }
      ctx.restore();
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    this.terrainSystem.dispose();
    this.weatherController.dispose();
    this.projGeo.dispose();
    this.arrowGeo.dispose();
    this.particleGeo.dispose();
    this.speedLineGeo.dispose();
    this.composer?.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
