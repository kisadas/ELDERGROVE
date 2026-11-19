import React from 'react';
import { Check, Coins, Feather, Flame, Lock, Sparkles, Wind } from 'lucide-react';
import { MOUNT_LIST } from '../data/mountsData';
import type { MountId, PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface MountsModalProps {
  player: PlayerState;
  mountKeyLabel?: string;
  mountSpecialKeyLabel?: string;
  onUnlockMount: (mountId: MountId) => void;
  onToggleMount: (mountId: MountId) => void;
  onClose: () => void;
}

export const MountsModal: React.FC<MountsModalProps> = ({
  player,
  mountKeyLabel = 'M',
  mountSpecialKeyLabel = 'C',
  onUnlockMount,
  onToggleMount,
  onClose,
}) => {
  return (
    <DraggableResizableModal
      title="Stables & Winged Sky Mounts (8 Mounts)"
      subtitle={`Summon/dismiss [${mountKeyLabel}] · Special [${mountSpecialKeyLabel}] · Winged mounts fly [Space / V or Ctrl]`}
      icon={<Wind className="w-5 h-5 text-cyan-300" />}
      initialWidth={880}
      initialHeight={600}
      headerRight={
        <span className="flex items-center gap-1.5 text-xs font-mono-num font-semibold text-amber-400 mr-2">
          <Coins className="w-4 h-4" />
          {player.gold}g
        </span>
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {MOUNT_LIST.map((m) => {
            const isUnlocked = player.unlockedMounts.includes(m.id);
            const isActive = player.isMounted && player.activeMount === m.id;
            const meetsLevel = player.level >= m.unlockRequirement.minLevel;
            const meetsBoss = m.id === 'dragon' && player.bossKills > 0;
            const meetsGold = player.gold >= m.unlockRequirement.goldCost || meetsBoss;
            const canUnlock = !isUnlocked && ((meetsLevel && player.gold >= m.unlockRequirement.goldCost) || meetsBoss);

            const Icon = m.canFly ? Feather : m.id === 'wolf' ? Wind : m.id === 'cat' ? Sparkles : Flame;

            return (
              <div
                key={m.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3.5 ${
                  isActive
                    ? 'bg-[#1D2536] border-amber-400 ring-1 ring-amber-400/40'
                    : 'bg-[#171E2B] border-white/10'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400 truncate">{m.species}</span>
                    {m.canFly ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-[10px] font-mono-num font-bold text-sky-200 shrink-0">
                        <Feather className="w-3 h-3" />
                        CAN FLY · {m.maxFlightHeight}m
                      </span>
                    ) : (
                      <Icon className="w-4 h-4 shrink-0" style={{ color: m.accentColor }} />
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-slate-50">{m.name}</h3>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">{m.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-mono-num">
                    <div className="p-1.5 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Speed</div>
                      <div className="text-slate-100 font-semibold">{Math.round(m.speedMultiplier * 100)}%</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Jump</div>
                      <div className="text-slate-100 font-semibold">{m.jumpPower.toFixed(1)}</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Stam</div>
                      <div className="text-slate-100 font-semibold">{m.maxStamina}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0E131C] border border-white/5">
                    <div className="text-[11px] font-semibold text-amber-300">
                      Special: {m.specialName}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {m.specialDescription}
                    </div>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onToggleMount(m.id)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {isActive ? 'Dismiss Mount' : 'Summon & Ride'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canUnlock}
                    onClick={() => onUnlockMount(m.id)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      canUnlock
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {canUnlock ? (meetsBoss ? 'Claim Boss Mount' : `Tame (${m.unlockRequirement.goldCost}g)`) : m.unlockRequirement.label}
                  </button>
                )}
          </div>
        );
      })}
    </div>
  </DraggableResizableModal>
);
};
