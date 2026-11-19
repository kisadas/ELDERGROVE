import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Coins, Lock, Sparkles, Swords } from 'lucide-react';
import { JOB_BRANCHES_DATA, getJobBranchById } from '../data/jobChangeData';
import { CLASS_CONFIG } from '../shared/gameTypes';
import type { PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface JobChangeModalProps {
  player: PlayerState;
  onChangeJob: (jobId: string) => void;
  onClose: () => void;
}

export const JobChangeModal: React.FC<JobChangeModalProps> = ({
  player,
  onChangeJob,
  onClose,
}) => {
  const branches = JOB_BRANCHES_DATA[player.heroClass];
  const currentJob = getJobBranchById(player.jobId);
  const baseClassName = CLASS_CONFIG[player.heroClass].name;
  const [tierFilter, setTierFilter] = useState<'all' | 1 | 2 | 3 | 4>('all');

  const sealCount = useMemo(() => {
    let total = 0;
    for (const s of player.inventory) {
      if (s && s.itemId === 'qst_sanctuary_seal') total += s.quantity;
    }
    return total;
  }, [player.inventory]);

  const unlockedSet = useMemo(() => new Set(player.unlockedJobs || []), [player.unlockedJobs]);
  const hasTrialQuest = player.completedQuestIds.includes('q_job_trial');

  const filteredBranches = useMemo(
    () => (tierFilter === 'all' ? branches : branches.filter((b) => b.tier === tierFilter)),
    [branches, tierFilter]
  );

  return (
    <DraggableResizableModal
      title={`Master Kaelen — ${baseClassName} 8 Job Advancements`}
      subtitle="Unlock up to 8 job branches across 4 tiers to gain bonus stats and [6] & [7] skills"
      icon={<Award className="w-5 h-5 text-sky-400" />}
      initialWidth={880}
      initialHeight={620}
      headerRight={
        <div className="flex items-center gap-2 mr-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#0E131C] border border-white/10 text-xs font-mono-num text-amber-300">
            Seals: {sealCount}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-mono-num font-semibold text-amber-400">
            <Coins className="w-4 h-4" />
            {player.gold}g
          </span>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-4">

        {/* Tier Filter & Active Banner */}
        <div className="px-6 py-3 bg-[#0E131C] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 1, 2, 3, 4] as const).map((tier) => (
              <button
                key={String(tier)}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  tierFilter === tier
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-[#171F2E] text-slate-300 hover:bg-[#1F2A3F]'
                }`}
              >
                {tier === 'all' ? `All 8 Jobs (${unlockedSet.size}/8)` : `Tier ${tier}`}
              </button>
            ))}
          </div>

          {currentJob ? (
            <div className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Active: <strong style={{ color: currentJob.accentColor }}>{currentJob.name}</strong> ({currentJob.epithet})
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Current Level: <strong className="text-amber-300 font-mono-num">Lv.{player.level}</strong> · Reach Lv.2 for Tier 1!
            </div>
          )}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto mmo-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBranches.map((branch) => {
              const isUnlocked = unlockedSet.has(branch.id);
              const isChosen = currentJob?.id === branch.id;
              const meetsLevel = player.level >= branch.requiredLevel;
              const meetsGold = player.gold >= branch.goldCost;
              const meetsQuest = !branch.requiredQuestId || hasTrialQuest;
              const meetsSeal = !branch.requiredItemId || sealCount >= 1;
              const canUnlock = !isUnlocked && meetsLevel && meetsGold && meetsQuest && meetsSeal;

              return (
                <div
                  key={branch.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 ${
                    isChosen
                      ? 'bg-[#1C2538] border-amber-400/80 ring-1 ring-amber-400/30'
                      : isUnlocked
                        ? 'bg-[#172131] border-emerald-400/40'
                        : 'bg-[#171F2E] border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono-num font-bold text-slate-200 shrink-0">
                            T{branch.tier} · {branch.path}
                          </span>
                          <h3 className="font-display text-base font-bold truncate" style={{ color: branch.accentColor }}>
                            {branch.name}
                          </h3>
                        </div>
                        <span className="text-[11px] font-mono-num px-2 py-0.5 rounded bg-[#0E131C] text-slate-300 shrink-0">
                          {branch.epithet}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{branch.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px] font-mono-num text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.attack} ATK</span>
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.defense} DEF</span>
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.maxHp} HP</span>
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.maxMp} MP</span>
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.critChancePct}% Crit</span>
                      <span className="px-2 py-0.5 rounded bg-[#0E131C]">+{branch.statBonuses.speedBonus} Spd</span>
                    </div>

                    <div className="space-y-1.5">
                      {branch.skills.map((sk) => (
                        <div
                          key={sk.id}
                          className="p-2.5 rounded-lg bg-[#0E131C] border border-white/8 space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono-num text-[10px] font-bold">
                                [{sk.hotkey}]
                              </span>
                              <span className="text-xs font-bold text-slate-100">{sk.name}</span>
                            </div>
                            <span className="text-[10px] font-mono-num text-sky-300">
                              {sk.manaCost} MP · {(sk.cooldownMs / 1000).toFixed(1)}s CD
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{sk.description}</p>
                        </div>
                      ))}
                    </div>

                    {!isUnlocked && (
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono-num pt-1">
                        <span className={meetsLevel ? 'text-emerald-300' : 'text-slate-400'}>
                          Lv.{branch.requiredLevel}+
                        </span>
                        <span className={meetsGold ? 'text-emerald-300' : 'text-amber-300'}>
                          · {branch.goldCost}g
                        </span>
                        {branch.requiredQuestId && (
                          <span className={meetsQuest ? 'text-emerald-300' : 'text-slate-400'}>
                            · Trial Quest
                          </span>
                        )}
                        {branch.requiredItemId && (
                          <span className={meetsSeal ? 'text-emerald-300' : 'text-slate-400'}>
                            · 1x Ascension Seal
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isChosen ? (
                    <div className="py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Active Specialization
                    </div>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => onChangeJob(branch.id)}
                      className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Swords className="w-4 h-4" />
                      Switch to {branch.name} (Free)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canUnlock}
                      onClick={() => onChangeJob(branch.id)}
                      className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                        canUnlock
                          ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canUnlock ? <Swords className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {canUnlock ? `Unlock ${branch.name} (${branch.goldCost}g)` : `Locked · Lv.${branch.requiredLevel}+`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
