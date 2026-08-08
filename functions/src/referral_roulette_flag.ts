import {
  referralRoulettePolicyFromData,
  type ReferralRouletteConfigData,
} from './referral_roulette_policy';

export type { ReferralRouletteConfigData } from './referral_roulette_policy';

/**
 * Missing keys remain ON for compatibility. An explicit boolean false is the
 * only stored value that disables the program; Firestore read failures are
 * handled separately and fail closed in resolveReferralRouletteEnabled.
 */
export function referralRouletteEnabledFromData(
  data: ReferralRouletteConfigData | undefined,
): boolean {
  const policy = referralRoulettePolicyFromData(data);
  return policy.softEnabled && !policy.emergencyStop;
}
