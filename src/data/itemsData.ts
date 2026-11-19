export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ItemCategory =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'consumable'
  | 'material'
  | 'quest'
  | 'mount_gear';

export type ItemElement = 'physical' | 'fire' | 'ice' | 'wind' | 'holy' | 'arcane' | 'shadow';

export interface RarityStyle {
  id: ItemRarity;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  dropWeight: number;
}

export const RARITY_CONFIG: Record<ItemRarity, RarityStyle> = {
  common: {
    id: 'common',
    label: 'Common',
    color: '#CBD5E1',
    bgClass: 'bg-slate-800/70',
    borderClass: 'border-slate-500/40',
    dropWeight: 55,
  },
  uncommon: {
    id: 'uncommon',
    label: 'Uncommon',
    color: '#34D399',
    bgClass: 'bg-emerald-950/60',
    borderClass: 'border-emerald-400/50',
    dropWeight: 27,
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    color: '#60A5FA',
    bgClass: 'bg-sky-950/60',
    borderClass: 'border-sky-400/60',
    dropWeight: 12,
  },
  epic: {
    id: 'epic',
    label: 'Epic',
    color: '#C084FC',
    bgClass: 'bg-purple-950/60',
    borderClass: 'border-purple-400/70',
    dropWeight: 5,
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    color: '#F59E0B',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-400/80',
    dropWeight: 1,
  },
};

export interface ItemStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  maxMp?: number;
  critChancePct?: number;
  speedBonus?: number;
  mountSpeedBonus?: number;
  mountStaminaBonus?: number;
  element?: ItemElement;
}

export interface ConsumableEffect {
  healHpPct?: number;
  healMpPct?: number;
  buffAttackPct?: number;
  buffDefense?: number;
  buffDurationMs?: number;
  expandSlots?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  dropChance: number;
  stackable: boolean;
  maxStack: number;
  buyPrice: number;
  sellPrice: number;
  iconKey:
    | 'sword'
    | 'staff'
    | 'bow'
    | 'dagger'
    | 'armor'
    | 'ring'
    | 'saddle'
    | 'potion_hp'
    | 'potion_mp'
    | 'elixir'
    | 'satchel'
    | 'crystal'
    | 'fang'
    | 'seal'
    | 'scroll';
  modelStyle: {
    colorHex: number;
    glowHex?: number;
    scale?: number;
  };
  stats?: ItemStats;
  consumable?: ConsumableEffect;
}

export const STARTING_INVENTORY_SLOTS = 30;
export const MAX_INVENTORY_SLOTS = 48;
export const MAX_ITEM_STACK = 99;

export const ITEMS_DATA: Record<string, ItemDef> = {
  // --- WEAPONS ---
  wpn_iron_blade: {
    id: 'wpn_iron_blade',
    name: 'Sunsteel Blade',
    description: 'Balanced sanctuary-forged blade etched with warm solar runes.',
    category: 'weapon',
    rarity: 'common',
    dropChance: 0.3,
    stackable: false,
    maxStack: 1,
    buyPrice: 75,
    sellPrice: 30,
    iconKey: 'sword',
    modelStyle: { colorHex: 0xdbeafe, glowHex: 0xfbbf24, scale: 1.0 },
    stats: { attack: 9, critChancePct: 2, element: 'physical' },
  },
  wpn_sylvan_edge: {
    id: 'wpn_sylvan_edge',
    name: 'Verdant Runeblade',
    description: 'Tempered in whispering sap, resonating with swift forest wind.',
    category: 'weapon',
    rarity: 'uncommon',
    dropChance: 0.22,
    stackable: false,
    maxStack: 1,
    buyPrice: 180,
    sellPrice: 72,
    iconKey: 'sword',
    modelStyle: { colorHex: 0x34d399, glowHex: 0x10b981, scale: 1.06 },
    stats: { attack: 18, speedBonus: 12, element: 'wind' },
  },
  wpn_frost_glaive: {
    id: 'wpn_frost_glaive',
    name: 'Glacierheart Edge',
    description: 'Crystalline weapon forged from eternal Frozen Highlands ice.',
    category: 'weapon',
    rarity: 'rare',
    dropChance: 0.14,
    stackable: false,
    maxStack: 1,
    buyPrice: 420,
    sellPrice: 170,
    iconKey: 'sword',
    modelStyle: { colorHex: 0x7dd3fc, glowHex: 0x38bdf8, scale: 1.12 },
    stats: { attack: 32, critChancePct: 6, element: 'ice' },
  },
  wpn_arcane_spire: {
    id: 'wpn_arcane_spire',
    name: 'Astral Spire Focus',
    description: 'Amplifies elemental channeling and precision critical strikes.',
    category: 'weapon',
    rarity: 'rare',
    dropChance: 0.14,
    stackable: false,
    maxStack: 1,
    buyPrice: 440,
    sellPrice: 175,
    iconKey: 'staff',
    modelStyle: { colorHex: 0x818cf8, glowHex: 0x6366f1, scale: 1.12 },
    stats: { attack: 30, maxMp: 35, critChancePct: 7, element: 'arcane' },
  },
  wpn_ashen_fang: {
    id: 'wpn_ashen_fang',
    name: 'Ashen Sovereign Fang',
    description: 'Shadow-infused relic reclaimed from the Fallen Ash Lords.',
    category: 'weapon',
    rarity: 'epic',
    dropChance: 0.08,
    stackable: false,
    maxStack: 1,
    buyPrice: 880,
    sellPrice: 350,
    iconKey: 'dagger',
    modelStyle: { colorHex: 0xc084fc, glowHex: 0xa855f7, scale: 1.18 },
    stats: { attack: 48, critChancePct: 10, speedBonus: 18, element: 'shadow' },
  },
  wpn_ignis_greatsword: {
    id: 'wpn_ignis_greatsword',
    name: 'Solaris Dragonbrand',
    description: 'Legendary blade blazing with the living heartfire of Ignis.',
    category: 'weapon',
    rarity: 'legendary',
    dropChance: 0.02,
    stackable: false,
    maxStack: 1,
    buyPrice: 1950,
    sellPrice: 780,
    iconKey: 'sword',
    modelStyle: { colorHex: 0xf97316, glowHex: 0xfef08a, scale: 1.26 },
    stats: { attack: 74, critChancePct: 14, maxHp: 60, element: 'fire' },
  },

  // --- ARMOR ---
  arm_traveler_coat: {
    id: 'arm_traveler_coat',
    name: 'Sanctuary Brigandine',
    description: 'Supple leather and bronze plating suited for frontier scouts.',
    category: 'armor',
    rarity: 'common',
    dropChance: 0.3,
    stackable: false,
    maxStack: 1,
    buyPrice: 70,
    sellPrice: 28,
    iconKey: 'armor',
    modelStyle: { colorHex: 0x64748b, scale: 1.0 },
    stats: { defense: 7, maxHp: 35, element: 'physical' },
  },
  arm_sylvan_ward: {
    id: 'arm_sylvan_ward',
    name: 'Sylvan Barkweave',
    description: 'Enchanted emerald armor woven with resilient spirit bark.',
    category: 'armor',
    rarity: 'uncommon',
    dropChance: 0.22,
    stackable: false,
    maxStack: 1,
    buyPrice: 175,
    sellPrice: 70,
    iconKey: 'armor',
    modelStyle: { colorHex: 0x15803d, glowHex: 0x34d399, scale: 1.02 },
    stats: { defense: 14, maxHp: 75, element: 'wind' },
  },
  arm_frost_plate: {
    id: 'arm_frost_plate',
    name: 'Glacier Warden Mantle',
    description: 'Sculpted cryo-steel armor forged to withstand highland blizzards.',
    category: 'armor',
    rarity: 'rare',
    dropChance: 0.14,
    stackable: false,
    maxStack: 1,
    buyPrice: 410,
    sellPrice: 164,
    iconKey: 'armor',
    modelStyle: { colorHex: 0x0284c7, glowHex: 0x7dd3fc, scale: 1.04 },
    stats: { defense: 24, maxHp: 135, element: 'ice' },
  },
  arm_obsidian_shroud: {
    id: 'arm_obsidian_shroud',
    name: 'Obsidian Aegis Vestment',
    description: 'Imperial shadow armor hardened in volcanic obsidian.',
    category: 'armor',
    rarity: 'epic',
    dropChance: 0.08,
    stackable: false,
    maxStack: 1,
    buyPrice: 860,
    sellPrice: 345,
    iconKey: 'armor',
    modelStyle: { colorHex: 0x4c1d95, glowHex: 0xc084fc, scale: 1.05 },
    stats: { defense: 36, maxHp: 210, maxMp: 30, element: 'shadow' },
  },
  arm_dragon_sovereign: {
    id: 'arm_dragon_sovereign',
    name: 'Caldera Sovereign Raiment',
    description: 'Legendary dragon-forged armor radiating golden solar wards.',
    category: 'armor',
    rarity: 'legendary',
    dropChance: 0.02,
    stackable: false,
    maxStack: 1,
    buyPrice: 1900,
    sellPrice: 760,
    iconKey: 'armor',
    modelStyle: { colorHex: 0xb45309, glowHex: 0xfde047, scale: 1.06 },
    stats: { defense: 52, maxHp: 320, critChancePct: 5, element: 'fire' },
  },

  // --- ACCESSORIES ---
  acc_wind_ring: {
    id: 'acc_wind_ring',
    name: 'Windrunner Signet',
    description: 'Feather-light silver ring that quickens footsteps and strikes.',
    category: 'accessory',
    rarity: 'uncommon',
    dropChance: 0.18,
    stackable: false,
    maxStack: 1,
    buyPrice: 150,
    sellPrice: 60,
    iconKey: 'ring',
    modelStyle: { colorHex: 0x34d399, glowHex: 0x6ee7b7 },
    stats: { speedBonus: 24, critChancePct: 4, element: 'wind' },
  },
  acc_frost_pendant: {
    id: 'acc_frost_pendant',
    name: 'Frostheart Pendant',
    description: 'Chilled sapphire talisman calming mana channels in combat.',
    category: 'accessory',
    rarity: 'rare',
    dropChance: 0.12,
    stackable: false,
    maxStack: 1,
    buyPrice: 360,
    sellPrice: 145,
    iconKey: 'ring',
    modelStyle: { colorHex: 0x38bdf8, glowHex: 0xbae6fd },
    stats: { attack: 12, defense: 8, maxMp: 45, element: 'ice' },
  },
  acc_wyrm_amulet: {
    id: 'acc_wyrm_amulet',
    name: 'Wyrmsoul Halo',
    description: 'Legendary floating solar crest that empowers every skill.',
    category: 'accessory',
    rarity: 'legendary',
    dropChance: 0.03,
    stackable: false,
    maxStack: 1,
    buyPrice: 1450,
    sellPrice: 580,
    iconKey: 'ring',
    modelStyle: { colorHex: 0xf59e0b, glowHex: 0xfef08a },
    stats: { attack: 26, defense: 14, critChancePct: 9, maxHp: 110, element: 'holy' },
  },

  // --- MOUNT GEAR ---
  mnt_swift_stirrups: {
    id: 'mnt_swift_stirrups',
    name: 'Silverleaf Stirrups',
    description: 'Refined stirrups boosting mount gallop speed and stamina.',
    category: 'mount_gear',
    rarity: 'uncommon',
    dropChance: 0.15,
    stackable: false,
    maxStack: 1,
    buyPrice: 210,
    sellPrice: 84,
    iconKey: 'saddle',
    modelStyle: { colorHex: 0x94a3b8, glowHex: 0x34d399 },
    stats: { mountSpeedBonus: 0.16, mountStaminaBonus: 35, speedBonus: 8 },
  },
  mnt_frost_barding: {
    id: 'mnt_frost_barding',
    name: 'Frostmane Saddlecloth',
    description: 'Armored highland barding granting superior mount endurance.',
    category: 'mount_gear',
    rarity: 'epic',
    dropChance: 0.06,
    stackable: false,
    maxStack: 1,
    buyPrice: 620,
    sellPrice: 250,
    iconKey: 'saddle',
    modelStyle: { colorHex: 0x38bdf8, glowHex: 0xe0f2fe },
    stats: { mountSpeedBonus: 0.28, mountStaminaBonus: 70, defense: 10 },
  },

  // --- CONSUMABLES (Stack up to 99) ---
  con_vitality_potion: {
    id: 'con_vitality_potion',
    name: 'Crimson Vitality Potion',
    description: 'Restores 45% of your Maximum HP immediately.',
    category: 'consumable',
    rarity: 'common',
    dropChance: 0.35,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 24,
    sellPrice: 10,
    iconKey: 'potion_hp',
    modelStyle: { colorHex: 0xef4444, glowHex: 0xf87171 },
    consumable: { healHpPct: 0.45 },
  },
  con_aether_elixir: {
    id: 'con_aether_elixir',
    name: 'Azure Aether Elixir',
    description: 'Restores 55% of your Maximum MP immediately.',
    category: 'consumable',
    rarity: 'common',
    dropChance: 0.3,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 26,
    sellPrice: 10,
    iconKey: 'potion_mp',
    modelStyle: { colorHex: 0x3b82f6, glowHex: 0x93c5fd },
    consumable: { healMpPct: 0.55 },
  },
  con_warriors_draught: {
    id: 'con_warriors_draught',
    name: 'Furyborn Draught',
    description: 'Grants +22% Attack Power for 30 seconds.',
    category: 'consumable',
    rarity: 'uncommon',
    dropChance: 0.16,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 85,
    sellPrice: 34,
    iconKey: 'elixir',
    modelStyle: { colorHex: 0xf97316, glowHex: 0xfdba74 },
    consumable: { buffAttackPct: 0.22, buffDurationMs: 30000 },
  },
  con_ironbark_tonic: {
    id: 'con_ironbark_tonic',
    name: 'Ironbark Tonic',
    description: 'Hardens skin for +24 Defense for 30 seconds.',
    category: 'consumable',
    rarity: 'uncommon',
    dropChance: 0.16,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 85,
    sellPrice: 34,
    iconKey: 'elixir',
    modelStyle: { colorHex: 0x10b981, glowHex: 0x6ee7b7 },
    consumable: { buffDefense: 24, buffDurationMs: 30000 },
  },
  con_satchel_expansion: {
    id: 'con_satchel_expansion',
    name: 'Adventurer Satchel Expand',
    description: 'Permanently expands your inventory capacity by +6 slots (up to 48).',
    category: 'consumable',
    rarity: 'rare',
    dropChance: 0.04,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 320,
    sellPrice: 120,
    iconKey: 'satchel',
    modelStyle: { colorHex: 0xd97706, glowHex: 0xfde047 },
    consumable: { expandSlots: 6 },
  },

  // --- MATERIALS & QUEST ITEMS (Stack up to 99) ---
  mat_slime_gel: {
    id: 'mat_slime_gel',
    name: 'Luminous Slime Gel',
    description: 'Alchemical gel harvested from Timber Slimes.',
    category: 'material',
    rarity: 'common',
    dropChance: 0.45,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 18,
    sellPrice: 8,
    iconKey: 'crystal',
    modelStyle: { colorHex: 0x4ade80, glowHex: 0x22c55e },
  },
  mat_boar_fang: {
    id: 'mat_boar_fang',
    name: 'Serrated Boar Fang',
    description: 'Sturdy ivory fang prized by Sanctuary crafters and alchemists.',
    category: 'material',
    rarity: 'common',
    dropChance: 0.4,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 22,
    sellPrice: 10,
    iconKey: 'fang',
    modelStyle: { colorHex: 0xfef3c7 },
  },
  mat_glacier_crystal: {
    id: 'mat_glacier_crystal',
    name: 'Glacier Mana Crystal',
    description: 'Pure frost crystal pulsing with highland mana.',
    category: 'material',
    rarity: 'rare',
    dropChance: 0.25,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 95,
    sellPrice: 42,
    iconKey: 'crystal',
    modelStyle: { colorHex: 0x7dd3fc, glowHex: 0x38bdf8 },
  },
  mat_wyrm_scale: {
    id: 'mat_wyrm_scale',
    name: 'Molten Wyrm Scale',
    description: 'Heat-forged dragon scale dropped by elite caldera beasts.',
    category: 'material',
    rarity: 'epic',
    dropChance: 0.15,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 240,
    sellPrice: 105,
    iconKey: 'crystal',
    modelStyle: { colorHex: 0xf97316, glowHex: 0xef4444 },
  },
  qst_sanctuary_seal: {
    id: 'qst_sanctuary_seal',
    name: 'Ascension Job Seal',
    description: 'Sacred crest required by Job Master Kaelen to unlock an advanced job branch.',
    category: 'quest',
    rarity: 'rare',
    dropChance: 0.08,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 150,
    sellPrice: 50,
    iconKey: 'seal',
    modelStyle: { colorHex: 0xfbbf24, glowHex: 0xfef08a },
  },
  qst_frost_sigil: {
    id: 'qst_frost_sigil',
    name: 'Frost Monarch Sigil',
    description: 'Trophy proof of conquering Glacius in the Frozen Highlands.',
    category: 'quest',
    rarity: 'epic',
    dropChance: 0.0,
    stackable: true,
    maxStack: MAX_ITEM_STACK,
    buyPrice: 0,
    sellPrice: 180,
    iconKey: 'scroll',
    modelStyle: { colorHex: 0x38bdf8, glowHex: 0xe0f2fe },
  },
};

export const ALL_ITEM_IDS = Object.keys(ITEMS_DATA);

export function rollWeightedLootItem(zoneLevel: number, isBoss: boolean): ItemDef {
  const pool = Object.values(ITEMS_DATA).filter((it) => {
    if (it.id === 'qst_frost_sigil') return false;
    if (it.category === 'material') return true;
    if (it.rarity === 'legendary') return isBoss && zoneLevel >= 8;
    if (it.rarity === 'epic') return isBoss || zoneLevel >= 7;
    if (it.rarity === 'rare') return isBoss || zoneLevel >= 4;
    return true;
  });

  const weighted = pool.map((it) => {
    const rWeight = RARITY_CONFIG[it.rarity].dropWeight;
    const bossBoost = isBoss && (it.rarity === 'rare' || it.rarity === 'epic' || it.rarity === 'legendary') ? 4.5 : 1;
    return { item: it, weight: Math.max(0.5, rWeight * it.dropChance * bossBoost) };
  });

  const total = weighted.reduce((acc, cur) => acc + cur.weight, 0);
  let r = Math.random() * total;
  for (const entry of weighted) {
    r -= entry.weight;
    if (r <= 0) return entry.item;
  }
  return ITEMS_DATA.con_vitality_potion;
}
