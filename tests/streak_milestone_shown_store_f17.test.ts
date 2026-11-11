// F17 (решение владельца 11.11 «Стирать»): отметка «веха серии уже показана» (app/streak_milestone_shown_store.ts) — ключ
// «число:день» без игрока. Она стирается при выходе и смене аккаунта, чтобы второй аккаунт на том же телефоне, дошедший до
// той же вехи в тот же день, увидел своё поздравление. Сработал — чини логику, а не сторожа.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ACCOUNT_SWITCH_LEAK_KEYS } from '../app/account_switch_leak_keys';
import {
  STREAK_MILESTONE_SHOWN_KEY,
  markStreakMilestoneShownOnDisk,
  wasStreakMilestoneShown,
} from '../app/streak_milestone_shown_store';

describe('F17 · отметка вехи серии и смена аккаунта', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('ключ отметки входит в список стирания при выходе и смене аккаунта', () => {
    expect(ACCOUNT_SWITCH_LEAK_KEYS).toContain(STREAK_MILESTONE_SHOWN_KEY);
  });

  it('A отпраздновал веху — после стирания списка B в тот же день видит свою', async () => {
    const key = '30:2026-11-11';
    await markStreakMilestoneShownOnDisk(key);
    expect(await wasStreakMilestoneShown(key)).toBe(true);
    // то, что делает выход/смена аккаунта: стирает ключи списка
    await AsyncStorage.multiRemove([...ACCOUNT_SWITCH_LEAK_KEYS]);
    expect(await wasStreakMilestoneShown(key)).toBe(false);
  });

  it('тот же игрок без смены аккаунта повторно веху не видит', async () => {
    const key = '30:2026-11-11';
    await markStreakMilestoneShownOnDisk(key);
    await markStreakMilestoneShownOnDisk(key);
    expect(await wasStreakMilestoneShown(key)).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(STREAK_MILESTONE_SHOWN_KEY))!)).toEqual([key]);
  });
});
