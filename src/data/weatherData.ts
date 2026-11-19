export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';

export interface WeatherGameplayEffects {
  attackMult: number;
  defenseMult: number;
  speedMult: number;
  mpRegenMult: number;
  cdrBonusPct: number; // additive CDR (0.12 = +12% CDR)
  critBonusPct: number; // additive crit chance (0.10 = +10%)
  evasionChance: number; // chance to dodge incoming monster hits
  xpMult: number;
  staminaRegenMult: number;
}

export interface WeatherPreset {
  id: WeatherType;
  label: string;
  skyTopHex: number;
  skyHorizonHex: number;
  fogHex: number;
  fogDensity: number;
  sunIntensity: number;
  ambientIntensity: number;
  particleCount: number;
  particleColor: number;
  particleSize: number;
  fallSpeed: number;
  windX: number;
  minDurationMs: number;
  maxDurationMs: number;
  effects: WeatherGameplayEffects;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    id: 'clear',
    label: 'Clear Skies',
    skyTopHex: 0x3b82f6,
    skyHorizonHex: 0xa5d8ff,
    fogHex: 0x99c6eb,
    fogDensity: 0.0046,
    sunIntensity: 2.2,
    ambientIntensity: 0.9,
    particleCount: 0,
    particleColor: 0xffffff,
    particleSize: 0.1,
    fallSpeed: 0,
    windX: 0,
    minDurationMs: 32000,
    maxDurationMs: 65000,
    effects: {
      attackMult: 1.0,
      defenseMult: 1.0,
      speedMult: 1.1,
      mpRegenMult: 1.0,
      cdrBonusPct: 0,
      critBonusPct: 0.02,
      evasionChance: 0,
      xpMult: 1.0,
      staminaRegenMult: 1.2,
    },
  },
  rain: {
    id: 'rain',
    label: 'Silver Rain',
    skyTopHex: 0x334155,
    skyHorizonHex: 0x64748b,
    fogHex: 0x5c6e84,
    fogDensity: 0.0076,
    sunIntensity: 1.35,
    ambientIntensity: 0.72,
    particleCount: 550,
    particleColor: 0xbae6fd,
    particleSize: 0.22,
    fallSpeed: 32,
    windX: 4.5,
    minDurationMs: 28000,
    maxDurationMs: 55000,
    effects: {
      attackMult: 0.96,
      defenseMult: 1.05,
      speedMult: 0.95,
      mpRegenMult: 1.45,
      cdrBonusPct: 0.12,
      critBonusPct: 0,
      evasionChance: 0.04,
      xpMult: 1.08,
      staminaRegenMult: 1.0,
    },
  },
  snow: {
    id: 'snow',
    label: 'Frostfall Snow',
    skyTopHex: 0x475569,
    skyHorizonHex: 0xcbd5e1,
    fogHex: 0x9fb2c7,
    fogDensity: 0.0085,
    sunIntensity: 1.55,
    ambientIntensity: 0.95,
    particleCount: 480,
    particleColor: 0xf8fafc,
    particleSize: 0.28,
    fallSpeed: 5.5,
    windX: 2.2,
    minDurationMs: 28000,
    maxDurationMs: 55000,
    effects: {
      attackMult: 1.04,
      defenseMult: 1.2,
      speedMult: 0.92,
      mpRegenMult: 1.15,
      cdrBonusPct: 0.05,
      critBonusPct: 0.08,
      evasionChance: 0,
      xpMult: 1.1,
      staminaRegenMult: 0.95,
    },
  },
  fog: {
    id: 'fog',
    label: 'Mystic Fog',
    skyTopHex: 0x4b5563,
    skyHorizonHex: 0x94a3b8,
    fogHex: 0x8091a5,
    fogDensity: 0.0138,
    sunIntensity: 1.2,
    ambientIntensity: 0.85,
    particleCount: 140,
    particleColor: 0xe2e8f0,
    particleSize: 0.45,
    fallSpeed: 1.2,
    windX: 1.5,
    minDurationMs: 24000,
    maxDurationMs: 48000,
    effects: {
      attackMult: 1.05,
      defenseMult: 0.95,
      speedMult: 1.02,
      mpRegenMult: 1.1,
      cdrBonusPct: 0.04,
      critBonusPct: 0.14,
      evasionChance: 0.14,
      xpMult: 1.18,
      staminaRegenMult: 1.05,
    },
  },
  storm: {
    id: 'storm',
    label: 'Ember Tempest',
    skyTopHex: 0x1e1b2e,
    skyHorizonHex: 0x5b3438,
    fogHex: 0x42262b,
    fogDensity: 0.0098,
    sunIntensity: 1.45,
    ambientIntensity: 0.65,
    particleCount: 620,
    particleColor: 0xfb923c,
    particleSize: 0.24,
    fallSpeed: 24,
    windX: 8.0,
    minDurationMs: 25000,
    maxDurationMs: 48000,
    effects: {
      attackMult: 1.22,
      defenseMult: 0.88,
      speedMult: 1.18,
      mpRegenMult: 1.25,
      cdrBonusPct: 0.08,
      critBonusPct: 0.1,
      evasionChance: 0.05,
      xpMult: 1.25,
      staminaRegenMult: 1.15,
    },
  },
};

export const WEATHER_CYCLE_ORDER: WeatherType[] = ['clear', 'rain', 'fog', 'snow', 'storm'];

export function pickRandomNextWeather(current: WeatherType): { weather: WeatherType; nextDurationMs: number } {
  const candidates = WEATHER_CYCLE_ORDER.filter((w) => w !== current);
  const chosen = candidates[Math.floor(Math.random() * candidates.length)] || 'clear';
  const preset = WEATHER_PRESETS[chosen];
  const nextDurationMs =
    preset.minDurationMs + Math.round(Math.random() * (preset.maxDurationMs - preset.minDurationMs));
  return { weather: chosen, nextDurationMs };
}
