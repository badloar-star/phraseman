import {
  applyBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type ValidatedBatch,
} from '../accounts_v2_apply_core';
import { ACCOUNTS_V2_ENTITY_TYPES } from '../accounts_v2_contract';
import { createAccountsV2FlagsReader } from '../accounts_v2_flags';
import {
  PRESERVED_DOMAIN_MIGRATION_POLICY,
  evaluateLegacyWriterPreservedWrite,
  type LegacyWriterPreservedWriteInput,
} from '../accounts_v2_migration/preserved_domains';

/*
 * AA S5 (TG-70B581CAE918 / TG-B73E39B4FADC) — миграция и совместимость:
 *  (1) перенос V2 (accountsV2MigrateMine) несёт ТОЛЬКО сохраняемые домены
 *      политики preserved_domains: чужой тип в плане → HOLD до применения;
 *  (2) сценарии: существующий аккаунт (stableId через auth_links), повторная
 *      миграция идемпотентна, обрыв посреди миграции (partial → продолжение);
 *  (3) режим 1.6.24 — чистый контракт evaluateLegacyWriterPreservedWrite.
 */

class FakeHttpsError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_options: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => {
    throw new Error('admin_firestore_must_not_be_used_in_tests');
  }),
}));

/** Подмена типа в плане dry-run (только для сценария «чужой тип»). */
let injectForeignType: string | null = null;
jest.mock('../accounts_v2_migration/dry_run', () => {
  const actual = jest.requireActual('../accounts_v2_migration/dry_run');
  return {
    ...actual,
    runMigrationDryRun: (...args: unknown[]) => {
      const result = actual.runMigrationDryRun(...args);
      if (injectForeignType === null || result.batches.length === 0) return result;
      const [first, ...rest] = result.batches;
      const [op, ...ops] = first.operations;
      const forged = { ...first, operations: [{ ...op, operation: { ...op.operation, entityType: injectForeignType } }, ...ops] };
      return { ...result, batches: [forged, ...rest] };
    },
  };
});

/* eslint-disable @typescript-eslint/no-require-imports */
const migrate = require('./migrate_mine') as typeof import('./migrate_mine');
/* eslint-enable @typescript-eslint/no-require-imports */

const UID = 'authUidAAAAAAAAAAAAAAAAAAAA1';
const STABLE = 'stable-doc-0001';
const NOW = 1_790_000_000_000;
type Data = Record<string, unknown>;

function card(id: string): Data {
  return { id, en: `phrase ${id}`, ru: `фраза ${id}`, uk: `фраза ${id}`, source: 'lesson', addedAt: 1_700_000_000_000 };
}

function world() {
  const entities = new Map<string, AccountsV2EntityRecord>();
  const ops = new Map<string, AccountsV2OpRecord>();
  const meta = new Map<string, Data>();
  const users = new Map<string, Data>([[STABLE, {
    canonicalStableId: STABLE,
    progress: { lesson1_best_score: '4.5', flashcards_v1: JSON.stringify([card('c1'), card('c2')]) },
  }]]);
  const calls: string[] = [];
  const port: import('./migrate_mine').AccountsV2MigratePort = {
    async readMeta(uid) { calls.push('readMeta'); return meta.get(uid) ?? null; },
    async writeMeta(uid, data) { calls.push('writeMeta'); meta.set(uid, { ...(meta.get(uid) ?? {}), ...data }); },
    async resolveLegacyDocId() { return { ok: true, docId: STABLE } as const; },
    async readLegacyUser(docId) { return users.get(docId) ?? null; },
    async readFlashcardPages() { return []; },
    async hasPersonalSync() { return false; },
    async applyBatch(uid, batch: ValidatedBatch, nowMs): Promise<readonly AccountsV2Receipt[]> {
      calls.push('apply');
      const tx: AccountsV2TxPort = {
        getOp: (_u, id) => ops.get(id) ?? null,
        getEntity: (_u, id) => entities.get(id) ?? null,
        putEntity: (_u, id, record) => { entities.set(id, record); },
        putReceipt: (_u, id, record) => { ops.set(id, record); },
      };
      return applyBatch(tx, uid, batch, nowMs);
    },
  };
  return { port, entities, meta, users, calls };
}

const flags = createAccountsV2FlagsReader(async () => ({ syncEnabled: true, everEnabled: true }));
const deps = (nowMs = NOW) => ({ nowMs: () => nowMs, blockCache: new Map<string, number>() });

afterEach(() => { injectForeignType = null; });

describe('AA S5: migrate_mine ↔ preserved_domains', () => {
  it('типы V2 ровно совпадают с carried-типами политики (сторож дрейфа)', () => {
    expect([...ACCOUNTS_V2_ENTITY_TYPES].sort()).toEqual([...PRESERVED_DOMAIN_MIGRATION_POLICY.carriedEntityTypes].sort());
  });

  it('nonPreservedEntityTypes: свои типы — пусто; чужой/битый — назван', () => {
    const batch = (types: unknown[]) => ({
      operations: types.map((entityType) => ({ ownerUid: UID, operation: { entityType } })),
    }) as unknown as ValidatedBatch;
    expect(migrate.nonPreservedEntityTypes([batch(['lesson_progress', 'flashcard', 'library_membership'])])).toEqual([]);
    expect(migrate.nonPreservedEntityTypes([batch(['flashcard', 'xp'])])).toEqual(['xp']);
    expect(migrate.nonPreservedEntityTypes([batch([42]), batch(['league'])])).toEqual(['invalid', 'league']);
  });

  it('существующий аккаунт (stableId через auth_links): перенос done, только сохраняемые домены', async () => {
    const w = world();
    const result = await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps());
    expect(result.status).toBe('done');
    const types = new Set([...w.entities.values()].map((record) => (record as unknown as { entityType: string }).entityType));
    for (const type of types) expect(PRESERVED_DOMAIN_MIGRATION_POLICY.carriedEntityTypes).toContain(type);
  });

  it('чужой тип в плане → HOLD non_preserved_entity_type, в V2 ничего не записано', async () => {
    injectForeignType = 'xp';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const w = world();
    const result = await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps());
    expect(result.status).toBe('hold');
    expect(result.holdReasons).toEqual([migrate.ACCOUNTS_V2_MIGRATION_NON_PRESERVED_HOLD]);
    expect(w.calls).not.toContain('apply');
    expect(w.entities.size).toBe(0);
    expect(w.meta.get(UID)).toMatchObject({ status: 'hold', holdReasons: ['non_preserved_entity_type'] });
    const line = warn.mock.calls.map((call) => String(call[0])).find((text) => text.startsWith('[AA-S5] migrate hold'));
    expect(line).toContain('reason=non_preserved_entity_type types=xp');
    expect(line).not.toContain(UID);
    warn.mockRestore();
  });

  it('повторная миграция идемпотентна: already_done, ядро не вызывается', async () => {
    const w = world();
    await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps());
    w.calls.length = 0;
    const again = await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps(NOW + 120_000));
    expect(again.status).toBe('already_done');
    expect(w.calls).toEqual(['readMeta']);
  });

  it('обрыв посреди миграции (partial) → продолжение до done без дублей', async () => {
    const w = world();
    const cards = Array.from({ length: 50 * (migrate.ACCOUNTS_V2_MIGRATION_MAX_BATCHES_PER_CALL + 2) }, (_, i) => card(`k${i}`));
    w.users.set(STABLE, { canonicalStableId: STABLE, progress: { flashcards_v1: JSON.stringify(cards) } });
    const first = await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps());
    expect(first.status).toBe('partial');
    const second = await migrate.handleAccountsV2MigrateMine(w.port, { auth: { uid: UID } }, flags, deps(NOW + 6_000));
    expect(second.status).toBe('done');
    expect(first.outcomes.applied + second.outcomes.applied).toBe(cards.length);
    expect(second.outcomes.duplicate).toBe(0);
  });
});

describe('AA S5: режим 1.6.24 — evaluateLegacyWriterPreservedWrite (на подтверждение координатору)', () => {
  const base: LegacyWriterPreservedWriteInput = {
    writer: 'legacy_1_6_24', domain: 'lesson_progress', cutoverEnabled: true, accountMigration: 'migrated',
  };
  it.each([
    [{}, false, 'legacy_write_after_authority_migration'],
    [{ domain: 'flashcards_srs' }, false, 'legacy_write_after_authority_migration'],
    [{ cutoverEnabled: false }, true, 'cutover_off'],
    [{ accountMigration: 'not_migrated' }, true, 'account_not_migrated'],
    [{ accountMigration: 'unknown' }, true, 'migration_state_unknown_allowed'],
    [{ writer: 'authority_2_0' }, true, 'authority_writer'],
    [{ domain: 'coins' }, true, 'not_preserved_domain'],
    [{ writer: 'old' }, false, 'invalid_input'],
    [{ accountMigration: 'yes' }, false, 'invalid_input'],
    [{ cutoverEnabled: 'true' }, false, 'invalid_input'],
  ] as const)('%j → allowed=%s (%s)', (override, allowed, reason) => {
    const decision = evaluateLegacyWriterPreservedWrite({ ...base, ...override } as LegacyWriterPreservedWriteInput);
    expect(decision).toEqual({ allowed, reason });
    expect(Object.isFrozen(decision)).toBe(true);
  });
});
