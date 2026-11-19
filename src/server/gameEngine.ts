import { WebSocket } from 'ws';
import {
  BOSSES_DATA,
  WORLD_BOSS_ARENA,
  WORLD_BOSS_SPAWN_KILLS,
  WORLD_BOSS_SPAWN_TIMER_MS,
} from '../data/bossesData.ts';
import type { BossDef, BossKind } from '../data/bossesData.ts';
import { CLASSES_DATA } from '../data/classesData.ts';
import { COMBAT_CONFIG_DATA } from '../data/combatConfigData.ts';
import {
  ITEMS_DATA,
  MAX_INVENTORY_SLOTS,
  MAX_ITEM_STACK,
  STARTING_INVENTORY_SLOTS,
  rollWeightedLootItem,
} from '../data/itemsData.ts';
import type { ItemDef } from '../data/itemsData.ts';
import { JOB_BRANCHES_DATA, getJobBranchById } from '../data/jobChangeData.ts';
import { MERCHANT_SHOPS_DATA } from '../data/merchantData.ts';
import { MOUNTS_DATA } from '../data/mountsData.ts';
import { PETS_DATA, getEffectivePetXpBonus, petXpForNextLevel } from '../data/petsData.ts';
import { NPCS_DATA, QUESTS_DATA } from '../data/questsData.ts';
import { SKILLS_DATA, ULTIMATE_UNLOCK_LEVEL } from '../data/skillsData.ts';
import { SKILL_TREES_DATA } from '../data/skillTreeData.ts';
import { WEATHER_PRESETS, pickRandomNextWeather } from '../data/weatherData.ts';
import { DEFAULT_UNLOCKED_ZONES, WORLD_ZONES, getZoneAt, getZoneById } from '../data/zonesData.ts';
import {
  GROUP_REWARD_RADIUS_UNITS,
  MAX_GROUP_MEMBERS,
  PUBLIC_REALM_CODE,
  QUARTERMASTER_NPC,
  SANCTUARY_CENTER,
  SANCTUARY_FOUNTAIN,
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_WIDTH,
  getUpgradeCost,
  xpForNextLevel,
} from '../shared/gameTypes.ts';
import type {
  ActiveBuffs,
  ActiveQuestProgress,
  ChatMessage,
  ClientMessage,
  CombatEvent,
  EquippedGear,
  GearBonuses,
  GroupInfo,
  HeroClass,
  InventorySlot,
  LootDrop,
  LootRarity,
  MerchantStockState,
  MonsterKind,
  MonsterState,
  MountId,
  PetId,
  PlayerState,
  PlayerStats,
  ProjectileState,
  SavedProfile,
  ServerMessage,
  SummonState,
  WeatherType,
  ZoneId,
} from '../shared/gameTypes.ts';

interface MonsterTemplate {
  kind: MonsterKind;
  name: string;
  level: number;
  zone: ZoneId;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  xpReward: number;
  goldReward: number;
  aggroRange: number;
  attackRange: number;
  windupMs: number;
  cooldownMs: number;
  respawnMs: number;
  isBoss: boolean;
  isWorldBoss?: boolean;
  isRanged?: boolean;
  aoeRadius?: number;
  bossDef?: BossDef;
}

const REGULAR_TEMPLATES: Record<Exclude<MonsterKind, BossKind>, MonsterTemplate> = {
  slime: {
    kind: 'slime',
    name: 'Timber Slime',
    level: 1,
    zone: 'woods',
    maxHp: 75,
    radius: 18,
    speed: 95,
    damage: 10,
    xpReward: 40,
    goldReward: 15,
    aggroRange: 260,
    attackRange: 44,
    windupMs: 500,
    cooldownMs: 1200,
    respawnMs: 6500,
    isBoss: false,
  },
  boar: {
    kind: 'boar',
    name: 'Thorn Boar',
    level: 2,
    zone: 'woods',
    maxHp: 135,
    radius: 21,
    speed: 138,
    damage: 16,
    xpReward: 62,
    goldReward: 22,
    aggroRange: 300,
    attackRange: 48,
    windupMs: 550,
    cooldownMs: 1150,
    respawnMs: 7500,
    isBoss: false,
  },
  golem: {
    kind: 'golem',
    name: 'Moss Golem',
    level: 4,
    zone: 'woods',
    maxHp: 245,
    radius: 27,
    speed: 82,
    damage: 25,
    xpReward: 110,
    goldReward: 34,
    aggroRange: 280,
    attackRange: 64,
    windupMs: 850,
    cooldownMs: 1600,
    respawnMs: 9500,
    isBoss: false,
    aoeRadius: 72,
  },
  frost_wolf: {
    kind: 'frost_wolf',
    name: 'Glacier Direwolf',
    level: 5,
    zone: 'highlands',
    maxHp: 320,
    radius: 22,
    speed: 162,
    damage: 33,
    xpReward: 150,
    goldReward: 44,
    aggroRange: 340,
    attackRange: 52,
    windupMs: 460,
    cooldownMs: 980,
    respawnMs: 8000,
    isBoss: false,
  },
  ice_golem: {
    kind: 'ice_golem',
    name: 'Rime Colossus',
    level: 7,
    zone: 'highlands',
    maxHp: 460,
    radius: 29,
    speed: 92,
    damage: 42,
    xpReward: 200,
    goldReward: 60,
    aggroRange: 310,
    attackRange: 72,
    windupMs: 860,
    cooldownMs: 1500,
    respawnMs: 10000,
    isBoss: false,
    aoeRadius: 86,
  },
  frost_valkyrie: {
    kind: 'frost_valkyrie',
    name: 'Frostbolt Sprite',
    level: 7,
    zone: 'highlands',
    maxHp: 350,
    radius: 20,
    speed: 132,
    damage: 38,
    xpReward: 180,
    goldReward: 54,
    aggroRange: 390,
    attackRange: 285,
    windupMs: 650,
    cooldownMs: 1450,
    respawnMs: 9000,
    isBoss: false,
    isRanged: true,
  },
  stalker: {
    kind: 'stalker',
    name: 'Bone Stalker',
    level: 8,
    zone: 'ruins',
    maxHp: 520,
    radius: 21,
    speed: 155,
    damage: 46,
    xpReward: 230,
    goldReward: 68,
    aggroRange: 340,
    attackRange: 54,
    windupMs: 480,
    cooldownMs: 1000,
    respawnMs: 8500,
    isBoss: false,
  },
  imp: {
    kind: 'imp',
    name: 'Cinder Imp',
    level: 9,
    zone: 'ruins',
    maxHp: 440,
    radius: 19,
    speed: 128,
    damage: 48,
    xpReward: 250,
    goldReward: 74,
    aggroRange: 390,
    attackRange: 290,
    windupMs: 650,
    cooldownMs: 1450,
    respawnMs: 9000,
    isBoss: false,
    isRanged: true,
  },
  knight: {
    kind: 'knight',
    name: 'Obsidian Knight',
    level: 10,
    zone: 'ruins',
    maxHp: 690,
    radius: 28,
    speed: 120,
    damage: 58,
    xpReward: 320,
    goldReward: 98,
    aggroRange: 350,
    attackRange: 74,
    windupMs: 850,
    cooldownMs: 1400,
    respawnMs: 11000,
    isBoss: false,
    aoeRadius: 92,
  },
  wyrmling: {
    kind: 'wyrmling',
    name: 'Ember Wyrmling',
    level: 12,
    zone: 'caldera',
    maxHp: 860,
    radius: 24,
    speed: 144,
    damage: 66,
    xpReward: 390,
    goldReward: 124,
    aggroRange: 370,
    attackRange: 270,
    windupMs: 680,
    cooldownMs: 1350,
    respawnMs: 11500,
    isBoss: false,
    isRanged: true,
  },
};

function buildBossTemplate(b: BossDef): MonsterTemplate {
  return {
    kind: b.kind,
    name: b.name,
    level: b.level,
    zone: b.zone,
    maxHp: b.maxHp,
    radius: b.radius,
    speed: b.speed,
    damage: b.damage,
    xpReward: b.xpReward,
    goldReward: b.goldReward,
    aggroRange: b.aggroRange,
    attackRange: b.attackRange,
    windupMs: b.windupMs,
    cooldownMs: b.cooldownMs,
    respawnMs: b.respawnMs,
    isBoss: true,
    isWorldBoss: b.isWorldBoss,
    aoeRadius: b.phases[0].aoeRadius,
    bossDef: b,
  };
}

const MONSTER_TEMPLATES: Record<MonsterKind, MonsterTemplate> = {
  ...REGULAR_TEMPLATES,
  boss_treant: buildBossTemplate(BOSSES_DATA.boss_treant),
  boss_frost: buildBossTemplate(BOSSES_DATA.boss_frost),
  boss_lich: buildBossTemplate(BOSSES_DATA.boss_lich),
  boss_wyrm: buildBossTemplate(BOSSES_DATA.boss_wyrm),
  boss_world_eclipse: buildBossTemplate(BOSSES_DATA.boss_world_eclipse),
};

interface SpawnPoint {
  kind: MonsterKind;
  x: number;
  y: number;
}

// Non-linear branching world spawn points around Sunlit Sanctuary (1800, 1600)
const WORLD_SPAWNS: SpawnPoint[] = [
  // Whispering Woods (West / NW)
  { kind: 'slime', x: 1180, y: 1380 },
  { kind: 'slime', x: 1120, y: 1640 },
  { kind: 'slime', x: 1020, y: 1160 },
  { kind: 'slime', x: 940, y: 1480 },
  { kind: 'boar', x: 850, y: 1120 },
  { kind: 'boar', x: 810, y: 1450 },
  { kind: 'boar', x: 700, y: 1250 },
  { kind: 'golem', x: 630, y: 890 },
  { kind: 'golem', x: 670, y: 1520 },
  { kind: 'boss_treant', x: BOSSES_DATA.boss_treant.spawnX, y: BOSSES_DATA.boss_treant.spawnY },

  // Frozen Highlands (North / NE)
  { kind: 'frost_wolf', x: 1760, y: 880 },
  { kind: 'frost_wolf', x: 2040, y: 820 },
  { kind: 'frost_wolf', x: 2260, y: 740 },
  { kind: 'frost_valkyrie', x: 1640, y: 620 },
  { kind: 'frost_valkyrie', x: 2280, y: 520 },
  { kind: 'ice_golem', x: 1840, y: 540 },
  { kind: 'ice_golem', x: 2140, y: 480 },
  { kind: 'boss_frost', x: BOSSES_DATA.boss_frost.spawnX, y: BOSSES_DATA.boss_frost.spawnY },

  // Ashen Ruins (South / SW)
  { kind: 'stalker', x: 1280, y: 2240 },
  { kind: 'stalker', x: 1040, y: 2320 },
  { kind: 'imp', x: 1220, y: 2540 },
  { kind: 'imp', x: 840, y: 2480 },
  { kind: 'imp', x: 1340, y: 2820 },
  { kind: 'knight', x: 920, y: 2660 },
  { kind: 'knight', x: 1180, y: 2760 },
  { kind: 'boss_lich', x: BOSSES_DATA.boss_lich.spawnX, y: BOSSES_DATA.boss_lich.spawnY },

  // Dragon's Caldera (East / SE)
  { kind: 'wyrmling', x: 2580, y: 1980 },
  { kind: 'wyrmling', x: 2740, y: 2340 },
  { kind: 'wyrmling', x: 2860, y: 1860 },
  { kind: 'wyrmling', x: 3180, y: 2160 },
  { kind: 'boss_wyrm', x: BOSSES_DATA.boss_wyrm.spawnX, y: BOSSES_DATA.boss_wyrm.spawnY },
];

interface ServerPlayer extends PlayerState {
  ws: WebSocket;
  inputDx: number;
  inputDy: number;
  isSprinting?: boolean;
  mpRegenMult: number;
  hpRegenFlat: number;
  lifestealOnKillPct: number;
  evasionChance: number;
  lastBarrierNoticeAt: number;
  lastPetAssistAt: number;
  lastFountainHealAt: number;
}

interface ServerMonster extends MonsterState {
  spawnX: number;
  spawnY: number;
  template: MonsterTemplate;
  targetId: string | null;
  stateTimerMs: number;
  damageContributors: Map<string, number>;
}

interface ServerSummon extends SummonState {
  damage: number;
  expiresAt: number;
  lastAttackAt: number;
}

interface ServerProjectile extends ProjectileState {
  damage: number;
  expiresAt: number;
  piercing: boolean;
  hitIds: Set<string>;
}

interface ServerLoot extends LootDrop {
  expiresAt: number;
}

interface PendingRespawn {
  spawn: SpawnPoint;
  respawnAt: number;
}

interface RealmInstance {
  code: string;
  weather: WeatherType;
  weatherNextChangeAt: number;
  worldBossKillsCount: number;
  worldBossNextSpawnAt: number;
  worldBossActiveId: string | null;
  players: Map<string, ServerPlayer>;
  monsters: Map<string, ServerMonster>;
  summons: ServerSummon[];
  projectiles: ServerProjectile[];
  loot: ServerLoot[];
  groups: Map<string, GroupInfo>;
  merchantStocks: Map<string, MerchantStockState>;
  events: CombatEvent[];
  pendingRespawns: PendingRespawn[];
  chatHistory: ChatMessage[];
  lastEmptyAt: number;
}

let uidCounter = 1;
function nextId(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

function scoreEquipItem(def: ItemDef | undefined): number {
  if (!def?.stats) return 0;
  const s = def.stats;
  return (
    (s.attack || 0) * 2.4 +
    (s.defense || 0) * 1.6 +
    (s.maxHp || 0) * 0.16 +
    (s.maxMp || 0) * 0.1 +
    (s.critChancePct || 0) * 3.5 +
    (s.speedBonus || 0) * 0.9 +
    (s.mountSpeedBonus || 0) * 50 +
    (s.mountStaminaBonus || 0) * 0.6
  );
}

function resolveObstacleCollisions(x: number, y: number, entityRadius: number): { x: number; y: number } {
  let nx = clamp(x, entityRadius + 16, WORLD_WIDTH - entityRadius - 16);
  let ny = clamp(y, entityRadius + 16, WORLD_HEIGHT - entityRadius - 16);

  for (const obs of WORLD_OBSTACLES) {
    const dx = nx - obs.x;
    const dy = ny - obs.y;
    const d = Math.hypot(dx, dy);
    const minDist = obs.radius + entityRadius;
    if (d < minDist) {
      if (d < 0.001) {
        nx += minDist;
      } else {
        const push = minDist - d;
        nx += (dx / d) * push;
        ny += (dy / d) * push;
      }
    }
  }
  return {
    x: clamp(nx, entityRadius + 16, WORLD_WIDTH - entityRadius - 16),
    y: clamp(ny, entityRadius + 16, WORLD_HEIGHT - entityRadius - 16),
  };
}

function computeDerivedStats(
  heroClass: HeroClass,
  jobId: string | null,
  level: number,
  stats: PlayerStats,
  weaponTier: number,
  armorTier: number,
  gearBonuses: GearBonuses,
  unlockedSkillNodes: string[],
  equipment: EquippedGear,
  activeBuffs: ActiveBuffs,
  weather: WeatherType,
  now: number
) {
  const cfg = CLASSES_DATA[heroClass];
  const classPassives = SKILLS_DATA[heroClass].passives;
  const treeNodes = SKILL_TREES_DATA[heroClass];
  const jobBranch = getJobBranchById(jobId);
  const wEffects = WEATHER_PRESETS[weather].effects;

  let bonusMight = 0;
  let bonusVit = 0;
  let bonusAgi = 0;
  let attackPct = now < activeBuffs.attackUntil ? activeBuffs.attackPct : 0;
  let defensePct = 0;
  let maxHpPct = 0;
  let maxMpPct = 0;
  let speedPct = 0;
  let critAdd = 0;
  let cdrPct = 0;
  let mpRegenPct = 0;
  let hpRegenFlat = 0;
  let healPowerPct = 0;
  let lifestealOnKillPct = 0;

  for (const p of classPassives) {
    attackPct += p.bonuses.attackPct || 0;
    defensePct += p.bonuses.defensePct || 0;
    maxHpPct += p.bonuses.maxHpPct || 0;
    maxMpPct += p.bonuses.maxMpPct || 0;
    speedPct += p.bonuses.speedPct || 0;
    critAdd += p.bonuses.critChanceAdd || 0;
    mpRegenPct += p.bonuses.mpRegenPct || 0;
    hpRegenFlat += p.bonuses.hpRegenFlat || 0;
    healPowerPct += p.bonuses.healPowerPct || 0;
    lifestealOnKillPct += p.bonuses.lifestealOnKillPct || 0;
  }

  const unlockedSet = new Set(unlockedSkillNodes);
  for (const node of treeNodes) {
    if (!unlockedSet.has(node.id)) continue;
    bonusMight += node.bonuses.might || 0;
    bonusVit += node.bonuses.vitality || 0;
    bonusAgi += node.bonuses.agility || 0;
    attackPct += node.bonuses.attackPct || 0;
    defensePct += node.bonuses.defensePct || 0;
    maxHpPct += node.bonuses.maxHpPct || 0;
    critAdd += node.bonuses.critChanceAdd || 0;
    speedPct += node.bonuses.speedPct || 0;
    cdrPct += node.bonuses.cooldownReductionPct || 0;
    healPowerPct += node.bonuses.healPowerPct || 0;
  }

  let equipAtk = 0;
  let equipDef = 0;
  let equipHp = 0;
  let equipMp = 0;
  let equipCrit = 0;
  let equipSpd = 0;

  const equippedIds = [equipment.weapon, equipment.armor, equipment.accessory, equipment.mountGear];
  for (const id of equippedIds) {
    if (!id) continue;
    const item = ITEMS_DATA[id];
    if (!item?.stats) continue;
    equipAtk += item.stats.attack || 0;
    equipDef += item.stats.defense || 0;
    equipHp += item.stats.maxHp || 0;
    equipMp += item.stats.maxMp || 0;
    equipCrit += (item.stats.critChancePct || 0) / 100;
    equipSpd += item.stats.speedBonus || 0;
  }

  if (jobBranch) {
    equipAtk += jobBranch.statBonuses.attack;
    equipDef += jobBranch.statBonuses.defense;
    equipHp += jobBranch.statBonuses.maxHp;
    equipMp += jobBranch.statBonuses.maxMp;
    equipCrit += jobBranch.statBonuses.critChancePct / 100;
    equipSpd += jobBranch.statBonuses.speedBonus;
  }

  const buffDef = now < activeBuffs.defenseUntil ? activeBuffs.defenseFlat : 0;

  const totalMight = stats.might + gearBonuses.might + bonusMight;
  const totalVit = stats.vitality + gearBonuses.vitality + bonusVit;
  const totalAgi = stats.agility + gearBonuses.agility + bonusAgi;

  const baseMaxHp = cfg.baseHp + (level - 1) * 24 + totalVit * 16 + armorTier * 22 + equipHp;
  const baseMaxMp = cfg.baseMp + (level - 1) * 8 + totalAgi * 4 + equipMp;
  const baseAtk = cfg.baseAttack + (level - 1) * 4 + totalMight * 3.5 + weaponTier * 7 + equipAtk;
  const baseDef = cfg.baseDefense + (level - 1) * 1.2 + totalVit * 1.1 + armorTier * 3.2 + equipDef + buffDef;
  const baseSpd = cfg.baseSpeed + Math.min(85, totalAgi * 4.5) + equipSpd;

  return {
    maxHp: Math.round(baseMaxHp * (1 + maxHpPct)),
    maxMp: Math.round(baseMaxMp * (1 + maxMpPct)),
    attackPower: Math.round(baseAtk * (1 + attackPct) * wEffects.attackMult),
    defense: Math.round(baseDef * (1 + defensePct) * wEffects.defenseMult),
    speed: Math.round(baseSpd * (1 + speedPct) * wEffects.speedMult),
    critChance: Math.min(0.78, 0.08 + totalAgi * 0.015 + critAdd + equipCrit + wEffects.critBonusPct),
    cooldownReductionPct: Math.min(0.5, cdrPct + wEffects.cdrBonusPct),
    healPowerMult: 1 + healPowerPct,
    mpRegenMult: (1 + mpRegenPct) * wEffects.mpRegenMult,
    hpRegenFlat,
    lifestealOnKillPct,
    evasionChance: wEffects.evasionChance,
  };
}

export class MmoGameEngine {
  private realms = new Map<string, RealmInstance>();
  private socketToSession = new Map<WebSocket, { realmCode: string; playerId: string }>();
  private tickHandle: NodeJS.Timeout | null = null;
  private lastTickTime = Date.now();

  constructor() {
    this.getOrCreateRealm(PUBLIC_REALM_CODE);
  }

  public start() {
    if (this.tickHandle) return;
    this.lastTickTime = Date.now();
    this.tickHandle = setInterval(() => this.tick(), 50);
  }

  public stop() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  public getRealmSummaries(): Array<{ code: string; playerCount: number; isPublic: boolean }> {
    const list: Array<{ code: string; playerCount: number; isPublic: boolean }> = [];
    for (const [code, realm] of this.realms.entries()) {
      list.push({
        code,
        playerCount: realm.players.size,
        isPublic: code === PUBLIC_REALM_CODE,
      });
    }
    return list;
  }

  private createInitialMerchantStocks(now: number): Map<string, MerchantStockState> {
    const map = new Map<string, MerchantStockState>();
    for (const shop of Object.values(MERCHANT_SHOPS_DATA)) {
      map.set(shop.merchantId, {
        merchantId: shop.merchantId,
        items: shop.listings.map((l) => ({
          itemId: l.itemId,
          stock: l.maxStock,
          maxStock: l.maxStock,
          nextRestockAt: now + l.restockIntervalMs,
        })),
      });
    }
    return map;
  }

  private getOrCreateRealm(rawCode: string): RealmInstance {
    const code =
      (rawCode || PUBLIC_REALM_CODE).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) ||
      PUBLIC_REALM_CODE;
    let realm = this.realms.get(code);
    if (!realm) {
      const now = Date.now();
      const firstPick = pickRandomNextWeather('storm');
      realm = {
        code,
        weather: firstPick.weather,
        weatherNextChangeAt: now + firstPick.nextDurationMs,
        worldBossKillsCount: 0,
        worldBossNextSpawnAt: now + WORLD_BOSS_SPAWN_TIMER_MS,
        worldBossActiveId: null,
        players: new Map(),
        monsters: new Map(),
        summons: [],
        projectiles: [],
        loot: [],
        groups: new Map(),
        merchantStocks: this.createInitialMerchantStocks(now),
        events: [],
        pendingRespawns: [],
        chatHistory: [],
        lastEmptyAt: now,
      };
      for (const sp of WORLD_SPAWNS) {
        const monster = this.createMonsterFromSpawn(sp);
        realm.monsters.set(monster.id, monster);
      }
      this.realms.set(code, realm);
    }
    return realm;
  }

  private createMonsterFromSpawn(sp: SpawnPoint): ServerMonster {
    const tpl = MONSTER_TEMPLATES[sp.kind];
    return {
      id: nextId('mob'),
      kind: tpl.kind,
      name: tpl.name,
      level: tpl.level,
      zone: tpl.zone,
      x: sp.x,
      y: sp.y,
      spawnX: sp.x,
      spawnY: sp.y,
      hp: tpl.maxHp,
      maxHp: tpl.maxHp,
      radius: tpl.radius,
      isBoss: tpl.isBoss,
      isWorldBoss: tpl.isWorldBoss,
      phase: tpl.isBoss ? 1 : undefined,
      telegraphName: tpl.bossDef ? tpl.bossDef.phases[0].telegraphName : undefined,
      aiState: 'idle',
      facingAngle: Math.PI,
      windupX: sp.x,
      windupY: sp.y,
      windupRadius: tpl.aoeRadius || 60,
      windupProgress: 0,
      hitFlashUntil: 0,
      slowedUntil: 0,
      stunnedUntil: 0,
      template: tpl,
      targetId: null,
      stateTimerMs: 0,
      damageContributors: new Map(),
    };
  }

  public handleConnection(ws: WebSocket) {
    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }
      this.handleClientMessage(ws, msg);
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });
  }

  private sendTo(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastChat(realm: RealmInstance, message: ChatMessage) {
    realm.chatHistory.push(message);
    if (realm.chatHistory.length > 40) {
      realm.chatHistory.shift();
    }
    const payload = JSON.stringify({ type: 'chat', message } satisfies ServerMessage);
    for (const p of realm.players.values()) {
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(payload);
      }
    }
  }

  private countItemInInventory(player: ServerPlayer, itemId: string): number {
    let total = 0;
    for (const slot of player.inventory) {
      if (slot && slot.itemId === itemId) total += slot.quantity;
    }
    return total;
  }

  private syncPotionCounter(player: ServerPlayer) {
    player.potions = this.countItemInInventory(player, 'con_vitality_potion');
  }

  private canFitItemsInInventory(
    inventory: (InventorySlot | null)[],
    maxSlots: number,
    additions: { itemId: string; quantity: number }[]
  ): boolean {
    const sim = inventory.slice(0, maxSlots).map((s) => (s ? { ...s } : null));
    while (sim.length < maxSlots) sim.push(null);

    for (const add of additions) {
      const def = ITEMS_DATA[add.itemId];
      if (!def || add.quantity <= 0) continue;
      let rem = add.quantity;
      if (def.stackable) {
        for (let i = 0; i < sim.length && rem > 0; i++) {
          const cur = sim[i];
          if (cur && cur.itemId === add.itemId && cur.quantity < def.maxStack) {
            const room = def.maxStack - cur.quantity;
            const put = Math.min(room, rem);
            cur.quantity += put;
            rem -= put;
          }
        }
      }
      for (let i = 0; i < sim.length && rem > 0; i++) {
        if (!sim[i]) {
          const put = def.stackable ? Math.min(def.maxStack, rem) : 1;
          sim[i] = { itemId: add.itemId, quantity: put };
          rem -= put;
        }
      }
      if (rem > 0) return false;
    }
    return true;
  }

  private tryAddItemToInventory(
    player: ServerPlayer,
    itemId: string,
    quantity: number,
    notifyOnFull = true
  ): boolean {
    const def = ITEMS_DATA[itemId];
    if (!def || quantity <= 0) return false;

    if (!this.canFitItemsInInventory(player.inventory, player.inventorySlots, [{ itemId, quantity }])) {
      if (notifyOnFull) {
        this.sendTo(player.ws, {
          type: 'notification',
          message: `Inventory Full (${player.inventorySlots}/${player.inventorySlots} slots)! Sell or sort items to pick up ${def.name}.`,
          tone: 'warning',
        });
      }
      return false;
    }

    let rem = quantity;
    if (def.stackable) {
      for (let i = 0; i < player.inventorySlots && rem > 0; i++) {
        const slot = player.inventory[i];
        if (slot && slot.itemId === itemId && slot.quantity < def.maxStack) {
          const room = def.maxStack - slot.quantity;
          const put = Math.min(room, rem);
          slot.quantity += put;
          rem -= put;
        }
      }
    }
    for (let i = 0; i < player.inventorySlots && rem > 0; i++) {
      if (!player.inventory[i]) {
        const put = def.stackable ? Math.min(def.maxStack, rem) : 1;
        player.inventory[i] = { itemId, quantity: put };
        rem -= put;
      }
    }

    this.syncPotionCounter(player);
    this.syncCollectQuestProgress(player);
    return true;
  }

  private consumeItemFromInventory(player: ServerPlayer, itemId: string, quantity: number): boolean {
    if (this.countItemInInventory(player, itemId) < quantity) return false;
    let rem = quantity;
    for (let i = 0; i < player.inventorySlots && rem > 0; i++) {
      const slot = player.inventory[i];
      if (!slot || slot.itemId !== itemId) continue;
      const take = Math.min(slot.quantity, rem);
      slot.quantity -= take;
      rem -= take;
      if (slot.quantity <= 0) {
        player.inventory[i] = null;
      }
    }
    this.syncPotionCounter(player);
    this.syncCollectQuestProgress(player);
    return true;
  }

  private syncCollectQuestProgress(player: ServerPlayer) {
    for (const qProg of player.activeQuests) {
      const qDef = QUESTS_DATA[qProg.questId];
      if (!qDef || qDef.type !== 'collect' || !qDef.targetItemId) continue;
      const count = this.countItemInInventory(player, qDef.targetItemId);
      qProg.progress = Math.min(qDef.targetCount, count);
      qProg.completed = qProg.progress >= qDef.targetCount;
    }
  }

  private syncReachQuestProgress(player: ServerPlayer, zoneId: ZoneId) {
    for (const qProg of player.activeQuests) {
      const qDef = QUESTS_DATA[qProg.questId];
      if (!qDef || qDef.type !== 'reach' || qDef.targetZoneId !== zoneId) continue;
      if (!qProg.completed) {
        qProg.progress = 1;
        qProg.completed = true;
        this.sendTo(player.ws, {
          type: 'notification',
          message: `Quest Objective Complete: ${qDef.title} — Return or speak to ${NPCS_DATA[qDef.turnInNpcId]?.name || 'NPC'}!`,
          tone: 'success',
        });
        this.syncProfile(player);
      }
    }
  }

  private syncProfile(player: ServerPlayer) {
    const profile: SavedProfile = {
      playerId: player.id,
      name: player.name,
      heroClass: player.heroClass,
      jobId: player.jobId,
      unlockedJobs: [...player.unlockedJobs],
      level: player.level,
      xp: player.xp,
      gold: player.gold,
      potions: player.potions,
      kills: player.kills,
      bossKills: player.bossKills,
      statPoints: player.statPoints,
      skillPoints: player.skillPoints,
      stats: { ...player.stats },
      unlockedSkillNodes: [...player.unlockedSkillNodes],
      unlockedMounts: [...player.unlockedMounts],
      activeMount: player.activeMount,
      unlockedPets: [...player.unlockedPets],
      activePetId: player.activePet ? player.activePet.id : null,
      petLevel: player.petLevel,
      petXp: player.petXp,
      weaponTier: player.weaponTier,
      armorTier: player.armorTier,
      gearBonuses: { ...player.gearBonuses },
      inventorySlots: player.inventorySlots,
      inventory: player.inventory.map((s) => (s ? { ...s } : null)),
      equipment: { ...player.equipment },
      activeQuests: player.activeQuests.map((q) => ({ ...q })),
      completedQuestIds: [...player.completedQuestIds],
      unlockedZones: [...player.unlockedZones],
      updatedAt: Date.now(),
    };
    this.sendTo(player.ws, { type: 'profile_sync', profile });
  }

  private recomputeGroupUnlockedZones(realm: RealmInstance, grp: GroupInfo) {
    const unlocked = new Set<ZoneId>(DEFAULT_UNLOCKED_ZONES);
    for (const memberId of grp.memberIds) {
      const m = realm.players.get(memberId);
      if (!m) continue;
      for (const z of m.unlockedZones) unlocked.add(z);
    }
    grp.unlockedZones = Array.from(unlocked);
  }

  private canAccessZone(realm: RealmInstance, player: ServerPlayer, zoneId: ZoneId): boolean {
    const zDef = getZoneById(zoneId);
    if (zDef.unlockedByDefault) return true;
    if (player.unlockedZones.includes(zoneId)) return true;
    if (player.groupId) {
      const grp = realm.groups.get(player.groupId);
      if (grp && grp.unlockedZones.includes(zoneId)) return true;
    }
    return false;
  }

  private removeFromGroup(realm: RealmInstance, player: ServerPlayer) {
    if (!player.groupId) return;
    const grp = realm.groups.get(player.groupId);
    player.groupId = null;
    if (!grp) return;

    grp.memberIds = grp.memberIds.filter((id) => id !== player.id);
    if (grp.memberIds.length === 0) {
      realm.groups.delete(grp.id);
      return;
    }
    if (grp.leaderId === player.id) {
      grp.leaderId = grp.memberIds[0];
      const newLeader = realm.players.get(grp.leaderId);
      if (newLeader) {
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Group',
          text: `${newLeader.name} is now the group leader.`,
          timestamp: Date.now(),
          isSystem: true,
        });
      }
    }
    this.recomputeGroupUnlockedZones(realm, grp);
  }

  private handleDisconnect(ws: WebSocket) {
    const session = this.socketToSession.get(ws);
    if (!session) return;
    this.socketToSession.delete(ws);

    const realm = this.realms.get(session.realmCode);
    if (!realm) return;
    const player = realm.players.get(session.playerId);
    if (player) {
      this.removeFromGroup(realm, player);
      realm.players.delete(session.playerId);
      this.broadcastChat(realm, {
        id: nextId('sys'),
        senderId: 'system',
        senderName: 'Realm',
        text: `${player.name} left the realm.`,
        timestamp: Date.now(),
        isSystem: true,
      });
    }
    if (realm.players.size === 0) {
      realm.lastEmptyAt = Date.now();
    }
  }

  private handleClientMessage(ws: WebSocket, msg: ClientMessage) {
    const now = Date.now();

    if (msg.type === 'join') {
      this.handleDisconnect(ws);

      const realm = this.getOrCreateRealm(msg.realmCode);
      const prof = msg.profile;
      const heroClass: HeroClass = CLASSES_DATA[prof.heroClass] ? prof.heroClass : 'warrior';
      const playerId = prof.playerId && prof.playerId.length >= 4 ? prof.playerId : nextId('hero');
      const safeName = (prof.name || 'Adventurer').trim().slice(0, 18) || 'Adventurer';

      const level = clamp(Math.floor(prof.level || 1), 1, 99);
      const stats: PlayerStats = {
        might: clamp(Math.floor(prof.stats?.might || 0), 0, 200),
        vitality: clamp(Math.floor(prof.stats?.vitality || 0), 0, 200),
        agility: clamp(Math.floor(prof.stats?.agility || 0), 0, 200),
      };
      const weaponTier = clamp(Math.floor(prof.weaponTier || 0), 0, 50);
      const armorTier = clamp(Math.floor(prof.armorTier || 0), 0, 50);
      const gearBonuses: GearBonuses = {
        might: clamp(Math.floor(prof.gearBonuses?.might || 0), 0, 100),
        vitality: clamp(Math.floor(prof.gearBonuses?.vitality || 0), 0, 100),
        agility: clamp(Math.floor(prof.gearBonuses?.agility || 0), 0, 100),
        bestGearName: prof.gearBonuses?.bestGearName || 'Traveler Emblem',
        bestGearRarity: prof.gearBonuses?.bestGearRarity || 'common',
      };

      const inventorySlots = clamp(
        Math.floor(prof.inventorySlots || STARTING_INVENTORY_SLOTS),
        STARTING_INVENTORY_SLOTS,
        MAX_INVENTORY_SLOTS
      );
      const inventory: (InventorySlot | null)[] = Array.from({ length: inventorySlots }, (_, idx) => {
        const s = Array.isArray(prof.inventory) ? prof.inventory[idx] : null;
        if (!s || !ITEMS_DATA[s.itemId]) return null;
        const maxS = ITEMS_DATA[s.itemId].stackable ? Math.min(MAX_ITEM_STACK, ITEMS_DATA[s.itemId].maxStack) : 1;
        return { itemId: s.itemId, quantity: clamp(Math.floor(s.quantity || 1), 1, maxS) };
      });
      if (!Array.isArray(prof.inventory)) {
        inventory[0] = { itemId: 'con_vitality_potion', quantity: Math.max(1, Math.floor(prof.potions ?? 3)) };
        inventory[1] = { itemId: 'con_aether_elixir', quantity: 2 };
      }

      const equipment: EquippedGear = {
        weapon: prof.equipment?.weapon && ITEMS_DATA[prof.equipment.weapon]?.category === 'weapon' ? prof.equipment.weapon : null,
        armor: prof.equipment?.armor && ITEMS_DATA[prof.equipment.armor]?.category === 'armor' ? prof.equipment.armor : null,
        accessory: prof.equipment?.accessory && ITEMS_DATA[prof.equipment.accessory]?.category === 'accessory' ? prof.equipment.accessory : null,
        mountGear: prof.equipment?.mountGear && ITEMS_DATA[prof.equipment.mountGear]?.category === 'mount_gear' ? prof.equipment.mountGear : null,
      };

      const validBranch = getJobBranchById(prof.jobId);
      const jobId = validBranch && validBranch.baseClass === heroClass ? validBranch.id : null;
      const unlockedJobs = Array.isArray(prof.unlockedJobs)
        ? prof.unlockedJobs.filter((jid) => {
            const b = getJobBranchById(jid);
            return b && b.baseClass === heroClass;
          })
        : [];
      if (jobId && !unlockedJobs.includes(jobId)) {
        unlockedJobs.push(jobId);
      }

      const unlockedZonesSet = new Set<ZoneId>(DEFAULT_UNLOCKED_ZONES);
      if (Array.isArray(prof.unlockedZones)) {
        for (const z of prof.unlockedZones) {
          if (WORLD_ZONES.some((wz) => wz.id === z)) unlockedZonesSet.add(z);
        }
      }

      const activeQuests: ActiveQuestProgress[] = Array.isArray(prof.activeQuests)
        ? prof.activeQuests
            .filter((q) => q && QUESTS_DATA[q.questId])
            .map((q) => ({
              questId: q.questId,
              progress: clamp(Math.floor(q.progress || 0), 0, QUESTS_DATA[q.questId].targetCount),
              completed: Boolean(q.completed),
            }))
        : [];
      const completedQuestIds: string[] = Array.isArray(prof.completedQuestIds)
        ? prof.completedQuestIds.filter((id) => Boolean(QUESTS_DATA[id]))
        : [];

      const validTreeIds = new Set(SKILL_TREES_DATA[heroClass].map((n) => n.id));
      const unlockedSkillNodes = Array.isArray(prof.unlockedSkillNodes)
        ? prof.unlockedSkillNodes.filter((id) => validTreeIds.has(id))
        : [];
      const unlockedMounts: MountId[] = Array.isArray(prof.unlockedMounts)
        ? prof.unlockedMounts.filter((m): m is MountId => Boolean(MOUNTS_DATA[m]))
        : [];
      const activeMount: MountId | null =
        prof.activeMount && unlockedMounts.includes(prof.activeMount)
          ? prof.activeMount
          : unlockedMounts[0] || null;
      const mountGearItem = equipment.mountGear ? ITEMS_DATA[equipment.mountGear] : null;
      const mountMaxStam =
        (activeMount ? MOUNTS_DATA[activeMount].maxStamina : 100) + (mountGearItem?.stats?.mountStaminaBonus || 0);

      const unlockedPets: PetId[] = Array.isArray(prof.unlockedPets)
        ? prof.unlockedPets.filter((pid): pid is PetId => Boolean(PETS_DATA[pid]))
        : [];
      const petLevel = clamp(Math.floor(prof.petLevel || 1), 1, 99);
      const petXp = Math.max(0, Math.floor(prof.petXp || 0));
      const chosenPetId =
        prof.activePetId && unlockedPets.includes(prof.activePetId) ? prof.activePetId : null;

      const activeBuffs: ActiveBuffs = {
        attackPct: 0,
        attackUntil: 0,
        defenseFlat: 0,
        defenseUntil: 0,
      };

      const derived = computeDerivedStats(
        heroClass,
        jobId,
        level,
        stats,
        weaponTier,
        armorTier,
        gearBonuses,
        unlockedSkillNodes,
        equipment,
        activeBuffs,
        realm.weather,
        now
      );

      const finalId = realm.players.has(playerId)
        ? `${playerId}_${Math.random().toString(36).slice(2, 5)}`
        : playerId;

      const spawnAngle = Math.random() * Math.PI * 2;
      const spawnX = SANCTUARY_FOUNTAIN.x + Math.cos(spawnAngle) * 76;
      const spawnY = SANCTUARY_FOUNTAIN.y + Math.sin(spawnAngle) * 76;

      const player: ServerPlayer = {
        ws,
        id: finalId,
        name: safeName,
        heroClass,
        jobId,
        unlockedJobs,
        x: spawnX,
        y: spawnY,
        flightHeight: 0,
        facingAngle: 0,
        hp: derived.maxHp,
        maxHp: derived.maxHp,
        mp: derived.maxMp,
        maxMp: derived.maxMp,
        level,
        xp: Math.max(0, Math.floor(prof.xp || 0)),
        xpToNext: xpForNextLevel(level),
        gold: Math.max(0, Math.floor(prof.gold ?? 90)),
        potions: 0,
        kills: Math.max(0, Math.floor(prof.kills || 0)),
        bossKills: Math.max(0, Math.floor(prof.bossKills || 0)),
        statPoints: Math.max(0, Math.floor(prof.statPoints || 0)),
        skillPoints: Math.max(0, Math.floor(prof.skillPoints ?? 1)),
        stats,
        unlockedSkillNodes,
        unlockedMounts,
        activeMount,
        isMounted: false,
        mountStamina: mountMaxStam,
        maxMountStamina: mountMaxStam,
        mountSpecialCooldownMs: 0,
        unlockedPets,
        activePet: chosenPetId
          ? {
              id: chosenPetId,
              level: petLevel,
              xp: petXp,
              xpToNext: petXpForNextLevel(petLevel),
              x: spawnX - 30,
              y: spawnY - 30,
              facingAngle: 0,
            }
          : null,
        petLevel,
        petXp,
        weaponTier,
        armorTier,
        gearBonuses,
        inventorySlots,
        inventory,
        equipment,
        activeQuests,
        completedQuestIds,
        unlockedZones: Array.from(unlockedZonesSet),
        activeBuffs,
        attackPower: derived.attackPower,
        defense: derived.defense,
        speed: derived.speed,
        critChance: derived.critChance,
        cooldownReductionPct: derived.cooldownReductionPct,
        healPowerMult: derived.healPowerMult,
        cooldowns: [0, 0, 0, 0, 0, 0, 0, 0],
        lastAttackAt: 0,
        comboStep: 1,
        weaponStance: 0,
        stunnedUntil: 0,
        isDead: false,
        respawnTimerMs: 0,
        speedBuffUntil: 0,
        hitFlashUntil: 0,
        rallyCooldownUntil: 0,
        groupId: null,
        inputDx: 0,
        inputDy: 0,
        mpRegenMult: derived.mpRegenMult,
        hpRegenFlat: derived.hpRegenFlat,
        lifestealOnKillPct: derived.lifestealOnKillPct,
        evasionChance: derived.evasionChance,
        lastBarrierNoticeAt: 0,
        lastPetAssistAt: 0,
        lastFountainHealAt: 0,
      };
      this.syncPotionCounter(player);
      this.syncCollectQuestProgress(player);

      realm.players.set(finalId, player);
      this.socketToSession.set(ws, { realmCode: realm.code, playerId: finalId });

      this.sendTo(ws, {
        type: 'welcome',
        playerId: finalId,
        realmCode: realm.code,
        serverTime: now,
      });

      for (const ch of realm.chatHistory.slice(-12)) {
        this.sendTo(ws, { type: 'chat', message: ch });
      }

      const jobTitle = validBranch ? validBranch.name : CLASSES_DATA[player.heroClass].name;
      this.broadcastChat(realm, {
        id: nextId('sys'),
        senderId: 'system',
        senderName: 'Realm',
        text: `${player.name} (Lv.${player.level} ${jobTitle}) entered the realm.`,
        timestamp: now,
        isSystem: true,
      });

      this.syncProfile(player);
      return;
    }

    const session = this.socketToSession.get(ws);
    if (!session) return;
    const realm = this.realms.get(session.realmCode);
    if (!realm) return;
    const player = realm.players.get(session.playerId);
    if (!player) return;

    switch (msg.type) {
      case 'input': {
        const len = Math.hypot(msg.dx, msg.dy);
        if (len > 0.001) {
          player.inputDx = msg.dx / Math.max(1, len);
          player.inputDy = msg.dy / Math.max(1, len);
        } else {
          player.inputDx = 0;
          player.inputDy = 0;
        }
        player.isSprinting = Boolean(msg.sprint);
        if (Number.isFinite(msg.aimAngle)) {
          player.facingAngle = msg.aimAngle;
        }
        if (typeof msg.flightHeight === 'number' && Number.isFinite(msg.flightHeight)) {
          const mDef = player.isMounted && player.activeMount ? MOUNTS_DATA[player.activeMount] : null;
          if (mDef?.canFly) {
            player.flightHeight = clamp(msg.flightHeight, 0, mDef.maxFlightHeight);
          } else {
            player.flightHeight = 0;
          }
        }
        break;
      }

      case 'attack': {
        if (player.isDead || (player.stunnedUntil && now < player.stunnedUntil)) return;
        this.handleBasicAttack(realm, player, msg.aimAngle, now);
        break;
      }

      case 'switch_weapon': {
        player.weaponStance = player.weaponStance === 1 ? 0 : 1;
        break;
      }

      case 'cast_skill': {
        if (player.isDead) return;
        this.handleCastSkill(realm, player, msg.skillIndex, msg.aimX, msg.aimY, msg.aimAngle, now);
        break;
      }

      case 'use_potion': {
        if (player.isDead) return;
        const potSlotIdx = player.inventory.findIndex((s) => s?.itemId === 'con_vitality_potion');
        if (potSlotIdx >= 0) {
          this.handleUseInventorySlot(realm, player, potSlotIdx, now);
        }
        break;
      }

      case 'hit_fountain': {
        if (player.isDead) return;
        const d = dist(player.x, player.y, SANCTUARY_FOUNTAIN.x, SANCTUARY_FOUNTAIN.y);
        if (d > SANCTUARY_FOUNTAIN.radius + 95) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: 'Move closer to the Sanctuary Fountain to restore HP & MP.',
            tone: 'info',
          });
          return;
        }
        if (now - player.lastFountainHealAt < 500) return;
        player.lastFountainHealAt = now;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.mountStamina = player.maxMountStamina;
        realm.events.push({
          id: nextId('ev'),
          type: 'heal',
          x: player.x,
          y: player.y - 26,
          text: 'Full HP & MP Restored!',
          color: '#34D399',
          playerId: player.id,
        });
        break;
      }

      case 'inv_move': {
        const { fromIndex, toIndex } = msg;
        if (
          fromIndex < 0 ||
          fromIndex >= player.inventorySlots ||
          toIndex < 0 ||
          toIndex >= player.inventorySlots ||
          fromIndex === toIndex
        ) {
          return;
        }
        const fromSlot = player.inventory[fromIndex];
        const toSlot = player.inventory[toIndex];
        if (!fromSlot) return;

        if (toSlot && toSlot.itemId === fromSlot.itemId) {
          const def = ITEMS_DATA[fromSlot.itemId];
          if (def?.stackable && toSlot.quantity < def.maxStack) {
            const room = def.maxStack - toSlot.quantity;
            const moveQty = Math.min(room, fromSlot.quantity);
            toSlot.quantity += moveQty;
            fromSlot.quantity -= moveQty;
            if (fromSlot.quantity <= 0) player.inventory[fromIndex] = null;
            this.syncPotionCounter(player);
            this.syncProfile(player);
            return;
          }
        }
        player.inventory[toIndex] = fromSlot;
        player.inventory[fromIndex] = toSlot || null;
        this.syncProfile(player);
        break;
      }

      case 'inv_use': {
        if (player.isDead) return;
        this.handleUseInventorySlot(realm, player, msg.slotIndex, now);
        break;
      }

      case 'inv_equip': {
        this.handleEquipInventorySlot(realm, player, msg.slotIndex, now);
        break;
      }

      case 'inv_auto_equip': {
        const slotMapping: Array<{ equipKey: keyof EquippedGear; cat: ItemDef['category'] }> = [
          { equipKey: 'weapon', cat: 'weapon' },
          { equipKey: 'armor', cat: 'armor' },
          { equipKey: 'accessory', cat: 'accessory' },
          { equipKey: 'mountGear', cat: 'mount_gear' },
        ];
        let equippedNames: string[] = [];

        for (const { equipKey, cat } of slotMapping) {
          const curId = player.equipment[equipKey];
          let bestScore = curId ? scoreEquipItem(ITEMS_DATA[curId]) : -1;
          let bestSlotIdx = -1;

          for (let i = 0; i < player.inventorySlots; i++) {
            const s = player.inventory[i];
            if (!s) continue;
            const def = ITEMS_DATA[s.itemId];
            if (!def || def.category !== cat) continue;
            const sc = scoreEquipItem(def);
            if (sc > bestScore) {
              bestScore = sc;
              bestSlotIdx = i;
            }
          }

          if (bestSlotIdx >= 0) {
            const bestSlot = player.inventory[bestSlotIdx]!;
            const newDef = ITEMS_DATA[bestSlot.itemId];
            player.equipment[equipKey] = bestSlot.itemId;
            player.inventory[bestSlotIdx] = curId ? { itemId: curId, quantity: 1 } : null;
            if (newDef) equippedNames.push(newDef.name);
          }
        }

        if (equippedNames.length > 0) {
          if (player.activeMount) {
            const mDef = MOUNTS_DATA[player.activeMount];
            const mountGearDef = player.equipment.mountGear ? ITEMS_DATA[player.equipment.mountGear] : null;
            player.maxMountStamina = mDef.maxStamina + (mountGearDef?.stats?.mountStaminaBonus || 0);
            player.mountStamina = Math.min(player.maxMountStamina, player.mountStamina);
          }
          this.recalculatePlayer(player, true, now);
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Auto-equipped best gear: ${equippedNames.join(', ')}`,
            tone: 'success',
          });
          realm.events.push({
            id: nextId('ev'),
            type: 'loot',
            x: player.x,
            y: player.y - 28,
            text: 'Best Gear Equipped!',
            color: '#60A5FA',
          });
          this.syncProfile(player);
        } else {
          this.sendTo(player.ws, {
            type: 'notification',
            message: 'Your strongest gear is already equipped.',
            tone: 'info',
          });
        }
        break;
      }

      case 'inv_unequip': {
        const slotKey = msg.equipSlot;
        const equippedId = player.equipment[slotKey];
        if (!equippedId) return;
        if (!this.tryAddItemToInventory(player, equippedId, 1, true)) return;
        player.equipment[slotKey] = null;
        this.recalculatePlayer(player, true, now);
        this.syncProfile(player);
        break;
      }

      case 'inv_sort': {
        const merged = new Map<string, number>();
        const unstackables: InventorySlot[] = [];
        for (let i = 0; i < player.inventorySlots; i++) {
          const s = player.inventory[i];
          if (!s) continue;
          const def = ITEMS_DATA[s.itemId];
          if (!def) continue;
          if (def.stackable) {
            merged.set(s.itemId, (merged.get(s.itemId) || 0) + s.quantity);
          } else {
            unstackables.push({ ...s });
          }
        }
        const sorted: InventorySlot[] = [];
        const rarityRank: Record<LootRarity, number> = {
          legendary: 5,
          epic: 4,
          rare: 3,
          uncommon: 2,
          common: 1,
        };
        for (const [itemId, total] of merged.entries()) {
          const maxS = ITEMS_DATA[itemId]?.maxStack || MAX_ITEM_STACK;
          let rem = total;
          while (rem > 0) {
            const put = Math.min(maxS, rem);
            sorted.push({ itemId, quantity: put });
            rem -= put;
          }
        }
        sorted.push(...unstackables);
        sorted.sort((a, b) => {
          const da = ITEMS_DATA[a.itemId];
          const db = ITEMS_DATA[b.itemId];
          if (!da || !db) return 0;
          if (da.category !== db.category) return da.category.localeCompare(db.category);
          if (rarityRank[db.rarity] !== rarityRank[da.rarity]) return rarityRank[db.rarity] - rarityRank[da.rarity];
          return da.name.localeCompare(db.name);
        });
        for (let i = 0; i < player.inventorySlots; i++) {
          player.inventory[i] = sorted[i] || null;
        }
        this.syncPotionCounter(player);
        this.syncProfile(player);
        break;
      }

      case 'inv_drop': {
        if (msg.slotIndex < 0 || msg.slotIndex >= player.inventorySlots) return;
        if (!player.inventory[msg.slotIndex]) return;
        player.inventory[msg.slotIndex] = null;
        this.syncPotionCounter(player);
        this.syncCollectQuestProgress(player);
        this.syncProfile(player);
        break;
      }

      case 'accept_quest': {
        const qDef = QUESTS_DATA[msg.questId];
        if (!qDef) return;
        if (player.completedQuestIds.includes(qDef.id)) return;
        if (player.activeQuests.some((q) => q.questId === qDef.id)) return;
        if (player.level < qDef.requiredLevel) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Requires Level ${qDef.requiredLevel} to accept "${qDef.title}".`,
            tone: 'warning',
          });
          return;
        }
        if (qDef.prerequisiteQuestId && !player.completedQuestIds.includes(qDef.prerequisiteQuestId)) return;

        const prog: ActiveQuestProgress = { questId: qDef.id, progress: 0, completed: false };
        player.activeQuests.push(prog);
        this.syncCollectQuestProgress(player);
        if (qDef.type === 'reach' && qDef.targetZoneId && player.unlockedZones.includes(qDef.targetZoneId)) {
          if (getZoneAt(player.x, player.y).id === qDef.targetZoneId) {
            prog.progress = 1;
            prog.completed = true;
          }
        }
        realm.events.push({
          id: nextId('ev'),
          type: 'quest',
          x: player.x,
          y: player.y - 34,
          text: `Quest Accepted: ${qDef.title}`,
          color: '#FBBF24',
        });
        this.syncProfile(player);
        break;
      }

      case 'talk_npc': {
        const npc = NPCS_DATA[msg.npcId];
        if (!npc) return;
        let updated = false;
        for (const qProg of player.activeQuests) {
          const qDef = QUESTS_DATA[qProg.questId];
          if (!qDef) continue;
          if (qDef.type === 'talk' && qDef.targetNpcId === npc.id && !qProg.completed) {
            qProg.progress = qDef.targetCount;
            qProg.completed = true;
            updated = true;
            this.sendTo(player.ws, {
              type: 'notification',
              message: `Spoke with ${npc.name}: "${qDef.title}" ready to complete!`,
              tone: 'success',
            });
          }
        }
        if (updated) this.syncProfile(player);
        break;
      }

      case 'complete_quest': {
        const qDef = QUESTS_DATA[msg.questId];
        if (!qDef) return;
        const idx = player.activeQuests.findIndex((q) => q.questId === qDef.id);
        if (idx < 0) return;
        const qProg = player.activeQuests[idx];
        this.syncCollectQuestProgress(player);
        if (!qProg.completed && qProg.progress < qDef.targetCount) return;

        if (qDef.reward.items && qDef.reward.items.length > 0) {
          if (!this.canFitItemsInInventory(player.inventory, player.inventorySlots, qDef.reward.items)) {
            this.sendTo(player.ws, {
              type: 'notification',
              message: 'Inventory Full! Free up slots before claiming quest rewards.',
              tone: 'warning',
            });
            return;
          }
        }

        if (qDef.type === 'collect' && qDef.targetItemId) {
          if (!this.consumeItemFromInventory(player, qDef.targetItemId, qDef.targetCount)) return;
        }

        player.activeQuests.splice(idx, 1);
        if (!player.completedQuestIds.includes(qDef.id)) {
          player.completedQuestIds.push(qDef.id);
        }

        player.gold += qDef.reward.gold;
        if (qDef.reward.skillPoints) {
          player.skillPoints += qDef.reward.skillPoints;
        }
        if (qDef.reward.items) {
          for (const ri of qDef.reward.items) {
            this.tryAddItemToInventory(player, ri.itemId, ri.quantity, false);
          }
        }
        this.awardXpAndCheckLevel(realm, player, qDef.reward.xp, now, false);

        realm.events.push({
          id: nextId('ev'),
          type: 'quest',
          x: player.x,
          y: player.y - 36,
          text: `Quest Complete: ${qDef.title}!`,
          color: '#34D399',
        });
        this.sendTo(player.ws, {
          type: 'notification',
          message: `Completed "${qDef.title}" (+${qDef.reward.xp} XP, +${qDef.reward.gold}g)`,
          tone: 'success',
        });
        this.syncProfile(player);
        break;
      }

      case 'buy_item': {
        const shop = MERCHANT_SHOPS_DATA[msg.merchantId];
        if (!shop) return;
        const npc = NPCS_DATA[shop.npcId];
        if (npc && dist(player.x, player.y, npc.x, npc.y) > 720) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Move closer to ${npc.name} to trade.`,
            tone: 'warning',
          });
          return;
        }
        const stockState = realm.merchantStocks.get(shop.merchantId);
        if (!stockState) return;
        const stockEntry = stockState.items.find((s) => s.itemId === msg.itemId);
        const itemDef = ITEMS_DATA[msg.itemId];
        if (!stockEntry || !itemDef) return;
        const qty = clamp(Math.floor(msg.quantity || 1), 1, 20);
        if (stockEntry.stock !== -1 && stockEntry.stock < qty) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `${itemDef.name} is out of stock until restock!`,
            tone: 'warning',
          });
          return;
        }
        const totalPrice = itemDef.buyPrice * qty;
        if (player.gold < totalPrice) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Need ${totalPrice}g to buy ${qty}x ${itemDef.name}.`,
            tone: 'warning',
          });
          return;
        }
        if (!this.tryAddItemToInventory(player, itemDef.id, qty, true)) return;

        player.gold -= totalPrice;
        if (stockEntry.stock !== -1) {
          stockEntry.stock -= qty;
        }
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: player.x,
          y: player.y - 26,
          text: `Bought ${itemDef.name}`,
          color: '#FBBF24',
        });
        this.syncProfile(player);
        break;
      }

      case 'sell_item': {
        const shop = MERCHANT_SHOPS_DATA[msg.merchantId];
        if (!shop) return;
        const npc = NPCS_DATA[shop.npcId];
        if (npc && dist(player.x, player.y, npc.x, npc.y) > 720) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Move closer to ${npc.name} to sell items.`,
            tone: 'warning',
          });
          return;
        }
        if (msg.slotIndex < 0 || msg.slotIndex >= player.inventorySlots) return;
        const slot = player.inventory[msg.slotIndex];
        if (!slot) return;
        const itemDef = ITEMS_DATA[slot.itemId];
        if (!itemDef || itemDef.sellPrice <= 0) return;

        const sellQty = clamp(Math.floor(msg.quantity || slot.quantity), 1, slot.quantity);
        const payout = itemDef.sellPrice * sellQty;
        slot.quantity -= sellQty;
        if (slot.quantity <= 0) {
          player.inventory[msg.slotIndex] = null;
        }
        player.gold += payout;
        this.syncPotionCounter(player);
        this.syncCollectQuestProgress(player);
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: player.x,
          y: player.y - 26,
          text: `+${payout}g`,
          color: '#FBBF24',
        });
        this.syncProfile(player);
        break;
      }

      case 'change_job': {
        const branches = JOB_BRANCHES_DATA[player.heroClass];
        const branch = branches.find((b) => b.id === msg.jobId);
        if (!branch) return;

        if (player.unlockedJobs.includes(branch.id)) {
          player.jobId = branch.id;
          this.recalculatePlayer(player, true, now);
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Switched active Job Specialization to ${branch.name}!`,
            tone: 'success',
          });
          this.syncProfile(player);
          return;
        }

        if (player.level < branch.requiredLevel) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Requires Level ${branch.requiredLevel} for ${branch.name}.`,
            tone: 'warning',
          });
          return;
        }
        if (player.gold < branch.goldCost) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Need ${branch.goldCost}g to unlock ${branch.name}.`,
            tone: 'warning',
          });
          return;
        }
        if (branch.requiredQuestId && !player.completedQuestIds.includes(branch.requiredQuestId)) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Complete the "Trial of Ascension" quest first!`,
            tone: 'warning',
          });
          return;
        }
        if (branch.requiredItemId && !this.consumeItemFromInventory(player, branch.requiredItemId, 1)) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Requires 1x ${ITEMS_DATA[branch.requiredItemId]?.name || 'Ascension Seal'}.`,
            tone: 'warning',
          });
          return;
        }

        player.gold -= branch.goldCost;
        player.unlockedJobs.push(branch.id);
        player.jobId = branch.id;
        this.recalculatePlayer(player, true, now);
        player.hp = player.maxHp;
        player.mp = player.maxMp;

        realm.events.push({
          id: nextId('ev'),
          type: 'level_up',
          x: player.x,
          y: player.y,
          text: `JOB T${branch.tier}: ${branch.name.toUpperCase()}!`,
          color: branch.accentColor,
          radius: 110,
          playerId: player.id,
        });
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Job Master',
          text: `${player.name} ascended into ${branch.name} (${branch.epithet})!`,
          timestamp: now,
          isSystem: true,
        });
        this.syncProfile(player);
        break;
      }

      case 'allocate_stat': {
        if (player.statPoints <= 0) return;
        if (!['might', 'vitality', 'agility'].includes(msg.stat)) return;
        player.statPoints -= 1;
        player.stats[msg.stat] += 1;
        this.recalculatePlayer(player, true, now);
        this.syncProfile(player);
        break;
      }

      case 'unlock_skill_node': {
        const tree = SKILL_TREES_DATA[player.heroClass];
        const node = tree.find((n) => n.id === msg.nodeId);
        if (!node) return;
        if (player.unlockedSkillNodes.includes(node.id)) return;
        if (player.skillPoints < node.cost) return;
        const prereqsMet = node.requires.every((req) => player.unlockedSkillNodes.includes(req));
        if (!prereqsMet) return;

        player.skillPoints -= node.cost;
        player.unlockedSkillNodes.push(node.id);
        this.recalculatePlayer(player, true, now);
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: player.x,
          y: player.y - 30,
          text: `${node.name} Unlocked`,
          color: '#A78BFA',
        });
        this.syncProfile(player);
        break;
      }

      case 'unlock_mount': {
        const mDef = MOUNTS_DATA[msg.mountId];
        if (!mDef) return;
        const mountGearItem = player.equipment.mountGear ? ITEMS_DATA[player.equipment.mountGear] : null;
        const stamBonus = mountGearItem?.stats?.mountStaminaBonus || 0;
        if (player.unlockedMounts.includes(msg.mountId)) {
          player.activeMount = msg.mountId;
          player.maxMountStamina = mDef.maxStamina + stamBonus;
          player.mountStamina = player.maxMountStamina;
          if (!mDef.canFly) player.flightHeight = 0;
          this.syncProfile(player);
          return;
        }
        const bossFreeDragon = msg.mountId === 'dragon' && player.bossKills > 0;
        if (!bossFreeDragon) {
          if (player.level < mDef.unlockRequirement.minLevel) {
            this.sendTo(player.ws, {
              type: 'notification',
              message: `Requires Level ${mDef.unlockRequirement.minLevel} to tame ${mDef.name}.`,
              tone: 'warning',
            });
            return;
          }
          if (player.gold < mDef.unlockRequirement.goldCost) {
            this.sendTo(player.ws, {
              type: 'notification',
              message: `Need ${mDef.unlockRequirement.goldCost}g to tame ${mDef.name}.`,
              tone: 'warning',
            });
            return;
          }
          player.gold -= mDef.unlockRequirement.goldCost;
        }
        player.unlockedMounts.push(msg.mountId);
        player.activeMount = msg.mountId;
        player.maxMountStamina = mDef.maxStamina + stamBonus;
        player.mountStamina = player.maxMountStamina;
        player.isMounted = true;
        player.flightHeight = 0;
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: player.x,
          y: player.y - 30,
          text: `Tamed ${mDef.name}!`,
          color: mDef.accentColor,
        });
        this.syncProfile(player);
        break;
      }

      case 'toggle_mount': {
        if (player.isDead) return;
        const mountGearItem = player.equipment.mountGear ? ITEMS_DATA[player.equipment.mountGear] : null;
        const stamBonus = mountGearItem?.stats?.mountStaminaBonus || 0;
        if (msg.mountId && player.unlockedMounts.includes(msg.mountId)) {
          player.activeMount = msg.mountId;
          const mDef = MOUNTS_DATA[msg.mountId];
          player.maxMountStamina = mDef.maxStamina + stamBonus;
          player.mountStamina = Math.min(player.mountStamina, player.maxMountStamina);
          player.isMounted = true;
          if (!mDef.canFly) player.flightHeight = 0;
          this.syncProfile(player);
          return;
        }
        if (!player.activeMount && player.unlockedMounts.length > 0) {
          player.activeMount = player.unlockedMounts[0];
        }
        if (!player.activeMount) return;
        player.isMounted = !player.isMounted;
        if (player.isMounted) {
          const mDef = MOUNTS_DATA[player.activeMount];
          player.maxMountStamina = mDef.maxStamina + stamBonus;
        } else {
          player.flightHeight = 0;
        }
        break;
      }

      case 'mount_special': {
        if (player.isDead || !player.isMounted || !player.activeMount) return;
        if (player.mountSpecialCooldownMs > 0) return;
        const mDef = MOUNTS_DATA[player.activeMount];
        if (player.mountStamina < mDef.specialStaminaCost) return;

        player.mountStamina -= mDef.specialStaminaCost;
        player.mountSpecialCooldownMs = 4500;
        player.facingAngle = msg.aimAngle;

        if (mDef.id === 'wolf' || mDef.id === 'pegasus') {
          const dashPos = this.resolvePlayerMove(
            realm,
            player,
            player.x + Math.cos(msg.aimAngle) * 195,
            player.y + Math.sin(msg.aimAngle) * 195,
            now
          );
          player.x = dashPos.x;
          player.y = dashPos.y;
          realm.events.push({
            id: nextId('ev'),
            type: 'aoe',
            x: player.x,
            y: player.y,
            radius: 120,
            color: mDef.accentColor,
          });
          for (const m of realm.monsters.values()) {
            if (dist(player.x, player.y, m.x, m.y) <= 120 + m.radius) {
              this.damageMonster(realm, m, player, Math.round(player.attackPower * 1.45), now, 42);
            }
          }
        } else if (mDef.id === 'cat' || mDef.id === 'wyvern') {
          const pouncePos = this.resolvePlayerMove(
            realm,
            player,
            player.x + Math.cos(msg.aimAngle) * 155,
            player.y + Math.sin(msg.aimAngle) * 155,
            now
          );
          player.x = pouncePos.x;
          player.y = pouncePos.y;
          realm.events.push({
            id: nextId('ev'),
            type: 'aoe',
            x: player.x,
            y: player.y,
            radius: 155,
            color: mDef.accentColor,
          });
          for (const m of realm.monsters.values()) {
            if (dist(player.x, player.y, m.x, m.y) <= 155 + m.radius) {
              m.slowedUntil = Math.max(m.slowedUntil, now + 3400);
              this.damageMonster(realm, m, player, Math.round(player.attackPower * 1.6), now, 22);
            }
          }
        } else if (mDef.id === 'stag' || mDef.id === 'phoenix') {
          const healPct = mDef.id === 'phoenix' ? 0.2 : 0.12;
          const heal = Math.round(player.maxHp * healPct * player.healPowerMult);
          player.hp = Math.min(player.maxHp, player.hp + heal);
          if (mDef.id === 'phoenix') {
            player.mp = Math.min(player.maxMp, player.mp + Math.round(player.maxMp * 0.2));
          }
          realm.events.push({
            id: nextId('ev'),
            type: 'aoe',
            x: player.x,
            y: player.y,
            radius: 170,
            color: mDef.accentColor,
          });
          realm.events.push({
            id: nextId('ev'),
            type: 'heal',
            x: player.x,
            y: player.y - 24,
            text: `+${heal}`,
            color: '#34D399',
          });
          for (const m of realm.monsters.values()) {
            if (dist(player.x, player.y, m.x, m.y) <= 170 + m.radius) {
              this.damageMonster(realm, m, player, Math.round(player.attackPower * 1.75), now, 26);
            }
          }
        } else {
          realm.events.push({
            id: nextId('ev'),
            type: 'aoe',
            x: player.x,
            y: player.y,
            radius: 185,
            color: mDef.accentColor,
          });
          for (const m of realm.monsters.values()) {
            if (dist(player.x, player.y, m.x, m.y) <= 185 + m.radius) {
              this.damageMonster(realm, m, player, Math.round(player.attackPower * 1.9), now, 30);
            }
          }
        }
        break;
      }

      case 'unlock_pet': {
        const petDef = PETS_DATA[msg.petId];
        if (!petDef) return;
        if (player.unlockedPets.includes(msg.petId)) {
          player.activePet = {
            id: msg.petId,
            level: player.petLevel,
            xp: player.petXp,
            xpToNext: petXpForNextLevel(player.petLevel),
            x: player.x - 32,
            y: player.y - 32,
            facingAngle: player.facingAngle,
          };
          this.syncProfile(player);
          return;
        }
        if (player.level < petDef.minLevel) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Requires Level ${petDef.minLevel} to adopt ${petDef.name}.`,
            tone: 'warning',
          });
          return;
        }
        if (player.gold < petDef.goldCost) {
          this.sendTo(player.ws, {
            type: 'notification',
            message: `Need ${petDef.goldCost}g to adopt ${petDef.name}.`,
            tone: 'warning',
          });
          return;
        }
        player.gold -= petDef.goldCost;
        player.unlockedPets.push(msg.petId);
        player.activePet = {
          id: msg.petId,
          level: player.petLevel,
          xp: player.petXp,
          xpToNext: petXpForNextLevel(player.petLevel),
          x: player.x - 32,
          y: player.y - 32,
          facingAngle: player.facingAngle,
        };
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: player.x,
          y: player.y - 30,
          text: `Adopted ${petDef.name}!`,
          color: petDef.accentColor,
        });
        this.syncProfile(player);
        break;
      }

      case 'toggle_pet': {
        if (msg.petId && player.unlockedPets.includes(msg.petId)) {
          player.activePet = {
            id: msg.petId,
            level: player.petLevel,
            xp: player.petXp,
            xpToNext: petXpForNextLevel(player.petLevel),
            x: player.x - 32,
            y: player.y - 32,
            facingAngle: player.facingAngle,
          };
          this.syncProfile(player);
          return;
        }
        if (player.activePet) {
          player.activePet = null;
        } else if (player.unlockedPets.length > 0) {
          const pid = player.unlockedPets[0];
          player.activePet = {
            id: pid,
            level: player.petLevel,
            xp: player.petXp,
            xpToNext: petXpForNextLevel(player.petLevel),
            x: player.x - 32,
            y: player.y - 32,
            facingAngle: player.facingAngle,
          };
        }
        this.syncProfile(player);
        break;
      }

      case 'upgrade_gear': {
        if (msg.slot === 'potion') {
          const cost = 24;
          if (player.gold < cost) return;
          if (!this.tryAddItemToInventory(player, 'con_vitality_potion', 1, true)) return;
          player.gold -= cost;
          this.syncProfile(player);
          return;
        }
        if (msg.slot === 'weapon') {
          const cost = getUpgradeCost(player.weaponTier);
          if (player.gold < cost) return;
          player.gold -= cost;
          player.weaponTier += 1;
          this.recalculatePlayer(player, false, now);
          realm.events.push({
            id: nextId('ev'),
            type: 'loot',
            x: player.x,
            y: player.y - 28,
            text: `Weapon +${player.weaponTier}`,
            color: '#F59E0B',
          });
          this.syncProfile(player);
          return;
        }
        if (msg.slot === 'armor') {
          const cost = getUpgradeCost(player.armorTier);
          if (player.gold < cost) return;
          player.gold -= cost;
          player.armorTier += 1;
          this.recalculatePlayer(player, true, now);
          realm.events.push({
            id: nextId('ev'),
            type: 'loot',
            x: player.x,
            y: player.y - 28,
            text: `Armor +${player.armorTier}`,
            color: '#60A5FA',
          });
          this.syncProfile(player);
        }
        break;
      }

      case 'respawn_town': {
        const a = Math.random() * Math.PI * 2;
        player.x = SANCTUARY_FOUNTAIN.x + Math.cos(a) * 65;
        player.y = SANCTUARY_FOUNTAIN.y + Math.sin(a) * 65;
        player.flightHeight = 0;
        player.isDead = false;
        player.respawnTimerMs = 0;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        realm.events.push({
          id: nextId('ev'),
          type: 'heal',
          x: player.x,
          y: player.y - 24,
          text: 'Recalled to Sanctuary',
          color: '#34D399',
          playerId: player.id,
        });
        break;
      }

      case 'rally_friend': {
        if (player.isDead || now < player.rallyCooldownUntil) return;
        const target = realm.players.get(msg.targetPlayerId);
        if (!target || target.id === player.id) return;
        const destZone = getZoneAt(target.x, target.y);
        if (!this.canAccessZone(realm, player, destZone.id)) {
          this.sendTo(player.ws, {
            type: 'barrier_blocked',
            zoneId: destZone.id,
            message: destZone.barrierMessage,
          });
          return;
        }
        const angle = Math.random() * Math.PI * 2;
        const resolved = resolveObstacleCollisions(
          target.x + Math.cos(angle) * 48,
          target.y + Math.sin(angle) * 48,
          18
        );
        player.x = resolved.x;
        player.y = resolved.y;
        player.flightHeight = 0;
        player.rallyCooldownUntil = now + 8000;
        realm.events.push({
          id: nextId('ev'),
          type: 'aoe',
          x: player.x,
          y: player.y,
          radius: 48,
          color: '#38BDF8',
        });
        break;
      }

      case 'group_create': {
        if (player.groupId) return;
        const grp: GroupInfo = {
          id: nextId('grp'),
          leaderId: player.id,
          memberIds: [player.id],
          unlockedZones: [...player.unlockedZones],
        };
        realm.groups.set(grp.id, grp);
        player.groupId = grp.id;
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Group',
          text: `${player.name} formed a group (max ${MAX_GROUP_MEMBERS} players).`,
          timestamp: now,
          isSystem: true,
        });
        break;
      }

      case 'group_invite': {
        let grp = player.groupId ? realm.groups.get(player.groupId) : undefined;
        if (!grp) {
          grp = {
            id: nextId('grp'),
            leaderId: player.id,
            memberIds: [player.id],
            unlockedZones: [...player.unlockedZones],
          };
          realm.groups.set(grp.id, grp);
          player.groupId = grp.id;
        }
        if (grp.leaderId !== player.id) return;
        if (grp.memberIds.length >= MAX_GROUP_MEMBERS) return;

        const target = realm.players.get(msg.targetPlayerId);
        if (!target || target.id === player.id || target.groupId) return;

        this.sendTo(target.ws, {
          type: 'group_invite',
          invite: {
            groupId: grp.id,
            fromId: player.id,
            fromName: player.name,
          },
        });
        break;
      }

      case 'group_respond': {
        if (!msg.accept || player.groupId) return;
        const grp = realm.groups.get(msg.groupId);
        if (!grp || grp.memberIds.length >= MAX_GROUP_MEMBERS) return;
        if (!grp.memberIds.includes(player.id)) {
          grp.memberIds.push(player.id);
        }
        player.groupId = grp.id;
        this.recomputeGroupUnlockedZones(realm, grp);
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Group',
          text: `${player.name} joined the group (${grp.memberIds.length}/${MAX_GROUP_MEMBERS}).`,
          timestamp: now,
          isSystem: true,
        });
        break;
      }

      case 'group_kick': {
        if (!player.groupId) return;
        const grp = realm.groups.get(player.groupId);
        if (!grp || grp.leaderId !== player.id) return;
        if (msg.targetPlayerId === player.id) return;
        const target = realm.players.get(msg.targetPlayerId);
        if (!target || target.groupId !== grp.id) return;
        this.removeFromGroup(realm, target);
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Group',
          text: `${target.name} was removed from the group.`,
          timestamp: now,
          isSystem: true,
        });
        break;
      }

      case 'group_leave': {
        if (!player.groupId) return;
        this.removeFromGroup(realm, player);
        break;
      }

      case 'chat': {
        const cleanText = (msg.text || '').trim().slice(0, 180);
        if (!cleanText) return;
        this.broadcastChat(realm, {
          id: nextId('chat'),
          senderId: player.id,
          senderName: player.name,
          senderClass: player.heroClass,
          text: cleanText,
          timestamp: now,
        });
        break;
      }
    }
  }

  private handleUseInventorySlot(realm: RealmInstance, player: ServerPlayer, slotIndex: number, now: number) {
    if (slotIndex < 0 || slotIndex >= player.inventorySlots) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = ITEMS_DATA[slot.itemId];
    if (!def) return;

    if (def.category === 'weapon' || def.category === 'armor' || def.category === 'accessory' || def.category === 'mount_gear') {
      this.handleEquipInventorySlot(realm, player, slotIndex, now);
      return;
    }

    if (def.category !== 'consumable' || !def.consumable) return;
    const eff = def.consumable;

    if (eff.expandSlots) {
      if (player.inventorySlots >= MAX_INVENTORY_SLOTS) {
        this.sendTo(player.ws, {
          type: 'notification',
          message: `Bag capacity is already at maximum (${MAX_INVENTORY_SLOTS} slots)!`,
          tone: 'warning',
        });
        return;
      }
      const nextSlots = Math.min(MAX_INVENTORY_SLOTS, player.inventorySlots + eff.expandSlots);
      while (player.inventory.length < nextSlots) player.inventory.push(null);
      player.inventorySlots = nextSlots;
      slot.quantity -= 1;
      if (slot.quantity <= 0) player.inventory[slotIndex] = null;
      this.sendTo(player.ws, {
        type: 'notification',
        message: `Satchel expanded to ${player.inventorySlots} inventory slots!`,
        tone: 'success',
      });
      this.syncProfile(player);
      return;
    }

    if (eff.healHpPct) {
      if (player.hp >= player.maxHp && !eff.healMpPct) return;
      const heal = Math.round(player.maxHp * eff.healHpPct * player.healPowerMult);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      realm.events.push({
        id: nextId('ev'),
        type: 'heal',
        x: player.x,
        y: player.y - 24,
        text: `+${heal}`,
        color: '#10B981',
      });
    }
    if (eff.healMpPct) {
      if (player.mp >= player.maxMp && !eff.healHpPct) return;
      const mpHeal = Math.round(player.maxMp * eff.healMpPct);
      player.mp = Math.min(player.maxMp, player.mp + mpHeal);
      realm.events.push({
        id: nextId('ev'),
        type: 'heal',
        x: player.x,
        y: player.y - 34,
        text: `+${mpHeal} MP`,
        color: '#38BDF8',
      });
    }
    if (eff.buffAttackPct && eff.buffDurationMs) {
      player.activeBuffs.attackPct = eff.buffAttackPct;
      player.activeBuffs.attackUntil = now + eff.buffDurationMs;
      this.recalculatePlayer(player, false, now);
      realm.events.push({
        id: nextId('ev'),
        type: 'buff',
        x: player.x,
        y: player.y - 28,
        text: `+${Math.round(eff.buffAttackPct * 100)}% ATK`,
        color: '#F97316',
      });
    }
    if (eff.buffDefense && eff.buffDurationMs) {
      player.activeBuffs.defenseFlat = eff.buffDefense;
      player.activeBuffs.defenseUntil = now + eff.buffDurationMs;
      this.recalculatePlayer(player, false, now);
      realm.events.push({
        id: nextId('ev'),
        type: 'buff',
        x: player.x,
        y: player.y - 28,
        text: `+${eff.buffDefense} DEF`,
        color: '#34D399',
      });
    }

    slot.quantity -= 1;
    if (slot.quantity <= 0) {
      player.inventory[slotIndex] = null;
    }
    this.syncPotionCounter(player);
    this.syncProfile(player);
  }

  private handleEquipInventorySlot(realm: RealmInstance, player: ServerPlayer, slotIndex: number, now: number) {
    if (slotIndex < 0 || slotIndex >= player.inventorySlots) return;
    const slot = player.inventory[slotIndex];
    if (!slot) return;
    const def = ITEMS_DATA[slot.itemId];
    if (!def) return;

    let equipKey: keyof EquippedGear | null = null;
    if (def.category === 'weapon') equipKey = 'weapon';
    else if (def.category === 'armor') equipKey = 'armor';
    else if (def.category === 'accessory') equipKey = 'accessory';
    else if (def.category === 'mount_gear') equipKey = 'mountGear';
    if (!equipKey) return;

    const prevEquipped = player.equipment[equipKey];
    player.equipment[equipKey] = def.id;
    player.inventory[slotIndex] = prevEquipped ? { itemId: prevEquipped, quantity: 1 } : null;

    if (equipKey === 'mountGear' && player.activeMount) {
      const mDef = MOUNTS_DATA[player.activeMount];
      player.maxMountStamina = mDef.maxStamina + (def.stats?.mountStaminaBonus || 0);
      player.mountStamina = Math.min(player.maxMountStamina, player.mountStamina + (def.stats?.mountStaminaBonus || 0));
    }

    this.recalculatePlayer(player, true, now);
    realm.events.push({
      id: nextId('ev'),
      type: 'loot',
      x: player.x,
      y: player.y - 28,
      text: `Equipped ${def.name}`,
      color: '#60A5FA',
    });
    this.syncProfile(player);
  }

  private resolvePlayerMove(
    realm: RealmInstance,
    player: ServerPlayer,
    targetX: number,
    targetY: number,
    now: number
  ): { x: number; y: number } {
    const resolved = resolveObstacleCollisions(targetX, targetY, 18);
    const zone = getZoneAt(resolved.x, resolved.y);
    if (this.canAccessZone(realm, player, zone.id)) {
      return resolved;
    }

    if (now - player.lastBarrierNoticeAt > 2400) {
      player.lastBarrierNoticeAt = now;
      this.sendTo(player.ws, {
        type: 'barrier_blocked',
        zoneId: zone.id,
        message: zone.barrierMessage,
      });
    }

    // Try sliding along X or Y alone
    const slideX = resolveObstacleCollisions(targetX, player.y, 18);
    if (this.canAccessZone(realm, player, getZoneAt(slideX.x, slideX.y).id)) {
      return slideX;
    }
    const slideY = resolveObstacleCollisions(player.x, targetY, 18);
    if (this.canAccessZone(realm, player, getZoneAt(slideY.x, slideY.y).id)) {
      return slideY;
    }

    // If current pos is legal stay there; otherwise nudge back toward Sanctuary center
    if (this.canAccessZone(realm, player, getZoneAt(player.x, player.y).id)) {
      return { x: player.x, y: player.y };
    }
    const backAngle = Math.atan2(SANCTUARY_CENTER.y - player.y, SANCTUARY_CENTER.x - player.x);
    return resolveObstacleCollisions(
      player.x + Math.cos(backAngle) * 14,
      player.y + Math.sin(backAngle) * 14,
      18
    );
  }

  private recalculatePlayer(player: ServerPlayer, healDelta: boolean, now = Date.now(), weather?: WeatherType) {
    const prevMaxHp = player.maxHp;
    const derived = computeDerivedStats(
      player.heroClass,
      player.jobId,
      player.level,
      player.stats,
      player.weaponTier,
      player.armorTier,
      player.gearBonuses,
      player.unlockedSkillNodes,
      player.equipment,
      player.activeBuffs,
      weather || 'clear',
      now
    );
    player.maxHp = derived.maxHp;
    player.maxMp = derived.maxMp;
    player.attackPower = derived.attackPower;
    player.defense = derived.defense;
    player.speed = derived.speed;
    player.critChance = derived.critChance;
    player.cooldownReductionPct = derived.cooldownReductionPct;
    player.healPowerMult = derived.healPowerMult;
    player.mpRegenMult = derived.mpRegenMult;
    player.hpRegenFlat = derived.hpRegenFlat;
    player.lifestealOnKillPct = derived.lifestealOnKillPct;
    player.evasionChance = derived.evasionChance;

    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);

    if (healDelta && player.maxHp > prevMaxHp) {
      player.hp = Math.min(player.maxHp, player.hp + (player.maxHp - prevMaxHp));
    }
  }

  private handleBasicAttack(realm: RealmInstance, player: ServerPlayer, aimAngle: number, now: number) {
    const cfg = CLASSES_DATA[player.heroClass];
    const combatCfg = COMBAT_CONFIG_DATA[player.heroClass];
    const agiReduction = Math.min(120, player.stats.agility * 3);
    const cd = Math.max(200, cfg.attackCooldownMs - agiReduction);
    if (now - player.lastAttackAt < cd) return;

    if (now - player.lastAttackAt > combatCfg.comboResetMs) {
      player.comboStep = 1;
    } else {
      player.comboStep = ((player.comboStep % 3) + 1) as 1 | 2 | 3;
    }

    player.lastAttackAt = now;
    player.facingAngle = aimAngle;

    const dmgMult = combatCfg.comboHitMults[player.comboStep - 1] || 1.0;
    const attackDamage = Math.round(player.attackPower * dmgMult);
    const isFinisher = player.comboStep === 3;

    if (!cfg.isRanged) {
      const effectiveRange = cfg.attackRange * (isFinisher ? 1.18 : 1.0);
      realm.events.push({
        id: nextId('ev'),
        type: 'slash',
        x: player.x,
        y: player.y,
        angle: aimAngle,
        radius: effectiveRange,
        color: isFinisher ? '#FDE047' : cfg.color,
        comboStep: player.comboStep,
        playerId: player.id,
      });

      for (const m of realm.monsters.values()) {
        const d = dist(player.x, player.y, m.x, m.y);
        if (d <= effectiveRange + m.radius) {
          const angleToMob = Math.atan2(m.y - player.y, m.x - player.x);
          const diff = Math.abs(Math.atan2(Math.sin(angleToMob - aimAngle), Math.cos(angleToMob - aimAngle)));
          if (diff <= (isFinisher ? 1.55 : 1.32) || d < 46) {
            this.damageMonster(realm, m, player, attackDamage, now, isFinisher ? 26 : 14);
          }
        }
      }
    } else {
      const speed = (player.heroClass === 'archer' ? 680 : 580) * (isFinisher ? 1.12 : 1.0);
      realm.events.push({
        id: nextId('ev'),
        type: 'slash',
        x: player.x,
        y: player.y,
        angle: aimAngle,
        radius: 52,
        color: isFinisher ? '#FDE047' : cfg.color,
        comboStep: player.comboStep,
        playerId: player.id,
      });
      realm.projectiles.push({
        id: nextId('proj'),
        ownerId: player.id,
        ownerType: 'player',
        kind: isFinisher || player.heroClass === 'archer' ? 'pierce_arrow' : 'bolt',
        x: player.x + Math.cos(aimAngle) * 20,
        y: player.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        radius: isFinisher ? 9 : player.heroClass === 'archer' ? 6 : 8,
        color: isFinisher ? '#FDE047' : cfg.color,
        damage: attackDamage,
        expiresAt: now + 920,
        piercing: isFinisher,
        hitIds: new Set(),
      });
    }
  }

  private handleCastSkill(
    realm: RealmInstance,
    player: ServerPlayer,
    skillIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    aimX: number,
    aimY: number,
    aimAngle: number,
    now: number
  ) {
    const bundle = SKILLS_DATA[player.heroClass];
    const jobBranch = getJobBranchById(player.jobId);
    const skill =
      skillIndex === 5
        ? bundle.ultimate
        : skillIndex === 6 || skillIndex === 7
          ? jobBranch?.skills[skillIndex - 6]
          : bundle.actives[skillIndex];
    if (!skill) return;
    if ('isUltimate' in skill && skill.isUltimate && player.level < (skill.unlockLevel || ULTIMATE_UNLOCK_LEVEL)) return;
    if (player.cooldowns[skillIndex] > 0) return;
    if (player.mp < skill.manaCost) return;

    player.mp -= skill.manaCost;
    const effectiveCd = Math.round(skill.cooldownMs * (1 - player.cooldownReductionPct));
    player.cooldowns[skillIndex] = effectiveCd;
    player.facingAngle = aimAngle;

    const targetDist = Math.min(340, dist(player.x, player.y, aimX, aimY));
    const tx = CLASSES_DATA[player.heroClass].isRanged ? player.x + Math.cos(aimAngle) * targetDist : player.x;
    const ty = CLASSES_DATA[player.heroClass].isRanged ? player.y + Math.sin(aimAngle) * targetDist : player.y;

    const skillDmg = Math.round(player.attackPower * skill.damageMult);

    switch (skill.effectKind) {
      case 'cleave': {
        realm.events.push({
          id: nextId('ev'),
          type: 'slash',
          x: player.x,
          y: player.y,
          angle: aimAngle,
          radius: skill.radius,
          color: skill.color,
          comboStep: 3,
          playerId: player.id,
        });
        for (const m of realm.monsters.values()) {
          if (dist(player.x, player.y, m.x, m.y) <= skill.radius + m.radius) {
            this.damageMonster(realm, m, player, skillDmg, now, 30);
          }
        }
        break;
      }

      case 'aoe': {
        realm.events.push({
          id: nextId('ev'),
          type: 'aoe',
          x: tx,
          y: ty,
          radius: skill.radius,
          color: skill.color,
        });
        for (const m of realm.monsters.values()) {
          if (dist(tx, ty, m.x, m.y) <= skill.radius + m.radius) {
            this.damageMonster(realm, m, player, skillDmg, now, 22);
          }
        }
        break;
      }

      case 'stun_heal': {
        const heal = Math.round(player.maxHp * 0.18 * player.healPowerMult);
        player.hp = Math.min(player.maxHp, player.hp + heal);
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: player.x, y: player.y, radius: skill.radius, color: skill.color });
        realm.events.push({ id: nextId('ev'), type: 'heal', x: player.x, y: player.y - 24, text: `+${heal}`, color: '#10B981' });
        for (const m of realm.monsters.values()) {
          if (dist(player.x, player.y, m.x, m.y) <= skill.radius + m.radius) {
            m.stunnedUntil = Math.max(m.stunnedUntil, now + (m.isBoss ? 1100 : 2200));
            this.damageMonster(realm, m, player, skillDmg, now, 18);
          }
        }
        break;
      }

      case 'dash': {
        const dashPos = this.resolvePlayerMove(
          realm,
          player,
          player.x + Math.cos(aimAngle) * 165,
          player.y + Math.sin(aimAngle) * 165,
          now
        );
        player.x = dashPos.x;
        player.y = dashPos.y;
        player.speedBuffUntil = now + 3200;
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: player.x, y: player.y, radius: skill.radius, color: skill.color });
        if (skillDmg > 0) {
          for (const m of realm.monsters.values()) {
            if (dist(player.x, player.y, m.x, m.y) <= skill.radius + m.radius) {
              this.damageMonster(realm, m, player, skillDmg, now, 20);
            }
          }
        }
        break;
      }

      case 'frost_aoe': {
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: tx, y: ty, radius: skill.radius, color: skill.color });
        for (const m of realm.monsters.values()) {
          if (dist(tx, ty, m.x, m.y) <= skill.radius + m.radius) {
            m.slowedUntil = Math.max(m.slowedUntil, now + 3500);
            this.damageMonster(realm, m, player, skillDmg, now, 12);
          }
        }
        break;
      }

      case 'volley': {
        const spread = [-0.22, 0, 0.22];
        for (const offset of spread) {
          const a = aimAngle + offset;
          realm.projectiles.push({
            id: nextId('proj'),
            ownerId: player.id,
            ownerType: 'player',
            kind: 'pierce_arrow',
            x: player.x + Math.cos(a) * 20,
            y: player.y + Math.sin(a) * 20,
            vx: Math.cos(a) * 700,
            vy: Math.sin(a) * 700,
            radius: 7,
            color: skill.color,
            damage: skillDmg,
            expiresAt: now + 850,
            piercing: true,
            hitIds: new Set(),
          });
        }
        break;
      }

      case 'group_heal': {
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: player.x, y: player.y, radius: skill.radius, color: skill.color });
        for (const ally of realm.players.values()) {
          if (ally.isDead) continue;
          const sameGroupOrSelf = ally.id === player.id || (player.groupId && ally.groupId === player.groupId);
          if (sameGroupOrSelf || dist(player.x, player.y, ally.x, ally.y) <= skill.radius) {
            if (dist(player.x, player.y, ally.x, ally.y) <= skill.radius + 80) {
              const healAmt = Math.round(ally.maxHp * 0.28 * player.healPowerMult);
              ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
              ally.speedBuffUntil = now + 3000;
              realm.events.push({ id: nextId('ev'), type: 'heal', x: ally.x, y: ally.y - 24, text: `+${healAmt}`, color: '#34D399' });
            }
          }
        }
        break;
      }

      case 'summon_spirit': {
        const kind = skill.id.includes('golem') || skill.id.includes('legion') || skill.id.includes('titan') ? 'rune_sentinel' : 'wolf_spirit';
        const existingOwned = realm.summons.filter((s) => s.ownerId === player.id);
        if (existingOwned.length >= 3) {
          const oldest = existingOwned[0];
          const idx = realm.summons.indexOf(oldest);
          if (idx >= 0) realm.summons.splice(idx, 1);
        }
        realm.summons.push({
          id: nextId('sum'),
          ownerId: player.id,
          kind,
          x: player.x + Math.cos(aimAngle) * 38,
          y: player.y + Math.sin(aimAngle) * 38,
          facingAngle: aimAngle,
          damage: Math.round(player.attackPower * (kind === 'rune_sentinel' ? 1.05 : 0.72)),
          expiresAt: now + 18000,
          lastAttackAt: 0,
        });
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: player.x, y: player.y, radius: skill.radius, color: skill.color });
        for (const m of realm.monsters.values()) {
          if (dist(player.x, player.y, m.x, m.y) <= skill.radius + m.radius) {
            this.damageMonster(realm, m, player, skillDmg, now, 18);
          }
        }
        break;
      }

      case 'ultimate': {
        realm.events.push({ id: nextId('ev'), type: 'aoe', x: tx, y: ty, radius: skill.radius, color: skill.color });
        for (const m of realm.monsters.values()) {
          if (dist(tx, ty, m.x, m.y) <= skill.radius + m.radius) {
            m.stunnedUntil = Math.max(m.stunnedUntil, now + (m.isBoss ? 1200 : 2800));
            this.damageMonster(realm, m, player, skillDmg, now, 36);
          }
        }
        if (player.heroClass === 'healer') {
          for (const ally of realm.players.values()) {
            if (!ally.isDead && dist(player.x, player.y, ally.x, ally.y) <= skill.radius + 80) {
              const healAmt = Math.round(ally.maxHp * 0.6 * player.healPowerMult);
              ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
              realm.events.push({ id: nextId('ev'), type: 'heal', x: ally.x, y: ally.y - 26, text: `+${healAmt}`, color: '#FDE047' });
            }
          }
        } else if (player.heroClass === 'summoner') {
          for (let k = 0; k < 2; k++) {
            const a = aimAngle + (k === 0 ? -0.6 : 0.6);
            realm.summons.push({
              id: nextId('sum'),
              ownerId: player.id,
              kind: 'rune_sentinel',
              x: player.x + Math.cos(a) * 48,
              y: player.y + Math.sin(a) * 48,
              facingAngle: aimAngle,
              damage: Math.round(player.attackPower * 1.15),
              expiresAt: now + 20000,
              lastAttackAt: 0,
            });
          }
        }
        break;
      }
    }
  }

  private damageMonster(
    realm: RealmInstance,
    monster: ServerMonster,
    attacker: ServerPlayer,
    rawDamage: number,
    now: number,
    knockback = 0
  ) {
    if (monster.hp <= 0) return;

    const isCrit = Math.random() < attacker.critChance;
    const variance = 0.92 + Math.random() * 0.16;
    const finalDmg = Math.max(1, Math.round(rawDamage * variance * (isCrit ? 1.65 : 1)));

    monster.hp = Math.max(0, monster.hp - finalDmg);
    monster.hitFlashUntil = now + 130;
    monster.targetId = attacker.id;
    monster.damageContributors.set(attacker.id, (monster.damageContributors.get(attacker.id) || 0) + finalDmg);

    if (monster.isBoss && monster.template.bossDef && monster.hp > 0) {
      const hpRatio = monster.hp / monster.maxHp;
      const newPhase: 1 | 2 | 3 = hpRatio <= 0.3 ? 3 : hpRatio <= 0.6 ? 2 : 1;
      if (newPhase > (monster.phase || 1)) {
        monster.phase = newPhase;
        const phaseCfg = monster.template.bossDef.phases[newPhase - 1];
        monster.telegraphName = phaseCfg.telegraphName;
        monster.windupRadius = phaseCfg.aoeRadius;
        realm.events.push({
          id: nextId('ev'),
          type: 'aoe',
          x: monster.x,
          y: monster.y,
          radius: phaseCfg.aoeRadius,
          color: phaseCfg.color,
        });
        this.broadcastChat(realm, {
          id: nextId('sys'),
          senderId: 'system',
          senderName: 'Boss Phase',
          text: `${monster.name} enters Phase ${newPhase}: ${phaseCfg.telegraphName}!`,
          timestamp: now,
          isSystem: true,
        });
      }
    }

    if (knockback > 0 && !monster.isBoss) {
      const angle = Math.atan2(monster.y - attacker.y, monster.x - attacker.x);
      const pushed = resolveObstacleCollisions(
        monster.x + Math.cos(angle) * knockback,
        monster.y + Math.sin(angle) * knockback,
        monster.radius
      );
      if (getZoneAt(pushed.x, pushed.y).id !== 'sanctuary') {
        monster.x = pushed.x;
        monster.y = pushed.y;
      }
    }

    realm.events.push({
      id: nextId('ev'),
      type: 'damage',
      x: monster.x + (Math.random() - 0.5) * 18,
      y: monster.y - monster.radius - 8,
      text: isCrit ? `${finalDmg}!` : `${finalDmg}`,
      color: isCrit ? '#FBBF24' : '#F8FAFC',
      isCrit,
    });

    if (monster.hp <= 0) {
      this.handleMonsterDeath(realm, monster, attacker, now);
    }
  }

  private awardPetXp(realm: RealmInstance, p: ServerPlayer, amount: number) {
    if (!p.activePet || amount <= 0) return;
    p.petXp += amount;
    let leveled = false;
    while (p.petXp >= petXpForNextLevel(p.petLevel) && p.petLevel < 99) {
      p.petXp -= petXpForNextLevel(p.petLevel);
      p.petLevel += 1;
      leveled = true;
    }
    p.activePet.level = p.petLevel;
    p.activePet.xp = p.petXp;
    p.activePet.xpToNext = petXpForNextLevel(p.petLevel);
    if (leveled) {
      const petDef = PETS_DATA[p.activePet.id];
      realm.events.push({
        id: nextId('ev'),
        type: 'pet_pickup',
        x: p.activePet.x,
        y: p.activePet.y - 26,
        text: `${petDef.name} Lv.${p.petLevel}!`,
        color: petDef.accentColor,
      });
    }
  }

  private awardXpAndCheckLevel(realm: RealmInstance, p: ServerPlayer, xpAmt: number, now: number, countAsKill = true) {
    let finalXp = xpAmt;
    if (countAsKill) {
      p.kills += 1;
      if (p.lifestealOnKillPct > 0 && !p.isDead) {
        const heal = Math.round(p.maxHp * p.lifestealOnKillPct);
        p.hp = Math.min(p.maxHp, p.hp + heal);
      }
      const petBoost = p.activePet ? getEffectivePetXpBonus(p.activePet.id, p.petLevel) / 100 : 0;
      const weatherBoost = WEATHER_PRESETS[realm.weather].effects.xpMult;
      finalXp = Math.round(xpAmt * (1 + petBoost) * weatherBoost);
      if (p.activePet) {
        this.awardPetXp(realm, p, Math.max(6, Math.round(xpAmt * 0.25)));
      }
    }
    p.xp += finalXp;

    realm.events.push({
      id: nextId('ev'),
      type: 'xp',
      x: p.x,
      y: p.y - 38,
      text: `+${finalXp} XP`,
      color: '#A78BFA',
    });

    let leveledUp = false;
    while (p.xp >= p.xpToNext && p.level < 99) {
      p.xp -= p.xpToNext;
      p.level += 1;
      p.statPoints += 2;
      p.skillPoints += 1;
      p.xpToNext = xpForNextLevel(p.level);
      this.recalculatePlayer(p, false, now, realm.weather);
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      leveledUp = true;
    }

    if (leveledUp) {
      realm.events.push({
        id: nextId('ev'),
        type: 'level_up',
        x: p.x,
        y: p.y,
        text: `LEVEL ${p.level}!`,
        color: '#FBBF24',
        radius: 95,
        playerId: p.id,
      });
      this.broadcastChat(realm, {
        id: nextId('sys'),
        senderId: 'system',
        senderName: 'Realm',
        text: `${p.name} reached Level ${p.level}! (+2 Attribute Pts, +1 Skill Tree Pt)`,
        timestamp: now,
        isSystem: true,
      });
    }
  }

  private recordKillQuestProgress(realm: RealmInstance, p: ServerPlayer, monsterKind: MonsterKind) {
    let changed = false;
    for (const qProg of p.activeQuests) {
      const qDef = QUESTS_DATA[qProg.questId];
      if (!qDef || qDef.type !== 'kill' || qDef.targetKind !== monsterKind) continue;
      if (qProg.progress < qDef.targetCount) {
        qProg.progress += 1;
        if (qProg.progress >= qDef.targetCount) {
          qProg.completed = true;
          this.sendTo(p.ws, {
            type: 'notification',
            message: `Quest Complete Ready: "${qDef.title}" — Return to ${NPCS_DATA[qDef.turnInNpcId]?.name || 'NPC'}!`,
            tone: 'success',
          });
        }
        changed = true;
      }
    }
    if (changed) {
      realm.events.push({
        id: nextId('ev'),
        type: 'quest',
        x: p.x,
        y: p.y - 44,
        text: 'Quest Updated',
        color: '#FBBF24',
      });
    }
  }

  private grantDirectDropToPlayer(
    realm: RealmInstance,
    p: ServerPlayer,
    drop: {
      kind: 'gold' | 'orb' | 'gear' | 'item';
      itemId?: string;
      quantity?: number;
      value: number;
      name?: string;
      rarity?: LootRarity;
      statBonus?: Partial<PlayerStats>;
    }
  ): boolean {
    if (drop.kind === 'gold') {
      p.gold += drop.value;
      realm.events.push({
        id: nextId('ev'),
        type: 'loot',
        x: p.x,
        y: p.y - 26,
        text: `+${drop.value}g`,
        color: '#FBBF24',
      });
      return true;
    }
    if (drop.kind === 'orb') {
      const heal = Math.round(p.maxHp * (drop.value / 100));
      p.hp = Math.min(p.maxHp, p.hp + heal);
      realm.events.push({
        id: nextId('ev'),
        type: 'heal',
        x: p.x,
        y: p.y - 26,
        text: `+${heal} HP`,
        color: '#10B981',
      });
      return true;
    }
    if (drop.kind === 'item' && drop.itemId) {
      const itemDef = ITEMS_DATA[drop.itemId];
      if (!itemDef) return false;
      const ok = this.tryAddItemToInventory(p, drop.itemId, drop.quantity || 1, true);
      if (ok) {
        const rarityColors: Record<LootRarity, string> = {
          common: '#CBD5E1',
          uncommon: '#34D399',
          rare: '#60A5FA',
          epic: '#C084FC',
          legendary: '#F59E0B',
        };
        realm.events.push({
          id: nextId('ev'),
          type: 'loot',
          x: p.x,
          y: p.y - 32,
          text: `+${drop.quantity || 1} ${itemDef.name}`,
          color: rarityColors[itemDef.rarity],
        });
      }
      return ok;
    }
    return true;
  }

  private unlockZoneForPlayer(realm: RealmInstance, player: ServerPlayer, zoneId: ZoneId, unlockedBy: string) {
    if (player.unlockedZones.includes(zoneId)) return;
    player.unlockedZones.push(zoneId);
    const zDef = getZoneById(zoneId);
    this.sendTo(player.ws, {
      type: 'zone_unlocked',
      zoneId,
      zoneName: zDef.name,
      unlockedBy,
    });
    realm.events.push({
      id: nextId('ev'),
      type: 'zone_unlock',
      x: player.x,
      y: player.y - 42,
      text: `${zDef.name} Unlocked!`,
      color: zDef.accentColor,
    });
    if (player.groupId) {
      const grp = realm.groups.get(player.groupId);
      if (grp) this.recomputeGroupUnlockedZones(realm, grp);
    }
  }

  private handleMonsterDeath(realm: RealmInstance, monster: ServerMonster, killer: ServerPlayer, now: number) {
    realm.monsters.delete(monster.id);

    if (monster.isWorldBoss) {
      realm.worldBossActiveId = null;
      realm.worldBossKillsCount = 0;
      realm.worldBossNextSpawnAt = now + WORLD_BOSS_SPAWN_TIMER_MS;
    } else {
      realm.pendingRespawns.push({
        spawn: { kind: monster.kind, x: monster.spawnX, y: monster.spawnY },
        respawnAt: now + monster.template.respawnMs,
      });
      if (!monster.isBoss && !realm.worldBossActiveId) {
        realm.worldBossKillsCount += 1;
      }
    }

    const bossDef = monster.template.bossDef;
    const itemDrops: { itemId: string; quantity: number }[] = [];

    if (monster.isBoss && bossDef) {
      for (const gid of bossDef.guaranteedItemIds) {
        if (ITEMS_DATA[gid]) itemDrops.push({ itemId: gid, quantity: 1 });
      }
      const bonusRoll = rollWeightedLootItem(monster.level, true);
      itemDrops.push({ itemId: bonusRoll.id, quantity: 1 });
    } else {
      if (monster.kind === 'slime' && Math.random() < 0.5) {
        itemDrops.push({ itemId: 'mat_slime_gel', quantity: 1 });
      } else if (monster.kind === 'boar' && Math.random() < 0.55) {
        itemDrops.push({ itemId: 'mat_boar_fang', quantity: 1 });
      } else if (
        (monster.kind === 'frost_wolf' || monster.kind === 'ice_golem' || monster.kind === 'frost_valkyrie') &&
        Math.random() < 0.45
      ) {
        itemDrops.push({ itemId: 'mat_glacier_crystal', quantity: 1 });
      } else if (monster.kind === 'wyrmling' && Math.random() < 0.45) {
        itemDrops.push({ itemId: 'mat_wyrm_scale', quantity: 1 });
      } else if (Math.random() < 0.36) {
        const rolled = rollWeightedLootItem(monster.level, false);
        itemDrops.push({ itemId: rolled.id, quantity: 1 });
      }
    }

    const group = killer.groupId ? realm.groups.get(killer.groupId) : undefined;
    if (group) {
      const eligibleMembers: ServerPlayer[] = [];
      for (const memberId of group.memberIds) {
        const member = realm.players.get(memberId);
        if (member && !member.isDead && dist(member.x, member.y, monster.x, monster.y) <= GROUP_REWARD_RADIUS_UNITS) {
          eligibleMembers.push(member);
        }
      }
      if (eligibleMembers.length === 0 && !killer.isDead) {
        eligibleMembers.push(killer);
      }

      for (const member of eligibleMembers) {
        if (monster.isBoss) member.bossKills += 1;
        this.recordKillQuestProgress(realm, member, monster.kind);
        this.awardXpAndCheckLevel(realm, member, monster.template.xpReward, now, true);
        this.grantDirectDropToPlayer(realm, member, { kind: 'gold', value: monster.template.goldReward });
        if (Math.random() < (monster.isBoss ? 1 : 0.3)) {
          this.grantDirectDropToPlayer(realm, member, { kind: 'orb', value: 35 });
        }
        for (const dropItem of itemDrops) {
          const itemDef = ITEMS_DATA[dropItem.itemId];
          if (!itemDef) continue;
          const added = this.grantDirectDropToPlayer(realm, member, {
            kind: 'item',
            itemId: dropItem.itemId,
            quantity: dropItem.quantity,
            value: itemDef.sellPrice,
          });
          if (!added) {
            realm.loot.push({
              id: nextId('loot'),
              kind: 'item',
              itemId: dropItem.itemId,
              quantity: dropItem.quantity,
              name: itemDef.name,
              rarity: itemDef.rarity,
              value: itemDef.sellPrice,
              x: monster.x + (Math.random() - 0.5) * 38,
              y: monster.y + (Math.random() - 0.5) * 38,
              expiresAt: now + 45000,
            });
          }
        }
        if (bossDef?.unlocksZoneId) {
          this.unlockZoneForPlayer(realm, member, bossDef.unlocksZoneId, monster.name);
        }
        this.syncProfile(member);
      }
    } else {
      const eligiblePlayers: ServerPlayer[] = [];
      for (const p of realm.players.values()) {
        if (!p.isDead && (monster.damageContributors.has(p.id) || dist(p.x, p.y, monster.x, monster.y) <= GROUP_REWARD_RADIUS_UNITS)) {
          eligiblePlayers.push(p);
        }
      }
      for (const p of eligiblePlayers) {
        if (monster.isBoss) p.bossKills += 1;
        this.recordKillQuestProgress(realm, p, monster.kind);
        this.awardXpAndCheckLevel(realm, p, monster.template.xpReward, now, true);
        if (bossDef?.unlocksZoneId) {
          this.unlockZoneForPlayer(realm, p, bossDef.unlocksZoneId, monster.name);
        }
        this.syncProfile(p);
      }

      const goldStacks = monster.isBoss ? 3 : 1;
      for (let i = 0; i < goldStacks; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = monster.isBoss ? 25 + Math.random() * 55 : 14;
        realm.loot.push({
          id: nextId('loot'),
          kind: 'gold',
          name: 'Gold Coins',
          rarity: 'common',
          value: Math.round(monster.template.goldReward / goldStacks),
          x: monster.x + Math.cos(a) * r,
          y: monster.y + Math.sin(a) * r,
          expiresAt: now + 35000,
        });
      }
      if (Math.random() < (monster.isBoss ? 1 : 0.3)) {
        realm.loot.push({
          id: nextId('loot'),
          kind: 'orb',
          name: 'Vitality Orb',
          rarity: 'uncommon',
          value: 35,
          x: monster.x + (Math.random() - 0.5) * 32,
          y: monster.y + (Math.random() - 0.5) * 32,
          expiresAt: now + 30000,
        });
      }
      for (const dropItem of itemDrops) {
        const itemDef = ITEMS_DATA[dropItem.itemId];
        if (!itemDef) continue;
        realm.loot.push({
          id: nextId('loot'),
          kind: 'item',
          itemId: dropItem.itemId,
          quantity: dropItem.quantity,
          name: itemDef.name,
          rarity: itemDef.rarity,
          value: itemDef.sellPrice,
          x: monster.x + (Math.random() - 0.5) * 44,
          y: monster.y + (Math.random() - 0.5) * 44,
          expiresAt: now + 45000,
        });
      }
    }

    if (monster.isBoss && bossDef) {
      const unlockText = bossDef.unlocksZoneId
        ? ` Zone unlocked: ${getZoneById(bossDef.unlocksZoneId).name}!`
        : monster.isWorldBoss
          ? ' Aurelion will return after 25 mob slays or when his timer expires!'
          : ' Skyscale Drake mount is now unlocked for victors!';
      this.broadcastChat(realm, {
        id: nextId('sys'),
        senderId: 'system',
        senderName: 'World Boss',
        text: `${monster.name} has been defeated!${unlockText}`,
        timestamp: now,
        isSystem: true,
      });
    }
  }

  private damagePlayer(realm: RealmInstance, player: ServerPlayer, rawDmg: number, now: number) {
    if (player.isDead) return;
    if (getZoneAt(player.x, player.y).id === 'sanctuary') return;

    if (player.evasionChance > 0 && Math.random() < player.evasionChance) {
      realm.events.push({
        id: nextId('ev'),
        type: 'buff',
        x: player.x,
        y: player.y - 24,
        text: 'Evaded!',
        color: '#94A3B8',
      });
      return;
    }

    const mitigated = Math.max(2, Math.round(rawDmg - player.defense * 0.55));
    player.hp = Math.max(0, player.hp - mitigated);
    player.hitFlashUntil = now + 150;

    realm.events.push({
      id: nextId('ev'),
      type: 'damage',
      x: player.x,
      y: player.y - 22,
      text: `-${mitigated}`,
      color: '#EF4444',
    });

    if (player.hp <= 0) {
      player.isDead = true;
      player.isMounted = false;
      player.flightHeight = 0;
      player.respawnTimerMs = 4500;
      player.inputDx = 0;
      player.inputDy = 0;
      this.broadcastChat(realm, {
        id: nextId('sys'),
        senderId: 'system',
        senderName: 'Realm',
        text: `${player.name} fell in ${getZoneAt(player.x, player.y).name}. Reviving in Sanctuary...`,
        timestamp: now,
        isSystem: true,
      });
    }
  }

  private spawnWorldBoss(realm: RealmInstance, now: number) {
    const m = this.createMonsterFromSpawn({
      kind: 'boss_world_eclipse',
      x: WORLD_BOSS_ARENA.x,
      y: WORLD_BOSS_ARENA.y,
    });
    realm.monsters.set(m.id, m);
    realm.worldBossActiveId = m.id;
    realm.worldBossKillsCount = 0;
    realm.worldBossNextSpawnAt = now + WORLD_BOSS_SPAWN_TIMER_MS;

    realm.events.push({
      id: nextId('ev'),
      type: 'world_boss',
      x: m.x,
      y: m.y,
      radius: 260,
      text: `${m.name} Awakens!`,
      color: '#FDE047',
    });

    this.broadcastChat(realm, {
      id: nextId('sys'),
      senderId: 'system',
      senderName: 'WORLD BOSS',
      text: `Aurelion, Eclipse Sovereign has manifested at Eclipse Crucible (NE Frozen Highlands)!`,
      timestamp: now,
      isSystem: true,
    });
  }

  private tick() {
    const now = Date.now();
    const dtMs = Math.min(100, now - this.lastTickTime);
    const dt = dtMs / 1000;
    this.lastTickTime = now;

    for (const [code, realm] of this.realms.entries()) {
      if (code !== PUBLIC_REALM_CODE && realm.players.size === 0 && now - realm.lastEmptyAt > 300000) {
        this.realms.delete(code);
        continue;
      }

      if (realm.players.size === 0) {
        realm.events = [];
        continue;
      }

      // 0. Unpredictable Server Weather Rotation & Gameplay Effects + Merchant Restock
      if (now >= realm.weatherNextChangeAt) {
        const picked = pickRandomNextWeather(realm.weather);
        realm.weather = picked.weather;
        realm.weatherNextChangeAt = now + picked.nextDurationMs;
        for (const p of realm.players.values()) {
          this.recalculatePlayer(p, false, now, realm.weather);
        }
      }
      const weatherFx = WEATHER_PRESETS[realm.weather].effects;

      // World Boss Spawn Condition: kills >= 25 OR timer expired
      if (realm.worldBossActiveId && !realm.monsters.has(realm.worldBossActiveId)) {
        realm.worldBossActiveId = null;
      }
      if (
        !realm.worldBossActiveId &&
        (realm.worldBossKillsCount >= WORLD_BOSS_SPAWN_KILLS || now >= realm.worldBossNextSpawnAt)
      ) {
        this.spawnWorldBoss(realm, now);
      }

      for (const shopState of realm.merchantStocks.values()) {
        const shopDef = MERCHANT_SHOPS_DATA[shopState.merchantId];
        for (let i = 0; i < shopState.items.length; i++) {
          const itemStock = shopState.items[i];
          if (itemStock.maxStock > 0 && now >= itemStock.nextRestockAt) {
            itemStock.stock = itemStock.maxStock;
            const interval = shopDef?.listings[i]?.restockIntervalMs || 90000;
            itemStock.nextRestockAt = now + interval;
          }
        }
      }

      // 1. Respawn regular & zone-boss monsters
      for (let i = realm.pendingRespawns.length - 1; i >= 0; i--) {
        const pr = realm.pendingRespawns[i];
        if (now >= pr.respawnAt) {
          realm.pendingRespawns.splice(i, 1);
          const m = this.createMonsterFromSpawn(pr.spawn);
          realm.monsters.set(m.id, m);
          if (m.isBoss) {
            this.broadcastChat(realm, {
              id: nextId('sys'),
              senderId: 'system',
              senderName: 'Boss',
              text: `${m.name} has awakened in ${getZoneById(m.zone).name}!`,
              timestamp: now,
              isSystem: true,
            });
          }
        }
      }

      // 2. Update players (cooldowns, buffs, mounts, flying, pets, movement, fountain regen)
      for (const p of realm.players.values()) {
        for (let s = 0; s < 8; s++) {
          if (p.cooldowns[s] > 0) {
            p.cooldowns[s] = Math.max(0, p.cooldowns[s] - dtMs);
          }
        }
        if (p.mountSpecialCooldownMs > 0) {
          p.mountSpecialCooldownMs = Math.max(0, p.mountSpecialCooldownMs - dtMs);
        }

        let buffExpired = false;
        if (p.activeBuffs.attackUntil > 0 && now >= p.activeBuffs.attackUntil) {
          p.activeBuffs.attackPct = 0;
          p.activeBuffs.attackUntil = 0;
          buffExpired = true;
        }
        if (p.activeBuffs.defenseUntil > 0 && now >= p.activeBuffs.defenseUntil) {
          p.activeBuffs.defenseFlat = 0;
          p.activeBuffs.defenseUntil = 0;
          buffExpired = true;
        }
        if (buffExpired) this.recalculatePlayer(p, false, now, realm.weather);

        if (p.isDead) {
          p.respawnTimerMs -= dtMs;
          if (p.respawnTimerMs <= 0) {
            p.isDead = false;
            p.flightHeight = 0;
            p.x = SANCTUARY_FOUNTAIN.x + (Math.random() - 0.5) * 60;
            p.y = SANCTUARY_FOUNTAIN.y + (Math.random() - 0.5) * 60;
            p.hp = p.maxHp;
            p.mp = p.maxMp;
          }
          continue;
        }

        const isMoving = p.inputDx !== 0 || p.inputDy !== 0;
        let mountMult = 1;
        const mountGearDef = p.equipment.mountGear ? ITEMS_DATA[p.equipment.mountGear] : null;
        const mountSpeedBonus = mountGearDef?.stats?.mountSpeedBonus || 0;

        if (p.isMounted && p.activeMount) {
          const mDef = MOUNTS_DATA[p.activeMount];
          const isFlying = mDef.canFly && p.flightHeight > 0.3;
          if (isMoving || isFlying) {
            if (p.mountStamina > 1) {
              mountMult = (mDef.speedMultiplier + mountSpeedBonus) * (isFlying ? mDef.flightSpeedMult : 1);
              p.mountStamina = Math.max(0, p.mountStamina - mDef.staminaDrainPerSec * (isFlying ? 0.9 : 1) * dt);
            } else {
              mountMult = 1.15;
              if (isFlying) {
                p.flightHeight = Math.max(0, p.flightHeight - 6 * dt);
              }
            }
          } else {
            p.mountStamina = Math.min(
              p.maxMountStamina,
              p.mountStamina + mDef.staminaRegenPerSec * weatherFx.staminaRegenMult * dt
            );
          }
        } else {
          p.flightHeight = 0;
          p.mountStamina = Math.min(p.maxMountStamina, p.mountStamina + 18 * weatherFx.staminaRegenMult * dt);
        }

        if (isMoving) {
          const buffMult = now < p.speedBuffUntil ? 1.35 : 1;
          const sprintMult = p.isSprinting ? 1.35 : 1.0;
          const nextPos = this.resolvePlayerMove(
            realm,
            p,
            p.x + p.inputDx * p.speed * buffMult * mountMult * sprintMult * dt,
            p.y + p.inputDy * p.speed * buffMult * mountMult * sprintMult * dt,
            now
          );
          p.x = nextPos.x;
          p.y = nextPos.y;
          const curZone = getZoneAt(p.x, p.y);
          this.syncReachQuestProgress(p, curZone.id);
        }

        // Update companion Pet follow, drop vacuum & assist fire
        if (p.activePet) {
          const petDef = PETS_DATA[p.activePet.id];
          let targetX = p.x - Math.cos(p.facingAngle) * 34 + Math.cos(p.facingAngle + Math.PI / 2) * 26;
          let targetY = p.y - Math.sin(p.facingAngle) * 34 + Math.sin(p.facingAngle + Math.PI / 2) * 26;

          // Check nearest loot drop inside pet pickup radius
          let lootTarget: ServerLoot | null = null;
          let bestLootDist = petDef.pickupRadius;
          for (const drop of realm.loot) {
            const d = dist(p.x, p.y, drop.x, drop.y);
            if (d <= bestLootDist) {
              bestLootDist = d;
              lootTarget = drop;
            }
          }
          if (lootTarget) {
            targetX = lootTarget.x;
            targetY = lootTarget.y;
          }

          const dxPet = targetX - p.activePet.x;
          const dyPet = targetY - p.activePet.y;
          const dPet = Math.hypot(dxPet, dyPet);
          if (dPet > 4) {
            p.activePet.facingAngle = Math.atan2(dyPet, dxPet);
            const moveStep = Math.min(dPet, (lootTarget ? 320 : 240) * dt);
            p.activePet.x += (dxPet / dPet) * moveStep;
            p.activePet.y += (dyPet / dPet) * moveStep;
          }

          // Auto-collect nearby drops
          for (let li = realm.loot.length - 1; li >= 0; li--) {
            const drop = realm.loot[li];
            if (dist(p.x, p.y, drop.x, drop.y) <= petDef.pickupRadius || dist(p.activePet.x, p.activePet.y, drop.x, drop.y) <= 44) {
              const adjDrop =
                drop.kind === 'gold'
                  ? { ...drop, value: Math.round(drop.value * (1 + petDef.goldBonusPct / 100)) }
                  : drop;
              const picked = this.grantDirectDropToPlayer(realm, p, adjDrop);
              if (picked) {
                realm.loot.splice(li, 1);
                realm.events.push({
                  id: nextId('ev'),
                  type: 'pet_pickup',
                  x: p.activePet.x,
                  y: p.activePet.y - 18,
                  color: petDef.accentColor,
                  playerId: p.id,
                });
                this.awardPetXp(realm, p, 12);
                this.syncProfile(p);
              }
            }
          }

          // Pet assist bolt + optional heal pulse
          if (now - p.lastPetAssistAt >= petDef.assistCooldownMs) {
            let assistMob: ServerMonster | null = null;
            let bestMobD = 300;
            for (const m of realm.monsters.values()) {
              const dm = dist(p.x, p.y, m.x, m.y);
              if (dm < bestMobD) {
                bestMobD = dm;
                assistMob = m;
              }
            }
            if (assistMob) {
              p.lastPetAssistAt = now;
              const a = Math.atan2(assistMob.y - p.activePet.y, assistMob.x - p.activePet.x);
              p.activePet.facingAngle = a;
              realm.projectiles.push({
                id: nextId('pproj'),
                ownerId: p.id,
                ownerType: 'pet',
                kind: 'bolt',
                x: p.activePet.x,
                y: p.activePet.y,
                vx: Math.cos(a) * 520,
                vy: Math.sin(a) * 520,
                radius: 6,
                color: petDef.accentColor,
                damage: Math.max(4, Math.round(p.attackPower * petDef.assistDamageMult * (1 + (p.petLevel - 1) * 0.06))),
                expiresAt: now + 900,
                piercing: false,
                hitIds: new Set(),
              });
              if (petDef.healPctPerTrigger && p.hp < p.maxHp) {
                const heal = Math.round(p.maxHp * petDef.healPctPerTrigger);
                p.hp = Math.min(p.maxHp, p.hp + heal);
                realm.events.push({
                  id: nextId('ev'),
                  type: 'heal',
                  x: p.x,
                  y: p.y - 24,
                  text: `+${heal}`,
                  color: '#34D399',
                });
              }
            }
          }
        }

        const nearFountain = dist(p.x, p.y, SANCTUARY_FOUNTAIN.x, SANCTUARY_FOUNTAIN.y) <= SANCTUARY_FOUNTAIN.radius + 45;
        if (nearFountain && (p.hp < p.maxHp || p.mp < p.maxMp)) {
          p.hp = p.maxHp;
          p.mp = p.maxMp;
          if (now - p.lastFountainHealAt > 2500) {
            p.lastFountainHealAt = now;
            realm.events.push({
              id: nextId('ev'),
              type: 'heal',
              x: p.x,
              y: p.y - 24,
              text: 'Fountain Restored!',
              color: '#34D399',
              playerId: p.id,
            });
          }
        } else {
          const hpRegen = (2.5 + p.stats.vitality * 0.4 + p.hpRegenFlat) * dt;
          const mpRegen = (5.5 + p.stats.agility * 0.5) * p.mpRegenMult * dt;
          p.hp = Math.min(p.maxHp, p.hp + hpRegen);
          p.mp = Math.min(p.maxMp, p.mp + mpRegen);
        }
      }

      // 3. Update Summoner Spirit Companions
      for (let i = realm.summons.length - 1; i >= 0; i--) {
        const sum = realm.summons[i];
        const owner = realm.players.get(sum.ownerId);
        if (!owner || owner.isDead || now >= sum.expiresAt) {
          realm.summons.splice(i, 1);
          continue;
        }

        let targetMob: ServerMonster | null = null;
        let bestDist = 360;
        for (const m of realm.monsters.values()) {
          const d = dist(sum.x, sum.y, m.x, m.y);
          if (d < bestDist) {
            bestDist = d;
            targetMob = m;
          }
        }

        if (targetMob) {
          sum.facingAngle = Math.atan2(targetMob.y - sum.y, targetMob.x - sum.x);
          if (bestDist > targetMob.radius + 38) {
            sum.x += Math.cos(sum.facingAngle) * 210 * dt;
            sum.y += Math.sin(sum.facingAngle) * 210 * dt;
          } else if (now - sum.lastAttackAt > 950) {
            sum.lastAttackAt = now;
            this.damageMonster(realm, targetMob, owner, sum.damage, now, 8);
          }
        } else {
          const dOwner = dist(sum.x, sum.y, owner.x, owner.y);
          if (dOwner > 75) {
            sum.facingAngle = Math.atan2(owner.y - sum.y, owner.x - sum.x);
            sum.x += Math.cos(sum.facingAngle) * 200 * dt;
            sum.y += Math.sin(sum.facingAngle) * 200 * dt;
          }
        }
      }

      // 4. Update Monsters & Multi-Phase Bosses
      for (const m of realm.monsters.values()) {
        if (now < m.stunnedUntil) continue;

        const tpl = m.template;
        const phaseCfg = tpl.bossDef ? tpl.bossDef.phases[(m.phase || 1) - 1] : null;
        const dmgMult = phaseCfg ? phaseCfg.damageMult : 1;
        const spdPhaseMult = phaseCfg ? phaseCfg.speedMult : 1;
        const cdMult = phaseCfg ? phaseCfg.cooldownMult : 1;
        const effectiveAoe = phaseCfg ? phaseCfg.aoeRadius : tpl.aoeRadius;
        const speedMult = (now < m.slowedUntil ? 0.45 : 1) * spdPhaseMult;

        let nearest: ServerPlayer | null = null;
        let nearestDist = Infinity;
        for (const p of realm.players.values()) {
          if (p.isDead || getZoneAt(p.x, p.y).id === 'sanctuary') continue;
          const d = dist(m.x, m.y, p.x, p.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = p;
          }
        }

        if (m.aiState === 'windup') {
          m.stateTimerMs += dtMs;
          m.windupProgress = clamp(m.stateTimerMs / tpl.windupMs, 0, 1);
          if (m.stateTimerMs >= tpl.windupMs) {
            const strikeDmg = Math.round(tpl.damage * dmgMult);
            if (tpl.isRanged && nearest) {
              const a = Math.atan2(m.windupY - m.y, m.windupX - m.x);
              realm.projectiles.push({
                id: nextId('mproj'),
                ownerId: m.id,
                ownerType: 'monster',
                kind: 'fireball',
                x: m.x + Math.cos(a) * m.radius,
                y: m.y + Math.sin(a) * m.radius,
                vx: Math.cos(a) * 340,
                vy: Math.sin(a) * 340,
                radius: 9,
                color: m.zone === 'highlands' ? '#38BDF8' : '#F97316',
                damage: strikeDmg,
                expiresAt: now + 1600,
                piercing: false,
                hitIds: new Set(),
              });
            } else if (effectiveAoe) {
              realm.events.push({
                id: nextId('ev'),
                type: 'aoe',
                x: m.windupX,
                y: m.windupY,
                radius: effectiveAoe,
                color: phaseCfg ? phaseCfg.color : '#F97316',
              });
              for (const p of realm.players.values()) {
                if (!p.isDead && dist(p.x, p.y, m.windupX, m.windupY) <= effectiveAoe + 16) {
                  this.damagePlayer(realm, p, strikeDmg, now);
                }
              }
            } else {
              for (const p of realm.players.values()) {
                if (!p.isDead && dist(p.x, p.y, m.windupX, m.windupY) <= tpl.attackRange + 22) {
                  this.damagePlayer(realm, p, strikeDmg, now);
                }
              }
            }
            m.aiState = 'cooldown';
            m.stateTimerMs = 0;
            m.windupProgress = 0;
          }
          continue;
        }

        if (m.aiState === 'cooldown') {
          m.stateTimerMs += dtMs;
          if (m.stateTimerMs >= tpl.cooldownMs * cdMult) {
            m.aiState = 'idle';
            m.stateTimerMs = 0;
          }
          continue;
        }

        const leashDist = dist(m.x, m.y, m.spawnX, m.spawnY);
        if (nearest && nearestDist <= tpl.aggroRange && leashDist < 540) {
          m.targetId = nearest.id;
          m.facingAngle = Math.atan2(nearest.y - m.y, nearest.x - m.x);

          if (nearestDist <= tpl.attackRange) {
            m.aiState = 'windup';
            m.stateTimerMs = 0;
            m.windupProgress = 0;
            m.windupX = effectiveAoe && !m.isBoss ? m.x : nearest.x;
            m.windupY = effectiveAoe && !m.isBoss ? m.y : nearest.y;
            m.windupRadius = effectiveAoe || tpl.attackRange;
          } else {
            m.aiState = 'chase';
            const movePos = resolveObstacleCollisions(
              m.x + Math.cos(m.facingAngle) * tpl.speed * speedMult * dt,
              m.y + Math.sin(m.facingAngle) * tpl.speed * speedMult * dt,
              m.radius
            );
            if (getZoneAt(movePos.x, movePos.y).id !== 'sanctuary') {
              m.x = movePos.x;
              m.y = movePos.y;
            }
          }
        } else {
          m.aiState = 'idle';
          m.targetId = null;
          if (leashDist > 18) {
            const backAngle = Math.atan2(m.spawnY - m.y, m.spawnX - m.x);
            m.facingAngle = backAngle;
            const backPos = resolveObstacleCollisions(
              m.x + Math.cos(backAngle) * tpl.speed * 0.7 * dt,
              m.y + Math.sin(backAngle) * tpl.speed * 0.7 * dt,
              m.radius
            );
            m.x = backPos.x;
            m.y = backPos.y;
          } else {
            m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.04 * dt);
            if (m.isBoss && m.hp >= m.maxHp * 0.99 && m.phase !== 1 && tpl.bossDef) {
              m.phase = 1;
              m.telegraphName = tpl.bossDef.phases[0].telegraphName;
              m.windupRadius = tpl.bossDef.phases[0].aoeRadius;
            }
          }
        }
      }

      // 5. Update Projectiles
      for (let i = realm.projectiles.length - 1; i >= 0; i--) {
        const proj = realm.projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (
          now >= proj.expiresAt ||
          proj.x < 10 ||
          proj.x > WORLD_WIDTH - 10 ||
          proj.y < 10 ||
          proj.y > WORLD_HEIGHT - 10
        ) {
          realm.projectiles.splice(i, 1);
          continue;
        }

        let hitObstacle = false;
        for (const obs of WORLD_OBSTACLES) {
          if (dist(proj.x, proj.y, obs.x, obs.y) <= obs.radius + proj.radius * 0.5) {
            hitObstacle = true;
            break;
          }
        }
        if (hitObstacle) {
          realm.projectiles.splice(i, 1);
          continue;
        }

        if (proj.ownerType === 'player' || proj.ownerType === 'pet') {
          const attacker = realm.players.get(proj.ownerId);
          let consumed = false;
          for (const m of realm.monsters.values()) {
            if (proj.hitIds.has(m.id)) continue;
            if (dist(proj.x, proj.y, m.x, m.y) <= m.radius + proj.radius) {
              proj.hitIds.add(m.id);
              if (attacker) {
                this.damageMonster(realm, m, attacker, proj.damage, now, proj.ownerType === 'pet' ? 4 : 10);
              }
              if (!proj.piercing) {
                consumed = true;
                break;
              }
            }
          }
          if (consumed) {
            realm.projectiles.splice(i, 1);
          }
        } else {
          for (const p of realm.players.values()) {
            if (!p.isDead && dist(proj.x, proj.y, p.x, p.y) <= 18 + proj.radius) {
              this.damagePlayer(realm, p, proj.damage, now);
              realm.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }

      // 6. Ground Loot Pickup (never deletes item if inventory full!)
      for (let i = realm.loot.length - 1; i >= 0; i--) {
        const drop = realm.loot[i];
        if (now >= drop.expiresAt) {
          realm.loot.splice(i, 1);
          continue;
        }

        for (const p of realm.players.values()) {
          if (p.isDead) continue;
          if (dist(p.x, p.y, drop.x, drop.y) <= 34) {
            const pickedUp = this.grantDirectDropToPlayer(realm, p, drop);
            if (pickedUp) {
              realm.loot.splice(i, 1);
              this.syncProfile(p);
            }
            break;
          }
        }
      }

      // 7. Broadcast authoritative snapshot
      const snapshotPayload = JSON.stringify({
        type: 'snapshot',
        data: {
          t: now,
          realmCode: realm.code,
          weather: realm.weather,
          worldBoss: {
            name: BOSSES_DATA.boss_world_eclipse.name,
            isActive: Boolean(realm.worldBossActiveId),
            killsCount: realm.worldBossKillsCount,
            killsRequired: WORLD_BOSS_SPAWN_KILLS,
            nextSpawnInMs: realm.worldBossActiveId ? 0 : Math.max(0, realm.worldBossNextSpawnAt - now),
          },
          players: Array.from(realm.players.values()).map((p) => ({
            id: p.id,
            name: p.name,
            heroClass: p.heroClass,
            jobId: p.jobId,
            unlockedJobs: p.unlockedJobs,
            x: Math.round(p.x * 10) / 10,
            y: Math.round(p.y * 10) / 10,
            flightHeight: Math.round(p.flightHeight * 10) / 10,
            facingAngle: Math.round(p.facingAngle * 100) / 100,
            hp: Math.round(p.hp),
            maxHp: p.maxHp,
            mp: Math.round(p.mp),
            maxMp: p.maxMp,
            level: p.level,
            xp: p.xp,
            xpToNext: p.xpToNext,
            gold: p.gold,
            potions: p.potions,
            kills: p.kills,
            bossKills: p.bossKills,
            statPoints: p.statPoints,
            skillPoints: p.skillPoints,
            stats: p.stats,
            unlockedSkillNodes: p.unlockedSkillNodes,
            unlockedMounts: p.unlockedMounts,
            activeMount: p.activeMount,
            isMounted: p.isMounted,
            mountStamina: Math.round(p.mountStamina),
            maxMountStamina: p.maxMountStamina,
            mountSpecialCooldownMs: p.mountSpecialCooldownMs,
            unlockedPets: p.unlockedPets,
            activePet: p.activePet
              ? {
                  ...p.activePet,
                  x: Math.round(p.activePet.x * 10) / 10,
                  y: Math.round(p.activePet.y * 10) / 10,
                }
              : null,
            petLevel: p.petLevel,
            petXp: p.petXp,
            weaponTier: p.weaponTier,
            armorTier: p.armorTier,
            gearBonuses: p.gearBonuses,
            inventorySlots: p.inventorySlots,
            inventory: p.inventory,
            equipment: p.equipment,
            activeQuests: p.activeQuests,
            completedQuestIds: p.completedQuestIds,
            unlockedZones: p.unlockedZones,
            activeBuffs: p.activeBuffs,
            attackPower: p.attackPower,
            defense: p.defense,
            speed: p.speed,
            critChance: p.critChance,
            cooldownReductionPct: p.cooldownReductionPct,
            healPowerMult: p.healPowerMult,
            cooldowns: p.cooldowns,
            lastAttackAt: p.lastAttackAt,
            comboStep: p.comboStep,
            weaponStance: p.weaponStance,
            stunnedUntil: p.stunnedUntil,
            isDead: p.isDead,
            respawnTimerMs: p.respawnTimerMs,
            speedBuffUntil: p.speedBuffUntil,
            hitFlashUntil: p.hitFlashUntil,
            rallyCooldownUntil: p.rallyCooldownUntil,
            groupId: p.groupId,
          })),
          monsters: Array.from(realm.monsters.values()).map((m) => ({
            id: m.id,
            kind: m.kind,
            name: m.name,
            level: m.level,
            zone: m.zone,
            x: Math.round(m.x * 10) / 10,
            y: Math.round(m.y * 10) / 10,
            hp: Math.round(m.hp),
            maxHp: m.maxHp,
            radius: m.radius,
            isBoss: m.isBoss,
            isWorldBoss: m.isWorldBoss,
            phase: m.phase,
            telegraphName: m.telegraphName,
            aiState: m.aiState,
            facingAngle: Math.round(m.facingAngle * 100) / 100,
            windupX: Math.round(m.windupX),
            windupY: Math.round(m.windupY),
            windupRadius: m.windupRadius,
            windupProgress: Math.round(m.windupProgress * 100) / 100,
            hitFlashUntil: m.hitFlashUntil,
            slowedUntil: m.slowedUntil,
            stunnedUntil: m.stunnedUntil,
          })),
          summons: realm.summons.map((s) => ({
            id: s.id,
            ownerId: s.ownerId,
            kind: s.kind,
            x: Math.round(s.x * 10) / 10,
            y: Math.round(s.y * 10) / 10,
            facingAngle: Math.round(s.facingAngle * 100) / 100,
          })),
          projectiles: realm.projectiles.map((pr) => ({
            id: pr.id,
            ownerId: pr.ownerId,
            ownerType: pr.ownerType,
            kind: pr.kind,
            x: Math.round(pr.x),
            y: Math.round(pr.y),
            vx: pr.vx,
            vy: pr.vy,
            radius: pr.radius,
            color: pr.color,
          })),
          loot: realm.loot.map((l) => ({
            id: l.id,
            kind: l.kind,
            itemId: l.itemId,
            quantity: l.quantity,
            name: l.name,
            rarity: l.rarity,
            value: l.value,
            statBonus: l.statBonus,
            x: Math.round(l.x),
            y: Math.round(l.y),
          })),
          groups: Array.from(realm.groups.values()),
          merchantStocks: Object.fromEntries(realm.merchantStocks.entries()),
          events: realm.events,
        },
      } satisfies ServerMessage);

      for (const p of realm.players.values()) {
        if (p.ws.readyState === WebSocket.OPEN) {
          p.ws.send(snapshotPayload);
        }
      }
      realm.events = [];
    }
  }
}

export { QUARTERMASTER_NPC };
