/**
 * Сторож: прямая покупка диалога за руны ЗАКРЫТА (D124, PM-140).
 *
 * зачем ПЕРЕПИСАНО (2026-09-30): раньше файл проверял, что покупка за руны доходит до
 * конца, не виснет на замке хранилища и не списывает цену дважды. Владелец решил (D124):
 * доступ к диалогам — только по монетному рангу, старые покупки за руны не учитываются,
 * поэтому `buyDialogAccessLocally` теперь всегда отвечает `rank_access_only`. Сценарии
 * «возвращается и открывает доступ / повторный тап / нехватка рун / два тапа» описывали
 * удалённую функциональность и убраны. Остаётся то, что обязано быть верно всегда:
 * отказ честный и мгновенный, руны не списываются и владение не записывается.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Сеть в покупке не участвует, но модуль импортирует firebase — глушим,
// чтобы тест не поднимал нативные модули.
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({ data: {} }),
}));

const STABLE_ID = 'test-owner-stable-id';

async function setUpOwner(stars: number) {
  const { beginAccountGeneration } = require('../app/account_generation');
  const { mergeLevelSpinServerStars } = require('../app/level_spin_star_grants');

  const token = beginAccountGeneration(STABLE_ID);
  // Личность обязана быть активной — иначе отказ был бы identity_changed, а не rank_access_only.
  expect(token.stableId).toBe(STABLE_ID);
  expect(token.phase).toBe('active');

  await mergeLevelSpinServerStars(token, { stars, starsSeq: 1 });
  return token;
}

async function snapshot(): Promise<Record<string, string | null>> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  return Object.fromEntries(pairs);
}

describe('прямая покупка диалога за руны закрыта (D124)', () => {
  beforeEach(async () => {
    jest.resetModules();
    await AsyncStorage.clear();
  });

  it('отказывает rank_access_only, не списывает руны и не записывает владение', async () => {
    const token = await setUpOwner(12000);
    const { buyDialogAccessLocally, getOwnedDialogIds } = require('../app/ai_dialog_ownership');
    const before = await snapshot();

    const result = await buyDialogAccessLocally('en', token, 'first_meeting', 5000);

    expect(result).toEqual({ ok: false, reason: 'rank_access_only' });
    expect(await snapshot()).toEqual(before);
    expect((await getOwnedDialogIds('en', STABLE_ID)).has('first_meeting')).toBe(false);
  }, 20000);

  it('два тапа одновременно оба получают отказ и ничего не меняют', async () => {
    const token = await setUpOwner(12000);
    const { buyDialogAccessLocally } = require('../app/ai_dialog_ownership');
    const before = await snapshot();

    const results = await Promise.all([
      buyDialogAccessLocally('en', token, 'first_meeting', 5000),
      buyDialogAccessLocally('en', token, 'first_meeting', 5000),
    ]);

    expect(results).toEqual([
      { ok: false, reason: 'rank_access_only' },
      { ok: false, reason: 'rank_access_only' },
    ]);
    expect(await snapshot()).toEqual(before);
  }, 20000);
});
