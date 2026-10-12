// ════════════════════════════════════════════════════════════════════════════
// paywall_refill_lock_hang.test.ts — доказательство самой взаимной блокировки после оплаты (координатор 12.10).
//
// Пополнение энергии БЕЗ lease внутри замка покупки RevenueCat ждёт хвост очереди = конец внешней работы → вечное
// ожидание. Отдельный файл (ревью 2cdc42fac п.3): тест навсегда оставляет замок модуля account_generation занятым,
// поэтому в одном файле с другими тестами замка он вешал бы всё, что идёт после него. Каждый файл jest — свой реестр модулей.
// ════════════════════════════════════════════════════════════════════════════
/* eslint-disable import/first */
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getAppUserID: async () => 'stable-refill-hang' },
}));

import { beginAccountGeneration } from '../app/account_generation';
import { persistPremiumEnergyRefill } from '../app/energy_premium_refill';
import { commitRevenueCatResultForGeneration } from '../app/revenuecat_account_identity';

const HANG = Symbol('hang');

it('без lease внутри замка покупки пополнение энергии висит (поэтому держатель обязан передать lease)', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const token = beginAccountGeneration('stable-refill-hang');
  let timer: ReturnType<typeof setTimeout> | null = null;
  const result = await Promise.race([
    commitRevenueCatResultForGeneration(token, async (isCurrent) => (
      (await persistPremiumEnergyRefill({ isCurrent, accountToken: token, readDynMax: async () => 5 })) !== null
    )),
    new Promise<typeof HANG>((resolve) => { timer = setTimeout(() => resolve(HANG), 1_000); }),
  ]);
  if (timer) clearTimeout(timer);
  expect(result).toBe(HANG);
});
