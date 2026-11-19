import type { HeroClass } from './classesData';
import type { SkillEffectKind } from './skillsData';

export interface JobSkillDef {
  id: string;
  slotIndex: 6 | 7;
  hotkey: '6' | '7';
  name: string;
  description: string;
  cooldownMs: number;
  manaCost: number;
  damageMult: number;
  radius: number;
  effectKind: SkillEffectKind;
  color: string;
}

export interface JobBranchDef {
  id: string;
  baseClass: HeroClass;
  tier: 1 | 2 | 3 | 4; // 4 Tiers x 2 Paths = 8 Job Advancements per class
  path: 'A' | 'B';
  name: string;
  epithet: string;
  accentColor: string;
  description: string;
  requiredLevel: number;
  requiredQuestId?: string;
  requiredItemId?: string;
  goldCost: number;
  statBonuses: {
    attack: number;
    defense: number;
    maxHp: number;
    maxMp: number;
    critChancePct: number;
    speedBonus: number;
  };
  skills: [JobSkillDef, JobSkillDef];
}

function makeJob(
  baseClass: HeroClass,
  tier: 1 | 2 | 3 | 4,
  path: 'A' | 'B',
  id: string,
  name: string,
  epithet: string,
  accentColor: string,
  description: string,
  statBonuses: JobBranchDef['statBonuses'],
  skills: [JobSkillDef, JobSkillDef],
  opts?: { requiredQuestId?: string; requiredItemId?: string; goldCost?: number; requiredLevel?: number }
): JobBranchDef {
  const defaultLvl = tier === 1 ? 2 : tier === 2 ? 4 : tier === 3 ? 6 : 8;
  const defaultGold = tier === 1 ? 40 : tier === 2 ? 100 : tier === 3 ? 220 : 400;
  return {
    id,
    baseClass,
    tier,
    path,
    name,
    epithet,
    accentColor,
    description,
    requiredLevel: opts?.requiredLevel ?? defaultLvl,
    requiredQuestId: opts?.requiredQuestId,
    requiredItemId: opts?.requiredItemId ?? (tier >= 2 ? 'qst_sanctuary_seal' : undefined),
    goldCost: opts?.goldCost ?? defaultGold,
    statBonuses,
    skills,
  };
}

export const JOB_BRANCHES_DATA: Record<HeroClass, JobBranchDef[]> = {
  warrior: [
    makeJob('warrior', 1, 'A', 'job_squire_guard', 'Sanctuary Guard', 'Tier I Sentinel', '#93C5FD',
      'First advancement reinforcing shield defense and frontline resilience.',
      { attack: 5, defense: 8, maxHp: 65, maxMp: 12, critChancePct: 2, speedBonus: 6 },
      [
        { id: 'w1a_ward', slotIndex: 6, hotkey: '6', name: 'Iron Bastion', description: 'Stun foes around you and restore 15% HP.', cooldownMs: 11000, manaCost: 22, damageMult: 1.5, radius: 170, effectKind: 'stun_heal', color: '#93C5FD' },
        { id: 'w1a_thrust', slotIndex: 7, hotkey: '7', name: 'Vanguard Charge', description: 'Dash forward with a shield strike for 2.2x damage.', cooldownMs: 8000, manaCost: 22, damageMult: 2.2, radius: 140, effectKind: 'dash', color: '#60A5FA' },
      ]),
    makeJob('warrior', 1, 'B', 'job_reaver_initiate', 'Steel Marauder', 'Tier I Striker', '#FB7185',
      'Aggressive first advancement sharpening blade swings and critical ferocity.',
      { attack: 10, defense: 3, maxHp: 45, maxMp: 10, critChancePct: 5, speedBonus: 12 },
      [
        { id: 'w1b_arc', slotIndex: 6, hotkey: '6', name: 'Razor Sweep', description: 'Wide greatsword cleave dealing 2.4x frontal damage.', cooldownMs: 7500, manaCost: 20, damageMult: 2.4, radius: 150, effectKind: 'cleave', color: '#FB7185' },
        { id: 'w1b_slam', slotIndex: 7, hotkey: '7', name: 'Seismic Smash', description: 'Ground smash dealing 2.6x AoE damage.', cooldownMs: 10500, manaCost: 26, damageMult: 2.6, radius: 170, effectKind: 'aoe', color: '#F97316' },
      ]),
    makeJob('warrior', 2, 'A', 'job_knight', 'Royal Knight', 'Tier II Bulwark', '#60A5FA',
      'Fortifies allies with impenetrable radiance while keeping every Warrior skill.',
      { attack: 11, defense: 16, maxHp: 130, maxMp: 25, critChancePct: 4, speedBonus: 10 },
      [
        { id: 'knt_bastion', slotIndex: 6, hotkey: '6', name: 'Aegis Phalanx', description: 'Radiate a golden ward healing 24% HP and stunning nearby foes.', cooldownMs: 10500, manaCost: 25, damageMult: 1.9, radius: 195, effectKind: 'stun_heal', color: '#60A5FA' },
        { id: 'knt_lance', slotIndex: 7, hotkey: '7', name: 'Sovereign Lance', description: 'Dash forward with a celestial lance dealing 2.9x frontal damage.', cooldownMs: 8200, manaCost: 26, damageMult: 2.9, radius: 155, effectKind: 'dash', color: '#93C5FD' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('warrior', 2, 'B', 'job_berserker', 'Blood Berserker', 'Tier II Warlord', '#EF4444',
      'Channels relentless fury for devastating cleave damage and critical strikes.',
      { attack: 20, defense: 6, maxHp: 90, maxMp: 18, critChancePct: 9, speedBonus: 18 },
      [
        { id: 'ber_rend', slotIndex: 6, hotkey: '6', name: 'Crimson Rupture', description: 'Brutal sweeping slash dealing 3.1x damage in a wide arc.', cooldownMs: 7800, manaCost: 24, damageMult: 3.1, radius: 165, effectKind: 'cleave', color: '#EF4444' },
        { id: 'ber_maelstrom', slotIndex: 7, hotkey: '7', name: 'Fury Maelstrom', description: 'Detonate shockwaves around you for 3.4x AoE damage.', cooldownMs: 11500, manaCost: 32, damageMult: 3.4, radius: 190, effectKind: 'aoe', color: '#F97316' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('warrior', 3, 'A', 'job_paladin_sun', 'Sunlit Paladin', 'Tier III Dawnbringer', '#FBBF24',
      'Holy crusader radiating consecrated healing halos across entire party squads.',
      { attack: 18, defense: 24, maxHp: 210, maxMp: 40, critChancePct: 7, speedBonus: 14 },
      [
        { id: 'w3a_sanctify', slotIndex: 6, hotkey: '6', name: 'Dawn Sanctification', description: 'Heal nearby allies 30% HP and grant swift wind speed.', cooldownMs: 10000, manaCost: 28, damageMult: 0, radius: 260, effectKind: 'group_heal', color: '#FDE047' },
        { id: 'w3a_judgement', slotIndex: 7, hotkey: '7', name: 'Judgement Breaker', description: 'Heavy sacred cleave dealing 3.5x damage.', cooldownMs: 8500, manaCost: 28, damageMult: 3.5, radius: 180, effectKind: 'cleave', color: '#FBBF24' },
      ]),
    makeJob('warrior', 3, 'B', 'job_crimson_warlord', 'Dread Warlord', 'Tier III Conqueror', '#DC2626',
      'Overwhelms elite packs with shattering volcanic shockwaves.',
      { attack: 30, defense: 12, maxHp: 145, maxMp: 28, critChancePct: 13, speedBonus: 22 },
      [
        { id: 'w3b_breaker', slotIndex: 6, hotkey: '6', name: 'Titan Cleaver', description: 'Cataclysmic arc dealing 3.7x frontal damage.', cooldownMs: 7500, manaCost: 26, damageMult: 3.7, radius: 175, effectKind: 'cleave', color: '#EF4444' },
        { id: 'w3b_quake', slotIndex: 7, hotkey: '7', name: 'Caldera Quake', description: 'Slam the earth for 3.9x AoE damage and slow.', cooldownMs: 11000, manaCost: 34, damageMult: 3.9, radius: 210, effectKind: 'frost_aoe', color: '#F97316' },
      ]),
    makeJob('warrior', 4, 'A', 'job_celestial_templar', 'Celestial Templar', 'Tier IV Immortal', '#FDE047',
      'Supreme radiant champion uniting unbreakable armor with celestial group restoration.',
      { attack: 28, defense: 36, maxHp: 320, maxMp: 55, critChancePct: 11, speedBonus: 20 },
      [
        { id: 'w4a_halo', slotIndex: 6, hotkey: '6', name: 'Aurelia Aegis', description: 'Stun all foes in 220u while healing hero and unleashing 3.6x light.', cooldownMs: 10000, manaCost: 30, damageMult: 3.6, radius: 220, effectKind: 'stun_heal', color: '#FEF08A' },
        { id: 'w4a_nova', slotIndex: 7, hotkey: '7', name: 'Solaris Zenith', description: 'Radiant shockwave dealing 4.4x AoE damage.', cooldownMs: 11500, manaCost: 36, damageMult: 4.4, radius: 225, effectKind: 'aoe', color: '#FACC15' },
      ]),
    makeJob('warrior', 4, 'B', 'job_godblade', 'Godblade Sovereign', 'Tier IV Apex Slayer', '#F97316',
      'Mythic apex swordsman shattering world bosses with blinding solar-fire combos.',
      { attack: 44, defense: 18, maxHp: 210, maxMp: 38, critChancePct: 18, speedBonus: 28 },
      [
        { id: 'w4b_blitz', slotIndex: 6, hotkey: '6', name: 'Flash Execution', description: 'Blinding dash cleave dealing 4.2x damage.', cooldownMs: 7000, manaCost: 26, damageMult: 4.2, radius: 175, effectKind: 'dash', color: '#FB923C' },
        { id: 'w4b_eclipse', slotIndex: 7, hotkey: '7', name: 'Eclipse Annihilation', description: 'Colossal wide-arc cleave dealing 4.8x damage.', cooldownMs: 11000, manaCost: 36, damageMult: 4.8, radius: 215, effectKind: 'cleave', color: '#EF4444' },
      ]),
  ],

  mage: [
    makeJob('mage', 1, 'A', 'job_flame_adept', 'Ember Adept', 'Tier I Pyre', '#FB923C',
      'Channels crisp firebolts and searing AoE flame rings.',
      { attack: 9, defense: 2, maxHp: 30, maxMp: 35, critChancePct: 5, speedBonus: 6 },
      [
        { id: 'm1a_spark', slotIndex: 6, hotkey: '6', name: 'Cinder Scatter', description: 'Fire 3 blazing bolts dealing 1.5x damage each.', cooldownMs: 6500, manaCost: 22, damageMult: 1.5, radius: 105, effectKind: 'volley', color: '#FB923C' },
        { id: 'm1a_ring', slotIndex: 7, hotkey: '7', name: 'Flame Ring', description: 'Detonate fire ring for 2.5x AoE damage.', cooldownMs: 10000, manaCost: 28, damageMult: 2.5, radius: 170, effectKind: 'aoe', color: '#F97316' },
      ]),
    makeJob('mage', 1, 'B', 'job_frost_scholar', 'Frost Scholar', 'Tier I Rime', '#7DD3FC',
      'Controls enemy speed with chilled mana spears and deep mana pools.',
      { attack: 7, defense: 5, maxHp: 45, maxMp: 50, critChancePct: 4, speedBonus: 8 },
      [
        { id: 'm1b_chill', slotIndex: 6, hotkey: '6', name: 'Rime Burst', description: 'Chill enemies in 175u for 2.2x damage and heavy slow.', cooldownMs: 7500, manaCost: 24, damageMult: 2.2, radius: 175, effectKind: 'frost_aoe', color: '#7DD3FC' },
        { id: 'm1b_blink', slotIndex: 7, hotkey: '7', name: 'Mist Step', description: 'Phase-dash forward leaving a 2.0x frost blast.', cooldownMs: 7000, manaCost: 20, damageMult: 2.0, radius: 135, effectKind: 'dash', color: '#38BDF8' },
      ]),
    makeJob('mage', 2, 'A', 'job_pyromancer', 'Pyromancer', 'Tier II Solar Flame', '#F97316',
      'Commands blistering solar firestorms with massive AoE burst power.',
      { attack: 19, defense: 5, maxHp: 55, maxMp: 65, critChancePct: 8, speedBonus: 10 },
      [
        { id: 'pyr_flare', slotIndex: 6, hotkey: '6', name: 'Ignis Barrage', description: 'Launch 3 blazing fire bolts for 1.8x damage each.', cooldownMs: 6500, manaCost: 26, damageMult: 1.8, radius: 110, effectKind: 'volley', color: '#F97316' },
        { id: 'pyr_inferno', slotIndex: 7, hotkey: '7', name: 'Solaris Eruption', description: 'Conjure a volcanic blast dealing 3.6x AoE damage.', cooldownMs: 12000, manaCost: 38, damageMult: 3.6, radius: 195, effectKind: 'aoe', color: '#EF4444' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('mage', 2, 'B', 'job_cryomancer', 'Cryomancer', 'Tier II Glacial', '#38BDF8',
      'Freezes entire battlefields solid while sustaining mana reserves.',
      { attack: 14, defense: 11, maxHp: 85, maxMp: 85, critChancePct: 7, speedBonus: 12 },
      [
        { id: 'cry_glacier', slotIndex: 6, hotkey: '6', name: 'Glacier Spire', description: 'Impale foes with ice shards for 2.7x damage and slow.', cooldownMs: 7500, manaCost: 28, damageMult: 2.7, radius: 185, effectKind: 'frost_aoe', color: '#38BDF8' },
        { id: 'cry_blizzard', slotIndex: 7, hotkey: '7', name: 'Permafrost Halo', description: 'Cryo shockwave stunning enemies and restoring 18% HP.', cooldownMs: 11000, manaCost: 32, damageMult: 2.5, radius: 200, effectKind: 'stun_heal', color: '#BAE6FD' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('mage', 3, 'A', 'job_starweaver', 'Starweaver', 'Tier III Astral', '#A855F7',
      'Bends starlight meteors and high-velocity arcane volleys.',
      { attack: 29, defense: 9, maxHp: 90, maxMp: 110, critChancePct: 12, speedBonus: 16 },
      [
        { id: 'm3a_meteor', slotIndex: 6, hotkey: '6', name: 'Astral Volley', description: 'Triple arcane lance volley dealing 2.1x damage per bolt.', cooldownMs: 6200, manaCost: 28, damageMult: 2.1, radius: 115, effectKind: 'volley', color: '#C084FC' },
        { id: 'm3a_collapse', slotIndex: 7, hotkey: '7', name: 'Nebula Collapse', description: 'Gravity burst dealing 4.0x AoE damage.', cooldownMs: 11500, manaCost: 40, damageMult: 4.0, radius: 215, effectKind: 'aoe', color: '#A855F7' },
      ]),
    makeJob('mage', 3, 'B', 'job_stormcaller', 'Stormcaller', 'Tier III Tempest', '#22D3EE',
      'Conjures lightning gales that stun whole monster packs.',
      { attack: 24, defense: 14, maxHp: 120, maxMp: 120, critChancePct: 11, speedBonus: 20 },
      [
        { id: 'm3b_thunder', slotIndex: 6, hotkey: '6', name: 'Tempest Surge', description: 'Shockwave stunning foes and healing 20% HP.', cooldownMs: 10000, manaCost: 30, damageMult: 3.1, radius: 205, effectKind: 'stun_heal', color: '#22D3EE' },
        { id: 'm3b_monsoon', slotIndex: 7, hotkey: '7', name: 'Cyclone Field', description: 'Storm vortex slowing enemies and dealing 3.6x AoE.', cooldownMs: 8500, manaCost: 32, damageMult: 3.6, radius: 210, effectKind: 'frost_aoe', color: '#38BDF8' },
      ]),
    makeJob('mage', 4, 'A', 'job_solaris_archmage', 'Solaris Archmage', 'Tier IV Grand Magus', '#FDE047',
      'Apex master of solar annihilation, turning the sky into liquid starfire.',
      { attack: 42, defense: 14, maxHp: 145, maxMp: 165, critChancePct: 16, speedBonus: 22 },
      [
        { id: 'm4a_fan', slotIndex: 6, hotkey: '6', name: 'Supernova Salvo', description: 'Fire 3 solar rays dealing 2.45x piercing damage each.', cooldownMs: 5800, manaCost: 28, damageMult: 2.45, radius: 120, effectKind: 'volley', color: '#FDE047' },
        { id: 'm4a_cataclysm', slotIndex: 7, hotkey: '7', name: 'Sunfall Cataclysm', description: 'Massive solar eruption dealing 4.8x AoE damage.', cooldownMs: 11000, manaCost: 44, damageMult: 4.8, radius: 235, effectKind: 'aoe', color: '#F97316' },
      ]),
    makeJob('mage', 4, 'B', 'job_eternal_sage', 'Eternal Chronosage', 'Tier IV Sovereign', '#60A5FA',
      'Commands timeless frost and astral healing across massive battlefields.',
      { attack: 34, defense: 22, maxHp: 195, maxMp: 190, critChancePct: 14, speedBonus: 24 },
      [
        { id: 'm4b_timelock', slotIndex: 6, hotkey: '6', name: 'Chrono Stasis', description: 'Freeze & stun foes in 225u for 3.9x damage + 22% heal.', cooldownMs: 9800, manaCost: 34, damageMult: 3.9, radius: 225, effectKind: 'stun_heal', color: '#93C5FD' },
        { id: 'm4b_sanctum', slotIndex: 7, hotkey: '7', name: 'Astral Harmony', description: 'Restore 36% HP to entire nearby group with haste.', cooldownMs: 10500, manaCost: 34, damageMult: 0, radius: 280, effectKind: 'group_heal', color: '#34D399' },
      ]),
  ],

  archer: [
    makeJob('archer', 1, 'A', 'job_scout_tracker', 'Frontier Scout', 'Tier I Strider', '#34D399',
      'Quick-footed ranger excelling at arrow volleys and swift dashes.',
      { attack: 8, defense: 3, maxHp: 35, maxMp: 22, critChancePct: 6, speedBonus: 14 },
      [
        { id: 'a1a_spread', slotIndex: 6, hotkey: '6', name: 'Quick Spread', description: 'Fire 3 feathered arrows dealing 1.5x damage each.', cooldownMs: 6500, manaCost: 20, damageMult: 1.5, radius: 105, effectKind: 'volley', color: '#34D399' },
        { id: 'a1a_roll', slotIndex: 7, hotkey: '7', name: 'Tumble Shot', description: 'Vault forward dealing 2.1x damage.', cooldownMs: 6500, manaCost: 18, damageMult: 2.1, radius: 135, effectKind: 'dash', color: '#10B981' },
      ]),
    makeJob('archer', 1, 'B', 'job_bow_hunter', 'Valkyrie Marksman', 'Tier I Hunter', '#A3E635',
      'Precise longbow specialist amplifying single-shot piercing power.',
      { attack: 11, defense: 2, maxHp: 30, maxMp: 20, critChancePct: 8, speedBonus: 10 },
      [
        { id: 'a1b_snipe', slotIndex: 6, hotkey: '6', name: 'Heartseeker Bolt', description: 'Piercing shot dealing 2.5x frontal damage.', cooldownMs: 7000, manaCost: 22, damageMult: 2.5, radius: 165, effectKind: 'cleave', color: '#A3E635' },
        { id: 'a1b_snare', slotIndex: 7, hotkey: '7', name: 'Bramble Trap', description: 'Slowing trap arrow for 2.3x AoE damage.', cooldownMs: 9000, manaCost: 24, damageMult: 2.3, radius: 175, effectKind: 'frost_aoe', color: '#84CC16' },
      ]),
    makeJob('archer', 2, 'A', 'job_sharpshooter', 'Sharpshooter', 'Tier II Deadeye', '#10B981',
      'Masters lethal critical volleys and armor-piercing longbow shots.',
      { attack: 17, defense: 6, maxHp: 60, maxMp: 35, critChancePct: 12, speedBonus: 16 },
      [
        { id: 'shp_snipe', slotIndex: 6, hotkey: '6', name: 'Horizon Piercer', description: 'High-caliber piercing arrow dealing 3.2x frontal damage.', cooldownMs: 7000, manaCost: 24, damageMult: 3.2, radius: 175, effectKind: 'cleave', color: '#10B981' },
        { id: 'shp_fan', slotIndex: 7, hotkey: '7', name: 'Emerald Salvo', description: 'Fire 3 enchanted arrows dealing 1.85x damage each.', cooldownMs: 9200, manaCost: 26, damageMult: 1.85, radius: 110, effectKind: 'volley', color: '#34D399' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('archer', 2, 'B', 'job_windranger', 'Windranger', 'Tier II Tempest', '#2DD4BF',
      'Blends gale-force mobility with storming AoE arrow traps.',
      { attack: 14, defense: 8, maxHp: 75, maxMp: 40, critChancePct: 9, speedBonus: 30 },
      [
        { id: 'wnd_gale', slotIndex: 6, hotkey: '6', name: 'Cyclone Vault', description: 'Dash swiftly through wind currents dealing 2.4x damage.', cooldownMs: 5800, manaCost: 20, damageMult: 2.4, radius: 145, effectKind: 'dash', color: '#2DD4BF' },
        { id: 'wnd_storm', slotIndex: 7, hotkey: '7', name: 'Zephyr Vortex', description: 'Trap enemies in a wind vortex for 2.9x AoE damage and slow.', cooldownMs: 10000, manaCost: 28, damageMult: 2.9, radius: 195, effectKind: 'frost_aoe', color: '#5EEAD4' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('archer', 3, 'A', 'job_hawkeye', 'Grand Hawkeye', 'Tier III Falcon', '#22C55E',
      'Delivers crushing armor-rending broadsides with eagle-eyed accuracy.',
      { attack: 27, defense: 10, maxHp: 105, maxMp: 55, critChancePct: 16, speedBonus: 24 },
      [
        { id: 'a3a_volley', slotIndex: 6, hotkey: '6', name: 'Falcon Rain', description: 'Loose 3 emerald sky-arrows for 2.15x damage each.', cooldownMs: 6000, manaCost: 26, damageMult: 2.15, radius: 115, effectKind: 'volley', color: '#22C55E' },
        { id: 'a3a_skyfall', slotIndex: 7, hotkey: '7', name: 'Arrow Tempest', description: 'Rain arrows across 210u dealing 3.8x AoE damage.', cooldownMs: 10500, manaCost: 34, damageMult: 3.8, radius: 210, effectKind: 'aoe', color: '#4ADE80' },
      ]),
    makeJob('archer', 3, 'B', 'job_zephyr_warden', 'Sylvan Stalker', 'Tier III Galebound', '#14B8A6',
      'Commands blinding agility and forest spirits while snaring entire waves.',
      { attack: 23, defense: 13, maxHp: 125, maxMp: 60, critChancePct: 14, speedBonus: 38 },
      [
        { id: 'a3b_step', slotIndex: 6, hotkey: '6', name: 'Gale Step', description: 'Flash forward dealing 3.2x damage with speed surge.', cooldownMs: 5500, manaCost: 22, damageMult: 3.2, radius: 155, effectKind: 'dash', color: '#14B8A6' },
        { id: 'a3b_stun', slotIndex: 7, hotkey: '7', name: 'Verdant Pin', description: 'Stun monsters in 200u for 3.2x damage + 18% heal.', cooldownMs: 10000, manaCost: 30, damageMult: 3.2, radius: 200, effectKind: 'stun_heal', color: '#6EE7B7' },
      ]),
    makeJob('archer', 4, 'A', 'job_celestial_bow', 'Astral Sniper', 'Tier IV Sovereign', '#34D399',
      'Mythic archer firing constellation beams capable of piercing colossal bosses.',
      { attack: 40, defense: 16, maxHp: 155, maxMp: 75, critChancePct: 22, speedBonus: 32 },
      [
        { id: 'a4a_star', slotIndex: 6, hotkey: '6', name: 'Starlight Salvo', description: 'Fire 3 starlight arrows dealing 2.45x piercing damage each.', cooldownMs: 5500, manaCost: 26, damageMult: 2.45, radius: 120, effectKind: 'volley', color: '#6EE7B7' },
        { id: 'a4a_meteor', slotIndex: 7, hotkey: '7', name: 'Orion Barrage', description: 'Orbital arrow storm dealing 4.6x AoE damage.', cooldownMs: 10800, manaCost: 38, damageMult: 4.6, radius: 230, effectKind: 'aoe', color: '#10B981' },
      ]),
    makeJob('archer', 4, 'B', 'job_tempest_monarch', 'Tempest Monarch', 'Tier IV Wind God', '#2DD4BF',
      'Fuses lightning speed with endless vortex barrages.',
      { attack: 35, defense: 18, maxHp: 180, maxMp: 85, critChancePct: 19, speedBonus: 48 },
      [
        { id: 'a4b_typhoon', slotIndex: 6, hotkey: '6', name: 'Typhoon Dash', description: 'Hurricane dash dealing 3.9x damage.', cooldownMs: 5200, manaCost: 22, damageMult: 3.9, radius: 170, effectKind: 'dash', color: '#2DD4BF' },
        { id: 'a4b_vortex', slotIndex: 7, hotkey: '7', name: 'Sky Sovereign Gale', description: 'Massive gale slowing enemies & dealing 4.4x AoE damage.', cooldownMs: 9800, manaCost: 34, damageMult: 4.4, radius: 230, effectKind: 'frost_aoe', color: '#5EEAD4' },
      ]),
  ],

  healer: [
    makeJob('healer', 1, 'A', 'job_acolyte', 'Sanctuary Acolyte', 'Tier I Mender', '#86EFAC',
      'Dedicated mender boosting party healing bursts and protective wards.',
      { attack: 5, defense: 6, maxHp: 60, maxMp: 40, critChancePct: 3, speedBonus: 6 },
      [
        { id: 'h1a_mend', slotIndex: 6, hotkey: '6', name: 'Meadow Prayer', description: 'Heal nearby allies 26% Max HP with breeze speed.', cooldownMs: 9000, manaCost: 24, damageMult: 0, radius: 240, effectKind: 'group_heal', color: '#86EFAC' },
        { id: 'h1a_smite', slotIndex: 7, hotkey: '7', name: 'Sunlit Bell', description: 'Stun monsters and restore 16% HP.', cooldownMs: 10500, manaCost: 26, damageMult: 1.9, radius: 170, effectKind: 'stun_heal', color: '#FDE047' },
      ]),
    makeJob('healer', 1, 'B', 'job_light_crusader', 'Dawn Friar', 'Tier I Radiance', '#FACC15',
      'Turns sacred solar light into crisp offensive smites.',
      { attack: 10, defense: 4, maxHp: 45, maxMp: 30, critChancePct: 5, speedBonus: 9 },
      [
        { id: 'h1b_smite', slotIndex: 6, hotkey: '6', name: 'Sun Cleave', description: 'Radiant mace strike dealing 2.4x frontal damage.', cooldownMs: 7000, manaCost: 20, damageMult: 2.4, radius: 150, effectKind: 'cleave', color: '#FACC15' },
        { id: 'h1b_flare', slotIndex: 7, hotkey: '7', name: 'Dawn Burst', description: 'Solar AoE dealing 2.6x damage.', cooldownMs: 10000, manaCost: 26, damageMult: 2.6, radius: 175, effectKind: 'aoe', color: '#F59E0B' },
      ]),
    makeJob('healer', 2, 'A', 'job_cleric', 'High Cleric', 'Tier II Grace', '#FDE047',
      'Amplifies sanctuary group healing and protects allies through boss phases.',
      { attack: 10, defense: 14, maxHp: 130, maxMp: 75, critChancePct: 4, speedBonus: 12 },
      [
        { id: 'clr_bloom', slotIndex: 6, hotkey: '6', name: 'Celestial Renewal', description: 'Restore 38% Max HP to yourself and nearby party members.', cooldownMs: 9200, manaCost: 28, damageMult: 0, radius: 280, effectKind: 'group_heal', color: '#34D399' },
        { id: 'clr_chorus', slotIndex: 7, hotkey: '7', name: 'Halo Sanctum', description: 'Stun monsters and restore 22% HP in a radiant burst.', cooldownMs: 11000, manaCost: 30, damageMult: 2.4, radius: 195, effectKind: 'stun_heal', color: '#FDE047' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('healer', 2, 'B', 'job_inquisitor', 'Solar Inquisitor', 'Tier II Judgment', '#F59E0B',
      'Channels sacred light into punishing radiant AoE bursts.',
      { attack: 18, defense: 9, maxHp: 85, maxMp: 55, critChancePct: 9, speedBonus: 15 },
      [
        { id: 'inq_edict', slotIndex: 6, hotkey: '6', name: 'Radiant Edict', description: 'Blazing judgment cleave dealing 2.9x light damage.', cooldownMs: 6800, manaCost: 24, damageMult: 2.9, radius: 165, effectKind: 'cleave', color: '#F59E0B' },
        { id: 'inq_sunburst', slotIndex: 7, hotkey: '7', name: 'Solar Supernova', description: 'Detonate consecrated light for 3.4x AoE damage.', cooldownMs: 10800, manaCost: 32, damageMult: 3.4, radius: 195, effectKind: 'aoe', color: '#FACC15' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('healer', 3, 'A', 'job_oracle', 'Arch-Oracle', 'Tier III Luminary', '#34D399',
      'Commands effortless sacred group regeneration and blinding stun halos.',
      { attack: 18, defense: 22, maxHp: 210, maxMp: 120, critChancePct: 7, speedBonus: 18 },
      [
        { id: 'h3a_hymn', slotIndex: 6, hotkey: '6', name: 'Hymn of Eternity', description: 'Heal entire nearby party 45% Max HP and grant haste.', cooldownMs: 8800, manaCost: 30, damageMult: 0, radius: 300, effectKind: 'group_heal', color: '#34D399' },
        { id: 'h3a_beam', slotIndex: 7, hotkey: '7', name: 'Astral Choir', description: 'Send 3 holy bolts dealing 2.0x damage each.', cooldownMs: 6800, manaCost: 26, damageMult: 2.0, radius: 120, effectKind: 'volley', color: '#FDE047' },
      ]),
    makeJob('healer', 3, 'B', 'job_radiant_avenger', 'Dawn Templar', 'Tier III Arbiter', '#FBBF24',
      'Holy vanguard wielding twin solar waves and crushing hammers.',
      { attack: 29, defense: 16, maxHp: 150, maxMp: 85, critChancePct: 13, speedBonus: 20 },
      [
        { id: 'h3b_dash', slotIndex: 6, hotkey: '6', name: 'Radiance Surge', description: 'Holy dash dealing 3.3x light damage.', cooldownMs: 6500, manaCost: 24, damageMult: 3.3, radius: 165, effectKind: 'dash', color: '#FBBF24' },
        { id: 'h3b_flare', slotIndex: 7, hotkey: '7', name: 'Judgment Flare', description: 'Consecrated AoE dealing 4.0x damage.', cooldownMs: 10500, manaCost: 36, damageMult: 4.0, radius: 215, effectKind: 'aoe', color: '#F59E0B' },
      ]),
    makeJob('healer', 4, 'A', 'job_seraphim', 'Seraphim Saint', 'Tier IV Celestial', '#6EE7B7',
      'Radiant winged saint preserving entire raids through world boss cataclysms.',
      { attack: 28, defense: 30, maxHp: 295, maxMp: 170, critChancePct: 10, speedBonus: 24 },
      [
        { id: 'h4a_grace', slotIndex: 6, hotkey: '6', name: 'Seraphic Miracle', description: 'Restore 55% Max HP to allies + speed boost.', cooldownMs: 8500, manaCost: 32, damageMult: 0, radius: 320, effectKind: 'group_heal', color: '#6EE7B7' },
        { id: 'h4a_wrath', slotIndex: 7, hotkey: '7', name: 'Heavenly Sanctum', description: 'Stun monsters in 225u for 3.8x damage & 28% HP heal.', cooldownMs: 10000, manaCost: 34, damageMult: 3.8, radius: 225, effectKind: 'stun_heal', color: '#FEF08A' },
      ]),
    makeJob('healer', 4, 'B', 'job_sol_arbiter', 'Solar Sovereign', 'Tier IV High Arbiter', '#FDE047',
      'Supreme arbiter unleashing blazing stars alongside restorative light.',
      { attack: 40, defense: 22, maxHp: 215, maxMp: 135, critChancePct: 17, speedBonus: 26 },
      [
        { id: 'h4b_ray', slotIndex: 6, hotkey: '6', name: 'Dawn Tri-Beam', description: 'Fire 3 blinding light rays for 2.35x damage each.', cooldownMs: 6000, manaCost: 26, damageMult: 2.35, radius: 120, effectKind: 'volley', color: '#FEF08A' },
        { id: 'h4b_nova', slotIndex: 7, hotkey: '7', name: 'Sovereign Dawn', description: 'Solar cataclysm dealing 4.7x AoE damage.', cooldownMs: 10500, manaCost: 40, damageMult: 4.7, radius: 235, effectKind: 'aoe', color: '#F59E0B' },
      ]),
  ],

  assassin: [
    makeJob('assassin', 1, 'A', 'job_shadow_rogue', 'Shadow Rogue', 'Tier I Cutthroat', '#FB7185',
      'Nimble dual-dagger rogue built for fast dashes and shadow darts.',
      { attack: 10, defense: 3, maxHp: 35, maxMp: 22, critChancePct: 7, speedBonus: 16 },
      [
        { id: 's1a_dash', slotIndex: 6, hotkey: '6', name: 'Shadow Blitz', description: 'Dash through targets dealing 2.3x damage.', cooldownMs: 5800, manaCost: 18, damageMult: 2.3, radius: 135, effectKind: 'dash', color: '#FB7185' },
        { id: 's1a_fan', slotIndex: 7, hotkey: '7', name: 'Dagger Spray', description: 'Throw 3 poisoned daggers for 1.5x damage each.', cooldownMs: 7500, manaCost: 22, damageMult: 1.5, radius: 105, effectKind: 'volley', color: '#F43F5E' },
      ]),
    makeJob('assassin', 1, 'B', 'job_blood_stalker', 'Dusk Stalker', 'Tier I Ripper', '#E11D48',
      'Focuses on vicious sweeping blades and high critical multipliers.',
      { attack: 12, defense: 3, maxHp: 45, maxMp: 20, critChancePct: 9, speedBonus: 12 },
      [
        { id: 's1b_cleave', slotIndex: 6, hotkey: '6', name: 'Viper Rend', description: 'Swift twin-blade cleave dealing 2.6x damage.', cooldownMs: 6800, manaCost: 20, damageMult: 2.6, radius: 150, effectKind: 'cleave', color: '#E11D48' },
        { id: 's1b_slow', slotIndex: 7, hotkey: '7', name: 'Caltrop Burst', description: 'Cripple nearby foes with 2.2x damage and slow.', cooldownMs: 8800, manaCost: 24, damageMult: 2.2, radius: 170, effectKind: 'frost_aoe', color: '#BE123C' },
      ]),
    makeJob('assassin', 2, 'A', 'job_nightblade', 'Nightblade', 'Tier II Phantom', '#F43F5E',
      'Hyper-mobile shadow assassin with lethal dash strikes.',
      { attack: 19, defense: 6, maxHp: 60, maxMp: 35, critChancePct: 14, speedBonus: 26 },
      [
        { id: 'ngb_flash', slotIndex: 6, hotkey: '6', name: 'Mirage Blitz', description: 'Flash-step through enemies dealing 2.8x damage.', cooldownMs: 5800, manaCost: 22, damageMult: 2.8, radius: 140, effectKind: 'dash', color: '#F43F5E' },
        { id: 'ngb_blades', slotIndex: 7, hotkey: '7', name: 'Phantom Fan', description: 'Throw 3 shadow daggers for 1.85x damage each.', cooldownMs: 8200, manaCost: 26, damageMult: 1.85, radius: 105, effectKind: 'volley', color: '#FB7185' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('assassin', 2, 'B', 'job_reaper', 'Crimson Reaper', 'Tier II Executioner', '#BE123C',
      'Cleaves packs apart with vicious AoE vortices and life-draining blades.',
      { attack: 21, defense: 8, maxHp: 85, maxMp: 30, critChancePct: 11, speedBonus: 18 },
      [
        { id: 'rpr_scythe', slotIndex: 6, hotkey: '6', name: 'Crescent Scythe', description: 'Reap enemies in a wide arc for 3.1x frontal damage.', cooldownMs: 7200, manaCost: 24, damageMult: 3.1, radius: 165, effectKind: 'cleave', color: '#E11D48' },
        { id: 'rpr_eclipse', slotIndex: 7, hotkey: '7', name: 'Blood Eclipse', description: 'Unleash a shadow nova dealing 3.4x AoE damage.', cooldownMs: 11000, manaCost: 32, damageMult: 3.4, radius: 190, effectKind: 'aoe', color: '#BE123C' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('assassin', 3, 'A', 'job_void_dancer', 'Void Dancer', 'Tier III Mirage', '#EC4899',
      'Leaves glowing afterimages while slicing through enemy lines at light speed.',
      { attack: 31, defense: 10, maxHp: 105, maxMp: 50, critChancePct: 19, speedBonus: 36 },
      [
        { id: 's3a_step', slotIndex: 6, hotkey: '6', name: 'Abyssal Blink', description: 'Lightning-fast dash dealing 3.6x damage.', cooldownMs: 5200, manaCost: 22, damageMult: 3.6, radius: 160, effectKind: 'dash', color: '#EC4899' },
        { id: 's3a_knives', slotIndex: 7, hotkey: '7', name: 'Crimson Shuriken', description: 'Hurl 3 shadow blades dealing 2.15x piercing damage each.', cooldownMs: 6800, manaCost: 26, damageMult: 2.15, radius: 115, effectKind: 'volley', color: '#F43F5E' },
      ]),
    makeJob('assassin', 3, 'B', 'job_soul_harvester', 'Soul Harvester', 'Tier III Nightfall', '#9F1239',
      'Reaps weakened packs with healing shadow siphons and wide scythe arcs.',
      { attack: 33, defense: 13, maxHp: 135, maxMp: 45, critChancePct: 15, speedBonus: 26 },
      [
        { id: 's3b_siphon', slotIndex: 6, hotkey: '6', name: 'Soul Siphon', description: 'Stun monsters in 190u for 3.2x damage + 20% HP heal.', cooldownMs: 9500, manaCost: 28, damageMult: 3.2, radius: 190, effectKind: 'stun_heal', color: '#FB7185' },
        { id: 's3b_vortex', slotIndex: 7, hotkey: '7', name: 'Nightmare Tempest', description: 'Shadow vortex dealing 4.0x AoE damage.', cooldownMs: 10500, manaCost: 34, damageMult: 4.0, radius: 215, effectKind: 'aoe', color: '#9F1239' },
      ]),
    makeJob('assassin', 4, 'A', 'job_phantom_monarch', 'Phantom Sovereign', 'Tier IV Shadow God', '#F43F5E',
      'Untouchable phantom executing boss phases in blinding critical flurries.',
      { attack: 46, defense: 15, maxHp: 150, maxMp: 65, critChancePct: 26, speedBonus: 46 },
      [
        { id: 's4a_blitz', slotIndex: 6, hotkey: '6', name: 'Sovereign Blink', description: 'Apex flash-strike dealing 4.3x damage.', cooldownMs: 5000, manaCost: 24, damageMult: 4.3, radius: 175, effectKind: 'dash', color: '#F43F5E' },
        { id: 's4a_salvo', slotIndex: 7, hotkey: '7', name: 'Eclipse Kunai', description: 'Triple phantom volley for 2.5x damage per blade.', cooldownMs: 6000, manaCost: 26, damageMult: 2.5, radius: 120, effectKind: 'volley', color: '#FB7185' },
      ]),
    makeJob('assassin', 4, 'B', 'job_eclipse_executioner', 'Eclipse Executioner', 'Tier IV Blood Moon', '#E11D48',
      'Rends the battlefield with colossal crimson moon slashes.',
      { attack: 48, defense: 18, maxHp: 185, maxMp: 60, critChancePct: 22, speedBonus: 34 },
      [
        { id: 's4b_moon', slotIndex: 6, hotkey: '6', name: 'Blood Moon Sever', description: 'Wide crimson cleave dealing 4.7x frontal damage.', cooldownMs: 6500, manaCost: 26, damageMult: 4.7, radius: 205, effectKind: 'cleave', color: '#E11D48' },
        { id: 's4b_nova', slotIndex: 7, hotkey: '7', name: 'Midnight Nova', description: 'Obliterate foes in 225u for 4.9x AoE damage.', cooldownMs: 10800, manaCost: 38, damageMult: 4.9, radius: 225, effectKind: 'aoe', color: '#BE123C' },
      ]),
  ],

  summoner: [
    makeJob('summoner', 1, 'A', 'job_rune_caller', 'Rune Caller', 'Tier I Conjuror', '#C084FC',
      'Commands resilient spectral sentinels and hex rings.',
      { attack: 8, defense: 4, maxHp: 45, maxMp: 45, critChancePct: 4, speedBonus: 8 },
      [
        { id: 'u1a_sigil', slotIndex: 6, hotkey: '6', name: 'Hex Snare', description: 'Curse an area for 2.2x damage and 55% slow.', cooldownMs: 7800, manaCost: 22, damageMult: 2.2, radius: 170, effectKind: 'frost_aoe', color: '#C084FC' },
        { id: 'u1a_call', slotIndex: 7, hotkey: '7', name: 'Lesser Sentinel', description: 'Summon a Rune Sentinel and deal 2.3x AoE.', cooldownMs: 11000, manaCost: 30, damageMult: 2.3, radius: 175, effectKind: 'summon_spirit', color: '#A855F7' },
      ]),
    makeJob('summoner', 1, 'B', 'job_beast_tamer', 'Sylvan Medium', 'Tier I Spiritbond', '#D8B4FE',
      'Channels spirit wolves alongside soothing astral light.',
      { attack: 7, defense: 5, maxHp: 55, maxMp: 45, critChancePct: 4, speedBonus: 10 },
      [
        { id: 'u1b_orbs', slotIndex: 6, hotkey: '6', name: 'Spirit Orbs', description: 'Launch 3 spectral orbs dealing 1.45x damage each.', cooldownMs: 6800, manaCost: 22, damageMult: 1.45, radius: 110, effectKind: 'volley', color: '#D8B4FE' },
        { id: 'u1b_heal', slotIndex: 7, hotkey: '7', name: 'Soul Mend', description: 'Heal nearby allies 24% Max HP with breeze speed.', cooldownMs: 10000, manaCost: 26, damageMult: 0, radius: 235, effectKind: 'group_heal', color: '#34D399' },
      ]),
    makeJob('summoner', 2, 'A', 'job_necrolord', 'Arch-Hexer', 'Tier II Void', '#A855F7',
      'Commands astral sentinels and crushing void hexes.',
      { attack: 16, defense: 8, maxHp: 75, maxMp: 80, critChancePct: 8, speedBonus: 12 },
      [
        { id: 'nec_vortex', slotIndex: 6, hotkey: '6', name: 'Abyssal Sigil', description: 'Curse an area for 2.9x damage and 60% slow.', cooldownMs: 7600, manaCost: 26, damageMult: 2.9, radius: 185, effectKind: 'frost_aoe', color: '#A855F7' },
        { id: 'nec_legion', slotIndex: 7, hotkey: '7', name: 'Elder Sentinel', description: 'Call a Rune Sentinel while blasting nearby foes for 2.9x damage.', cooldownMs: 11500, manaCost: 34, damageMult: 2.9, radius: 190, effectKind: 'summon_spirit', color: '#C084FC' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('summoner', 2, 'B', 'job_spiritcaller', 'Spiritcaller', 'Tier II Packmaster', '#C084FC',
      'Harmonizes spirit wolves with restorative group soul surges.',
      { attack: 13, defense: 11, maxHp: 100, maxMp: 75, critChancePct: 6, speedBonus: 17 },
      [
        { id: 'spc_pack', slotIndex: 6, hotkey: '6', name: 'Alpha Spirit Orbs', description: 'Fire 3 spirit orbs dealing 1.85x damage each.', cooldownMs: 7500, manaCost: 26, damageMult: 1.85, radius: 120, effectKind: 'volley', color: '#D8B4FE' },
        { id: 'spc_grace', slotIndex: 7, hotkey: '7', name: 'Astral Blessing', description: 'Heal your party 30% Max HP and grant swift wind speed.', cooldownMs: 10500, manaCost: 30, damageMult: 0, radius: 265, effectKind: 'group_heal', color: '#34D399' },
      ], { requiredQuestId: 'q_job_trial' }),
    makeJob('summoner', 3, 'A', 'job_void_binder', 'Astral Binder', 'Tier III Riftmaster', '#9333EA',
      'Tears open dimensional rifts that summon sentinels and crush entire zones.',
      { attack: 27, defense: 13, maxHp: 120, maxMp: 130, critChancePct: 12, speedBonus: 18 },
      [
        { id: 'u3a_rift', slotIndex: 6, hotkey: '6', name: 'Rift Detonation', description: 'Tear open the void for 3.9x AoE damage.', cooldownMs: 9500, manaCost: 34, damageMult: 3.9, radius: 210, effectKind: 'aoe', color: '#9333EA' },
        { id: 'u3a_titan', slotIndex: 7, hotkey: '7', name: 'Guardian Call', description: 'Call an Elder Sentinel and blast for 3.5x damage.', cooldownMs: 11000, manaCost: 36, damageMult: 3.5, radius: 205, effectKind: 'summon_spirit', color: '#C084FC' },
      ]),
    makeJob('summoner', 3, 'B', 'job_soul_druid', 'Soul Hierophant', 'Tier III Elder Spirit', '#8B5CF6',
      'Channels forest & spirit energy to stun hordes while rejuvenating allies.',
      { attack: 22, defense: 16, maxHp: 155, maxMp: 125, critChancePct: 10, speedBonus: 22 },
      [
        { id: 'u3b_halo', slotIndex: 6, hotkey: '6', name: 'Spirit Pulse', description: 'Stun monsters in 205u for 3.3x damage & restore 20% HP.', cooldownMs: 9500, manaCost: 30, damageMult: 3.3, radius: 205, effectKind: 'stun_heal', color: '#A78BFA' },
        { id: 'u3b_chorus', slotIndex: 7, hotkey: '7', name: 'Astral Harmony', description: 'Restore 40% Max HP to nearby party + haste.', cooldownMs: 10000, manaCost: 32, damageMult: 0, radius: 290, effectKind: 'group_heal', color: '#34D399' },
      ]),
    makeJob('summoner', 4, 'A', 'job_abyssal_archon', 'Abyssal Archon', 'Tier IV Sovereign', '#A855F7',
      'Grand Archon whose summoned sentinels and void novas dominate world bosses.',
      { attack: 40, defense: 18, maxHp: 180, maxMp: 185, critChancePct: 16, speedBonus: 24 },
      [
        { id: 'u4a_legion', slotIndex: 6, hotkey: '6', name: 'Sovereign Sentinel', description: 'Summon high-power Sentinel and deal 4.3x blast.', cooldownMs: 10000, manaCost: 36, damageMult: 4.3, radius: 220, effectKind: 'summon_spirit', color: '#C084FC' },
        { id: 'u4a_collapse', slotIndex: 7, hotkey: '7', name: 'Singularity Burst', description: 'Void explosion dealing 4.8x AoE damage.', cooldownMs: 10500, manaCost: 42, damageMult: 4.8, radius: 235, effectKind: 'aoe', color: '#9333EA' },
      ]),
    makeJob('summoner', 4, 'B', 'job_celestial_oracle', 'Celestial Caller', 'Tier IV Astral God', '#D8B4FE',
      'Mythic summoner firing starlight volleys while sheltering allies.',
      { attack: 35, defense: 22, maxHp: 215, maxMp: 180, critChancePct: 15, speedBonus: 28 },
      [
        { id: 'u4b_volley', slotIndex: 6, hotkey: '6', name: 'Constellation Volley', description: 'Launch 3 astral bolts dealing 2.4x piercing damage each.', cooldownMs: 5800, manaCost: 28, damageMult: 2.4, radius: 125, effectKind: 'volley', color: '#E9D5FF' },
        { id: 'u4b_miracle', slotIndex: 7, hotkey: '7', name: 'Spirit Sanctuary', description: 'Stun monsters in 230u for 4.0x damage & heal 26% HP.', cooldownMs: 9800, manaCost: 34, damageMult: 4.0, radius: 230, effectKind: 'stun_heal', color: '#34D399' },
      ]),
  ],
};

export function getJobBranchById(jobId: string | null | undefined): JobBranchDef | null {
  if (!jobId) return null;
  for (const list of Object.values(JOB_BRANCHES_DATA)) {
    const found = list.find((j) => j.id === jobId);
    if (found) return found;
  }
  return null;
}
