import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DEFAULT_UNLOCKED_ZONES } from '../data/zonesData';
import { STARTING_INVENTORY_SLOTS } from '../data/itemsData';
import type { SavedProfile } from '../shared/gameTypes';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
    }
  }
}
void testConnection();

export function mapAuthErrorMessage(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: string }).code)
      : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Authentication Console. You can sign in with Google or enable Email/Password in Firebase Auth.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed.';
  }
}

export function subscribeAuthState(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 48) });
  }
  try {
    await sendEmailVerification(cred.user);
  } catch {
    // Non-fatal if verification email rate-limited; user can resend from roster screen
  }
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signInAsGuest(): Promise<User> {
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function resendVerification(): Promise<void> {
  if (!auth.currentUser) return;
  await sendEmailVerification(auth.currentUser);
}

export async function reloadCurrentUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserDoc(user: User, lastServer = 'ELDER-MAIN'): Promise<void> {
  const canSync = Boolean(user && (user.emailVerified || user.isAnonymous));
  if (!canSync) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const email = (user.email || `${user.uid}@eldergrove.local`).slice(0, 160);
    const displayName = (user.displayName || (user.isAnonymous ? 'Guest Adventurer' : email.split('@')[0]) || 'Adventurer').slice(0, 48);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        lastServer: lastServer.slice(0, 24),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        email,
        displayName,
        lastServer: lastServer.slice(0, 24),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function loadCloudCharacters(uid: string): Promise<SavedProfile[]> {
  const user = auth.currentUser;
  const canSync = Boolean(user && (user.emailVerified || user.isAnonymous));
  if (!user || !canSync || user.uid !== uid) {
    return [];
  }
  const path = `users/${uid}/characters`;
  try {
    const q = query(collection(db, 'users', uid, 'characters'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const list: SavedProfile[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const updatedMs =
        d.updatedAt && typeof (d.updatedAt as Timestamp).toMillis === 'function'
          ? (d.updatedAt as Timestamp).toMillis()
          : Date.now();
      const slotCount = Math.max(
        STARTING_INVENTORY_SLOTS,
        typeof d.inventorySlots === 'number' ? d.inventorySlots : STARTING_INVENTORY_SLOTS
      );
      const rawInv = Array.isArray(d.inventory) ? d.inventory : [];
      const inventory = Array.from({ length: slotCount }, (_, i) => rawInv[i] || null);
      list.push({
        playerId: String(d.playerId || docSnap.id),
        name: String(d.name || 'Adventurer'),
        heroClass: d.heroClass || 'warrior',
        jobId: d.jobId ?? null,
        unlockedJobs: Array.isArray(d.unlockedJobs) ? d.unlockedJobs : [],
        level: Number(d.level || 1),
        xp: Number(d.xp || 0),
        gold: Number(d.gold || 0),
        potions: Number(d.potions ?? 3),
        kills: Number(d.kills || 0),
        bossKills: Number(d.bossKills || 0),
        statPoints: Number(d.statPoints || 0),
        skillPoints: Number(d.skillPoints || 0),
        stats: d.stats || { might: 0, vitality: 0, agility: 0 },
        unlockedSkillNodes: Array.isArray(d.unlockedSkillNodes) ? d.unlockedSkillNodes : [],
        unlockedMounts: Array.isArray(d.unlockedMounts) ? d.unlockedMounts : [],
        activeMount: d.activeMount ?? null,
        unlockedPets: Array.isArray(d.unlockedPets) ? d.unlockedPets : [],
        activePetId: d.activePet ?? null,
        petLevel: Number(d.petLevel || 1),
        petXp: Number(d.petXp || 0),
        weaponTier: Number(d.weaponTier || 0),
        armorTier: Number(d.armorTier || 0),
        gearBonuses: d.gearBonuses || {
          might: 0,
          vitality: 0,
          agility: 0,
          bestGearName: 'Traveler Emblem',
          bestGearRarity: 'common',
        },
        inventorySlots: slotCount,
        inventory,
        equipment: {
          weapon: d.equipment?.weapon ?? null,
          armor: d.equipment?.armor ?? null,
          accessory: d.equipment?.accessory ?? null,
          mountGear: d.equipment?.mountGear ?? null,
        },
        activeQuests: Array.isArray(d.activeQuests) ? d.activeQuests : [],
        completedQuestIds: Array.isArray(d.completedQuestIds) ? d.completedQuestIds : [],
        unlockedZones:
          Array.isArray(d.unlockedZones) && d.unlockedZones.length > 0
            ? d.unlockedZones
            : [...DEFAULT_UNLOCKED_ZONES],
        lastRealmCode: typeof d.lastRealm === 'string' ? d.lastRealm : 'ELDER-MAIN',
        updatedAt: updatedMs,
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveCloudCharacter(uid: string, profile: SavedProfile): Promise<void> {
  const user = auth.currentUser;
  const canSync = Boolean(user && (user.emailVerified || user.isAnonymous));
  if (!user || !canSync || user.uid !== uid) {
    return;
  }
  const path = `users/${uid}/characters/${profile.playerId}`;
  const ref = doc(db, 'users', uid, 'characters', profile.playerId);

  const mutablePayload = {
    name: profile.name.slice(0, 18),
    jobId: profile.jobId ? profile.jobId.slice(0, 40) : null,
    jobTier: Math.min(8, Math.max(0, profile.unlockedJobs?.length || (profile.jobId ? 1 : 0))),
    unlockedJobs: (profile.unlockedJobs || []).slice(0, 8),
    level: Math.min(99, Math.max(1, Math.floor(profile.level || 1))),
    xp: Math.max(0, Math.floor(profile.xp || 0)),
    potions: Math.min(999, Math.max(0, Math.floor(profile.potions ?? 3))),
    gold: Math.min(99999999, Math.max(0, Math.floor(profile.gold || 0))),
    kills: Math.max(0, Math.floor(profile.kills || 0)),
    bossKills: Math.max(0, Math.floor(profile.bossKills || 0)),
    statPoints: Math.min(500, Math.max(0, Math.floor(profile.statPoints || 0))),
    skillPoints: Math.min(200, Math.max(0, Math.floor(profile.skillPoints || 0))),
    stats: {
      might: Math.max(0, Math.floor(profile.stats?.might || 0)),
      vitality: Math.max(0, Math.floor(profile.stats?.vitality || 0)),
      agility: Math.max(0, Math.floor(profile.stats?.agility || 0)),
    },
    unlockedSkillNodes: (profile.unlockedSkillNodes || []).slice(0, 24),
    unlockedMounts: (profile.unlockedMounts || []).slice(0, 8),
    activeMount: profile.activeMount ? String(profile.activeMount).slice(0, 32) : null,
    unlockedPets: (profile.unlockedPets || []).slice(0, 8),
    activePet: profile.activePetId ? String(profile.activePetId).slice(0, 32) : null,
    petLevel: Math.min(99, Math.max(1, Math.floor(profile.petLevel || 1))),
    petXp: Math.max(0, Math.floor(profile.petXp || 0)),
    weaponTier: Math.min(60, Math.max(0, Math.floor(profile.weaponTier || 0))),
    armorTier: Math.min(60, Math.max(0, Math.floor(profile.armorTier || 0))),
    gearBonuses: {
      might: Number(profile.gearBonuses?.might || 0),
      vitality: Number(profile.gearBonuses?.vitality || 0),
      agility: Number(profile.gearBonuses?.agility || 0),
      bestGearName: String(profile.gearBonuses?.bestGearName || 'Traveler Emblem'),
      bestGearRarity: profile.gearBonuses?.bestGearRarity || 'common',
    },
    inventorySlots: Math.min(48, Math.max(30, Math.floor(profile.inventorySlots || 30))),
    inventory: (profile.inventory || []).slice(0, 48).map((slot) =>
      slot ? { itemId: String(slot.itemId), quantity: Math.max(1, Math.floor(slot.quantity)) } : null
    ),
    equipment: {
      weapon: profile.equipment?.weapon ?? null,
      armor: profile.equipment?.armor ?? null,
      accessory: profile.equipment?.accessory ?? null,
      mountGear: profile.equipment?.mountGear ?? null,
    },
    activeQuests: (profile.activeQuests || []).slice(0, 32),
    completedQuestIds: (profile.completedQuestIds || []).slice(0, 64),
    unlockedZones: (profile.unlockedZones && profile.unlockedZones.length > 0
      ? profile.unlockedZones
      : [...DEFAULT_UNLOCKED_ZONES]
    ).slice(0, 10),
    lastRealm: String(profile.lastRealmCode || 'ELDER-MAIN').slice(0, 24),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        playerId: profile.playerId,
        ownerId: uid,
        heroClass: profile.heroClass,
        createdAt: serverTimestamp(),
        ...mutablePayload,
      });
    } else {
      await setDoc(ref, {
        playerId: profile.playerId,
        ownerId: uid,
        heroClass: profile.heroClass,
        ...mutablePayload,
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCloudCharacter(uid: string, playerId: string): Promise<void> {
  const user = auth.currentUser;
  const canSync = Boolean(user && (user.emailVerified || user.isAnonymous));
  if (!user || !canSync || user.uid !== uid) {
    return;
  }
  const path = `users/${uid}/characters/${playerId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'characters', playerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
