import React from 'react';
import {
  Backpack,
  Coins,
  FlaskConical,
  GitBranch,
  Hammer,
  Plus,
  Shield,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { ITEMS_DATA, RARITY_CONFIG } from '../data/itemsData';
import { getJobBranchById } from '../data/jobChangeData';
import { CLASS_CONFIG, getUpgradeCost } from '../shared/gameTypes';
import type { PlayerState, PlayerStats } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface CharacterModalProps {
  player: PlayerState;
  onClose: () => void;
  onOpenSkillTree: () => void;
  onOpenInventory: () => void;
  onAllocateStat: (stat: keyof PlayerStats) => void;
  onUpgradeGear: (slot: 'weapon' | 'armor' | 'potion') => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  player,
  onClose,
  onOpenSkillTree,
  onOpenInventory,
  onAllocateStat,
  onUpgradeGear,
}) => {
  const weaponCost = getUpgradeCost(player.weaponTier);
  const armorCost = getUpgradeCost(player.armorTier);
  const potionCost = 24;
  const classCfg = CLASS_CONFIG[player.heroClass];
  const jobBranch = getJobBranchById(player.jobId);
  const now = Date.now();
  const hasAtkBuff = player.activeBuffs.attackUntil > now;
  const hasDefBuff = player.activeBuffs.defenseUntil > now;

  const statRows: Array<{
    key: keyof PlayerStats;
    label: string;
    effect: string;
    value: number;
    bonus: number;
  }> = [
    {
      key: 'might',
      label: 'Might',
      effect: '+3.5 Attack Power per point',
      value: player.stats.might,
      bonus: player.gearBonuses.might,
    },
    {
      key: 'vitality',
      label: 'Vitality',
      effect: '+16 Max HP & +1.1 Defense per point',
      value: player.stats.vitality,
      bonus: player.gearBonuses.vitality,
    },
    {
      key: 'agility',
      label: 'Agility',
      effect: '+4.5 Speed, +1.5% Crit & faster attacks',
      value: player.stats.agility,
      bonus: player.gearBonuses.agility,
    },
  ];

  return (
    <DraggableResizableModal
      title={`${player.name} · Lv.${player.level} ${jobBranch ? jobBranch.name : classCfg.name}`}
      subtitle={`${classCfg.name} · ${classCfg.weaponType} · Slain: ${player.kills} · Bosses: ${player.bossKills}`}
      icon={<Hammer className="w-5 h-5 text-amber-400" />}
      initialWidth={720}
      initialHeight={580}
      headerRight={
        <div className="flex items-center gap-1.5 text-xs font-mono-num font-semibold text-amber-400 mr-2">
          <Coins className="w-4 h-4" />
          <span>{player.gold} Gold</span>
        </div>
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Attributes & Combat Totals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Attributes</h3>
              {player.statPoints > 0 && (
                <span className="text-xs font-mono-num font-semibold text-amber-400">
                  {player.statPoints} points available
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {statRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#1A2130] border border-white/5"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      {row.label}{' '}
                      <span className="font-mono-num text-amber-300 ml-1">
                        {row.value}
                        {row.bonus > 0 ? ` (+${row.bonus})` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{row.effect}</div>
                  </div>
                  <button
                    disabled={player.statPoints <= 0}
                    onClick={() => onAllocateStat(row.key)}
                    className={`p-2 rounded-md transition-colors shrink-0 ${
                      player.statPoints > 0
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-white/5 text-slate-600 cursor-not-allowed'
                    }`}
                    title={`Add ${row.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs font-mono-num">
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>Attack</span>
                <span className="text-slate-50 font-semibold">{player.attackPower}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>Defense</span>
                <span className="text-slate-50 font-semibold">{player.defense}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>Speed</span>
                <span className="text-slate-50 font-semibold">{player.speed}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>Crit</span>
                <span className="text-slate-50 font-semibold">{Math.round(player.critChance * 100)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>CDR</span>
                <span className="text-slate-50 font-semibold">{Math.round(player.cooldownReductionPct * 100)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131C] text-slate-300">
                <span>Heal Power</span>
                <span className="text-slate-50 font-semibold">{Math.round(player.healPowerMult * 100)}%</span>
              </div>
            </div>

            <button
              onClick={onOpenSkillTree}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1D2536] hover:bg-[#253046] border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              Open Passive Skill Tree ({player.skillPoints} Skill Pts)
            </button>
          </div>

          {/* Right: Quartermaster Forge */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Quartermaster Forge</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-[#1A2130] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Swords className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      Weapon Tier <span className="font-mono-num text-amber-300">+{player.weaponTier}</span>
                    </div>
                    <div className="text-xs text-slate-400">+7 Attack Power per tier</div>
                  </div>
                </div>
                <button
                  disabled={player.gold < weaponCost}
                  onClick={() => onUpgradeGear('weapon')}
                  className={`px-3 py-2 rounded-md text-xs font-mono-num font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    player.gold >= weaponCost
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Upgrade ({weaponCost}g)
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#1A2130] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      Armor Tier <span className="font-mono-num text-sky-300">+{player.armorTier}</span>
                    </div>
                    <div className="text-xs text-slate-400">+22 Max HP &amp; +3.2 Defense</div>
                  </div>
                </div>
                <button
                  disabled={player.gold < armorCost}
                  onClick={() => onUpgradeGear('armor')}
                  className={`px-3 py-2 rounded-md text-xs font-mono-num font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    player.gold >= armorCost
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Upgrade ({armorCost}g)
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#1A2130] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FlaskConical className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      Health Potion <span className="font-mono-num text-emerald-300">({player.potions} held)</span>
                    </div>
                    <div className="text-xs text-slate-400">Restores 48% HP &amp; 25% MP [F]</div>
                  </div>
                </div>
                <button
                  disabled={player.gold < potionCost}
                  onClick={() => onUpgradeGear('potion')}
                  className={`px-3 py-2 rounded-md text-xs font-mono-num font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    player.gold >= potionCost
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Buy ({potionCost}g)
                </button>
              </div>

              {(hasAtkBuff || hasDefBuff) && (
                <div className="flex flex-wrap gap-2 text-[11px] font-mono-num">
                  {hasAtkBuff && (
                    <span className="px-2.5 py-1 rounded bg-orange-950/70 border border-orange-400/50 text-orange-200">
                      +{Math.round(player.activeBuffs.attackPct * 100)}% ATK Buff ({Math.ceil((player.activeBuffs.attackUntil - now) / 1000)}s)
                    </span>
                  )}
                  {hasDefBuff && (
                    <span className="px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-400/50 text-emerald-200">
                      +{player.activeBuffs.defenseFlat} DEF Buff ({Math.ceil((player.activeBuffs.defenseUntil - now) / 1000)}s)
                    </span>
                  )}
                </div>
              )}

              <div className="p-3.5 rounded-lg bg-[#0E131C] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Equipped Gear
                  </div>
                  <button
                    type="button"
                    onClick={onOpenInventory}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    <Backpack className="w-3.5 h-3.5" />
                    Open Satchel [I]
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {(['weapon', 'armor', 'accessory', 'mountGear'] as const).map((slotKey) => {
                    const id = player.equipment[slotKey];
                    const item = id ? ITEMS_DATA[id] : null;
                    return (
                      <div key={slotKey} className="px-2 py-1 rounded bg-[#161D2B] truncate">
                        <span className="text-slate-500 capitalize mr-1">{slotKey === 'mountGear' ? 'Mount' : slotKey}:</span>
                        <span style={{ color: item ? RARITY_CONFIG[item.rarity].color : '#64748B' }}>
                          {item ? item.name : 'None'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
    </DraggableResizableModal>
  );
};
