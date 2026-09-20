/**
 * ГЛАВНЫЙ сторож покупки диалога: она обязана ВЕРНУТЬСЯ.
 *
 * зачем (владелец 2026-09-20): существующий контракт покупки был ЗЕЛЁНЫМ всё
 * время, пока кнопка была мертва — он проверял ТЕКСТ исходника (grep по файлу),
 * а не поведение. Самозахват замка такой проверкой не ловится в принципе.
 *
 * Здесь покупка вызывается ПО-НАСТОЯЩЕМУ, с активированной личностью.
 * Личность обязательна: без неё `buyDialogAccessLocally` честно отказывает на
 * ВХОДЕ (`identity_changed`) и до замков не доходит — тест был бы зелёным,
 * ничего не проверив. Ровно на это я и наступил при первой попытке, поэтому
 * здесь НЕТ ни одного тихого `return`: каждый тест обязан дойти до покупки.
 *
 * Если самозахват вернётся, тест не «упадёт с ошибкой», а перестанет
 * укладываться в таймаут — точный портрет бага: `step 6` есть, `step 7` нет.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Сеть в покупке не участвует по прямому решению владельца («телефон
// авторитетен»), но модуль импортирует firebase — глушим, чтобы тест не
// поднимал нативные модули.
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
  // Личность обязана быть активной — иначе покупка откажет на входе.
  expect(token.stableId).toBe(STABLE_ID);
  expect(token.phase).toBe('active');

  await mergeLevelSpinServerStars(token, { stars, starsSeq: 1 });
  return token;
}

describe('покупка диалога доходит до конца', () => {
  beforeEach(async () => {
    jest.resetModules();
    await AsyncStorage.clear();
  });

  it('ВОЗВРАЩАЕТСЯ и открывает доступ, а не висит на чтении баланса', async () => {
    const token = await setUpOwner(5523);
    const { buyDialogAccessLocally, getOwnedDialogIds } = require('../app/ai_dialog_ownership');
    const { readUnifiedLevelSpinStars } = require('../app/level_spin_star_grants');

    const result = await buyDialogAccessLocally('en', token, 'first_meeting', 5000);

    // Главное: мы ВООБЩЕ сюда дошли. При самозахвате вызов не возвращался.
    expect(result).toEqual({ ok: true, alreadyOwned: false, balance: 523 });

    const owned = await getOwnedDialogIds('en', STABLE_ID);
    expect(owned.has('first_meeting')).toBe(true);

    const { balance } = await readUnifiedLevelSpinStars(token);
    expect(balance).toBe(523);
  }, 20000);

  it('повторный тап НЕ снимает вторую цену', async () => {
    const token = await setUpOwner(12000);
    const { buyDialogAccessLocally } = require('../app/ai_dialog_ownership');

    const first = await buyDialogAccessLocally('en', token, 'first_meeting', 5000);
    const second = await buyDialogAccessLocally('en', token, 'first_meeting', 5000);

    expect(first).toEqual({ ok: true, alreadyOwned: false, balance: 7000 });
    // Цена снята ОДИН раз: 12000 - 5000, а не дважды.
    expect(second).toEqual({ ok: true, alreadyOwned: true, balance: 7000 });
  }, 20000);

  it('нехватка рун — честный отказ, а не зависание', async () => {
    const token = await setUpOwner(100);
    const { buyDialogAccessLocally } = require('../app/ai_dialog_ownership');

    const result = await buyDialogAccessLocally('en', token, 'first_meeting', 5000);
    expect(result).toEqual({ ok: false, reason: 'insufficient_runes' });
  }, 20000);

  it('два тапа ОДНОВРЕМЕННО не списывают цену дважды', async () => {
    const token = await setUpOwner(12000);
    const { buyDialogAccessLocally } = require('../app/ai_dialog_ownership');

    // Гонка: оба вызова стартуют до того, как первый успел записать владение.
    const [a, b] = await Promise.all([
      buyDialogAccessLocally('en', token, 'first_meeting', 5000),
      buyDialogAccessLocally('en', token, 'first_meeting', 5000),
    ]);

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('обе покупки обязаны завершиться');
    // Ровно одна из двух — настоящая трата, вторая узнаёт уже купленное.
    expect([a.alreadyOwned, b.alreadyOwned].sort()).toEqual([false, true]);
    expect(a.balance).toBe(7000);
    expect(b.balance).toBe(7000);
  }, 20000);
});
