import {
  ACCOUNTS_V2_DELETION_PENDING_TTL_MS,
  ACCOUNTS_V2_DELETION_PURPOSE,
  ACCOUNTS_V2_DELETION_RECEIPT_TTL_MS,
  ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER,
  buildCompletedDeletionReceipt,
  buildPendingDeletionReceipt,
  cleanDeletionCredential,
  deletionReceiptDocId,
  deletionReceiptPath,
  openDeletionTarget,
  sealDeletionTarget,
} from './receipt';

/*
 * Account V2, Пакет 4 — квитанция удаления (решения владельца 13–14).
 * зачем: квитанция — единственное, что переживает удаление аккаунта. В ней
 * не должно быть ни uid в открытом виде, ни секрета, ни данных; только этап.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_790_000_000_000;
const key = (seed: number): string => Buffer.from(Array.from({ length: 32 }, (_unused, i) => (i * 31 + seed * 17 + 1) & 255)).toString('base64url');
const CRED = { operationId: 'op-0123456789abcdef', capability: key(1) };
const UID = 'OldUid1234567890abcdefghijkl';

describe('cleanDeletionCredential', () => {
  test('принимает корректную пару', () => {
    expect(cleanDeletionCredential(CRED)).toEqual(CRED);
  });

  test('Ремонт №1 P3-1: неканонический хвост при высокой энтропии — отказ', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const strong = key(3);
    const last = strong[strong.length - 1];
    // зачем: те же 32 байта, но другая (неканоническая) запись последнего символа.
    const nonCanonical = `${strong.slice(0, -1)}${alphabet[alphabet.indexOf(last) + 1]}`;
    expect(Buffer.from(nonCanonical, 'base64url').equals(Buffer.from(strong, 'base64url'))).toBe(true);
    expect(cleanDeletionCredential({ operationId: CRED.operationId, capability: strong })).not.toBeNull();
    expect(cleanDeletionCredential({ operationId: CRED.operationId, capability: nonCanonical })).toBeNull();
  });

  test.each([
    ['голый operationId', { operationId: CRED.operationId }],
    ['пустой секрет', { operationId: CRED.operationId, capability: '' }],
    ['короткий секрет', { operationId: CRED.operationId, capability: 'c'.repeat(42) }],
    ['длинный секрет', { operationId: CRED.operationId, capability: 'c'.repeat(257) }],
    ['короткий operationId', { operationId: 'op-short', capability: CRED.capability }],
    ['слэш в operationId', { operationId: 'op/0123456789abcdef', capability: CRED.capability }],
    ['почта вместо ключа', { email: 'a@b.c' }],
    ['не объект', 'op-0123456789abcdef'],
    ['null', null],
    ['пробелы по краям секрета', { operationId: CRED.operationId, capability: ` ${CRED.capability}` }],
    // Ремонт №1 P3-1: ключ — строго base64url ровно 32 байта.
    ['слабый ключ aaaa… (неканонический base64url)', { operationId: CRED.operationId, capability: 'a'.repeat(43) }],
    ['слабый ключ из нулей', { operationId: CRED.operationId, capability: 'A'.repeat(43) }],
    ['hex 64 символа (старый формат)', { operationId: CRED.operationId, capability: 'ab'.repeat(32) }],
    ['44 символа с паддингом', { operationId: CRED.operationId, capability: `${CRED.capability}=` }],
    ['алфавит base64 (+ /)', { operationId: CRED.operationId, capability: `+/${CRED.capability.slice(2)}` }],
    ['мало различных байтов', { operationId: CRED.operationId, capability: Buffer.alloc(32, 7).fill(9, 0, 4).toString('base64url') }],
  ])('отказ: %s', (_name, raw) => {
    expect(cleanDeletionCredential(raw)).toBeNull();
  });
});

describe('идентификаторы и путь', () => {
  test('id квитанции — sha256 от operationId, стабилен и не содержит его', () => {
    const id = deletionReceiptDocId(CRED.operationId);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).toBe(deletionReceiptDocId(CRED.operationId));
    expect(id).not.toBe(deletionReceiptDocId('op-0123456789abcdeX'));
  });

  test('квитанции лежат под accounts_v2 (закрыто правилом deny) в отдельном контейнере', () => {
    const path = deletionReceiptPath(deletionReceiptDocId(CRED.operationId));
    expect(path.startsWith(`accounts_v2/${ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER}/`)).toBe(true);
    expect(path.split('/')).toHaveLength(4);
    expect(() => deletionReceiptPath('not-hex')).toThrow('accounts_v2_deletion_receipt_id_invalid');
  });
});

describe('запечатанная цель', () => {
  test('открывается только тем же ключом той же операции', () => {
    const sealed = sealDeletionTarget(UID, CRED);
    expect(sealed).not.toContain(UID);
    expect(openDeletionTarget(sealed, CRED)).toBe(UID);
    expect(openDeletionTarget(sealed, { ...CRED, capability: key(2) })).toBeNull();
    expect(openDeletionTarget(sealed, { ...CRED, operationId: 'op-0123456789abcdeX' })).toBeNull();
    expect(openDeletionTarget('garbage', CRED)).toBeNull();
    expect(openDeletionTarget(`${sealed.slice(0, -2)}AA`, CRED)).toBeNull();
  });

  test('две печати одного uid различаются (случайный nonce)', () => {
    expect(sealDeletionTarget(UID, CRED)).not.toBe(sealDeletionTarget(UID, CRED));
  });
});

describe('записи квитанции', () => {
  test('pending: только хэши, запечатанная цель, запасной TTL', () => {
    const record = buildPendingDeletionReceipt(UID, CRED, NOW);
    const json = JSON.stringify(record);
    expect(json).not.toContain(UID);
    expect(json).not.toContain(CRED.capability);
    expect(json).not.toContain(CRED.operationId);
    expect(record).toMatchObject({
      schemaVersion: 1,
      purpose: ACCOUNTS_V2_DELETION_PURPOSE,
      stage: 'accepted',
      attempts: 0,
      cursor: null,
      createdAtMs: NOW,
      expireAtMs: NOW + ACCOUNTS_V2_DELETION_PENDING_TTL_MS,
    });
  });

  test('completed: только этап, цель и курсор стёрты, TTL ровно 30 дней (решение 14)', () => {
    const pending = { ...buildPendingDeletionReceipt(UID, CRED, NOW), stage: 'purging' as const, cursor: { collection: 'x', afterDocId: 'y' } };
    const done = buildCompletedDeletionReceipt(pending, NOW + DAY);
    expect(ACCOUNTS_V2_DELETION_RECEIPT_TTL_MS).toBe(30 * DAY);
    expect(done.stage).toBe('completed');
    expect(done.expireAtMs).toBe(NOW + DAY + 30 * DAY);
    expect(done.completedAtMs).toBe(NOW + DAY);
    expect('targetSealed' in done).toBe(false);
    expect('cursor' in done).toBe(false);
    expect(done.capabilityHash).toBe(pending.capabilityHash);
    expect(done.operationIdHash).toBe(pending.operationIdHash);
  });

  test('completed идемпотентен: повтор не продлевает срок', () => {
    const first = buildCompletedDeletionReceipt(buildPendingDeletionReceipt(UID, CRED, NOW), NOW + DAY);
    const again = buildCompletedDeletionReceipt(first, NOW + 10 * DAY);
    expect(again).toEqual(first);
  });
});
