/**
 * Сторож ставок рун 3/2/1 за правильный ответ по номеру прохождения (Ревизор, 05.11.2026; слово владельца, передал координатор).
 *
 * зачем: прежнее правило «первое прохождение +3, любое повторное +1» (решение владельца «против фарма») заменено: ставки по номеру
 * прохождения {1: 3, 2: 2, 3: 1, 4+: 1} во всех трёх разделах — уроки, словарь, неправильные глаголы. Клиент и сервер обязаны принимать
 * ровно эти значения (0 ≤ ставка ≤ 3, целое), расписка идемпотентна (один requestId/opId — одно начисление), один элемент платит один раз.
 *
 * Контракт принят Ядром (коммит 9e732ded6): practiceRuneAwardForPass + passNumber. Файл зелёный и ведёт гейт A6.
 * тест лежит локально и НЕ коммитится (красные в HEAD не кладём). Адаптер ниже ищет экспорт practiceRuneAwardForOrdinal(ordinal) или
 * параметр completionOrdinal у createPracticeRuneEarnings; если Ядро выберет другой API — поправить adapter() (одно место).
 */
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  parsePracticeRuneEarnings,
  practiceRuneSettlementOperationId,
  type PracticeRuneActivity,
} from '../app/practice_rune_earnings';
import * as fs from 'fs';
import * as path from 'path';
import * as earningsModule from '../app/practice_rune_earnings';

const SECTIONS: readonly PracticeRuneActivity[] = ['lesson', 'vocabulary', 'irregular_verbs'];
const RATES: ReadonlyArray<readonly [number, number]> = [[1, 3], [2, 2], [3, 1], [4, 1], [5, 1], [10, 1], [100, 1], [999, 1]];

/** Единственное место, зависящее от формы API Ядра. */
function awardFor(activity: PracticeRuneActivity, ordinal: number): number {
  const direct = (earningsModule as Record<string, unknown>).practiceRuneAwardForPass ?? (earningsModule as Record<string, unknown>).practiceRuneAwardForOrdinal;
  if (typeof direct === 'function') return (direct as (n: number) => number)(ordinal);
  const create = createPracticeRuneEarnings as unknown as (input: Record<string, unknown>) => { awardPerItem: number };
  return create({ activity, sessionKey: 'section-1', passNumber: ordinal }).awardPerItem;
}

describe('руны 3/2/1 по номеру прохождения', () => {
  it.each(SECTIONS)('%s: ставки {1:3, 2:2, 3:1, 4+:1}', (activity) => {
    expect(RATES.map(([ordinal]) => awardFor(activity, ordinal))).toEqual(RATES.map(([, rate]) => rate));
  });

  it.each(SECTIONS)('%s: ставка целая, 0 ≤ ставка ≤ 3 и не растёт с номером прохождения', (activity) => {
    let previous = Infinity;
    for (let ordinal = 1; ordinal <= 1000; ordinal += 1) {
      const rate = awardFor(activity, ordinal);
      expect(Number.isInteger(rate)).toBe(true);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(3);
      expect(rate).toBeLessThanOrEqual(previous);
      previous = rate;
    }
  });

  it.each(SECTIONS)('%s: копилка хранит и разбирает ставку 2 (и отвергает 0, 4, 1.5, "2")', (activity) => {
    const parse = (awardPerItem: unknown) => parsePracticeRuneEarnings(
      { schemaVersion: 'practice-rune-earnings.v1', activity, sessionKey: 'section-1', awardPerItem, creditedItemIds: [], pendingRunes: 0 },
      { activity, sessionKey: 'section-1' },
    );
    for (const ok of [1, 2, 3]) expect(parse(ok)).not.toBeNull();
    for (const bad of [0, 4, -1, 1.5, '2', null]) expect(parse(bad)).toBeNull();
  });

  it.each(SECTIONS)('%s: за верный ответ второго прохождения начисляется ровно +2, повтор того же элемента — 0', (activity) => {
    const create = createPracticeRuneEarnings as unknown as (input: Record<string, unknown>) => ReturnType<typeof createPracticeRuneEarnings>;
    const earnings = create({ activity, sessionKey: 'section-1', passNumber: 2 });
    const first = awardPracticeRune(earnings, 'item-1');
    expect(first.awarded).toBe(2);
    const again = awardPracticeRune(first.earnings, 'item-1');
    expect(again.awarded).toBe(0);
    expect(again.earnings.pendingRunes).toBe(2);
  });

  it.each(SECTIONS)('%s: идентификатор расписки идемпотентен по прохождению (тот же вход → тот же opId, разные номера → разные)', (activity) => {
    const id = (ordinal: number) => practiceRuneSettlementOperationId({ activity, sessionKey: 'section-1', completionOrdinal: ordinal });
    expect(id(2)).toBe(id(2));
    expect(new Set([id(1), id(2), id(3), id(4)]).size).toBe(4);
    expect(id(1)).toMatch(/^practice_rune:[A-Za-z0-9_-]{1,96}$/);
  });

  it('проводка: usePracticeRunes считает цену по номеру прохождения (passNumber), а не по булевому «первое/повтор»; сервер ограничивает сумму, а не набор ставок', () => {
    const hook = fs.readFileSync(path.resolve(__dirname, '..', 'hooks/usePracticeRunes.ts'), 'utf8');
    expect(hook).toContain('passNumber:');
    expect(hook).not.toMatch(/firstCompletion:s*true/);
    const server = fs.readFileSync(path.resolve(__dirname, '..', 'functions/src/practice_rune_grant.ts'), 'utf8');
    expect(server).not.toMatch(/awardPerItems*(===|!==)s*[13]/);
  });
});
