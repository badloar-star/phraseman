import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCOUNT_SYNC_LIBRARY_TITLES_MAX_PER_OP,
  ACCOUNT_SYNC_LIBRARY_TITLE_MAX_CHARS,
  canonicalJson,
  planAccountsV2Change,
  type AccountsV2Change,
  type EntityMirror,
  type ProducerEntityType,
} from '../modules/account-session-v2/account_sync_producer_plan';
import { parseHydration, withoutLocallyOwned } from '../modules/account-session-v2/account_v2_hydration';
import { applyHydratedLibraries } from '../app/accounts_v2_hydration_apply';
import {
  loadCommunityOwnedPackIds,
  loadCommunityOwnedPackTitles,
  mergeCommunityOwnedPackTitlesFromAccountsV2,
} from '../app/community_packs/communityOwnedStorage';
import { beginAccountGeneration } from '../app/account_generation';

/*
 * Account V2, Пакет 7C (TEMP из 6G) — названия наборов при гидрации.
 *  - производитель шлёт названия ОТДЕЛЬНОЙ операцией `{ itemTitles }` после id
 *    (урок 7A P2b: старый сервер отклонит только её), только изменившиеся;
 *  - снимок без названий (старый вызов) — прежнее поведение;
 *  - гидрация читает `titles` состояния, засевает зеркало (повторный снимок — ноль
 *    операций) и пишет название только для своих наборов без локального названия.
 */

type Mirrors = Map<string, EntityMirror>;
const keyOf = (type: ProducerEntityType, id: string) => `${type}|${id}`;

async function planAndApply(change: AccountsV2Change, mirrors: Mirrors) {
  const result = await planAccountsV2Change(change, async (type, id) => mirrors.get(keyOf(type, id)) ?? null, async () => null);
  for (const op of result.operations) mirrors.set(keyOf(op.entityType, op.entityId), op.mirror);
  return result;
}

const T = (ru: string, uk = '', es = '') => ({ titleRu: ru, titleUk: uk, titleEs: es });
const snapshot = (packIds: string[], titles?: Record<string, unknown>): AccountsV2Change =>
  ({ kind: 'library_snapshot', target: 'en', packIds, ...(titles === undefined ? {} : { titles }) });

describe('7C — производитель: названия отдельной операцией', () => {
  test('новые id → { itemIds }, затем { itemTitles }; ключи никогда не смешиваются', async () => {
    const mirrors: Mirrors = new Map();
    const plan = await planAndApply(snapshot(['p2', 'p1'], { p1: T('Один', 'Один', 'Uno'), p2: T('Два') }), mirrors);
    expect(plan.operations.map((op) => op.payload)).toEqual([
      { itemIds: ['p1', 'p2'] },
      { itemTitles: [['p1', 'Один', 'Один', 'Uno'], ['p2', 'Два', '', '']] },
    ]);
    for (const op of plan.operations) expect(Object.keys(op.payload as object)).toHaveLength(1);
  });

  test('тот же снимок — ноль операций; изменилось только название — только { itemTitles }', async () => {
    const mirrors: Mirrors = new Map();
    await planAndApply(snapshot(['p1'], { p1: T('Один') }), mirrors);
    expect((await planAndApply(snapshot(['p1'], { p1: T('Один') }), mirrors)).operations).toEqual([]);
    const renamed = await planAndApply(snapshot(['p1'], { p1: T('Первый') }), mirrors);
    expect(renamed.operations.map((op) => op.payload)).toEqual([{ itemTitles: [['p1', 'Первый', '', '']] }]);
  });

  test('без названий в снимке — прежнее поведение (старый вызов)', async () => {
    const mirrors: Mirrors = new Map();
    const plan = await planAndApply(snapshot(['p1']), mirrors);
    expect(plan.operations.map((op) => op.payload)).toEqual([{ itemIds: ['p1'] }]);
    expect(plan.operations[0].mirror).toEqual({ items: ['p1'] });
  });

  test('названия чужих id и пустые — не шлются; длинное — обрезано без половины суррогатной пары', async () => {
    const mirrors: Mirrors = new Map();
    const long = `${'я'.repeat(ACCOUNT_SYNC_LIBRARY_TITLE_MAX_CHARS - 1)}😀`;
    const plan = await planAndApply(snapshot(['p1', 'p2'], { p1: T(long), p2: T(''), ghost: T('Чужой'), p3: 'x' }), mirrors);
    expect(plan.notes).toContain('library_titles_empty count=1');
    const titles = plan.operations[1].payload as { itemTitles: string[][] };
    expect(titles.itemTitles).toHaveLength(1);
    expect(titles.itemTitles[0][1]).toBe('я'.repeat(ACCOUNT_SYNC_LIBRARY_TITLE_MAX_CHARS - 1));
  });

  test('больше предела записей — несколько операций по пределу', async () => {
    const mirrors: Mirrors = new Map();
    const ids = Array.from({ length: ACCOUNT_SYNC_LIBRARY_TITLES_MAX_PER_OP + 5 }, (_, index) => `p${String(index).padStart(3, '0')}`);
    const titles = Object.fromEntries(ids.map((id) => [id, T(id)]));
    const plan = await planAndApply(snapshot(ids, titles), mirrors);
    const counts = plan.operations.slice(1).map((op) => (op.payload as { itemTitles: unknown[] }).itemTitles.length);
    expect(counts).toEqual([ACCOUNT_SYNC_LIBRARY_TITLES_MAX_PER_OP, 5]);
  });

  test('зеркало id-операции сохраняет названия; повторно добавленный id получает название снова', async () => {
    const mirrors: Mirrors = new Map();
    await planAndApply(snapshot(['p1', 'p2'], { p1: T('Один'), p2: T('Два') }), mirrors);
    const added = await planAndApply(snapshot(['p1', 'p2', 'p3'], { p1: T('Один'), p2: T('Два') }), mirrors);
    expect(added.operations).toHaveLength(1);
    expect(added.operations[0].mirror.titles).toEqual({ p1: canonicalJson(['Один', '', '']), p2: canonicalJson(['Два', '', '']) });
    // Зеркало «видело» название p1, но id p1 вне зеркала (сервер его снял) — добавление шлёт название заново.
    mirrors.set(keyOf('library_membership', 'en:community_packs'), {
      items: ['p2', 'p3'], titles: { p1: canonicalJson(['Один', '', '']), p2: canonicalJson(['Два', '', '']) },
    });
    const readded = await planAndApply(snapshot(['p1', 'p2', 'p3'], { p1: T('Один'), p2: T('Два') }), mirrors);
    expect(readded.operations.map((op) => op.payload)).toEqual([{ itemIds: ['p1'] }, { itemTitles: [['p1', 'Один', '', '']] }]);
  });
});

const libraryEntity = (titles?: unknown) => ({
  entityType: 'library_membership', entityId: 'en:community_packs', revision: 4, updatedAtMs: 1,
  state: { items: [['pack-a', 1], ['pack-b', 2]], removed: [['pack-x', 3]], ...(titles === undefined ? {} : { titles }) },
});

describe('7C — разбор гидрации', () => {
  test('названия попадают в снимок и в зеркало; первый снимок приложения после гидрации — ноль операций', async () => {
    const parsed = parseHydration([libraryEntity([['pack-a', 'Набор А', 'Набір А', 'Pack A']])]);
    expect(parsed.snapshot.libraries[0].titles).toEqual({ 'pack-a': { titleRu: 'Набор А', titleUk: 'Набір А', titleEs: 'Pack A' } });
    const mirror = (parsed.mirrors[0].record as { mirror: EntityMirror }).mirror;
    const mirrors: Mirrors = new Map([[keyOf('library_membership', 'en:community_packs'), mirror]]);
    const plan = await planAndApply(snapshot(['pack-a', 'pack-b'], { 'pack-a': T('Набор А', 'Набір А', 'Pack A') }), mirrors);
    expect(plan.operations).toEqual([]);
  });

  test('без названий — прежняя форма (нет ключа titles ни в снимке, ни в зеркале)', () => {
    const parsed = parseHydration([libraryEntity()]);
    expect(parsed.snapshot.libraries[0]).toEqual({ target: 'en', items: ['pack-a', 'pack-b'], removed: ['pack-x'] });
    expect((parsed.mirrors[0].record as { mirror: EntityMirror }).mirror).toEqual({ items: ['pack-a', 'pack-b'] });
  });

  test('битые записи названий пропускаются, библиотека не теряется; не живой id — пропуск', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const parsed = parseHydration([libraryEntity([['pack-a', 1, '', ''], ['pack-x', 'Удалён', '', ''], ['pack-b', 'Б', '', '']])]);
      expect(parsed.skipped).toBe(0);
      expect(parsed.snapshot.libraries[0].titles).toEqual({ 'pack-b': { titleRu: 'Б', titleUk: '', titleEs: '' } });
      expect(warn.mock.calls.flat().join(' ')).toContain('library_titles_malformed entries=2');
      expect(parseHydration([libraryEntity('oops')]).snapshot.libraries[0].titles).toBeUndefined();
    } finally {
      warn.mockRestore();
    }
  });

  test('библиотека с локальным зеркалом: id не применяются, названия — да', () => {
    const parsed = parseHydration([libraryEntity([['pack-a', 'А', '', '']])]);
    const kept = withoutLocallyOwned(parsed.snapshot, new Set(['en:community_packs']), new Set());
    expect(kept.libraries).toEqual([{ target: 'en', items: [], removed: [], titles: { 'pack-a': { titleRu: 'А', titleUk: '', titleEs: '' } } }]);
    const untitled = withoutLocallyOwned(parseHydration([libraryEntity()]).snapshot, new Set(['en:community_packs']), new Set());
    expect(untitled.libraries).toEqual([]);
  });
});

describe('7C — применение названий локально', () => {
  const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    asyncStorageMock.__reset();
    beginAccountGeneration('stable-7c-test');
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });

  test('новая установка: id и названия с сервера — выбор наборов видит название, а не код', async () => {
    const counts: Record<string, number> = {};
    const parsed = parseHydration([libraryEntity([['pack-a', 'Набор А', '', ''], ['pack-b', 'Набор Б', '', '']])]);
    await applyHydratedLibraries(parsed.snapshot.libraries, () => true, counts);
    expect(await loadCommunityOwnedPackIds('en')).toEqual(['pack-a', 'pack-b']);
    expect(await loadCommunityOwnedPackTitles('en')).toEqual({
      'pack-a': T('Набор А'), 'pack-b': T('Набор Б'),
    });
    expect(counts).toMatchObject({ library_added: 2, library_titles_written: 2 });
  });

  test('локальное название не затирается; чужой (не свой) набор не подписывается', async () => {
    await AsyncStorage.setItem('community_owned_pack_ids_v1', JSON.stringify(['pack-a', 'pack-b']));
    await AsyncStorage.setItem('community_owned_pack_titles_v1', JSON.stringify({ 'pack-a': T('Моё название') }));
    const written = await mergeCommunityOwnedPackTitlesFromAccountsV2({
      'pack-a': T('С сервера'), 'pack-b': T('Б'), 'pack-zz': T('Чужой'),
    }, 'en');
    expect(written).toBe(1);
    expect(await loadCommunityOwnedPackTitles('en')).toEqual({ 'pack-a': T('Моё название'), 'pack-b': T('Б') });
  });

  test('битое хранилище названий не перезаписывается (пропуск с логом)', async () => {
    await AsyncStorage.setItem('community_owned_pack_ids_v1', JSON.stringify(['pack-a']));
    await AsyncStorage.setItem('community_owned_pack_titles_v1', '{broken');
    expect(await mergeCommunityOwnedPackTitlesFromAccountsV2({ 'pack-a': T('А') }, 'en')).toBe(-1);
    expect(await AsyncStorage.getItem('community_owned_pack_titles_v1')).toBe('{broken');
    expect(warn.mock.calls.flat().join(' ')).toContain('library_titles skip reason=titles_malformed');
  });

  test('id `__proto__` не подменяет прототип хранилища', async () => {
    await AsyncStorage.setItem('community_owned_pack_ids_v1', JSON.stringify(['__proto__']));
    const titles = JSON.parse('{"__proto__":{"titleRu":"П","titleUk":"","titleEs":""}}') as Record<string, ReturnType<typeof T>>;
    expect(await mergeCommunityOwnedPackTitlesFromAccountsV2(titles, 'en')).toBe(1);
    const stored = JSON.parse(String(await AsyncStorage.getItem('community_owned_pack_titles_v1')));
    expect(Object.prototype.hasOwnProperty.call(stored, '__proto__')).toBe(true);
  });
});

describe('7C — место записи шлёт названия', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../app/accounts_v2_client_flag');
  });

  test('addCommunityOwnedPackId: id + название → один снимок с названиями; повтор того же названия — без снимка', async () => {
    jest.resetModules();
    const builds: (() => unknown)[] = [];
    jest.doMock('../app/accounts_v2_client_flag', () => ({
      captureAccountsV2OwnerUid: () => 'uid-a',
      produceAccountsV2ChangeIfEnabled: (_owner: string | null, build: () => unknown) => { builds.push(build); },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@react-native-async-storage/async-storage').default as typeof AsyncStorage;
    (storage as unknown as { __reset: () => void }).__reset();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../app/account_generation') as typeof import('../app/account_generation')).beginAccountGeneration('stable-7c-add');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const store = require('../app/community_packs/communityOwnedStorage') as typeof import('../app/community_packs/communityOwnedStorage');
    await store.addCommunityOwnedPackId('pack-a', 'en', T('Набор А'));
    expect(builds).toHaveLength(1);
    expect(builds[0]()).toEqual({ kind: 'library_snapshot', target: 'en', packIds: ['pack-a'], titles: { 'pack-a': T('Набор А') } });
    await store.addCommunityOwnedPackId('pack-a', 'en', T('Набор А'));
    expect(builds).toHaveLength(1);
    await store.addCommunityOwnedPackId('pack-a', 'en', T('Новое'));
    expect(builds).toHaveLength(2);
    expect(builds[1]()).toMatchObject({ packIds: ['pack-a'], titles: { 'pack-a': T('Новое') } });
    await store.addCommunityOwnedPackId('pack-gift', 'en');
    expect(builds[2]()).toEqual({ kind: 'library_snapshot', target: 'en', packIds: ['pack-a', 'pack-gift'] });
  });
});
