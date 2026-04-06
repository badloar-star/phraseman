import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';
import { IS_EXPO_GO } from './config';

const RC_TIMEOUT_MS = 3000;

/**
 * Verifies premium status: tries RevenueCat first, falls back to
 * local AsyncStorage with expiry check. Updates AsyncStorage to reflect
 * the verified status so other code stays in sync.
 *
 * Referral bonus (premium_plan === 'referral_bonus') is validated
 * locally via expiry timestamp — RC is not aware of it.
 */
export async function getVerifiedPremiumStatus(): Promise<boolean> {
  const pairs = await AsyncStorage.multiGet(['premium_active', 'premium_plan', 'premium_expiry']);
  const active  = pairs.find(p => p[0] === 'premium_active')?.[1];
  const plan    = pairs.find(p => p[0] === 'premium_plan')?.[1];
  const expiry  = parseInt(pairs.find(p => p[0] === 'premium_expiry')?.[1] || '0');

  if (!IS_EXPO_GO) {
    try {
      const info = await Promise.race([
        Purchases.getCustomerInfo(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), RC_TIMEOUT_MS)),
      ]);
      if (info) {
        const rcActive =
          Object.keys((info as any).entitlements.active).length > 0 ||
          (info as any).activeSubscriptions.length > 0;

        if (rcActive) {
          await AsyncStorage.setItem('premium_active', 'true');
          return true;
        }

        // RC says not active — only allow unexpired referral bonus
        const isValidReferral = plan === 'referral_bonus' && expiry > Date.now();
        await AsyncStorage.setItem('premium_active', isValidReferral ? 'true' : 'false');
        return isValidReferral;
      }
    } catch {
      // RC unavailable — fall through to local check
    }
  }

  // Expo Go or RC unavailable: trust AsyncStorage with expiry validation
  if (active !== 'true') return false;
  if (expiry > 0 && expiry < Date.now()) {
    await AsyncStorage.setItem('premium_active', 'false');
    return false;
  }
  return true;
}
