import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCompassAutoOpened, shouldAutoOpenCompass } from '../app/compass_auto_open';

describe('Compass daily auto-open', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('opens once per local day and scopes the receipt to the account', async () => {
    const base = { studyTarget: 'en', localDayKey: '2026-08-13' };
    expect(await shouldAutoOpenCompass({ stableId: 'account-a', ...base })).toBe(true);
    expect(await markCompassAutoOpened({ stableId: 'account-a', ...base })).toBe(true);
    expect(await shouldAutoOpenCompass({ stableId: 'account-a', ...base })).toBe(false);
    expect(await shouldAutoOpenCompass({ stableId: 'account-b', ...base })).toBe(true);
    expect(await shouldAutoOpenCompass({ stableId: 'account-a', studyTarget: 'fr', localDayKey: '2026-08-13' })).toBe(true);
    expect(await shouldAutoOpenCompass({ stableId: 'account-a', studyTarget: 'en', localDayKey: '2026-08-14' })).toBe(true);
  });

  it('fails closed for invalid identity/day inputs', async () => {
    expect(await shouldAutoOpenCompass({ stableId: '', studyTarget: 'en', localDayKey: '2026-08-13' })).toBe(false);
    expect(await shouldAutoOpenCompass({ stableId: 'a', studyTarget: '', localDayKey: '2026-08-13' })).toBe(false);
    expect(await shouldAutoOpenCompass({ stableId: 'a', studyTarget: 'en', localDayKey: 'today' })).toBe(false);
  });
});
