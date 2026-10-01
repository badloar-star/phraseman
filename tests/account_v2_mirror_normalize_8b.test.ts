import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseHydration } from '../modules/account-session-v2/account_v2_hydration';
import {
  ACCOUNT_SYNC_PACK_LANGUAGES,
  normalizeCardFieldsForSync,
  planAccountsV2Change,
  type EntityMirror,
} from '../modules/account-session-v2/account_sync_producer_plan';
import { PACK_LANGUAGE_CHOICES } from '../app/flashcards/pack_languages';
import { applyHydratedCards } from '../app/accounts_v2_hydration_apply';
import { loadFlashcards } from '../hooks/use-flashcards';
import { listCustomCards, __resetCustomCardsStoreForTests } from '../app/flashcards/custom_cards_store';
import { beginAccountGeneration } from '../app/account_generation';

/*
 * Account V2, Пакет 8B — после гидрации карточки не отправляются повторно.
 * E2E 2026-10-01: сразу после гидрации `card_snapshot planned=3` — засеянное
 * зеркало расходится с локальным снимком (studyTarget/packLanguage и т. п.).
 * Тест идёт по НАСТОЯЩЕМУ пути: ответ pull → parseHydration (зеркало) → применение
 * в настоящие хранилища → снимок, как его отдаёт приложение → план производителя.
 */

const T = 1_800_000_000_000;
const storageMock = AsyncStorage as unknown as { __reset: () => void };

const field = (value: unknown) => ({ value, revision: 1, variants: [] });
function entity(entityId: string, fields: Record<string, unknown>) {
  return {
    entityType: 'flashcard', entityId, revision: 1, updatedAtMs: T,
    state: { deleted: false, fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, field(value)])) },
  };
}

type Plan = Awaited<ReturnType<typeof planAccountsV2Change>>;

async function planAfterHydration(entities: ReturnType<typeof entity>[]): Promise<Readonly<{ saved: Plan; custom: Plan; diverged: string[] }>> {
  const parsed = parseHydration(entities as never);
  const mirrors = new Map(parsed.mirrors.map((item) => [item.entityId, (item.record as { mirror: EntityMirror }).mirror]));
  const indexes = new Map(parsed.listIndexes.map((index) => [index.key, index.ids]));
  await applyHydratedCards(parsed.snapshot.cards, () => true, {});
  const readMirror = async (_type: string, id: string) => mirrors.get(id) ?? null;
  const readIndex = async (key: string) => indexes.get(key) ?? null;
  // как приложение: снимок — то, что лежит в хранилище после записи
  const savedCards = await loadFlashcards('en');
  const customCards = await listCustomCards('en');
  const saved = await planAccountsV2Change({ kind: 'card_snapshot', target: 'en', list: 'saved', cards: savedCards }, readMirror, readIndex);
  const custom = await planAccountsV2Change({ kind: 'card_snapshot', target: 'en', list: 'custom', cards: customCards }, readMirror, readIndex);
  const diverged = [...saved.operations, ...custom.operations].flatMap((op) => {
    const payload = op.payload as { fields?: Record<string, unknown>; unsetFields?: string[] };
    return [...Object.keys(payload.fields ?? {}), ...(payload.unsetFields ?? []).map((name) => `-${name}`)];
  });
  return { saved, custom, diverged: [...new Set(diverged)].sort() };
}

let log: jest.SpyInstance;
let warn: jest.SpyInstance;
beforeEach(() => {
  storageMock.__reset();
  __resetCustomCardsStoreForTests();
  beginAccountGeneration('stable-8b');
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => { log.mockRestore(); warn.mockRestore(); });

describe('8B — гидрация → первый снимок → 0 операций', () => {
  test('сохранённые из переноса (без studyTarget/packLanguage, без uk) и свои — ноль операций', async () => {
    const result = await planAfterHydration([
      // перенос старого облака: у старых карточек нет studyTarget/packLanguage, бывает нет uk
      entity('en:saved:s1', { id: 's1', en: 'hello', ru: 'привет', source: 'lesson', addedAt: T - 9 }),
      entity('en:saved:s2', { id: 's2', en: 'bye', ru: 'пока', uk: 'бувай', source: 'word', addedAt: T - 8, packLanguage: 'en' }),
      // карточка «Без языка» (видео) — packLanguage значимый, не производный
      entity('en:saved:s3', { id: 's3', en: 'clip', ru: 'клип', uk: 'кліп', source: 'video_phrase', addedAt: T - 7, packLanguage: 'none', studyTarget: 'en' }),
      entity('en:custom:c1', { id: 'c1', en: 'mine', ru: 'моя', uk: 'моя', categoryId: 'custom', isSystem: false, addedAt: T - 6, updatedAt: T - 5 }),
    ]);
    expect(result.diverged).toEqual([]);
    expect(result.saved.operations).toEqual([]);
    expect(result.custom.operations).toEqual([]);
  });

  test('после гидрации правка человека по-прежнему уходит, производные поля не снимаются', async () => {
    const entities = [entity('en:saved:s1', { id: 's1', en: 'hello', ru: 'привет', source: 'lesson', addedAt: T - 9 })];
    const parsed = parseHydration(entities as never);
    const mirrors = new Map(parsed.mirrors.map((item) => [item.entityId, (item.record as { mirror: EntityMirror }).mirror]));
    await applyHydratedCards(parsed.snapshot.cards, () => true, {});
    const [card] = await loadFlashcards('en');
    const plan = await planAccountsV2Change(
      { kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ ...card, ru: 'здравствуй' }] },
      async (_type, id) => mirrors.get(id) ?? null,
      async () => ['s1'],
    );
    expect(plan.operations.map((op) => op.payload)).toEqual([{ op: 'upsert', fields: { ru: 'здравствуй' } }]);
  });
});

describe('8B — единая нормализация', () => {
  test('языки наборов = список приложения', () => {
    expect([...ACCOUNT_SYNC_PACK_LANGUAGES].sort()).toEqual([...PACK_LANGUAGE_CHOICES].sort());
  });

  test('сохранённая: язык хранилища, packLanguage по умолчанию/значимый/битый, uk из ru; своя — без изменений', () => {
    expect(normalizeCardFieldsForSync('fr', 'saved', { id: 'a', ru: 'р', studyTarget: 'en' }))
      .toEqual({ id: 'a', ru: 'р', uk: 'р', studyTarget: 'fr', packLanguage: 'fr' });
    expect(normalizeCardFieldsForSync('en', 'saved', { id: 'a', ru: 'р', uk: 'у', packLanguage: 'none' }).packLanguage).toBe('none');
    expect(normalizeCardFieldsForSync('en', 'saved', { id: 'a', packLanguage: 'klingon' }).packLanguage).toBe('en');
    expect(normalizeCardFieldsForSync('en', 'saved', { id: 'a', ru: 'р', uk: 'у' }).uk).toBe('у');
    expect(normalizeCardFieldsForSync('en', 'saved', { id: 'a' })).not.toHaveProperty('uk');
    const own = { id: 'c', en: 'x', categoryId: 'custom' };
    expect(normalizeCardFieldsForSync('en', 'custom', own)).toEqual(own);
  });

  test('7A: производные поля не снимаются, даже если в снимке их нет; tombstone не нормализуется', async () => {
    const parsed = parseHydration([
      entity('en:saved:s1', { id: 's1', en: 'hello', ru: 'привет', source: 'lesson', addedAt: T - 9, studyTarget: 'en', packLanguage: 'en' }),
      { entityType: 'flashcard', entityId: 'en:saved:gone', revision: 2, updatedAtMs: T, state: { deleted: true, fields: {} } },
    ] as never);
    const mirrors = new Map(parsed.mirrors.map((item) => [item.entityId, (item.record as { mirror: EntityMirror }).mirror]));
    expect(mirrors.get('en:saved:gone')).toEqual({ fields: {}, deleted: true });
    expect(mirrors.get('en:saved:s1')?.unseen).toEqual(['addedAt', 'en', 'packLanguage', 'ru', 'source', 'studyTarget']);
    // старая карточка без производных полей (до первой записи приложения) — ни снятия, ни лишней отправки
    const plan = await planAccountsV2Change(
      { kind: 'card_snapshot', target: 'en', list: 'saved', cards: [{ id: 's1', en: 'hello', ru: 'привет', source: 'lesson', addedAt: T - 9 }] },
      async (_type, id) => mirrors.get(id) ?? null,
      async () => ['s1'],
    );
    expect(plan.operations).toEqual([]);
  });
});
