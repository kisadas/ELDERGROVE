export type VoiceCategory = 'dialogue' | 'skill' | 'ultimate' | 'mount' | 'npc';

export interface VoiceLineDef {
  id: string;
  speaker: string;
  category: VoiceCategory;
  subtitle: string;
  pitch: number;
  rate: number;
}

export const VOICE_LINES_DATA: Record<string, VoiceLineDef> = {
  // Character entry dialogue
  enter_realm: {
    id: 'enter_realm',
    speaker: 'Hero',
    category: 'dialogue',
    subtitle: 'The winds of Eldergrove stir. Stay close, allies—let us push toward the Caldera!',
    pitch: 1.0,
    rate: 1.02,
  },
  level_up_call: {
    id: 'level_up_call',
    speaker: 'Hero',
    category: 'dialogue',
    subtitle: 'New strength awakens! Check the Skill Tree to unlock a passive node.',
    pitch: 1.08,
    rate: 1.05,
  },

  // Skill Callouts
  skill_warrior_1: {
    id: 'skill_warrior_1',
    speaker: 'Warrior',
    category: 'skill',
    subtitle: 'Steel and resolve—Sundering Cleave!',
    pitch: 0.85,
    rate: 1.08,
  },
  skill_mage_1: {
    id: 'skill_mage_1',
    speaker: 'Mage',
    category: 'skill',
    subtitle: 'Aether converge—Arcane Nova!',
    pitch: 1.15,
    rate: 1.08,
  },
  skill_archer_1: {
    id: 'skill_archer_1',
    speaker: 'Archer',
    category: 'skill',
    subtitle: 'Wind guide my arrows—Triple Volley!',
    pitch: 1.12,
    rate: 1.1,
  },
  skill_healer_1: {
    id: 'skill_healer_1',
    speaker: 'Healer',
    category: 'skill',
    subtitle: 'May dawn mend your wounds—Solar Smite!',
    pitch: 1.18,
    rate: 1.02,
  },
  skill_assassin_1: {
    id: 'skill_assassin_1',
    speaker: 'Assassin',
    category: 'skill',
    subtitle: 'Too slow—Twin Fang!',
    pitch: 1.04,
    rate: 1.14,
  },
  skill_summoner_1: {
    id: 'skill_summoner_1',
    speaker: 'Summoner',
    category: 'skill',
    subtitle: 'Answer my call, spirit of the grove!',
    pitch: 1.1,
    rate: 1.05,
  },

  // Ultimate Callouts
  ult_warrior: {
    id: 'ult_warrior',
    speaker: 'Warrior',
    category: 'ultimate',
    subtitle: "Stand fast! Feel the Titan's Cataclysm!",
    pitch: 0.82,
    rate: 1.02,
  },
  ult_mage: {
    id: 'ult_mage',
    speaker: 'Mage',
    category: 'ultimate',
    subtitle: 'Stars align—Celestial Supernova!',
    pitch: 1.16,
    rate: 1.04,
  },
  ult_archer: {
    id: 'ult_archer',
    speaker: 'Archer',
    category: 'ultimate',
    subtitle: 'No escape from the Arrow Tempest!',
    pitch: 1.1,
    rate: 1.08,
  },
  ult_healer: {
    id: 'ult_healer',
    speaker: 'Healer',
    category: 'ultimate',
    subtitle: 'Light eternal—Divine Sanctuary!',
    pitch: 1.2,
    rate: 1.0,
  },
  ult_assassin: {
    id: 'ult_assassin',
    speaker: 'Assassin',
    category: 'ultimate',
    subtitle: 'Vanish into dusk—Phantom Execution!',
    pitch: 1.0,
    rate: 1.12,
  },
  ult_summoner: {
    id: 'ult_summoner',
    speaker: 'Summoner',
    category: 'ultimate',
    subtitle: 'Rise from the astral veil—Leviathan!',
    pitch: 1.08,
    rate: 1.02,
  },

  // Mount Callouts
  mount_summon: {
    id: 'mount_summon',
    speaker: 'Hero',
    category: 'mount',
    subtitle: 'To my side, faithful companion!',
    pitch: 1.05,
    rate: 1.06,
  },

  // Quest & Quartermaster NPC Lines
  npc_quartermaster: {
    id: 'npc_quartermaster',
    speaker: 'Quartermaster Bram',
    category: 'npc',
    subtitle: 'Welcome back, traveler! Need your blade tempered or fresh potions for the Caldera?',
    pitch: 0.86,
    rate: 0.96,
  },
  npc_quest_elder: {
    id: 'npc_quest_elder',
    speaker: 'Elder Lyra',
    category: 'npc',
    subtitle: 'Form a party with your friends and defeat Ignis in Dragon Caldera. All allies within 50 meters share full spoils!',
    pitch: 1.12,
    rate: 0.98,
  },
};
