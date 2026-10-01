import fs from 'fs';
import path from 'path';
import {
  applyBatch,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2TxPort,
} from './accounts_v2_apply_core';
import {
  ACCOUNTS_V2_CARD_UNSET_KEY,
  ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS,
  ACCOUNTS_V2_CARD_UNSET_PROTECTED_FIELDS,
} from './accounts_v2_contract';
import { mergeFlashcard, type FlashcardState } from './accounts_v2_merge';

/*
 * Account V2, Пакет 7A — снятие полей карточки (`unsetFields`), TEMP из 6F.
 *
 * зачем: без операции снятия пропавшее на телефоне поле навсегда оставалось на
 * сервере и после отключения старой синхронизации «воскресало» на другом
 * устройстве. Сторож проверяет семантику слияния (снимается только увиденное,
 * чужая поздняя правка/вариант не теряются), белый список и лимиты, прохождение
 * через настоящий applyBatch и паритет констант клиент ↔ сервер по тексту.
 */

const NOW = 1_790_000_000_000;
type Json = Parameters<typeof mergeFlashcard>[1];

function upsert(fields: Record<string, unknown>, unset?: readonly unknown[]): Json {
  return (unset === undefined ? { op: 'upsert', fields } : { op: 'upsert', fields, unsetFields: unset }) as Json;
}

function state(fields: Record<string, { value: unknown; revision: number; variants?: unknown[] }>): FlashcardState {
  const out: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) out[name] = { value: field.value, revision: field.revision, variants: field.variants ?? [] };
  return { deleted: false, fields: out } as unknown as FlashcardState;
}

function merge(current: FlashcardState | null, payload: Json, base = 5, next = 6) {
  return mergeFlashcard(current, payload, base, next, 1, NOW);
}

describe('Account V2 7A — mergeFlashcard unsetFields', () => {
  test('снимает увиденное поле, остальные поля и правки той же операции применяются', () => {
    const current = state({ id: { value: 'c', revision: 1 }, en: { value: 'x', revision: 1 }, note: { value: 'n', revision: 2 } });
    const result = merge(current, upsert({ en: 'y' }, ['note']));
    expect(result).toMatchObject({ ok: true, changed: true, conflict: false });
    if (!result.ok) throw new Error('unexpected');
    expect(Object.keys(result.state.fields).sort()).toEqual(['en', 'id']);
    expect(result.state.fields.en.value).toBe('y');
  });

  test('пустые fields + снятие — законная операция; отсутствующее поле — без изменений', () => {
    const current = state({ id: { value: 'c', revision: 1 }, note: { value: 'n', revision: 1 } });
    const removed = merge(current, upsert({}, ['note']));
    expect(removed).toMatchObject({ ok: true, changed: true, conflict: false });
    const absent = merge(current, upsert({}, ['ghost']));
    expect(absent).toMatchObject({ ok: true, changed: false, conflict: false });
    expect(merge(null, upsert({}, ['ghost']))).toMatchObject({ ok: true, changed: false, conflict: false });
  });

  test('поле, изменённое другим устройством после базы, или с вариантом — НЕ снимается, исход conflict', () => {
    const newer = state({ note: { value: 'other device', revision: 7 } });
    const r1 = merge(newer, upsert({}, ['note']), 5, 8);
    expect(r1).toMatchObject({ ok: true, changed: false, conflict: true });
    const withVariant = state({ note: { value: 'n', revision: 3, variants: ['v'] } });
    const r2 = merge(withVariant, upsert({}, ['note']), 5, 6);
    expect(r2).toMatchObject({ ok: true, changed: false, conflict: true });
  });

  test('tombstone главнее снятия: удалённая карточка не оживает', () => {
    const deleted = { deleted: true, fields: {} } as FlashcardState;
    expect(merge(deleted, upsert({}, ['note']))).toMatchObject({ ok: true, changed: false, conflict: true });
  });

  test.each([
    ['не массив', 'note'],
    ['пустой массив', []],
    ['не строка', [1]],
    ['пустая строка', ['']],
    ['повтор', ['a', 'a']],
    ['защищённое id', ['id']],
    ['защищённое srs', ['srs']],
    ['защищённое srsPolicy', ['srsPolicy']],
    ['пересечение с fields', ['en']],
    ['сверх лимита', Array.from({ length: ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS + 1 }, (_, i) => `f${i}`)],
  ])('белый список/лимиты: %s → payload_invalid', (_label, unset) => {
    const payload = { op: 'upsert', fields: { en: 'x' }, unsetFields: unset } as unknown as Json;
    expect(merge(null, payload)).toEqual({ ok: false, code: 'payload_invalid' });
  });

  test('ровно на лимите — принимается; лишний ключ рядом — payload_invalid; пустая операция — payload_invalid', () => {
    const names = Array.from({ length: ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS }, (_, i) => `f${i}`);
    expect(merge(null, upsert({}, names))).toMatchObject({ ok: true });
    expect(merge(null, { op: 'upsert', fields: {}, unsetFields: ['a'], extra: 1 } as unknown as Json))
      .toEqual({ ok: false, code: 'payload_invalid' });
    expect(merge(null, upsert({}))).toEqual({ ok: false, code: 'payload_invalid' });
  });

  test('прежний upsert без unsetFields — поведение не изменилось', () => {
    const current = state({ en: { value: 'x', revision: 1 } });
    expect(merge(current, upsert({ en: 'x' }))).toMatchObject({ ok: true, changed: false, conflict: false });
    expect(merge(current, upsert({ ru: 'y' }))).toMatchObject({ ok: true, changed: true, conflict: false });
  });
});

describe('Account V2 7A — через applyBatch', () => {
  function memoryPort() {
    const entities = new Map<string, AccountsV2EntityRecord>();
    const ops = new Map<string, AccountsV2OpRecord>();
    const port: AccountsV2TxPort = {
      getOp: (_uid, id) => ops.get(id) ?? null,
      getEntity: (_uid, id) => entities.get(id) ?? null,
      putEntity: (_uid, id, record) => { entities.set(id, record); },
      putReceipt: (_uid, id, record) => { ops.set(id, record); },
    };
    return { port, entities };
  }
  function batch(operationId: string, payload: unknown, baseRevision: number | null, seq: number) {
    const result = validateBatch({ batchId: `b-${operationId}`, operations: [{
      ownerUid: 'u', operation: { schemaVersion: 1, operationId, entityType: 'flashcard', entityId: 'en:saved:c', clientSequence: seq, baseRevision, payload },
    }] });
    if (!result.ok) throw new Error(`invalid ${result.code}`);
    return result.batch;
  }

  test('поле снимается на сервере, повтор — duplicate, состояние без поля', () => {
    const { port, entities } = memoryPort();
    applyBatch(port, 'u', batch('op-1', { op: 'upsert', fields: { en: 'x', note: 'n' } }, 0, 1), NOW);
    const receipts = applyBatch(port, 'u', batch('op-2', { op: 'upsert', fields: {}, unsetFields: ['note'] }, 1, 2), NOW);
    expect(receipts).toEqual([{ operationId: 'op-2', outcome: 'applied', serverRevision: 2 }]);
    const stored = [...entities.values()][0];
    expect(Object.keys(JSON.parse(stored.stateJson).fields)).toEqual(['en']);
    expect(applyBatch(port, 'u', batch('op-2', { op: 'upsert', fields: {}, unsetFields: ['note'] }, 1, 2), NOW))
      .toEqual([{ operationId: 'op-2', outcome: 'duplicate', serverRevision: 2 }]);
  });
});

describe('Account V2 7A — паритет констант клиент ↔ сервер', () => {
  const clientPath = path.resolve(__dirname, '..', '..', 'modules', 'account-session-v2', 'account_sync_producer_plan.ts');
  const client = fs.readFileSync(clientPath, 'utf8');

  test('ключ, лимит и защищённые поля совпадают по тексту', () => {
    expect(client).toContain(`export const ACCOUNT_SYNC_CARD_UNSET_KEY = '${ACCOUNTS_V2_CARD_UNSET_KEY}';`);
    expect(client).toContain(`export const ACCOUNT_SYNC_CARD_UNSET_MAX_FIELDS = ${ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS};`);
    const list = ACCOUNTS_V2_CARD_UNSET_PROTECTED_FIELDS.map((name) => `'${name}'`).join(', ');
    expect(client).toContain(`export const ACCOUNT_SYNC_CARD_UNSET_PROTECTED_FIELDS = Object.freeze([${list}] as const);`);
  });
});
