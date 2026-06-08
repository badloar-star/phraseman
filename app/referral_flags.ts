import { isReferralEnabled } from './remote_flags';

/**
 * Referral cloud gate. Driven by the Remote Config flag `referral_enabled`
 * (admin panel → Remote Config), so referral can be switched on/off live
 * without a release. Default stays off until the flag is set true.
 */
export function isReferralCloudEnabled(): boolean {
  return isReferralEnabled();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
