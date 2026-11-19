import type { HeroClass } from './classesData';

export interface ClassCombatConfig {
  comboHitMults: [number, number, number];
  comboResetMs: number;
  weaponVariants: [string, string];
}

export const COMBAT_CONFIG_DATA: Record<HeroClass, ClassCombatConfig> = {
  warrior: {
    comboHitMults: [1.0, 1.15, 1.42],
    comboResetMs: 1400,
    weaponVariants: ['Greatsword & Kite Shield', 'Two-Handed Cleaver'],
  },
  mage: {
    comboHitMults: [1.0, 1.12, 1.36],
    comboResetMs: 1400,
    weaponVariants: ['Arcane Crystal Staff', 'Prismatic Focus Orb'],
  },
  archer: {
    comboHitMults: [1.0, 1.1, 1.35],
    comboResetMs: 1300,
    weaponVariants: ['Carved Longbow', 'Swift Recurve Bow'],
  },
  healer: {
    comboHitMults: [1.0, 1.1, 1.32],
    comboResetMs: 1400,
    weaponVariants: ['Sun Mace & Sacred Tome', 'Dawn Scepter'],
  },
  assassin: {
    comboHitMults: [1.0, 1.14, 1.45],
    comboResetMs: 1250,
    weaponVariants: ['Twin Crimson Daggers', 'Shadow Kusarigama'],
  },
  summoner: {
    comboHitMults: [1.0, 1.12, 1.34],
    comboResetMs: 1400,
    weaponVariants: ['Grimoire & Rune Rod', 'Astral Bell'],
  },
};
