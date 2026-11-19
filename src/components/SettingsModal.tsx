import React, { useEffect, useState } from 'react';
import { Keyboard, LogOut, Monitor, RotateCcw, Server, Sliders, Users, Volume2 } from 'lucide-react';
import {
  ACTION_LABELS,
  DEFAULT_KEYBINDS,
  DEFAULT_PANEL_PREFS,
  DEFAULT_SETTINGS,
  formatKeyCode,
} from '../client/settingsStorage';
import type {
  BindableAction,
  FpsCapOption,
  GameSettings,
  GraphicsQuality,
  UiScaleOption,
} from '../client/settingsStorage';
import { DraggableResizableModal } from './DraggableResizableModal';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onTestVoice: () => void;
  onBackToCharacters: () => void;
  onChangeServer: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

const FPS_OPTIONS: { id: FpsCapOption; label: string }[] = [
  { id: 60, label: '60 FPS' },
  { id: 144, label: '144 FPS' },
  { id: 0, label: 'Uncapped' },
];

const UI_SCALE_OPTIONS: { id: UiScaleOption; label: string }[] = [
  { id: 0.85, label: '85% Compact' },
  { id: 1, label: '100% Standard' },
  { id: 1.15, label: '115% Large' },
];

const BINDABLE_ACTIONS = Object.keys(ACTION_LABELS) as BindableAction[];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onTestVoice,
  onBackToCharacters,
  onChangeServer,
  onLogout,
  onClose,
}) => {
  const [tab, setTab] = useState<'general' | 'keybinds' | 'session'>('general');
  const [listeningAction, setListeningAction] = useState<BindableAction | null>(null);

  const update = (patch: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  useEffect(() => {
    if (!listeningAction) return;
    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }
      onUpdateSettings({
        ...settings,
        keybinds: {
          ...settings.keybinds,
          [listeningAction]: e.code,
        },
      });
      setListeningAction(null);
    };
    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [listeningAction, settings, onUpdateSettings]);

  return (
    <DraggableResizableModal
      title="Game Settings & Controls"
      subtitle="Graphics, audio, camera, keybinds & account"
      icon={<Sliders className="w-4 h-4 text-amber-400" />}
      initialWidth={620}
      initialHeight={600}
      onClose={onClose}
    >
      <div className="space-y-4">

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-[#0E131C] border-b border-white/10 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'general' ? 'bg-amber-500 text-slate-950' : 'bg-[#171F2E] text-slate-300 hover:bg-[#222D42]'
            }`}
          >
            Graphics, UI &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setTab('keybinds')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'keybinds' ? 'bg-amber-500 text-slate-950' : 'bg-[#171F2E] text-slate-300 hover:bg-[#222D42]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Keybinds
          </button>
          <button
            type="button"
            onClick={() => setTab('session')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tab === 'session' ? 'bg-amber-500 text-slate-950' : 'bg-[#171F2E] text-slate-300 hover:bg-[#222D42]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Server &amp; Account
          </button>
        </div>

        <div className="p-5 overflow-y-auto mmo-scroll space-y-5">
          {tab === 'general' && (
            <>
              {/* Camera Sensitivity */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <label htmlFor="cam-sens" className="font-medium text-slate-200">
                    Camera Sensitivity
                  </label>
                  <span className="font-mono-num text-xs font-semibold text-amber-300">
                    {settings.cameraSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  id="cam-sens"
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={settings.cameraSensitivity}
                  onChange={(e) => update({ cameraSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono-num text-slate-500 mt-1">
                  <span>0.1x (Slow)</span>
                  <span>1.0x (Default)</span>
                  <span>2.0x (Fast)</span>
                </div>
              </div>

              {/* HUD UI Scale & Panels */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                    HUD Scale &amp; Resizable Panels
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ panelPrefs: { ...DEFAULT_PANEL_PREFS } })}
                    className="text-[11px] text-sky-300 hover:text-sky-200 cursor-pointer"
                  >
                    Reset Panel Sizes
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {UI_SCALE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => update({ uiScale: opt.id })}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        settings.uiScale === opt.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-[#1B2230] border-white/10 text-slate-300 hover:bg-[#242D40]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphics & Performance */}
              <div className="pt-3 border-t border-white/10 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
                  <Monitor className="w-3.5 h-3.5" />
                  Anime Graphics &amp; Performance
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-300 mb-1.5">Graphics Quality</div>
                  <div className="grid grid-cols-3 gap-2">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update({ graphicsQuality: opt.id })}
                        className={`py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                          settings.graphicsQuality === opt.id
                            ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                            : 'bg-[#1B2230] border-white/10 text-slate-300 hover:bg-[#242D40]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-300 mb-1.5">Frame Rate Cap</div>
                  <div className="grid grid-cols-3 gap-2">
                    {FPS_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update({ fpsCap: opt.id })}
                        className={`py-1.5 rounded-lg border text-xs font-semibold font-mono-num transition-colors cursor-pointer ${
                          settings.fpsCap === opt.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-[#1B2230] border-white/10 text-slate-300 hover:bg-[#242D40]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Cel-Shaded Outlines</div>
                    <div className="text-xs text-slate-400">Inverted-hull ink outlines on heroes, mounts &amp; foes</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.outlinesEnabled}
                    onChange={(e) => update({ outlinesEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Subtle Bloom</div>
                    <div className="text-xs text-slate-400">Soft glow on weapon trails, magma &amp; skill flashes</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bloomEnabled}
                    onChange={(e) => update({ bloomEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                {settings.bloomEnabled && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <label htmlFor="bloom-int" className="font-medium text-slate-200">
                        Bloom Intensity
                      </label>
                      <span className="font-mono-num text-xs font-semibold text-amber-300">
                        {Math.round(settings.bloomIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      id="bloom-int"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.bloomIntensity}
                      onChange={(e) => update({ bloomIntensity: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                )}

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Over-the-Shoulder Camera View</div>
                    <div className="text-xs text-slate-400">Offset camera slightly to the right for immersive action perspective</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.shoulderView}
                    onChange={(e) => update({ shoulderView: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Audio & Voice */}
              <div className="pt-3 border-t border-white/10 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <label htmlFor="master-vol" className="font-medium text-slate-200">
                      Master Volume
                    </label>
                    <span className="font-mono-num text-xs font-semibold text-sky-300">
                      {Math.round(settings.masterVolume * 100)}%
                    </span>
                  </div>
                  <input
                    id="master-vol"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.masterVolume}
                    onChange={(e) => update({ masterVolume: parseFloat(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <label htmlFor="voice-vol" className="font-medium text-slate-200">
                      Voice Volume
                    </label>
                    <span className="font-mono-num text-xs font-semibold text-emerald-300">
                      {Math.round(settings.voiceVolume * 100)}%
                    </span>
                  </div>
                  <input
                    id="voice-vol"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.voiceVolume}
                    onChange={(e) => update({ voiceVolume: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Voice Lines</div>
                    <div className="text-xs text-slate-400">Character callouts, mounts, and NPC speech</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voiceEnabled}
                    onChange={(e) => update({ voiceEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-200">Voice Subtitles</div>
                    <div className="text-xs text-slate-400">Display text subtitles for every voice line</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.subtitlesEnabled}
                    onChange={(e) => update({ subtitlesEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onTestVoice}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  Test Voice Line
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...DEFAULT_SETTINGS,
                      keybinds: { ...DEFAULT_KEYBINDS },
                      panelPrefs: { ...DEFAULT_PANEL_PREFS },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Defaults
                </button>
              </div>
            </>
          )}

          {tab === 'keybinds' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Click any binding button below and press your desired key (Esc cancels).
                </p>
                <button
                  type="button"
                  onClick={() => update({ keybinds: { ...DEFAULT_KEYBINDS } })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-[11px] font-medium text-slate-300 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Keys
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BINDABLE_ACTIONS.map((action) => {
                  const isListening = listeningAction === action;
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0E131C] border border-white/10"
                    >
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {ACTION_LABELS[action]}
                      </span>
                      <button
                        type="button"
                        onClick={() => setListeningAction(isListening ? null : action)}
                        className={`min-w-[68px] px-2.5 py-1 rounded text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                          isListening
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-[#1A2130] hover:bg-[#243047] border border-white/15 text-amber-300'
                        }`}
                      >
                        {isListening ? 'Press Key...' : formatKeyCode(settings.keybinds[action])}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'session' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Every character and class you create stays permanently saved to your account. You can safely switch heroes, jump to a friend&apos;s server/realm, or log out anytime.
              </p>

              <button
                type="button"
                onClick={onBackToCharacters}
                className="w-full p-3.5 rounded-xl bg-[#182030] hover:bg-[#212C42] border border-white/10 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-amber-300" />
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Back to Character Selection</div>
                    <div className="text-xs text-slate-400">Switch between your saved classes or create a new hero</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onChangeServer}
                className="w-full p-3.5 rounded-xl bg-[#182030] hover:bg-[#212C42] border border-sky-400/25 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-sky-300" />
                  <div>
                    <div className="text-sm font-semibold text-sky-100">Change Server / Realm</div>
                    <div className="text-xs text-slate-400">Join a public region or enter a friend&apos;s Party Code</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full p-3.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-400/35 flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-red-300" />
                  <div>
                    <div className="text-sm font-semibold text-red-200">Log Out Account</div>
                    <div className="text-xs text-red-300/75">Sign out and return to the Title &amp; Login screen</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </DraggableResizableModal>
  );
};
