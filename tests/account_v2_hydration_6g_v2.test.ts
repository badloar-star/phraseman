import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import type { AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';
import { accountsV2ProducerEntityKey } from '../modules/account-session-v2/account_sync_producer';
import {
  ACCOUNTS_V2_HYDRATION_STATE_KEY,
  migrationNeeded,
  parseHydration,
  type HydrationSnapshot,
} from '../modules/account-session-v2/account_v2_hydration';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';
import {
  applyHydratedLessons,
  applyHydratedSrs,
} from '../app/accounts_v2_hydration_apply';
import { loadCommunityOwnedPackIds, mergeCommunityOwnedPackIdsFromAccountsV2 } from '../app/community_packs/communityOwnedStorage';
import { loadFlashcards, mergeSavedFlashcardsFromAccountsV2, saveFlashcards, type Flashcard } from '../hooks/use-flashcards';
import { flashcardsSwipeMemoryKey, lessonBestScoreKey } from '../app/target_storage_keys';
import { beginAccountGeneration } from '../app/account_generation';
import { writeSwipeMemoryMerged } from '../app/flashcards/swipe_memory_write';

/*
 * Account V2, Пакет 6G — перенос при первом входе (OD21) и гидрация новой установки.
 *  - порядок «перенос → pull → применение», один проход на область, отметка в области;
 *  - флаг выкл / нет портов = ноль сети;
 *  - hold переноса не мешает гидрации; провал переноса — без pull и без отметки;
 *  - смена аккаунта посреди прохода — ничего не применяется;
 *  - зеркало производителя засевается (повторный снимок = ноль операций), но
 *    существующее зеркало (локальные правки в очереди) не трогается;
 *  - применение «не хуже локального»: урок — лучший из, SRS — по времени, карточки/наборы — объединение.
 */

const A = 'uid-a';
const NOW = 1_800_000_000_000;
const HEX = (n: number) => n.toString(16).padStart(64, '0');

function secureStore(): AccountsV2SecureStorePort {
  const map = new Map<string, string>();
  return {
    getItemAsync: async (key) => map.get(key) ?? null,
    setItemAsync: async (key, value) => { map.set(key, value); },
    deleteItemAsync: async (key) => { map.delete(key); },
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 120; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

const lessonEntity = { entityType: 'lesson_progress', entityId: 'en:lesson:1', revision: 1, updatedAtMs: NOW, state: { best: { passed: true, score: 4.5 } } };
const cardEntity = (id: string, deleted = false, revision = 2) => ({
  entityType: 'flashcard', entityId: `en:saved:${id}`, revision, updatedAtMs: NOW,
  state: deleted ? { deleted: true, fields: {} } : {
    deleted: false,
    fields: {
      id: { value: id, revision: 1, variants: [] },
      en: { value: `phrase ${id}`, revision: 1, variants: [] },
      srs: { value: { updatedAtMs: NOW - 1000, correct: 3, seen: 4 }, revision: 2, variants: [], stamp: [NOW - 1000, 1, 2] },
    },
  },
});
const libraryEntity = {
  entityType: 'library_membership', entityId: 'en:community_packs', revision: 3, updatedAtMs: NOW,
  state: { items: [['pack-a', 1], ['pack-b', 2]], removed: [['pack-x', 3]] },
};

type ServerScript = {
  migrate: jest.Mock;
  pull: jest.Mock;
  applied: HydrationSnapshot[];
};

function server(entities: unknown[], migrateStatus: string | Error = 'done', pageSize = 2): ServerScript {
  const applied: HydrationSnapshot[] = [];
  return {
    applied,
    migrate: jest.fn(async () => {
      if (migrateStatus instanceof Error) throw migrateStatus;
      return { data: { status: migrateStatus, operations: 5, outcomes: {}, holdReasons: [], legacyFound: true, version: 1 } };
    }),
    pull: jest.fn(async ({ cursor }: { cursor: string | null }) => {
      const start = cursor === null ? 0 : parseInt(cursor, 16);
      const page = entities.slice(start, start + pageSize);
      const next = start + pageSize < entities.length ? HEX(start + pageSize) : null;
      return { data: { entities: page, nextCursor: next, skipped: 0, serverNowMs: NOW } };
    }),
  };
}

function harness(script: ServerScript, adapter = new MemoryScopeStorageAdapter(), opts: {
  withHydration?: boolean; nowMs?: number; markHydrated?: (uid: string) => Promise<void>;
  isLocallyApplied?: (uid: string) => Promise<boolean>; clearHydratedMarker?: () => Promise<void>;
} = {}) {
  const state = { enabled: true, authUid: A as string | null };
  const timers: { run: () => void; delayMs: number }[] = [];
  const sent: AccountSyncWireBatch[] = [];
  let nonce = 0;
  let revision = 100;
  const ports = {
    isEnabled: () => state.enabled,
    createStorageAdapter: () => adapter,
    latch: createAccountDetachLatch(secureStore()),
    callSync: jest.fn(async (batch: AccountSyncWireBatch) => {
      sent.push(batch);
      return { data: {
        receipts: batch.operations.map((entry) => ({ operationId: entry.operation.operationId, outcome: 'applied', serverRevision: ++revision })),
        serverNowMs: NOW,
      } };
    }),
    currentAuthUid: () => state.authUid,
    newNonce: () => `n${++nonce}`,
    setTimer: jest.fn((run: () => void, delayMs: number) => { timers.push({ run, delayMs }); return timers.length; }),
    clearTimer: () => undefined,
    nowMs: () => opts.nowMs ?? NOW,
    random: () => 0,
    ...(opts.withHydration === false ? {} : {
      hydration: {
        callMigrate: script.migrate,
        callPull: script.pull,
        applyLocal: jest.fn(async (snapshot: HydrationSnapshot) => {
          script.applied.push(snapshot);
          return { lessons_written: snapshot.lessons.length };
        }),
        ...(opts.markHydrated === undefined ? {} : { markHydrated: opts.markHydrated }),
        ...(opts.isLocallyApplied === undefined ? {} : { isLocallyApplied: opts.isLocallyApplied }),
        ...(opts.clearHydratedMarker === undefined ? {} : { clearHydratedMarker: opts.clearHydratedMarker }),
      },
    }),
  } satisfies AccountsV2ClientPorts;
  return { adapter, state, timers, sent, ports, controller: createAccountsV2ClientController(ports) };
}

/** Запустить таймер гидрации (2 с) и все паузы между раундами переноса. */
async function runHydration(h: ReturnType<typeof harness>): Promise<void> {
  for (let guard = 0; guard < 20; guard += 1) {
    const timer = h.timers.find((item) => item.delayMs === 2_000 || item.delayMs === 6_000);
    if (timer === undefined) return;
    h.timers.splice(h.timers.indexOf(timer), 1);
    timer.run();
    await settle();
  }
}

describe('account v2 hydration 6G — controller flow', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const lines = () => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  test('first start: migrate → paged pull → mirror seeded → applied → marked; same snapshot later = 0 ops', async () => {
    const script = server([lessonEntity, cardEntity('c1'), cardEntity('c2'), libraryEntity]);
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    // фоном, не в кадре старта
    expect(script.migrate).not.toHaveBeenCalled();
    expect(h.timers.some((timer) => timer.delayMs === 2_000)).toBe(true);
    await runHydration(h);
    expect(script.migrate).toHaveBeenCalledTimes(1);
    expect(script.pull).toHaveBeenCalledTimes(2);
    expect(script.migrate.mock.invocationCallOrder[0]).toBeLessThan(script.pull.mock.invocationCallOrder[0]);
    expect(script.applied).toHaveLength(1);
    expect(script.applied[0].lessons).toEqual([{ target: 'en', lessonId: 1, score: 4.5, passed: true }]);
    expect(script.applied[0].cards.map((card) => [card.id, card.srs?.updatedAtMs])).toEqual([['c1', NOW - 1000], ['c2', NOW - 1000]]);
    expect(script.applied[0].libraries).toEqual([{ target: 'en', items: ['pack-a', 'pack-b'], removed: ['pack-x'] }]);
    const records = h.adapter.snapshot(`account:${A}`);
    const mark = records.find((record) => record.key === ACCOUNTS_V2_HYDRATION_STATE_KEY)?.value as Record<string, unknown>;
    expect(mark).toMatchObject({ v: 1, migration: 'done', entities: 4 });
    expect(records.some((record) => record.key === accountsV2ProducerEntityKey('flashcard', 'en:saved:c1'))).toBe(true);
    // Экономия: тот же снимок карточек (без SRS) после гидрации — ноль операций.
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [
      { id: 'c1', en: 'phrase c1' }, { id: 'c2', en: 'phrase c2' },
    ] }, A);
    await h.controller.produce({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 4.5, passed: true }, A);
    expect(lines()).toContain('[ACCOUNT-V2] producer done kind=card_snapshot planned=0 enqueued=0 failed=0');
    expect(lines().some((line) => line.startsWith('[ACCOUNT-V2] producer done kind=lesson_result planned=0'))).toBe(true);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate outcome=hydrated generation=1');
  });

  test('restart on the same install: marked scope → zero network', async () => {
    const script = server([lessonEntity]);
    const adapter = new MemoryScopeStorageAdapter();
    const first = harness(script, adapter);
    await first.controller.setAuthUid(A);
    await settle();
    await runHydration(first);
    await first.controller.stop('test');
    const second = harness(script, adapter);
    await second.controller.setAuthUid(A);
    await settle();
    await runHydration(second);
    expect(script.migrate).toHaveBeenCalledTimes(1);
    expect(script.pull).toHaveBeenCalledTimes(1);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate skip reason=already_hydrated entities=1 migration=done');
  });

  test('migration hold is not an error: pull + apply still run, hold recorded', async () => {
    const script = server([lessonEntity], 'hold');
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(script.applied).toHaveLength(1);
    const mark = h.adapter.snapshot(`account:${A}`).find((record) => record.key === ACCOUNTS_V2_HYDRATION_STATE_KEY)?.value;
    expect(mark).toMatchObject({ migration: 'hold', migrationAtMs: NOW });
  });

  test.each(['hold', 'not_found_yet'])('after %s: hydrated but NOT final — same day no network; next day migration rechecked; done → pull+apply again', async (pending) => {
    const script = server([lessonEntity], pending);
    const adapter = new MemoryScopeStorageAdapter();
    const first = harness(script, adapter);
    await first.controller.setAuthUid(A);
    await settle();
    await runHydration(first);
    expect(script.applied).toHaveLength(1);
    await first.controller.stop('test');
    // тот же день — ни сети, ни применения
    const sameDay = harness(script, adapter, { nowMs: NOW + 3_600_000 });
    await sameDay.controller.setAuthUid(A);
    await settle();
    await runHydration(sameDay);
    await sameDay.controller.stop('test');
    expect(script.migrate).toHaveBeenCalledTimes(1);
    expect(script.pull).toHaveBeenCalledTimes(1);
    // следующий день, перенос всё ещё не окончателен — только перепроверка, без pull
    const stillPending = harness(script, adapter, { nowMs: NOW + 25 * 3_600_000 });
    await stillPending.controller.setAuthUid(A);
    await settle();
    await runHydration(stillPending);
    await stillPending.controller.stop('test');
    expect(script.migrate).toHaveBeenCalledTimes(2);
    expect(script.pull).toHaveBeenCalledTimes(1);
    expect(lines()).toContain(`[ACCOUNT-V2] hydrate migration_still_pending status=${pending} recheckHours=24`);
    // hold снят → done: pull и применение ещё раз, отметка окончательная
    script.migrate.mockResolvedValueOnce({ data: { status: 'done', operations: 3 } });
    const lifted = harness(script, adapter, { nowMs: NOW + 50 * 3_600_000 });
    await lifted.controller.setAuthUid(A);
    await settle();
    await runHydration(lifted);
    expect(script.migrate).toHaveBeenCalledTimes(3);
    expect(script.pull).toHaveBeenCalledTimes(2);
    expect(script.applied).toHaveLength(2);
    const mark = adapter.snapshot(`account:${A}`).find((record) => record.key === ACCOUNTS_V2_HYDRATION_STATE_KEY)?.value;
    expect(mark).toMatchObject({ migration: 'done' });
  });

  // зачем (Пакет 7A, ремонт №1): метка для выключателя старой синхронизации ставится ТОЛЬКО
  // при окончательном переносе — иначе пропуск старого restore оставил бы пустые карточки.
  test.each([
    ['done', 1],
    ['hold', 0],
    ['not_found_yet', 0],
  ])('7A: legacy marker after migration=%s → markHydrated calls=%s', async (status, calls) => {
    const markHydrated = jest.fn(async () => undefined);
    const h = harness(server([lessonEntity], status), new MemoryScopeStorageAdapter(), { markHydrated });
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(markHydrated).toHaveBeenCalledTimes(calls);
    if (calls > 0) expect(markHydrated).toHaveBeenCalledWith(A);
  });

  // зачем (7A, ремонт №2, P1): выход → вход того же uid стирает локальные карточки и метку
  // (общий wipe). Гидрированная область обязана примениться ЗАНОВО, а метка — встать только
  // в запуске, где применение прошло. С меткой — без сети (экономия Firebase).
  test('7A r2: exit → re-login of the same uid: marker wiped → area re-applied, marker set again; marker present → no pull', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const script = server([lessonEntity, cardEntity('c1')]);
    let marker: string | null = null;
    const markHydrated = jest.fn(async (uid: string) => { marker = uid; });
    const isLocallyApplied = jest.fn(async (uid: string) => marker === uid);
    const start = async (): Promise<void> => {
      const h = harness(script, adapter, { markHydrated, isLocallyApplied });
      await h.controller.setAuthUid(A);
      await settle();
      await runHydration(h);
      await h.controller.stop('test');
    };
    await start();
    expect(script.applied).toHaveLength(1);
    expect(marker).toBe(A);
    await start(); // метка на месте — область не тянется заново
    expect(script.pull).toHaveBeenCalledTimes(1);
    expect(script.applied).toHaveLength(1);
    marker = null; // выход: общий wipe стёр карточки и метку
    await start();
    expect(script.pull).toHaveBeenCalledTimes(2);
    expect(script.applied).toHaveLength(2);
    expect(script.applied[1].cards.map((card) => card.id)).toEqual(['c1']);
    expect(marker).toBe(A);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate reapply reason=local_marker_missing entities=2');
  });

  test('7A r2: marker read failure → re-apply (idempotent); marker write failure is logged only', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const script = server([lessonEntity]);
    const first = harness(script, adapter);
    await first.controller.setAuthUid(A);
    await settle();
    await runHydration(first);
    await first.controller.stop('test');
    const markHydrated = jest.fn(async () => { throw new Error('disk_full'); });
    const isLocallyApplied = jest.fn(async () => { throw new Error('io'); });
    const second = harness(script, adapter, { markHydrated, isLocallyApplied });
    await second.controller.setAuthUid(A);
    await settle();
    await runHydration(second);
    expect(script.pull).toHaveBeenCalledTimes(2);
    expect(markHydrated).toHaveBeenCalledWith(A);
    expect(lines().some((line) => line.includes('[ACCOUNT-V2] hydrate legacy_marker_failed'))).toBe(true);
  });

  test('7A r2: seeded card mirror marks server fields as unseen (phone did not see them yet)', async () => {
    const script = server([cardEntity('c1')]);
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    const record = h.adapter.snapshot(`account:${A}`).find((item) => item.key === accountsV2ProducerEntityKey('flashcard', 'en:saved:c1'));
    const mirror = (record?.value as { mirror: { unseen?: string[] } }).mirror;
    expect(mirror.unseen).toEqual(['en']);
  });

  test('migration failure: no pull, no apply, no mark (retried next start)', async () => {
    const script = server([lessonEntity], Object.assign(new Error('x'), { code: 'functions/unavailable' }));
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(script.pull).not.toHaveBeenCalled();
    expect(script.applied).toEqual([]);
    expect(h.adapter.snapshot(`account:${A}`).find((record) => record.key === ACCOUNTS_V2_HYDRATION_STATE_KEY)).toBeUndefined();
    expect(lines()).toContain('[ACCOUNT-V2] hydrate outcome=migration_failed generation=1');
  });

  test('server disabled on migrate → sending stops until restart, nothing pulled', async () => {
    const script = server([lessonEntity], Object.assign(new Error('accounts_v2_disabled'), {
      code: 'functions/failed-precondition', details: { final: true, code: 'accounts_v2_disabled' },
    }));
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(script.pull).not.toHaveBeenCalled();
    expect(h.controller.status().serverDisabled).toBe(true);
  });

  // зачем (7A, ремонт №2, P3): V2 выключена на сервере → метка снимается, restore со
  // следующего старта идёт старым путём (иначе перенесённая бэкапом метка = пустые карточки).
  test('7A r2: server disabled → legacy marker cleared', async () => {
    const script = server([lessonEntity], Object.assign(new Error('accounts_v2_disabled'), {
      code: 'functions/failed-precondition', details: { final: true, code: 'accounts_v2_disabled' },
    }));
    const clearHydratedMarker = jest.fn(async () => undefined);
    const h = harness(script, new MemoryScopeStorageAdapter(), { clearHydratedMarker });
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    await settle();
    expect(clearHydratedMarker).toHaveBeenCalledTimes(1);
    expect(lines()).toContain('[ACCOUNT-V2] lifecycle legacy_marker_cleared reason=server_disabled');
  });

  test('partial migration continues after the pause, then pulls', async () => {
    const script = server([lessonEntity]);
    script.migrate
      .mockResolvedValueOnce({ data: { status: 'partial', operations: 500 } })
      .mockResolvedValueOnce({ data: { status: 'done', operations: 20 } });
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(script.migrate).toHaveBeenCalledTimes(2);
    expect(script.applied).toHaveLength(1);
  });

  test('account switch mid-flight: nothing applied, nothing marked', async () => {
    const script = server([lessonEntity, cardEntity('c1'), cardEntity('c2')]);
    const h = harness(script);
    script.migrate.mockImplementationOnce(async () => {
      h.state.authUid = 'uid-b';
      return { data: { status: 'done', operations: 0 } };
    });
    await h.controller.setAuthUid(A);
    await settle();
    await runHydration(h);
    expect(script.pull).not.toHaveBeenCalled();
    expect(script.applied).toEqual([]);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate outcome=stale generation=1');
  });

  test('flag off / no ports: no hydration timer, zero network', async () => {
    const script = server([lessonEntity]);
    const off = harness(script);
    off.state.enabled = false;
    await off.controller.setAuthUid(A);
    await settle();
    expect(off.timers.some((timer) => timer.delayMs === 2_000)).toBe(false);
    const noPorts = harness(script, new MemoryScopeStorageAdapter(), { withHydration: false });
    await noPorts.controller.setAuthUid(A);
    await settle();
    await runHydration(noPorts);
    expect(script.migrate).not.toHaveBeenCalled();
    expect(lines()).toContain('[ACCOUNT-V2] hydrate skip reason=ports_missing');
  });

  test('existing producer mirror (local deletion queued) is kept; that card is not handed to the app', async () => {
    const script = server([cardEntity('c1'), libraryEntity]);
    const h = harness(script);
    await h.controller.setAuthUid(A);
    await settle();
    // Локально: c1 есть, затем удалена (tombstone в очереди), и набор добавлен — до гидрации.
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c1', en: 'phrase c1' }, { id: 'c9', en: 'x' }] }, A);
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c9', en: 'x' }] }, A);
    await h.controller.produce({ kind: 'library_snapshot', target: 'en', packIds: ['pack-local'] }, A);
    const before = h.adapter.snapshot(`account:${A}`).find((record) => record.key === accountsV2ProducerEntityKey('flashcard', 'en:saved:c1'));
    await runHydration(h);
    const after = h.adapter.snapshot(`account:${A}`).find((record) => record.key === accountsV2ProducerEntityKey('flashcard', 'en:saved:c1'));
    expect(after).toEqual(before);
    expect(script.applied[0].cards).toEqual([]);
    expect(script.applied[0].libraries).toEqual([]);
  });
});

describe('account v2 hydration 6G — parsing and gates', () => {
  test('parseHydration skips foreign shapes and bad ids; tombstone → deleted card without srs', () => {
    const parsed = parseHydration([
      { entityType: 'lesson_progress', entityId: 'xx-yy:lesson:1', revision: 1, state: { best: { passed: true, score: 1 } } },
      { entityType: 'lesson_progress', entityId: 'en:lesson:abc', revision: 1, state: { best: { passed: true, score: 1 } } },
      { entityType: 'mystery', entityId: 'en:x', revision: 1, state: {} },
      { entityType: 'flashcard', entityId: 'en:saved:c1', revision: 1, state: { deleted: true, fields: {} } },
    ]);
    expect(parsed.skipped).toBe(3);
    expect(parsed.snapshot.cards).toEqual([expect.objectContaining({ id: 'c1', deleted: true, srs: null })]);
    expect(parsed.listIndexes).toEqual([]);
  });

  test('migrationNeeded: done → no; hold younger than a day → no; hold older → yes', () => {
    const base = { v: 1 as const, hydratedAtMs: null, entities: 0 };
    expect(migrationNeeded({ ...base, migration: 'done', migrationAtMs: NOW }, NOW)).toBe(false);
    expect(migrationNeeded({ ...base, migration: 'hold', migrationAtMs: NOW - 1000 }, NOW)).toBe(false);
    expect(migrationNeeded({ ...base, migration: 'hold', migrationAtMs: NOW - 25 * 3_600_000 }, NOW)).toBe(true);
    expect(migrationNeeded({ ...base, migration: null, migrationAtMs: null }, NOW)).toBe(true);
  });
});

describe('account v2 hydration 6G — local apply rules', () => {
  const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    asyncStorageMock.__reset();
    beginAccountGeneration('stable-hydration-test');
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  test('lesson: best of — server never lowers a local score; unsupported target untouched', async () => {
    await AsyncStorage.multiSet([[lessonBestScoreKey(1, 'en'), '4.5'], [lessonBestScoreKey(2, 'en'), '2']]);
    const counts: Record<string, number> = {};
    await applyHydratedLessons([
      { target: 'en', lessonId: 1, score: 3, passed: true },
      { target: 'en', lessonId: 2, score: 4, passed: true },
      { target: 'en', lessonId: 3, score: 5, passed: true },
      { target: 'xx', lessonId: 4, score: 5, passed: true },
    ], () => true, counts);
    expect(await AsyncStorage.getItem(lessonBestScoreKey(1, 'en'))).toBe('4.5');
    expect(await AsyncStorage.getItem(lessonBestScoreKey(2, 'en'))).toBe('4');
    expect(await AsyncStorage.getItem(lessonBestScoreKey(3, 'en'))).toBe('5');
    expect(counts).toMatchObject({ lessons_written: 2, lessons_kept_local: 1, lessons_target_unsupported: 1 });
  });

  test('SRS: newer local edit wins; newer server edit replaces; account switch stops before writing', async () => {
    const key = flashcardsSwipeMemoryKey('en');
    await AsyncStorage.setItem(key, JSON.stringify({
      'saved:all:c1': { correct: 9, seen: 9, lastSeenAt: NOW },
      'saved:all:c2': { correct: 1, seen: 1, lastSeenAt: NOW - 5000 },
    }));
    const card = (id: string, time: number) => ({
      target: 'en', list: 'saved' as const, id, deleted: false, fields: {}, srs: { updatedAtMs: time, correct: 2, seen: 2 },
    });
    const counts: Record<string, number> = {};
    await applyHydratedSrs([card('c1', NOW - 1), card('c2', NOW - 1), card('c3', NOW - 1)], () => true, counts);
    const memory = JSON.parse(String(await AsyncStorage.getItem(key)));
    expect(memory['saved:all:c1']).toMatchObject({ correct: 9, lastSeenAt: NOW });
    expect(memory['saved:all:c2']).toMatchObject({ correct: 2, lastSeenAt: NOW - 1 });
    expect(memory['saved:all:c3']).toMatchObject({ correct: 2, seen: 2, lastSeenAt: NOW - 1, ease: 2.2 });
    expect(counts).toMatchObject({ srs_written: 2, srs_kept_local: 1 });
    await expect(applyHydratedSrs([card('c4', NOW)], () => false, {})).rejects.toThrow('hydration_stale');
    expect(JSON.parse(String(await AsyncStorage.getItem(key)))['saved:all:c4']).toBeUndefined();
  });

  test('swipe save and hydration share one queue and merge by edit time (no lost rows either way)', async () => {
    const key = flashcardsSwipeMemoryKey('en');
    await AsyncStorage.setItem(key, JSON.stringify({ 'saved:all:old': { correct: 1, lastSeenAt: NOW - 9000 } }));
    // экран держит снимок, сделанный ДО гидрации, и пишет его одновременно с гидрацией
    const screenSnapshot = { 'saved:all:old': { correct: 1, lastSeenAt: NOW - 9000 }, 'saved:all:swiped': { correct: 1, lastSeenAt: NOW } };
    const card = { target: 'en', list: 'saved' as const, id: 'hyd', deleted: false, fields: {}, srs: { updatedAtMs: NOW - 10, correct: 7 } };
    await Promise.all([
      applyHydratedSrs([card], () => true, {}),
      writeSwipeMemoryMerged(key, screenSnapshot),
    ]);
    const memory = JSON.parse(String(await AsyncStorage.getItem(key)));
    expect(Object.keys(memory).sort()).toEqual(['saved:all:hyd', 'saved:all:old', 'saved:all:swiped']);
    expect(memory['saved:all:hyd']).toMatchObject({ correct: 7 });
    // снимок экрана со СТАРОЙ строкой не затирает более свежую на диске
    await writeSwipeMemoryMerged(key, { 'saved:all:hyd': { correct: 0, lastSeenAt: 1 } });
    expect(JSON.parse(String(await AsyncStorage.getItem(key)))['saved:all:hyd']).toMatchObject({ correct: 7 });
  });

  test('saved cards: only missing ones are added (by id and by phrase), existing stay as they are', async () => {
    await saveFlashcards([{ id: 'c1', en: 'hello', ru: 'локально', uk: '', source: 'lesson', addedAt: 1 } as Flashcard], 'en');
    const added = await mergeSavedFlashcardsFromAccountsV2('en', [
      { id: 'c1', en: 'hello', ru: 'с сервера', uk: '', source: 'lesson', addedAt: 1 } as Flashcard,
      { id: 'c7', en: 'Hello', ru: 'дубль фразы', uk: '', source: 'lesson', addedAt: 2 } as Flashcard,
      { id: 'c2', en: 'bye', ru: 'пока', uk: '', source: 'lesson', addedAt: 3 } as Flashcard,
    ]);
    expect(added).toBe(1);
    const cards = await loadFlashcards('en');
    expect(cards.map((card) => [card.id, card.ru])).toEqual([['c1', 'локально'], ['c2', 'пока']]);
  });

  test('library: union with tombstones — server-removed ids are not added, local ids are never removed', async () => {
    await AsyncStorage.setItem('community_owned_pack_ids_v1', JSON.stringify(['pack-local', 'pack-x']));
    // 'pack-z' пришёл и живым, и удалённым (порча/гонка) — tombstone главнее, не добавляем.
    const added = await mergeCommunityOwnedPackIdsFromAccountsV2(['pack-a', 'pack-local', 'pack-z'], ['pack-x', 'pack-gone', 'pack-z'], 'en');
    expect(added).toBe(1);
    expect(await loadCommunityOwnedPackIds('en')).toEqual(['pack-local', 'pack-x', 'pack-a']);
  });
});
