import type { ZoneId } from './zonesData';

export type BossKind =
  | 'boss_treant'
  | 'boss_frost'
  | 'boss_lich'
  | 'boss_wyrm'
  | 'boss_world_eclipse';

export interface BossPhaseConfig {
  hpThresholdPct: number;
  damageMult: number;
  speedMult: number;
  cooldownMult: number;
  telegraphName: string;
  aoeRadius: number;
  color: string;
}

export interface BossDef {
  kind: BossKind;
  name: string;
  title: string;
  zone: ZoneId;
  level: number;
  spawnX: number;
  spawnY: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  aggroRange: number;
  attackRange: number;
  windupMs: number;
  cooldownMs: number;
  respawnMs: number;
  xpReward: number;
  goldReward: number;
  unlocksZoneId?: ZoneId;
  isWorldBoss?: boolean;
  guaranteedItemIds: string[];
  phases: [BossPhaseConfig, BossPhaseConfig, BossPhaseConfig];
}

export const WORLD_BOSS_SPAWN_KILLS = 25;
export const WORLD_BOSS_SPAWN_TIMER_MS = 180000;
export const WORLD_BOSS_ARENA = { x: 2660, y: 640 };

export const BOSSES_DATA: Record<BossKind, BossDef> = {
  boss_treant: {
    kind: 'boss_treant',
    name: 'Sylvan Behemoth',
    title: 'Warden of Whispering Woods',
    zone: 'woods',
    level: 5,
    spawnX: 540,
    spawnY: 980,
    maxHp: 1150,
    radius: 38,
    speed: 98,
    damage: 34,
    aggroRange: 380,
    attackRange: 105,
    windupMs: 1050,
    cooldownMs: 1750,
    respawnMs: 22000,
    xpReward: 480,
    goldReward: 160,
    unlocksZoneId: 'highlands',
    guaranteedItemIds: ['arm_sylvan_ward', 'qst_sanctuary_seal'],
    phases: [
      {
        hpThresholdPct: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
        telegraphName: 'Root Slam',
        aoeRadius: 115,
        color: '#22C55E',
      },
      {
        hpThresholdPct: 0.6,
        damageMult: 1.25,
        speedMult: 1.15,
        cooldownMult: 0.85,
        telegraphName: 'Thorn Tempest',
        aoeRadius: 145,
        color: '#84CC16',
      },
      {
        hpThresholdPct: 0.3,
        damageMult: 1.45,
        speedMult: 1.25,
        cooldownMult: 0.72,
        telegraphName: 'Verdant Cataclysm',
        aoeRadius: 175,
        color: '#F59E0B',
      },
    ],
  },
  boss_frost: {
    kind: 'boss_frost',
    name: 'Glacius, Frost Monarch',
    title: 'Sovereign of Frozen Highlands',
    zone: 'highlands',
    level: 9,
    spawnX: 1960,
    spawnY: 420,
    maxHp: 2100,
    radius: 40,
    speed: 112,
    damage: 52,
    aggroRange: 410,
    attackRange: 120,
    windupMs: 1050,
    cooldownMs: 1650,
    respawnMs: 26000,
    xpReward: 880,
    goldReward: 290,
    unlocksZoneId: 'ruins',
    guaranteedItemIds: ['wpn_frost_glaive', 'qst_frost_sigil'],
    phases: [
      {
        hpThresholdPct: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
        telegraphName: 'Glacial Cleave',
        aoeRadius: 125,
        color: '#38BDF8',
      },
      {
        hpThresholdPct: 0.6,
        damageMult: 1.28,
        speedMult: 1.18,
        cooldownMult: 0.85,
        telegraphName: 'Cryo Nova',
        aoeRadius: 160,
        color: '#0EA5E9',
      },
      {
        hpThresholdPct: 0.3,
        damageMult: 1.5,
        speedMult: 1.3,
        cooldownMult: 0.7,
        telegraphName: 'Absolute Zero',
        aoeRadius: 195,
        color: '#BAE6FD',
      },
    ],
  },
  boss_lich: {
    kind: 'boss_lich',
    name: 'Vaelgor, Ash Sovereign',
    title: 'Archon of the Ashen Ruins',
    zone: 'ruins',
    level: 11,
    spawnX: 980,
    spawnY: 2780,
    maxHp: 2950,
    radius: 40,
    speed: 118,
    damage: 66,
    aggroRange: 420,
    attackRange: 135,
    windupMs: 1000,
    cooldownMs: 1600,
    respawnMs: 28000,
    xpReward: 1250,
    goldReward: 420,
    unlocksZoneId: 'caldera',
    guaranteedItemIds: ['wpn_ashen_fang', 'arm_obsidian_shroud'],
    phases: [
      {
        hpThresholdPct: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
        telegraphName: 'Void Burst',
        aoeRadius: 135,
        color: '#A855F7',
      },
      {
        hpThresholdPct: 0.6,
        damageMult: 1.3,
        speedMult: 1.2,
        cooldownMult: 0.82,
        telegraphName: 'Twilight Singularity',
        aoeRadius: 170,
        color: '#C084FC',
      },
      {
        hpThresholdPct: 0.3,
        damageMult: 1.55,
        speedMult: 1.32,
        cooldownMult: 0.68,
        telegraphName: 'Ruinous Apocalypse',
        aoeRadius: 205,
        color: '#F43F5E',
      },
    ],
  },
  boss_wyrm: {
    kind: 'boss_wyrm',
    name: 'Ignis, Caldera Wyrm',
    title: 'Apex Dragon of the Caldera',
    zone: 'caldera',
    level: 14,
    spawnX: 3040,
    spawnY: 2340,
    maxHp: 4200,
    radius: 48,
    speed: 120,
    damage: 84,
    aggroRange: 460,
    attackRange: 145,
    windupMs: 1100,
    cooldownMs: 1550,
    respawnMs: 32000,
    xpReward: 2100,
    goldReward: 700,
    guaranteedItemIds: ['wpn_ignis_greatsword', 'mat_wyrm_scale'],
    phases: [
      {
        hpThresholdPct: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
        telegraphName: 'Magma Tail Sweep',
        aoeRadius: 150,
        color: '#F97316',
      },
      {
        hpThresholdPct: 0.6,
        damageMult: 1.3,
        speedMult: 1.2,
        cooldownMult: 0.82,
        telegraphName: 'Crimson Hellfire',
        aoeRadius: 185,
        color: '#EF4444',
      },
      {
        hpThresholdPct: 0.3,
        damageMult: 1.6,
        speedMult: 1.35,
        cooldownMult: 0.66,
        telegraphName: 'Solaris Meteor Storm',
        aoeRadius: 225,
        color: '#FDE047',
      },
    ],
  },
  boss_world_eclipse: {
    kind: 'boss_world_eclipse',
    name: 'Aurelion, Eclipse Sovereign',
    title: 'World Boss of the Crucible',
    zone: 'woods',
    level: 15,
    spawnX: WORLD_BOSS_ARENA.x,
    spawnY: WORLD_BOSS_ARENA.y,
    maxHp: 5600,
    radius: 52,
    speed: 125,
    damage: 78,
    aggroRange: 490,
    attackRange: 155,
    windupMs: 1100,
    cooldownMs: 1500,
    respawnMs: WORLD_BOSS_SPAWN_TIMER_MS,
    xpReward: 3200,
    goldReward: 1200,
    isWorldBoss: true,
    guaranteedItemIds: ['acc_wyrm_amulet', 'arm_dragon_sovereign', 'qst_sanctuary_seal'],
    phases: [
      {
        hpThresholdPct: 1.0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
        telegraphName: 'Eclipse Rend',
        aoeRadius: 165,
        color: '#FDE047',
      },
      {
        hpThresholdPct: 0.6,
        damageMult: 1.3,
        speedMult: 1.2,
        cooldownMult: 0.82,
        telegraphName: 'Starfall Barrage',
        aoeRadius: 205,
        color: '#C084FC',
      },
      {
        hpThresholdPct: 0.3,
        damageMult: 1.55,
        speedMult: 1.35,
        cooldownMult: 0.68,
        telegraphName: 'Solar Annihilation',
        aoeRadius: 245,
        color: '#F97316',
      },
    ],
  },
};

export const BOSS_LIST: BossDef[] = Object.values(BOSSES_DATA);
