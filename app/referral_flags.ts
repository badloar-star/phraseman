import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { isReferralEnabled } from './remote_flags';

/**
 * Referral cloud gate.
 * - Requires native Firebase (not Expo Go) and cloud sync enabled.
 * - Also gated by the Remote Config flag `referral_enabled` (admin panel),
 *   so referral can be switched on/off live without a release. Default: off.
 */
export function isReferralCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO && isReferralEnabled();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
