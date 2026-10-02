import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { getPremiumAccountTransitionEpoch } from './premium_guard';
import { resolveTesterNoPremiumOverride } from './tester_premium_override';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type PremiumActivationEventGuard = {
  accountToken: AccountGenerationToken;
  entitlementEpoch: number;
  eventEpoch: number;
  isCurrent: () => boolean;
};

export type PremiumActivationDisposition = 'activate' | 'reload' | 'stale';

export function capturePremiumActivationEventGuard(
  eventEpoch: number,
  getEventEpoch: () => number,
  isDisposed: () => boolean,
): PremiumActivationEventGuard {
  const accountToken = captureAccountGeneration();
  const entitlementEpoch = getPremiumAccountTransitionEpoch();
  return {
    accountToken,
    entitlementEpoch,
    eventEpoch,
    isCurrent: () => (
      !isDisposed()
      && getEventEpoch() === eventEpoch
      && getPremiumAccountTransitionEpoch() === entitlementEpoch
      && isCurrentAccountGeneration(accountToken)
    ),
  };
}

export async function readPremiumActivationDisposition(
  guard: PremiumActivationEventGuard,
  isStoreRelease: boolean,
): Promise<PremiumActivationDisposition> {
  if (!guard.isCurrent()) return 'stale';
  const entries = await AsyncStorage.multiGet(['tester_no_premium', 'tester_no_limits'])
    .catch(noteSwallowedAs('premium_activation_event_guard:promise_1', [] as [string, string | null][]));
  if (!guard.isCurrent()) return 'stale';
  const values = Object.fromEntries(entries);
  const noPremium = resolveTesterNoPremiumOverride(values.tester_no_premium, isStoreRelease);
  const noLimits = values.tester_no_limits === 'true';
  return noPremium || (noLimits && isStoreRelease) ? 'reload' : 'activate';
}
