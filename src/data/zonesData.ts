export type ZoneId = 'sanctuary' | 'woods' | 'highlands' | 'ruins' | 'caldera';

export interface ZoneDef {
  id: ZoneId;
  order: number;
  name: string;
  levelLabel: string;
  centerX: number;
  centerY: number;
  radius: number;
  gateX: number;
  gateY: number;
  gateAngle: number;
  accentColor: string;
  themeDescription: string;
  unlockedByDefault: boolean;
  requiredBossName?: string;
  requiredZoneId?: ZoneId;
  barrierColorHex: number;
  barrierMessage: string;
}

// Non-linear branching open world centered at (1800, 1600)
export const WORLD_WIDTH = 3600;
export const WORLD_HEIGHT = 3200;
export const WORLD_SCALE = 0.1;

export const SANCTUARY_CENTER = { x: 1800, y: 1600, radius: 460 };

export const WORLD_ZONES: ZoneDef[] = [
  {
    id: 'sanctuary',
    order: 0,
    name: 'Sunlit Sanctuary',
    levelLabel: 'Safe Heart',
    centerX: 1800,
    centerY: 1600,
    radius: 460,
    gateX: 1800,
    gateY: 1600,
    gateAngle: 0,
    accentColor: '#10B981',
    themeDescription: 'Central marble citadel housing the Healing Fountain, merchants, quest elders, and job masters.',
    unlockedByDefault: true,
    barrierColorHex: 0x10b981,
    barrierMessage: 'Always open to travelers.',
  },
  {
    id: 'woods',
    order: 1,
    name: 'Whispering Woods',
    levelLabel: 'Lv. 1–4',
    centerX: 820,
    centerY: 1320,
    radius: 760,
    gateX: 1350,
    gateY: 1460,
    gateAngle: 0.25,
    accentColor: '#22C55E',
    themeDescription: 'Winding emerald forest roads & river bridges patrolled by slimes, boars, and Sylvan Behemoth.',
    unlockedByDefault: true,
    barrierColorHex: 0x22c55e,
    barrierMessage: 'Open western frontier.',
  },
  {
    id: 'highlands',
    order: 2,
    name: 'Frozen Highlands',
    levelLabel: 'Lv. 5–8',
    centerX: 2050,
    centerY: 620,
    radius: 760,
    gateX: 1920,
    gateY: 1120,
    gateAngle: Math.PI / 2,
    accentColor: '#38BDF8',
    themeDescription: 'Northern alpine plateaus and Eclipse Crucible guarded by frost wolves, colossi, and Glacius.',
    unlockedByDefault: false,
    requiredZoneId: 'woods',
    requiredBossName: 'Sylvan Behemoth',
    barrierColorHex: 0x38bdf8,
    barrierMessage: 'Sealed by Glacial Barrier — Defeat Sylvan Behemoth in Whispering Woods (or join an unlocked group).',
  },
  {
    id: 'ruins',
    order: 3,
    name: 'Ashen Ruins',
    levelLabel: 'Lv. 8–11',
    centerX: 1120,
    centerY: 2560,
    radius: 760,
    gateX: 1480,
    gateY: 2060,
    gateAngle: -0.75,
    accentColor: '#A855F7',
    themeDescription: 'Southern sunken temple courtyards haunted by bone stalkers, obsidian knights, and Vaelgor.',
    unlockedByDefault: false,
    requiredZoneId: 'highlands',
    requiredBossName: 'Glacius, Frost Monarch',
    barrierColorHex: 0xa855f7,
    barrierMessage: 'Sealed by Twilight Ward — Defeat Glacius in Frozen Highlands (or join an unlocked group).',
  },
  {
    id: 'caldera',
    order: 4,
    name: "Dragon's Caldera",
    levelLabel: 'Lv. 12+ Boss',
    centerX: 2900,
    centerY: 2150,
    radius: 760,
    gateX: 2320,
    gateY: 1860,
    gateAngle: -0.45,
    accentColor: '#EF4444',
    themeDescription: 'Southeastern volcanic crater swirling with magma rivers and the ancient wyrm Ignis.',
    unlockedByDefault: false,
    requiredZoneId: 'ruins',
    requiredBossName: 'Vaelgor, Ash Sovereign',
    barrierColorHex: 0xef4444,
    barrierMessage: 'Sealed by Magma Seal — Defeat Vaelgor in Ashen Ruins (or join an unlocked group).',
  },
];

export const DEFAULT_UNLOCKED_ZONES: ZoneId[] = ['sanctuary', 'woods'];

export function getZoneAt(x: number, y = SANCTUARY_CENTER.y): ZoneDef {
  const distSanctuary = Math.hypot(x - SANCTUARY_CENTER.x, y - SANCTUARY_CENTER.y);
  if (distSanctuary <= SANCTUARY_CENTER.radius) {
    return WORLD_ZONES[0];
  }

  // Non-linear directional sector & distance check around the hub
  const dx = x - SANCTUARY_CENTER.x;
  const dy = y - SANCTUARY_CENTER.y;

  // North / Northeast quadrant -> Frozen Highlands (including Eclipse Crucible)
  if (dy < -180 && dx > -520) {
    return WORLD_ZONES[2];
  }
  // South / Southwest quadrant -> Ashen Ruins
  if (dy > 260 && dx < 420) {
    return WORLD_ZONES[3];
  }
  // East / Southeast quadrant -> Dragon's Caldera
  if (dx >= 420 && dy >= -220) {
    return WORLD_ZONES[4];
  }
  // West / Northwest frontier -> Whispering Woods
  return WORLD_ZONES[1];
}

export function getZoneById(id: ZoneId): ZoneDef {
  return WORLD_ZONES.find((z) => z.id === id) || WORLD_ZONES[0];
}
