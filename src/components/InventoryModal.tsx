import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Backpack,
  Coins,
  FlaskConical,
  Gem,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Wand2,
  Wind,
} from 'lucide-react';
import { ITEMS_DATA, MAX_INVENTORY_SLOTS, RARITY_CONFIG } from '../data/itemsData';
import type { ItemDef, ItemStats } from '../data/itemsData';
import type { EquippedGear, PlayerState } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface InventoryModalProps {
  player: PlayerState;
  onMoveSlot: (fromIndex: number, toIndex: number) => void;
  onUseSlot: (slotIndex: number) => void;
  onEquipSlot: (slotIndex: number) => void;
  onAutoEquip: () => void;
  onUnequipSlot: (equipSlot: keyof EquippedGear) => void;
  onSortBag: () => void;
  onDropSlot: (slotIndex: number) => void;
  onClose: () => void;
}

export function renderItemIcon(item: ItemDef, className = 'w-5 h-5') {
  switch (item.iconKey) {
    case 'sword':
    case 'dagger':
      return <Swords className={className} />;
    case 'staff':
      return <Sparkles className={className} />;
    case 'bow':
      return <Wind className={className} />;
    case 'armor':
      return <Shield className={className} />;
    case 'ring':
      return <Gem className={className} />;
    case 'saddle':
      return <Wind className={className} />;
    case 'potion_hp':
    case 'potion_mp':
    case 'elixir':
      return <FlaskConical className={className} />;
    case 'satchel':
      return <Backpack className={className} />;
    case 'scroll':
    case 'seal':
      return <ScrollText className={className} />;
    default:
      return <Gem className={className} />;
  }
}

function isEquippableCategory(cat: ItemDef['category']): boolean {
  return cat === 'weapon' || cat === 'armor' || cat === 'accessory' || cat === 'mount_gear';
}

function categoryToEquipSlot(cat: ItemDef['category']): keyof EquippedGear | null {
  if (cat === 'weapon') return 'weapon';
  if (cat === 'armor') return 'armor';
  if (cat === 'accessory') return 'accessory';
  if (cat === 'mount_gear') return 'mountGear';
  return null;
}

type BagFilter = 'all' | 'gear' | 'consumable' | 'material';

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onMoveSlot,
  onUseSlot,
  onEquipSlot,
  onAutoEquip,
  onUnequipSlot,
  onSortBag,
  onDropSlot,
  onClose,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [moveMode, setMoveMode] = useState(false);
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [bagFilter, setBagFilter] = useState<BagFilter>('all');

  const usedSlots = useMemo(
    () => player.inventory.slice(0, player.inventorySlots).filter((s) => Boolean(s)).length,
    [player.inventory, player.inventorySlots]
  );
  const isFull = usedSlots >= player.inventorySlots;

  const selectedSlot = selectedIdx !== null ? player.inventory[selectedIdx] : null;
  const selectedItem = selectedSlot ? ITEMS_DATA[selectedSlot.itemId] : null;

  const equippedCompareItem = useMemo(() => {
    if (!selectedItem) return null;
    const eqKey = categoryToEquipSlot(selectedItem.category);
    if (!eqKey) return null;
    const curId = player.equipment[eqKey];
    return curId ? ITEMS_DATA[curId] || null : null;
  }, [selectedItem, player.equipment]);

  const equipSlotRows: Array<{ key: keyof EquippedGear; label: string }> = [
    { key: 'weapon', label: 'Weapon' },
    { key: 'armor', label: 'Armor' },
    { key: 'accessory', label: 'Accessory' },
    { key: 'mountGear', label: 'Mount Gear' },
  ];

  const matchesFilter = (def: ItemDef | null): boolean => {
    if (bagFilter === 'all') return true;
    if (!def) return false;
    if (bagFilter === 'gear') return isEquippableCategory(def.category);
    if (bagFilter === 'consumable') return def.category === 'consumable';
    return def.category === 'material' || def.category === 'quest';
  };

  const handleSlotClick = (idx: number) => {
    const clickedSlot = player.inventory[idx];

    if (selectedIdx !== null && selectedIdx !== idx) {
      const originSlot = player.inventory[selectedIdx];
      if (originSlot) {
        const sameStack =
          clickedSlot &&
          clickedSlot.itemId === originSlot.itemId &&
          ITEMS_DATA[originSlot.itemId]?.stackable;
        if (moveMode || !clickedSlot || sameStack) {
          onMoveSlot(selectedIdx, idx);
          setSelectedIdx(idx);
          setMoveMode(false);
          return;
        }
      }
    }

    setMoveMode(false);
    setSelectedIdx(clickedSlot ? idx : null);
  };

  const handleSlotContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    const slot = player.inventory[idx];
    if (!slot) return;
    const def = ITEMS_DATA[slot.itemId];
    if (!def) return;
    if (isEquippableCategory(def.category)) {
      onEquipSlot(idx);
    } else if (def.category === 'consumable') {
      onUseSlot(idx);
    }
  };

  const renderStatDelta = (label: string, key: keyof Omit<ItemStats, 'element'>, isPct = false) => {
    const val = Number(selectedItem?.stats?.[key] || 0);
    const cur = Number(equippedCompareItem?.stats?.[key] || 0);
    if (val === 0 && cur === 0) return null;
    const diff = val - cur;
    return (
      <div
        key={String(key)}
        className="px-2 py-1 rounded bg-[#141A26] border border-white/5 flex items-center justify-between gap-2 text-[11px] font-mono-num"
      >
        <span className="text-slate-300">
          {label}: <strong className="text-slate-100">+{isPct && key === 'mountSpeedBonus' ? Math.round(val * 100) : val}{isPct ? '%' : ''}</strong>
        </span>
        {equippedCompareItem && diff !== 0 && (
          <span className={diff > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
            ({diff > 0 ? '+' : ''}
            {isPct && key === 'mountSpeedBonus' ? Math.round(diff * 100) : diff}
            {isPct ? '%' : ''})
          </span>
        )}
      </div>
    );
  };

  return (
    <DraggableResizableModal
      title="Adventurer Armory & Satchel"
      subtitle="Drag slots to arrange · Right-click to equip/use · Movable & Resizable"
      icon={<Backpack className="w-5 h-5 text-amber-400" />}
      initialWidth={980}
      initialHeight={620}
      onClose={onClose}
      headerRight={
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono-num font-semibold border ${
              isFull ? 'bg-red-950/85 border-red-500/60 text-red-200' : 'bg-[#1A2130] border-white/10 text-slate-200'
            }`}
          >
            {usedSlots} / {player.inventorySlots} Slots
          </span>
          <span className="flex items-center gap-1 text-xs font-mono-num font-semibold text-amber-400">
            <Coins className="w-3.5 h-3.5" />
            {player.gold}g
          </span>
          <button
            type="button"
            onClick={onAutoEquip}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            <Wand2 className="w-3 h-3" />
            Auto-Equip
          </button>
          <button
            type="button"
            onClick={onSortBag}
            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-200 text-xs font-semibold cursor-pointer"
          >
            Sort
          </button>
        </div>
      }
    >
      {isFull && (
        <div className="px-4 py-2 bg-red-950/90 border border-red-500/40 rounded-lg text-xs text-red-200 font-medium">
          Inventory Full ({player.inventorySlots}/{player.inventorySlots} slots). New pickups remain on the ground until you free space or use a Satchel Expansion (max {MAX_INVENTORY_SLOTS}).
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Hero Combat Totals + Paperdoll + Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Total Stats Bar */}
          <div className="bg-[#0E131C] border border-white/10 rounded-xl p-3 grid grid-cols-3 gap-2 text-center font-mono-num">
            <div className="p-1.5 rounded bg-[#161D2B]">
              <div className="text-[10px] text-slate-400">ATK</div>
              <div className="text-xs font-bold text-amber-300">{player.attackPower}</div>
            </div>
            <div className="p-1.5 rounded bg-[#161D2B]">
              <div className="text-[10px] text-slate-400">DEF</div>
              <div className="text-xs font-bold text-sky-300">{player.defense}</div>
            </div>
            <div className="p-1.5 rounded bg-[#161D2B]">
              <div className="text-[10px] text-slate-400">CRIT</div>
              <div className="text-xs font-bold text-rose-300">{Math.round(player.critChance * 100)}%</div>
            </div>
          </div>

          {/* Armory Paperdoll */}
          <div className="bg-[#0E131C] border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Equipped Armory (3D Model)
              </span>
              <span className="text-[10px] text-emerald-300 font-mono-num">Live Synced</span>
            </div>

            {equipSlotRows.map((row) => {
              const itemId = player.equipment[row.key];
              const def = itemId ? ITEMS_DATA[itemId] : null;
              const rStyle = def ? RARITY_CONFIG[def.rarity] : null;

              return (
                <div
                  key={row.key}
                  className={`flex items-center justify-between gap-2.5 p-2.5 rounded-lg border ${
                    def && rStyle
                      ? `${rStyle.bgClass} ${rStyle.borderClass}`
                      : 'bg-[#171E2B] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg bg-[#0B0E14] border border-white/10 flex items-center justify-center shrink-0"
                      style={{ color: rStyle ? rStyle.color : '#64748B' }}
                    >
                      {def ? renderItemIcon(def, 'w-4 h-4') : <Shield className="w-4 h-4 opacity-40" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{row.label}</div>
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: rStyle ? rStyle.color : '#94A3B8' }}
                      >
                        {def ? def.name : 'Empty Slot'}
                      </div>
                      {def?.stats && (
                        <div className="text-[10px] font-mono-num text-slate-400 truncate">
                          {[
                            def.stats.attack ? `+${def.stats.attack} ATK` : '',
                            def.stats.defense ? `+${def.stats.defense} DEF` : '',
                            def.stats.maxHp ? `+${def.stats.maxHp} HP` : '',
                            def.stats.critChancePct ? `+${def.stats.critChancePct}% Crit` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                  {def && (
                    <button
                      type="button"
                      onClick={() => onUnequipSlot(row.key)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium text-slate-200 whitespace-nowrap cursor-pointer"
                    >
                      Unequip
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Item Inspector with Stat Comparison */}
          <div className="bg-[#0E131C] border border-white/10 rounded-xl p-3.5 min-h-[190px] flex flex-col justify-between">
            {selectedItem && selectedIdx !== null && selectedSlot ? (
              <>
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div
                        className="text-sm font-bold"
                        style={{ color: RARITY_CONFIG[selectedItem.rarity].color }}
                      >
                        {selectedItem.name}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize">
                        {RARITY_CONFIG[selectedItem.rarity].label} · {selectedItem.category.replace('_', ' ')}
                        {selectedSlot.quantity > 1 ? ` · Stack x${selectedSlot.quantity}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-mono-num text-amber-300 shrink-0">
                      Sell: {selectedItem.sellPrice}g
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{selectedItem.description}</p>

                  {selectedItem.stats && (
                    <div className="space-y-1.5 pt-1">
                      {equippedCompareItem && (
                        <div className="text-[10px] text-slate-400">
                          Comparing vs equipped <strong className="text-slate-200">{equippedCompareItem.name}</strong>:
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1.5">
                        {renderStatDelta('ATK', 'attack')}
                        {renderStatDelta('DEF', 'defense')}
                        {renderStatDelta('HP', 'maxHp')}
                        {renderStatDelta('MP', 'maxMp')}
                        {renderStatDelta('Crit', 'critChancePct', true)}
                        {renderStatDelta('Spd', 'speedBonus')}
                        {renderStatDelta('M.Spd', 'mountSpeedBonus', true)}
                        {renderStatDelta('M.Stam', 'mountStaminaBonus')}
                      </div>
                      {selectedItem.stats.element && (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/15 text-[10px] font-mono-num text-amber-300 uppercase">
                          Element: {selectedItem.stats.element}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-white/10">
                  {isEquippableCategory(selectedItem.category) && (
                    <button
                      type="button"
                      onClick={() => onEquipSlot(selectedIdx)}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Equip
                    </button>
                  )}
                  {selectedItem.category === 'consumable' && (
                    <button
                      type="button"
                      onClick={() => onUseSlot(selectedIdx)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMoveMode((m) => !m)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      moveMode
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    {moveMode ? 'Tap Target...' : 'Move / Swap'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDropSlot(selectedIdx);
                      setSelectedIdx(null);
                      setMoveMode(false);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-medium whitespace-nowrap cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Discard
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500 text-center px-4">
                Select an item slot to inspect stats, compare upgrades against equipped gear, or drag/swap slots.
              </div>
            )}
          </div>
        </div>

        {/* Right: Filter Tabs + 30..48 Slot Inventory Grid */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'All Items' },
              { id: 'gear', label: 'Weapons & Gear' },
              { id: 'consumable', label: 'Potions & Elixirs' },
              { id: 'material', label: 'Materials & Seals' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBagFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  bagFilter === tab.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#171E2B] text-slate-300 hover:bg-[#222C3F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {Array.from({ length: player.inventorySlots }, (_, idx) => {
              const slot = player.inventory[idx];
              const def = slot ? ITEMS_DATA[slot.itemId] : null;
              const rStyle = def ? RARITY_CONFIG[def.rarity] : null;
              const isSelected = selectedIdx === idx;
              const dimmed = bagFilter !== 'all' && !matchesFilter(def);

              return (
                <button
                  key={idx}
                  type="button"
                  draggable={Boolean(slot)}
                  onDragStart={() => setDragFromIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFromIdx !== null && dragFromIdx !== idx) {
                      onMoveSlot(dragFromIdx, idx);
                      setSelectedIdx(idx);
                    }
                    setDragFromIdx(null);
                  }}
                  onClick={() => handleSlotClick(idx)}
                  onContextMenu={(e) => handleSlotContextMenu(e, idx)}
                  title={def ? `${def.name}${slot && slot.quantity > 1 ? ` (x${slot.quantity})` : ''}` : `Empty Slot ${idx + 1}`}
                  className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${
                    dimmed ? 'opacity-25' : ''
                  } ${
                    def && rStyle
                      ? `${rStyle.bgClass} ${isSelected ? 'ring-2 ring-amber-400 border-amber-300' : rStyle.borderClass}`
                      : isSelected
                        ? 'bg-[#1D2536] border-amber-400'
                        : moveMode && selectedIdx !== null
                          ? 'bg-[#162030] border-amber-500/40 hover:border-amber-300'
                          : 'bg-[#0E131C] border-white/8 hover:border-white/25'
                  }`}
                >
                  {def && slot ? (
                    <>
                      <span style={{ color: rStyle?.color }}>
                        {renderItemIcon(def, 'w-5 h-5')}
                      </span>
                      <span className="mt-1 text-[9px] leading-tight text-slate-200 truncate w-full text-center px-0.5">
                        {def.name.split(' ')[0]}
                      </span>
                      {slot.quantity > 1 && (
                        <span className="absolute top-1 right-1 px-1 rounded bg-black/80 text-[10px] font-mono-num font-bold text-amber-300">
                          {slot.quantity}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-mono-num text-slate-700">{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
