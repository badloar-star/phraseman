import { consumeApprovalToken, issueApprovalToken, JARVIS_APPROVAL_COLLECTION } from './approval_store';
import { buildApprovalToken, hashNonce } from './approval_token';

const NOW = 1_800_000_000_000;
const OWNER = { telegramUserId: '374480287', telegramChatId: '374480287' };

/**
 * Двойник Firestore с настоящей транзакцией: get внутри транзакции видит
 * актуальное состояние, а update применяется атомарно. Иначе тест на двойное
 * нажатие был бы бессмысленным.
 */
function makeDb(initial: Record<string, unknown> = {}) {
  const store = new Map<string, Record<string, unknown>>(Object.entries(initial) as never);
  let busy = false;
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({ path: `${name}/${id}`, id }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      if (busy) throw new Error('конкурентная транзакция — двойник не поддерживает');
      busy = true;
      try {
        const tx = {
          get: async (ref: { path: string }) => {
            const data = store.get(ref.path);
            return { exists: data !== undefined, data: () => data };
          },
          update: (ref: { path: string }, patch: Record<string, unknown>) => {
            store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...patch });
          },
          set: (ref: { path: string }, value: Record<string, unknown>) => {
            store.set(ref.path, value);
          },
        };
        return await fn(tx);
      } finally {
        busy = false;
      }
    },
  } as unknown as FirebaseFirestore.Firestore;
  return { db, store };
}

function seeded() {
  const built = buildApprovalToken({
    nonce: 'n'.repeat(32),
    decisionHash: 'abc',
    department: 'payments',
    action: 'approve',
    ownerTelegramUserId: OWNER.telegramUserId,
    ownerTelegramChatId: OWNER.telegramChatId,
    nowMs: NOW,
  });
  const path = `${JARVIS_APPROVAL_COLLECTION}/${built.doc.nonceHash}`;
  const { db, store } = makeDb({ [path]: { ...built.doc } });
  return { built, path, db, store };
}

describe('Jarvis approval store — one press, one effect, even under a double tap', () => {
  test('stores the token under the hash, never under the raw nonce', async () => {
    const { db, store } = makeDb();
    const issued = await issueApprovalToken({
      db,
      decisionHash: 'abc',
      department: 'payments',
      action: 'approve',
      ownerTelegramUserId: OWNER.telegramUserId,
      ownerTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW,
    });
    const expectedPath = `${JARVIS_APPROVAL_COLLECTION}/${hashNonce(issued.nonce)}`;
    expect(store.has(expectedPath)).toBe(true);
    expect([...store.keys()].join()).not.toContain(issued.nonce);
  });

  test('a valid press succeeds and marks the token used', async () => {
    const { db, store } = seeded();
    const path = `${JARVIS_APPROVAL_COLLECTION}/${hashNonce('n'.repeat(32))}`;
    const result = await consumeApprovalToken({
      db,
      nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1_000,
    });
    expect(result.ok).toBe(true);
    // Погашение должно быть видно в хранилище, а не только в ответе.
    expect(store.get(path)?.usedAtMs).toBe(NOW + 1_000);
  });

  test('the second press of the same button does nothing', async () => {
    const { db } = seeded();
    const first = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1_000,
    });
    const second = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 2_000,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error('ожидался отказ');
    expect(second.reason).toBe('already_used');
  });

  test('callback action cannot be flipped while reusing a valid nonce', async () => {
    const { db, store, path } = seeded();
    const result = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32), requestedAction: 'reject',
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1_000,
    });
    expect(result).toEqual({ ok: false, reason: 'unknown_nonce' });
    expect(store.get(path)?.usedAtMs).toBeUndefined();
  });

  test('a press by a stranger is refused and does NOT burn the token', async () => {
    // зачем: иначе чужой мог бы «сжечь» вашу кнопку, просто нажав её.
    const { db } = seeded();
    const stranger = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32),
      fromTelegramUserId: '999',
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 1_000,
    });
    expect(stranger.ok).toBe(false);

    const owner = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 2_000,
    });
    expect(owner.ok).toBe(true);
  });

  test('an unknown nonce is refused without touching anything', async () => {
    const { db } = makeDb();
    const result = await consumeApprovalToken({
      db, nonce: 'z'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('ожидался отказ');
    expect(result.reason).toBe('unknown_nonce');
  });

  test('an expired token is refused', async () => {
    const { db } = seeded();
    const result = await consumeApprovalToken({
      db, nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW + 60 * 60 * 1000,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('ожидался отказ');
    expect(result.reason).toBe('expired');
  });

  test('a storage failure is refused, never silently approved', async () => {
    const broken = {
      collection: () => ({ doc: () => ({ path: 'x', id: 'x' }) }),
      runTransaction: async () => { throw new Error('firestore down'); },
    } as unknown as FirebaseFirestore.Firestore;
    const result = await consumeApprovalToken({
      db: broken, nonce: 'n'.repeat(32),
      fromTelegramUserId: OWNER.telegramUserId,
      fromTelegramChatId: OWNER.telegramChatId,
      nowMs: NOW,
    });
    expect(result.ok).toBe(false);
  });
});
