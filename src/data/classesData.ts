export type HeroClass =
  | 'warrior'
  | 'mage'
  | 'archer'
  | 'healer'
  | 'assassin'
  | 'summoner';

export interface ClassDefinition {
  id: HeroClass;
  name: string;
  role: string;
  weaponType: string;
  playstyle: string;
  color: string;
  baseHp: number;
  baseMp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  attackRange: number;
  attackCooldownMs: number;
  isRanged: boolean;
}

export const CLASSES_DATA: Record<HeroClass, ClassDefinition> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    role: 'Frontline Guardian',
    weaponType: 'Greatsword & Kite Shield',
    playstyle: 'High armor melee bruiser who cleaves packs, stuns threats, and shields allies.',
    color: '#D99B26',
    baseHp: 230,
    baseMp: 95,
    baseAttack: 24,
    baseDefense: 10,
    baseSpeed: 125,
    attackRange: 92,
    attackCooldownMs: 430,
    isRanged: false,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    role: 'Elemental Blaster',
    weaponType: 'Arcane Crystal Staff',
    playstyle: 'Long-range spellcaster unleashing frost slows, arcane blasts, and meteor storms.',
    color: '#60A5FA',
    baseHp: 145,
    baseMp: 175,
    baseAttack: 29,
    baseDefense: 3,
    baseSpeed: 118,
    attackRange: 370,
    attackCooldownMs: 450,
    isRanged: true,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    role: 'Agile Marksman',
    weaponType: 'Carved Longbow',
    playstyle: 'Fast-moving ranged striker with piercing volleys, traps, and evasive leaps.',
    color: '#34D399',
    baseHp: 165,
    baseMp: 125,
    baseAttack: 26,
    baseDefense: 5,
    baseSpeed: 135,
    attackRange: 400,
    attackCooldownMs: 360,
    isRanged: true,
  },
  healer: {
    id: 'healer',
    name: 'Healer',
    role: 'Radiant Support',
    weaponType: 'Sun Mace & Sacred Tome',
    playstyle: 'Sustains groups with radiant healing pulses, sanctuary wards, and light smites.',
    color: '#FDE047',
    baseHp: 185,
    baseMp: 170,
    baseAttack: 21,
    baseDefense: 7,
    baseSpeed: 120,
    attackRange: 300,
    attackCooldownMs: 440,
    isRanged: true,
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    role: 'Shadow Striker',
    weaponType: 'Twin Crimson Daggers',
    playstyle: 'Ultra-fast melee burst dealer specializing in critical strikes and shadow blinks.',
    color: '#F43F5E',
    baseHp: 155,
    baseMp: 115,
    baseAttack: 30,
    baseDefense: 4,
    baseSpeed: 142,
    attackRange: 84,
    attackCooldownMs: 310,
    isRanged: false,
  },
  summoner: {
    id: 'summoner',
    name: 'Summoner',
    role: 'Spirit Commander',
    weaponType: 'Grimoire & Rune Rod',
    playstyle: 'Commands spectral spirits that automatically hunt monsters while casting hexes.',
    color: '#A855F7',
    baseHp: 160,
    baseMp: 180,
    baseAttack: 22,
    baseDefense: 5,
    baseSpeed: 122,
    attackRange: 340,
    attackCooldownMs: 460,
    isRanged: true,
  },
};

export const CLASS_LIST: ClassDefinition[] = [
  CLASSES_DATA.warrior,
  CLASSES_DATA.mage,
  CLASSES_DATA.archer,
  CLASSES_DATA.healer,
  CLASSES_DATA.assassin,
  CLASSES_DATA.summoner,
];
