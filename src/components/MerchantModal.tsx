import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Coins, Store, X } from 'lucide-react';
import { ITEMS_DATA, RARITY_CONFIG } from '../data/itemsData';
import { MERCHANT_SHOPS_DATA } from '../data/merchantData';
import { NPCS_DATA } from '../data/questsData';
import type { MerchantStockState, PlayerState } from '../shared/gameTypes';
import { renderItemIcon } from './InventoryModal';
import { DraggableResizableModal } from './DraggableResizableModal';

interface MerchantModalProps {
  player: PlayerState;
  merchantStocks: Record<string, MerchantStockState>;
  onBuyItem: (merchantId: string, itemId: string, quantity: number) => void;
  onSellItem: (merchantId: string, slotIndex: number, quantity: number) => void;
  onClose: () => void;
}

const MERCHANT_IDS = Object.keys(MERCHANT_SHOPS_DATA);

export const MerchantModal: React.FC<MerchantModalProps> = ({
  player,
  merchantStocks,
  onBuyItem,
  onSellItem,
  onClose,
}) => {
  const nearestMerchantId = useMemo(() => {
    let bestId = MERCHANT_IDS[0];
    let bestDist = Infinity;
    for (const id of MERCHANT_IDS) {
      const npc = NPCS_DATA[id];
      if (!npc) continue;
      const d = Math.hypot(player.x - npc.x, player.y - npc.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    return bestId;
  }, [player.x, player.y]);

  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(nearestMerchantId);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const shop = MERCHANT_SHOPS_DATA[selectedMerchantId] || MERCHANT_SHOPS_DATA.npc_elena;
  const npc = NPCS_DATA[shop.npcId];
  const distUnits = npc ? Math.hypot(player.x - npc.x, player.y - npc.y) : 0;
  const inRange = distUnits <= 720;

  const stockState = merchantStocks[shop.merchantId];
  const nextRestockSec = useMemo(() => {
    if (!stockState) return 0;
    let soonest = Infinity;
    for (const s of stockState.items) {
      if (s.maxStock > 0 && s.nextRestockAt < soonest) soonest = s.nextRestockAt;
    }
    if (!Number.isFinite(soonest)) return 0;
    return Math.max(0, Math.ceil((soonest - nowMs) / 1000));
  }, [stockState, nowMs]);

  const sellableSlots = useMemo(
    () =>
      player.inventory
        .slice(0, player.inventorySlots)
        .map((slot, idx) => ({ slot, idx }))
        .filter((e): e is { slot: NonNullable<typeof e.slot>; idx: number } => Boolean(e.slot)),
    [player.inventory, player.inventorySlots]
  );

  return (
    <DraggableResizableModal
      title={shop.shopName}
      subtitle={shop.subtitle}
      icon={<Store className="w-5 h-5 text-amber-400" />}
      initialWidth={920}
      initialHeight={620}
      headerRight={
        <div className="flex items-center gap-2.5 mr-2">
          {nextRestockSec > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1A2130] border border-white/10 text-xs font-mono-num text-sky-300">
              <Clock className="w-3.5 h-3.5" />
              Restock in {nextRestockSec}s
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-mono-num font-semibold text-amber-400">
            <Coins className="w-4 h-4" />
            {player.gold}g
          </span>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-4">

        {/* Merchant Switcher + Range Check */}
        <div className="px-5 py-2.5 bg-[#0E131C] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {MERCHANT_IDS.map((mId) => {
              const mNpc = NPCS_DATA[mId];
              const mShop = MERCHANT_SHOPS_DATA[mId];
              const active = mId === selectedMerchantId;
              return (
                <button
                  key={mId}
                  type="button"
                  onClick={() => setSelectedMerchantId(mId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-[#182030] text-slate-300 hover:bg-[#202B40]'
                  }`}
                >
                  {mNpc?.name || mShop.shopName}
                </button>
              );
            })}
          </div>

          <span
            className={`text-xs font-mono-num ${
              inRange ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {inRange
              ? `Trading Ready (${Math.round(distUnits * 0.1)}m away)`
              : `Move closer to ${npc?.name} (${Math.round(distUnits * 0.1)}m away — max 72m)`}
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto mmo-scroll">
          {/* Left: Buy Stock */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Merchant Stock (Buy)
            </div>

            {shop.listings.map((listing) => {
              const def = ITEMS_DATA[listing.itemId];
              if (!def) return null;
              const stockEntry = stockState?.items.find((s) => s.itemId === listing.itemId);
              const curStock = stockEntry ? stockEntry.stock : listing.maxStock;
              const isUnlimited = curStock === -1;
              const soldOut = !isUnlimited && curStock <= 0;
              const rStyle = RARITY_CONFIG[def.rarity];
              const canBuy1 = inRange && !soldOut && player.gold >= def.buyPrice;
              const canBuy5 = inRange && def.stackable && (isUnlimited || curStock >= 5) && player.gold >= def.buyPrice * 5;

              return (
                <div
                  key={def.id}
                  className={`p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${rStyle.bgClass} ${rStyle.borderClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg bg-[#0B0E14] border border-white/10 flex items-center justify-center shrink-0"
                      style={{ color: rStyle.color }}
                    >
                      {renderItemIcon(def, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold truncate" style={{ color: rStyle.color }}>
                          {def.name}
                        </span>
                        <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-black/50 text-slate-300">
                          {isUnlimited ? 'Stock: ∞' : `Stock: ${curStock}/${listing.maxStock}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate">{def.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <button
                      type="button"
                      disabled={!canBuy1}
                      onClick={() => onBuyItem(shop.merchantId, def.id, 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono-num font-semibold whitespace-nowrap transition-colors ${
                        canBuy1
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {soldOut ? 'Sold Out' : `Buy (${def.buyPrice}g)`}
                    </button>
                    {def.stackable && (
                      <button
                        type="button"
                        disabled={!canBuy5}
                        onClick={() => onBuyItem(shop.merchantId, def.id, 5)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-num font-semibold whitespace-nowrap transition-colors ${
                          canBuy5
                            ? 'bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 cursor-pointer'
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        x5
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Sell from Inventory */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sell from Your Satchel ({sellableSlots.length} items)
            </div>

            <div className="bg-[#0E131C] border border-white/10 rounded-xl p-3 space-y-2 max-h-[52vh] overflow-y-auto mmo-scroll">
              {sellableSlots.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">Your satchel is empty.</div>
              ) : (
                sellableSlots.map(({ slot, idx }) => {
                  const def = ITEMS_DATA[slot.itemId];
                  if (!def) return null;
                  const rStyle = RARITY_CONFIG[def.rarity];
                  const canSell = inRange && def.sellPrice > 0;

                  return (
                    <div
                      key={`${idx}_${slot.itemId}`}
                      className="p-2.5 rounded-lg bg-[#161D2B] border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate" style={{ color: rStyle.color }}>
                          {def.name} {slot.quantity > 1 ? `x${slot.quantity}` : ''}
                        </div>
                        <div className="text-[11px] font-mono-num text-amber-300">
                          {def.sellPrice}g each
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={!canSell}
                          onClick={() => onSellItem(shop.merchantId, idx, 1)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold whitespace-nowrap ${
                            canSell
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 cursor-pointer'
                              : 'bg-white/5 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Sell 1
                        </button>
                        {slot.quantity > 1 && (
                          <button
                            type="button"
                            disabled={!canSell}
                            onClick={() => onSellItem(shop.merchantId, idx, slot.quantity)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono-num font-semibold whitespace-nowrap ${
                              canSell
                                ? 'bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 cursor-pointer'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            All ({def.sellPrice * slot.quantity}g)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
