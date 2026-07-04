/**
 * nickname_guard.ts — надёжная доставка имени в серверный name_index.
 *
 * Закрепляет два инварианта фикса «поиск по нику не находит всех»:
 *  1. НАДЁЖНОСТЬ: запись в индекс ретраится при каждом запуске, пока сервер не
 *     подтвердит ('ok'/'taken'); 'error' НЕ помечает синк — повтор при следующем вызове.
 *  2. БЕЗ УТЕЧКИ БЕСПЛАТНОЙ СМЕНЫ: source:'onboarding' уходит на сервер ТОЛЬКО при
 *     реальной смене/первой установке имени. Повторная сверка того же имени идёт БЕЗ
 *     source — иначе сервер (leaderboard.ts grantsFreeChange) перевыдавал бы бесплатную
 *     смену ника после каждого переименования, обнуляя 14-дневный кулдаун.
 */
const mockReserveNameDetailed = jest.fn();

jest.mock('../app/firestore_leaderboard', () => ({
  reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
}));

beforeEach(() => {
  jest.resetModules();
  mockReserveNameDetailed.mockReset();
  require('@react-native-async-storage/async-storage').__reset?.();
  jest.mock('../app/firestore_leaderboard', () => ({
    reserveNameDetailed: (...args: unknown[]) => mockReserveNameDetailed(...args),
  }));
});

async function seedStoredName(name: string): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default
    ?? require('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem('user_name', name);
}

test('первая установка имени: reserveNameDetailed вызывается с source:onboarding', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  const name = await ensureLocalNickname('Roma');
  expect(name).toBe('Roma');
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('Roma', '', { source: 'onboarding' });
});

test('после подтверждённого синка повторный запуск НЕ дёргает сервер', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma');
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);

  await ensureLocalNickname(); // обычный запуск, имя не менялось
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1); // без лишнего вызова
});

test('сорвавшаяся запись ("error") ретраится при следующем запуске — и БЕЗ source:onboarding', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'error' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma'); // попытка 1 (смена имени → onboarding)
  expect(mockReserveNameDetailed).toHaveBeenNthCalledWith(1, 'Roma', '', { source: 'onboarding' });

  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  await ensureLocalNickname(); // запуск 2: имя то же → ретрай, но уже БЕЗ onboarding
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
  expect(mockReserveNameDetailed).toHaveBeenNthCalledWith(2, 'Roma', 'Roma', {});

  await ensureLocalNickname(); // запуск 3: подтверждено → тишина
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
});

test('статус "taken" тоже останавливает ретраи (имя в индексе есть)', async () => {
  mockReserveNameDetailed.mockResolvedValue({ status: 'taken' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname('Roma');
  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
});

test('сверка уже сохранённого имени (маркера нет) идёт БЕЗ source:onboarding — нет перевыдачи бесплатной смены', async () => {
  // Эмулируем состояние после переименования в настройках: user_name уже обновлён
  // напрямую (мимо ensureLocalNickname), маркер синка отсутствует.
  await seedStoredName('NewName');
  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(1);
  expect(mockReserveNameDetailed).toHaveBeenCalledWith('NewName', 'NewName', {});
});

test('исключение из reserveNameDetailed не ломает ensureLocalNickname и ретраится потом', async () => {
  mockReserveNameDetailed.mockRejectedValue(new Error('network'));
  const { ensureLocalNickname } = require('../app/nickname_guard');

  await expect(ensureLocalNickname('Roma')).resolves.toBe('Roma');

  mockReserveNameDetailed.mockResolvedValue({ status: 'ok' });
  await ensureLocalNickname();
  expect(mockReserveNameDetailed).toHaveBeenCalledTimes(2);
});
