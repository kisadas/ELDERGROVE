import React, { useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { NPCS_DATA } from '../data/questsData';
import {
  DEFAULT_UNLOCKED_ZONES,
  SANCTUARY_CENTER,
  SANCTUARY_FOUNTAIN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WORLD_ZONES,
} from '../shared/gameTypes';
import type { WorldSnapshot, ZoneId } from '../shared/gameTypes';

interface MinimapProps {
  snapshot: WorldSnapshot | null;
  localPlayerId: string | null;
  size?: number;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  onCycleSize?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  snapshot,
  localPlayerId,
  size = 164,
  minimized = false,
  onToggleMinimize,
  onCycleSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const widthPx = Math.round(size * 1.28);
  const heightPx = Math.round(size);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot || minimized) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / WORLD_WIDTH;
    const sy = h / WORLD_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    // Base background
    ctx.fillStyle = '#0D131E';
    ctx.fillRect(0, 0, w, h);

    // Non-linear branching region fills around Sunlit Sanctuary
    // Woods (West/NW)
    ctx.fillStyle = '#153423';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1320 * sx, 0);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(1480 * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(0, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Highlands (North/NE)
    ctx.fillStyle = '#173752';
    ctx.beginPath();
    ctx.moveTo(1320 * sx, 0);
    ctx.lineTo(WORLD_WIDTH * sx, 0);
    ctx.lineTo(WORLD_WIDTH * sx, 1380 * sy);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.closePath();
    ctx.fill();

    // Ashen Ruins (South/SW)
    ctx.fillStyle = '#251B38';
    ctx.beginPath();
    ctx.moveTo(0, 2100 * sy);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(2220 * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(0, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Dragon's Caldera (East/SE)
    ctx.fillStyle = '#3B191B';
    ctx.beginPath();
    ctx.moveTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(WORLD_WIDTH * sx, 1380 * sy);
    ctx.lineTo(WORLD_WIDTH * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(2220 * sx, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Curving Golden Roads
    ctx.strokeStyle = 'rgba(214, 189, 136, 0.45)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const roads: Array<[number, number, number, number, number, number]> = [
      [1800, 1600, 1300, 1460, 700, 1320],
      [1800, 1600, 1920, 1080, 2050, 560],
      [1800, 1600, 1450, 2120, 1120, 2600],
      [1800, 1600, 2360, 1880, 2900, 2180],
      [2050, 560, 2380, 590, 2660, 640],
    ];
    for (const [x1, y1, cx, cy, x2, y2] of roads) {
      ctx.beginPath();
      ctx.moveTo(x1 * sx, y1 * sy);
      ctx.quadraticCurveTo(cx * sx, cy * sy, x2 * sx, y2 * sy);
      ctx.stroke();
    }

    // Central Sunlit Sanctuary Citadel Circle
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy, SANCTUARY_CENTER.radius * sx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sanctuary Healing Fountain
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(SANCTUARY_FOUNTAIN.x * sx, SANCTUARY_FOUNTAIN.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Compute local + group unlocked zones
    const lp = snapshot.players.find((p) => p.id === localPlayerId);
    const unlockedSet = new Set<ZoneId>(lp?.unlockedZones || DEFAULT_UNLOCKED_ZONES);
    if (lp?.groupId) {
      const grp = snapshot.groups.find((g) => g.id === lp.groupId);
      if (grp?.unlockedZones) {
        for (const uz of grp.unlockedZones) unlockedSet.add(uz);
      }
    }

    // Angled Zone Gate Markers for locked sectors
    for (const z of WORLD_ZONES) {
      if (z.unlockedByDefault || unlockedSet.has(z.id)) continue;
      ctx.save();
      ctx.translate(z.gateX * sx, z.gateY * sy);
      ctx.rotate(z.gateAngle);
      ctx.strokeStyle = z.accentColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Eclipse Crucible (World Boss Altar)
    ctx.strokeStyle = snapshot.worldBoss?.isActive ? '#FDE047' : 'rgba(251, 191, 36, 0.45)';
    ctx.lineWidth = snapshot.worldBoss?.isActive ? 2 : 1;
    ctx.beginPath();
    ctx.arc(2660 * sx, 640 * sy, 7, 0, Math.PI * 2);
    ctx.stroke();

    // NPCs
    for (const npc of Object.values(NPCS_DATA)) {
      ctx.fillStyle = npc.accentColor;
      ctx.beginPath();
      ctx.arc(npc.x * sx, npc.y * sy, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Monsters & Bosses
    for (const m of snapshot.monsters) {
      ctx.fillStyle = m.isWorldBoss ? '#FDE047' : m.isBoss ? '#F97316' : '#EF4444';
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, m.isWorldBoss ? 4.8 : m.isBoss ? 3.5 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of snapshot.players) {
      const isMe = p.id === localPlayerId;
      ctx.fillStyle = isMe ? '#FBBF24' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, isMe ? 3.5 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (isMe) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [snapshot, localPlayerId, minimized, widthPx, heightPx]);

  return (
    <div className="bg-[#131822]/92 border border-white/15 rounded-xl p-2 shadow-xl flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          Eldergrove Map
        </span>
        <div className="flex items-center gap-1">
          {!minimized && onCycleSize && (
            <button
              type="button"
              onClick={onCycleSize}
              title="Resize Minimap"
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              title={minimized ? 'Expand Minimap' : 'Minimize Minimap'}
              className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <canvas
          ref={canvasRef}
          width={widthPx}
          height={heightPx}
          className="rounded-lg border border-white/10 bg-[#0D131E] block"
        />
      )}
    </div>
  );
};
