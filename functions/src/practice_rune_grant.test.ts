import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertPracticeRuneOwner,
  parsePracticeRuneComposite,
  practiceRuneLedgerOperation,
  practiceRuneOperationId,
  practiceRuneReplayMatches,
  splitPracticeRuneStarOperations,
  type PracticeRuneComposite,
} from './practice_rune_grant';
import {
  commitStarOperations,
  prepareStarOperations,
  STAR_OP_CLASS,
  STAR_OP_SOURCE,
} from './stars_ledger';

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
    createdAtMs: base.createdAtMs,
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

  test('легаси-расписка до привязки createdAt остаётся досылаемой', () => {
    const composite = makeComposite();
    const requestFingerprint = createHash('sha256').update(JSON.stringify({
      schemaVersion: 1,
      ownerStableId: composite.ownerStableId,
      activity: composite.activity,
      sessionKey: composite.sessionKey,
      completionOrdinal: composite.completionOrdinal,
      amount: composite.amount,
      reason: 'practice_session_reward',
    })).digest('hex');
    const legacy = Object.freeze({ ...composite, requestFingerprint });
    expect(parsePracticeRuneComposite(legacy)).toEqual(legacy);
  });

  test('подделанная сумма отвергается — отпечаток не сойдётся', () => {
    // Классическая подмена: взять честную расписку и вписать больше рун, не
    // пересчитывая её immutable fingerprint.
    const forged = { ...makeComposite(), amount: 99 };
    expect(() => parsePracticeRuneComposite(forged))
      .toThrow(/practice_rune_fingerprint_invalid/);
  });

  test('честная сумма выше прежнего потолка 180 принимается без урезания', () => {
    const composite = makeComposite({ amount: 600 });
    expect(parsePracticeRuneComposite(composite).amount).toBe(600);
  });

  test('структурно огромная сумма отвергается до выделения массива чанков', () => {
    const composite = makeComposite({ amount: Number.MAX_SAFE_INTEGER });
    expect(() => parsePracticeRuneComposite(composite))
      .toThrow(/practice_rune_structural_limit_exceeded/);
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

  test('сумма выше структурного лимита сохраняется точными детерминированными чанками', () => {
    const composite = makeComposite({ amount: 12_345 });
    const operations = splitPracticeRuneStarOperations(composite);
    expect(operations.map(({ delta }) => delta)).toEqual([5_000, 5_000, 2_345]);
    expect(operations.reduce((total, operation) => total + operation.delta, 0)).toBe(12_345);
    expect(operations.map(({ opId }) => opId)).toEqual(
      splitPracticeRuneStarOperations(composite).map(({ opId }) => opId),
    );
    expect(new Set(operations.map(({ opId }) => opId)).size).toBe(3);
    expect(operations.every((operation, index) => (
      operation.meta?.settlementOperationId === composite.operationId
      && operation.meta?.clientFingerprint === composite.requestFingerprint
      && operation.meta?.chunkIndex === index + 1
      && operation.meta?.chunkCount === 3
    ))).toBe(true);
  });

  test('все чанки 12 345 применяются и получают расписки в одной транзакции', async () => {
    const operations = splitPracticeRuneStarOperations(makeComposite({ amount: 12_345 }));
    const receiptRefs = new Map<string, { opId: string }>();
    const userRef = {
      collection: () => ({
        doc: (opId: string) => {
          const ref = { opId };
          receiptRefs.set(opId, ref);
          return ref;
        },
      }),
    };
    const tx = {
      get: jest.fn(async () => ({ exists: false })),
      set: jest.fn(),
      create: jest.fn(),
    };
    const prepared = await prepareStarOperations(
      tx as never,
      {} as never,
      'stable-user_1',
      { ref: userRef, data: () => ({}) } as never,
      operations,
      {
        nowMs: 1_700_000_000_000,
        activeSeasonId: 'season-1',
        weekKeyNow: '2026-W35',
        authUid: 'auth-1',
        deviceId: null,
      },
    );
    const result = commitStarOperations(tx as never, prepared);

    expect(result.outcomes.map(({ status }) => status)).toEqual(['applied', 'applied', 'applied']);
    expect(result.outcomes.reduce((sum, outcome) => sum + outcome.appliedDelta, 0)).toBe(12_345);
    expect(result.balance).toBe(12_345);
    expect(tx.set).toHaveBeenCalledTimes(1);
    expect(tx.create).toHaveBeenCalledTimes(3);
    expect(tx.create.mock.calls.map(([, data]) => data.delta)).toEqual([5_000, 5_000, 2_345]);
    expect(receiptRefs.size).toBe(3);
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

describe('practice rune client-authority contract', () => {
  test('сервер не вводит игровой потолок и не пишет legacy daily counter', () => {
    const source = readFileSync(join(__dirname, 'practice_rune_grant.ts'), 'utf8');
    expect(source).not.toContain('PRACTICE_RUNE_MAX_PER_SESSION');
    expect(source).not.toContain('PRACTICE_RUNE_MAX_PER_DAY');
    expect(source).not.toContain('practice_rune_daily_cap_reached');
    expect(source).not.toContain('practice_runes_daily:');
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
