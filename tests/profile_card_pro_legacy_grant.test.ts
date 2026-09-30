import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileCardProStateKey, readProfileCardPro } from '../app/profile_card_pro_state_v1';
import { PROFILE_CARD_DEFAULT_PRO_STYLE } from '../app/profile_card_styles';
import { PROFILE_CARD_LEVEL_KEY } from '../app/profile_card_system';

// Решение владельца 30.09: «Про» получают все, кто покупал уровни старой визитки.
describe('profile card Pro — legacy buyers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('grants Pro with the default style to a legacy card buyer and persists it', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '2');
    const view = await readProfileCardPro('owner-1');
    expect(view).toEqual({ owned: true, style: PROFILE_CARD_DEFAULT_PRO_STYLE });
    const stored = JSON.parse(String(await AsyncStorage.getItem(profileCardProStateKey('owner-1'))));
    expect(stored.owned).toBe(true);
    expect(stored.purchase).toBeNull();
  });

  it('does not grant Pro without a legacy purchase', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '0');
    expect(await readProfileCardPro('owner-2')).toEqual({ owned: false, style: null });
    expect(await AsyncStorage.getItem(profileCardProStateKey('owner-2'))).toBeNull();
  });

  it('keeps an existing Pro record untouched', async () => {
    await AsyncStorage.setItem(PROFILE_CARD_LEVEL_KEY, '5');
    await AsyncStorage.setItem(profileCardProStateKey('owner-3'), JSON.stringify({
      schemaVersion: 'profile-card-pro.v1', ownerStableId: 'owner-3', owned: true, style: 'neon',
      purchase: { operationId: 'profile_card_pro:v1', price: 10000, atMs: 1, style: 'neon' },
    }));
    expect(await readProfileCardPro('owner-3')).toEqual({ owned: true, style: 'neon' });
  });
});
