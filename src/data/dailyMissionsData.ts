export interface DailyMissionDef {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  rewardXp: number;
  rewardGold: number;
  rewardSkillPoints: number;
  category: 'kills' | 'quests' | 'skills' | 'gathering' | 'boss';
}

export const DAILY_MISSIONS_DATA: DailyMissionDef[] = [
  {
    id: 'daily_slayer',
    title: 'Monster Slayer',
    description: 'Defeat 12 monsters anywhere in the open world realms.',
    targetCount: 12,
    rewardXp: 450,
    rewardGold: 120,
    rewardSkillPoints: 1,
    category: 'kills',
  },
  {
    id: 'daily_skillmaster',
    title: 'Arcane Mastery',
    description: 'Cast 15 active combat skills or ultimates in battle.',
    targetCount: 15,
    rewardXp: 380,
    rewardGold: 90,
    rewardSkillPoints: 1,
    category: 'skills',
  },
  {
    id: 'daily_collector',
    title: 'Relic Collector',
    description: 'Gather 6 materials or item drops from defeated foes.',
    targetCount: 6,
    rewardXp: 400,
    rewardGold: 150,
    rewardSkillPoints: 1,
    category: 'gathering',
  },
  {
    id: 'daily_worldboss',
    title: 'Eclipse Challenger',
    description: 'Participate in defeating a world boss or zone boss.',
    targetCount: 1,
    rewardXp: 950,
    rewardGold: 350,
    rewardSkillPoints: 2,
    category: 'boss',
  },
];
