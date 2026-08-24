/**
 * Lightweight, synchronous account-age peek for local product rules.
 * Uses the already-hydrated Firebase Auth user and never performs a network read.
 */
export function peekCurrentAccountCreatedAtMs(): number | null {
  try {
    const firebaseAuth = require('@react-native-firebase/auth').default;
    const currentUser = firebaseAuth()?.currentUser;
    const raw = currentUser?.metadata?.creationTime;
    const ms = typeof raw === 'number' ? raw : Date.parse(String(raw ?? ''));
    return Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : null;
  } catch {
    return null;
  }
}
