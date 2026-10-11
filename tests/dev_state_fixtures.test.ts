// зачем (координатор 11.10, робот-съёмка): phraseman://dev_state?… выставляет состояния для Maestro. Сторож держит
// формат ссылки и то, что маршрута нет в стор-сборке.
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({
  setDevLocalPlusOverride: jest.fn(async () => undefined),
  getDevLocalPlusStorageKey: (stableId: string) => `dev_local_plus_override_v1:${encodeURIComponent(stableId)}`,
}));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
// зачем (12.10): защита «только анонимный гость» проверяется в tests/dev_state_account_guard.test.ts; здесь фикстуры гоняются как на госте
jest.mock('../app/dev_state_account_guard', () => ({ assertDisposableGuest: jest.fn(), classifyGuestUser: jest.fn() }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
// зачем (R1_SHOT_LIST): локальное хранилище в памяти — проверяем, что новые переключатели пишут только свои ключи и читаются настоящими модулями.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mockStore.set(k, v)); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockStore.has(k) ? mockStore.get(k)! : null])),
  },
}));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState, parseDevStateParams, vipSnapshotValuesFor } from '../app/dev_state_fixtures';

describe('dev_state: разбор ссылки', () => {
  test('все поддержанные параметры', () => {
    const { request, rejected } = parseDevStateParams({
      energy: '0', mode: 'B', plus: 'off', spire: 'open', onboarding: 'done', free: 'on', next: '/(tabs)/home',
    });
    expect(request).toEqual({ energy: 0, mode: 'b', plus: 'off', spire: 'open', onboarding: 'done', free: 'on', next: '/(tabs)/home' });
    expect(rejected).toEqual({});
  });
  test('мусор отбрасывается с причиной, остальное применяется', () => {
    const { request, rejected } = parseDevStateParams({ energy: '9', mode: 'c', plus: 'on', next: 'home' });
    expect(request.plus).toBe('on');
    expect(request.energy).toBeUndefined();
    expect(Object.keys(rejected).sort()).toEqual(['energy', 'mode', 'next']);
  });
  test('пустые параметры — пустой запрос', () => {
    expect(parseDevStateParams({}).request).toEqual({});
  });
});

describe('dev_state: cards=demo — наполненный аккаунт Карточек', () => {
  test('параметр разбирается', () => {
    expect(parseDevStateParams({ cards: 'demo' }).request.cards).toBe('demo');
    expect(parseDevStateParams({ cards: 'full' }).rejected).toHaveProperty('cards');
  });
  test('данные как на кадрах макета: 64 сохранённые, 4 своих набора, «Продолжить» на своём наборе', () => {
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    const saved = demo.demoSavedFlashcards();
    expect(saved).toHaveLength(64);
    expect(saved[0].en).toBe('Layover');
    expect(new Set(saved.map((c) => c.id)).size).toBe(64);
    expect(demo.DEMO_OWN_PACKS).toHaveLength(4);
    const travel = demo.DEMO_OWN_PACKS.find((p) => p.packId === demo.DEMO_TRAVEL_PACK_ID);
    expect(travel).toMatchObject({ title: 'Путешествия', count: 40, level: 'A2', pending: true });
    for (const pack of demo.DEMO_OWN_PACKS) {
      const cards = demo.demoPackCards(pack);
      expect(cards).toHaveLength(pack.count);
      expect(cards.slice(0, 3).map((c) => c.en)).toEqual(pack.words);
    }
    const videos = demo.demoVideoPacks();
    expect(videos.map((v) => v.videoDurationSec)).toEqual([252, 458, 305, 380, 227]);
    expect(videos.every((v) => /^[A-Za-z0-9_-]{11}$/.test(String(v.videoId)))).toBe(true);
    expect(demo.demoCommunityPacks().every((p) => p.isCommunityUgc && p.level)).toBe(true);
  });
});

describe('dev_state: в стор-сборке маршрута нет', () => {
  test('router.ctx.js вырезает dev_state из стор-ветки', () => {
    const router = fs.readFileSync(path.join(__dirname, '..', 'router.ctx.js'), 'utf8');
    const storeBranch = router.split(': require.context(')[0] ?? '';
    const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch)?.[1] ?? '';
    const storeRegex = new RegExp(literal);
    expect(storeRegex.test('./dev_state.tsx')).toBe(false);
    expect(storeRegex.test('./(tabs)/home.tsx')).toBe(true);
  });
  test('маршрут сам проверяет dev-сборку', () => {
    const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state.tsx'), 'utf8');
    expect(route).toMatch(/if \(!available\) return <Redirect href="\/" \/>;/);
    const fixtures = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state_fixtures.ts'), 'utf8');
    expect(fixtures).toMatch(/__DEV__ === true && !IS_STORE_RELEASE/);
    expect(fixtures).not.toMatch(/@react-native-firebase|httpsCallable\(/);
  });
});

// ─────────────────────────────── новые переключатели (R1_SHOT_LIST «нет пути», координатор 12.10) ───────────────────────────────
describe('dev_state: разбор новых параметров', () => {
  test('quota, dquota, catalog, vip, cards, plus=inherit', () => {
    const { request, rejected } = parseDevStateParams({ quota: 'exhausted', dquota: '0', catalog: 'empty', vip: 'referral', cards: 'custom50', plus: 'inherit' });
    expect(request).toMatchObject({ quota: 'exhausted', dquota: 0, catalog: 'empty', vip: 'referral', cards: 'custom50', plus: 'inherit' });
    expect(rejected).toEqual({});
    expect(parseDevStateParams({ quota: '12', dquota: 'reset', cards: 'demo_lessons' }).request).toMatchObject({ quota: 12, dquota: 'reset', cards: 'demo_lessons' });
  });
  test('мусор отбрасывается с причиной', () => {
    const { request, rejected } = parseDevStateParams({ quota: '31', dquota: '-1', catalog: 'big', vip: 'gold', cards: 'full' });
    expect(request.quota).toBeUndefined();
    expect(request.dquota).toBeUndefined();
    expect(Object.keys(rejected).sort()).toEqual(['cards', 'catalog', 'dquota', 'quota', 'vip']);
  });
});

describe('dev_state: данные новых фикстур', () => {
  // зачем: в jest __DEV__ не задан — dev-сборку для проверки данных включаем явно, стор-сборку проверяет блок ниже
  beforeEach(() => { mockStore.clear(); (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterEach(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = undefined; });

  test('vip: снимок разбирается настоящим getVipProgressState (плашки promo/referral/…/admin_lifetime — активны, off — нет)', () => {
    const { getVipProgressState } = require('../app/premium_progress') as typeof import('../app/premium_progress');
    const now = Date.UTC(2026, 9, 12, 12, 0, 0);
    for (const kind of ['promo', 'promo_lifetime', 'referral', 'survey', 'idea', 'tester', 'admin', 'admin_lifetime'] as const) {
      const values = vipSnapshotValuesFor(kind, now);
      const state = getVipProgressState(values, now);
      expect(state?.active).toBe(true);
    }
    expect(vipSnapshotValuesFor('referral', now).vip_plan).toBe('referral');
    expect(vipSnapshotValuesFor('survey', now).vip_plan).toBe('survey_vip');
    expect(vipSnapshotValuesFor('promo_lifetime', now).vip_until).toBe('0');
    expect(Number(vipSnapshotValuesFor('promo', now).vip_until)).toBeGreaterThan(now);
    expect(getVipProgressState(vipSnapshotValuesFor('off', now), now)?.active).toBe(false);
  });

  test('cards=custom50: 50 уникальных своих карточек (лимит Free), lessons: источники для фильтра', () => {
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    const custom = demo.demoCustomCards();
    expect(custom).toHaveLength(50);
    expect(new Set(custom.map((c) => c.id)).size).toBe(50);
    expect(custom.every((c) => c.categoryId === 'custom' && c.isSystem === false)).toBe(true);
    const lessons = demo.demoSavedFlashcards(true);
    expect(lessons).toHaveLength(64);
    const kinds = new Set(lessons.map((c) => c.source));
    expect([...kinds].sort()).toEqual(['daily_phrase', 'dialog', 'lesson', 'verb', 'video_phrase', 'word']);
    expect(new Set(lessons.filter((c) => c.source === 'lesson').map((c) => c.sourceId))).toEqual(new Set(['1', '3', '12']));
    expect(demo.demoSavedFlashcards().every((c) => c.source === 'word')).toBe(true); // cards=demo не меняется
  });

  test('quota: запись счётчика тренировок — version 1, период месяца, 30 стартов при exhausted; reset стирает', async () => {
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    await demo.applyTrainingQuota('stable-1', 'exhausted');
    const key = 'training_sessions:v1:stable-1';
    const stored = JSON.parse(mockStore.get(key) ?? 'null');
    expect(stored).toMatchObject({ version: 1 });
    expect(stored.period).toMatch(/^\d{4}-\d{2}$/);
    expect(stored.starts).toHaveLength(30);
    await demo.applyTrainingQuota('stable-1', 7);
    expect(JSON.parse(mockStore.get(key)!).starts).toHaveLength(7);
    await demo.applyTrainingQuota('stable-1', 'reset');
    expect(mockStore.has(key)).toBe(false);
  });

  test('dquota: зеркало лимита реплик читается настоящим ридером (0 → exhausted, 7 → allowed, reset → unknown)', async () => {
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    const quota = require('../app/ai_dialog_daily_quota') as typeof import('../app/ai_dialog_daily_quota');
    await demo.applyDialogQuota('stable-1', 0);
    expect(await quota.readAiDialogMonthlyQuota('en', 'stable-1')).toMatchObject({ status: 'exhausted', remaining: 0 });
    await demo.applyDialogQuota('stable-1', 7);
    expect(await quota.readAiDialogMonthlyQuota('en', 'stable-1')).toMatchObject({ status: 'allowed', remaining: 7 });
    await demo.applyDialogQuota('stable-1', 'reset');
    expect(await quota.readAiDialogMonthlyQuota('en', 'stable-1')).toMatchObject({ status: 'unknown' });
  });
});

describe('dev_state: в стор-сборке новые переключатели не действуют', () => {
  const realDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  afterEach(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = realDev; mockStore.clear(); });

  test('applyDevState отказывает целиком и ничего не пишет', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const result = await applyDevState({ quota: 'exhausted', dquota: 0, vip: 'referral', cards: 'custom50', catalog: 'empty', plus: 'inherit' });
    expect(result.applied).toEqual({});
    expect(result.skipped).toEqual({ all: 'not_dev_build' });
    expect(mockStore.size).toBe(0);
  });

  test('каждая apply* в dev_state_cards_demo сама проверяет сборку', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const demo = require('../app/dev_state_cards_demo') as typeof import('../app/dev_state_cards_demo');
    await expect(demo.applyCustomCards()).rejects.toThrow('not a dev build');
    await expect(demo.applyCatalog('empty')).rejects.toThrow('not a dev build');
    await expect(demo.applyTrainingQuota('stable-1', 'exhausted')).rejects.toThrow('not a dev build');
    await expect(demo.applyDialogQuota('stable-1', 0)).rejects.toThrow('not a dev build');
    expect(mockStore.size).toBe(0);
  });

  test('исходники фикстур не ходят в сеть и не пишут в Firestore', () => {
    for (const file of ['dev_state_fixtures.ts', 'dev_state_cards_demo.ts']) {
      const source = fs.readFileSync(path.join(__dirname, '..', 'app', file), 'utf8');
      expect(source).not.toMatch(/httpsCallable\(|firebase\/firestore|@react-native-firebase|\bfetch\(|\bsetDoc\(|\baddDoc\(|\bupdateDoc\(|XMLHttpRequest/);
    }
  });
});
