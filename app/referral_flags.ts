import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

/**
 * Реферал-облако активно только при нативном Firebase (не Expo Go) и включённом cloud sync.
 * Без нативного Firebase модули (firestore_friends и т.п.) не должны тянуть referral_cloud в Jest.
 */
export function isReferralCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
