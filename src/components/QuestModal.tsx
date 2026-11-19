import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Coins, Compass, Gift, ScrollText, Users, X } from 'lucide-react';
import { ITEMS_DATA, RARITY_CONFIG } from '../data/itemsData';
import { NPC_LIST, NPCS_DATA, QUEST_LIST } from '../data/questsData';
import { DAILY_MISSIONS_DATA } from '../data/dailyMissionsData';
import type { QuestCategory, QuestDef } from '../data/questsData';
import type { PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface QuestModalProps {
  player: PlayerState;
  initialNpcId?: string;
  onAcceptQuest: (questId: string) => void;
  onCompleteQuest: (questId: string) => void;
  onTalkNpc: (npcId: string) => void;
  onClose: () => void;
}

export const QuestModal: React.FC<QuestModalProps> = ({
  player,
  initialNpcId,
  onAcceptQuest,
  onCompleteQuest,
  onTalkNpc,
  onClose,
}) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string>(initialNpcId || 'npc_lyra');
  const [categoryTab, setCategoryTab] = useState<'all' | 'daily' | QuestCategory>('all');

  useEffect(() => {
    if (initialNpcId && NPCS_DATA[initialNpcId]) {
      setSelectedNpcId(initialNpcId);
    }
  }, [initialNpcId]);

  const activeMap = useMemo(() => {
    const m = new Map<string, { progress: number; completed: boolean }>();
    for (const aq of player.activeQuests) {
      m.set(aq.questId, { progress: aq.progress, completed: aq.completed });
    }
    return m;
  }, [player.activeQuests]);

  const completedSet = useMemo(() => new Set(player.completedQuestIds), [player.completedQuestIds]);

  const getNpcBadge = (npcId: string): 'turnin' | 'available' | null => {
    const hasTurnIn = QUEST_LIST.some((q) => {
      const aq = activeMap.get(q.id);
      if (!aq) return false;
      const isTalkTarget = q.type === 'talk' && q.targetNpcId === npcId && !aq.completed;
      const isTurnInReady = q.turnInNpcId === npcId && (aq.completed || aq.progress >= q.targetCount);
      return isTalkTarget || isTurnInReady;
    });
    if (hasTurnIn) return 'turnin';

    const hasAvailable = QUEST_LIST.some(
      (q) =>
        q.giverNpcId === npcId &&
        !completedSet.has(q.id) &&
        !activeMap.has(q.id) &&
        player.level >= q.requiredLevel &&
        (!q.prerequisiteQuestId || completedSet.has(q.prerequisiteQuestId))
    );
    if (hasAvailable) return 'available';
    return null;
  };

  const selectedNpc = NPCS_DATA[selectedNpcId] || NPC_LIST[0];

  const npcQuests = useMemo(
    () =>
      QUEST_LIST.filter(
        (q) =>
          (categoryTab === 'all' || q.category === categoryTab) &&
          (q.giverNpcId === selectedNpc.id ||
            q.turnInNpcId === selectedNpc.id ||
            (q.type === 'talk' && q.targetNpcId === selectedNpc.id && activeMap.has(q.id)))
      ),
    [selectedNpc.id, activeMap, categoryTab]
  );

  const progressionQuests = useMemo(
    () => QUEST_LIST.filter((q) => q.category === 'progression'),
    []
  );
  const sideQuests = useMemo(
    () => QUEST_LIST.filter((q) => q.category === 'side'),
    []
  );

  const activeList = useMemo(
    () => QUEST_LIST.filter((q) => activeMap.has(q.id)),
    [activeMap]
  );

  const renderRewardBadges = (q: QuestDef) => (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-num">
      <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/30 text-sky-200">
        +{q.reward.xp} XP
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
        <Coins className="w-3 h-3" />+{q.reward.gold}g
      </span>
      {q.reward.skillPoints && (
        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
          +{q.reward.skillPoints} Skill Pt
        </span>
      )}
      {q.reward.items?.map((ri) => {
        const item = ITEMS_DATA[ri.itemId];
        if (!item) return null;
        return (
          <span
            key={ri.itemId}
            className="px-2 py-0.5 rounded bg-[#0E131C] border border-white/10"
            style={{ color: RARITY_CONFIG[item.rarity].color }}
          >
            {ri.quantity}x {item.name}
          </span>
        );
      })}
    </div>
  );

  return (
    <DraggableResizableModal
      title="Quest Log & Daily Missions"
      subtitle={`Completed: ${player.completedQuestIds.length} / ${QUEST_LIST.length} · Movable & Resizable`}
      icon={<ScrollText className="w-5 h-5 text-emerald-400" />}
      initialWidth={920}
      initialHeight={600}
      onClose={onClose}
      headerRight={
        <div className="flex items-center gap-1.5">
          {([
            { id: 'all', label: 'All Quests' },
            { id: 'daily', label: 'Daily Missions' },
            { id: 'progression', label: 'Story' },
            { id: 'side', label: 'Side' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryTab(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                categoryTab === tab.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#1A2130] text-slate-300 hover:bg-[#232D42]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
        {/* Left: NPC Directory & Active Quest Summary */}
        <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-white/10 p-4 space-y-4 overflow-y-auto mmo-scroll bg-[#0E131C]">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Eldergrove NPCs (Click in 3D or here)
            </div>
            {NPC_LIST.map((npc) => {
              const badge = getNpcBadge(npc.id);
              const selected = npc.id === selectedNpc.id;
              const distanceM = Math.round(Math.hypot(player.x - npc.x, player.y - npc.y) * 0.1);
              return (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => setSelectedNpcId(npc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#1D2638] border-amber-400/60'
                      : 'bg-[#151B26] border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{npc.name}</span>
                    {badge === 'turnin' && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold">
                        [?]
                      </span>
                    )}
                    {badge === 'available' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-bold">
                        [!]
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span>{npc.title}</span>
                    <span className="font-mono-num">{distanceM}m</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Quests ({activeList.length})
            </div>
            {activeList.length === 0 ? (
              <p className="text-xs text-slate-500">No active quests. Select an NPC above to begin.</p>
            ) : (
              activeList.map((q) => {
                const prog = activeMap.get(q.id)!;
                const ready = prog.completed || prog.progress >= q.targetCount;
                return (
                  <div key={q.id} className="p-2.5 rounded-lg bg-[#151B26] border border-white/8 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100 truncate">{q.title}</span>
                      <span className={`font-mono-num ${ready ? 'text-emerald-300 font-bold' : 'text-amber-300'}`}>
                        {prog.progress}/{q.targetCount}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Turn in: {NPCS_DATA[q.turnInNpcId]?.name}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected NPC Dialogue & Quests or Daily Missions */}
        <div className="md:col-span-8 p-5 overflow-y-auto mmo-scroll space-y-4">
          {categoryTab === 'daily' ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-400/40 flex items-center gap-3">
                <Gift className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-display text-base font-bold text-amber-200">Daily Adventurer Missions</h3>
                  <p className="text-xs text-slate-300">Complete tasks daily to earn bonus XP, gold, and skill points.</p>
                </div>
              </div>

              {DAILY_MISSIONS_DATA.map((dm) => {
                const curProg = Math.min(dm.targetCount, player.kills || 0);
                const isReady = curProg >= dm.targetCount;
                return (
                  <div key={dm.id} className="p-4 rounded-xl bg-[#182030] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-100">{dm.title}</div>
                        <div className="text-xs text-slate-300 mt-0.5">{dm.description}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-xs font-mono-num text-amber-300">
                        {curProg} / {dm.targetCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono-num">
                      <div className="flex items-center gap-2 text-sky-300">
                        <span>+{dm.rewardXp} XP</span>
                        <span className="text-amber-300">+{dm.rewardGold}g</span>
                        <span className="text-emerald-300">+{dm.rewardSkillPoints} Skill Pt</span>
                      </div>
                      <span className={isReady ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {isReady ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-[#1A2130] border border-white/10 flex items-start gap-3">
                <Compass className="w-5 h-5 mt-0.5 shrink-0" style={{ color: selectedNpc.accentColor }} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-50">{selectedNpc.name}</h3>
                    <span className="text-xs text-slate-400">· {selectedNpc.title}</span>
                  </div>
                  <p className="text-xs text-slate-200 italic">“{selectedNpc.greeting}”</p>
                </div>
              </div>

              {npcQuests.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#151B26] border border-white/5 text-center text-xs text-slate-400">
                  No {categoryTab === 'all' ? '' : categoryTab} quests associated with {selectedNpc.name}. Try another NPC or filter tab.
                </div>
              ) : (
                <div className="space-y-3">
                  {npcQuests.map((q) => {
                    const active = activeMap.get(q.id);
                    const isDone = completedSet.has(q.id);
                    const isReady = active ? active.completed || active.progress >= q.targetCount : false;
                    const needsTalkHere = Boolean(
                      active && q.type === 'talk' && q.targetNpcId === selectedNpc.id && !active.completed
                    );
                    const levelLocked = player.level < q.requiredLevel;
                    const prereqLocked = Boolean(q.prerequisiteQuestId && !completedSet.has(q.prerequisiteQuestId));

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-xl border space-y-3 ${
                          isDone
                            ? 'bg-[#101620] border-emerald-500/20 opacity-80'
                            : isReady
                              ? 'bg-emerald-950/25 border-emerald-400/50'
                              : active
                                ? 'bg-[#182030] border-amber-400/40'
                                : 'bg-[#182030] border-white/10'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono-num font-bold uppercase ${
                                  q.category === 'progression'
                                    ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                                    : 'bg-sky-500/20 border border-sky-400/40 text-sky-300'
                                }`}
                              >
                                {q.category === 'progression' ? 'Progression' : 'Side Quest'}
                              </span>
                              <span className="text-sm font-bold text-slate-100">{q.title}</span>
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono-num text-slate-300 uppercase">
                                {q.type}
                              </span>
                              <span className="text-[11px] font-mono-num text-slate-400">Lv.{q.requiredLevel}+</span>
                              {q.shareInGroup && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-sky-300">
                                  <Users className="w-3 h-3" /> Group Shared
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{q.description}</p>
                          </div>

                          {isDone && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" /> Completed
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-amber-200/90 bg-[#0E131C] border border-white/5 rounded-lg px-3 py-2">
                          “{isDone || isReady ? q.dialogueComplete : active ? q.dialogueProgress : q.dialogueOffer}”
                        </p>

                        {active && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono-num text-slate-300">
                              <span>Progress</span>
                              <span>
                                {active.progress} / {q.targetCount}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className={`h-full transition-all ${isReady ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, (active.progress / q.targetCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {renderRewardBadges(q)}

                          <div className="flex items-center gap-2 ml-auto">
                            {!isDone && !active && q.giverNpcId === selectedNpc.id && (
                              <button
                                type="button"
                                disabled={levelLocked || prereqLocked}
                                onClick={() => onAcceptQuest(q.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                  levelLocked || prereqLocked
                                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                                }`}
                              >
                                {levelLocked ? `Requires Lv.${q.requiredLevel}` : 'Accept Quest'}
                              </button>
                            )}

                            {needsTalkHere && (
                              <button
                                type="button"
                                onClick={() => onTalkNpc(selectedNpc.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                              >
                                Speak with {selectedNpc.name}
                              </button>
                            )}

                            {active && isReady && q.turnInNpcId === selectedNpc.id && (
                              <button
                                type="button"
                                onClick={() => onCompleteQuest(q.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                              >
                                Complete &amp; Claim
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DraggableResizableModal>
  );
};
