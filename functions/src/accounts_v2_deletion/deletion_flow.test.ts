import {
  AccountsV2DeletionError,
  completeDeletionReceipt,
  issueDeletionReceipt,
  readDeletionStatus,
  revokeDeletionReceipt,
  type DeletionNudge,
  type DeletionReceiptStore,
} from './deletion_flow';
import {
  ACCOUNTS_V2_DELETION_PURPOSE,
  deletionReceiptDocId,
  type DeletionPurgeCursor,
} from './receipt';

/*
 * Account V2, Пакет 4 — сквозная матрица отказов протокола удаления.
 * зачем: обрыв до/после коммита, повтор, потеря ответа, падение посреди
 * порции, неверный секрет/цель/операция, истёкшая квитанция, новый uid той
 * же почты. Хранилище квитанций — в памяти, с настоящей семантикой
 * «прочитать-решить-записать» и инъекцией обрыва до и после коммита.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_790_000_000_000;
const OLD_UID = 'OldUid1234567890abcdefghijkl';
const NEW_UID = 'NewUid1234567890abcdefghijkl';
const key = (seed: number): string => Buffer.from(Array.from({ length: 32 }, (_unused, i) => (i * 31 + seed * 17 + 1) & 255)).toString('base64url');
const CRED = { operationId: 'op-0123456789abcdef', capability: key(1) };
const REQ = { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED };
const RECEIPT_ID = deletionReceiptDocId(CRED.operationId);

type Fault = 'before_commit' | 'after_commit' | null;

function memoryStore(): DeletionReceiptStore & {
  docs: Map<string, unknown>;
  reads: number;
  failNext: (fault: Fault) => void;
} {
  const docs = new Map<string, unknown>();
  let fault: Fault = null;
  const store = {
    docs,
    reads: 0,
    failNext(next: Fault) { fault = next; },
    async transact<T>(docId: string, work: (stored: unknown) => Readonly<{ next: unknown; result: T }>) {
      store.reads += 1;
      const current = docs.has(docId) ? JSON.parse(JSON.stringify(docs.get(docId))) : null;
      const { next, result } = work(current);
      const pending = fault;
      fault = null;
      if (pending === 'before_commit') throw new Error('simulated_crash_before_commit');
      if (next === 'delete') docs.delete(docId);
      else if (next !== null) docs.set(docId, JSON.parse(JSON.stringify(next)));
      if (pending === 'after_commit') throw new Error('simulated_response_lost');
      return result;
    },
  };
  return store;
}

function recordingNudge(results: ({ done: boolean; cursor: DeletionPurgeCursor } | Error)[]): DeletionNudge & {
  calls: { uid: string; cursor: DeletionPurgeCursor }[];
} {
  const calls: { uid: string; cursor: DeletionPurgeCursor }[] = [];
  const nudge = (async (uid, cursor, onProgress) => {
    calls.push({ uid, cursor });
    const next = results.shift() ?? { done: true, cursor: null };
    if (next instanceof Error) {
      await onProgress({ collection: 'accounts_v2_entities', afterDocId: 'f'.repeat(64) });
      throw next;
    }
    if (next.cursor) await onProgress(next.cursor);
    return next;
  }) as DeletionNudge & { calls: typeof calls };
  nudge.calls = calls;
  return nudge;
}

async function expectCode(promise: Promise<unknown>, code: AccountsV2DeletionError['code']): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: 'AccountsV2DeletionError', code });
}

describe('issueDeletionReceipt', () => {
  test('создаёт квитанцию без uid/секрета; повтор тем же ключом идемпотентен', async () => {
    const store = memoryStore();
    const first = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    expect(first).toEqual({ receiptId: RECEIPT_ID, stage: 'accepted' });
    const json = JSON.stringify([...store.docs.values()]);
    expect(json).not.toContain(OLD_UID);
    expect(json).not.toContain(CRED.capability);
    const before = JSON.stringify(store.docs.get(RECEIPT_ID));
    expect(await issueDeletionReceipt(store, OLD_UID, CRED, NOW + 5)).toEqual(first);
    expect(JSON.stringify(store.docs.get(RECEIPT_ID))).toBe(before);
  });

  test('чужой секрет на ту же операцию — конфликт, исходная квитанция цела', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const before = JSON.stringify(store.docs.get(RECEIPT_ID));
    await expectCode(issueDeletionReceipt(store, NEW_UID, { ...CRED, capability: key(5) }, NOW), 'conflict');
    expect(JSON.stringify(store.docs.get(RECEIPT_ID))).toBe(before);
  });

  test('обрыв до коммита — квитанции нет, повтор создаёт; потеря ответа — повтор идемпотентен', async () => {
    const store = memoryStore();
    store.failNext('before_commit');
    await expect(issueDeletionReceipt(store, OLD_UID, CRED, NOW)).rejects.toThrow('simulated_crash_before_commit');
    expect(store.docs.size).toBe(0);
    store.failNext('after_commit');
    await expect(issueDeletionReceipt(store, OLD_UID, CRED, NOW)).rejects.toThrow('simulated_response_lost');
    expect(await issueDeletionReceipt(store, OLD_UID, CRED, NOW)).toMatchObject({ stage: 'accepted' });
  });

  test('без корректного ключа квитанция не создаётся', async () => {
    const store = memoryStore();
    await expectCode(issueDeletionReceipt(store, OLD_UID, { operationId: CRED.operationId }, NOW), 'denied');
    expect(store.reads).toBe(0);
  });
});

describe('readDeletionStatus — только этап', () => {
  test('ответ содержит ровно { stage } — ни uid, ни данных', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const result = await readDeletionStatus(store, REQ, NOW + 1);
    expect(result).toEqual({ stage: 'accepted' });
    expect(Object.keys(result)).toEqual(['stage']);
  });

  test.each([
    ['голый operationId', { purpose: ACCOUNTS_V2_DELETION_PURPOSE, operationId: CRED.operationId }],
    ['почта', { purpose: ACCOUNTS_V2_DELETION_PURPOSE, email: 'old@example.com' }],
    ['неверная цель', { ...REQ, purpose: 'account_read' }],
    ['новый uid той же почты без ключа', { purpose: ACCOUNTS_V2_DELETION_PURPOSE, callerAuthUid: NEW_UID }],
  ])('отказ без единого чтения: %s', async (_name, request) => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const reads = store.reads;
    await expectCode(readDeletionStatus(store, request, NOW), 'denied');
    expect(store.reads).toBe(reads);
  });

  test.each([
    ['неверный секрет', { ...REQ, capability: key(9) }],
    ['чужая операция', { ...REQ, operationId: 'op-fedcba9876543210' }],
  ])('отказ: %s', async (_name, request) => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    await expectCode(readDeletionStatus(store, request, NOW), 'denied');
  });

  test('потеря ответа: попытка учтена, повтор отвечает тем же этапом', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    store.failNext('after_commit');
    await expect(readDeletionStatus(store, REQ, NOW)).rejects.toThrow('simulated_response_lost');
    expect(await readDeletionStatus(store, REQ, NOW + 1)).toEqual({ stage: 'accepted' });
    expect((store.docs.get(RECEIPT_ID) as { attempts: number }).attempts).toBe(2);
  });

  test('лимит частоты даёт rate_limited', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    for (let i = 0; i < 30; i += 1) await readDeletionStatus(store, REQ, NOW + i);
    await expectCode(readDeletionStatus(store, REQ, NOW + 31), 'rate_limited');
  });
});

describe('дотолкнуть (nudge) и серверное завершение', () => {
  test('Ремонт №1 P2-1: толчок довёл только V2 — этап v2_purged, completed ставит лишь конвейер', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const nudge = recordingNudge([{ done: true, cursor: null }]);
    expect(await readDeletionStatus(store, REQ, NOW + 1, { nudge })).toEqual({ stage: 'v2_purged' });
    expect(nudge.calls).toEqual([{ uid: OLD_UID, cursor: null }]);
    expect((store.docs.get(RECEIPT_ID) as Record<string, unknown>).stage).toBe('v2_purged');
    // повторный толчок на v2_purged не гоняет удаление снова
    expect(await readDeletionStatus(store, REQ, NOW + 2, { nudge })).toEqual({ stage: 'v2_purged' });
    expect(nudge.calls).toHaveLength(1);
    expect(await completeDeletionReceipt(store, receiptId, NOW + 3)).toBe('completed');
    const stored = store.docs.get(RECEIPT_ID) as Record<string, unknown>;
    expect(stored.stage).toBe('completed');
    expect('targetSealed' in stored).toBe(false);
    expect(stored.expireAtMs).toBe(NOW + 3 + 30 * DAY);
  });

  test('падение посреди порции: этап purging, курсор сохранён, следующий толчок продолжает с него', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const nudge = recordingNudge([new Error('simulated_crash_mid_chunk'), { done: true, cursor: null }]);
    expect(await readDeletionStatus(store, REQ, NOW + 1, { nudge })).toEqual({ stage: 'purging' });
    const saved = (store.docs.get(RECEIPT_ID) as { cursor: DeletionPurgeCursor }).cursor;
    expect(saved).toEqual({ collection: 'accounts_v2_entities', afterDocId: 'f'.repeat(64) });
    expect(await readDeletionStatus(store, REQ, NOW + 2, { nudge })).toEqual({ stage: 'v2_purged' });
    expect(nudge.calls[1]).toEqual({ uid: OLD_UID, cursor: saved });
  });

  test('бюджет исчерпан (done=false): этап purging, новый курсор', async () => {
    const store = memoryStore();
    await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const cursor = { collection: 'accounts_v2_ops', afterDocId: 'a'.repeat(64) };
    const nudge = recordingNudge([{ done: false, cursor }]);
    expect(await readDeletionStatus(store, REQ, NOW + 1, { nudge })).toEqual({ stage: 'purging' });
    expect((store.docs.get(RECEIPT_ID) as { cursor: unknown }).cursor).toEqual(cursor);
  });

  test('решение 15: ключ потерян — сервер завершает сам по id квитанции; ключ потом видит completed', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    expect(await completeDeletionReceipt(store, receiptId, NOW + DAY)).toBe('completed');
    expect(await completeDeletionReceipt(store, receiptId, NOW + 2 * DAY)).toBe('completed');
    expect((store.docs.get(RECEIPT_ID) as { expireAtMs: number }).expireAtMs).toBe(NOW + DAY + 30 * DAY);
    const nudge = recordingNudge([]);
    expect(await readDeletionStatus(store, REQ, NOW + 2 * DAY, { nudge })).toEqual({ stage: 'completed' });
    expect(nudge.calls).toHaveLength(0);
  });

  test('истёкшая квитанция: отказ даже с верным ключом', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    await completeDeletionReceipt(store, receiptId, NOW);
    await expectCode(readDeletionStatus(store, REQ, NOW + 30 * DAY), 'denied');
  });

  test('квитанции нет (TTL стёр) — completeDeletionReceipt ничего не создаёт', async () => {
    const store = memoryStore();
    expect(await completeDeletionReceipt(store, RECEIPT_ID, NOW)).toBe('absent');
    expect(store.docs.size).toBe(0);
  });

  test('поздний толчок после серверного завершения не возвращает этап назад', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    const nudge = (async (_uid, _cursor, onProgress) => {
      await completeDeletionReceipt(store, receiptId, NOW + 5);
      await onProgress({ collection: 'accounts_v2_ops', afterDocId: 'b'.repeat(64) });
      return { done: false, cursor: { collection: 'accounts_v2_ops', afterDocId: 'b'.repeat(64) } };
    }) as DeletionNudge;
    expect(await readDeletionStatus(store, REQ, NOW + 6, { nudge })).toEqual({ stage: 'completed' });
    expect((store.docs.get(RECEIPT_ID) as { stage: string }).stage).toBe('completed');
  });
});

describe('Ремонт №1 P2-2: отзыв pending-квитанции сервером', () => {
  test('отмена/откат удаления: pending-квитанция удалена, ключ больше ничего не даёт', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    expect(await revokeDeletionReceipt(store, receiptId)).toBe('revoked');
    expect(store.docs.size).toBe(0);
    await expectCode(readDeletionStatus(store, REQ, NOW + 1), 'denied');
    expect(await revokeDeletionReceipt(store, receiptId)).toBe('absent');
  });

  test('отзыв после толчка (purging/v2_purged) тоже удаляет', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    await readDeletionStatus(store, REQ, NOW + 1, { nudge: recordingNudge([{ done: true, cursor: null }]) });
    expect(await revokeDeletionReceipt(store, receiptId)).toBe('revoked');
    expect(store.docs.size).toBe(0);
  });

  test('завершённую квитанцию отозвать нельзя: удаление уже необратимо', async () => {
    const store = memoryStore();
    const { receiptId } = await issueDeletionReceipt(store, OLD_UID, CRED, NOW);
    await completeDeletionReceipt(store, receiptId, NOW);
    expect(await revokeDeletionReceipt(store, receiptId)).toBe('completed');
    expect(await readDeletionStatus(store, REQ, NOW + 1)).toEqual({ stage: 'completed' });
  });
});
