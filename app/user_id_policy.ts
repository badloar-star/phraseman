import { getStableId } from './stable_id';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { rnfbInstance } from './rnfb_modular';

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
    // зачем (координатор §67): модульный getAuth() — без предупреждения «use getApp()» на вызов.
    const auth = rnfbInstance<{ currentUser?: { uid?: string } | null }>(require('@react-native-firebase/auth'), 'getAuth');
    return auth?.currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
