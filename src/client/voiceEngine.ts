import { VOICE_LINES_DATA } from '../data/voiceLinesData';
import { DEFAULT_SETTINGS } from './settingsStorage';
import type { GameSettings } from './settingsStorage';

export interface ActiveSubtitle {
  id: string;
  speaker: string;
  text: string;
  expiresAt: number;
}

type SubtitleListener = (subtitle: ActiveSubtitle | null) => void;

class VoiceEngine {
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  // Lazy-loaded utterance cache (loaded on demand when a voice line is first played)
  private cachedLines = new Map<string, SpeechSynthesisUtterance>();
  private lastPlayedAt = new Map<string, number>();
  private subtitleListener: SubtitleListener | null = null;
  private subtitleTimer: number | null = null;

  public applySettings(next: GameSettings) {
    this.settings = { ...next };
    if (!next.voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (!next.subtitlesEnabled && this.subtitleListener) {
      this.subtitleListener(null);
    }
  }

  public onSubtitleChange(listener: SubtitleListener | null) {
    this.subtitleListener = listener;
  }

  public playLine(lineId: string) {
    const def = VOICE_LINES_DATA[lineId];
    if (!def) return;

    const now = Date.now();
    const last = this.lastPlayedAt.get(lineId) || 0;
    // Prevent voice spam on rapid skill presses
    if (now - last < 2500) return;
    this.lastPlayedAt.set(lineId, now);

    // Emit subtitle if enabled
    if (this.settings.subtitlesEnabled && this.subtitleListener) {
      if (this.subtitleTimer) {
        window.clearTimeout(this.subtitleTimer);
      }
      const duration = Math.max(2600, Math.min(5200, def.subtitle.length * 65));
      this.subtitleListener({
        id: `${lineId}_${now}`,
        speaker: def.speaker,
        text: def.subtitle,
        expiresAt: now + duration,
      });
      this.subtitleTimer = window.setTimeout(() => {
        this.subtitleListener?.(null);
      }, duration);
    }

    // Lazy load & play speech only when voice is enabled and volume > 0
    const effectiveVol = Math.max(0, Math.min(1, this.settings.masterVolume * this.settings.voiceVolume));
    if (!this.settings.voiceEnabled || effectiveVol <= 0.01) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      let utter = this.cachedLines.get(lineId);
      if (!utter) {
        utter = new SpeechSynthesisUtterance(def.subtitle);
        utter.lang = 'en-US';
        utter.pitch = def.pitch;
        utter.rate = def.rate;
        this.cachedLines.set(lineId, utter);
      }
      utter.volume = effectiveVol;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {
      // Gracefully ignore browser speech blocks
    }
  }

  public stopAll() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.subtitleTimer) {
      window.clearTimeout(this.subtitleTimer);
      this.subtitleTimer = null;
    }
    this.subtitleListener?.(null);
  }
}

export const voiceEngine = new VoiceEngine();
