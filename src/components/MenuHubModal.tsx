import React from 'react';
import {
  Award,
  Backpack,
  Compass,
  Crosshair,
  GitBranch,
  Hammer,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  ScrollText,
  Server,
  Settings,
  Store,
  Users,
  Wind,
} from 'lucide-react';
import { formatKeyCode } from '../client/settingsStorage';
import type { GameSettings } from '../client/settingsStorage';
import { DraggableResizableModal } from './DraggableResizableModal';

export type HubModalTarget =
  | 'inventory'
  | 'quests'
  | 'job'
  | 'mounts'
  | 'pets'
  | 'char'
  | 'skills'
  | 'merchant'
  | 'settings'
  | 'map';

interface MenuHubModalProps {
  settings: GameSettings;
  isPointerLocked: boolean;
  onOpenModal: (target: HubModalTarget) => void;
  onRecallSanctuary: () => void;
  onToggleCursorLock: () => void;
  onBackToCharacters: () => void;
  onChangeServer: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const MenuHubModal: React.FC<MenuHubModalProps> = ({
  settings,
  isPointerLocked,
  onOpenModal,
  onRecallSanctuary,
  onToggleCursorLock,
  onBackToCharacters,
  onChangeServer,
  onLogout,
  onClose,
}) => {
  const tiles: Array<{
    id: string;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
    accent: string;
    shortcut?: string;
    onClick: () => void;
  }> = [
    {
      id: 'inventory',
      label: 'Satchel & Gear',
      subtitle: 'Equip gear, auto-equip best, consumables',
      icon: <Backpack className="w-5 h-5 text-amber-300" />,
      accent: 'border-amber-400/30 hover:border-amber-400/70',
      shortcut: 'I',
      onClick: () => onOpenModal('inventory'),
    },
    {
      id: 'quests',
      label: 'Quests & Daily Missions',
      subtitle: 'Main progression, side & daily quests',
      icon: <ScrollText className="w-5 h-5 text-emerald-300" />,
      accent: 'border-emerald-400/30 hover:border-emerald-400/70',
      shortcut: 'J',
      onClick: () => onOpenModal('quests'),
    },
    {
      id: 'map',
      label: 'World Territory Map',
      subtitle: 'Full 5-region map, bosses & locations',
      icon: <Compass className="w-5 h-5 text-amber-300" />,
      accent: 'border-amber-400/30 hover:border-amber-400/70',
      shortcut: 'M',
      onClick: () => onOpenModal('map'),
    },
    {
      id: 'job',
      label: 'Job Advancement',
      subtitle: '8 specialized job tiers & [6]/[7] skills',
      icon: <Award className="w-5 h-5 text-sky-300" />,
      accent: 'border-sky-400/30 hover:border-sky-400/70',
      shortcut: 'P',
      onClick: () => onOpenModal('job'),
    },
    {
      id: 'mounts',
      label: 'Mounts & Sky Flight',
      subtitle: '8 mounts · 5 flying winged companions',
      icon: <Wind className="w-5 h-5 text-cyan-300" />,
      accent: 'border-cyan-400/30 hover:border-cyan-400/70',
      shortcut: 'B',
      onClick: () => onOpenModal('mounts'),
    },
    {
      id: 'pets',
      label: 'Companion Pets',
      subtitle: '8 pets · auto-loot drops & XP boost',
      icon: <Heart className="w-5 h-5 text-pink-300" />,
      accent: 'border-pink-400/30 hover:border-pink-400/70',
      shortcut: 'N',
      onClick: () => onOpenModal('pets'),
    },
    {
      id: 'char',
      label: 'Hero Stats & Forge',
      subtitle: 'Allocate stats & upgrade weapon/armor',
      icon: <Hammer className="w-5 h-5 text-orange-300" />,
      accent: 'border-orange-400/30 hover:border-orange-400/70',
      shortcut: 'U',
      onClick: () => onOpenModal('char'),
    },
    {
      id: 'skills',
      label: '15-Tier Mastery Tree',
      subtitle: '15 tiers of specialized passives',
      icon: <GitBranch className="w-5 h-5 text-emerald-400" />,
      accent: 'border-emerald-400/30 hover:border-emerald-400/70',
      shortcut: 'K',
      onClick: () => onOpenModal('skills'),
    },
    {
      id: 'merchant',
      label: 'Merchant Shop',
      subtitle: 'Buy potions, gear & sell loot',
      icon: <Store className="w-5 h-5 text-yellow-300" />,
      accent: 'border-yellow-400/30 hover:border-yellow-400/70',
      onClick: () => onOpenModal('merchant'),
    },
    {
      id: 'recall',
      label: 'Recall to Sanctuary',
      subtitle: 'Teleport home to the Healing Fountain',
      icon: <Home className="w-5 h-5 text-sky-200" />,
      accent: 'border-sky-400/30 hover:border-sky-400/70',
      shortcut: formatKeyCode(settings.keybinds.recall),
      onClick: () => {
        onClose();
        onRecallSanctuary();
      },
    },
    {
      id: 'cursor',
      label: isPointerLocked ? 'Unlock Cursor' : 'Lock Cursor Aim',
      subtitle: 'Genshin-style free camera mouse look',
      icon: <Crosshair className="w-5 h-5 text-amber-200" />,
      accent: 'border-amber-400/30 hover:border-amber-400/70',
      shortcut: formatKeyCode(settings.keybinds.cursorLock),
      onClick: () => {
        onClose();
        onToggleCursorLock();
      },
    },
    {
      id: 'settings',
      label: 'Settings & Keybinds',
      subtitle: 'Sensitivity, audio, keybinds, graphics',
      icon: <Settings className="w-5 h-5 text-slate-200" />,
      accent: 'border-white/15 hover:border-white/40',
      shortcut: 'Esc',
      onClick: () => onOpenModal('settings'),
    },
  ];

  return (
    <DraggableResizableModal
      title="Adventurer Menu Hub"
      subtitle={`Quick pop-up · Press [${formatKeyCode(settings.keybinds.menu)}]`}
      icon={<LayoutGrid className="w-5 h-5 text-amber-400" />}
      initialWidth={780}
      initialHeight={560}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {tiles.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={t.onClick}
              className={`text-left p-3.5 rounded-xl bg-[#182030] hover:bg-[#1F293D] border transition-all flex items-start justify-between gap-2.5 cursor-pointer ${t.accent}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#0E131C] border border-white/10 flex items-center justify-center shrink-0">
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-slate-100 truncate">{t.label}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug truncate">{t.subtitle}</div>
                </div>
              </div>
              {t.shortcut && (
                <span className="px-1.5 py-0.5 rounded bg-[#0E131C] border border-white/10 text-[10px] font-mono-num font-bold text-amber-300 shrink-0">
                  {t.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Realm &amp; Account Session</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackToCharacters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2130] hover:bg-[#242E42] border border-white/15 text-xs font-semibold text-slate-100 whitespace-nowrap cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              Character Select
            </button>
            <button
              type="button"
              onClick={onChangeServer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2130] hover:bg-[#242E42] border border-sky-400/30 text-xs font-semibold text-sky-200 whitespace-nowrap cursor-pointer"
            >
              <Server className="w-3.5 h-3.5 text-sky-300" />
              Change Server
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-400/40 text-xs font-semibold text-red-200 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
