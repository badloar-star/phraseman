import { HttpsError } from 'firebase-functions/v2/https';
import fs from 'node:fs';
import path from 'node:path';
import {
  ADMIN_SHARD_REFUND_MAX_ROWS,
  ADMIN_SHARD_REFUND_RANGE_DAYS,
  adminListShardRefundsHandler,
  type AdminShardRefundDependencies,
} from './admin_shard_refunds';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW_MS = 2_000_000_000_000;

function auth(role: string, admin = true) {
  return { uid: `${role}-uid`, token: { admin, adminRole: role } };
}

function dependencies(rows: readonly Record<string, unknown>[]) {
  const calls: Array<{ sinceMs: number; untilMs: number; limit: number }> = [];
  const deps: AdminShardRefundDependencies = {
    now: () => NOW_MS,
    loadRows: async (sinceMs, untilMs, limit) => {
      calls.push({ sinceMs, untilMs, limit });
      return rows;
    },
  };
  return { deps, calls };
}

describe('adminListShardRefunds', () => {
  it('uses the sealed AppCheck-off admin options and the verified money.read seam', () => {
    const source = fs.readFileSync(path.join(__dirname, 'admin_shard_refunds.ts'), 'utf8');
    expect(source).toContain('export const adminListShardRefunds = onCall(\n  ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain("hasVerifiedCallablePermission(auth, 'money.read')");
    expect(source).not.toContain('ENFORCE_APP_CHECK');
  });

  it('allows owner and analyst money.read but rejects support and unverified callers', async () => {
    const { deps } = dependencies([]);
    await expect(adminListShardRefundsHandler({ rangeDays: 90, cap: 10 }, auth('owner'), deps)).resolves.toMatchObject({ ok:true });
    await expect(adminListShardRefundsHandler({ rangeDays: 90, cap: 10 }, auth('analyst'), deps)).resolves.toMatchObject({ ok:true });
    await expect(adminListShardRefundsHandler({ rangeDays: 90, cap: 10 }, auth('support'), deps)).rejects.toBeInstanceOf(HttpsError);
    await expect(adminListShardRefundsHandler({ rangeDays: 90, cap: 10 }, { token:{ admin:true, adminRole:'owner' } }, deps)).rejects.toBeInstanceOf(HttpsError);
  });

  it('owns the exact 90-day inclusive bounds and requests only cap+1 rows', async () => {
    const { deps, calls } = dependencies([]);
    const result = await adminListShardRefundsHandler(
      { rangeDays: ADMIN_SHARD_REFUND_RANGE_DAYS, cap: ADMIN_SHARD_REFUND_MAX_ROWS },
      auth('analyst'),
      deps,
    );
    expect(calls).toEqual([{
      sinceMs: NOW_MS - ADMIN_SHARD_REFUND_RANGE_DAYS * DAY_MS,
      untilMs: NOW_MS,
      limit: ADMIN_SHARD_REFUND_MAX_ROWS + 1,
    }]);
    expect(result.sourceHealth).toMatchObject({ state:'ready', complete:true, truncated:false });
    await expect(adminListShardRefundsHandler({ rangeDays: 89, cap: 10 }, auth('owner'), deps)).rejects.toBeInstanceOf(HttpsError);
    await expect(adminListShardRefundsHandler({ rangeDays: 90, cap: 0 }, auth('owner'), deps)).rejects.toBeInstanceOf(HttpsError);
  });

  it('returns a bounded safe projection without identities, transaction IDs, hashes, or raw docs', async () => {
    const raw = {
      eventId:'evt-secret', originalTransactionId:'tx-secret', uid:'stable-secret', sourceUid:'source-secret',
      uidHash:'hash-secret', email:'private@example.com', productId:'shards_500', requestedDebit:500,
      eventTimestampMs:NOW_MS - 1_000, reason:'refund', environment:'PRODUCTION', extraBearer:'never-return',
    };
    const { deps } = dependencies([raw]);
    const result = await adminListShardRefundsHandler({ rangeDays:90, cap:10 }, auth('analyst'), deps);
    expect(result.rows).toEqual([{
      rowKey:'shard-refund-1', productId:'shards_500', requestedDebit:500,
      eventTimestampMs:NOW_MS - 1_000, reason:'refund', serial:false, buyerRefundCount:1,
    }]);
    const serialized = JSON.stringify(result);
    for (const secret of ['evt-secret','tx-secret','stable-secret','source-secret','hash-secret','private@example.com','never-return']) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('marks cap sentinel and invalid rows partial without publishing exact serial counts', async () => {
    const rows = [
      { uid:'same', productId:'a', requestedDebit:10, eventTimestampMs:NOW_MS - 1, reason:'refund' },
      { uid:'same', productId:'b', requestedDebit:20, eventTimestampMs:NOW_MS - 2, reason:'refund' },
      { uid:'ignored-sentinel', productId:'c', requestedDebit:30, eventTimestampMs:NOW_MS - 3, reason:'refund' },
    ];
    const { deps } = dependencies(rows);
    const result = await adminListShardRefundsHandler({ rangeDays:90, cap:2 }, auth('owner'), deps);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.serial === null && row.buyerRefundCount === null)).toBe(true);
    expect(result.sourceHealth).toMatchObject({ state:'partial', complete:false, truncated:true, count:2 });

    const invalid = dependencies([{ uid:'x', requestedDebit:-1, eventTimestampMs:NOW_MS + 1 }]);
    const invalidResult = await adminListShardRefundsHandler({ rangeDays:90, cap:2 }, auth('owner'), invalid.deps);
    expect(invalidResult.rows).toEqual([]);
    expect(invalidResult.sourceHealth).toMatchObject({ state:'partial', complete:false, droppedCount:1 });
  });

  it('emits exact serial counts only when the entire bounded source is complete', async () => {
    const rows = [
      { uid:'same', productId:'a', requestedDebit:10, eventTimestampMs:NOW_MS - 1, reason:'refund' },
      { uid:'same', productId:'b', requestedDebit:20, eventTimestampMs:NOW_MS - 2, reason:'refund' },
    ];
    const { deps } = dependencies(rows);
    const result = await adminListShardRefundsHandler({ rangeDays:90, cap:3 }, auth('owner'), deps);
    expect(result.sourceHealth).toMatchObject({ state:'ready', complete:true, truncated:false });
    expect(result.rows.every((row) => row.serial === true && row.buyerRefundCount === 2)).toBe(true);
  });
});
