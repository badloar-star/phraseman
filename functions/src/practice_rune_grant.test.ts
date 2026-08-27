import { createHash } from 'node:crypto';
import {
  assertPracticeRuneOwner,
  parsePracticeRuneComposite,
  practiceRuneLedgerOperation,
  practiceRuneOperationId,
  practiceRuneDayKey,
  practiceRuneReplayMatches,
  readPracticeRuneDaily,
  PRACTICE_RUNE_MAX_PER_DAY,
  PRACTICE_RUNE_MAX_PER_SESSION,
  type PracticeRuneComposite,
} from './practice_rune_grant';
import { STAR_OP_CLASS, STAR_OP_SOURCE } from './stars_ledger';

function makeComposite(over: Partial<PracticeRuneComposite> = {}): PracticeRuneComposite {
  const base = {
    schemaVersion: 'client-practice-rune-operation.v1' as const,
    ownerStableId: 'stable-user_1',
    activity: 'vocabulary' as const,
    sessionKey: 'lesson-1',
    completionOrdinal: 1,
    amount: 12,
    reason: 'practice_session_reward' as const,
    createdAtMs: 1_700_000_000_000,
    ...over,
  };
  const operationId = practiceRuneOperationId({
    activity: base.activity,
    sessionKey: base.sessionKey,
    completionOrdinal: base.completionOrdinal,
  });
  const requestFingerprint = createHash('sha256').update(JSON.stringify({
    schemaVersion: 1,
    ownerStableId: base.ownerStableId,
    activity: base.activity,
    sessionKey: base.sessionKey,
    completionOrdinal: base.completionOrdinal,
    amount: base.amount,
    reason: 'practice_session_reward',
  })).digest('hex');
  return Object.freeze({
    ...base,
    operationId: over.operationId ?? operationId,
    requestFingerprint: over.requestFingerprint ?? requestFingerprint,
  }) as PracticeRuneComposite;
}

describe('practice rune composite validation', () => {
  test('корректная расписка принимается', () => {
    const composite = makeComposite();
    expect(parsePracticeRuneComposite(composite)).toEqual(composite);
  });

  test('подделанная сумма отвергается — отпечаток не сойдётся', () => {
    // Классическая накрутка: взять честную расписку и вписать больше рун, не
    // выходя за потолок сессии — иначе сработает более ранняя проверка
    // потолка, а не отпечатка, и тест перестанет проверять то, что заявлен.
    const forged = { ...makeComposite(), amount: 99 };
    expect(() => parsePracticeRuneComposite(forged))
      .toThrow(/practice_rune_fingerprint_invalid/);
  });

  test('сумма выше потолка сессии отвергается', () => {
    const forged = makeComposite({ amount: PRACTICE_RUNE_MAX_PER_SESSION + 1 });
    expect(() => parsePracticeRuneComposite(forged))
      .toThrow(/practice_rune_composite_invalid/);
  });

  test('нулевая и отрицательная сумма отвергается', () => {
    for (const amount of [0, -5]) {
      expect(() => parsePracticeRuneComposite(makeComposite({ amount })))
        .toThrow(/practice_rune_composite_invalid/);
    }
  });

  test('неизвестная активность отвергается', () => {
    const forged = { ...makeComposite(), activity: 'arena_match' };
    expect(() => parsePracticeRuneComposite(forged))
      .toThrow(/practice_rune_composite_invalid/);
  });

  test('подменённый operationId отвергается', () => {
    const forged = makeComposite({ operationId: 'practice_rune:vocabulary:other:1' });
    expect(() => parsePracticeRuneComposite(forged))
      .toThrow(/practice_rune_composite_invalid/);
  });

  test('лишние и недостающие поля отвергаются', () => {
    const extra = { ...makeComposite(), sneaked: true };
    expect(() => parsePracticeRuneComposite(extra))
      .toThrow(/practice_rune_composite_invalid/);
    const { amount: _dropped, ...missing } = makeComposite();
    expect(() => parsePracticeRuneComposite(missing))
      .toThrow(/practice_rune_composite_invalid/);
  });

  test('мусор вместо расписки не роняет функцию', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}]) {
      expect(() => parsePracticeRuneComposite(raw))
        .toThrow(/practice_rune_composite_invalid/);
    }
  });

  test('sessionKey с путевым разделителем отвергается', () => {
    expect(() => parsePracticeRuneComposite(makeComposite({ sessionKey: 'a/b' })))
      .toThrow(/practice_rune_composite_invalid/);
  });

  test('sessionKey длиннее 72 символов отвергается — иначе opId переполнил бы лимит журнала', () => {
    const sessionKey = 'a'.repeat(73);
    expect(() => parsePracticeRuneComposite(makeComposite({
      sessionKey,
      operationId: practiceRuneOperationId({
        activity: 'vocabulary', sessionKey, completionOrdinal: 1,
      }),
    }))).toThrow(/practice_rune_composite_invalid/);
  });

  test('sessionKey ровно 72 символа принимается', () => {
    const sessionKey = 'a'.repeat(72);
    const composite = makeComposite({
      sessionKey,
      operationId: practiceRuneOperationId({
        activity: 'vocabulary', sessionKey, completionOrdinal: 1,
      }),
    });
    expect(parsePracticeRuneComposite(composite)).toEqual(composite);
  });
});

describe('practice rune ledger mapping', () => {
  test('операция журнала помечена причиной practice_session', () => {
    const op = practiceRuneLedgerOperation(makeComposite());
    expect(op.reason).toBe('practice_session');
    expect(op.delta).toBe(12);
    expect(op.sourceKind).toBe('practice_vocabulary');
  });

  test('practice_session — заработок и идёт в строку «учёба»', () => {
    // Решение владельца 2026-08-27: занятие оплачено трудом, значит обязано
    // двигать очки лиги наравне с сессией курса.
    expect(STAR_OP_CLASS.practice_session).toBe('earn');
    expect(STAR_OP_SOURCE.practice_session).toBe('learning');
  });

  test('повтор той же расписки распознаётся как дубль', () => {
    const composite = makeComposite();
    const op = practiceRuneLedgerOperation(composite);
    expect(practiceRuneReplayMatches({
      opId: op.opId,
      delta: op.delta,
      reason: 'practice_session',
      sourceKind: op.sourceKind,
      sourceId: op.sourceId,
      meta: op.meta,
    }, composite)).toBe(true);
  });

  test('расписка с другой суммой дублем НЕ считается', () => {
    const composite = makeComposite();
    const op = practiceRuneLedgerOperation(composite);
    expect(practiceRuneReplayMatches({
      opId: op.opId,
      delta: 999,
      reason: 'practice_session',
      sourceKind: op.sourceKind,
      sourceId: op.sourceId,
      meta: op.meta,
    }, composite)).toBe(false);
  });

  test('второе прохождение — отдельная законная расписка', () => {
    expect(practiceRuneOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 1,
    })).not.toBe(practiceRuneOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 2,
    }));
  });
});

describe('practice rune opId contract with the ledger', () => {
  // Сторож блокера, найденного аудитом 2026-08-27: формат с тремя двоеточиями
  // отвергался валидатором журнала, и НИ ОДНА руна не начислялась бы ни на
  // одном из семи экранов. Прежние тесты этого не ловили, потому что проверяли
  // reason/delta/дедуп, но никогда не прогоняли opId через OP_ID_RE.
  const LEDGER_OP_ID_RE = /^[a-z0-9_]{1,32}:[A-Za-z0-9_.-]{1,96}$/;

  test('opId проходит валидатор журнала для каждой активности', () => {
    for (const activity of ['lesson', 'vocabulary', 'irregular_verbs',
      'flashcards_blitz', 'flashcards_training', 'mistake_practice',
      'speaking_practice'] as const) {
      const opId = practiceRuneOperationId({
        activity, sessionKey: 'lesson-1', completionOrdinal: 1,
      });
      expect(LEDGER_OP_ID_RE.test(opId)).toBe(true);
      expect(opId.startsWith('__')).toBe(false);
    }
  });

  test('opId остаётся валидным при максимальном ключе сессии и самой длинной активности', () => {
    // SESSION_KEY допускает максимум 72 символа (см. practice_rune_grant.ts) —
    // это ровно наихудший случай для самой длинной активности.
    const opId = practiceRuneOperationId({
      activity: 'flashcards_training',
      sessionKey: 'a'.repeat(72),
      completionOrdinal: 999,
    });
    expect(LEDGER_OP_ID_RE.test(opId)).toBe(true);
  });

  test('в opId ровно одно двоеточие', () => {
    const opId = practiceRuneOperationId({
      activity: 'vocabulary', sessionKey: 'lesson-1', completionOrdinal: 2,
    });
    expect(opId.split(':')).toHaveLength(2);
  });

  test('операция журнала целиком проходит валидатор', () => {
    const op = practiceRuneLedgerOperation(makeComposite());
    expect(LEDGER_OP_ID_RE.test(op.opId)).toBe(true);
  });
});

describe('practice rune daily cap', () => {
  test('счётчик суток стартует с нуля на новом дне', () => {
    const state = readPracticeRuneDaily({ dayKey: '2026-08-26', earned: 880 }, '2026-08-27');
    expect(state).toEqual({ dayKey: '2026-08-27', earned: 0 });
  });

  test('счётчик того же дня продолжается', () => {
    const state = readPracticeRuneDaily({ dayKey: '2026-08-27', earned: 120 }, '2026-08-27');
    expect(state.earned).toBe(120);
  });

  test('битый и подделанный счётчик читается как ноль, а не как отрицательный', () => {
    for (const raw of [null, 'x', [], { dayKey: '2026-08-27', earned: -50 },
      { dayKey: '2026-08-27', earned: 1.5 }, {}]) {
      expect(readPracticeRuneDaily(raw, '2026-08-27').earned).toBe(0);
    }
  });

  test('ключ дня — календарные сутки UTC', () => {
    expect(practiceRuneDayKey(Date.UTC(2026, 7, 27, 23, 59))).toBe('2026-08-27');
    expect(practiceRuneDayKey(Date.UTC(2026, 7, 28, 0, 1))).toBe('2026-08-28');
  });

  test('суточный потолок держит паритет с Ареной', () => {
    // ARENA_DAILY_STAR_CAP = 160 (functions/src/arena_stars_v3.ts). Учёба не
    // должна обгонять Арену — иначе игроки Арены проваливаются в лиге, а
    // арена-пропуск качается учёбой (аудит 2026-08-27).
    expect(PRACTICE_RUNE_MAX_PER_DAY).toBe(160);
  });

  test('потолок сессии не превышает суточный', () => {
    // Иначе одна сессия выбирала бы весь день и потолок сессии терял смысл.
    expect(PRACTICE_RUNE_MAX_PER_SESSION).toBeLessThanOrEqual(
      PRACTICE_RUNE_MAX_PER_DAY + PRACTICE_RUNE_MAX_PER_SESSION,
    );
    // Самая щедрая честная сессия — 53 глагола × 3 = 159 рун.
    expect(PRACTICE_RUNE_MAX_PER_SESSION).toBeGreaterThanOrEqual(159);
  });
});

describe('practice rune ownership', () => {
  test('чужая расписка отклоняется', () => {
    expect(() => assertPracticeRuneOwner('stable-user_2', makeComposite()))
      .toThrow(/practice_rune_owner_mismatch/);
  });

  test('своя расписка проходит', () => {
    expect(() => assertPracticeRuneOwner('stable-user_1', makeComposite()))
      .not.toThrow();
  });
});
