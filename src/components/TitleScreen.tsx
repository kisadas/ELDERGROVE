import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Crosshair,
  Feather,
  Flame,
  Heart,
  LogIn,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { CLASS_LIST } from '../data/classesData';
import { getJobBranchById } from '../data/jobChangeData';
import { SKILLS_DATA } from '../data/skillsData';
import { CLASS_CONFIG, PUBLIC_REALM_CODE } from '../shared/gameTypes';
import type { HeroClass, SavedProfile } from '../shared/gameTypes';
import {
  CLASS_PORTRAITS,
  TITLE_BACKDROP,
  createDefaultProfile,
  deleteCharacterFromRoster,
  getActiveCharacterId,
  loadRoster,
  mergeRosters,
  saveCharacterToRoster,
  saveRoster,
  setActiveCharacterId,
} from '../client/profileStorage';
import {
  deleteCloudCharacter,
  ensureUserDoc,
  loadCloudCharacters,
  mapAuthErrorMessage,
  reloadCurrentUser,
  resendVerification,
  saveCloudCharacter,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogle,
  signOutAccount,
  signUpWithEmail,
} from '../client/firebase';

export type TitleStage = 'title' | 'auth' | 'roster';

interface TitleScreenProps {
  initialStage?: TitleStage;
  initialRealmCode: string;
  authUser: User | null;
  onEnterRealm: (profile: SavedProfile, realmCode: string) => void;
}

interface RealmInfo {
  code: string;
  playerCount: number;
  isPublic: boolean;
}

const PRESET_SERVERS = [
  { code: PUBLIC_REALM_CODE, label: 'Eldergrove Public Hub' },
  { code: 'ELDER-NA', label: 'North America Shard' },
  { code: 'ELDER-EU', label: 'Europe Frontier' },
  { code: 'ELDER-ASIA', label: 'Asia Skyrealm' },
];

const CLASS_ICONS: Record<HeroClass, React.ComponentType<{ className?: string }>> = {
  warrior: Shield,
  mage: Sparkles,
  archer: Crosshair,
  healer: Heart,
  assassin: Skull,
  summoner: Flame,
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  initialStage = 'title',
  initialRealmCode,
  authUser,
  onEnterRealm,
}) => {
  const [stage, setStage] = useState<TitleStage>(() => {
    if (initialStage === 'roster' && authUser) return 'roster';
    return initialStage === 'auth' && !authUser ? 'auth' : initialStage;
  });

  // Auth states
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  // Roster & Create states
  const [roster, setRoster] = useState<SavedProfile[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [heroName, setHeroName] = useState('Alden');
  const [heroClass, setHeroClass] = useState<HeroClass>('warrior');
  const [realmCode, setRealmCode] = useState<string>(initialRealmCode || PUBLIC_REALM_CODE);
  const [realms, setRealms] = useState<RealmInfo[]>([]);
  const [cloudBusy, setCloudBusy] = useState(false);

  // Sync stage when user authenticates
  useEffect(() => {
    if (authUser && stage === 'auth') {
      setStage('roster');
    } else if (!authUser && stage === 'roster') {
      setStage('auth');
    }
  }, [authUser, stage]);

  // Fetch active server player counts
  useEffect(() => {
    let active = true;
    fetch('/api/realms')
      .then((r) => r.json())
      .then((d: { realms?: RealmInfo[] }) => {
        if (active && Array.isArray(d.realms)) {
          setRealms(d.realms);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [stage]);

  // Load local + cloud character roster whenever authenticated user changes
  const refreshRoster = useCallback(async (user: User) => {
    const local = loadRoster(user.uid);
    setRoster(local);

    const activeId = getActiveCharacterId(user.uid);
    if (activeId && local.some((c) => c.playerId === activeId)) {
      setSelectedCharId(activeId);
    } else if (local.length > 0) {
      setSelectedCharId(local[0].playerId);
    } else {
      setSelectedCharId(null);
      setCreatingNew(true);
    }

    if (user.emailVerified || user.isAnonymous) {
      setCloudBusy(true);
      try {
        await ensureUserDoc(user, realmCode);
        const cloud = await loadCloudCharacters(user.uid);
        const merged = mergeRosters(local, cloud);
        saveRoster(user.uid, merged);
        setRoster(merged);
        if (merged.length > 0) {
          setCreatingNew(false);
          const pickId =
            activeId && merged.some((c) => c.playerId === activeId)
              ? activeId
              : merged[0].playerId;
          setSelectedCharId(pickId);
          setActiveCharacterId(user.uid, pickId);
        }
      } catch {
        // Keep local roster cleanly if offline
      } finally {
        setCloudBusy(false);
      }
    }
  }, [realmCode]);

  useEffect(() => {
    if (!authUser) {
      setRoster([]);
      setSelectedCharId(null);
      return;
    }
    void refreshRoster(authUser);
  }, [authUser, refreshRoster]);

  const selectedHero = useMemo(
    () => roster.find((c) => c.playerId === selectedCharId) || null,
    [roster, selectedCharId]
  );

  const selectedClassCfg = CLASS_CONFIG[heroClass];
  const selectedSkills = SKILLS_DATA[heroClass];

  const handleTitlePlayClick = () => {
    if (authUser) {
      setStage('roster');
    } else {
      setStage('auth');
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(mapAuthErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGuestSignIn = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInAsGuest();
    } catch (err) {
      setAuthError(mapAuthErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, displayName);
        setVerifyNotice('Account created! Check your inbox for a verification email to sync across devices.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setAuthError(mapAuthErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResendVerify = async () => {
    try {
      await resendVerification();
      setVerifyNotice('Verification email sent! Open the link in your inbox, then click Check Verification.');
    } catch (err) {
      setVerifyNotice(mapAuthErrorMessage(err));
    }
  };

  const handleCheckVerified = async () => {
    const refreshed = await reloadCurrentUser();
    if (refreshed?.emailVerified) {
      setVerifyNotice('Email verified! Syncing your cloud character roster...');
      await refreshRoster(refreshed);
    } else {
      setVerifyNotice('Email not verified yet — please click the confirmation link in your email inbox.');
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    const cleanName = heroName.trim().slice(0, 18) || 'Alden';
    const cleanRealm =
      realmCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || PUBLIC_REALM_CODE;

    const created = createDefaultProfile(cleanName, heroClass, cleanRealm);
    const updated = saveCharacterToRoster(authUser.uid, created);
    setRoster(updated);
    setSelectedCharId(created.playerId);
    setCreatingNew(false);
    if (authUser.emailVerified || authUser.isAnonymous) {
      void saveCloudCharacter(authUser.uid, created).catch(() => {});
    }
  };

  const handleDeleteCharacter = async (playerId: string) => {
    if (!authUser) return;
    const next = deleteCharacterFromRoster(authUser.uid, playerId);
    setRoster(next);
    if (selectedCharId === playerId) {
      const nextId = next[0]?.playerId || null;
      setSelectedCharId(nextId);
      setActiveCharacterId(authUser.uid, nextId);
      if (!nextId) setCreatingNew(true);
    }
    if (authUser.emailVerified || authUser.isAnonymous) {
      void deleteCloudCharacter(authUser.uid, playerId).catch(() => {});
    }
  };

  const handleEnterWorld = () => {
    if (!authUser || !selectedHero) return;
    const cleanRealm =
      realmCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || PUBLIC_REALM_CODE;
    const updatedProfile: SavedProfile = {
      ...selectedHero,
      lastRealmCode: cleanRealm,
      updatedAt: Date.now(),
    };
    saveCharacterToRoster(authUser.uid, updatedProfile);
    if (authUser.emailVerified || authUser.isAnonymous) {
      void saveCloudCharacter(authUser.uid, updatedProfile).catch(() => {});
    }
    onEnterRealm(updatedProfile, cleanRealm);
  };

  const handleSignOut = async () => {
    await signOutAccount();
    setStage('auth');
  };

  const getRealmPlayers = (code: string) =>
    realms.find((r) => r.code === code)?.playerCount ?? 0;

  // ===================== STAGE 1: ATMOSPHERIC TITLE SCREEN =====================
  if (stage === 'title') {
    return (
      <div className="relative min-h-screen w-screen overflow-hidden bg-[#0B0E14] text-slate-100 flex flex-col justify-between p-6 md:p-12">
        <img
          src={TITLE_BACKDROP}
          alt="Eldergrove Online scenic fantasy horizon"
          referrerPolicy="no-referrer"
          className="fixed inset-0 h-full w-full object-cover opacity-55 pointer-events-none scale-105"
        />
        <div className="fixed inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/55 to-[#0B0E14]/45 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131822]/85 border border-amber-400/35 text-xs font-mono-num text-amber-300">
            <Swords className="w-3.5 h-3.5" />
            3D Cel-Shaded Open-World MMORPG
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#131822]/85 border border-white/10 text-xs font-mono-num text-emerald-300">
            <Users className="w-3.5 h-3.5" />
            {getRealmPlayers(PUBLIC_REALM_CODE)} Adventurers in Eldergrove
          </div>
        </div>

        <div className="relative z-10 max-w-3xl my-auto space-y-6">
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-mono-num uppercase tracking-[0.22em] text-amber-300">
              Chronicles of the Sunlit Sanctuary
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-50 drop-shadow-xl">
              Eldergrove Online
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              Explore a branching cel-shaded open world across five regions, soar on winged dragons and phoenixes, master 8 Job Advancements per class, battle World Boss Aurelion, and adventure with your party.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#131822]/85 border border-white/10">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" /> 6 Classes · 48 Jobs
              </div>
              <div className="text-slate-400 mt-0.5">8 specialized tiers &amp; fluid combos</div>
            </div>
            <div className="p-3 rounded-xl bg-[#131822]/85 border border-white/10">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <Feather className="w-3.5 h-3.5" /> 8 Flying Mounts
              </div>
              <div className="text-slate-400 mt-0.5">Soar across regions on winged steeds</div>
            </div>
            <div className="p-3 rounded-xl bg-[#131822]/85 border border-white/10">
              <div className="font-bold text-pink-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> 8 Companion Pets
              </div>
              <div className="text-slate-400 mt-0.5">Auto-loot drops &amp; boost XP</div>
            </div>
            <div className="p-3 rounded-xl bg-[#131822]/85 border border-white/10">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> 10-Player Co-Op
              </div>
              <div className="text-slate-400 mt-0.5">100% shared XP &amp; world bosses</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleTitlePlayClick}
              className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-lg shadow-2xl shadow-amber-500/25 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              {authUser ? 'Continue to Character Roster' : 'Start Adventure · Sign In'}
            </button>
            {!authUser && (
              <button
                type="button"
                disabled={authBusy}
                onClick={handleGuestSignIn}
                className="px-6 py-4 rounded-xl bg-[#1A2130]/90 hover:bg-[#253046] border border-amber-400/40 text-amber-200 font-display font-bold text-base transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Play as Guest (Instant Play)
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>Every character &amp; class created stays permanently saved to your account.</span>
          <span className="font-mono-num">144 FPS Anime Cel-Shaded Engine</span>
        </div>
      </div>
    );
  }

  // ===================== STAGE 2: ACCOUNT LOGIN / SIGN UP =====================
  if (stage === 'auth' || !authUser) {
    return (
      <div className="relative min-h-screen w-screen overflow-y-auto bg-[#0B0E14] text-slate-100 flex items-center justify-center p-4">
        <img
          src={TITLE_BACKDROP}
          alt="Eldergrove Sanctuary"
          referrerPolicy="no-referrer"
          className="fixed inset-0 h-full w-full object-cover opacity-35 pointer-events-none"
        />
        <div className="fixed inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/80 to-[#0B0E14]/65 pointer-events-none" />

        <div className="relative z-10 w-full max-w-md bg-[#131822]/95 border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono-num uppercase tracking-wider text-amber-400">
                Eldergrove Account
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-50">
                {authMode === 'signin' ? 'Sign In to Play' : 'Create Adventurer Account'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setStage('title')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
            >
              Back
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-red-950/75 border border-red-400/50 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
              <span>{authError}</span>
            </div>
          )}

          {/* Quick Play as Guest */}
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGuestSignIn}
            className="w-full py-3 px-4 rounded-xl bg-[#1A2333] hover:bg-[#232F45] border border-amber-400/40 text-amber-300 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Play as Guest (Instant Play · No Sign-Up)
          </button>

          {/* Google / Gmail Sign-In */}
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Mail className="w-4 h-4 text-rose-600" />
            Continue with Gmail / Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex-1 h-px bg-white/10" />
            <span>or with Email &amp; Password</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#0D1119] border border-white/10">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                authMode === 'signin' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                authMode === 'signup' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Display Name</label>
                <input
                  type="text"
                  maxLength={32}
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alden"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1119] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1119] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0D1119] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              {authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {authBusy ? 'Connecting...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===================== STAGE 3: MULTI-CHARACTER ROSTER & SERVER SELECTOR =====================
  return (
    <div className="relative min-h-screen w-screen overflow-y-auto bg-[#0B0E14] text-slate-100 flex items-center justify-center p-4 md:p-6">
      <img
        src={TITLE_BACKDROP}
        alt="Eldergrove Sanctuary"
        referrerPolicy="no-referrer"
        className="fixed inset-0 h-full w-full object-cover opacity-30 pointer-events-none"
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/84 to-[#0B0E14]/70 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl bg-[#131822]/94 border border-white/12 rounded-2xl p-5 md:p-7 shadow-2xl space-y-6">
        {/* Account & Realm Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs font-mono-num text-amber-400">
              Signed in as {authUser.displayName || authUser.email}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-50">
              Select Hero &amp; Server Realm
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {cloudBusy && (
              <span className="inline-flex items-center gap-1.5 text-xs text-sky-300 font-mono-num">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing Cloud...
              </span>
            )}
            <button
              type="button"
              onClick={() => setStage('title')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 cursor-pointer"
            >
              Title Screen
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-400/35 text-xs font-semibold text-red-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {!authUser.emailVerified && !authUser.isAnonymous && (
          <div className="p-3.5 rounded-xl bg-amber-950/45 border border-amber-400/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-amber-100">
              <strong>Verify your email</strong> to enable cloud cross-device saves. Your heroes are saved locally in the meantime.
              {verifyNotice && <div className="text-amber-300 mt-1">{verifyNotice}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResendVerify}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 font-semibold cursor-pointer"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={handleCheckVerified}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold cursor-pointer"
              >
                Check Verification
              </button>
            </div>
          </div>
        )}

        {authUser.isAnonymous && (
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-400/35 flex items-center justify-between gap-3 text-xs text-sky-200">
            <span>
              <strong>Guest Adventurer Active:</strong> Your heroes and inventory are saved in Firestore &amp; locally on this device.
            </span>
            <span className="font-mono-num text-[11px] text-sky-300 shrink-0">Instant Play Mode</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Saved Heroes + Realm Picker */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  Saved Characters ({roster.length})
                </span>
                <button
                  type="button"
                  onClick={() => setCreatingNew((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-semibold text-amber-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {creatingNew ? 'Hide Creator' : 'New Hero'}
                </button>
              </div>

              {roster.length === 0 ? (
                <div className="p-5 rounded-xl bg-[#0E131C] border border-white/10 text-xs text-slate-400 text-center">
                  No characters yet. Create your first hero on the right to begin!
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto mmo-scroll pr-1">
                  {roster.map((char) => {
                    const isSelected = char.playerId === selectedCharId;
                    const cCfg = CLASS_CONFIG[char.heroClass];
                    const jBranch = getJobBranchById(char.jobId);
                    return (
                      <div
                        key={char.playerId}
                        onClick={() => {
                          setSelectedCharId(char.playerId);
                          setActiveCharacterId(authUser.uid, char.playerId);
                          if (char.lastRealmCode) setRealmCode(char.lastRealmCode);
                          setCreatingNew(false);
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1D2638] border-amber-400 ring-1 ring-amber-400/40'
                            : 'bg-[#151B26] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={CLASS_PORTRAITS[char.heroClass]}
                            alt={char.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-100 truncate">{char.name}</span>
                              <span className="text-xs font-mono-num text-amber-300">Lv.{char.level}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              <span style={{ color: jBranch?.accentColor || cCfg.color }}>
                                {jBranch ? jBranch.name : cCfg.name}
                              </span>
                              {' · '}
                              <span className="font-mono-num text-amber-200">{char.gold}g</span>
                              {char.lastRealmCode && ` · ${char.lastRealmCode}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteCharacter(char.playerId);
                            }}
                            title="Delete character"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Server / Realm Selector */}
            <div className="p-4 rounded-xl bg-[#0E131C] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> Server / Party Realm
                </span>
                <button
                  type="button"
                  onClick={() => setRealmCode(`PARTY-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)}
                  className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                >
                  + New Party Code
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PRESET_SERVERS.map((srv) => (
                  <button
                    key={srv.code}
                    type="button"
                    onClick={() => setRealmCode(srv.code)}
                    className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      realmCode === srv.code
                        ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                        : 'bg-[#151B26] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{srv.label}</div>
                    <div className="text-[10px] font-mono-num text-slate-400">
                      {srv.code} · {getRealmPlayers(srv.code)} online
                    </div>
                  </button>
                ))}
              </div>

              <input
                type="text"
                maxLength={12}
                value={realmCode}
                onChange={(e) => setRealmCode(e.target.value.toUpperCase())}
                placeholder="Or enter friend's Party Code..."
                className="w-full px-3 py-2 rounded-lg bg-[#151B26] border border-white/15 font-mono-num text-xs tracking-wider text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="button"
              disabled={!selectedHero}
              onClick={handleEnterWorld}
              className={`w-full py-3.5 px-6 rounded-xl font-display font-bold text-base transition-colors shadow-xl ${
                selectedHero
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/20'
                  : 'bg-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {selectedHero ? `Enter World as ${selectedHero.name}` : 'Create or Select a Hero'}
            </button>
          </div>

          {/* Right: Create New Character Panel (or Hero Summary) */}
          <div className="lg:col-span-7 space-y-4">
            {creatingNew || roster.length === 0 ? (
              <form onSubmit={handleCreateCharacter} className="space-y-4 p-4 rounded-xl bg-[#0E131C] border border-amber-400/25">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-amber-300">Create New Hero</h2>
                    <p className="text-xs text-slate-400">All classes stay saved permanently in your account roster.</p>
                  </div>
                  <input
                    type="text"
                    maxLength={18}
                    required
                    value={heroName}
                    onChange={(e) => setHeroName(e.target.value)}
                    placeholder="Hero Name"
                    className="px-3 py-2 rounded-lg bg-[#151B26] border border-white/15 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CLASS_LIST.map((cfg) => {
                    const isSelected = heroClass === cfg.id;
                    const Icon = CLASS_ICONS[cfg.id];
                    return (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => setHeroClass(cfg.id)}
                        className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer flex flex-col ${
                          isSelected
                            ? 'bg-[#1D2536] border-amber-400 ring-1 ring-amber-400/50'
                            : 'bg-[#151B26] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="relative h-24 w-full bg-[#0F141D] overflow-hidden">
                          <img
                            src={CLASS_PORTRAITS[cfg.id]}
                            alt={`${cfg.name} portrait`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#151B26] via-transparent to-transparent" />
                          <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between">
                            <span className="font-display text-sm font-bold text-slate-50">{cfg.name}</span>
                            <Icon className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                        </div>

                        <div className="p-2 space-y-1">
                          <div className="text-[11px] text-slate-300 truncate">{cfg.weaponType}</div>
                          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
                            <span>HP {cfg.baseHp}</span>
                            <span>ATK {cfg.baseAttack}</span>
                            <span>SPD {cfg.baseSpeed}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-lg bg-[#151B26] border border-white/10 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-100">
                    {selectedClassCfg.name} — {selectedClassCfg.playstyle}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSkills.actives.slice(0, 4).map((sk) => (
                      <div key={sk.id} className="p-2 rounded bg-[#0D1119] border border-white/5 text-[11px]">
                        <span className="font-bold text-amber-300 mr-1">[{sk.hotkey}]</span>
                        <span className="font-semibold text-slate-100">{sk.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {roster.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCreatingNew(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                  >
                    Create &amp; Save Hero
                  </button>
                </div>
              </form>
            ) : selectedHero ? (
              <div className="p-5 rounded-xl bg-[#0E131C] border border-white/10 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={CLASS_PORTRAITS[selectedHero.heroClass]}
                    alt={selectedHero.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover border border-amber-400/50 shrink-0"
                  />
                  <div>
                    <div className="text-xs font-mono-num text-amber-400">
                      Ready to Deploy · {realmCode}
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-50">{selectedHero.name}</h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Level {selectedHero.level}{' '}
                      {getJobBranchById(selectedHero.jobId)?.name || CLASS_CONFIG[selectedHero.heroClass].name} ·{' '}
                      {selectedHero.gold} Gold · {selectedHero.unlockedMounts.length} Mounts · {selectedHero.unlockedPets.length} Pets
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono-num text-xs">
                  <div className="p-2.5 rounded-lg bg-[#151B26]">
                    <div className="text-slate-400 text-[10px]">Kills</div>
                    <div className="text-slate-100 font-bold">{selectedHero.kills}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#151B26]">
                    <div className="text-slate-400 text-[10px]">Bosses</div>
                    <div className="text-orange-300 font-bold">{selectedHero.bossKills}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#151B26]">
                    <div className="text-slate-400 text-[10px]">Unlocked Jobs</div>
                    <div className="text-sky-300 font-bold">{selectedHero.unlockedJobs.length}/8</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#151B26]">
                    <div className="text-slate-400 text-[10px]">Completed Quests</div>
                    <div className="text-emerald-300 font-bold">{selectedHero.completedQuestIds.length}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#151B26] border border-white/5 text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-amber-300">Quick Adventure Tips</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    <li>Hold Left-Click / ATK to unleash continuous 3-hit combos without charging.</li>
                    <li>Press <strong className="text-slate-200">[Tab]</strong> to open the Adventurer Menu Hub or <strong className="text-slate-200">[L]</strong> to toggle Cursor Lock mode.</li>
                    <li>Click any NPC or hit the Sanctuary Fountain in 3D to interact or restore 100% HP/MP.</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
