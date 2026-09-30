import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

/**
 * Referral cloud gate. Two conditions must hold:
 *  1. Referral is a local product surface; it is not remotely switched.
 *  2. Native Firebase available (cloud sync on, not Expo Go) — without it the
 *     referral_cloud modules (firestore_friends etc.) must not load in Jest.
 */
export function isReferralCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
