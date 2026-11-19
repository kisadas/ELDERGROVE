import React from 'react';
import { Check, GitBranch, Lock, Sparkles } from 'lucide-react';
import { CLASS_CONFIG } from '../shared/gameTypes';
import { SKILLS_DATA } from '../data/skillsData';
import { SKILL_TREES_DATA } from '../data/skillTreeData';
import type { PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface SkillTreeModalProps {
  player: PlayerState;
  onUnlockNode: (nodeId: string) => void;
  onClose: () => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  player,
  onUnlockNode,
  onClose,
}) => {
  const classCfg = CLASS_CONFIG[player.heroClass];
  const passives = SKILLS_DATA[player.heroClass].passives;
  const nodes = SKILL_TREES_DATA[player.heroClass];
  const unlocked = new Set(player.unlockedSkillNodes);

  const tiers: Array<{ tier: number; label: string }> = Array.from({ length: 15 }, (_, i) => ({
    tier: i + 1,
    label: `Tier ${i + 1} Mastery`,
  }));

  return (
    <DraggableResizableModal
      title={`${classCfg.name} 15-Tier Mastery Tree`}
      subtitle="Earn +1 Skill Point every level-up · Passives apply automatically and persist"
      icon={<GitBranch className="w-5 h-5 text-emerald-400" />}
      initialWidth={780}
      initialHeight={620}
      headerRight={
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs font-mono-num font-semibold text-amber-300 mr-2">
          {player.skillPoints} Skill {player.skillPoints === 1 ? 'Pt' : 'Pts'}
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-6">
          {/* 2 Innate Class Passives */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Innate Class Passives (Always Active)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {passives.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg bg-[#1A2130] border border-emerald-500/25 flex items-start gap-2.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3-Tier Interactive Skill Tree */}
          <div className="space-y-4">
            {tiers.map((t) => {
              const tierNodes = nodes.filter((n) => n.tier === t.tier);
              return (
                <div key={t.tier} className="space-y-2">
                  <div className="text-xs font-semibold text-amber-300/90 border-b border-white/10 pb-1">
                    {t.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((colIdx) => {
                      const node = tierNodes.find((n) => n.col === colIdx);
                      if (!node) {
                        return <div key={colIdx} className="hidden sm:block" />;
                      }

                      const isUnlocked = unlocked.has(node.id);
                      const reqsMet = node.requires.every((r) => unlocked.has(r));
                      const canBuy = !isUnlocked && reqsMet && player.skillPoints >= node.cost;
                      const reqNames = node.requires
                        .map((rid) => nodes.find((n) => n.id === rid)?.name || rid)
                        .join(' + ');

                      return (
                        <button
                          key={node.id}
                          disabled={!canBuy}
                          onClick={() => onUnlockNode(node.id)}
                          className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                            isUnlocked
                              ? 'bg-emerald-950/35 border-emerald-400/60 text-slate-100'
                              : canBuy
                                ? 'bg-[#1D2536] border-amber-400 hover:bg-[#242E42] cursor-pointer'
                                : 'bg-[#111620] border-white/10 opacity-75 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {node.name}
                            </span>
                            {isUnlocked ? (
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Lock
                                className={`w-4 h-4 shrink-0 ${
                                  canBuy ? 'text-amber-400' : 'text-slate-500'
                                }`}
                              />
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-snug">
                            {node.description}
                          </p>

                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono-num">
                            {isUnlocked ? (
                              <span className="text-emerald-400 font-semibold">Unlocked</span>
                            ) : reqNames ? (
                              <span className="text-slate-400 truncate" title={`Requires: ${reqNames}`}>
                                Req: {reqNames}
                              </span>
                            ) : (
                              <span className="text-slate-400">Tier 1 Ready</span>
                            )}
                            {!isUnlocked && (
                              <span className={canBuy ? 'text-amber-300 font-semibold' : 'text-slate-500'}>
                                {node.cost} pt
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </DraggableResizableModal>
  );
};
