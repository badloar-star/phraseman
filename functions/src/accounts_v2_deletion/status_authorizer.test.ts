import {
  ACCOUNTS_V2_DELETION_PURPOSE,
  buildCompletedDeletionReceipt,
  buildPendingDeletionReceipt,
  type DeletionReceiptRecord,
} from './receipt';
import {
  ACCOUNTS_V2_DELETION_STATUS_MAX_ATTEMPTS,
  ACCOUNTS_V2_DELETION_STATUS_WINDOW_MS,
  decideDeletionStatus,
} from './status_authorizer';

/*
 * Account V2, Пакет 4 — предикат ключа удаления (решение 13).
 * зачем: ключ даёт право ТОЛЬКО узнать этап и дотолкнуть удаление. Голый
 * operationId, почта, чужой/новый uid, неверная цель, неверный секрет,
 * истёкшая квитанция — отказ. Каждый отказ здесь проверяется отдельно.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_790_000_000_000;
const UID = 'OldUid1234567890abcdefghijkl';
const key = (seed: number): string => Buffer.from(Array.from({ length: 32 }, (_unused, i) => (i * 31 + seed * 17 + 1) & 255)).toString('base64url');
const CRED = { operationId: 'op-0123456789abcdef', capability: key(1) };
const REQ = { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED };

function pending(): DeletionReceiptRecord {
  return buildPendingDeletionReceipt(UID, CRED, NOW);
}

describe('decideDeletionStatus — выдача', () => {
  test('верный ключ: этап + право дотолкнуть + цель, счётчик попыток растёт', () => {
    const decision = decideDeletionStatus(REQ, pending(), NOW + 1);
    expect(decision).toMatchObject({ kind: 'granted', stage: 'accepted', mayNudge: true, target: UID });
    expect(decision.update).toMatchObject({ attempts: 1, rateWindowStartedAtMs: NOW + 1 });
  });

  test('завершённая квитанция: только этап, цели нет, толкать нечего', () => {
    const done = buildCompletedDeletionReceipt(pending(), NOW + DAY);
    const decision = decideDeletionStatus(REQ, done, NOW + 2 * DAY);
    expect(decision).toMatchObject({ kind: 'granted', stage: 'completed', mayNudge: false, target: null });
  });

  test('Ремонт №1 P2-1: v2_purged — этап виден, но толкать больше нечего', () => {
    const purged = { ...pending(), stage: 'v2_purged' as const };
    expect(decideDeletionStatus(REQ, purged, NOW)).toMatchObject({ kind: 'granted', stage: 'v2_purged', mayNudge: false });
  });

  test('uid вызывающего (новый uid той же почты) не влияет ни на что', () => {
    const withCaller = decideDeletionStatus({ ...REQ, callerAuthUid: 'NewUidSameEmail000000000000' }, pending(), NOW);
    expect(withCaller).toMatchObject({ kind: 'granted', target: UID });
    const callerOnly = decideDeletionStatus(
      { purpose: ACCOUNTS_V2_DELETION_PURPOSE, operationId: CRED.operationId, callerAuthUid: UID },
      pending(),
      NOW,
    );
    expect(callerOnly).toMatchObject({ kind: 'denied', reason: 'malformed' });
  });
});

describe('decideDeletionStatus — отказы', () => {
  test.each([
    ['неверная цель', { ...REQ, purpose: 'account_read' }, 'wrong_purpose'],
    ['цель отсутствует', { operationId: CRED.operationId, capability: CRED.capability }, 'wrong_purpose'],
    ['голый operationId', { purpose: ACCOUNTS_V2_DELETION_PURPOSE, operationId: CRED.operationId }, 'malformed'],
    ['почта', { purpose: ACCOUNTS_V2_DELETION_PURPOSE, email: 'a@b.c' }, 'malformed'],
    ['неверный секрет', { ...REQ, capability: key(9) }, 'wrong_secret'],
  ])('%s', (_name, request, reason) => {
    expect(decideDeletionStatus(request, pending(), NOW)).toMatchObject({ kind: 'denied', reason });
  });

  test('квитанции нет (чужая/несуществующая операция)', () => {
    expect(decideDeletionStatus(REQ, null, NOW)).toMatchObject({ kind: 'denied', reason: 'not_found', update: null });
  });

  test('ключ другой операции к этой квитанции — отказ', () => {
    const otherOp = { ...REQ, operationId: 'op-fedcba9876543210' };
    expect(decideDeletionStatus(otherOp, pending(), NOW)).toMatchObject({ kind: 'denied', reason: 'wrong_operation' });
  });

  test('квитанция с другой целью (не deletion_status) — отказ', () => {
    const foreign = { ...pending(), purpose: 'something_else' } as unknown as DeletionReceiptRecord;
    expect(decideDeletionStatus(REQ, foreign, NOW)).toMatchObject({ kind: 'denied', reason: 'corrupt' });
  });

  test('истёкшая квитанция: отказ даже с верным ключом (TTL Firestore ленив)', () => {
    const done = buildCompletedDeletionReceipt(pending(), NOW);
    expect(decideDeletionStatus(REQ, done, NOW + 30 * DAY - 1)).toMatchObject({ kind: 'granted' });
    expect(decideDeletionStatus(REQ, done, NOW + 30 * DAY)).toMatchObject({ kind: 'denied', reason: 'expired' });
  });

  test('неверный секрет тратит попытку (перебор ограничен)', () => {
    const decision = decideDeletionStatus({ ...REQ, capability: key(9) }, pending(), NOW);
    expect(decision.update).toMatchObject({ attempts: 1 });
  });

  test('лимит частоты: после потолка — rate_limited даже с верным ключом, окно сбрасывается', () => {
    const hot = { ...pending(), attempts: ACCOUNTS_V2_DELETION_STATUS_MAX_ATTEMPTS, rateWindowStartedAtMs: NOW };
    expect(decideDeletionStatus(REQ, hot, NOW + 1)).toMatchObject({ kind: 'rate_limited', update: null });
    const later = decideDeletionStatus(REQ, hot, NOW + ACCOUNTS_V2_DELETION_STATUS_WINDOW_MS);
    expect(later).toMatchObject({ kind: 'granted', update: { attempts: 1 } });
  });

  test('pending без открываемой цели — отказ corrupt', () => {
    const broken = { ...pending(), targetSealed: 'AAAA' };
    expect(decideDeletionStatus(REQ, broken, NOW)).toMatchObject({ kind: 'denied', reason: 'corrupt' });
  });
});
