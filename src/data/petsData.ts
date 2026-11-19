export type PetId =
  | 'slime_pup'
  | 'wisp'
  | 'fox'
  | 'owl'
  | 'ferret'
  | 'spirit_wolf'
  | 'mini_drake'
  | 'celestial_fairy';

export interface PetDefinition {
  id: PetId;
  name: string;
  species: string;
  description: string;
  color: string;
  accentColor: string;
  xpBonusPct: number; // Base XP boost % (+2% extra per pet level)
  goldBonusPct: number;
  pickupRadius: number; // World units within which pet vacuums ground drops
  assistDamageMult: number; // Multiplier of player's attackPower for companion bolt
  assistCooldownMs: number;
  healPctPerTrigger?: number;
  minLevel: number;
  goldCost: number;
}

export const PETS_DATA: Record<PetId, PetDefinition> = {
  slime_pup: {
    id: 'slime_pup',
    name: 'Dewdrop Slime',
    species: 'Alchemical Companion',
    description: 'Bouncy emerald slime that scoops up nearby coins and boosts early leveling XP.',
    color: '#22C55E',
    accentColor: '#86EFAC',
    xpBonusPct: 10,
    goldBonusPct: 6,
    pickupRadius: 115,
    assistDamageMult: 0.25,
    assistCooldownMs: 2600,
    minLevel: 1,
    goldCost: 40,
  },
  wisp: {
    id: 'wisp',
    name: 'Sunbeam Wisp',
    species: 'Luminous Sprite',
    description: 'Cheerful golden lantern spirit that gathers drops and sends soothing mend pulses.',
    color: '#FBBF24',
    accentColor: '#FEF08A',
    xpBonusPct: 14,
    goldBonusPct: 8,
    pickupRadius: 135,
    assistDamageMult: 0.28,
    assistCooldownMs: 2400,
    healPctPerTrigger: 0.03,
    minLevel: 1,
    goldCost: 110,
  },
  fox: {
    id: 'fox',
    name: 'Gale Kitsune',
    species: 'Twin-Tail Fox',
    description: 'Swift ember-furred fox that darts for loot and fires piercing wind bolts.',
    color: '#F97316',
    accentColor: '#FDBA74',
    xpBonusPct: 18,
    goldBonusPct: 12,
    pickupRadius: 165,
    assistDamageMult: 0.36,
    assistCooldownMs: 2000,
    minLevel: 2,
    goldCost: 190,
  },
  owl: {
    id: 'owl',
    name: 'Frostwind Owl',
    species: 'Glacial Familiar',
    description: 'Wise highland owl whose icy gaze chills attackers and widens drop collection.',
    color: '#38BDF8',
    accentColor: '#E0F2FE',
    xpBonusPct: 22,
    goldBonusPct: 14,
    pickupRadius: 185,
    assistDamageMult: 0.4,
    assistCooldownMs: 1950,
    minLevel: 3,
    goldCost: 270,
  },
  ferret: {
    id: 'ferret',
    name: 'Gilded Ferret',
    species: 'Treasure Hunter',
    description: 'Obsessed with shiny loot! Features the widest auto-collection radius and extra gold.',
    color: '#D97706',
    accentColor: '#FDE047',
    xpBonusPct: 16,
    goldBonusPct: 30,
    pickupRadius: 260,
    assistDamageMult: 0.32,
    assistCooldownMs: 2100,
    minLevel: 4,
    goldCost: 340,
  },
  spirit_wolf: {
    id: 'spirit_wolf',
    name: 'Astral Pup',
    species: 'Runic Wolfhound',
    description: 'Fierce miniature guardian wolf that accelerates XP mastery and shreds foes.',
    color: '#6366F1',
    accentColor: '#A5B4FC',
    xpBonusPct: 26,
    goldBonusPct: 15,
    pickupRadius: 195,
    assistDamageMult: 0.48,
    assistCooldownMs: 1700,
    minLevel: 5,
    goldCost: 460,
  },
  mini_drake: {
    id: 'mini_drake',
    name: 'Cinder Drakelet',
    species: 'Winged Hatchling',
    description: 'Miniature winged dragon that scorches targets with ember bolts while scooping loot.',
    color: '#EF4444',
    accentColor: '#FB923C',
    xpBonusPct: 30,
    goldBonusPct: 20,
    pickupRadius: 215,
    assistDamageMult: 0.56,
    assistCooldownMs: 1600,
    minLevel: 7,
    goldCost: 640,
  },
  celestial_fairy: {
    id: 'celestial_fairy',
    name: 'Seraph Sprite',
    species: 'Mythic Astral Companion',
    description: 'Ancient winged guardian maximizing XP gain, auto-looting, and periodic hero healing.',
    color: '#C084FC',
    accentColor: '#F5D0FE',
    xpBonusPct: 38,
    goldBonusPct: 25,
    pickupRadius: 275,
    assistDamageMult: 0.62,
    assistCooldownMs: 1500,
    healPctPerTrigger: 0.05,
    minLevel: 9,
    goldCost: 920,
  },
};

export const PET_LIST: PetDefinition[] = [
  PETS_DATA.slime_pup,
  PETS_DATA.wisp,
  PETS_DATA.fox,
  PETS_DATA.owl,
  PETS_DATA.ferret,
  PETS_DATA.spirit_wolf,
  PETS_DATA.mini_drake,
  PETS_DATA.celestial_fairy,
];

export function petXpForNextLevel(petLevel: number): number {
  return Math.round(90 * Math.pow(petLevel, 1.32));
}

export function getEffectivePetXpBonus(petId: PetId | null | undefined, petLevel: number): number {
  if (!petId || !PETS_DATA[petId]) return 0;
  return PETS_DATA[petId].xpBonusPct + Math.max(0, petLevel - 1) * 2;
}
