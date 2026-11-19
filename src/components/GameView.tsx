import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Backpack,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Crosshair,
  Feather,
  Flame,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Hammer,
  Heart,
  Home,
  LayoutGrid,
  Lock,
  MessageSquare,
  RefreshCw,
  ScrollText,
  Send,
  Settings,
  Shield,
  Sparkles,
  Store,
  Swords,
  Unlock,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { getJobBranchById } from '../data/jobChangeData';
import { MOUNTS_DATA } from '../data/mountsData';
import { PETS_DATA, getEffectivePetXpBonus } from '../data/petsData';
import { NPCS_DATA, NPC_LIST, QUESTS_DATA } from '../data/questsData';
import { SKILLS_DATA, ULTIMATE_UNLOCK_LEVEL } from '../data/skillsData';
import {
  CLASS_CONFIG,
  QUARTERMASTER_NPC,
  SANCTUARY_CENTER,
  SANCTUARY_FOUNTAIN,
  getZoneAt,
} from '../shared/gameTypes';
import type {
  ChatMessage,
  ClientMessage,
  GroupInvite,
  PlayerState,
  PlayerStats,
  SavedProfile,
  ServerMessage,
  WorldSnapshot,
} from '../shared/gameTypes';
import { CLASS_PORTRAITS, TITLE_BACKDROP } from '../client/profileStorage';
import { Eldergrove3DWorld } from '../client/world3dScene';
import { soundFx } from '../client/soundFx';
import { formatKeyCode, loadSettings, saveSettings } from '../client/settingsStorage';
import type { GameSettings } from '../client/settingsStorage';
import { voiceEngine } from '../client/voiceEngine';
import type { ActiveSubtitle } from '../client/voiceEngine';
import { Minimap } from './Minimap';
import { CharacterModal } from './CharacterModal';
import { SettingsModal } from './SettingsModal';
import { GroupPanel } from './GroupPanel';
import { MountsModal } from './MountsModal';
import { PetsModal } from './PetsModal';
import { SkillTreeModal } from './SkillTreeModal';
import { InventoryModal } from './InventoryModal';
import { QuestModal } from './QuestModal';
import { MerchantModal } from './MerchantModal';
import { JobChangeModal } from './JobChangeModal';
import { MenuHubModal } from './MenuHubModal';

interface GameViewProps {
  initialProfile: SavedProfile;
  realmCode: string;
  onProfileSync: (profile: SavedProfile) => void;
  onBackToCharacters: () => void;
  onChangeServer: () => void;
  onLogout: () => void;
}

type ActiveModal =
  | 'none'
  | 'menu'
  | 'char'
  | 'skills'
  | 'mounts'
  | 'pets'
  | 'settings'
  | 'inventory'
  | 'quests'
  | 'merchant'
  | 'job';

type NearbyInteractable =
  | { kind: 'fountain'; label: string }
  | { kind: 'quartermaster'; label: string }
  | { kind: 'npc'; npcId: string; role: 'quest' | 'merchant' | 'job_master' | 'quartermaster'; label: string };

export const GameView: React.FC<GameViewProps> = ({
  initialProfile,
  realmCode,
  onProfileSync,
  onBackToCharacters,
  onChangeServer,
  onLogout,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const world3dRef = useRef<Eldergrove3DWorld | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const profileRef = useRef<SavedProfile>(initialProfile);
  const snapshotRef = useRef<WorldSnapshot | null>(null);
  const localPlayerIdRef = useRef<string>(initialProfile.playerId);
  const onProfileSyncRef = useRef(onProfileSync);
  onProfileSyncRef.current = onProfileSync;

  const keysRef = useRef<Set<string>>(new Set());
  const touchMoveVecRef = useRef<{ right: number; forward: number }>({ right: 0, forward: 0 });
  const touchPadOriginRef = useRef<{ active: boolean; pointerId: number; cx: number; cy: number }>({
    active: false,
    pointerId: -1,
    cx: 0,
    cy: 0,
  });
  const pointerDragRef = useRef<{
    active: boolean;
    button: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ active: false, button: 0, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false });

  // Continuous hold-to-attack loop (Zero charge mechanics)
  const attackHoldRef = useRef<{
    active: boolean;
    intervalId: number | null;
    aimX?: number;
    aimY?: number;
    lastFiredAt: number;
  }>({
    active: false,
    intervalId: null,
    lastFiredAt: 0,
  });

  const chatResizeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  }>({ active: false, startX: 0, startY: 0, startW: 320, startH: 170 });

  const lastInputSentRef = useRef<number>(0);
  const lastDirRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const lastFlightSentRef = useRef<number>(0);
  const lastFlapSoundRef = useRef<number>(0);
  const lastMousePosRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 600,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
  });

  const [connected, setConnected] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>(initialProfile.playerId);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [focusedNpcId, setFocusedNpcId] = useState<string | undefined>(undefined);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [muted, setMuted] = useState(() => soundFx.isMuted());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [subtitle, setSubtitle] = useState<ActiveSubtitle | null>(null);
  const [pendingInvite, setPendingInvite] = useState<GroupInvite | null>(null);
  const [zoneUnlockBanner, setZoneUnlockBanner] = useState<{ zoneName: string; unlockedBy: string } | null>(null);
  const [barrierWarning, setBarrierWarning] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ text: string; tone: 'info' | 'success' | 'warning' } | null>(null);
  const [isHoldingAttack, setIsHoldingAttack] = useState(false);
  const [touchControlsEnabled, setTouchControlsEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
      : false
  );
  const [touchKnob, setTouchKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const barrierTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const sendMsg = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  // Apply persisted settings immediately to sound, voice, and 3D camera
  useEffect(() => {
    soundFx.setMasterVolume(settings.masterVolume);
    voiceEngine.applySettings(settings);
    world3dRef.current?.applySettings(settings);
  }, [settings]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const updatePanelPrefs = useCallback(
    (patch: Partial<GameSettings['panelPrefs']>) => {
      setSettings((prev) => {
        const next: GameSettings = {
          ...prev,
          panelPrefs: { ...prev.panelPrefs, ...patch },
        };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // Sync pointer lock state & automatically unlock cursor when any modal opens
  useEffect(() => {
    const onLockChange = () => {
      const locked = Boolean(document.pointerLockElement);
      setIsPointerLocked(locked);
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, []);

  useEffect(() => {
    if (activeModal !== 'none') {
      world3dRef.current?.setPointerLocked(false);
    }
  }, [activeModal]);

  const toggleCursorLock = useCallback(() => {
    if (activeModal !== 'none') return;
    const next = !isPointerLocked;
    world3dRef.current?.setPointerLocked(next);
    soundFx.playUiClick();
  }, [activeModal, isPointerLocked]);

  // Pointer-lock free-look camera rotation
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement && world3dRef.current && activeModal === 'none') {
        const sens = world3dRef.current.cameraSensitivity;
        world3dRef.current.cameraYaw -= e.movementX * 0.0042 * sens;
        world3dRef.current.cameraPitch = Math.max(
          0.02,
          Math.min(1.56, world3dRef.current.cameraPitch + e.movementY * 0.0038 * sens)
        );
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [activeModal]);

  // Subscribe to voice subtitles
  useEffect(() => {
    voiceEngine.onSubtitleChange(setSubtitle);
    return () => {
      voiceEngine.onSubtitleChange(null);
      voiceEngine.stopAll();
    };
  }, []);

  // Initialize Three.js 3D Open World once
  useEffect(() => {
    const container = mountRef.current;
    const overlay = overlayCanvasRef.current;
    if (!container || !overlay) return;

    const world = new Eldergrove3DWorld(container, overlay, () => setContextLost(true));
    world.setLocalPlayerId(localPlayerIdRef.current);
    world.applySettings(settings);
    world3dRef.current = world;

    const onResize = () => world.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      world.dispose();
      world3dRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket lifecycle + auto-reconnect
  useEffect(() => {
    let unmounted = false;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (unmounted) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: 'join',
            realmCode,
            profile: profileRef.current,
          } satisfies ClientMessage)
        );
        voiceEngine.playLine('enter_realm');
      };

      ws.onmessage = (ev) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(ev.data) as ServerMessage;
        } catch {
          return;
        }

        if (msg.type === 'welcome') {
          setLocalPlayerId(msg.playerId);
          localPlayerIdRef.current = msg.playerId;
          world3dRef.current?.setLocalPlayerId(msg.playerId);
        } else if (msg.type === 'snapshot') {
          snapshotRef.current = msg.data;
          setSnapshot(msg.data);
          world3dRef.current?.applySnapshot(msg.data);

          const lp = msg.data.players.find((p) => p.id === localPlayerIdRef.current);
          for (const ce of msg.data.events) {
            if (ce.type === 'damage') {
              soundFx.playHit(ce.isCrit);
            } else if (ce.type === 'slash' && ce.playerId === localPlayerIdRef.current && lp) {
              soundFx.playComboSwing(lp.heroClass, ce.comboStep || 1);
            } else if (ce.type === 'level_up' && ce.playerId === localPlayerIdRef.current) {
              soundFx.playLevelUp();
              voiceEngine.playLine('level_up_call');
            } else if (ce.type === 'loot') {
              soundFx.playLoot();
            } else if (ce.type === 'pet_pickup' && ce.playerId === localPlayerIdRef.current) {
              soundFx.playPetPickup();
            } else if (ce.type === 'heal') {
              soundFx.playHeal();
            } else if (ce.type === 'world_boss') {
              soundFx.playWorldBossHorn();
            }
          }
        } else if (msg.type === 'chat') {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.message.id)) return prev;
            const next = [...prev, msg.message];
            return next.length > 50 ? next.slice(-50) : next;
          });
        } else if (msg.type === 'profile_sync') {
          profileRef.current = msg.profile;
          onProfileSyncRef.current(msg.profile);
        } else if (msg.type === 'group_invite') {
          setPendingInvite(msg.invite);
        } else if (msg.type === 'zone_unlocked') {
          soundFx.playZoneUnlock();
          setZoneUnlockBanner({ zoneName: msg.zoneName, unlockedBy: msg.unlockedBy });
          if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
          bannerTimerRef.current = window.setTimeout(() => setZoneUnlockBanner(null), 4600);
        } else if (msg.type === 'barrier_blocked') {
          soundFx.playError();
          setBarrierWarning(msg.message);
          if (barrierTimerRef.current) window.clearTimeout(barrierTimerRef.current);
          barrierTimerRef.current = window.setTimeout(() => setBarrierWarning(null), 3500);
        } else if (msg.type === 'notification') {
          if (msg.tone === 'warning') soundFx.playError();
          else if (msg.tone === 'success') soundFx.playCoin();
          setToastNotice({ text: msg.message, tone: msg.tone || 'info' });
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setToastNotice(null), 3500);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setConnected(false);
        reconnectTimer = window.setTimeout(connect, 1800);
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [realmCode]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Chat resize drag listeners
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = chatResizeRef.current;
      if (!r.active) return;
      const nw = Math.max(240, Math.min(520, r.startW + (e.clientX - r.startX)));
      const nh = Math.max(120, Math.min(340, r.startH + (r.startY - e.clientY)));
      updatePanelPrefs({ chatWidth: Math.round(nw), chatHeight: Math.round(nh) });
    };
    const onUp = () => {
      chatResizeRef.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updatePanelPrefs]);

  // Camera-relative WASD + Winged Flight Input Loop
  useEffect(() => {
    const interval = window.setInterval(() => {
      const world = world3dRef.current;
      if (!world) return;
      const isTyping = document.activeElement === chatInputRef.current;
      const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);

      let forward = 0;
      let right = 0;
      let climb = false;
      let descend = false;

      if (!isTyping && activeModal === 'none') {
        const keys = keysRef.current;
        if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) right += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) right -= 1;
        climb = keys.has('Space');
        descend = keys.has('KeyV') || keys.has('ControlLeft');
        if (forward === 0 && right === 0) {
          forward = touchMoveVecRef.current.forward;
          right = touchMoveVecRef.current.right;
        }
      }

      const canFlyMount = Boolean(lp?.isMounted && lp.activeMount && MOUNTS_DATA[lp.activeMount]?.canFly);
      world.setFlightControls(climb, descend, Boolean(lp?.isMounted), lp?.activeMount ?? null);

      const nowMs = Date.now();
      if (canFlyMount && climb && nowMs - lastFlapSoundRef.current > 480) {
        lastFlapSoundRef.current = nowMs;
        soundFx.playFlightFlap();
      }

      const yaw = world.cameraYaw;
      let dx = 0;
      let dy = 0;
      if (forward !== 0 || right !== 0) {
        dx = forward * Math.sin(yaw) + right * -Math.cos(yaw);
        dy = forward * Math.cos(yaw) + right * Math.sin(yaw);
        const len = Math.hypot(dx, dy);
        if (len > 0.001) {
          dx /= len;
          dy /= len;
        }
      }

      const flightHeight = world.getLocalFlightHeight();
      const dirChanged =
        Math.abs(dx - lastDirRef.current.dx) > 0.02 ||
        Math.abs(dy - lastDirRef.current.dy) > 0.02;
      const flightChanged =
        lp && Math.abs(flightHeight - (lp.flightHeight || 0)) > 0.08 && nowMs - lastFlightSentRef.current > 50;

      if (
        dirChanged ||
        flightChanged ||
        ((dx !== 0 || dy !== 0) && nowMs - lastInputSentRef.current > 65)
      ) {
        lastDirRef.current = { dx, dy };
        lastInputSentRef.current = nowMs;
        lastFlightSentRef.current = nowMs;
        const aimAngle = dx !== 0 || dy !== 0 ? Math.atan2(dy, dx) : world.getCameraAimAngle().aimAngle;
        sendMsg({
          type: 'input',
          dx,
          dy,
          aimAngle,
          flightHeight,
        });
      }
    }, 35);

    return () => window.clearInterval(interval);
  }, [sendMsg, activeModal]);

  const stopContinuousAttack = useCallback(() => {
    const hold = attackHoldRef.current;
    if (hold.intervalId) {
      window.clearInterval(hold.intervalId);
      hold.intervalId = null;
    }
    hold.active = false;
    setIsHoldingAttack(false);
  }, []);

  const fireOneContinuousAttack = useCallback(() => {
    const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
    if (!lp || lp.isDead) {
      stopContinuousAttack();
      return;
    }
    if (lp.stunnedUntil && Date.now() < lp.stunnedUntil) return;

    const classCfg = CLASS_CONFIG[lp.heroClass];
    const minInterval = Math.max(170, Math.round(classCfg.attackCooldownMs * 0.78));
    const now = performance.now();
    if (now - attackHoldRef.current.lastFiredAt < minInterval) return;
    attackHoldRef.current.lastFiredAt = now;

    // Hitting near Sanctuary Fountain fills HP & MP
    const distFountain = Math.hypot(lp.x - SANCTUARY_FOUNTAIN.x, lp.y - SANCTUARY_FOUNTAIN.y);
    if (distFountain <= SANCTUARY_FOUNTAIN.radius + 95) {
      sendMsg({ type: 'hit_fountain' });
      soundFx.playFountainHeal();
    }

    const useCenterAim = Boolean(document.pointerLockElement);
    const aimX = useCenterAim ? window.innerWidth / 2 : (attackHoldRef.current.aimX ?? lastMousePosRef.current.x);
    const aimY = useCenterAim ? window.innerHeight / 2 : (attackHoldRef.current.aimY ?? lastMousePosRef.current.y);
    const aim = world3dRef.current?.getCameraAimAngle(aimX, aimY);

    sendMsg({
      type: 'attack',
      aimAngle: aim?.aimAngle ?? lp.facingAngle,
    });
  }, [sendMsg, stopContinuousAttack]);

  const startContinuousAttack = useCallback(
    (clientX?: number, clientY?: number) => {
      const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
      if (!lp || lp.isDead) return;
      const hold = attackHoldRef.current;
      hold.aimX = clientX;
      hold.aimY = clientY;
      if (hold.active) return;

      hold.active = true;
      setIsHoldingAttack(true);
      fireOneContinuousAttack();
      hold.intervalId = window.setInterval(fireOneContinuousAttack, 120);
    },
    [fireOneContinuousAttack]
  );

  const handleSwitchWeapon = useCallback(() => {
    soundFx.playUiClick();
    sendMsg({ type: 'switch_weapon' });
  }, [sendMsg]);

  const triggerSkill = useCallback(
    (skillIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
      const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
      if (!lp || lp.isDead) return;
      const bundle = SKILLS_DATA[lp.heroClass];
      const branch = getJobBranchById(lp.jobId);
      const skill =
        skillIndex === 5
          ? bundle.ultimate
          : skillIndex === 6 || skillIndex === 7
            ? branch?.skills[skillIndex - 6]
            : bundle.actives[skillIndex];
      if (!skill) return;
      if (skillIndex === 5 && lp.level < ULTIMATE_UNLOCK_LEVEL) return;
      if (lp.cooldowns[skillIndex] > 0 || lp.mp < skill.manaCost) return;

      const useCenter = Boolean(document.pointerLockElement);
      const aim = world3dRef.current?.getCameraAimAngle(
        useCenter ? window.innerWidth / 2 : lastMousePosRef.current.x,
        useCenter ? window.innerHeight / 2 : lastMousePosRef.current.y
      );
      soundFx.playSkill(skillIndex === 5 || skillIndex >= 6);
      if ('voiceCalloutId' in skill && skill.voiceCalloutId) {
        voiceEngine.playLine(skill.voiceCalloutId);
      }
      sendMsg({
        type: 'cast_skill',
        skillIndex,
        aimX: aim?.aimX ?? lp.x,
        aimY: aim?.aimY ?? lp.y,
        aimAngle: aim?.aimAngle ?? lp.facingAngle,
      });
    },
    [sendMsg]
  );

  const handleToggleMount = useCallback(() => {
    const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
    if (!lp || lp.isDead) return;
    if (lp.unlockedMounts.length === 0) {
      setActiveModal('mounts');
      return;
    }
    soundFx.playMount();
    if (!lp.isMounted) {
      voiceEngine.playLine('mount_summon');
    }
    sendMsg({ type: 'toggle_mount' });
  }, [sendMsg]);

  const handleMountSpecial = useCallback(() => {
    const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
    if (!lp || lp.isDead || !lp.isMounted) return;
    const useCenter = Boolean(document.pointerLockElement);
    const aim = world3dRef.current?.getCameraAimAngle(
      useCenter ? window.innerWidth / 2 : lastMousePosRef.current.x,
      useCenter ? window.innerHeight / 2 : lastMousePosRef.current.y
    );
    soundFx.playSkill(false);
    sendMsg({
      type: 'mount_special',
      aimAngle: aim?.aimAngle ?? lp.facingAngle,
    });
  }, [sendMsg]);

  const handleRecallSanctuary = useCallback(() => {
    soundFx.playRecall();
    sendMsg({ type: 'respawn_town' });
  }, [sendMsg]);

  const handleOpenCharModal = useCallback(() => {
    setActiveModal((prev) => {
      const next = prev === 'char' ? 'none' : 'char';
      if (next === 'char') voiceEngine.playLine('npc_quartermaster');
      return next;
    });
  }, []);

  const localPlayer: PlayerState | undefined = useMemo(
    () => snapshot?.players.find((p) => p.id === localPlayerId),
    [snapshot, localPlayerId]
  );

  // Closest interactive NPC, Quartermaster, or Healing Fountain
  const nearbyInteractable: NearbyInteractable | null = useMemo(() => {
    if (!localPlayer) return null;
    const fDist = Math.hypot(localPlayer.x - SANCTUARY_FOUNTAIN.x, localPlayer.y - SANCTUARY_FOUNTAIN.y);
    if (fDist <= SANCTUARY_FOUNTAIN.radius + 75) {
      return { kind: 'fountain', label: 'Restore HP & MP at Healing Fountain' };
    }
    const qDist = Math.hypot(localPlayer.x - QUARTERMASTER_NPC.x, localPlayer.y - QUARTERMASTER_NPC.y);
    if (qDist <= 135) {
      return { kind: 'quartermaster', label: 'Speak with Quartermaster Bram (Forge)' };
    }
    let bestNpc: { id: string; dist: number } | null = null;
    for (const npc of NPC_LIST) {
      const d = Math.hypot(localPlayer.x - npc.x, localPlayer.y - npc.y);
      if (d <= 145 && (!bestNpc || d < bestNpc.dist)) {
        bestNpc = { id: npc.id, dist: d };
      }
    }
    if (bestNpc) {
      const npc = NPCS_DATA[bestNpc.id];
      return { kind: 'npc', npcId: npc.id, role: npc.role, label: `Talk to ${npc.name}` };
    }
    return null;
  }, [localPlayer]);

  const triggerInteractTarget = useCallback(
    (target: NearbyInteractable | null) => {
      if (!target) return;
      if (target.kind === 'fountain') {
        sendMsg({ type: 'hit_fountain' });
        soundFx.playFountainHeal();
        return;
      }
      if (target.kind === 'quartermaster') {
        soundFx.playUiClick();
        voiceEngine.playLine('npc_quartermaster');
        setActiveModal('char');
        return;
      }
      soundFx.playUiClick();
      voiceEngine.playLine('npc_quest_elder');
      if (target.role === 'merchant') {
        setActiveModal('merchant');
      } else if (target.role === 'job_master') {
        setActiveModal('job');
      } else {
        setFocusedNpcId(target.npcId);
        setActiveModal('quests');
      }
    },
    [sendMsg]
  );

  // Dynamic Keybind Router
  useEffect(() => {
    const kb = settings.keybinds;
    const boundCodes = new Set(Object.values(kb));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (document.activeElement !== chatInputRef.current) {
          e.preventDefault();
          setTimeout(() => chatInputRef.current?.focus(), 10);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (document.activeElement === chatInputRef.current) {
          chatInputRef.current?.blur();
        } else if (document.pointerLockElement) {
          world3dRef.current?.setPointerLocked(false);
        } else if (activeModal !== 'none') {
          setActiveModal('none');
        } else {
          setActiveModal('settings');
        }
        return;
      }

      if (document.activeElement === chatInputRef.current) return;

      keysRef.current.add(e.code);

      if (e.code === kb.menu) {
        e.preventDefault();
        setActiveModal((m) => (m === 'menu' ? 'none' : 'menu'));
        return;
      }
      if (e.code === kb.cursorLock) {
        e.preventDefault();
        toggleCursorLock();
        return;
      }

      if (activeModal !== 'none') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const lp = snapshotRef.current?.players.find((p) => p.id === localPlayerIdRef.current);
        world3dRef.current?.triggerLocalJump(Boolean(lp?.isMounted), lp?.activeMount ?? null);
      } else if (e.code === 'KeyJ') {
        if (!e.repeat) startContinuousAttack();
      } else if (e.code === kb.skill0) {
        triggerSkill(0);
      } else if (e.code === kb.skill1) {
        triggerSkill(1);
      } else if (e.code === kb.skill2) {
        triggerSkill(2);
      } else if (e.code === kb.skill3) {
        triggerSkill(3);
      } else if (e.code === kb.skill4) {
        triggerSkill(4);
      } else if (e.code === kb.ultimate) {
        triggerSkill(5);
      } else if (e.code === kb.jobSkill6) {
        triggerSkill(6);
      } else if (e.code === kb.jobSkill7) {
        triggerSkill(7);
      } else if (e.code === kb.mount) {
        handleToggleMount();
      } else if (e.code === kb.mountSpecial) {
        handleMountSpecial();
      } else if (e.code === kb.potion) {
        sendMsg({ type: 'use_potion' });
      } else if (e.code === kb.recall) {
        handleRecallSanctuary();
      } else if (e.code === kb.interact) {
        triggerInteractTarget(nearbyInteractable);
      } else if (!boundCodes.has(e.code)) {
        // Convenient panel shortcuts when not bound to combat actions
        if (e.code === 'KeyI') setActiveModal((v) => (v === 'inventory' ? 'none' : 'inventory'));
        else if (e.code === 'KeyK') setActiveModal((v) => (v === 'skills' ? 'none' : 'skills'));
        else if (e.code === 'KeyB') setActiveModal((v) => (v === 'mounts' ? 'none' : 'mounts'));
        else if (e.code === 'KeyP') setActiveModal((v) => (v === 'job' ? 'none' : 'job'));
        else if (e.code === 'KeyN') setActiveModal((v) => (v === 'pets' ? 'none' : 'pets'));
        else if (e.code === 'KeyU') handleOpenCharModal();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      if (e.code === 'KeyJ') {
        stopContinuousAttack();
      }
    };

    const onBlur = () => {
      keysRef.current.clear();
      stopContinuousAttack();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    settings.keybinds,
    activeModal,
    nearbyInteractable,
    toggleCursorLock,
    startContinuousAttack,
    stopContinuousAttack,
    triggerSkill,
    handleToggleMount,
    handleMountSpecial,
    handleRecallSanctuary,
    triggerInteractTarget,
    handleOpenCharModal,
    sendMsg,
  ]);

  // 3D Orbit Camera, Raycast NPC/Fountain Click, & Continuous Hold-to-Attack
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeModal !== 'none') return;
    if (e.target !== mountRef.current && !(e.target instanceof HTMLCanvasElement)) return;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (document.pointerLockElement) {
      if (e.button === 0) {
        startContinuousAttack(window.innerWidth / 2, window.innerHeight / 2);
      }
      return;
    }

    // Raycast NPC or Fountain first on left click
    if (e.button === 0 && world3dRef.current) {
      const hit = world3dRef.current.raycastInteractiveTarget(e.clientX, e.clientY);
      if (hit) {
        if (hit.kind === 'fountain') {
          sendMsg({ type: 'hit_fountain' });
          soundFx.playFountainHeal();
          return;
        }
        if (hit.kind === 'quartermaster') {
          soundFx.playUiClick();
          voiceEngine.playLine('npc_quartermaster');
          setActiveModal('char');
          return;
        }
        if (hit.kind === 'npc') {
          const npc = NPCS_DATA[hit.npcId];
          soundFx.playUiClick();
          voiceEngine.playLine('npc_quest_elder');
          if (npc?.role === 'merchant') setActiveModal('merchant');
          else if (npc?.role === 'job_master') setActiveModal('job');
          else {
            setFocusedNpcId(hit.npcId);
            setActiveModal('quests');
          }
          return;
        }
      }
    }

    pointerDragRef.current = {
      active: true,
      button: e.button,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };

    if (e.button === 0) {
      startContinuousAttack(e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (attackHoldRef.current.active && !document.pointerLockElement) {
      attackHoldRef.current.aimX = e.clientX;
      attackHoldRef.current.aimY = e.clientY;
    }
    const drag = pointerDragRef.current;
    if (!drag.active || !world3dRef.current || document.pointerLockElement) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 7) {
      drag.moved = true;
      if (drag.button === 0) {
        stopContinuousAttack();
      }
    }

    if (drag.moved || drag.button === 2) {
      const sens = world3dRef.current.cameraSensitivity;
      world3dRef.current.cameraYaw -= dx * 0.0065 * sens;
      world3dRef.current.cameraPitch = Math.max(
        0.02,
        Math.min(1.56, world3dRef.current.cameraPitch + dy * 0.005 * sens)
      );
    }
  };

  const handlePointerUp = () => {
    pointerDragRef.current.active = false;
    stopContinuousAttack();
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!world3dRef.current || activeModal !== 'none') return;
    world3dRef.current.cameraDistance = Math.max(
      7,
      Math.min(25, world3dRef.current.cameraDistance + e.deltaY * 0.012)
    );
  };

  const handleCopyInvite = () => {
    const url = `${window.location.origin}${window.location.pathname}?realm=${encodeURIComponent(realmCode)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) {
      chatInputRef.current?.blur();
      return;
    }
    sendMsg({ type: 'chat', text: clean });
    setChatInput('');
    chatInputRef.current?.blur();
  };

  const activeBoss = useMemo(
    () =>
      snapshot?.monsters.find(
        (m) =>
          m.isBoss &&
          localPlayer &&
          Math.hypot(m.x - localPlayer.x, m.y - localPlayer.y) < 820
      ),
    [snapshot, localPlayer]
  );

  const currentZone = useMemo(
    () =>
      localPlayer
        ? getZoneAt(localPlayer.x, localPlayer.y)
        : getZoneAt(SANCTUARY_CENTER.x, SANCTUARY_CENTER.y),
    [localPlayer]
  );

  const heroClassKey = localPlayer ? localPlayer.heroClass : initialProfile.heroClass;
  const classCfg = CLASS_CONFIG[heroClassKey];
  const jobBranch = getJobBranchById(localPlayer?.jobId);
  const skillBundle = SKILLS_DATA[heroClassKey];
  const xpPercent = localPlayer ? Math.min(100, Math.round((localPlayer.xp / localPlayer.xpToNext) * 100)) : 0;

  const worldBossTimerStr = useMemo(() => {
    const ms = snapshot?.worldBoss?.nextSpawnInMs ?? 0;
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [snapshot?.worldBoss?.nextSpawnInMs]);

  const activePetDef = localPlayer?.activePet ? PETS_DATA[localPlayer.activePet.id] : null;
  const isFlyingMount = Boolean(
    localPlayer?.isMounted && localPlayer.activeMount && MOUNTS_DATA[localPlayer.activeMount]?.canFly
  );

  const uiScale = settings.uiScale || 1;
  const { panelPrefs } = settings;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-[#0B0E14] select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={mountRef} className="fixed inset-0 z-0 cursor-crosshair" />
      <canvas ref={overlayCanvasRef} className="fixed inset-0 z-10 pointer-events-none" />

      {/* Center Reticle when Cursor Lock is active */}
      {isPointerLocked && activeModal === 'none' && (
        <div className="fixed inset-0 z-15 pointer-events-none flex items-center justify-center">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="w-4 h-0.5 bg-amber-300/85 rounded-full shadow" />
            <div className="absolute w-0.5 h-4 bg-amber-300/85 rounded-full shadow" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-white shadow" />
          </div>
        </div>
      )}

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 bg-[#0B0E14] flex items-center justify-center p-6">
          <img
            src={TITLE_BACKDROP}
            alt="Eldergrove fallback"
            referrerPolicy="no-referrer"
            className="fixed inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
          />
          <div className="relative z-10 bg-[#131822] border border-white/15 rounded-xl p-6 max-w-sm text-center space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-100">3D Graphics Paused</h2>
            <p className="text-sm text-slate-300">Your browser suspended the WebGL context.</p>
            <button
              type="button"
              onClick={onBackToCharacters}
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-sm cursor-pointer"
            >
              Return to Character Select
            </button>
          </div>
        </div>
      )}

      {!connected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-red-950/95 border border-red-500/40 text-xs font-medium text-red-200 shadow-lg">
          Connecting to Realm {realmCode}...
        </div>
      )}

      {/* Incoming Group Invite Banner */}
      {pendingInvite && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[#131822] border border-amber-400/50 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-4">
          <div className="text-xs text-slate-200">
            <strong className="text-amber-300">{pendingInvite.fromName}</strong> invited you to join their party group.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sendMsg({ type: 'group_respond', groupId: pendingInvite.groupId, accept: true });
                setPendingInvite(null);
              }}
              className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => {
                sendMsg({ type: 'group_respond', groupId: pendingInvite.groupId, accept: false });
                setPendingInvite(null);
              }}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Top-Left: Player Vitals, Pet Status, Party Group & Minimizable Active Quests */}
      {localPlayer && !hudCollapsed && (
        <div
          className="fixed top-4 left-4 z-20 flex flex-col gap-2.5 w-72 max-w-[calc(100vw-2rem)] pointer-events-none"
          style={{ transform: `scale(${uiScale})`, transformOrigin: 'top left' }}
        >
          <div className="pointer-events-auto bg-[#131822]/92 border border-white/10 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center gap-3">
              <img
                src={CLASS_PORTRAITS[localPlayer.heroClass]}
                alt={localPlayer.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-amber-500/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-100 truncate">
                    {localPlayer.name}
                  </span>
                  <span className="font-mono-num text-xs font-semibold text-amber-400 shrink-0">
                    Lv.{localPlayer.level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
                  <span style={{ color: jobBranch?.accentColor }} className="truncate">
                    {jobBranch ? jobBranch.name : classCfg.name}
                  </span>
                  <span className="flex items-center gap-1 font-mono-num text-amber-300 shrink-0">
                    <Coins className="w-3.5 h-3.5" />
                    {localPlayer.gold}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <div className="flex justify-between text-[11px] font-mono-num text-slate-300 mb-0.5">
                  <span>HP</span>
                  <span>
                    {Math.round(localPlayer.hp)} / {localPlayer.maxHp}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, (localPlayer.hp / localPlayer.maxHp) * 100))}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono-num text-slate-300 mb-0.5">
                  <span>MP</span>
                  <span>
                    {Math.round(localPlayer.mp)} / {localPlayer.maxMp}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, (localPlayer.mp / localPlayer.maxMp) * 100))}%` }}
                  />
                </div>
              </div>

              {localPlayer.activeMount && (
                <div>
                  <div className="flex justify-between text-[10px] font-mono-num text-amber-300 mb-0.5">
                    <span className="truncate">
                      {MOUNTS_DATA[localPlayer.activeMount].name}
                      {isFlyingMount && localPlayer.flightHeight > 0.2
                        ? ` · ALT ${localPlayer.flightHeight.toFixed(1)}m`
                        : ''}
                    </span>
                    <span>
                      {Math.round(localPlayer.mountStamina)} / {localPlayer.maxMountStamina}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-100"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (localPlayer.mountStamina / Math.max(1, localPlayer.maxMountStamina)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {activePetDef && (
                <button
                  type="button"
                  onClick={() => setActiveModal('pets')}
                  className="w-full px-2.5 py-1 rounded-lg bg-[#0E131C] border border-pink-400/25 flex items-center justify-between text-[10px] font-mono-num text-pink-200 hover:border-pink-400/60 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1 truncate">
                    <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                    {activePetDef.name} (Lv.{localPlayer.petLevel})
                  </span>
                  <span className="text-emerald-300 shrink-0">
                    +{getEffectivePetXpBonus(activePetDef.id, localPlayer.petLevel)}% XP
                  </span>
                </button>
              )}
            </div>

            {(localPlayer.statPoints > 0 || localPlayer.skillPoints > 0) && (
              <div className="mt-2.5 flex gap-2">
                {localPlayer.statPoints > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenCharModal}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    +{localPlayer.statPoints} Stats
                  </button>
                )}
                {localPlayer.skillPoints > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('skills')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    +{localPlayer.skillPoints} Skill Tree
                  </button>
                )}
              </div>
            )}
          </div>

          <GroupPanel
            localPlayer={localPlayer}
            allPlayers={snapshot?.players || []}
            groups={snapshot?.groups || []}
            minimized={panelPrefs.partyMinimized}
            onToggleMinimize={() => updatePanelPrefs({ partyMinimized: !panelPrefs.partyMinimized })}
            onCreateGroup={() => sendMsg({ type: 'group_create' })}
            onInvitePlayer={(targetPlayerId) => sendMsg({ type: 'group_invite', targetPlayerId })}
            onKickPlayer={(targetPlayerId) => sendMsg({ type: 'group_kick', targetPlayerId })}
            onLeaveGroup={() => sendMsg({ type: 'group_leave' })}
            onRallyFriend={(targetPlayerId) => sendMsg({ type: 'rally_friend', targetPlayerId })}
          />

          {/* Minimizable Active Quests Tracker */}
          {localPlayer.activeQuests.length > 0 && (
            <div className="pointer-events-auto bg-[#131822]/90 border border-white/10 rounded-xl p-3 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                <button
                  type="button"
                  onClick={() => setActiveModal('quests')}
                  className="inline-flex items-center gap-1.5 hover:text-emerald-200 cursor-pointer"
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  Active Quests ({localPlayer.activeQuests.length})
                </button>
                <button
                  type="button"
                  onClick={() => updatePanelPrefs({ questsMinimized: !panelPrefs.questsMinimized })}
                  title={panelPrefs.questsMinimized ? 'Expand Quests' : 'Minimize Quests'}
                  className="p-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
                >
                  {panelPrefs.questsMinimized ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              {!panelPrefs.questsMinimized &&
                localPlayer.activeQuests.slice(0, 3).map((aq) => {
                  const qDef = QUESTS_DATA[aq.questId];
                  if (!qDef) return null;
                  const ready = aq.completed || aq.progress >= qDef.targetCount;
                  return (
                    <button
                      key={aq.questId}
                      type="button"
                      onClick={() => setActiveModal('quests')}
                      className="w-full flex items-center justify-between gap-2 text-[11px] hover:bg-white/5 rounded px-1 py-0.5 cursor-pointer"
                    >
                      <span className="text-slate-200 truncate">{qDef.title}</span>
                      <span className={`font-mono-num shrink-0 ${ready ? 'text-emerald-300 font-bold' : 'text-amber-300'}`}>
                        {ready ? 'Ready!' : `${aq.progress}/${qDef.targetCount}`}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Top-Center: Zone Name & World Boss Tracker (ZERO Weather UI) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        <div className="px-4 py-1.5 rounded-lg bg-[#131822]/90 border border-white/10 text-xs text-slate-200 flex items-center gap-2 shadow-lg">
          <span className="font-semibold" style={{ color: currentZone.accentColor }}>
            {currentZone.name}
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="font-mono-num text-slate-300">{currentZone.levelLabel}</span>
        </div>

        {/* World Boss Spawn Tracker */}
        {snapshot?.worldBoss && (
          <div
            className={`px-3.5 py-1 rounded-lg border text-[11px] font-mono-num shadow-lg ${
              snapshot.worldBoss.isActive
                ? 'bg-[#2B1418]/92 border-amber-400/70 text-amber-200 font-bold'
                : 'bg-[#131822]/88 border-white/10 text-slate-300'
            }`}
          >
            {snapshot.worldBoss.isActive ? (
              <span>WORLD BOSS ACTIVE: {snapshot.worldBoss.name} (NE Eclipse Crucible)</span>
            ) : (
              <span>
                World Boss: {snapshot.worldBoss.killsCount}/{snapshot.worldBoss.killsRequired} Kills · Timer {worldBossTimerStr}
              </span>
            )}
          </div>
        )}

        {activeBoss && (
          <div className="w-80 sm:w-96 bg-[#1A1216]/95 border border-red-500/40 rounded-xl px-4 py-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-display font-bold text-orange-300 truncate">{activeBoss.name}</span>
                {activeBoss.phase && (
                  <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-400/50 text-[10px] font-mono-num font-bold text-amber-300 shrink-0">
                    Phase {activeBoss.phase}/3
                  </span>
                )}
              </div>
              <span className="font-mono-num text-slate-200 shrink-0">
                {activeBoss.hp} / {activeBoss.maxHp}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-100"
                style={{ width: `${Math.max(0, Math.min(100, (activeBoss.hp / activeBoss.maxHp) * 100))}%` }}
              />
            </div>
            {activeBoss.telegraphName && (
              <div className="text-[11px] font-mono-num text-amber-200/90 flex items-center justify-between">
                <span>Pattern: {activeBoss.telegraphName}</span>
                {activeBoss.aiState === 'windup' && (
                  <span className="text-red-300 font-bold">INCOMING TELEGRAPH!</span>
                )}
              </div>
            )}
          </div>
        )}

        {zoneUnlockBanner && (
          <div className="px-5 py-3 rounded-xl bg-[#0F242A]/95 border border-sky-400/70 shadow-2xl text-center">
            <div className="text-[11px] font-mono-num uppercase tracking-wider text-sky-300">
              New Region Unlocked
            </div>
            <div className="font-display text-base font-bold text-slate-50">
              {zoneUnlockBanner.zoneName}
            </div>
            <div className="text-xs text-slate-300">
              Barrier shattered by defeating {zoneUnlockBanner.unlockedBy}!
            </div>
          </div>
        )}

        {barrierWarning && (
          <div className="px-4 py-2 rounded-lg bg-[#2A1418]/95 border border-red-400/60 text-xs font-medium text-red-200 shadow-xl max-w-md text-center">
            {barrierWarning}
          </div>
        )}

        {toastNotice && (
          <div
            className={`px-4 py-2 rounded-lg border text-xs font-medium shadow-xl max-w-md text-center ${
              toastNotice.tone === 'warning'
                ? 'bg-[#2B1B12]/95 border-amber-400/60 text-amber-200'
                : toastNotice.tone === 'success'
                  ? 'bg-[#102820]/95 border-emerald-400/60 text-emerald-200'
                  : 'bg-[#131822]/95 border-sky-400/50 text-sky-200'
            }`}
          >
            {toastNotice.text}
          </div>
        )}
      </div>

      {/* Top-Right: Menu Hub, Quick Dock & Resizable Minimap */}
      {!hudCollapsed && (
        <div
          className="fixed top-4 right-4 z-20 flex flex-col items-end gap-2.5"
          style={{ transform: `scale(${uiScale})`, transformOrigin: 'top right' }}
        >
          <div className="flex flex-wrap items-center justify-end gap-1.5 bg-[#131822]/92 border border-white/10 rounded-xl px-2.5 py-2 shadow-xl">
            <span className="text-xs font-mono-num text-slate-300 hidden xl:inline mr-1">
              <strong className="text-amber-300">{realmCode}</strong>
            </span>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'menu' ? 'none' : 'menu'))}
              title={`Open Menu Hub [${formatKeyCode(settings.keybinds.menu)}]`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Menu</span>
              <span className="text-[10px] font-mono-num opacity-80">[{formatKeyCode(settings.keybinds.menu)}]</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInvite}
              title="Copy Invite Link"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={toggleCursorLock}
              title={`Toggle Cursor Lock [${formatKeyCode(settings.keybinds.cursorLock)}]`}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isPointerLocked
                  ? 'bg-sky-500/25 border border-sky-400/60 text-sky-200'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {isPointerLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleRecallSanctuary}
              title={`Recall to Base [${formatKeyCode(settings.keybinds.recall)}]`}
              className="p-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-sky-300 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'inventory' ? 'none' : 'inventory'))}
              title="Satchel & Armory [I]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 transition-colors cursor-pointer"
            >
              <Backpack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setFocusedNpcId(undefined);
                setActiveModal((m) => (m === 'quests' ? 'none' : 'quests'));
              }}
              title="Quests & NPCs"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 transition-colors cursor-pointer"
            >
              <ScrollText className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'merchant' ? 'none' : 'merchant'))}
              title="Merchant Shop"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-200 transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Store className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'job' ? 'none' : 'job'))}
              title="8 Job Advancements [P]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sky-300 transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Award className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'pets' ? 'none' : 'pets'))}
              title="Companion Pets [N]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Heart className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'mounts' ? 'none' : 'mounts'))}
              title="8 Mounts & Sky Flight [B]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Feather className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'skills' ? 'none' : 'skills'))}
              title="Passive Skill Tree [K]"
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 transition-colors cursor-pointer hidden md:inline-flex"
            >
              <GitBranch className="w-4 h-4" />
              {localPlayer && localPlayer.skillPoints > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {localPlayer.skillPoints}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenCharModal}
              title="Stats & Quartermaster [U]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer hidden md:inline-flex"
            >
              <Hammer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setTouchControlsEnabled((v) => !v)}
              title="Toggle Mobile Touch Controls"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                touchControlsEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveModal((m) => (m === 'settings' ? 'none' : 'settings'))}
              title="Settings & Keybinds [Esc]"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMuted(soundFx.toggleMute())}
              title="Mute / Unmute SFX"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="hidden md:block">
            <Minimap
              snapshot={snapshot}
              localPlayerId={localPlayerId}
              size={panelPrefs.minimapSize}
              minimized={panelPrefs.minimapMinimized}
              onToggleMinimize={() => updatePanelPrefs({ minimapMinimized: !panelPrefs.minimapMinimized })}
              onCycleSize={() => {
                const nextSize =
                  panelPrefs.minimapSize < 175 ? 190 : panelPrefs.minimapSize < 215 ? 230 : 148;
                updatePanelPrefs({ minimapSize: nextSize });
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom-Left: Resizable & Minimizable Realm Chat */}
      {!hudCollapsed && (
        <div
          className="fixed bottom-4 left-4 z-20 hidden xl:flex flex-col"
          style={{
            width: panelPrefs.chatMinimized ? 'auto' : `${panelPrefs.chatWidth}px`,
            transform: `scale(${uiScale})`,
            transformOrigin: 'bottom left',
          }}
        >
          {panelPrefs.chatMinimized ? (
            <button
              type="button"
              onClick={() => updatePanelPrefs({ chatMinimized: false })}
              className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#131822]/90 border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Realm Chat ({chatMessages.length})
            </button>
          ) : (
            <div className="relative bg-[#131822]/90 border border-white/10 rounded-xl overflow-hidden shadow-xl">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-xs font-medium text-slate-300">Realm Chat</span>
                <div className="flex items-center gap-2">
                  {/* Drag Handle to Resize Chat */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      chatResizeRef.current = {
                        active: true,
                        startX: e.clientX,
                        startY: e.clientY,
                        startW: panelPrefs.chatWidth,
                        startH: panelPrefs.chatHeight,
                      };
                    }}
                    title="Drag to resize chat box"
                    className="w-3.5 h-3.5 rounded bg-white/10 hover:bg-amber-400/50 cursor-nesw-resize flex items-center justify-center text-[9px] text-slate-400"
                  >
                    ↗
                  </div>
                  <button
                    type="button"
                    onClick={() => updatePanelPrefs({ chatMinimized: true })}
                    className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
              </div>
              <div
                ref={chatScrollRef}
                style={{ height: `${panelPrefs.chatHeight}px` }}
                className="overflow-y-auto p-3 space-y-1.5 text-xs mmo-scroll"
              >
                {chatMessages.length === 0 && (
                  <div className="text-slate-500">Press Enter to message your party...</div>
                )}
                {chatMessages.map((m) => (
                  <div key={m.id} className="leading-snug break-words">
                    {m.isSystem ? (
                      <span className="text-amber-300/90">{m.text}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-sky-300">{m.senderName}: </span>
                        <span className="text-slate-200">{m.text}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex border-t border-white/10">
                <input
                  ref={chatInputRef}
                  type="text"
                  maxLength={180}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Press Enter to chat..."
                  className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send chat message"
                  className="px-3 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Voice Line Text Subtitle Overlay */}
      {subtitle && settings.subtitlesEnabled && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[calc(100vw-2rem)] pointer-events-none">
          <div className="bg-[#0B0E14]/92 border border-amber-400/35 rounded-lg px-4 py-2 text-center shadow-xl">
            <span className="text-xs font-semibold text-amber-300 mr-1.5">
              {subtitle.speaker}:
            </span>
            <span className="text-xs sm:text-sm text-slate-100">{subtitle.text}</span>
          </div>
        </div>
      )}

      {/* Proximity Interact Prompt [E] + Bottom-Center Hotbar */}
      {localPlayer && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 max-w-[calc(100vw-1rem)]"
          style={{ transform: `translateX(-50%) scale(${uiScale})`, transformOrigin: 'bottom center' }}
        >
          {nearbyInteractable && activeModal === 'none' && (
            <button
              type="button"
              onClick={() => triggerInteractTarget(nearbyInteractable)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-950/95 hover:bg-emerald-900 border border-emerald-400/70 text-xs font-semibold text-emerald-100 shadow-xl cursor-pointer transition-colors"
            >
              <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-num font-bold mr-2">
                {formatKeyCode(settings.keybinds.interact)}
              </span>
              {nearbyInteractable.label}
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHudCollapsed((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#131822]/90 border border-white/10 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {hudCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {hudCollapsed ? 'Show Controls' : 'Hide HUD'}
            </button>

            <button
              type="button"
              onClick={handleSwitchWeapon}
              title="Swap Weapon Stance Visual"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#131822]/90 border border-white/10 text-[11px] font-medium text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Swap Stance</span>
            </button>

            <button
              type="button"
              onClick={toggleCursorLock}
              title={`Toggle Cursor Lock [${formatKeyCode(settings.keybinds.cursorLock)}]`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${
                isPointerLocked
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-[#131822]/90 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>{isPointerLocked ? 'Cursor Locked' : 'Lock Cursor'}</span>
              <span className="font-mono-num text-[10px] opacity-80">[{formatKeyCode(settings.keybinds.cursorLock)}]</span>
            </button>
          </div>

          {!hudCollapsed && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#131822]/92 border border-white/15 rounded-xl p-2 shadow-2xl">
                {/* Hold for Continuous 3-Hit Combo Attack */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startContinuousAttack();
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    stopContinuousAttack();
                  }}
                  onPointerCancel={stopContinuousAttack}
                  onPointerLeave={stopContinuousAttack}
                  title="Hold for continuous 3-hit combo attacks (Left Click / J)"
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    isHoldingAttack
                      ? 'bg-amber-500/30 border-amber-400 text-amber-100'
                      : 'bg-[#1B2230] hover:bg-[#242D40] border-white/10'
                  }`}
                >
                  <Swords className="w-4 h-4 text-slate-100" />
                  <span className="text-[10px] font-mono-num text-slate-300">ATK</span>
                </button>

                {skillBundle.actives.map((sk, idx) => {
                  const skillIdx = idx as 0 | 1 | 2 | 3 | 4;
                  const bindAction = (`skill${idx}`) as keyof GameSettings['keybinds'];
                  const keyBadge = formatKeyCode(settings.keybinds[bindAction]);
                  const cdRemaining = localPlayer.cooldowns[skillIdx];
                  const onCd = cdRemaining > 0;
                  const noMana = localPlayer.mp < sk.manaCost;
                  const SkillIcon = idx === 0 ? Swords : idx === 1 ? Shield : Sparkles;

                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => triggerSkill(skillIdx)}
                      title={`${sk.name} [${keyBadge}] (${sk.manaCost} MP) — ${sk.description}`}
                      className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-colors cursor-pointer ${
                        onCd || noMana
                          ? 'bg-[#121620] border-white/5 text-slate-500'
                          : 'bg-[#1B2230] hover:bg-[#252E42] border-amber-500/30 text-slate-100'
                      }`}
                    >
                      <SkillIcon className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-mono-num">{keyBadge}</span>
                      <span className="absolute top-0.5 right-1 text-[9px] font-mono-num text-sky-300">
                        {sk.manaCost}
                      </span>
                      {onCd && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-xs font-bold text-slate-100">
                          {(cdRemaining / 1000).toFixed(1)}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Ultimate Skill */}
                {(() => {
                  const ult = skillBundle.ultimate;
                  const ultKey = formatKeyCode(settings.keybinds.ultimate);
                  const locked = localPlayer.level < ULTIMATE_UNLOCK_LEVEL;
                  const cdRemaining = localPlayer.cooldowns[5];
                  const onCd = cdRemaining > 0;
                  const noMana = localPlayer.mp < ult.manaCost;
                  return (
                    <button
                      type="button"
                      onClick={() => triggerSkill(5)}
                      title={
                        locked
                          ? `${ult.name} — Unlocks at Level ${ULTIMATE_UNLOCK_LEVEL}`
                          : `${ult.name} [${ultKey}] (${ult.manaCost} MP) — ${ult.description}`
                      }
                      className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-colors cursor-pointer ${
                        locked || onCd || noMana
                          ? 'bg-[#121620] border-white/5 text-slate-500'
                          : 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-400 text-amber-200'
                      }`}
                    >
                      {locked ? (
                        <Lock className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Flame className="w-4 h-4 text-amber-300" />
                      )}
                      <span className="text-[10px] font-mono-num">
                        {locked ? `Lv${ULTIMATE_UNLOCK_LEVEL}` : ultKey}
                      </span>
                      {!locked && (
                        <span className="absolute top-0.5 right-1 text-[9px] font-mono-num text-sky-300">
                          {ult.manaCost}
                        </span>
                      )}
                      {!locked && onCd && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-xs font-bold text-slate-100">
                          {(cdRemaining / 1000).toFixed(1)}
                        </div>
                      )}
                    </button>
                  );
                })()}

                {/* Job Specialization Active Skills [6] & [7] */}
                {jobBranch &&
                  jobBranch.skills.map((jsk) => {
                    const bindKey = jsk.slotIndex === 6
                      ? formatKeyCode(settings.keybinds.jobSkill6)
                      : formatKeyCode(settings.keybinds.jobSkill7);
                    const cdRemaining = localPlayer.cooldowns[jsk.slotIndex];
                    const onCd = cdRemaining > 0;
                    const noMana = localPlayer.mp < jsk.manaCost;
                    return (
                      <button
                        key={jsk.id}
                        type="button"
                        onClick={() => triggerSkill(jsk.slotIndex)}
                        title={`${jsk.name} [${bindKey}] (${jsk.manaCost} MP) — ${jsk.description}`}
                        className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-colors cursor-pointer ${
                          onCd || noMana
                            ? 'bg-[#121620] border-white/5 text-slate-500'
                            : 'bg-sky-950/60 hover:bg-sky-900/70 border-sky-400/70 text-sky-100'
                        }`}
                      >
                        <Award className="w-4 h-4 text-sky-300" />
                        <span className="text-[10px] font-mono-num">{bindKey}</span>
                        <span className="absolute top-0.5 right-1 text-[9px] font-mono-num text-sky-300">
                          {jsk.manaCost}
                        </span>
                        {onCd && (
                          <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-xs font-bold text-slate-100">
                            {(cdRemaining / 1000).toFixed(1)}
                          </div>
                        )}
                      </button>
                    );
                  })}

                <div className="w-px h-8 bg-white/10 mx-0.5 hidden sm:block" />

                {/* Mount Summon / Dismiss */}
                <button
                  type="button"
                  onClick={handleToggleMount}
                  title={`Mount Summon / Dismiss [${formatKeyCode(settings.keybinds.mount)}]`}
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    localPlayer.isMounted
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-[#1B2230] hover:bg-[#242D40] border-sky-500/30 text-sky-300'
                  }`}
                >
                  {isFlyingMount ? <Feather className="w-4 h-4" /> : <Wind className="w-4 h-4" />}
                  <span className="text-[10px] font-mono-num">{formatKeyCode(settings.keybinds.mount)}</span>
                </button>

                {localPlayer.isMounted && localPlayer.activeMount && (
                  <button
                    type="button"
                    onClick={handleMountSpecial}
                    title={`${MOUNTS_DATA[localPlayer.activeMount].specialName} [${formatKeyCode(settings.keybinds.mountSpecial)}]`}
                    className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#1B2230] hover:bg-[#242D40] border border-amber-400/50 flex flex-col items-center justify-center gap-0.5 overflow-hidden text-amber-300 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[9px] font-mono-num">{formatKeyCode(settings.keybinds.mountSpecial)}</span>
                    {localPlayer.mountSpecialCooldownMs > 0 && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center font-mono-num text-xs font-bold text-slate-100">
                        {(localPlayer.mountSpecialCooldownMs / 1000).toFixed(1)}
                      </div>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => sendMsg({ type: 'use_potion' })}
                  title={`Drink Health Potion [${formatKeyCode(settings.keybinds.potion)}]`}
                  className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#1B2230] hover:bg-[#242D40] border border-emerald-500/25 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono-num text-slate-300">
                    {formatKeyCode(settings.keybinds.potion)}
                  </span>
                  <span className="absolute top-0.5 right-1 text-[9px] font-mono-num font-bold text-emerald-300">
                    {localPlayer.potions}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRecallSanctuary}
                  title={`Recall to Base [${formatKeyCode(settings.keybinds.recall)}]`}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#1B2230] hover:bg-[#242D40] border border-white/10 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-sky-300" />
                  <span className="text-[10px] font-mono-num text-slate-400">
                    {formatKeyCode(settings.keybinds.recall)}
                  </span>
                </button>
              </div>

              <div className="w-full bg-[#131822]/92 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-3">
                <span className="text-[11px] font-mono-num font-semibold text-amber-300 shrink-0">
                  Lv.{localPlayer.level}
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-200"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono-num text-slate-300 shrink-0">
                  {localPlayer.xp} / {localPlayer.xpToNext} XP
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile Touch Controls Overlay */}
      {touchControlsEnabled && localPlayer && !localPlayer.isDead && activeModal === 'none' && (
        <>
          <div
            className="fixed bottom-24 left-5 z-25 w-28 h-28 rounded-full bg-[#131822]/80 border border-white/20 flex items-center justify-center touch-none shadow-2xl"
            onPointerDown={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              touchPadOriginRef.current = {
                active: true,
                pointerId: e.pointerId,
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const pad = touchPadOriginRef.current;
              if (!pad.active || pad.pointerId !== e.pointerId) return;
              const maxR = 42;
              let dx = e.clientX - pad.cx;
              let dy = e.clientY - pad.cy;
              const d = Math.hypot(dx, dy);
              if (d > maxR) {
                dx = (dx / d) * maxR;
                dy = (dy / d) * maxR;
              }
              setTouchKnob({ x: dx, y: dy });
              touchMoveVecRef.current = {
                right: Math.abs(dx) > 6 ? dx / maxR : 0,
                forward: Math.abs(dy) > 6 ? -dy / maxR : 0,
              };
            }}
            onPointerUp={(e) => {
              if (touchPadOriginRef.current.pointerId === e.pointerId) {
                touchPadOriginRef.current.active = false;
                touchMoveVecRef.current = { right: 0, forward: 0 };
                setTouchKnob({ x: 0, y: 0 });
              }
            }}
            onPointerCancel={() => {
              touchPadOriginRef.current.active = false;
              touchMoveVecRef.current = { right: 0, forward: 0 };
              setTouchKnob({ x: 0, y: 0 });
            }}
          >
            <div
              className="w-11 h-11 rounded-full bg-amber-400/80 border-2 border-white/80 pointer-events-none"
              style={{ transform: `translate(${touchKnob.x}px, ${touchKnob.y}px)` }}
            />
          </div>

          <div className="fixed bottom-24 right-5 z-25 flex items-end gap-2.5 touch-none">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleRecallSanctuary();
                }}
                className="w-12 h-12 rounded-full bg-[#131822]/90 border border-white/20 text-sky-200 flex flex-col items-center justify-center text-[10px] font-bold shadow-lg"
              >
                <Home className="w-4 h-4" />
                BASE
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  world3dRef.current?.triggerLocalJump(Boolean(localPlayer.isMounted), localPlayer.activeMount);
                }}
                className="w-12 h-12 rounded-full bg-[#131822]/90 border border-sky-400/40 text-sky-200 flex items-center justify-center text-[11px] font-bold shadow-lg"
              >
                {isFlyingMount ? 'FLY' : 'JUMP'}
              </button>
            </div>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                startContinuousAttack();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                stopContinuousAttack();
              }}
              onPointerCancel={stopContinuousAttack}
              className={`w-18 h-18 rounded-full border-2 flex flex-col items-center justify-center text-xs font-bold shadow-2xl ${
                isHoldingAttack
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-amber-500/85 text-slate-950 border-amber-200'
              }`}
            >
              <Swords className="w-6 h-6" />
              <span>ATK</span>
            </button>
          </div>
        </>
      )}

      {/* Fallen Overlay */}
      {localPlayer?.isDead && (
        <div className="fixed inset-0 z-30 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-[#131822] border border-red-500/35 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <h2 className="font-display text-2xl font-bold text-red-400">You Have Fallen</h2>
            <p className="text-sm text-slate-300 font-mono-num">
              Reviving in Sunlit Sanctuary in {Math.max(1, Math.ceil(localPlayer.respawnTimerMs / 1000))}s...
            </p>
            <button
              type="button"
              onClick={handleRecallSanctuary}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              Revive in Sanctuary Now
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'menu' && (
        <MenuHubModal
          settings={settings}
          isPointerLocked={isPointerLocked}
          onOpenModal={(target) => {
            soundFx.playUiClick();
            if (target === 'quests') setFocusedNpcId(undefined);
            setActiveModal(target);
          }}
          onRecallSanctuary={handleRecallSanctuary}
          onToggleCursorLock={toggleCursorLock}
          onBackToCharacters={onBackToCharacters}
          onChangeServer={onChangeServer}
          onLogout={onLogout}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'char' && localPlayer && (
        <CharacterModal
          player={localPlayer}
          onClose={() => setActiveModal('none')}
          onOpenSkillTree={() => setActiveModal('skills')}
          onOpenInventory={() => setActiveModal('inventory')}
          onAllocateStat={(stat: keyof PlayerStats) => sendMsg({ type: 'allocate_stat', stat })}
          onUpgradeGear={(slot) => sendMsg({ type: 'upgrade_gear', slot })}
        />
      )}

      {activeModal === 'inventory' && localPlayer && (
        <InventoryModal
          player={localPlayer}
          onMoveSlot={(fromIndex, toIndex) => sendMsg({ type: 'inv_move', fromIndex, toIndex })}
          onUseSlot={(slotIndex) => {
            soundFx.playHeal();
            sendMsg({ type: 'inv_use', slotIndex });
          }}
          onEquipSlot={(slotIndex) => {
            soundFx.playEquip();
            sendMsg({ type: 'inv_equip', slotIndex });
          }}
          onAutoEquip={() => {
            soundFx.playEquip();
            sendMsg({ type: 'inv_auto_equip' });
          }}
          onUnequipSlot={(equipSlot) => {
            soundFx.playUiClick();
            sendMsg({ type: 'inv_unequip', equipSlot });
          }}
          onSortBag={() => {
            soundFx.playUiClick();
            sendMsg({ type: 'inv_sort' });
          }}
          onDropSlot={(slotIndex) => sendMsg({ type: 'inv_drop', slotIndex })}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'quests' && localPlayer && (
        <QuestModal
          player={localPlayer}
          initialNpcId={focusedNpcId}
          onAcceptQuest={(questId) => {
            soundFx.playUiClick();
            sendMsg({ type: 'accept_quest', questId });
          }}
          onCompleteQuest={(questId) => {
            soundFx.playCoin();
            sendMsg({ type: 'complete_quest', questId });
          }}
          onTalkNpc={(npcId) => {
            voiceEngine.playLine('npc_quest_elder');
            sendMsg({ type: 'talk_npc', npcId });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'merchant' && localPlayer && snapshot && (
        <MerchantModal
          player={localPlayer}
          merchantStocks={snapshot.merchantStocks || {}}
          onBuyItem={(merchantId, itemId, quantity) => {
            soundFx.playCoin();
            sendMsg({ type: 'buy_item', merchantId, itemId, quantity });
          }}
          onSellItem={(merchantId, slotIndex, quantity) => {
            soundFx.playCoin();
            sendMsg({ type: 'sell_item', merchantId, slotIndex, quantity });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'job' && localPlayer && (
        <JobChangeModal
          player={localPlayer}
          onChangeJob={(jobId) => {
            soundFx.playJobChange();
            sendMsg({ type: 'change_job', jobId });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'skills' && localPlayer && (
        <SkillTreeModal
          player={localPlayer}
          onUnlockNode={(nodeId) => {
            soundFx.playUiClick();
            sendMsg({ type: 'unlock_skill_node', nodeId });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'mounts' && localPlayer && (
        <MountsModal
          player={localPlayer}
          mountKeyLabel={formatKeyCode(settings.keybinds.mount)}
          mountSpecialKeyLabel={formatKeyCode(settings.keybinds.mountSpecial)}
          onUnlockMount={(mountId) => {
            soundFx.playCoin();
            sendMsg({ type: 'unlock_mount', mountId });
          }}
          onToggleMount={(mountId) => {
            soundFx.playMount();
            if (!localPlayer.isMounted || localPlayer.activeMount !== mountId) {
              voiceEngine.playLine('mount_summon');
            }
            sendMsg({ type: 'toggle_mount', mountId });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'pets' && localPlayer && (
        <PetsModal
          player={localPlayer}
          onUnlockPet={(petId) => {
            soundFx.playCoin();
            sendMsg({ type: 'unlock_pet', petId });
          }}
          onTogglePet={(petId) => {
            soundFx.playPetPickup();
            sendMsg({ type: 'toggle_pet', petId });
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onTestVoice={() => voiceEngine.playLine('npc_quest_elder')}
          onBackToCharacters={onBackToCharacters}
          onChangeServer={onChangeServer}
          onLogout={onLogout}
          onClose={() => setActiveModal('none')}
        />
      )}
    </div>
  );
};
