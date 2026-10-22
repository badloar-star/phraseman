import { readFileSync } from 'fs';
import { join } from 'path';
import {
  EMPTY_COIN_WALLET_LIMITS,
  applyCoinWalletLimits,
  assertCoinWalletOperationShape,
  classifyCoinWalletSource,
} from './coin_wallet_policy';
import { lessonPairKey, lessonTogetherWalletRequestId } from './friends_lesson_together_core';

// ЗАМОК ВЛАДЕЛЬЦА 22.10: «сервер для сохранения, а не решений… монеты и всё остальное выдаётся телефоном… сервер
// сохраняет для синхронизации, чтобы не потерялось» (исключение А3: ответы курса Learning V2 остаются на сервере).
// Сторож падает, если «Урок вместе» снова начисляет монеты сервером или кошелёк начинает отказывать по дневному потолку.
// Ослабить или удалить — только по новому слову владельца (docs/work/OWNER_LOCKS.md).

const src = (file: string): string => readFileSync(join(__dirname, file), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const key = lessonTogetherWalletRequestId(lessonPairKey('uid-a', 'uid-b'), '2026-10-22', 'uid-a');
const op = { requestId: key, lane: 'base' as const, giftId: 'stars_2', amount: 2, promotionEligibility: 'gameplay' as const };

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10 «сервер хранит, телефон решает» — «Друзья» и кошелёк', () => {
  test('кошелёк принимает «Урок вместе» по ключу телефона', () => {
    const cls = classifyCoinWalletSource(key);
    expect(cls).toEqual({ source: 'lesson_together', subSource: 'friends' });
    expect(() => assertCoinWalletOperationShape(op, cls)).not.toThrow();
  });

  test('дневной счётчик — только пометка: сотая операция за сутки тоже принята', () => {
    const cls = classifyCoinWalletSource(key);
    const now = Date.parse('2026-10-22T12:00:00Z');
    let state = EMPTY_COIN_WALLET_LIMITS;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      for (let i = 0; i < 100; i += 1) state = applyCoinWalletLimits(state, op, cls, now, 0);
    } finally {
      warn.mockRestore();
    }
    expect(state.lessonTogetherDayCoins).toBe(200);
  });

  test('форма записи остаётся проверкой целостности (stars_2, сумма 2) — это хранение, не решение', () => {
    const cls = classifyCoinWalletSource(key);
    expect(() => assertCoinWalletOperationShape({ ...op, giftId: 'stars_1000', amount: 1000 }, cls)).toThrow('coin_wallet_source_shape_invalid');
  });

  test('сервер «Урока вместе» и дуэли не пишет в журнал монет и не сверяет занятие', () => {
    for (const file of ['friends_lesson_together.ts', 'friends_lesson_together_core.ts', 'friends_duel.ts', 'friends_duel_core.ts']) {
      const code = src(file);
      expect([file, /from '\.\/stars_ledger'|prepareStarOperations|commitStarOperations/.test(code)]).toEqual([file, false]);
      expect([file, /LessonCompletionReader|judgeLessonClaim|readRequiredSessionCompletionFact/.test(code)]).toEqual([file, false]);
    }
  });

  test('серверного claim награды нет в экспортах функций', () => {
    expect(src('index.ts')).not.toMatch(/friendsLessonTogetherClaim/);
  });
});
