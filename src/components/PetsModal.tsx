import React from 'react';
import { Check, Coins, Heart, Lock, Sparkles } from 'lucide-react';
import { PET_LIST, getEffectivePetXpBonus, petXpForNextLevel } from '../data/petsData';
import type { PetId, PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface PetsModalProps {
  player: PlayerState;
  onUnlockPet: (petId: PetId) => void;
  onTogglePet: (petId: PetId) => void;
  onClose: () => void;
}

export const PetsModal: React.FC<PetsModalProps> = ({
  player,
  onUnlockPet,
  onTogglePet,
  onClose,
}) => {
  const activePetId = player.activePet?.id ?? null;
  const petXpNext = petXpForNextLevel(player.petLevel || 1);
  const petXpPct = Math.min(100, Math.round(((player.petXp || 0) / Math.max(1, petXpNext)) * 100));

  return (
    <DraggableResizableModal
      title="Companion Pets Sanctuary (8 Companions)"
      subtitle="Pets auto-loot drops, boost monster XP, assist in combat & level up"
      icon={<Heart className="w-5 h-5 text-pink-400" />}
      initialWidth={880}
      initialHeight={600}
      headerRight={
        <div className="flex items-center gap-2 mr-2">
          <div className="px-2.5 py-1 rounded-lg bg-[#0E131C] border border-pink-400/30 text-xs font-mono-num text-pink-200">
            Pet Lv.{player.petLevel || 1}{' '}
            <span className="text-slate-400">
              ({player.petXp || 0}/{petXpNext} XP · {petXpPct}%)
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-mono-num font-semibold text-amber-400">
            <Coins className="w-4 h-4" />
            {player.gold}g
          </span>
        </div>
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {PET_LIST.map((pet) => {
            const isUnlocked = player.unlockedPets.includes(pet.id);
            const isActive = activePetId === pet.id;
            const meetsLevel = player.level >= pet.minLevel;
            const meetsGold = player.gold >= pet.goldCost;
            const canUnlock = !isUnlocked && meetsLevel && meetsGold;
            const effectiveXpPct = getEffectivePetXpBonus(pet.id, player.petLevel || 1);

            return (
              <div
                key={pet.id}
                className={`rounded-xl border p-4 flex flex-col justify-between gap-3.5 ${
                  isActive
                    ? 'bg-[#211A30] border-pink-400 ring-1 ring-pink-400/40'
                    : 'bg-[#171E2B] border-white/10'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400 truncate">{pet.species}</span>
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/30"
                      style={{ backgroundColor: pet.color }}
                    />
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold" style={{ color: pet.accentColor }}>
                      {pet.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">{pet.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-num">
                    <div className="p-2 rounded bg-[#0E131C]">
                      <div className="text-slate-400">XP Boost</div>
                      <div className="text-emerald-300 font-bold">+{effectiveXpPct}%</div>
                    </div>
                    <div className="p-2 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Gold Bonus</div>
                      <div className="text-amber-300 font-bold">+{pet.goldBonusPct}%</div>
                    </div>
                    <div className="p-2 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Auto-Loot</div>
                      <div className="text-sky-300 font-bold">{Math.round(pet.pickupRadius * 0.1)}m</div>
                    </div>
                    <div className="p-2 rounded bg-[#0E131C]">
                      <div className="text-slate-400">Assist Bolt</div>
                      <div className="text-pink-300 font-bold">{Math.round(pet.assistDamageMult * 100)}%</div>
                    </div>
                  </div>

                  {pet.healPctPerTrigger && (
                    <div className="px-2.5 py-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      Heals +{Math.round(pet.healPctPerTrigger * 100)}% HP on assist pulse
                    </div>
                  )}
                </div>

                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => onTogglePet(pet.id)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                        : 'bg-pink-500 hover:bg-pink-400 text-slate-950'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {isActive ? 'Dismiss Pet' : 'Summon Pet'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canUnlock}
                    onClick={() => onUnlockPet(pet.id)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                      canUnlock
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {meetsLevel && meetsGold
                      ? `Adopt (${pet.goldCost}g)`
                      : `Lv.${pet.minLevel} · ${pet.goldCost}g`}
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </DraggableResizableModal>
  );
};
