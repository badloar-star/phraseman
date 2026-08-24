import AsyncStorage from '@react-native-async-storage/async-storage';

import { commitPhoneStateNonMonetaryEconomyGrant } from '../phone_state_economy_bridge';

export async function commitPremiumFreeFreeze(date: string): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('premium_free_freeze_date_invalid');
  const exactResult = Object.freeze({ active: true, date });
  await commitPhoneStateNonMonetaryEconomyGrant({
    operationId: `premium-freeze:${date}`,
    kind: 'premium_freeze',
    entitlementId: date,
    exactResult,
  });
  await AsyncStorage.multiSet([
    ['premium_free_freeze_used', 'true'],
    ['streak_freeze', JSON.stringify(exactResult)],
  ]);
}
