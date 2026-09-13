import fs from 'node:fs';
import path from 'node:path';

import { REVENUE_DAY_PASS_EXTRA, REVENUE_DAY_PASS_PRICE_PEARLS } from '../app/revenue_daily_limits';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

const mockCommit = jest.fn();
jest.mock('../app/shards_system', () => ({
  commitShardCompositeOperation: (...args: unknown[]) => mockCommit(...args),
  semanticShardOperationId: async (kind: string, subjectId: string) => `${kind}:${subjectId}`,
}));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/revenue_daily_quota', () => ({
  revenueDayPassStorageKey: (uid: string, kind: string, period: string) => `revenue_quota_pass:v1:${uid}:${kind}:${period}`,
}));

import { buyQuotaDayPass } from '../app/quota_day_pass';

describe('quota_day_pass — «дневной пропуск» по Economy Constitution', () => {
  beforeEach(() => mockCommit.mockReset());

  test('источник использует ТОЛЬКО композитную операцию, без spendShards', () => {
    const source = read('app/quota_day_pass.ts');
    expect(source).toContain('commitShardCompositeOperation');
    expect(source).not.toMatch(/\bspendShards(?:Idempotent)?\s*\(/);
    expect(source).not.toContain('FieldValue.increment');
    expect(read('app/economy/client_shard_semantic_reducer.ts')).toContain("case 'quota_day_pass': {");
    expect(read('app/shards_system.ts')).toContain("| 'quota_day_pass'");
  });

  test('дебет и grant идут одной операцией со стабильным id на окно', async () => {
    mockCommit.mockResolvedValue({ status: 'applied', balanceBefore: 50, balanceAfter: 30 });
    const result = await buyQuotaDayPass({ kind: 'speaking_attempts', stableUid: 'uid-a', period: '2026-09-13@Europe/Warsaw', isUnlimited: false });
    expect(result).toEqual({ ok: true, spent: REVENUE_DAY_PASS_PRICE_PEARLS.speaking_attempts, extra: REVENUE_DAY_PASS_EXTRA.speaking_attempts, alreadyOwned: false });
    expect(mockCommit).toHaveBeenCalledTimes(1);
    const input = mockCommit.mock.calls[0][0];
    expect(input.operationId).toBe('quota_day_pass:speaking_attempts:2026-09-13@Europe/Warsaw');
    expect(input.reason).toBe('quota_day_pass');
    expect(input.amount).toBe(REVENUE_DAY_PASS_PRICE_PEARLS.speaking_attempts);
    expect(input.grant).toEqual({
      kind: 'quota_day_pass',
      subjectId: 'speaking_attempts:2026-09-13@Europe/Warsaw',
      payload: { storageKey: 'revenue_quota_pass:v1:uid-a:speaking_attempts:2026-09-13@Europe/Warsaw', extra: 3 },
    });
  });

  test('повторная покупка того же окна — already-satisfied без второго списания', async () => {
    mockCommit.mockResolvedValue({ status: 'already-satisfied', balance: 30, balanceBefore: 30, balanceAfter: 30 });
    const result = await buyQuotaDayPass({ kind: 'flashcard_training_starts', stableUid: 'uid-a', period: '2026-09-13@Europe/Warsaw', isUnlimited: false });
    expect(result).toMatchObject({ ok: true, alreadyOwned: true });
  });

  test('нехватка жемчужин и Plus — честные отказы без операции', async () => {
    mockCommit.mockResolvedValue({ status: 'insufficient', balance: 2 });
    expect(await buyQuotaDayPass({ kind: 'speaking_attempts', stableUid: 'uid-a', period: '2026-09-13@Europe/Warsaw', isUnlimited: false }))
      .toEqual({ ok: false, reason: 'insufficient_shards' });
    mockCommit.mockReset();
    expect(await buyQuotaDayPass({ kind: 'speaking_attempts', stableUid: 'uid-a', period: '2026-09-13@Europe/Warsaw', isUnlimited: true }))
      .toEqual({ ok: false, reason: 'unlimited' });
    expect(await buyQuotaDayPass({ kind: 'speaking_attempts', stableUid: 'uid-a', period: 'today', isUnlimited: false }))
      .toEqual({ ok: false, reason: 'invalid_period' });
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
