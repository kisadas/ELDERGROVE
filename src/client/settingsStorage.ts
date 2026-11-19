export type GraphicsQuality = 'low' | 'medium' | 'high';
export type FpsCapOption = 0 | 60 | 144;
export type UiScaleOption = 0.85 | 1 | 1.15;

export type BindableAction =
  | 'skill0'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'ultimate'
  | 'jobSkill6'
  | 'jobSkill7'
  | 'mount'
  | 'mountSpecial'
  | 'potion'
  | 'recall'
  | 'cursorLock'
  | 'menu'
  | 'interact';

export type KeybindMap = Record<BindableAction, string>;

export const DEFAULT_KEYBINDS: KeybindMap = {
  skill0: 'Digit1',
  skill1: 'Digit2',
  skill2: 'Digit3',
  skill3: 'Digit4',
  skill4: 'Digit5',
  ultimate: 'KeyR',
  jobSkill6: 'Digit6',
  jobSkill7: 'Digit7',
  mount: 'KeyM',
  mountSpecial: 'KeyC',
  potion: 'KeyQ',
  recall: 'KeyH',
  cursorLock: 'KeyL',
  menu: 'Tab',
  interact: 'KeyE',
};

export const ACTION_LABELS: Record<BindableAction, string> = {
  skill0: 'Skill Slot 1',
  skill1: 'Skill Slot 2',
  skill2: 'Skill Slot 3',
  skill3: 'Skill Slot 4',
  skill4: 'Skill Slot 5',
  ultimate: 'Ultimate Burst',
  jobSkill6: 'Job Skill I',
  jobSkill7: 'Job Skill II',
  mount: 'Summon / Dismiss Mount',
  mountSpecial: 'Mount Dash / Skill',
  potion: 'Use Healing Potion',
  recall: 'Recall to Sanctuary',
  cursorLock: 'Toggle Cursor Lock',
  menu: 'Open Menu Hub',
  interact: 'Interact NPC / Fountain',
};

export interface PanelPrefs {
  partyMinimized: boolean;
  questsMinimized: boolean;
  chatMinimized: boolean;
  minimapMinimized: boolean;
  chatWidth: number;
  chatHeight: number;
  minimapSize: number;
}

export const DEFAULT_PANEL_PREFS: PanelPrefs = {
  partyMinimized: false,
  questsMinimized: false,
  chatMinimized: false,
  minimapMinimized: false,
  chatWidth: 320,
  chatHeight: 170,
  minimapSize: 164,
};

export interface GameSettings {
  cameraSensitivity: number; // 0.1 to 2.0, default 1.0
  masterVolume: number; // 0.0 to 1.0, default 0.8
  voiceVolume: number; // 0.0 to 1.0, default 0.85
  voiceEnabled: boolean; // default true
  subtitlesEnabled: boolean; // default true
  graphicsQuality: GraphicsQuality; // default 'high'
  outlinesEnabled: boolean; // default true
  bloomEnabled: boolean; // default true
  fpsCap: FpsCapOption; // default 144
  bloomIntensity: number; // 0.0 to 1.0, default 0.35
  shoulderView: boolean; // default false
  uiScale: UiScaleOption; // default 1
  keybinds: KeybindMap;
  panelPrefs: PanelPrefs;
}

const SETTINGS_KEY = 'eldergrove_settings_v3';

export const DEFAULT_SETTINGS: GameSettings = {
  cameraSensitivity: 1.0,
  masterVolume: 0.8,
  voiceVolume: 0.85,
  voiceEnabled: true,
  subtitlesEnabled: true,
  graphicsQuality: 'high',
  outlinesEnabled: true,
  bloomEnabled: true,
  fpsCap: 144,
  bloomIntensity: 0.35,
  shoulderView: false,
  uiScale: 1,
  keybinds: { ...DEFAULT_KEYBINDS },
  panelPrefs: { ...DEFAULT_PANEL_PREFS },
};

export function formatKeyCode(code: string): string {
  if (!code) return '?';
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Key')) return code.slice(3);
  if (code === 'Space') return 'SPC';
  if (code === 'Tab') return 'TAB';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHF';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'CTL';
  if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
  if (code === 'Backquote') return '~';
  return code.toUpperCase().slice(0, 4);
}

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, keybinds: { ...DEFAULT_KEYBINDS }, panelPrefs: { ...DEFAULT_PANEL_PREFS } };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const quality: GraphicsQuality =
      parsed.graphicsQuality === 'low' ||
      parsed.graphicsQuality === 'medium' ||
      parsed.graphicsQuality === 'high'
        ? parsed.graphicsQuality
        : DEFAULT_SETTINGS.graphicsQuality;
    const fpsCap: FpsCapOption =
      parsed.fpsCap === 0 || parsed.fpsCap === 60 || parsed.fpsCap === 144
        ? parsed.fpsCap
        : DEFAULT_SETTINGS.fpsCap;
    const uiScale: UiScaleOption =
      parsed.uiScale === 0.85 || parsed.uiScale === 1 || parsed.uiScale === 1.15
        ? parsed.uiScale
        : DEFAULT_SETTINGS.uiScale;

    return {
      cameraSensitivity:
        typeof parsed.cameraSensitivity === 'number'
          ? Math.max(0.1, Math.min(2.0, parsed.cameraSensitivity))
          : DEFAULT_SETTINGS.cameraSensitivity,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : DEFAULT_SETTINGS.masterVolume,
      voiceVolume:
        typeof parsed.voiceVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.voiceVolume))
          : DEFAULT_SETTINGS.voiceVolume,
      voiceEnabled:
        typeof parsed.voiceEnabled === 'boolean'
          ? parsed.voiceEnabled
          : DEFAULT_SETTINGS.voiceEnabled,
      subtitlesEnabled:
        typeof parsed.subtitlesEnabled === 'boolean'
          ? parsed.subtitlesEnabled
          : DEFAULT_SETTINGS.subtitlesEnabled,
      graphicsQuality: quality,
      outlinesEnabled:
        typeof parsed.outlinesEnabled === 'boolean'
          ? parsed.outlinesEnabled
          : DEFAULT_SETTINGS.outlinesEnabled,
      bloomEnabled:
        typeof parsed.bloomEnabled === 'boolean'
          ? parsed.bloomEnabled
          : DEFAULT_SETTINGS.bloomEnabled,
      fpsCap,
      bloomIntensity:
        typeof parsed.bloomIntensity === 'number'
          ? Math.max(0, Math.min(1, parsed.bloomIntensity))
          : DEFAULT_SETTINGS.bloomIntensity,
      shoulderView:
        typeof parsed.shoulderView === 'boolean'
          ? parsed.shoulderView
          : DEFAULT_SETTINGS.shoulderView,
      uiScale,
      keybinds: {
        ...DEFAULT_KEYBINDS,
        ...(parsed.keybinds || {}),
      },
      panelPrefs: {
        ...DEFAULT_PANEL_PREFS,
        ...(parsed.panelPrefs || {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keybinds: { ...DEFAULT_KEYBINDS }, panelPrefs: { ...DEFAULT_PANEL_PREFS } };
  }
}

export function saveSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota errors
  }
}
