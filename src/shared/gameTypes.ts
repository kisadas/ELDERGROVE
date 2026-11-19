import { CLASSES_DATA, CLASS_LIST } from '../data/classesData.ts';
import type { ClassDefinition, HeroClass } from '../data/classesData.ts';
import type { ItemRarity } from '../data/itemsData.ts';
import type { MountId } from '../data/mountsData.ts';
import type { PetId } from '../data/petsData.ts';
import type { WeatherType } from '../data/weatherData.ts';
import {
  DEFAULT_UNLOCKED_ZONES,
  SANCTUARY_CENTER,
  WORLD_HEIGHT,
  WORLD_SCALE,
  WORLD_WIDTH,
  WORLD_ZONES,
  getZoneAt,
} from '../data/zonesData.ts';
import type { ZoneId } from '../data/zonesData.ts';

export type { HeroClass, MountId, PetId, WeatherType, ZoneId };
export {
  CLASSES_DATA,
  CLASS_LIST,
  DEFAULT_UNLOCKED_ZONES,
  SANCTUARY_CENTER,
  WORLD_HEIGHT,
  WORLD_SCALE,
  WORLD_WIDTH,
  WORLD_ZONES,
  getZoneAt,
};

export const GROUP_REWARD_RADIUS_UNITS = 500; // 50.0 meters (10 units = 1 meter)
export const GROUP_REWARD_RADIUS_METERS = 50;
export const MAX_GROUP_MEMBERS = 10;
export const PUBLIC_REALM_CODE = 'ELDER-MAIN';

export type MonsterKind =
  | 'slime'
  | 'boar'
  | 'golem'
  | 'frost_wolf'
  | 'ice_golem'
  | 'frost_valkyrie'
  | 'stalker'
  | 'imp'
  | 'knight'
  | 'wyrmling'
  | 'boss_treant'
  | 'boss_frost'
  | 'boss_lich'
  | 'boss_wyrm'
  | 'boss_world_eclipse';

export type LootRarity = ItemRarity;

export interface PlayerStats {
  might: number;
  vitality: number;
  agility: number;
}

export interface GearBonuses {
  might: number;
  vitality: number;
  agility: number;
  bestGearName: string;
  bestGearRarity: LootRarity;
}

export interface InventorySlot {
  itemId: string;
  quantity: number;
}

export interface EquippedGear {
  weapon: string | null;
  armor: string | null;
  accessory: string | null;
  mountGear: string | null;
}

export interface ActiveQuestProgress {
  questId: string;
  progress: number;
  completed: boolean;
}

export interface ActiveBuffs {
  attackPct: number;
  attackUntil: number;
  defenseFlat: number;
  defenseUntil: number;
}

export interface PetState {
  id: PetId;
  level: number;
  xp: number;
  xpToNext: number;
  x: number;
  y: number;
  facingAngle: number;
}

export type ClassConfig = ClassDefinition;

export const CLASS_CONFIG: Record<HeroClass, ClassConfig> = CLASSES_DATA;

export const SANCTUARY_FOUNTAIN = {
  x: SANCTUARY_CENTER.x,
  y: SANCTUARY_CENTER.y,
  radius: 62,
};

export const QUARTERMASTER_NPC = {
  x: 1730,
  y: 1620,
  radius: 36,
};

export interface WorldObstacle {
  x: number;
  y: number;
  radius: number;
  kind: 'tree' | 'pillar' | 'boulder' | 'shrine' | 'ice_crystal';
}

export const WORLD_OBSTACLES: WorldObstacle[] = [
  // Central Sanctuary Shrines & Marble Pillars framing the 4 roads
  { x: 1580, y: 1410, radius: 22, kind: 'shrine' },
  { x: 2020, y: 1410, radius: 22, kind: 'shrine' },
  { x: 1580, y: 1790, radius: 22, kind: 'shrine' },
  { x: 2020, y: 1790, radius: 22, kind: 'shrine' },

  // Whispering Woods (West & NW)
  { x: 1210, y: 1120, radius: 34, kind: 'tree' },
  { x: 1140, y: 1680, radius: 38, kind: 'tree' },
  { x: 940, y: 940, radius: 42, kind: 'tree' },
  { x: 920, y: 1540, radius: 34, kind: 'tree' },
  { x: 740, y: 1220, radius: 38, kind: 'tree' },
  { x: 640, y: 1580, radius: 42, kind: 'tree' },
  { x: 480, y: 1180, radius: 36, kind: 'tree' },
  { x: 440, y: 780, radius: 38, kind: 'tree' },

  // Frozen Highlands (North & NE)
  { x: 1660, y: 840, radius: 34, kind: 'ice_crystal' },
  { x: 2180, y: 880, radius: 38, kind: 'ice_crystal' },
  { x: 1780, y: 540, radius: 36, kind: 'ice_crystal' },
  { x: 2180, y: 520, radius: 40, kind: 'ice_crystal' },
  { x: 1540, y: 600, radius: 32, kind: 'ice_crystal' },

  // Ashen Ruins (South & SW)
  { x: 1320, y: 2320, radius: 34, kind: 'pillar' },
  { x: 960, y: 2340, radius: 32, kind: 'pillar' },
  { x: 1280, y: 2680, radius: 36, kind: 'pillar' },
  { x: 820, y: 2660, radius: 34, kind: 'pillar' },
  { x: 1120, y: 2940, radius: 36, kind: 'pillar' },

  // Dragon's Caldera (East & SE)
  { x: 2480, y: 1980, radius: 40, kind: 'boulder' },
  { x: 2620, y: 2420, radius: 42, kind: 'boulder' },
  { x: 2880, y: 1780, radius: 38, kind: 'boulder' },
  { x: 3180, y: 2040, radius: 42, kind: 'boulder' },
  { x: 2960, y: 2660, radius: 40, kind: 'boulder' },
];

export function getTerrainHeight(wx: number, wy: number): number {
  const distSanctuary = Math.hypot(wx - SANCTUARY_CENTER.x, wy - SANCTUARY_CENTER.y);
  if (distSanctuary < 430) {
    // Gentle marble plinth rising around Fountain
    return Math.max(0, (240 - distSanctuary) * 0.004);
  }

  // Northern highlands climb smoothly to snowy ridge
  let h = 0;
  if (wy < 1180 && wx > 1250) {
    h += Math.min(3.4, (1180 - wy) * 0.0045);
  }
  // Southeastern caldera crater dips near magma center (3040, 2340)
  const calderaDist = Math.hypot(wx - 3040, wy - 2340);
  if (calderaDist < 310) {
    h -= (1 - calderaDist / 310) * 1.45;
  }

  // Gentle organic rolling hills elsewhere
  h += Math.sin(wx * 0.008) * Math.cos(wy * 0.008) * 0.65;
  return Math.max(-1.35, h);
}

export interface PlayerState {
  id: string;
  name: string;
  heroClass: HeroClass;
  jobId: string | null;
  unlockedJobs: string[];
  x: number;
  y: number;
  flightHeight: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  potions: number;
  kills: number;
  bossKills: number;
  statPoints: number;
  skillPoints: number;
  stats: PlayerStats;
  unlockedSkillNodes: string[];
  unlockedMounts: MountId[];
  activeMount: MountId | null;
  isMounted: boolean;
  mountStamina: number;
  maxMountStamina: number;
  mountSpecialCooldownMs: number;
  unlockedPets: PetId[];
  activePet: PetState | null;
  petLevel: number;
  petXp: number;
  weaponTier: number;
  armorTier: number;
  gearBonuses: GearBonuses;
  inventorySlots: number;
  inventory: (InventorySlot | null)[];
  equipment: EquippedGear;
  activeQuests: ActiveQuestProgress[];
  completedQuestIds: string[];
  unlockedZones: ZoneId[];
  activeBuffs: ActiveBuffs;
  attackPower: number;
  defense: number;
  speed: number;
  critChance: number;
  cooldownReductionPct: number;
  healPowerMult: number;
  cooldowns: [number, number, number, number, number, number, number, number];
  lastAttackAt: number;
  comboStep: 1 | 2 | 3;
  weaponStance: 0 | 1;
  stunnedUntil: number;
  isDead: boolean;
  respawnTimerMs: number;
  speedBuffUntil: number;
  hitFlashUntil: number;
  rallyCooldownUntil: number;
  groupId: string | null;
}

export interface MonsterState {
  id: string;
  kind: MonsterKind;
  name: string;
  level: number;
  zone: ZoneId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  isBoss: boolean;
  isWorldBoss?: boolean;
  phase?: 1 | 2 | 3;
  telegraphName?: string;
  aiState: 'idle' | 'chase' | 'windup' | 'cooldown';
  facingAngle: number;
  windupX: number;
  windupY: number;
  windupRadius: number;
  windupProgress: number;
  hitFlashUntil: number;
  slowedUntil: number;
  stunnedUntil: number;
}

export interface SummonState {
  id: string;
  ownerId: string;
  kind: 'wolf_spirit' | 'rune_sentinel';
  x: number;
  y: number;
  facingAngle: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  ownerType: 'player' | 'monster' | 'pet';
  kind: 'arrow' | 'bolt' | 'fireball' | 'pierce_arrow';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface LootDrop {
  id: string;
  kind: 'gold' | 'orb' | 'gear' | 'item';
  itemId?: string;
  quantity?: number;
  name: string;
  rarity: LootRarity;
  value: number;
  statBonus?: Partial<PlayerStats>;
  x: number;
  y: number;
}

export interface CombatEvent {
  id: string;
  type: 'damage' | 'heal' | 'xp' | 'loot' | 'level_up' | 'slash' | 'aoe' | 'quest' | 'zone_unlock' | 'buff' | 'pet_pickup' | 'world_boss';
  x: number;
  y: number;
  angle?: number;
  radius?: number;
  text?: string;
  color: string;
  isCrit?: boolean;
  comboStep?: 1 | 2 | 3;
  playerId?: string;
}

export interface GroupInfo {
  id: string;
  leaderId: string;
  memberIds: string[];
  unlockedZones: ZoneId[];
}

export interface GroupInvite {
  groupId: string;
  fromId: string;
  fromName: string;
}

export interface MerchantStockState {
  merchantId: string;
  items: {
    itemId: string;
    stock: number;
    maxStock: number;
    nextRestockAt: number;
  }[];
}

export interface WorldBossTracker {
  name: string;
  isActive: boolean;
  killsCount: number;
  killsRequired: number;
  nextSpawnInMs: number;
}

export interface WorldSnapshot {
  t: number;
  realmCode: string;
  weather: WeatherType;
  worldBoss: WorldBossTracker;
  players: PlayerState[];
  monsters: MonsterState[];
  summons: SummonState[];
  projectiles: ProjectileState[];
  loot: LootDrop[];
  groups: GroupInfo[];
  merchantStocks: Record<string, MerchantStockState>;
  events: CombatEvent[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderClass?: HeroClass;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SavedProfile {
  playerId: string;
  name: string;
  heroClass: HeroClass;
  jobId: string | null;
  unlockedJobs: string[];
  level: number;
  xp: number;
  gold: number;
  potions: number;
  kills: number;
  bossKills: number;
  statPoints: number;
  skillPoints: number;
  stats: PlayerStats;
  unlockedSkillNodes: string[];
  unlockedMounts: MountId[];
  activeMount: MountId | null;
  unlockedPets: PetId[];
  activePetId: PetId | null;
  petLevel: number;
  petXp: number;
  weaponTier: number;
  armorTier: number;
  gearBonuses: GearBonuses;
  inventorySlots: number;
  inventory: (InventorySlot | null)[];
  equipment: EquippedGear;
  activeQuests: ActiveQuestProgress[];
  completedQuestIds: string[];
  unlockedZones: ZoneId[];
  lastRealmCode?: string;
  updatedAt?: number;
}

export type ClientMessage =
  | { type: 'join'; realmCode: string; profile: SavedProfile }
  | { type: 'input'; dx: number; dy: number; aimAngle: number; flightHeight?: number; sprint?: boolean }
  | { type: 'attack'; aimAngle: number }
  | { type: 'switch_weapon' }
  | { type: 'cast_skill'; skillIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; aimX: number; aimY: number; aimAngle: number }
  | { type: 'use_potion' }
  | { type: 'hit_fountain' }
  | { type: 'inv_move'; fromIndex: number; toIndex: number }
  | { type: 'inv_use'; slotIndex: number }
  | { type: 'inv_equip'; slotIndex: number }
  | { type: 'inv_auto_equip' }
  | { type: 'inv_unequip'; equipSlot: keyof EquippedGear }
  | { type: 'inv_sort' }
  | { type: 'inv_drop'; slotIndex: number }
  | { type: 'accept_quest'; questId: string }
  | { type: 'complete_quest'; questId: string }
  | { type: 'talk_npc'; npcId: string }
  | { type: 'buy_item'; merchantId: string; itemId: string; quantity: number }
  | { type: 'sell_item'; merchantId: string; slotIndex: number; quantity: number }
  | { type: 'change_job'; jobId: string }
  | { type: 'allocate_stat'; stat: keyof PlayerStats }
  | { type: 'unlock_skill_node'; nodeId: string }
  | { type: 'unlock_mount'; mountId: MountId }
  | { type: 'toggle_mount'; mountId?: MountId }
  | { type: 'mount_special'; aimAngle: number }
  | { type: 'unlock_pet'; petId: PetId }
  | { type: 'toggle_pet'; petId?: PetId }
  | { type: 'upgrade_gear'; slot: 'weapon' | 'armor' | 'potion' }
  | { type: 'respawn_town' }
  | { type: 'rally_friend'; targetPlayerId: string }
  | { type: 'group_create' }
  | { type: 'group_invite'; targetPlayerId: string }
  | { type: 'group_respond'; groupId: string; accept: boolean }
  | { type: 'group_kick'; targetPlayerId: string }
  | { type: 'group_leave' }
  | { type: 'chat'; text: string };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; realmCode: string; serverTime: number }
  | { type: 'snapshot'; data: WorldSnapshot }
  | { type: 'profile_sync'; profile: SavedProfile }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'group_invite'; invite: GroupInvite }
  | { type: 'zone_unlocked'; zoneId: ZoneId; zoneName: string; unlockedBy: string }
  | { type: 'barrier_blocked'; zoneId: ZoneId; message: string }
  | { type: 'notification'; message: string; tone?: 'info' | 'warning' | 'success' };

export function xpForNextLevel(level: number): number {
  return Math.round(180 * Math.pow(level, 1.65));
}

export function getUpgradeCost(currentTier: number): number {
  return 28 + currentTier * 22;
}
