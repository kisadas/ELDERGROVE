import type { HeroClass } from './classesData';

export interface SkillTreeNode {
  id: string;
  tier: number;
  name: string;
  description: string;
  requires: string[];
  cost: number;
  col: number; // 0, 1, 2 for visual alignment
  bonuses: {
    might?: number;
    vitality?: number;
    agility?: number;
    attackPct?: number;
    defensePct?: number;
    maxHpPct?: number;
    critChanceAdd?: number;
    speedPct?: number;
    cooldownReductionPct?: number;
    healPowerPct?: number;
  };
}

function makeFifteenTierTree(cls: HeroClass, focusName: string): SkillTreeNode[] {
  const prefix = cls.slice(0, 3);
  const nodes: SkillTreeNode[] = [];

  const baseNames = [
    ['Tempered Foundation', 'Swift Stride', 'Iron Guard'],
    ['Aether Tuning', 'Quick Reflexes', 'Arcane Focus'],
    ['Vanguard Plating', 'Zephyr Step', 'Heartseeker'],
    ['Radiant Grace', 'Blessed Ward', 'Solar Surge'],
    ['Shadow Fang', 'Phantom Step', 'Lethal Focus'],
    ['Spirit Pact', 'Mystic Step', 'Conjurer Ward'],
    ['Titan Strength', 'Gale Reflex', 'Berserker Edge'],
    ['Archmage Focus', 'Astral Flow', 'Spellweaver Vigor'],
    ['Ranger Precision', 'Wind Dancer', 'Deadeye Focus'],
    ['Saintly Aura', 'Divine Grace', 'Holy Radiance'],
    ['Nightblade Vigor', 'Shadow Meld', 'Executioner Strike'],
    ['Elder Conjuration', 'Rune Resonance', 'Astral Sovereign'],
    ['Warlord Dominance', 'Titanskin', 'Blade Tempest Mastery'],
    ['Cosmic Intellect', 'Starlight Mastery', 'Archmage Ascendance'],
    ['Apex Mastery', 'Legendary Sovereign', 'Eldergrove Transcendence'],
  ];

  for (let t = 1; t <= 15; t++) {
    const prevTier = t - 1;
    for (let c = 0; c < 3; c++) {
      const id = `${prefix}_t${t}_${c === 0 ? 'a' : c === 1 ? 'b' : 'c'}`;
      const name = baseNames[t - 1][c] || `Mastery T${t}-${c + 1}`;
      const requires: string[] = [];
      if (t > 1) {
        requires.push(`${prefix}_t${prevTier}_${c === 1 ? 'b' : 'a'}`);
      }

      const isTankOrHealer = focusName === 'tank' || focusName === 'healer';
      const statVal = t * 2;
      const pctVal = Number((t * 0.025).toFixed(3));

      nodes.push({
        id,
        tier: t,
        name,
        description: `Tier ${t} Mastery: +${statVal} Stats · +${Math.round(pctVal * 100)}% ${c === 0 ? (isTankOrHealer ? 'Max HP / Defense' : 'Attack Power') : c === 1 ? 'Speed / Cooldown' : 'Crit / Agility'}`,
        requires,
        cost: 1,
        col: c,
        bonuses:
          c === 0
            ? isTankOrHealer
              ? { vitality: statVal, maxHpPct: pctVal }
              : { might: statVal, attackPct: pctVal }
            : c === 1
              ? { agility: Math.max(1, Math.floor(statVal * 0.7)), speedPct: Number((pctVal * 0.8).toFixed(3)), cooldownReductionPct: Number((pctVal * 0.5).toFixed(3)) }
              : { agility: statVal, critChanceAdd: Number((pctVal * 0.6).toFixed(3)) },
      });
    }
  }

  return nodes;
}

export const SKILL_TREES_DATA: Record<HeroClass, SkillTreeNode[]> = {
  warrior: makeFifteenTierTree('warrior', 'tank'),
  mage: makeFifteenTierTree('mage', 'caster'),
  archer: makeFifteenTierTree('archer', 'marksman'),
  healer: makeFifteenTierTree('healer', 'healer'),
  assassin: makeFifteenTierTree('assassin', 'crit'),
  summoner: makeFifteenTierTree('summoner', 'summon'),
};
