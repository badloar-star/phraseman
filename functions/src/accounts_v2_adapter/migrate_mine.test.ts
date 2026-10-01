import {
  applyBatch,
  docIdFor,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type ValidatedBatch,
} from '../accounts_v2_apply_core';
import { createAccountsV2FlagsReader, type AccountsV2FlagsReader } from '../accounts_v2_flags';

/*
 * Account V2, Пакет 6G — перенос при первом входе (accountsV2MigrateMine) и
 * гидрация (accountsV2PullMine) на фейковом порте поверх НАСТОЯЩЕГО ядра.
 *
 * зачем: доказать до эмулятора, что (1) флаг выкл = ноль чтений данных;
 * (2) читается только вызывающий uid и его старый документ (auth_links);
 * (3) hold ничего не пишет в V2; (4) повтор не дублирует (отметка + duplicate
 * ядра); (5) перенесённое реально вытягивается гидрацией.
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

/* eslint-disable @typescript-eslint/no-require-imports */
const migrate = require('./migrate_mine') as typeof import('./migrate_mine');
const pull = require('./pull_mine') as typeof import('./pull_mine');
/* eslint-enable @typescript-eslint/no-require-imports */

const UID = 'authUidAAAAAAAAAAAAAAAAAAAA1';
const OTHER = 'authUidBBBBBBBBBBBBBBBBBBBB2';
const STABLE = 'stable-doc-0001';
const NOW = 1_790_000_000_000;
const SRS_TIME = 1_780_000_000_000;

type Data = Record<string, unknown>;

function card(id: string): Data {
  return { id, en: `phrase ${id}`, ru: `фраза ${id}`, uk: `фраза ${id}`, source: 'lesson', addedAt: 1_700_000_000_000 };
}

function legacyUser(extra: Data = {}): Data {
  return {
    canonicalStableId: STABLE,
    progress: {
      lesson1_best_score: '4.5',
      lesson2_best_score: '2',
      flashcards_v1: JSON.stringify([card('c1'), card('c2')]),
      community_owned_pack_ids_v1: JSON.stringify(['pack-b', 'pack-a']),
      flashcards_swipe_memory_v1: JSON.stringify({ 'saved:all:c1': { correct: 2, seen: 3, lastSeenAt: SRS_TIME, nextDueAt: SRS_TIME + 1 } }),
    },
    ...extra,
  };
}

/** Ядро V2 в памяти: применяет пакет атомарно (копия карт, коммит при успехе). */
class MemoryV2 {
  readonly entities = new Map<string, Map<string, AccountsV2EntityRecord>>();
  readonly ops = new Map<string, Map<string, AccountsV2OpRecord>>();

  apply(uid: string, batch: ValidatedBatch, nowMs: number): readonly AccountsV2Receipt[] {
    const entities = new Map(this.entities.get(uid) ?? []);
    const ops = new Map(this.ops.get(uid) ?? []);
    const port: AccountsV2TxPort = {
      getOp: (_u, id) => ops.get(id) ?? null,
      getEntity: (_u, id) => entities.get(id) ?? null,
      putEntity: (_u, id, record) => { entities.set(id, record); },
      putReceipt: (_u, id, record) => { ops.set(id, record); },
    };
    const receipts = applyBatch(port, uid, batch, nowMs);
    this.entities.set(uid, entities);
    this.ops.set(uid, ops);
    return receipts;
  }

  count(uid: string): number {
    return this.entities.get(uid)?.size ?? 0;
  }
}

type World = {
  v2: MemoryV2;
  meta: Map<string, Data>;
  users: Map<string, Data>;
  pages: Map<string, { id: string; data: Data }[]>;
  personal: Set<string>;
  authLinks: Map<string, string>;
  deletion: Set<string>;
  calls: string[];
};

function world(): World {
  return {
    v2: new MemoryV2(), meta: new Map(), users: new Map(), pages: new Map(), personal: new Set(),
    authLinks: new Map(), deletion: new Set(), calls: [],
  };
}

function migratePort(w: World): import('./migrate_mine').AccountsV2MigratePort {
  return {
    async readMeta(uid) { w.calls.push(`readMeta:${uid}`); return w.meta.get(uid) ?? null; },
    async writeMeta(uid, data) { w.calls.push(`writeMeta:${uid}`); w.meta.set(uid, { ...(w.meta.get(uid) ?? {}), ...data }); },
    async resolveLegacyDocId(uid) {
      w.calls.push(`resolve:${uid}`);
      if (w.deletion.has(uid)) return { ok: false, reason: 'deletion_pending' } as const;
      return { ok: true, docId: w.authLinks.get(uid) ?? uid } as const;
    },
    async readLegacyUser(docId) { w.calls.push(`user:${docId}`); return w.users.get(docId) ?? null; },
    async readFlashcardPages(docId, limit) { w.calls.push(`pages:${docId}`); return (w.pages.get(docId) ?? []).slice(0, limit); },
    async hasPersonalSync(docId) { w.calls.push(`personal:${docId}`); return w.personal.has(docId); },
    async applyBatch(uid, batch, nowMs) { w.calls.push(`apply:${uid}`); return w.v2.apply(uid, batch, nowMs); },
  };
}

function pullPort(w: World): import('./pull_mine').AccountsV2PullPort {
  const rate = new Map<string, Readonly<Record<string, unknown>> | null>();
  return {
    async consumeRate(uid, decide) {
      w.calls.push(`rate:${uid}`);
      const decision = decide(rate.get(uid) ?? null);
      if (decision.write !== null) rate.set(uid, decision.write);
      if (!decision.allowed) throw decision.error;
    },
    async listEntities(uid, after, limit) {
      w.calls.push(`list:${uid}`);
      const all = [...(w.v2.entities.get(uid) ?? new Map()).entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return all.filter(([id]) => after === null || id > after).slice(0, limit).map(([id, data]) => ({ id, data }));
    },
  };
}

function flags(syncEnabled: boolean, ok = true): AccountsV2FlagsReader {
  return createAccountsV2FlagsReader(async () => {
    if (!ok) throw new Error('boom');
    return { syncEnabled, everEnabled: true };
  });
}

function deps(nowMs = NOW): import('./migrate_mine').AccountsV2MigrateDeps {
  return { nowMs: () => nowMs, blockCache: new Map() };
}

async function rejection(promise: Promise<unknown>): Promise<FakeHttpsError> {
  try {
    await promise;
  } catch (error) {
    return error as FakeHttpsError;
  }
  throw new Error('expected rejection');
}

function seeded(): World {
  const w = world();
  w.authLinks.set(UID, STABLE);
  w.users.set(STABLE, legacyUser());
  w.users.set(OTHER, legacyUser({ canonicalStableId: OTHER }));
  return w;
}

describe('accountsV2MigrateMine — ворота', () => {
  it('флаг выключен → accounts_v2_disabled (окончательно), порт данных не тронут', async () => {
    const w = seeded();
    const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(false), deps()));
    expect([error.code, error.message, (error.details as Data).final]).toEqual(['failed-precondition', 'accounts_v2_disabled', true]);
    expect(w.calls).toEqual([]);
  });

  it('флаг не читается → повторяемая ошибка, порт не тронут', async () => {
    const w = seeded();
    const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true, false), deps()));
    expect(error.code).toBe('unavailable');
    expect(w.calls).toEqual([]);
  });

  it('без входа → unauthenticated, порт не тронут', async () => {
    const w = seeded();
    const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: null }, flags(true), deps()));
    expect(error.code).toBe('unauthenticated');
    expect(w.calls).toEqual([]);
  });

  it('uid с `_`/`/` → окончательный отказ до чтений', async () => {
    const w = seeded();
    for (const uid of ['_svc', 'a/b']) {
      const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid } }, flags(true), deps()));
      expect(error.message).toBe('uid_not_path_safe');
    }
    expect(w.calls).toEqual([]);
  });

  it('идёт удаление аккаунта → окончательный отказ, V2 не пишется', async () => {
    const w = seeded();
    w.deletion.add(UID);
    const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps()));
    expect(error.message).toBe('account_deletion_pending');
    expect(w.calls.filter((call) => call.startsWith('apply'))).toEqual([]);
  });
});

describe('accountsV2MigrateMine — перенос при первом входе', () => {
  it('документ под stableId (auth_links) переносится; операции — на uid вызывающего', async () => {
    const w = seeded();
    const result = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect(result.status).toBe('done');
    expect(result.legacyFound).toBe(true);
    expect(result.outcomes.applied).toBe(result.operations);
    // 2 урока + 2 карточки (c1 вместе со SRS) + библиотека
    expect(w.v2.count(UID)).toBe(5);
    expect(w.v2.count(OTHER)).toBe(0);
    expect(w.v2.entities.get(UID)?.has(docIdFor('lesson_progress', 'en:lesson:1'))).toBe(true);
    expect(w.meta.get(UID)).toMatchObject({ status: 'done', version: migrate.ACCOUNTS_V2_MIGRATION_VERSION });
    // читается только свой старый документ
    expect(w.calls.filter((call) => call.includes(OTHER))).toEqual([]);
    expect(w.calls).toContain(`user:${STABLE}`);
  });

  it('поле uid в запросе ничего не даёт: читаются данные ТОЛЬКО вызывающего', async () => {
    const w = seeded();
    const port = migratePort(w);
    await migrate.handleAccountsV2MigrateMine(port, { auth: { uid: UID }, data: { uid: OTHER } } as never, flags(true), deps());
    expect(w.calls.filter((call) => call.includes(OTHER))).toEqual([]);
    expect(w.v2.count(OTHER)).toBe(0);
  });

  it('повторный вход: already_done, ровно одно чтение отметки, ядро не вызывается', async () => {
    const w = seeded();
    const d = deps();
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), d);
    w.calls.length = 0;
    const again = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps(NOW + 120_000));
    expect(again.status).toBe('already_done');
    expect(w.calls).toEqual([`readMeta:${UID}`]);
  });

  it('сразу после done на ТОМ ЖЕ инстансе (общий кэш блоков) → already_done, не rate_limited', async () => {
    // зачем: найдено E2E на эмуляторе — блок «попытка идёт» оставался в памяти после успеха.
    const w = seeded();
    const d = deps();
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), d);
    const again = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), { ...d, nowMs: () => NOW + 7 });
    expect(again.status).toBe('already_done');
  });

  it('отметка потеряна → повтор даёт только duplicate, новых сущностей нет', async () => {
    const w = seeded();
    const first = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    const before = JSON.stringify([...(w.v2.entities.get(UID) ?? new Map()).entries()]);
    w.meta.clear();
    const second = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps(NOW + 1));
    expect(second.status).toBe('done');
    expect(second.outcomes).toEqual({ applied: 0, duplicate: first.operations, conflict: 0, rejected: 0 });
    expect(JSON.stringify([...(w.v2.entities.get(UID) ?? new Map()).entries()])).toBe(before);
  });

  it('нет старого документа → done, legacyFound=false, ноль операций', async () => {
    const w = world();
    const result = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect([result.status, result.legacyFound, result.operations]).toEqual(['done', false, 0]);
    expect(w.calls.filter((call) => call.startsWith('apply'))).toEqual([]);
  });
});

describe('accountsV2MigrateMine — HOLD и частота', () => {
  it('hold (скрытая личность) → ни одной записи в V2, отметка hold с кодами', async () => {
    const w = seeded();
    w.users.set(STABLE, legacyUser({ identityHidden: true }));
    const result = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect(result.status).toBe('hold');
    expect(result.holdReasons).toEqual(['identity_hidden']);
    expect(w.calls.filter((call) => call.startsWith('apply'))).toEqual([]);
    expect(w.v2.count(UID)).toBe(0);
    expect(w.meta.get(UID)).toMatchObject({ status: 'hold', holdReasons: ['identity_hidden'] });
  });

  it('журналы телефона (personal_sync) → hold по инвентарю, V2 не пишется', async () => {
    const w = seeded();
    w.personal.add(STABLE);
    const result = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect(result.status).toBe('hold');
    expect(result.holdReasons).toContain('no_owner_decision');
    expect(w.v2.count(UID)).toBe(0);
  });

  it('hold моложе суток отвечается из отметки, старые данные не перечитываются', async () => {
    const w = seeded();
    w.users.set(STABLE, legacyUser({ identityHidden: true }));
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    w.calls.length = 0;
    const again = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps(NOW + 3_600_000));
    expect(again.status).toBe('hold');
    expect(w.calls).toEqual([`readMeta:${UID}`]);
  });

  it('страниц карточек больше предела → hold pages_over_limit', async () => {
    const w = seeded();
    w.pages.set(STABLE, Array.from({ length: migrate.ACCOUNTS_V2_MIGRATION_MAX_PAGES + 1 }, (_, index) => ({ id: `p${index}`, data: {} })));
    const result = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect(result.holdReasons).toEqual(['pages_over_limit']);
    expect(w.v2.count(UID)).toBe(0);
  });

  it('попытка моложе окна (общая отметка) → resource-exhausted; повтор на инстансе — 0 чтений', async () => {
    const w = seeded();
    w.meta.set(UID, { lastAttemptAtMs: NOW - 10_000 });
    const d = deps();
    const error = await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), d));
    expect(error.code).toBe('resource-exhausted');
    expect((error.details as Data).retryAfterMs).toBe(50_000);
    w.calls.length = 0;
    await rejection(migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), d));
    expect(w.calls).toEqual([]);
  });

  it('много пакетов → partial, продолжение дочитывает до done без дублей', async () => {
    const w = seeded();
    const cards = Array.from({ length: 50 * (migrate.ACCOUNTS_V2_MIGRATION_MAX_BATCHES_PER_CALL + 2) }, (_, index) => card(`k${index}`));
    w.users.set(STABLE, { canonicalStableId: STABLE, progress: { flashcards_v1: JSON.stringify(cards) } });
    const first = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    expect(first.status).toBe('partial');
    const second = await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps(NOW + 6_000));
    expect(second.status).toBe('done');
    expect(first.outcomes.applied + second.outcomes.applied).toBe(cards.length);
    expect(second.outcomes.duplicate).toBe(0);
    expect(w.v2.count(UID)).toBe(cards.length);
  });
});

describe('accountsV2PullMine — гидрация', () => {
  function pullDeps(): import('./pull_mine').AccountsV2PullDeps {
    return { nowMs: () => NOW, blockCache: new Map(), rate: pull.ACCOUNTS_V2_PULL_RATE };
  }

  it('флаг выключен → accounts_v2_disabled, порт не тронут', async () => {
    const w = seeded();
    const error = await rejection(pull.handleAccountsV2PullMine(pullPort(w), { auth: { uid: UID }, data: null }, flags(false), pullDeps()));
    expect(error.message).toBe('accounts_v2_disabled');
    expect(w.calls).toEqual([]);
  });

  it('без входа / битый запрос → отказ до любого чтения', async () => {
    const w = seeded();
    expect((await rejection(pull.handleAccountsV2PullMine(pullPort(w), { auth: null, data: null }, flags(true), pullDeps()))).code)
      .toBe('unauthenticated');
    for (const data of [{ cursor: 'x' }, { limit: 201 }, { limit: 0 }, { uid: OTHER }, [1]]) {
      const error = await rejection(pull.handleAccountsV2PullMine(pullPort(w), { auth: { uid: UID }, data }, flags(true), pullDeps()));
      expect(error.code).toBe('invalid-argument');
    }
    expect(w.calls).toEqual([]);
  });

  it('перенесённое вытягивается постранично, только своё; чужое не адресуется', async () => {
    const w = seeded();
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: OTHER } }, flags(true), deps());
    w.calls.length = 0;
    const pulled: import('./pull_mine').AccountsV2PulledEntity[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: import('./pull_mine').AccountsV2PullResponse = await pull.handleAccountsV2PullMine(
        pullPort(w), { auth: { uid: UID }, data: { cursor, limit: 2 } }, flags(true), pullDeps(),
      );
      pulled.push(...page.entities);
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor !== null);
    expect(pages).toBe(3);
    expect(pulled.map((entity) => entity.entityId).sort()).toEqual(
      ['en:community_packs', 'en:lesson:1', 'en:lesson:2', 'en:saved:c1', 'en:saved:c2'],
    );
    const lesson = pulled.find((entity) => entity.entityId === 'en:lesson:1');
    expect(lesson?.state).toEqual({ best: { passed: true, score: 4.5 } });
    const srs = pulled.find((entity) => entity.entityId === 'en:saved:c1')?.state as Data;
    expect(((srs.fields as Data).srs as Data).value).toMatchObject({ updatedAtMs: SRS_TIME, correct: 2 });
    expect(w.calls.every((call) => call.endsWith(UID))).toBe(true);
  });

  it('битая запись не уходит клиенту — skipped', async () => {
    const w = seeded();
    await migrate.handleAccountsV2MigrateMine(migratePort(w), { auth: { uid: UID } }, flags(true), deps());
    const own = w.v2.entities.get(UID) as Map<string, AccountsV2EntityRecord>;
    const [firstId, record] = [...own.entries()][0];
    own.set(firstId, { ...record, stateJson: '{broken' });
    const page = await pull.handleAccountsV2PullMine(pullPort(w), { auth: { uid: UID }, data: {} }, flags(true), pullDeps());
    expect(page.skipped).toBe(1);
    expect(page.entities).toHaveLength(4);
    expect(page.nextCursor).toBeNull();
  });

  it('лимит частоты: отказ — resource-exhausted, повтор на инстансе без обращения к порту', async () => {
    const w = seeded();
    const d = { ...pullDeps(), rate: { windowMs: 60_000, maxCalls: 1, dayMs: 86_400_000, maxCallsPerDay: 100 } };
    const port = pullPort(w);
    await pull.handleAccountsV2PullMine(port, { auth: { uid: UID }, data: null }, flags(true), d);
    const error = await rejection(pull.handleAccountsV2PullMine(port, { auth: { uid: UID }, data: null }, flags(true), d));
    expect(error.code).toBe('resource-exhausted');
    w.calls.length = 0;
    await rejection(pull.handleAccountsV2PullMine(port, { auth: { uid: UID }, data: null }, flags(true), d));
    expect(w.calls).toEqual([]);
  });
});
