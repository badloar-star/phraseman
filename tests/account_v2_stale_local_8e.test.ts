import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrateAccountsV2Scope } from '../modules/account-session-v2/account_v2_hydration';
import { accountsV2ProducerEntityKey } from '../modules/account-session-v2/account_sync_producer';
import { planAccountsV2Change, type EntityMirror } from '../modules/account-session-v2/account_sync_producer_plan';
import { applyAccountsV2HydrationLocally } from '../app/accounts_v2_hydration_apply';
import { applyHydratedCardConflicts, decideCardConflict } from '../app/accounts_v2_hydration_conflicts';
import { loadFlashcards, saveFlashcards, type Flashcard } from '../hooks/use-flashcards';
import { listCustomCards, upsertCustomCard, __resetCustomCardsStoreForTests } from '../app/flashcards/custom_cards_store';
import type { CardItem } from '../app/flashcards/types';
import { beginAccountGeneration } from '../app/account_generation';

/*
 * Account V2, Пакет 8E — старая локальная копия не перезаписывает правку с другого устройства.
 * Сценарий B→A: на B человек правит свою карточку → на A та же карточка со старым текстом →
 * гидрация A засевала зеркало сервером, а применение было add-only → первый снимок A слал
 * старый текст как правку (со свежей базой) → сервер принимал, правка B терялась.
 * Решение «чья версия свежее» (запас по часам, как в 7E):
 *   сервер свежее → серверные поля применяются локально;
 *   локальная свежее → зеркало = сервер, первый снимок отправляет локальную правку;
 *   неизвестно / в пределах запаса → у человека ничего не меняем и ничего не шлём (зеркало из локальной).
 */

const T = 1_800_000_000_000;
const H = 3_600_000;
const storageMock = AsyncStorage as unknown as { __reset: () => void };

type Rec = { key: string; value: unknown };
function memoryHandle() {
  const map = new Map<string, unknown>();
  const readRecord = async (key: string): Promise<Rec | null> => (map.has(key) ? { key, value: map.get(key) } : null);
  return {
    map,
    handle: {
      readRecord,
      withTransaction: async <R>(work: (tx: { readRecord: typeof readRecord; putRecord: (r: Rec) => Promise<void> }) => Promise<R>) =>
        work({ readRecord, putRecord: async (record: Rec) => { map.set(record.key, record.value); } }),
    },
  };
}

const field = (value: unknown) => ({ value, revision: 2, variants: [] });
function entity(entityId: string, fields: Record<string, unknown>, revision = 3) {
  return {
    entityType: 'flashcard', entityId, revision, updatedAtMs: T + 9 * H,
    state: { deleted: false, fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, field(value)])) },
  };
}

const own = (over: Partial<CardItem> = {}): CardItem => ({
  id: 'u1', en: 'old text', ru: 'старое', uk: 'старе', categoryId: 'custom', isSystem: false, addedAt: T, ...over,
} as CardItem);

async function hydrate(entities: unknown[], beforeApply?: (map: Map<string, unknown>) => void) {
  const scope = memoryHandle();
  const outcome = await hydrateAccountsV2Scope({
    handle: scope.handle as never,
    callMigrate: async () => ({ data: { status: 'done', operations: 0 } }),
    callPull: async () => ({ data: { entities, nextCursor: null } }),
    applyLocal: async (snapshot, isCurrent) => {
      beforeApply?.(scope.map);
      return applyAccountsV2HydrationLocally(snapshot, isCurrent);
    },
    isCurrent: () => true,
    nowMs: () => T + 10 * H,
    sleep: async () => undefined,
  });
  for (let index = 0; index < 50; index += 1) await new Promise((resolve) => setImmediate(resolve));
  const mirrorOf = async (_type: string, id: string) => {
    const value = scope.map.get(accountsV2ProducerEntityKey('flashcard', id)) as { mirror: EntityMirror } | undefined;
    return value?.mirror ?? null;
  };
  return { outcome, mirrorOf, map: scope.map };
}

async function firstSnapshot(list: 'saved' | 'custom', mirrorOf: (type: string, id: string) => Promise<EntityMirror | null>) {
  const cards = list === 'saved' ? await loadFlashcards('en') : await listCustomCards('en');
  return planAccountsV2Change({ kind: 'card_snapshot', target: 'en', list, cards }, mirrorOf as never, async () => cards.map((card) => card.id));
}

let log: jest.SpyInstance;
let warn: jest.SpyInstance;
const lines = (): string[] => [...log.mock.calls, ...warn.mock.calls].map((args) => args.join(' '));
beforeEach(() => {
  storageMock.__reset();
  __resetCustomCardsStoreForTests();
  beginAccountGeneration('stable-8e');
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { log.mockRestore(); warn.mockRestore(); });

describe('8E — чья версия свежее при гидрации', () => {
  test('B→A: правка на B (updatedAt новее) применяется на A; первый снимок A ничего не шлёт', async () => {
    await upsertCustomCard(own(), 'en');
    const { outcome, mirrorOf } = await hydrate([
      entity('en:custom:u1', { ...own(), en: 'new text', ru: 'новое', updatedAt: T + 5 * H }),
    ]);
    expect(outcome).toBe('hydrated');
    expect((await listCustomCards('en')).map((card) => [card.en, card.ru])).toEqual([['new text', 'новое']]);
    expect((await firstSnapshot('custom', mirrorOf)).operations).toEqual([]);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate card_conflict decision=apply_server reason=server_newer list=custom');
  });

  test('локальная правка свежее → у человека остаётся, первый снимок отправляет её', async () => {
    await upsertCustomCard(own(), 'en');
    // правка на этом телефоне (7E ставит updatedAt по часам правки)
    const now = jest.spyOn(Date, 'now').mockReturnValue(T + 8 * H);
    try { await upsertCustomCard(own({ en: 'my edit' }), 'en'); } finally { now.mockRestore(); }
    const { mirrorOf } = await hydrate([entity('en:custom:u1', { ...own(), en: 'server text', updatedAt: T + H })]);
    const local = await listCustomCards('en');
    expect(local[0].en).toBe('my edit');
    const plan = await firstSnapshot('custom', mirrorOf);
    expect(plan.operations.map((op) => (op.payload as { fields: Record<string, unknown> }).fields.en)).toEqual(['my edit']);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate card_conflict decision=send_local reason=local_newer list=custom');
  });

  test('время неизвестно / в пределах запаса → ничего не меняем у человека и ничего не шлём', async () => {
    await upsertCustomCard(own(), 'en');
    await saveFlashcards([{ id: 's1', en: 'hello', ru: 'привет', uk: 'привіт', source: 'lesson', addedAt: T } as Flashcard], 'en');
    const { mirrorOf } = await hydrate([
      // правка без времени (до 7E)
      entity('en:custom:u1', { ...own(), en: 'server text' }),
      // сохранённая: сервер поправил перевод, времени правки нет
      entity('en:saved:s1', { id: 's1', en: 'hello', ru: 'здравствуй', uk: 'привіт', source: 'lesson', addedAt: T }),
    ]);
    expect((await listCustomCards('en'))[0].en).toBe('old text');
    expect((await loadFlashcards('en'))[0].ru).toBe('привет');
    expect((await firstSnapshot('custom', mirrorOf)).operations).toEqual([]);
    expect((await firstSnapshot('saved', mirrorOf)).operations).toEqual([]);
    expect(lines()).toEqual(expect.arrayContaining([
      '[ACCOUNT-V2] hydrate card_conflict decision=keep_local reason=within_clock_margin list=custom',
      '[ACCOUNT-V2] hydrate card_conflict decision=keep_local reason=within_clock_margin list=saved',
    ]));
  });

  test('запас по часам: сервер новее меньше чем на час → не применяется', async () => {
    await upsertCustomCard(own(), 'en');
    const { mirrorOf } = await hydrate([entity('en:custom:u1', { ...own(), en: 'server text', updatedAt: T + H - 1 })]);
    expect((await listCustomCards('en'))[0].en).toBe('old text');
    expect((await firstSnapshot('custom', mirrorOf)).operations).toEqual([]);
  });

  test('одинаковые версии (после нормализации 8B) — без решений и без операций', async () => {
    await saveFlashcards([{ id: 's1', en: 'hello', ru: 'привет', uk: 'привет', source: 'lesson', addedAt: T, studyTarget: 'en', packLanguage: 'en' } as Flashcard], 'en');
    const { mirrorOf } = await hydrate([entity('en:saved:s1', { id: 's1', en: 'hello', ru: 'привет', source: 'lesson', addedAt: T })]);
    expect((await firstSnapshot('saved', mirrorOf)).operations).toEqual([]);
    expect(lines().some((line) => line.includes('card_conflict decision='))).toBe(false);
  });
});

describe('8E — защитные ветки', () => {
  test('решение по чистой функции: обе стороны без времени → keep_local; сервер без времени → keep_local', () => {
    expect(decideCardConflict('en', 'custom', { id: 'a', en: 'x' }, { id: 'a', en: 'y' })).toEqual({ decision: 'keep_local', reason: 'time_unknown' });
    expect(decideCardConflict('en', 'custom', { id: 'a', en: 'x' }, { id: 'a', en: 'y', addedAt: T })).toEqual({ decision: 'keep_local', reason: 'time_unknown' });
    expect(decideCardConflict('en', 'custom', { id: 'a', en: 'x', addedAt: T + 2 * H }, { id: 'a', en: 'y', addedAt: T }).decision).toBe('apply_server');
    // SRS не влияет на решение о тексте
    expect(decideCardConflict('en', 'custom', { id: 'a', en: 'x', addedAt: T }, { id: 'a', en: 'x', addedAt: T, srs: { updatedAtMs: T + 9 * H } }).decision).toBe('same');
  });

  test('зеркало успел изменить производитель после засева → из локальной не перезаписывается', async () => {
    await upsertCustomCard(own(), 'en');
    const key = accountsV2ProducerEntityKey('flashcard', 'en:custom:u1');
    const producerRecord = { v: 1, mirror: { fields: { id: '"u1"', en: '"queued"' }, deleted: false }, sequence: 1, base: 3, lastOperationId: 'op-x' };
    const { map } = await hydrate([entity('en:custom:u1', { ...own(), en: 'server text' })], (records) => { records.set(key, producerRecord); });
    expect(map.get(key)).toEqual(producerRecord);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate mirror_from_local written=0 skipped=1');
  });

  test('человек изменил карточку между решением и записью → серверная версия не применяется', async () => {
    const seen: string[] = [];
    await applyHydratedCardConflicts({
      lessons: [], libraries: [],
      cards: [{ target: 'en', list: 'custom', id: 'u1', deleted: false, fields: { ...own(), en: 'server', updatedAt: T + 5 * H }, srs: null }],
      mirror: { seeded: new Set(['en:custom:u1']), seedFromLocal: async () => 0 },
    } as never, () => true, {}, {
      readLocal: async () => [own() as never],
      replaceLocal: async (_target, _list, replace) => {
        const result = replace({ ...own(), en: 'edited meanwhile' } as never);
        seen.push(result === null ? 'skipped' : 'replaced');
        return 0;
      },
    });
    expect(seen).toEqual(['skipped']);
    expect(lines()).toContain('[ACCOUNT-V2] hydrate card_conflict apply_skip reason=local_changed_since_decision list=custom');
  });

  test('карточки, которые производитель вёл до гидрации (не засеяны), не решаются', async () => {
    const calls: string[] = [];
    await applyHydratedCardConflicts({
      lessons: [], libraries: [],
      cards: [{ target: 'en', list: 'custom', id: 'u1', deleted: false, fields: { ...own(), en: 'server', updatedAt: T + 5 * H }, srs: null }],
      mirror: { seeded: new Set(['en:custom:other']), seedFromLocal: async () => 0 },
    } as never, () => true, {}, {
      readLocal: async () => { calls.push('read'); return [own() as never]; },
      replaceLocal: async () => { calls.push('replace'); return 0; },
    });
    expect(calls).toEqual([]);
  });
});
