import type { HeroClass } from '../shared/gameTypes';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterVolume: number = 0.8;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('eldergrove_muted') === '1';
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  private getCtx(): AudioContext | null {
    if (this.muted || this.masterVolume <= 0.01 || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('eldergrove_muted', this.muted ? '1' : '0');
    }
    return this.muted;
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.08,
    delay = 0
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;

    const scaledPeak = Math.max(0.0002, gainPeak * this.masterVolume);
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(scaledPeak, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playAttack(heroClass: HeroClass) {
    this.playComboSwing(heroClass, 1);
  }

  public playComboSwing(heroClass: HeroClass, step: 1 | 2 | 3) {
    const pitchBoost = step === 1 ? 1 : step === 2 ? 1.18 : 1.38;
    if (heroClass === 'warrior' || heroClass === 'assassin') {
      const base = heroClass === 'assassin' ? 320 : 210;
      this.playTone(base * pitchBoost, 88 * pitchBoost, step === 3 ? 0.14 : 0.09, 'sawtooth', step === 3 ? 0.075 : 0.055);
      if (step === 3) {
        this.playTone(540, 260, 0.12, 'triangle', 0.05, 0.02);
      }
    } else if (heroClass === 'mage' || heroClass === 'healer' || heroClass === 'summoner') {
      this.playTone(490 * pitchBoost, 270 * pitchBoost, 0.12, 'sine', 0.055);
      if (step === 3) {
        this.playTone(760, 1080, 0.14, 'triangle', 0.045, 0.02);
      }
    } else {
      this.playTone(400 * pitchBoost, 175 * pitchBoost, 0.09, 'triangle', 0.055);
    }
  }

  public playSkill(isUltimate = false) {
    if (isUltimate) {
      this.playTone(260, 780, 0.28, 'triangle', 0.09);
      this.playTone(520, 1040, 0.32, 'sine', 0.07, 0.05);
    } else {
      this.playTone(320, 640, 0.18, 'triangle', 0.07);
      this.playTone(480, 720, 0.2, 'sine', 0.05, 0.04);
    }
  }

  public playHit(isCrit = false) {
    if (isCrit) {
      this.playTone(280, 120, 0.14, 'square', 0.07);
      this.playTone(760, 520, 0.12, 'triangle', 0.05, 0.02);
    } else {
      this.playTone(170, 75, 0.09, 'triangle', 0.055);
    }
  }

  public playLoot() {
    this.playTone(660, 880, 0.09, 'sine', 0.06);
    this.playTone(880, 1180, 0.12, 'sine', 0.05, 0.06);
  }

  public playCoin() {
    this.playTone(987, 1318, 0.08, 'sine', 0.06);
    this.playTone(1318, 1568, 0.12, 'sine', 0.055, 0.05);
  }

  public playHeal() {
    this.playTone(440, 660, 0.16, 'sine', 0.06);
    this.playTone(554, 880, 0.18, 'sine', 0.05, 0.07);
  }

  public playFountainHeal() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.05, 0.22, 'sine', 0.065, idx * 0.055);
    });
  }

  public playRecall() {
    this.playTone(330, 880, 0.28, 'sine', 0.065);
    this.playTone(440, 1174, 0.3, 'triangle', 0.05, 0.08);
  }

  public playMount() {
    this.playTone(340, 520, 0.18, 'triangle', 0.07);
  }

  public playFlightFlap() {
    this.playTone(150, 92, 0.16, 'sine', 0.045);
    this.playTone(230, 140, 0.14, 'triangle', 0.03, 0.02);
  }

  public playPetPickup() {
    this.playTone(880, 1320, 0.08, 'sine', 0.045);
    this.playTone(1174, 1568, 0.1, 'triangle', 0.04, 0.04);
  }

  public playPetAssist() {
    this.playTone(620, 920, 0.1, 'triangle', 0.045);
  }

  public playEquip() {
    this.playTone(420, 620, 0.08, 'triangle', 0.055);
    this.playTone(620, 840, 0.1, 'sine', 0.05, 0.04);
  }

  public playUiClick() {
    this.playTone(580, 700, 0.045, 'sine', 0.03);
  }

  public playWorldBossHorn() {
    this.playTone(130.81, 146.83, 0.55, 'sawtooth', 0.085);
    this.playTone(196, 220, 0.6, 'triangle', 0.07, 0.12);
    this.playTone(261.63, 293.66, 0.65, 'sawtooth', 0.06, 0.25);
  }

  public playLevelUp() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.24, 'triangle', 0.08, idx * 0.08);
    });
  }

  public playJobChange() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.03, 0.28, 'sine', 0.08, idx * 0.09);
    });
  }

  public playZoneUnlock() {
    const notes = [392, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.26, 'triangle', 0.075, idx * 0.08);
    });
  }

  public playError() {
    this.playTone(220, 150, 0.14, 'sawtooth', 0.055);
  }
}

export const soundFx = new SoundEngine();
