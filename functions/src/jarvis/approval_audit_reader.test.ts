import { fetchRecentApprovalAudit, MAX_AUDIT_ENTRIES } from './approval_audit_reader';

function makeCollection(entries: readonly Record<string, unknown>[]) {
  const query = {
    orderBy: () => query,
    limit: () => query,
    get: async () => ({ docs: entries.map((data) => ({ data: () => data })) }),
  };
  return { collection: () => query } as unknown as FirebaseFirestore.Firestore;
}

describe('Jarvis approval audit reader — panel visibility into past confirmations (в187)', () => {
  test('returns entries in the shape the panel needs', async () => {
    const db = makeCollection([
      { department: 'payments', action: 'approve', outcome: 'accepted', atMs: 100, decisionHash: 'a' },
    ]);
    const entries = await fetchRecentApprovalAudit(db);
    expect(entries).toEqual([
      { department: 'payments', action: 'approve', outcome: 'accepted', atMs: 100, decisionHash: 'a' },
    ]);
  });

  test('drops malformed entries instead of crashing the panel', () => {
    return expect(fetchRecentApprovalAudit(makeCollection([
      { department: 'payments' }, // нет action/outcome/atMs — испорченная запись
      { department: 'safety', action: 'reject', outcome: 'expired', atMs: 5, decisionHash: 'b' },
    ]))).resolves.toEqual([
      { department: 'safety', action: 'reject', outcome: 'expired', atMs: 5, decisionHash: 'b' },
    ]);
  });

  test('a storage failure returns an empty list, not a thrown error', async () => {
    const brokenQuery = {
      orderBy: () => brokenQuery,
      limit: () => brokenQuery,
      get: async () => { throw new Error('down'); },
    };
    const broken = { collection: () => brokenQuery } as unknown as FirebaseFirestore.Firestore;
    await expect(fetchRecentApprovalAudit(broken)).resolves.toEqual([]);
  });

  test('the cap keeps the panel light', () => {
    expect(MAX_AUDIT_ENTRIES).toBeLessThanOrEqual(50);
  });
});
