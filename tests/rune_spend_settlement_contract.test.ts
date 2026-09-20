/**
 * Сторож РАСЧЁТА траты рун с сервером.
 *
 * Охраняет две противоположные ошибки, обе замеренные 2026-09-20 на живом коде:
 *
 * 1. Трата СТЁРТА чужим снапшотом. Первая версия снимала локальные траты при
 *    любом новом `serverSeq`. Дев-начисление 5000 после покупки давало 10523
 *    вместо 5523: сервер о покупке не знал, а его снапшот возвращал руны —
 *    диалог оставался открытым бесплатно.
 *
 * 2. Цена списана ДВАЖДЫ. Если не снять трату, которую сервер уже учёл,
 *    523 − 5000 уводит баланс в минус и роняет весь экран рун
 *    `level_spin_star_balance_invalid`.
 *
 * Между этими крайностями решает не догадка по seq, а поимённый список
 * `settledSpendOperationIds` от того, кто синхронизировал покупку.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({ data: { ok: true, stars: 523, starsSeq: 3 } }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

describe('расчёт траты рун с сервером', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('чужой снапшот НЕ стирает несинхронизированную трату', async () => {
    const { beginAccountGeneration } = require('../app/account_generation');
    const { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } =
      require('../app/level_spin_star_grants');
    const { buyDialogAccessLocally } = require('../app/ai_dialog_ownership');

    const token = beginAccountGeneration('settle-owner-a');
    await mergeLevelSpinServerStars(token, { stars: 5523, starsSeq: 1 });
    await buyDialogAccessLocally('en', token, 'first_meeting', 5000);
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(523);

    // Дев-начисление: сервер о покупке НЕ знает, его баланс 5523 + 5000.
    await mergeLevelSpinServerStars(token, { stars: 10523, starsSeq: 2 });

    // Трата обязана уцелеть: 10523 − 5000. Не 10523.
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(5523);
  }, 30000);

  it('синхронизация покупки снимает трату и НЕ списывает цену дважды', async () => {
    const { beginAccountGeneration } = require('../app/account_generation');
    const { mergeLevelSpinServerStars, readUnifiedLevelSpinStars } =
      require('../app/level_spin_star_grants');
    const { buyDialogAccessLocally, syncDialogPurchases } =
      require('../app/ai_dialog_ownership');

    const token = beginAccountGeneration('settle-owner-b');
    await mergeLevelSpinServerStars(token, { stars: 5523, starsSeq: 1 });
    await buyDialogAccessLocally('en', token, 'first_meeting', 5000);
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(523);

    // Сервер уже списал 5000 и вернул 523 — трата обязана сняться с overlay.
    await syncDialogPurchases('en', token);
    expect((await readUnifiedLevelSpinStars(token)).balance).toBe(523);
  }, 30000);
});
