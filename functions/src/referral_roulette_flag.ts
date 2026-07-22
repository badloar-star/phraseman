export type ReferralRouletteConfigData = {
  numbers?: Record<string, unknown>;
};

/**
 * Missing keys remain ON for compatibility. An explicit boolean false is the
 * only stored value that disables the program; Firestore read failures are
 * handled separately and fail closed in resolveReferralRouletteEnabled.
 */
export function referralRouletteEnabledFromData(
  data: ReferralRouletteConfigData | undefined,
): boolean {
  return data?.numbers?.referral_roulette_enabled !== false;
}
