export type MountId =
  | 'wolf'
  | 'cat'
  | 'stag'
  | 'dragon'
  | 'griffin'
  | 'pegasus'
  | 'phoenix'
  | 'wyvern';

export interface MountDefinition {
  id: MountId;
  name: string;
  species: string;
  description: string;
  color: string;
  accentColor: string;
  canFly: boolean;
  maxFlightHeight: number; // world Y meters above ground
  flightSpeedMult: number;
  speedMultiplier: number;
  jumpPower: number;
  maxStamina: number;
  staminaDrainPerSec: number;
  staminaRegenPerSec: number;
  specialName: string;
  specialDescription: string;
  specialStaminaCost: number;
  unlockRequirement: {
    minLevel: number;
    goldCost: number;
    requiresBossKill?: boolean;
    label: string;
  };
}

export const MOUNTS_DATA: Record<MountId, MountDefinition> = {
  wolf: {
    id: 'wolf',
    name: 'Shadowfang Wolf',
    species: 'Timber Wolf',
    description: 'Swift woodland wolf built for long overland treks across Whispering Woods.',
    color: '#64748B',
    accentColor: '#38BDF8',
    canFly: false,
    maxFlightHeight: 0,
    flightSpeedMult: 1,
    speedMultiplier: 1.55,
    jumpPower: 10.5,
    maxStamina: 100,
    staminaDrainPerSec: 8,
    staminaRegenPerSec: 18,
    specialName: 'Gale Lunge',
    specialDescription: 'Burst forward at high speed, knocking back nearby foes.',
    specialStaminaCost: 30,
    unlockRequirement: {
      minLevel: 1,
      goldCost: 50,
      label: 'Lv. 1 · 50 Gold',
    },
  },
  cat: {
    id: 'cat',
    name: 'Emberlynx',
    species: 'Great Cat',
    description: 'Agile spotted lynx with unmatched leap height and nimble sprint efficiency.',
    color: '#D97706',
    accentColor: '#FDE047',
    canFly: false,
    maxFlightHeight: 0,
    flightSpeedMult: 1,
    speedMultiplier: 1.65,
    jumpPower: 13.5,
    maxStamina: 120,
    staminaDrainPerSec: 7,
    staminaRegenPerSec: 22,
    specialName: 'Sky Pounce',
    specialDescription: 'High-arcing leap shockwave that slows monsters on landing.',
    specialStaminaCost: 35,
    unlockRequirement: {
      minLevel: 2,
      goldCost: 110,
      label: 'Lv. 2 · 110 Gold',
    },
  },
  stag: {
    id: 'stag',
    name: 'Sylvan Hart',
    species: 'Crystal Stag',
    description: 'Sacred antlered guardian whose hooves channel rejuvenating forest mist.',
    color: '#10B981',
    accentColor: '#6EE7B7',
    canFly: false,
    maxFlightHeight: 0,
    flightSpeedMult: 1,
    speedMultiplier: 1.7,
    jumpPower: 12.2,
    maxStamina: 140,
    staminaDrainPerSec: 6,
    staminaRegenPerSec: 26,
    specialName: 'Verdant Pulse',
    specialDescription: 'Unleash emerald shockwaves that restore 12% HP and damage nearby monsters.',
    specialStaminaCost: 32,
    unlockRequirement: {
      minLevel: 3,
      goldCost: 170,
      label: 'Lv. 3 · 170 Gold',
    },
  },
  griffin: {
    id: 'griffin',
    name: 'Galecrest Griffin',
    species: 'Winged Griffin',
    description: 'Fierce winged sky-hunter capable of soaring above ridges and forests.',
    color: '#D97706',
    accentColor: '#93C5FD',
    canFly: true,
    maxFlightHeight: 13,
    flightSpeedMult: 1.25,
    speedMultiplier: 1.74,
    jumpPower: 13.8,
    maxStamina: 145,
    staminaDrainPerSec: 6,
    staminaRegenPerSec: 24,
    specialName: 'Tempest Dive',
    specialDescription: 'Gust storm burst that knocks foes back and boosts aerial lift.',
    specialStaminaCost: 35,
    unlockRequirement: {
      minLevel: 4,
      goldCost: 240,
      label: 'Lv. 4 · 240 Gold (Can Fly)',
    },
  },
  pegasus: {
    id: 'pegasus',
    name: 'Aether Pegasus',
    species: 'Winged Celestial Steed',
    description: 'Radiant winged stallion riding silver wind currents effortlessly across the sky.',
    color: '#E2E8F0',
    accentColor: '#7DD3FC',
    canFly: true,
    maxFlightHeight: 15,
    flightSpeedMult: 1.32,
    speedMultiplier: 1.82,
    jumpPower: 14.4,
    maxStamina: 160,
    staminaDrainPerSec: 5.5,
    staminaRegenPerSec: 28,
    specialName: 'Starlight Charge',
    specialDescription: 'Streak forward through air currents leaving an arcane star burst.',
    specialStaminaCost: 35,
    unlockRequirement: {
      minLevel: 5,
      goldCost: 320,
      label: 'Lv. 5 · 320 Gold (Can Fly)',
    },
  },
  dragon: {
    id: 'dragon',
    name: 'Skyscale Drake',
    species: 'Winged Dragon',
    description: 'Tamed volcanic drake with soaring wings, vast stamina, and fiery breath.',
    color: '#991B1B',
    accentColor: '#F97316',
    canFly: true,
    maxFlightHeight: 16,
    flightSpeedMult: 1.35,
    speedMultiplier: 1.88,
    jumpPower: 15.0,
    maxStamina: 170,
    staminaDrainPerSec: 6,
    staminaRegenPerSec: 26,
    specialName: 'Caldera Breath',
    specialDescription: 'Unleash a scorched AoE flame burst around the drake.',
    specialStaminaCost: 40,
    unlockRequirement: {
      minLevel: 5,
      goldCost: 340,
      label: 'Lv. 5 · 340 Gold or Boss Kill (Can Fly)',
    },
  },
  wyvern: {
    id: 'wyvern',
    name: 'Netherwing Wyvern',
    species: 'Winged Abyssal Wyvern',
    description: 'Razor-winged twilight wyvern that slices across storm clouds with shadow venom.',
    color: '#4C1D95',
    accentColor: '#C084FC',
    canFly: true,
    maxFlightHeight: 16,
    flightSpeedMult: 1.38,
    speedMultiplier: 1.92,
    jumpPower: 15.2,
    maxStamina: 175,
    staminaDrainPerSec: 6,
    staminaRegenPerSec: 28,
    specialName: 'Eclipse Shriek',
    specialDescription: 'Void wing-blast slowing enemies by 50% and dealing heavy AoE damage.',
    specialStaminaCost: 38,
    unlockRequirement: {
      minLevel: 7,
      goldCost: 480,
      label: 'Lv. 7 · 480 Gold (Can Fly)',
    },
  },
  phoenix: {
    id: 'phoenix',
    name: 'Solaris Phoenix',
    species: 'Winged Immortal Firebird',
    description: 'Mythic winged sovereign of dawn fire with supreme altitude and blazing glide.',
    color: '#EA580C',
    accentColor: '#FDE047',
    canFly: true,
    maxFlightHeight: 18,
    flightSpeedMult: 1.45,
    speedMultiplier: 2.0,
    jumpPower: 16.0,
    maxStamina: 200,
    staminaDrainPerSec: 5,
    staminaRegenPerSec: 32,
    specialName: 'Rebirth Flare',
    specialDescription: 'Radiant solar nova restoring 20% HP/MP and scorching nearby foes.',
    specialStaminaCost: 42,
    unlockRequirement: {
      minLevel: 9,
      goldCost: 750,
      label: 'Lv. 9 · 750 Gold (Can Fly)',
    },
  },
};

export const MOUNT_LIST: MountDefinition[] = [
  MOUNTS_DATA.wolf,
  MOUNTS_DATA.cat,
  MOUNTS_DATA.stag,
  MOUNTS_DATA.griffin,
  MOUNTS_DATA.pegasus,
  MOUNTS_DATA.dragon,
  MOUNTS_DATA.wyvern,
  MOUNTS_DATA.phoenix,
];
