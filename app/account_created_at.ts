import { rnfbInstance } from './rnfb_modular';
/**
 * Lightweight, synchronous account-age peek for local product rules.
 * Uses the already-hydrated Firebase Auth user and never performs a network read.
 */
export function peekCurrentAccountCreatedAtMs(): number | null {
  try {
    // зачем (координатор §67): модульный getAuth() — без «use getApp()» на вызов.
    const currentUser = rnfbInstance<{ currentUser?: { metadata?: { creationTime?: unknown } } | null }>(
      require('@react-native-firebase/auth'),
      'getAuth',
    )?.currentUser;
    const raw = currentUser?.metadata?.creationTime;
    const ms = typeof raw === 'number' ? raw : Date.parse(String(raw ?? ''));
    return Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : null;
  } catch {
    return null;
  }
}
