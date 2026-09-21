/**
 * Сторож: ВСЕ покупки за руны действительно списывают руны.
 *
 * зачем (владелец 2026-09-20 → 21.09): 20.09 выяснилось, что четыре покупки
 * списывали через `mergeLevelSpinServerStars` — канал СЕРВЕРНЫХ снапшотов,
 * который без нового `starsSeq` молча ничего не менял. Покупка возвращала
 * «balance 523», а баланс оставался 5523: товар выдавался бесплатно.
 *
 * Покупка диалога тогда была проверена и на устройстве, и тестом. Остальные
 * три — только тестами их собственного кода, и вот в чём была дыра:
 * `runes_dialog_hint_contract` и `runes_mistake_explain_contract` читают
 * ТЕКСТ исходника (readFileSync + toContain) и ни разу не вызывают покупку.
 * Такая проверка была зелёной всё время, пока списание не работало.
 *
 * Здесь покупки вызываются ПО-НАСТОЯЩЕМУ и проверяется факт: баланс до,
 * баланс после, разница ровно в цену. Ни одного тихого `return`: без активной
 * личности покупка отсекается на входе, и тест был бы зелёным, ничего не
 * проверив (на это я уже наступал 20.09).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({ data: {} }),
}));

const OWNER = 'spend-owner';

async function setUp(stars: number) {
  const { beginAccountGeneration } = require('../app/account_generation');
  const { mergeLevelSpinServerStars } = require('../app/level_spin_star_grants');
  const token = beginAccountGeneration(OWNER);
  // Личность обязана быть активной: иначе покупка откажет на входе и тест
  // «пройдёт», не дойдя до списания.
  expect(token.stableId).toBe(OWNER);
  expect(token.phase).toBe('active');
  await mergeLevelSpinServerStars(token, { stars, starsSeq: 1 });
  return token;
}

async function balanceOf(token: unknown): Promise<number> {
  const { readUnifiedLevelSpinStars } = require('../app/level_spin_star_grants');
  const { balance } = await readUnifiedLevelSpinStars(token);
  return balance;
}

describe('покупки за руны реально списывают руны', () => {
  beforeEach(async () => {
    jest.resetModules();
    await AsyncStorage.clear();
  });

  it('подсказка в диалоге снимает свою цену', async () => {
    const { DIALOG_HINT_PRICE_RUNES, buyDialogHintLocally } =
      require('../app/ai_dialog_hint_economy');
    const token = await setUp(1000);

    const before = await balanceOf(token);
    const result = await buyDialogHintLocally('en', token);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('покупка подсказки обязана пройти');
    const after = await balanceOf(token);

    // Главное: баланс ДЕЙСТВИТЕЛЬНО уменьшился, а не только в ответе функции.
    expect(before - after).toBe(DIALOG_HINT_PRICE_RUNES);
    expect(result.balance).toBe(after);
  }, 30000);

  it('разбор ошибки снимает свою цену', async () => {
    const { MISTAKE_EXPLAIN_PRICE_RUNES, buyMistakeExplainLocally } =
      require('../app/ai_mistake_explain_limit_session');
    const token = await setUp(1000);

    const before = await balanceOf(token);
    const result = await buyMistakeExplainLocally(token);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('покупка разбора обязана пройти');
    const after = await balanceOf(token);

    expect(before - after).toBe(MISTAKE_EXPLAIN_PRICE_RUNES);
    expect(result.balance).toBe(after);
  }, 30000);

  it('набор карточек снимает свою цену', async () => {
    const { buyCommunityPackLocally } = require('../app/community_packs/packPurchase');
    const token = await setUp(5000);
    const PRICE = 300;

    const before = await balanceOf(token);
    const result = await buyCommunityPackLocally(token, 'pack-under-test', PRICE);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('покупка набора обязана пройти');
    const after = await balanceOf(token);

    expect(before - after).toBe(PRICE);
    expect(result.balance).toBe(after);
  }, 30000);

  it('нехватка рун — честный отказ, баланс НЕ трогается', async () => {
    const { buyDialogHintLocally } = require('../app/ai_dialog_hint_economy');
    const token = await setUp(1);

    const before = await balanceOf(token);
    const result = await buyDialogHintLocally('en', token);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('при нехватке рун покупка обязана отказать');
    expect(result.reason).toBe('insufficient_runes');
    // Отказ не смеет ничего списывать.
    expect(await balanceOf(token)).toBe(before);
  }, 30000);

  it('повторная покупка набора НЕ снимает вторую цену', async () => {
    const { buyCommunityPackLocally } = require('../app/community_packs/packPurchase');
    const token = await setUp(5000);
    const PRICE = 300;

    const first = await buyCommunityPackLocally(token, 'pack-twice', PRICE);
    const afterFirst = await balanceOf(token);
    const second = await buyCommunityPackLocally(token, 'pack-twice', PRICE);
    const afterSecond = await balanceOf(token);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error('повтор обязан вернуть уже купленное');
    expect(second.alreadyOwned).toBe(true);
    // Цена снята РОВНО один раз.
    expect(afterSecond).toBe(afterFirst);
  }, 30000);
});
