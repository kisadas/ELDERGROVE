import { DEFAULT_UNLOCKED_ZONES } from '../data/zonesData';
import { STARTING_INVENTORY_SLOTS } from '../data/itemsData';
import type { HeroClass, InventorySlot, SavedProfile } from '../shared/gameTypes';

const LEGACY_STORAGE_KEY = 'eldergrove_hero_profile_v3';
const ROSTER_PREFIX = 'eldergrove_roster_v4_';
const ACTIVE_ID_PREFIX = 'eldergrove_active_char_v4_';

export const CLASS_PORTRAITS: Record<HeroClass, string> = {
  warrior: '/src/assets/images/class_vanguard_portrait_1795087733898.jpg',
  mage: '/src/assets/images/class_arcanist_portrait_1795087733475.jpg',
  archer: '/src/assets/images/class_ranger_portrait_1795087734946.jpg',
  healer: '/src/assets/images/class_healer_portrait_1795088950979.jpg',
  assassin: '/src/assets/images/class_assassin_portrait_1795088950544.jpg',
  summoner: '/src/assets/images/class_summoner_portrait_1795088950452.jpg',
};

export const TITLE_BACKDROP = '/src/assets/images/realm_title_backdrop_1795087733454.jpg';

export function createStarterInventory(slots = STARTING_INVENTORY_SLOTS): (InventorySlot | null)[] {
  const arr: (InventorySlot | null)[] = Array.from({ length: slots }, () => null);
  arr[0] = { itemId: 'con_vitality_potion', quantity: 3 };
  arr[1] = { itemId: 'con_aether_elixir', quantity: 2 };
  arr[2] = { itemId: 'con_warriors_draught', quantity: 1 };
  return arr;
}

export function createDefaultProfile(
  name = 'Alden',
  heroClass: HeroClass = 'warrior',
  realmCode = 'ELDER-MAIN'
): SavedProfile {
  return {
    playerId: `hero_${Math.random().toString(36).slice(2, 10)}`,
    name: name.trim().slice(0, 18) || 'Alden',
    heroClass,
    jobId: null,
    unlockedJobs: [],
    level: 1,
    xp: 0,
    gold: 90,
    potions: 3,
    kills: 0,
    bossKills: 0,
    statPoints: 0,
    skillPoints: 1,
    stats: { might: 0, vitality: 0, agility: 0 },
    unlockedSkillNodes: [],
    unlockedMounts: [],
    activeMount: null,
    unlockedPets: [],
    activePetId: null,
    petLevel: 1,
    petXp: 0,
    weaponTier: 0,
    armorTier: 0,
    gearBonuses: {
      might: 0,
      vitality: 0,
      agility: 0,
      bestGearName: 'Traveler Emblem',
      bestGearRarity: 'common',
    },
    inventorySlots: STARTING_INVENTORY_SLOTS,
    inventory: createStarterInventory(STARTING_INVENTORY_SLOTS),
    equipment: {
      weapon: 'wpn_iron_blade',
      armor: 'arm_traveler_coat',
      accessory: null,
      mountGear: null,
    },
    activeQuests: [],
    completedQuestIds: [],
    unlockedZones: [...DEFAULT_UNLOCKED_ZONES],
    lastRealmCode: realmCode,
    updatedAt: Date.now(),
  };
}

export function normalizeProfile(raw: Partial<SavedProfile>): SavedProfile | null {
  if (!raw || !raw.playerId || !raw.heroClass) return null;
  const base = createDefaultProfile(raw.name || 'Alden', raw.heroClass, raw.lastRealmCode || 'ELDER-MAIN');
  const slotCount = Math.max(STARTING_INVENTORY_SLOTS, raw.inventorySlots || STARTING_INVENTORY_SLOTS);
  const inv = Array.from({ length: slotCount }, (_, i) => (raw.inventory && raw.inventory[i]) || null);
  const unlockedJobs = Array.isArray(raw.unlockedJobs)
    ? raw.unlockedJobs
    : raw.jobId
      ? [raw.jobId]
      : [];
  return {
    ...base,
    ...raw,
    unlockedJobs,
    unlockedMounts: Array.isArray(raw.unlockedMounts) ? raw.unlockedMounts : [],
    unlockedPets: Array.isArray(raw.unlockedPets) ? raw.unlockedPets : [],
    activePetId: raw.activePetId ?? null,
    petLevel: Math.max(1, Number(raw.petLevel || 1)),
    petXp: Math.max(0, Number(raw.petXp || 0)),
    inventorySlots: slotCount,
    inventory: inv,
    equipment: { ...base.equipment, ...(raw.equipment || {}) },
    activeQuests: Array.isArray(raw.activeQuests) ? raw.activeQuests : [],
    completedQuestIds: Array.isArray(raw.completedQuestIds) ? raw.completedQuestIds : [],
    unlockedZones:
      Array.isArray(raw.unlockedZones) && raw.unlockedZones.length > 0
        ? raw.unlockedZones
        : [...DEFAULT_UNLOCKED_ZONES],
    updatedAt: Number(raw.updatedAt || Date.now()),
  };
}

export function loadRoster(uid: string): SavedProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `${ROSTER_PREFIX}${uid}`;
    const raw = localStorage.getItem(key);
    const list: SavedProfile[] = [];
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedProfile>[];
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const norm = normalizeProfile(item);
          if (norm) list.push(norm);
        }
      }
    }
    // Migrate legacy single-character save into roster if present and not yet imported
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw && list.length === 0) {
      const legacy = normalizeProfile(JSON.parse(legacyRaw) as Partial<SavedProfile>);
      if (legacy) {
        list.push(legacy);
        saveRoster(uid, list);
      }
    }
    return list;
  } catch {
    return [];
  }
}

export function saveRoster(uid: string, roster: SavedProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${ROSTER_PREFIX}${uid}`, JSON.stringify(roster));
  } catch {
    // ignore quota errors
  }
}

export function saveCharacterToRoster(uid: string, profile: SavedProfile): SavedProfile[] {
  const stamped: SavedProfile = { ...profile, updatedAt: Date.now() };
  const current = loadRoster(uid);
  const idx = current.findIndex((c) => c.playerId === stamped.playerId);
  const next = idx >= 0
    ? current.map((c, i) => (i === idx ? stamped : c))
    : [stamped, ...current];
  saveRoster(uid, next);
  setActiveCharacterId(uid, stamped.playerId);
  return next;
}

export function deleteCharacterFromRoster(uid: string, playerId: string): SavedProfile[] {
  const current = loadRoster(uid).filter((c) => c.playerId !== playerId);
  saveRoster(uid, current);
  return current;
}

export function mergeRosters(local: SavedProfile[], cloud: SavedProfile[]): SavedProfile[] {
  const byId = new Map<string, SavedProfile>();
  for (const item of local) {
    byId.set(item.playerId, item);
  }
  for (const c of cloud) {
    const existing = byId.get(c.playerId);
    if (!existing) {
      byId.set(c.playerId, c);
    } else {
      const pickCloud =
        (c.updatedAt || 0) > (existing.updatedAt || 0) ||
        c.level > existing.level ||
        (c.level === existing.level && c.xp > existing.xp);
      byId.set(c.playerId, pickCloud ? c : existing);
    }
  }
  return Array.from(byId.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getActiveCharacterId(uid: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${ACTIVE_ID_PREFIX}${uid}`);
}

export function setActiveCharacterId(uid: string, playerId: string | null) {
  if (typeof window === 'undefined') return;
  if (playerId) {
    localStorage.setItem(`${ACTIVE_ID_PREFIX}${uid}`, playerId);
  } else {
    localStorage.removeItem(`${ACTIVE_ID_PREFIX}${uid}`);
  }
}
