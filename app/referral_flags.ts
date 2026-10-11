import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { isDevReferralOff } from './dev_social_state';

/**
 * Referral cloud gate. Two conditions must hold:
 *  1. Referral is a local product surface; it is not remotely switched.
 *  2. Native Firebase available (cloud sync on, not Expo Go) — without it the
 *     referral_cloud modules (firestore_friends etc.) must not load in Jest.
 */
export function isReferralCloudEnabled(): boolean {
  // зачем (координатор 12.10, R1 «нет пути»): dev `referral=off` — рубильник приглашений выключен (settings-gap-030, overlays-campaigns-025); в стор-сборке геттер выключен.
  if (isDevReferralOff()) return false;
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
