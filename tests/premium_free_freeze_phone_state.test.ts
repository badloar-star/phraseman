import AsyncStorage from '@react-native-async-storage/async-storage';

const commitPhoneStateNonMonetaryEconomyGrant = jest.fn(async (_input: unknown) => true);
jest.mock('../app/phone_state_economy_bridge', () => ({
  commitPhoneStateNonMonetaryEconomyGrant: (input: unknown) => commitPhoneStateNonMonetaryEconomyGrant(input),
}));

import { commitPremiumFreeFreeze } from '../app/economy/premium_free_freeze';

test('premium free freeze journals exact result before one compatibility multi-write', async () => {
  await commitPremiumFreeFreeze('2026-08-21');

  expect(commitPhoneStateNonMonetaryEconomyGrant).toHaveBeenCalledWith({
    operationId: 'premium-freeze:2026-08-21',
    kind: 'premium_freeze',
    entitlementId: '2026-08-21',
    exactResult: { active: true, date: '2026-08-21' },
  });
  expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
    ['premium_free_freeze_used', 'true'],
    ['streak_freeze', JSON.stringify({ active: true, date: '2026-08-21' })],
  ]);
});
