import { createHash } from 'node:crypto';
import {
  assertPracticeRuneOwner,
  parsePracticeRuneComposite,
  practiceRuneLedgerOperation,
  practiceRuneOperationId,
  practiceRuneReplayMatches,
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
    // Классическая накрутка: взять честную расписку и вписать больше рун.
    const forged = { ...makeComposite(), amount: 250 };
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
