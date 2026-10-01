import fs from 'fs';
import path from 'path';
import { createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import type { AccountsV2SecureStorePort } from '../modules/account-session-v2/account_deletion_credential';
import type { AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';
import {
  canonicalJson,
  planAccountsV2Change,
  type AccountsV2Change,
  type EntityMirror,
  type ProducerEntityType,
} from '../modules/account-session-v2/account_sync_producer_plan';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientPorts,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6F — производитель операций (dual-write за флагом):
 *  - чистое планирование: урок (только лучший), карточки (разница с зеркалом,
 *    tombstone при удалении, защита от «массового удаления»), свайпы → `srs`
 *    c updatedAtMs = lastSeenAt, библиотека (только новые id);
 *  - флаг выкл = ноль операций; нет сессии/чужой uid — ничего;
 *  - порядок по сущности (clientSequence растёт), база — из квитанции;
 *  - повтор того же снимка — ноль операций.
 */

const ROOT = path.resolve(__dirname, '..');
const A = 'uid-a';
const NOW = 1_800_000_000_000;

type Mirrors = Map<string, EntityMirror>;
const keyOf = (type: ProducerEntityType, id: string) => `${type}|${id}`;

async function plan(change: AccountsV2Change, mirrors: Mirrors = new Map(), index: Map<string, readonly string[]> = new Map()) {
  return planAccountsV2Change(change, async (type, id) => mirrors.get(keyOf(type, id)) ?? null, async (key) => index.get(key) ?? null);
}

/** Применить план к «зеркалу» — как это сделал бы производитель после постановки. */
async function planAndApply(change: AccountsV2Change, mirrors: Mirrors, index: Map<string, readonly string[]>) {
  const result = await plan(change, mirrors, index);
  for (const op of result.operations) mirrors.set(keyOf(op.entityType, op.entityId), op.mirror);
  if (result.listIndex !== null) index.set(result.listIndex.key, result.listIndex.ids);
  return result;
}

describe('account v2 producer 6F — planning', () => {
  test('lesson: first result → op; not better → none; better → op', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    const first = await planAndApply({ kind: 'lesson_result', target: 'en', lessonId: 3, score: 2.5, passed: false }, mirrors, index);
    expect(first.operations).toEqual([expect.objectContaining({
      entityType: 'lesson_progress', entityId: 'en:lesson:3', payload: { passed: false, score: 2.5 },
    })]);
    expect((await planAndApply({ kind: 'lesson_result', target: 'en', lessonId: 3, score: 2.5, passed: false }, mirrors, index)).operations).toEqual([]);
    expect((await planAndApply({ kind: 'lesson_result', target: 'en', lessonId: 3, score: 2, passed: false }, mirrors, index)).notes).toEqual(['lesson_not_better']);
    const better = await planAndApply({ kind: 'lesson_result', target: 'en', lessonId: 3, score: 4, passed: true }, mirrors, index);
    expect(better.operations[0].payload).toEqual({ passed: true, score: 4 });
  });

  test('cards: snapshot → upserts; same snapshot → nothing; edit → only changed field; delete → tombstone', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    const cards = [
      { id: 'c1', en: 'hello', ru: 'привет', srs: { x: 1 } },
      { id: 'c2', en: 'bye', ru: 'пока' },
      { id: 'c3', en: 'yes', ru: 'да', extra: undefined },
    ];
    const first = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards }, mirrors, index);
    expect(first.operations.map((op) => op.entityId)).toEqual(['en:saved:c1', 'en:saved:c2', 'en:saved:c3']);
    // 8B: сохранённая карточка уходит в нормализованной форме приложения (studyTarget, packLanguage, uk ← ru).
    expect(first.operations[0].payload).toEqual({ op: 'upsert', fields: { id: 'c1', en: 'hello', ru: 'привет', uk: 'привет', studyTarget: 'en', packLanguage: 'en' } });
    expect((await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards }, mirrors, index)).operations).toEqual([]);
    const edited = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [
      { id: 'c1', en: 'hello', ru: 'здравствуй' }, cards[1], cards[2],
    ] }, mirrors, index);
    expect(edited.operations).toHaveLength(1);
    // 8B: uk у этой карточки производное от ru (как показывает приложение) — меняется вместе с ним.
    expect(edited.operations[0].payload).toEqual({ op: 'upsert', fields: { ru: 'здравствуй', uk: 'здравствуй' } });
    const removed = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [
      { id: 'c1', en: 'hello', ru: 'здравствуй' }, cards[1],
    ] }, mirrors, index);
    expect(removed.operations).toEqual([expect.objectContaining({ entityId: 'en:saved:c3', payload: { op: 'tombstone' } })]);
    // Карточку после tombstone не «воскрешаем» (ядро всё равно не даст).
    const back = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards }, mirrors, index);
    // c1 вернулся к «привет» — это обычная правка; c3 после tombstone пропущена.
    expect(back.operations.map((op) => [op.entityId, op.payload])).toEqual([
      ['en:saved:c1', { op: 'upsert', fields: { ru: 'привет', uk: 'привет' } }],
    ]);
    expect(back.notes).toEqual(['card_resurrect_unsupported count=1']);
  });

  test('cards: an empty snapshot over a known list is NOT turned into mass tombstones', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, mirrors, index);
    const wipe = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [] }, mirrors, index);
    expect(wipe.operations).toEqual([]);
    expect(wipe.notes).toEqual(['card_mass_delete_skipped removed=3 known=3']);
    expect(index.get('en:custom')).toEqual(['a', 'b', 'c']);
  });

  test('swipes: saved/custom → srs with updatedAtMs = lastSeenAt; packs and no-time rows skipped; unchanged → nothing', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    const memory = {
      'saved:all:c1': { correct: 1, wrong: 0, hints: 0, seen: 1, mastered: 0, lastSeenAt: NOW, nextDueAt: NOW + 5, ease: 2.2 },
      'custom:all:k9': { correct: 0, wrong: 1, hints: 0, seen: 1, mastered: 0, lastSeenAt: NOW - 1, nextDueAt: NOW, ease: 2 },
      'community:pack1:z': { seen: 1, lastSeenAt: NOW },
      'saved:all:never': { seen: 0, lastSeenAt: 0 },
    };
    const first = await planAndApply({ kind: 'swipe_memory', target: 'es', memory }, mirrors, index);
    expect(first.operations.map((op) => op.entityId)).toEqual(['es:custom:k9', 'es:saved:c1']);
    expect(first.operations[1].payload).toEqual({ op: 'upsert', fields: { srs: {
      updatedAtMs: NOW, correct: 1, wrong: 0, hints: 0, seen: 1, mastered: 0, lastSeenAt: NOW, nextDueAt: NOW + 5, ease: 2.2,
    } } });
    expect(first.notes).toEqual(['swipe_pack_cards_skipped count=1', 'swipe_no_edit_time count=1']);
    expect((await planAndApply({ kind: 'swipe_memory', target: 'es', memory }, mirrors, index)).operations).toEqual([]);
  });

  test('library: only new ids; same list → nothing', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    const first = await planAndApply({ kind: 'library_snapshot', target: 'en', packIds: ['p2', 'p1'] }, mirrors, index);
    expect(first.operations).toEqual([expect.objectContaining({ entityId: 'en:community_packs', payload: { itemIds: ['p1', 'p2'] } })]);
    expect((await planAndApply({ kind: 'library_snapshot', target: 'en', packIds: ['p1', 'p2'] }, mirrors, index)).operations).toEqual([]);
    const next = await planAndApply({ kind: 'library_snapshot', target: 'en', packIds: ['p1', 'p2', 'p3'] }, mirrors, index);
    expect(next.operations[0].payload).toEqual({ itemIds: ['p3'] });
  });

  test('canonical JSON ignores key order', () => {
    expect(canonicalJson({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe(canonicalJson({ a: [1, { c: 3, d: 2 }], b: 1 }));
  });
});

function secureStore(): AccountsV2SecureStorePort {
  const map = new Map<string, string>();
  return {
    getItemAsync: async (key) => map.get(key) ?? null,
    setItemAsync: async (key, value) => { map.set(key, value); },
    deleteItemAsync: async (key) => { map.delete(key); },
  };
}

async function settle(): Promise<void> {
  for (let index = 0; index < 80; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

function harness() {
  const adapter = new MemoryScopeStorageAdapter();
  const state = { enabled: true, authUid: A as string | null };
  const sent: AccountSyncWireBatch[] = [];
  const timers: { run: () => void; delayMs: number }[] = [];
  let nonce = 0;
  let revision = 0;
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
    nowMs: () => NOW,
    random: () => 0,
  } satisfies AccountsV2ClientPorts;
  return { adapter, state, sent, timers, ports, controller: createAccountsV2ClientController(ports) };
}

const ops = (batches: readonly AccountSyncWireBatch[]) => batches.flatMap((batch) => batch.operations.map((entry) => entry.operation));

describe('account v2 producer 6F — controller', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const lines = () => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); jest.resetModules(); });

  test('flag ON: snapshot → ops queued and sent after the wake pause; per-entity sequence grows; base comes from the receipt', async () => {
    const h = harness();
    await h.controller.setAuthUid(A);
    await settle();
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c1', en: 'hi', ru: 'привет' }] }, A);
    expect(h.timers.at(-1)?.delayMs).toBe(3_000);
    h.timers.at(-1)!.run();
    await settle();
    const first = ops(h.sent);
    expect(first).toEqual([expect.objectContaining({
      entityType: 'flashcard', entityId: 'en:saved:c1', clientSequence: 1, baseRevision: 0,
      payload: { op: 'upsert', fields: { id: 'c1', en: 'hi', ru: 'привет', uk: 'привет', studyTarget: 'en', packLanguage: 'en' } },
    })]);
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c1', en: 'hi', ru: 'здравствуй' }] }, A);
    h.timers.at(-1)!.run();
    await settle();
    const second = ops(h.sent).slice(1);
    expect(second).toEqual([expect.objectContaining({
      entityId: 'en:saved:c1', clientSequence: 2, baseRevision: 1, payload: { op: 'upsert', fields: { ru: 'здравствуй', uk: 'здравствуй' } },
    })]);
    // Тот же снимок ещё раз — ни одной операции.
    const before = h.sent.length;
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c1', en: 'hi', ru: 'здравствуй' }] }, A);
    await settle();
    expect(h.sent.length).toBe(before);
    expect(lines().some((line) => line.includes('producer done kind=card_snapshot planned=0 enqueued=0'))).toBe(true);
  });

  test('flag OFF: zero operations, zero storage work', async () => {
    const h = harness();
    await h.controller.setAuthUid(A);
    await settle();
    h.state.enabled = false;
    await h.controller.produce({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 5, passed: true }, A);
    await settle();
    expect(h.adapter.snapshot(`account:${A}`).filter((record) => record.key.startsWith('__account_v2_producer__'))).toEqual([]);
    expect(lines()).toContain('[ACCOUNT-V2] producer skip reason=flag_off kind=lesson_result');
  });

  test('no session / another account signed in → nothing written into the scope', async () => {
    const h = harness();
    await h.controller.produce({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 5, passed: true }, A);
    expect(lines()).toContain('[ACCOUNT-V2] producer skip reason=no_session kind=lesson_result');
    await h.controller.setAuthUid(A);
    await settle();
    h.state.authUid = 'uid-b';
    await h.controller.produce({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 5, passed: true }, A);
    expect(lines()).toContain('[ACCOUNT-V2] producer skip reason=auth_mismatch kind=lesson_result');
    expect(h.adapter.snapshot(`account:${A}`).filter((record) => record.key.startsWith('__account_v2_producer__'))).toEqual([]);
  });

  test('lesson op uses baseRevision null (D66) and two ops of one entity keep their order in one batch', async () => {
    const h = harness();
    await h.controller.setAuthUid(A);
    await settle();
    await h.controller.produce({ kind: 'lesson_result', target: 'fr', lessonId: 7, score: 2, passed: false }, A);
    await h.controller.produce({ kind: 'lesson_result', target: 'fr', lessonId: 7, score: 4.5, passed: true }, A);
    h.timers.at(-1)!.run();
    await settle();
    const sentOps = ops(h.sent);
    expect(sentOps.map((op) => [op.entityId, op.clientSequence, op.baseRevision])).toEqual([
      ['fr:lesson:7', 1, null], ['fr:lesson:7', 2, null],
    ]);
  });
});

describe('account v2 producer 6F — app wiring', () => {
  const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

  test('flag OFF: produceAccountsV2ChangeIfEnabled never builds the change nor loads the client', () => {
    jest.resetModules();
    jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => false }));
    const runtime = jest.fn();
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => { runtime(); return {}; });
    jest.useFakeTimers();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const flag = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
      const build = jest.fn();
      expect(flag.captureAccountsV2OwnerUid()).toBeNull();
      flag.produceAccountsV2ChangeIfEnabled('uid-a', build);
      jest.runAllTimers();
      expect(build).not.toHaveBeenCalled();
      expect(runtime).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      jest.dontMock('../app/remote_flags');
      jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime');
    }
  });

  test.each([
    ['app/medal_utils.ts', "kind: 'lesson_result'"],
    ['hooks/use-flashcards.ts', "kind: 'card_snapshot', target, list: 'saved'"],
    ['app/flashcards/custom_cards_store.ts', "kind: 'card_snapshot', target, list: 'custom'"],
    ['app/flashcards_swipe.tsx', "kind: 'swipe_memory'"],
    ['app/community_packs/communityOwnedStorage.ts', "kind: 'library_snapshot'"],
  ])('%s: one deferred, flag-gated producer call after the write', (file, marker) => {
    const source = read(file);
    expect(source.split('produceAccountsV2ChangeIfEnabled(').length - 1).toBe(1);
    const at = source.indexOf('produceAccountsV2ChangeIfEnabled(v2Owner, () => (');
    expect(at).toBeGreaterThan(0);
    // Ремонт №1 (P2): владелец фиксируется синхронно (до await/таймеров), а не при постановке.
    expect(source).toContain('captureAccountsV2OwnerUid()');
    expect(source.slice(at, at + 400)).toContain(marker);
    // Статического импорта модулей V2 в местах записи нет — только лёгкие ворота флага.
    expect(source).not.toMatch(/account-session-v2/);
  });
});

describe('account v2 producer 6F — repair 1', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const lines = () => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); jest.resetModules(); });

  test('P2 race: change written by A, account switched to B before it is queued → nothing lands in B', async () => {
    const h = harness();
    await h.controller.setAuthUid(A);
    await settle();
    // A пишет (владелец зафиксирован A), человек переключается на B раньше постановки.
    h.state.authUid = 'uid-b';
    await h.controller.setAuthUid('uid-b');
    await settle();
    expect(h.controller.status().uid).toBe('uid-b');
    await h.controller.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'a-card', en: 'A only' }] }, A);
    await settle();
    expect(lines()).toContain('[ACCOUNT-V2] producer skip reason=uid_mismatch kind=card_snapshot');
    expect(h.adapter.snapshot('account:uid-b').filter((record) => record.key.startsWith('__account_v2_producer__'))).toEqual([]);
    expect(h.sent).toEqual([]);
  });

  test('P2 wrapper: authenticated owner is captured synchronously and handed to the runtime queue', () => {
    jest.resetModules();
    const auth = { currentUser: { uid: A, isAnonymous: false } as { uid: string; isAnonymous: boolean } | null };
    jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => true }));
    jest.doMock('@react-native-firebase/auth', () => ({ __esModule: true, default: () => auth }));
    const produce = jest.fn(async () => undefined);
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => ({ produceAccountsV2Change: produce }));
    jest.useFakeTimers();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const flag = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
      const owner = flag.captureAccountsV2OwnerUid();
      flag.produceAccountsV2ChangeIfEnabled(owner, () => ({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 5, passed: true }));
      auth.currentUser = { uid: 'uid-b', isAnonymous: false }; // смена аккаунта после захвата владельца
      expect(produce).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson_result' }), A, expect.any(Function));
      expect(jest.getTimerCount()).toBe(0);
      flag.produceAccountsV2ChangeIfEnabled(null, () => ({ kind: 'lesson_result', target: 'en', lessonId: 1, score: 5, passed: true }));
      expect(produce).toHaveBeenCalledTimes(1);
      expect(lines()).toContain('[ACCOUNT-V2] produce skip reason=no_owner');
    } finally {
      jest.useRealTimers();
      jest.dontMock('../app/remote_flags');
      jest.dontMock('@react-native-firebase/auth');
      jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime');
    }
  });

  test('P3: a single card disappearing into an EMPTY snapshot is not tombstoned', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'only' }] }, mirrors, index);
    const empty = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [] }, mirrors, index);
    expect(empty.operations).toEqual([]);
    expect(empty.notes).toEqual(['card_mass_delete_skipped removed=1 known=1']);
  });

  // зачем (Пакет 7A): TEMP ремонта №1 закрыт — пропавшее поле теперь снимается `unsetFields`.
  test('7A: a removed card field is sent as unsetFields together with changed fields; repeat → none', async () => {
    const mirrors: Mirrors = new Map();
    const index = new Map<string, readonly string[]>();
    await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c', en: 'x', note: 'n' }] }, mirrors, index);
    const next = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c', en: 'y' }] }, mirrors, index);
    // ремонт №2 (P2b): снятие — отдельной операцией после правки полей.
    expect(next.operations.map((op) => op.payload)).toEqual([
      { op: 'upsert', fields: { en: 'y' } },
      { op: 'upsert', fields: {}, unsetFields: ['note'] },
    ]);
    expect(next.operations[0].mirror.fields).toHaveProperty('note');
    expect(next.notes).toEqual(['card_field_unset count=1']);
    expect(mirrors.get(keyOf('flashcard', 'en:saved:c'))?.fields).not.toHaveProperty('note');
    const again = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c', en: 'y' }] }, mirrors, index);
    expect(again.operations).toEqual([]);
  });

  // 8B: тесты снятия полей — на своих карточках: логика снятия общая для списков, а у
  // сохранённых нормализация (8B) дописывает производные поля, которых нет в синтетическом зеркале.
  test('7A: only-removal op has empty fields; srs/srsPolicy/id are never unset; unchanged card → no op', async () => {
    const mirrors: Mirrors = new Map([[keyOf('flashcard', 'en:custom:c'), {
      fields: { id: '"c"', en: '"x"', note: '"n"', srs: '{}', srsPolicy: '{}' }, deleted: false,
    }]]);
    const index = new Map<string, readonly string[]>([['en:custom', ['c']]]);
    const removal = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c', en: 'x' }] }, mirrors, index);
    expect(removal.operations.map((op) => op.payload)).toEqual([{ op: 'upsert', fields: {}, unsetFields: ['note'] }]);
    expect(mirrors.get(keyOf('flashcard', 'en:custom:c'))?.fields).toEqual({ id: '"c"', en: '"x"', srs: '{}', srsPolicy: '{}' });
  });

  test('7A: more than 64 dropped fields → first 64 now (sorted), the rest on the next snapshot', async () => {
    const fields: Record<string, string> = { id: '"c"' };
    for (let i = 0; i < 70; i += 1) fields[`f${String(i).padStart(2, '0')}`] = '"v"';
    const mirrors: Mirrors = new Map([[keyOf('flashcard', 'en:custom:c'), { fields, deleted: false }]]);
    const index = new Map<string, readonly string[]>([['en:custom', ['c']]]);
    const first = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c' }] }, mirrors, index);
    expect(first.operations).toHaveLength(1);
    const unset1 = (first.operations[0].payload as { unsetFields: string[] }).unsetFields;
    expect(unset1).toHaveLength(64);
    expect(first.notes).toEqual(['card_field_unset_deferred count=6', 'card_field_unset count=64']);
    const second = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c' }] }, mirrors, index);
    expect((second.operations[0].payload as { unsetFields: string[] }).unsetFields).toEqual(['f64', 'f65', 'f66', 'f67', 'f68', 'f69']);
  });

  // зачем (ремонт №2, P2a): поле, засеянное гидрацией с сервера и не встреченное в локальной
  // копии, НЕ снимается — иначе add-only применение + первый снимок стёрли бы чужую правку.
  test('7A r2: unseen (server-seeded) fields are never unset; once seen locally, a later removal is unset', async () => {
    const mirrors: Mirrors = new Map([[keyOf('flashcard', 'en:custom:c'), {
      fields: { id: '"c"', en: '"x"', note: '"server note"' }, deleted: false, unseen: ['en', 'note'],
    }]]);
    const index = new Map<string, readonly string[]>([['en:custom', ['c']]]);
    const first = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c', en: 'x' }] }, mirrors, index);
    expect(first.operations).toEqual([]);
    expect(first.notes).toEqual(['card_field_unset_unseen_skipped count=1']);
    // локальная правка карточки: зеркало запоминает, что `en` уже видел, `note` — нет
    const edited = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c', en: 'y' }] }, mirrors, index);
    expect(edited.operations.map((op) => op.payload)).toEqual([{ op: 'upsert', fields: { en: 'y' } }]);
    expect(mirrors.get(keyOf('flashcard', 'en:custom:c'))?.unseen).toEqual(['note']);
    // `note` появилось локально (увидел), затем удалено человеком → снятие
    await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c', en: 'y', note: 'mine' }] }, mirrors, index);
    expect(mirrors.get(keyOf('flashcard', 'en:custom:c'))?.unseen).toBeUndefined();
    const removed = await planAndApply({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: [{ id: 'c', en: 'y' }] }, mirrors, index);
    expect(removed.operations.map((op) => op.payload)).toEqual([{ op: 'upsert', fields: {}, unsetFields: ['note'] }]);
  });

  test('7A r2: swipe SRS op keeps the unseen list', async () => {
    const mirrors: Mirrors = new Map([[keyOf('flashcard', 'en:saved:c'), { fields: { note: '"n"' }, deleted: false, unseen: ['note'] }]]);
    const plan = await planAndApply({ kind: 'swipe_memory', target: 'en', memory: { 'saved:all:c': { lastSeenAt: 5, correct: 1 } } }, mirrors, new Map());
    expect(plan.operations).toHaveLength(1);
    expect(mirrors.get(keyOf('flashcard', 'en:saved:c'))?.unseen).toEqual(['note']);
  });

  test('P3: base/sequence re-checked INSIDE the transaction; a receipt landing in between → retried with fresh base', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAccountsV2Producer } = require('../modules/account-session-v2/account_sync_producer') as typeof import('../modules/account-session-v2/account_sync_producer');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const records = require('../modules/account-session-v2/account_sync_outbox_records') as typeof import('../modules/account-session-v2/account_sync_outbox_records');
    const store = new Map<string, unknown>();
    const entityKey = `__account_v2_producer__:entity:${JSON.stringify(['flashcard', 'en:saved:c'])}`;
    store.set(entityKey, { v: 1, mirror: { fields: {}, deleted: false }, sequence: 1, base: 0, lastOperationId: 'op-1' });
    let calls = 0;
    const enqueued: unknown[] = [];
    const ackRecord = records.ackJson(A, {
      sequence: 0,
      envelope: { ownerUid: A, operation: { schemaVersion: 1, operationId: 'op-1', entityType: 'flashcard', entityId: 'en:saved:c', clientSequence: 1, baseRevision: 0, payload: { op: 'tombstone' } } },
      receipt: { operationId: 'op-1', outcome: 'applied', serverRevision: 7 },
      resolved: true,
    });
    const readRecord = async (key: string) => (store.has(key) ? { key, value: store.get(key) as never } : null);
    const tx = {
      readRecord,
      putRecord: async (record: { key: string; value: unknown }) => { store.set(record.key, record.value); },
      deleteRecord: async () => undefined,
      readAckServerRevision: async (operationId: string) => {
        const record = store.get(records.operationKey('ack', operationId));
        return record === undefined ? null : records.parseAck(record as never, A).receipt.serverRevision;
      },
    };
    const producer = createAccountsV2Producer({
      uid: A,
      fence: { scopeKey: `account:${A}`, uid: A, generation: 1, nonce: 'n' },
      handle: { readRecord, withTransaction: async (work) => { await work(tx); } },
      outbox: {
        applyLocalMutation: async (owned, _fence, mutation) => {
          calls += 1;
          // Между чтением и транзакцией пришла квитанция op-1 (ревизия 7).
          if (calls === 1) store.set(records.operationKey('ack', 'op-1'), ackRecord);
          await mutation(tx);
          enqueued.push(owned.operation);
          return Object.freeze({ outcome: 'enqueued' as const, pendingCount: 1 });
        },
      },
      newOperationId: () => `op-${calls + 2}`,
    });
    const result = await producer.produce({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 'c', en: 'x' }] });
    expect(result.enqueued).toBe(1);
    expect(calls).toBe(2);
    expect(enqueued).toEqual([expect.objectContaining({ clientSequence: 2, baseRevision: 7 })]);
    expect(lines().some((line) => line.includes('producer stale_read_retry attempt=1'))).toBe(true);
  });

  test('P2 swipes: owner fixed at swipe time (scheduling), the deferred flush only carries it', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');
    expect(source).toContain('pendingSwipeMemory = { memory, studyTarget, v2Owner: captureAccountsV2OwnerUid() };');
    expect(source).toContain('void saveSwipeMemory(pending.memory, pending.studyTarget, pending.v2Owner)');
    expect(source.split('captureAccountsV2OwnerUid()').length - 1).toBe(1);
  });

  test('OD23: without EXPO_PUBLIC_FIREBASE_EMULATOR_HOST the dev email-login route and module are blocked from the bundle', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawnSync } = require('child_process') as typeof import('child_process');
    const script = [
      "const path = require('path');",
      "const config = require(path.join(process.cwd(), 'metro.config.js'));",
      "const files = ['app/dev-emulator-login.tsx', 'app/firebase_emulator_dev_login.ts', 'app/firebase_emulator_dev_boot.ts']",
      "  .map((file) => config.resolver.blockList.some((rule) => rule.test(path.join(process.cwd(), file))));",
      'process.stdout.write(JSON.stringify(files));',
    ].join('\n');
    const run = (env: NodeJS.ProcessEnv) => JSON.parse(spawnSync(process.execPath, ['-e', script], { cwd: ROOT, env, encoding: 'utf8' }).stdout) as boolean[];
    const base = { ...process.env };
    delete base.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
    expect(run(base)).toEqual([true, true, false]);
    expect(run({ ...base, EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '10.0.2.2' })).toEqual([false, false, false]);
    expect(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8')).not.toContain('EXPO_PUBLIC_FIREBASE_EMULATOR_HOST');
  });
});
