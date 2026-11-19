export interface MerchantListingDef {
  itemId: string;
  maxStock: number; // -1 for unlimited stock
  restockIntervalMs: number;
}

export interface MerchantShopDef {
  merchantId: string;
  npcId: string;
  shopName: string;
  subtitle: string;
  listings: MerchantListingDef[];
}

export const MERCHANT_SHOPS_DATA: Record<string, MerchantShopDef> = {
  npc_elena: {
    merchantId: 'npc_elena',
    npcId: 'npc_elena',
    shopName: "Elena's Sanctuary Emporium",
    subtitle: 'Potions, Starter Arms, Satchel Upgrades & Ascension Seals',
    listings: [
      { itemId: 'con_vitality_potion', maxStock: -1, restockIntervalMs: 90000 },
      { itemId: 'con_aether_elixir', maxStock: -1, restockIntervalMs: 90000 },
      { itemId: 'con_warriors_draught', maxStock: 6, restockIntervalMs: 90000 },
      { itemId: 'con_ironbark_tonic', maxStock: 6, restockIntervalMs: 90000 },
      { itemId: 'wpn_iron_blade', maxStock: 4, restockIntervalMs: 90000 },
      { itemId: 'arm_traveler_coat', maxStock: 4, restockIntervalMs: 90000 },
      { itemId: 'wpn_sylvan_edge', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'acc_wind_ring', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'mnt_swift_stirrups', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'con_satchel_expansion', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'qst_sanctuary_seal', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'mat_boar_fang', maxStock: 5, restockIntervalMs: 90000 },
    ],
  },
  npc_maeve: {
    merchantId: 'npc_maeve',
    npcId: 'npc_maeve',
    shopName: 'Highland Expedition Depot',
    subtitle: 'Cryo-Steel Armaments, Frost Mount Gear & Rare Relics',
    listings: [
      { itemId: 'con_vitality_potion', maxStock: -1, restockIntervalMs: 90000 },
      { itemId: 'con_aether_elixir', maxStock: -1, restockIntervalMs: 90000 },
      { itemId: 'wpn_frost_glaive', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'wpn_arcane_spire', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'arm_frost_plate', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'acc_frost_pendant', maxStock: 1, restockIntervalMs: 90000 },
      { itemId: 'mnt_frost_barding', maxStock: 1, restockIntervalMs: 90000 },
      { itemId: 'con_satchel_expansion', maxStock: 2, restockIntervalMs: 90000 },
      { itemId: 'mat_glacier_crystal', maxStock: 4, restockIntervalMs: 90000 },
    ],
  },
};
