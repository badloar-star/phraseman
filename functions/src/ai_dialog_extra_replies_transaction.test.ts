import type { DialogExtraRepliesOperationV1 } from './dialog_extra_replies_contract';
import { dialogExtraRepliesOperationFingerprint } from './dialog_extra_replies_contract';
import { materializeDialogExtraRepliesPurchase } from './ai_dialog_extra_replies';

type Stored = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly path: string) {}

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(`${this.path}/${name}`);
  }
}

class FakeCollectionRef {
  constructor(private readonly path: string) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(`${this.path}/${id}`);
  }
}

class FakeFirestore {
  readonly documents = new Map<string, Stored>();
  readonly reads: string[] = [];
  readonly creates: { path: string; value: Stored }[] = [];
  readonly sets: { path: string; value: Stored; merge: boolean }[] = [];

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(name);
  }

  async runTransaction<T>(callback: (tx: {
    get: (ref: FakeDocRef) => Promise<{ exists: boolean; data: () => Stored | undefined }>;
    create: (ref: FakeDocRef, value: Stored) => void;
    set: (ref: FakeDocRef, value: Stored, options?: { merge?: boolean }) => void;
  }) => Promise<T>): Promise<T> {
    return callback({
      get: async (ref) => {
        this.reads.push(ref.path);
        const value = this.documents.get(ref.path);
        return { exists: value !== undefined, data: () => value };
      },
      create: (ref, value) => {
        if (this.documents.has(ref.path)) throw new Error(`already_exists:${ref.path}`);
        this.creates.push({ path: ref.path, value });
        this.documents.set(ref.path, value);
      },
      set: (ref, value, options) => {
        const merge = options?.merge === true;
        this.sets.push({ path: ref.path, value, merge });
        this.documents.set(ref.path, merge
          ? { ...(this.documents.get(ref.path) ?? {}), ...value }
          : value);
      },
    });
  }
}

const NOW = Date.UTC(2026, 8, 20, 12);
const REQUEST_ID = 'der1234567890123456';

function operation(
  mutation: Partial<Omit<DialogExtraRepliesOperationV1, 'schemaVersion' | 'requestFingerprint'>> = {},
): DialogExtraRepliesOperationV1 {
  const unsigned = {
    operationId: `dialog_extra_replies:${REQUEST_ID}`,
    ownerStableId: 'account-a',
    accountGeneration: 1,
    requestId: REQUEST_ID,
    runeDelta: -300 as const,
    price: 300 as const,
    repliesGranted: 10 as const,
    balanceBefore: 600,
    balanceAfter: 300,
    reason: 'dialog_extra_replies' as const,
    createdAtMs: 100,
    ...mutation,
  };
  return {
    schemaVersion: 'client-dialog-extra-replies-rune-operation.v1',
    ...unsigned,
    requestFingerprint: dialogExtraRepliesOperationFingerprint(unsigned),
  };
}

function seededDb(): FakeFirestore {
  const db = new FakeFirestore();
  db.documents.set('users/account-a', {
    canonicalStableId: 'account-a',
    firebaseAuthUid: 'auth-a',
    stars: 0,
    runeBalance: 0,
  });
  return db;
}

test('transaction first-create persists the exact operation and only materializes its +10 grant', async () => {
  const db = seededDb();
  const exact = operation();
  const result = await materializeDialogExtraRepliesPurchase({
    db: db as unknown as FirebaseFirestore.Firestore,
    authUid: 'auth-a',
    data: { stableId: 'account-a', operation: exact },
    nowMs: NOW,
  });

  expect(result).toMatchObject({
    ok: true,
    alreadyPurchased: false,
    operationId: exact.operationId,
    requestFingerprint: exact.requestFingerprint,
    repliesGranted: 10,
    priceRunes: 300,
    quota: { remainingQuota: 20, quotaVersion: 1 },
  });
  expect(db.creates).toEqual([expect.objectContaining({
    path: `users/account-a/reward_claims/dialog_extra_replies_${REQUEST_ID}`,
    value: expect.objectContaining({ operation: exact }),
  })]);
  expect(db.sets).toHaveLength(1);
  expect(db.sets[0]).toMatchObject({
    value: { dailyCount: 0, extraCapToday: 10, quotaVersion: 1 },
    merge: true,
  });
  expect(db.reads).toHaveLength(3);
  expect(db.reads).toContain('users/account-a');
  expect(db.reads.some((path) => /wallet|star|rune|balance/i.test(path))).toBe(false);
  expect(db.sets.some(({ path }) => path === 'users/account-a')).toBe(false);
});

test('transaction exact replay returns the same receipt without a second grant', async () => {
  const db = seededDb();
  const exact = operation();
  const input = {
    db: db as unknown as FirebaseFirestore.Firestore,
    authUid: 'auth-a',
    data: { stableId: 'account-a', operation: exact },
    nowMs: NOW,
  };
  await materializeDialogExtraRepliesPurchase(input);
  db.creates.length = 0;
  db.sets.length = 0;

  await expect(materializeDialogExtraRepliesPurchase(input)).resolves.toMatchObject({
    ok: true, alreadyPurchased: true, operationId: exact.operationId,
  });
  expect(db.creates).toEqual([]);
  expect(db.sets).toEqual([]);
});

test('transaction rejects an idempotency conflict without materializing quota', async () => {
  const db = seededDb();
  const stored = operation({ accountGeneration: 2 });
  db.documents.set(`users/account-a/reward_claims/dialog_extra_replies_${REQUEST_ID}`, {
    operation: stored,
  });

  await expect(materializeDialogExtraRepliesPurchase({
    db: db as unknown as FirebaseFirestore.Firestore,
    authUid: 'auth-a',
    data: { stableId: 'account-a', operation: operation() },
    nowMs: NOW,
  })).rejects.toMatchObject({ code: 'already-exists' });
  expect(db.sets).toEqual([]);
  expect(db.creates).toEqual([]);
});

test('transaction rejects an auth-owner mismatch before any materialization', async () => {
  const db = seededDb();

  await expect(materializeDialogExtraRepliesPurchase({
    db: db as unknown as FirebaseFirestore.Firestore,
    authUid: 'auth-b',
    data: { stableId: 'account-a', operation: operation() },
    nowMs: NOW,
  })).rejects.toMatchObject({ code: 'permission-denied' });
  expect(db.sets).toEqual([]);
  expect(db.creates).toEqual([]);
});
