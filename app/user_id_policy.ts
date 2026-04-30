import { getStableId } from './stable_id';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

/**
 * Canonical user ID policy for Firestore user-scoped documents.
 * We always use stableId for users/* to avoid identity drift
 * between auth uid, anon_id and reinstall scenarios.
 */
export async function getCanonicalUserId(): Promise<string | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  return getStableId();
}

/**
 * Optional auth uid for subsystems that explicitly require Firebase Auth.
 * Must not be used as users/* document id.
 */
export function getAuthUserId(): string | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

let cachedArenaAuthUid: string | null = null;
let arenaAuthUidPromise: Promise<string | null> | null = null;

/** Сброс после sign-out / смены аккаунта (см. cloud_sync.resetAnonAuthCacheForSignOut). */
export function clearArenaAuthUidCache(): void {
  cachedArenaAuthUid = null;
  arenaAuthUidPromise = null;
}

/**
 * Auth uid для арены: matchmaking_queue, session_players, arena_sessions, arena_invites, arena_rooms.
 * firestore.rules для этих коллекций жёстко требуют request.auth.uid; stableId не подходит.
 * Дожидается signInAnonymously, чтобы не было PERMISSION_DENIED на холодном старте.
 * В Expo Go / при выключенном cloud sync возвращает stableId как fallback (для mock-сессий).
 *
 * ВАЖНО: нельзя отдавать кеш до проверки currentUser — после входа Google/Apple или после
 * signOut uid меняется, а старый кеш давал запись в очередь с чужим userId → PERMISSION_DENIED.
 */
export async function ensureArenaAuthUid(): Promise<string | null> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    return getStableId();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    const live = auth?.currentUser?.uid;
    if (typeof live === 'string' && live.length > 0) {
      cachedArenaAuthUid = live;
      return live;
    }
  } catch {
    return null;
  }

  // Сессии нет (выход или холодный старт до sign-in) — старый кеш недействителен.
  cachedArenaAuthUid = null;

  if (arenaAuthUidPromise) return arenaAuthUidPromise;

  arenaAuthUidPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const auth = require('@react-native-firebase/auth').default();
      await auth.signInAnonymously();
      const uid = auth?.currentUser?.uid;
      if (typeof uid === 'string' && uid.length > 0) {
        cachedArenaAuthUid = uid;
        return uid;
      }
      return null;
    } catch {
      return null;
    } finally {
      arenaAuthUidPromise = null;
    }
  })();

  return arenaAuthUidPromise;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
