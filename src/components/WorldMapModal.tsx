import React, { useEffect, useRef } from 'react';
import { Compass, MapPin } from 'lucide-react';
import { NPCS_DATA } from '../data/questsData';
import {
  DEFAULT_UNLOCKED_ZONES,
  SANCTUARY_CENTER,
  SANCTUARY_FOUNTAIN,
  WORLD_BOSS_ARENA,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WORLD_ZONES,
} from '../shared/gameTypes';
import type { WorldSnapshot, ZoneId } from '../shared/gameTypes';
import { DraggableResizableModal } from './DraggableResizableModal';

interface WorldMapModalProps {
  snapshot: WorldSnapshot | null;
  localPlayerId: string | null;
  onClose: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  snapshot,
  localPlayerId,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const localPlayer = snapshot?.players.find((p) => p.id === localPlayerId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const sx = w / WORLD_WIDTH;
    const sy = h / WORLD_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    // Deep parchment/fantasy ocean background
    ctx.fillStyle = '#0B111A';
    ctx.fillRect(0, 0, w, h);

    // 1. Regions
    // Whispering Wilds (West/NW)
    ctx.fillStyle = '#143825';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1320 * sx, 0);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(1480 * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(0, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Frozen Highlands (North/NE)
    ctx.fillStyle = '#163C59';
    ctx.beginPath();
    ctx.moveTo(1320 * sx, 0);
    ctx.lineTo(WORLD_WIDTH * sx, 0);
    ctx.lineTo(WORLD_WIDTH * sx, 1380 * sy);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.closePath();
    ctx.fill();

    // Ashen Ruins (South/SW)
    ctx.fillStyle = '#261C39';
    ctx.beginPath();
    ctx.moveTo(0, 2100 * sy);
    ctx.lineTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(2220 * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(0, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Dragon's Caldera (East/SE)
    ctx.fillStyle = '#421C1E';
    ctx.beginPath();
    ctx.moveTo(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy);
    ctx.lineTo(WORLD_WIDTH * sx, 1380 * sy);
    ctx.lineTo(WORLD_WIDTH * sx, WORLD_HEIGHT * sy);
    ctx.lineTo(2220 * sx, WORLD_HEIGHT * sy);
    ctx.closePath();
    ctx.fill();

    // Golden Roads network
    ctx.strokeStyle = 'rgba(234, 203, 136, 0.55)';
    ctx.lineWidth = 5;
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

    // Central Sunlit Sanctuary
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(SANCTUARY_CENTER.x * sx, SANCTUARY_CENTER.y * sy, SANCTUARY_CENTER.radius * sx, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Healing Fountain
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(SANCTUARY_FOUNTAIN.x * sx, SANCTUARY_FOUNTAIN.y * sy, 7, 0, Math.PI * 2);
    ctx.fill();

    // Unlocked zones
    const unlockedSet = new Set<ZoneId>(localPlayer?.unlockedZones || DEFAULT_UNLOCKED_ZONES);
    if (localPlayer?.groupId) {
      const grp = snapshot.groups.find((g) => g.id === localPlayer.groupId);
      if (grp?.unlockedZones) {
        for (const uz of grp.unlockedZones) unlockedSet.add(uz);
      }
    }

    // Region Names
    ctx.font = '700 13px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A7F3D0';
    ctx.fillText('Whispering Wilds', 750 * sx, 1150 * sy);
    ctx.fillStyle = '#BAE6FD';
    ctx.fillText('Frozen Highlands', 2550 * sx, 750 * sy);
    ctx.fillStyle = '#DDD6FE';
    ctx.fillText('Ashen Ruins', 900 * sx, 2550 * sy);
    ctx.fillStyle = '#FECACA';
    ctx.fillText("Dragon's Caldera", 2950 * sx, 2350 * sy);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText('Sunlit Sanctuary', SANCTUARY_CENTER.x * sx, (SANCTUARY_CENTER.y - 65) * sy);

    // Zone Gate Barriers
    for (const z of WORLD_ZONES) {
      const isUnlocked = z.unlockedByDefault || unlockedSet.has(z.id);
      ctx.save();
      ctx.translate(z.gateX * sx, z.gateY * sy);
      ctx.rotate(z.gateAngle);
      ctx.strokeStyle = isUnlocked ? '#10B981' : z.accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Eclipse Crucible Altar
    ctx.strokeStyle = snapshot.worldBoss?.isActive ? '#FDE047' : '#D97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(WORLD_BOSS_ARENA.x * sx, WORLD_BOSS_ARENA.y * sy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillStyle = snapshot.worldBoss?.isActive ? '#FDE047' : '#F59E0B';
    ctx.fillText('Aurelion Altar', WORLD_BOSS_ARENA.x * sx, (WORLD_BOSS_ARENA.y - 16) * sy);

    // NPCs
    for (const npc of Object.values(NPCS_DATA)) {
      ctx.fillStyle = npc.accentColor;
      ctx.beginPath();
      ctx.arc(npc.x * sx, npc.y * sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(npc.name, npc.x * sx, (npc.y + 12) * sy);
    }

    // Monsters & Bosses
    for (const m of snapshot.monsters) {
      ctx.fillStyle = m.isWorldBoss ? '#FDE047' : m.isBoss ? '#F97316' : 'rgba(239, 68, 68, 0.75)';
      ctx.beginPath();
      ctx.arc(m.x * sx, m.y * sy, m.isWorldBoss ? 7 : m.isBoss ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Players
    for (const p of snapshot.players) {
      const isMe = p.id === localPlayerId;
      ctx.fillStyle = isMe ? '#FBBF24' : '#38BDF8';
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, isMe ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = isMe ? '700 11px "Plus Jakarta Sans", sans-serif' : '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isMe ? '#FDE68A' : '#E2E8F0';
      ctx.fillText(p.name, p.x * sx, (p.y - 9) * sy);
    }
  }, [snapshot, localPlayerId, localPlayer]);

  return (
    <DraggableResizableModal
      title="Eldergrove Realm Map"
      subtitle="Full 5-Region Branching Territory · Hotkey [M]"
      icon={<Compass className="w-5 h-5 text-amber-400" />}
      initialWidth={760}
      initialHeight={620}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono-num text-amber-300 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              {localPlayer ? `X: ${Math.round(localPlayer.x)}  Y: ${Math.round(localPlayer.y)}` : 'Sanctuary'}
            </span>
            <span className="text-slate-400">
              Boss Aurelion:{' '}
              {snapshot?.worldBoss?.isActive ? (
                <strong className="text-amber-300 animate-pulse">ACTIVE NOW</strong>
              ) : (
                <span className="font-mono-num text-slate-300">
                  {snapshot?.worldBoss?.killsCount || 0}/{snapshot?.worldBoss?.killsRequired || 25} Kills
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono-num text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> You
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Allies
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Monsters
            </span>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/15 bg-[#0B111A] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={460}
            className="w-full h-auto max-h-[500px] object-contain block"
          />
        </div>
      </div>
    </DraggableResizableModal>
  );
};
