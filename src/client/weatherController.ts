import * as THREE from 'three';
import { WEATHER_PRESETS } from '../data/weatherData';
import type { WeatherType } from '../data/weatherData';
import { getZoneAt } from '../shared/gameTypes';
import type { GraphicsQuality } from './settingsStorage';

const MAX_WEATHER_PARTICLES = 650;
const BOX_W = 58;
const BOX_H = 26;

const _targetTop = new THREE.Color();
const _targetHorizon = new THREE.Color();
const _targetFog = new THREE.Color();
const _biomeTint = new THREE.Color();

export interface SkyUniforms {
  [uniform: string]: THREE.IUniform<unknown>;
  uTime: { value: number };
  uTopColor: { value: THREE.Color };
  uHorizonColor: { value: THREE.Color };
  uSunDir: { value: THREE.Vector3 };
}

export class WeatherController {
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;

  private activeWeather: WeatherType = 'clear';
  private quality: GraphicsQuality = 'high';
  private activeCount = 0;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_WEATHER_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_WEATHER_PARTICLES);

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * BOX_W;
      this.positions[i * 3 + 1] = Math.random() * BOX_H;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * BOX_W;
      this.velocities[i] = 0.8 + Math.random() * 0.4;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.22,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  public setWeather(weather: WeatherType) {
    if (this.activeWeather === weather) return;
    this.activeWeather = weather;
    this.syncParticleStyle();
  }

  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
    this.syncParticleStyle();
  }

  private syncParticleStyle() {
    const preset = WEATHER_PRESETS[this.activeWeather];
    const qualityMult = this.quality === 'low' ? 0.35 : this.quality === 'medium' ? 0.65 : 1.0;
    this.activeCount = Math.min(
      MAX_WEATHER_PARTICLES,
      Math.round(preset.particleCount * qualityMult)
    );
    this.geometry.setDrawRange(0, this.activeCount);
    this.material.color.setHex(preset.particleColor);
    this.material.size = preset.particleSize;
    this.material.opacity = this.activeWeather === 'fog' ? 0.35 : 0.78;
    this.points.visible = this.activeCount > 0;
  }

  public update(
    delta: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    playerWorldX: number,
    playerWorldY: number,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    scene: THREE.Scene,
    skyUniforms: SkyUniforms
  ) {
    const preset = WEATHER_PRESETS[this.activeWeather];
    const lerpRate = Math.min(1, delta * 1.4);

    const zoneId = getZoneAt(playerWorldX, playerWorldY).id;
    let hasBiomeTint = false;
    if (zoneId === 'caldera') {
      _biomeTint.setHex(0x522124);
      hasBiomeTint = true;
    } else if (zoneId === 'ruins') {
      _biomeTint.setHex(0x3b3356);
      hasBiomeTint = true;
    } else if (zoneId === 'highlands') {
      _biomeTint.setHex(0xb8d4f0);
      hasBiomeTint = true;
    }

    _targetTop.setHex(preset.skyTopHex);
    _targetHorizon.setHex(preset.skyHorizonHex);
    _targetFog.setHex(preset.fogHex);

    if (hasBiomeTint) {
      _targetTop.lerp(_biomeTint, 0.38);
      _targetHorizon.lerp(_biomeTint, 0.48);
      _targetFog.lerp(_biomeTint, 0.55);
    }

    skyUniforms.uTopColor.value.lerp(_targetTop, lerpRate);
    skyUniforms.uHorizonColor.value.lerp(_targetHorizon, lerpRate);

    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(_targetFog, lerpRate);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(_targetFog, lerpRate);
      scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, preset.fogDensity, lerpRate);
    }

    sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, preset.sunIntensity, lerpRate);
    hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, preset.ambientIntensity, lerpRate);

    // Update weather particle volume centered around camera target
    if (this.activeCount <= 0) return;

    this.points.position.set(centerX, centerY - 2, centerZ);
    const fall = preset.fallSpeed;
    const wind = preset.windX;
    const halfW = BOX_W * 0.5;

    for (let i = 0; i < this.activeCount; i++) {
      const idx = i * 3;
      const spd = this.velocities[i];
      this.positions[idx] += wind * spd * delta;
      this.positions[idx + 1] -= fall * spd * delta;

      if (this.activeWeather === 'snow' || this.activeWeather === 'fog') {
        this.positions[idx + 2] += Math.sin(centerX + i) * 0.6 * delta;
      }

      if (this.positions[idx + 1] < -2) {
        this.positions[idx + 1] = BOX_H - 1;
        this.positions[idx] = (Math.random() - 0.5) * BOX_W;
        this.positions[idx + 2] = (Math.random() - 0.5) * BOX_W;
      }
      if (this.positions[idx] > halfW) this.positions[idx] -= BOX_W;
      if (this.positions[idx] < -halfW) this.positions[idx] += BOX_W;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
