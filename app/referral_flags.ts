import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { isReferralEnabled } from './remote_flags';

/**
 * Referral cloud gate. Two conditions must hold:
 *  1. Remote Config flag `referral_enabled` (admin panel → Remote Config) — lets
 *     referral be switched on/off live without a release. Default off until set.
 *  2. Native Firebase available (cloud sync on, not Expo Go) — without it the
 *     referral_cloud modules (firestore_friends etc.) must not load in Jest.
 */
export function isReferralCloudEnabled(): boolean {
  return isReferralEnabled() && CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
