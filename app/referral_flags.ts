import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

/** Без нативного Firebase — чтобы модули вроде firestore_friends не тянули referral_cloud в Jest. */
export function isReferralCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
