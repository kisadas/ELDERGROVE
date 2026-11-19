import type { ZoneId } from './zonesData';

export type QuestType = 'kill' | 'collect' | 'talk' | 'reach';
export type QuestCategory = 'progression' | 'side';

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  role: 'quest' | 'merchant' | 'job_master' | 'quartermaster';
  x: number;
  y: number;
  radius: number;
  accentColor: string;
  greeting: string;
}

export interface QuestReward {
  xp: number;
  gold: number;
  skillPoints?: number;
  items?: { itemId: string; quantity: number }[];
}

export interface QuestDef {
  id: string;
  category: QuestCategory;
  title: string;
  description: string;
  type: QuestType;
  giverNpcId: string;
  turnInNpcId: string;
  requiredLevel: number;
  prerequisiteQuestId?: string;
  shareInGroup: boolean;
  targetKind?: string;
  targetItemId?: string;
  targetNpcId?: string;
  targetZoneId?: ZoneId;
  targetCount: number;
  dialogueOffer: string;
  dialogueProgress: string;
  dialogueComplete: string;
  reward: QuestReward;
}

export const NPCS_DATA: Record<string, NpcDef> = {
  npc_lyra: {
    id: 'npc_lyra',
    name: 'Elder Lyra',
    title: 'Sanctuary Archivist',
    role: 'quest',
    x: 1690,
    y: 1470,
    radius: 36,
    accentColor: '#34D399',
    greeting: 'Welcome, traveler. Eldergrove needs heroes ready to break the sealed wilds.',
  },
  npc_elena: {
    id: 'npc_elena',
    name: 'Merchant Elena',
    title: 'Grand Outfitter',
    role: 'merchant',
    x: 1930,
    y: 1500,
    radius: 36,
    accentColor: '#FBBF24',
    greeting: 'Finest potions, satchels, and blades in the Sanctuary. Fresh stock arrives every 90 seconds!',
  },
  npc_kaelen: {
    id: 'npc_kaelen',
    name: 'Master Kaelen',
    title: 'Grand Job Master',
    role: 'job_master',
    x: 1670,
    y: 1730,
    radius: 38,
    accentColor: '#60A5FA',
    greeting: 'Ascend through 8 Job Advancements as you grow stronger and unlock specialized skills!',
  },
  npc_maeve: {
    id: 'npc_maeve',
    name: 'Scholar Maeve',
    title: 'Highland Expedition Lead',
    role: 'merchant',
    x: 1960,
    y: 960,
    radius: 36,
    accentColor: '#38BDF8',
    greeting: 'The Frozen Highlands bite deep. Stock up on Glacier gear and press on toward Glacius!',
  },
};

export const NPC_LIST: NpcDef[] = Object.values(NPCS_DATA);

export const QUESTS_DATA: Record<string, QuestDef> = {
  // === PROGRESSION QUESTS (MAIN STORY) ===
  q_first_hunt: {
    id: 'q_first_hunt',
    category: 'progression',
    title: 'Chapter I: Slimes at the West Gate',
    description: 'Defeat 4 Timber Slimes in Whispering Woods to secure the western frontier.',
    type: 'kill',
    giverNpcId: 'npc_lyra',
    turnInNpcId: 'npc_lyra',
    requiredLevel: 1,
    shareInGroup: true,
    targetKind: 'slime',
    targetCount: 4,
    dialogueOffer: 'Timber Slimes have crept close to our Sanctuary archway. Clear 4 of them with your allies.',
    dialogueProgress: 'Head west into Whispering Woods — slimes dissolve quickly under combo strikes.',
    dialogueComplete: 'Splendid work! Take these coins, potions, and a skill point for your path.',
    reward: {
      xp: 170,
      gold: 95,
      skillPoints: 1,
      items: [{ itemId: 'con_vitality_potion', quantity: 3 }],
    },
  },
  q_speak_kaelen: {
    id: 'q_speak_kaelen',
    category: 'progression',
    title: 'Chapter II: Council of Eight Paths',
    description: 'Speak with Grand Job Master Kaelen in the southern Sanctuary courtyard.',
    type: 'talk',
    giverNpcId: 'npc_lyra',
    turnInNpcId: 'npc_kaelen',
    requiredLevel: 1,
    shareInGroup: false,
    targetNpcId: 'npc_kaelen',
    targetCount: 1,
    dialogueOffer: 'Before venturing deeper, speak with Master Kaelen about advancing through the 8 Job Tiers.',
    dialogueProgress: 'Master Kaelen awaits on the southwest marble terrace of Sunlit Sanctuary.',
    dialogueComplete: 'Greetings, initiate. Reach Level 2 for your first Job Advancement!',
    reward: {
      xp: 130,
      gold: 75,
      items: [{ itemId: 'con_aether_elixir', quantity: 2 }],
    },
  },
  q_job_trial: {
    id: 'q_job_trial',
    category: 'progression',
    title: 'Chapter III: Trial of Ascension',
    description: 'Defeat the Sylvan Behemoth in western Whispering Woods to unlock Frozen Highlands.',
    type: 'kill',
    giverNpcId: 'npc_kaelen',
    turnInNpcId: 'npc_kaelen',
    requiredLevel: 2,
    shareInGroup: true,
    targetKind: 'boss_treant',
    targetCount: 1,
    dialogueOffer: 'Defeat Sylvan Behemoth in western Whispering Woods to shatter the northern Glacial Gate!',
    dialogueProgress: 'Gather your party! Sylvan Behemoth patrols the western woods glade.',
    dialogueComplete: 'You shattered the warden and broke the Glacial Barrier! Take this Ascension Seal.',
    reward: {
      xp: 580,
      gold: 280,
      skillPoints: 2,
      items: [
        { itemId: 'qst_sanctuary_seal', quantity: 1 },
        { itemId: 'con_satchel_expansion', quantity: 1 },
      ],
    },
  },
  q_reach_highlands: {
    id: 'q_reach_highlands',
    category: 'progression',
    title: 'Chapter IV: Beyond the Glacial Gate',
    description: 'Cross north into Frozen Highlands and report to Scholar Maeve.',
    type: 'reach',
    giverNpcId: 'npc_lyra',
    turnInNpcId: 'npc_maeve',
    requiredLevel: 3,
    shareInGroup: false,
    targetZoneId: 'highlands',
    targetCount: 1,
    dialogueOffer: 'Once the Glacial Gate opens, cross north into Frozen Highlands and meet Scholar Maeve.',
    dialogueProgress: 'Follow the northern mountain pass once Sylvan Behemoth is defeated.',
    dialogueComplete: 'You made it through the snowstorm! Let us prepare for Glacius, the Frost Monarch.',
    reward: {
      xp: 440,
      gold: 220,
      skillPoints: 1,
      items: [{ itemId: 'mnt_swift_stirrups', quantity: 1 }],
    },
  },
  q_crown_of_frost: {
    id: 'q_crown_of_frost',
    category: 'progression',
    title: 'Chapter V: Shatter the Frost Monarch',
    description: 'Slay Glacius, Frost Monarch in Frozen Highlands to unlock Ashen Ruins.',
    type: 'kill',
    giverNpcId: 'npc_maeve',
    turnInNpcId: 'npc_maeve',
    requiredLevel: 5,
    shareInGroup: true,
    targetKind: 'boss_frost',
    targetCount: 1,
    dialogueOffer: 'Glacius seals the southern ruins road. Defeat him with your group — allies share credit!',
    dialogueProgress: 'Beware his Cryo Nova telegraph in Phase 2 and Absolute Zero in Phase 3!',
    dialogueComplete: 'Magnificent! The Twilight Ward has fallen, and this Frostheart Pendant is yours.',
    reward: {
      xp: 1100,
      gold: 500,
      skillPoints: 2,
      items: [{ itemId: 'acc_frost_pendant', quantity: 1 }],
    },
  },
  q_world_eclipse: {
    id: 'q_world_eclipse',
    category: 'progression',
    title: 'Chapter VI: Fall of the Eclipse Sovereign',
    description: 'Defeat World Boss Aurelion, Eclipse Sovereign when he awakens at Eclipse Crucible.',
    type: 'kill',
    giverNpcId: 'npc_lyra',
    turnInNpcId: 'npc_lyra',
    requiredLevel: 7,
    shareInGroup: true,
    targetKind: 'boss_world_eclipse',
    targetCount: 1,
    dialogueOffer: 'Aurelion awakens whenever 25 monsters are slain across the realm or his celestial timer expires!',
    dialogueProgress: 'Watch the World Boss tracker and head northeast to Eclipse Crucible when he appears.',
    dialogueComplete: 'Legendary! Eldergrove celebrates your triumph over the Eclipse Sovereign.',
    reward: {
      xp: 2400,
      gold: 1100,
      skillPoints: 3,
      items: [{ itemId: 'qst_sanctuary_seal', quantity: 2 }],
    },
  },

  // === SIDE QUESTS ===
  q_boar_fangs: {
    id: 'q_boar_fangs',
    category: 'side',
    title: 'Side: Tusk Harvest',
    description: 'Collect 3 Serrated Boar Fangs from Thorn Boars (or merchants) for Elena.',
    type: 'collect',
    giverNpcId: 'npc_elena',
    turnInNpcId: 'npc_elena',
    requiredLevel: 1,
    shareInGroup: false,
    targetItemId: 'mat_boar_fang',
    targetCount: 3,
    dialogueOffer: 'Thorn Boars drop sturdy fangs I need for frontier forging. Bring me 3!',
    dialogueProgress: 'Hunt Thorn Boars in Whispering Woods or check my shop stock.',
    dialogueComplete: 'Crisp ivory! Take this Sylvan Runeblade and gold.',
    reward: {
      xp: 220,
      gold: 140,
      items: [{ itemId: 'wpn_sylvan_edge', quantity: 1 }],
    },
  },
  q_slime_alchemy: {
    id: 'q_slime_alchemy',
    category: 'side',
    title: 'Side: Alchemical Gel',
    description: 'Collect 4 Luminous Slime Gel droplets for Elena’s potion vats.',
    type: 'collect',
    giverNpcId: 'npc_elena',
    turnInNpcId: 'npc_elena',
    requiredLevel: 1,
    shareInGroup: false,
    targetItemId: 'mat_slime_gel',
    targetCount: 4,
    dialogueOffer: 'My Vitality Potion brewing needs fresh Luminous Slime Gel. Can you bring 4?',
    dialogueProgress: 'Timber Slimes just outside the Sanctuary west gate carry gel.',
    dialogueComplete: 'Brilliant clarity! Take these potions and extra gold for a pet companion.',
    reward: {
      xp: 180,
      gold: 120,
      items: [{ itemId: 'con_warriors_draught', quantity: 2 }],
    },
  },
  q_golem_bounty: {
    id: 'q_golem_bounty',
    category: 'side',
    title: 'Side: Moss Golem Bounty',
    description: 'Clear 3 Moss Golems guarding the deeper Whispering Woods crossroads.',
    type: 'kill',
    giverNpcId: 'npc_kaelen',
    turnInNpcId: 'npc_kaelen',
    requiredLevel: 2,
    shareInGroup: true,
    targetKind: 'golem',
    targetCount: 3,
    dialogueOffer: 'Moss Golems are blocking merchant wagons along the western bridge. Smash 3 of them.',
    dialogueProgress: 'Watch for their heavy ground slam windups!',
    dialogueComplete: 'The trade bridge is clear! Use this gold toward a flying mount or companion pet.',
    reward: {
      xp: 310,
      gold: 180,
      skillPoints: 1,
    },
  },
  q_glacier_crystals: {
    id: 'q_glacier_crystals',
    category: 'side',
    title: 'Side: Glacier Shard Research',
    description: 'Collect 3 Glacier Mana Crystals in Frozen Highlands for Scholar Maeve.',
    type: 'collect',
    giverNpcId: 'npc_maeve',
    turnInNpcId: 'npc_maeve',
    requiredLevel: 4,
    shareInGroup: false,
    targetItemId: 'mat_glacier_crystal',
    targetCount: 3,
    dialogueOffer: 'Frost Wolves and Rime Colossi condense pure mana shards. Bring me 3 crystals!',
    dialogueProgress: 'Explore the Frozen Highlands ridges or check my expedition stock.',
    dialogueComplete: 'These crystals sing with aether! Take this Ascension Seal in thanks.',
    reward: {
      xp: 480,
      gold: 260,
      items: [{ itemId: 'qst_sanctuary_seal', quantity: 1 }],
    },
  },
  q_ashen_knights: {
    id: 'q_ashen_knights',
    category: 'side',
    title: 'Side: Purge the Obsidian Guard',
    description: 'Defeat 4 Obsidian Knights in Ashen Ruins.',
    type: 'kill',
    giverNpcId: 'npc_kaelen',
    turnInNpcId: 'npc_kaelen',
    requiredLevel: 7,
    shareInGroup: true,
    targetKind: 'knight',
    targetCount: 4,
    dialogueOffer: 'Ancient Obsidian Knights march again in the southern Ashen Ruins. Cut down 4 of them.',
    dialogueProgress: 'Strike them down in the sunken southern courtyard.',
    dialogueComplete: 'Your blade work is Peerless! Here is an Ascension Seal and gold.',
    reward: {
      xp: 820,
      gold: 380,
      skillPoints: 1,
      items: [{ itemId: 'qst_sanctuary_seal', quantity: 1 }],
    },
  },
  q_caldera_wyrms: {
    id: 'q_caldera_wyrms',
    category: 'side',
    title: 'Side: Culling the Caldera',
    description: 'Defeat 4 Ember Wyrmlings or Ignis in southeastern Dragon’s Caldera.',
    type: 'kill',
    giverNpcId: 'npc_elena',
    turnInNpcId: 'npc_elena',
    requiredLevel: 10,
    shareInGroup: true,
    targetKind: 'wyrmling',
    targetCount: 4,
    dialogueOffer: 'Ember Wyrmlings are scorching caravans near the caldera rim. Bring back 4 trophies!',
    dialogueProgress: 'Fly or ride southeast into Dragon’s Caldera to hunt Ember Wyrmlings.',
    dialogueComplete: 'Spectacular hunting! Take this Caldera treasure bounty.',
    reward: {
      xp: 1250,
      gold: 620,
      items: [{ itemId: 'con_satchel_expansion', quantity: 1 }],
    },
  },
};

export const QUEST_LIST: QuestDef[] = Object.values(QUESTS_DATA);
