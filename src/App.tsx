import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { PUBLIC_REALM_CODE } from './shared/gameTypes';
import type { SavedProfile } from './shared/gameTypes';
import { saveCharacterToRoster } from './client/profileStorage';
import { saveCloudCharacter, signOutAccount, subscribeAuthState } from './client/firebase';
import { TitleScreen } from './components/TitleScreen';
import type { TitleStage } from './components/TitleScreen';
import { GameView } from './components/GameView';

export default function App() {
  const initialRealmCode = useMemo(() => {
    if (typeof window === 'undefined') return PUBLIC_REALM_CODE;
    const params = new URLSearchParams(window.location.search);
    const r = params.get('realm');
    return r ? r.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || PUBLIC_REALM_CODE : PUBLIC_REALM_CODE;
  }, []);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [titleStage, setTitleStage] = useState<TitleStage>('title');
  const [session, setSession] = useState<{
    profile: SavedProfile;
    realmCode: string;
  } | null>(null);

  const lastCloudSaveRef = useRef<number>(0);

  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setSession(null);
      }
    });
    return unsub;
  }, []);

  const handleEnterRealm = useCallback(
    (profile: SavedProfile, realmCode: string) => {
      if (authUser) {
        saveCharacterToRoster(authUser.uid, profile);
        if (authUser.emailVerified || authUser.isAnonymous) {
          void saveCloudCharacter(authUser.uid, profile).catch(() => {});
        }
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('realm', realmCode);
        window.history.replaceState({}, '', url.toString());
      }
      setSession({ profile, realmCode });
    },
    [authUser]
  );

  const handleProfileSync = useCallback(
    (profile: SavedProfile) => {
      if (!authUser) return;
      saveCharacterToRoster(authUser.uid, profile);
      const now = Date.now();
      if ((authUser.emailVerified || authUser.isAnonymous) && now - lastCloudSaveRef.current > 6000) {
        lastCloudSaveRef.current = now;
        void saveCloudCharacter(authUser.uid, profile).catch(() => {});
      }
    },
    [authUser]
  );

  const flushAndExit = useCallback(
    (nextStage: TitleStage) => {
      if (authUser && session && (authUser.emailVerified || authUser.isAnonymous)) {
        void saveCloudCharacter(authUser.uid, session.profile).catch(() => {});
      }
      setTitleStage(nextStage);
      setSession(null);
    },
    [authUser, session]
  );

  const handleLogout = useCallback(async () => {
    if (authUser && session && (authUser.emailVerified || authUser.isAnonymous)) {
      await saveCloudCharacter(authUser.uid, session.profile).catch(() => {});
    }
    await signOutAccount();
    setTitleStage('auth');
    setSession(null);
  }, [authUser, session]);

  if (!authReady) {
    return (
      <div className="min-h-screen w-screen bg-[#0B0E14] text-slate-300 flex items-center justify-center text-sm font-mono-num">
        Awakening Eldergrove Sanctuary...
      </div>
    );
  }

  if (!session) {
    return (
      <TitleScreen
        initialStage={titleStage}
        initialRealmCode={initialRealmCode}
        authUser={authUser}
        onEnterRealm={handleEnterRealm}
      />
    );
  }

  return (
    <GameView
      initialProfile={session.profile}
      realmCode={session.realmCode}
      onProfileSync={(updated) => {
        setSession((prev) => (prev ? { ...prev, profile: updated } : prev));
        handleProfileSync(updated);
      }}
      onBackToCharacters={() => flushAndExit('roster')}
      onChangeServer={() => flushAndExit('roster')}
      onLogout={() => void handleLogout()}
    />
  );
}
