// зачем (11 · РЕВИЗОР 24.10, Firebase-экономия): права на особые темы не запрашиваются на каждом холодном старте — берутся из кэша телефона (сеть раз в 12 ч);
// без сети заработанная тема не откатывается; кэш одного аккаунта не виден другому.
const store = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
  },
}));
const callable = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => callable }));
let mockStableId = 'owner-1';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'active', stableId: mockStableId }),
  isCurrentAccountGeneration: () => true,
  subscribeAccountGeneration: () => () => undefined,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }));

const HOUR = 60 * 60 * 1000;
const serverOk = (ids: string[]) => ({ data: { schemaVersion: 'premium-theme-entitlements.v1', entitlements: Object.fromEntries(ids.map((id) => [id, 1])), progressByCondition: {} } });

function freshModule() {
  let mod!: typeof import('../app/premium_theme_entitlements');
  jest.isolateModules(() => { mod = require('../app/premium_theme_entitlements'); });
  return mod;
}

describe('права на особые темы: кэш на телефоне', () => {
  beforeEach(() => { store.clear(); callable.mockReset(); mockStableId = 'owner-1'; jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

  it('первый старт — сеть и запись в кэш; следующий холодный старт со свежим кэшем — без сети', async () => {
    callable.mockResolvedValueOnce(serverOk(['grad_full_titanium']));
    const a = freshModule();
    await a.primePremiumThemeEntitlements({ nowMs: 1_000_000 });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(a.peekPremiumThemeEntitlements().unlocked.has('grad_full_titanium' as never)).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    const b = freshModule();
    await b.primePremiumThemeEntitlements({ nowMs: 1_000_000 + 2 * HOUR });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(b.peekPremiumThemeEntitlements().unlocked.has('grad_full_titanium' as never)).toBe(true);
  });

  it('повторный старт меньше чем через 24 ч — 0 вызовов сервера', async () => {
    store.set('premium_theme_entitlements_v1:owner-1', JSON.stringify({ atMs: 1_000_000, unlocked: ['grad_full_titanium'], progressByCondition: {} }));
    const m = freshModule();
    await m.primePremiumThemeEntitlements({ nowMs: 1_000_000 + 23 * HOUR });
    expect(callable).toHaveBeenCalledTimes(0);
    expect(m.peekPremiumThemeEntitlements().unlocked.has('grad_full_titanium' as never)).toBe(true);
  });

  it('ключ кэша стирается при выходе/удалении аккаунта (стоит в списке стирания cloud_sync)', () => {
    const { readSource } = require('./helpers/read_source') as { readSource: (p: string) => string };
    const sync = readSource('app/cloud_sync.ts');
    expect(sync).toContain("const PREMIUM_THEME_ENTITLEMENTS_PREFIX = 'premium_theme_entitlements_v1';");
    // зачем (Ядро 25.10, прогон Ревизора 05:00): ключ стоит в списке стирания; тест проверяет членство, а не место — после него
    // добавились ключи историй, и «последний в массиве» ложно краснел
    const start = sync.indexOf('const WIPE_ONLY_ACCOUNT_KEY_PREFIXES');
    const wipeList = sync.slice(start, sync.indexOf('];', start));
    expect(wipeList).toMatch(/\bPREMIUM_THEME_ENTITLEMENTS_PREFIX\b/);
  });

  it('кэш старше 24 ч — идёт в сеть и перезаписывает', async () => {
    store.set('premium_theme_entitlements_v1:owner-1', JSON.stringify({ atMs: 0, unlocked: ['grad_full_titanium'], progressByCondition: {} }));
    callable.mockResolvedValueOnce(serverOk(['grad_full_titanium', 'grad_full_horizon']));
    const m = freshModule();
    await m.primePremiumThemeEntitlements({ nowMs: 25 * HOUR });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(m.peekPremiumThemeEntitlements().unlocked.has('grad_full_horizon' as never)).toBe(true);
  });

  it('без сети заработанная тема не откатывается', async () => {
    store.set('premium_theme_entitlements_v1:owner-1', JSON.stringify({ atMs: 0, unlocked: ['grad_full_titanium'], progressByCondition: {} }));
    callable.mockRejectedValueOnce(new Error('unavailable'));
    const m = freshModule();
    await m.primePremiumThemeEntitlements({ nowMs: 30 * HOUR });
    expect(m.peekPremiumThemeEntitlements().unlocked.has('grad_full_titanium' as never)).toBe(true);
  });

  it('кэш другого аккаунта не виден', async () => {
    store.set('premium_theme_entitlements_v1:owner-1', JSON.stringify({ atMs: 1_000_000, unlocked: ['grad_full_titanium'], progressByCondition: {} }));
    mockStableId = 'owner-2';
    callable.mockResolvedValueOnce(serverOk([]));
    const m = freshModule();
    await m.primePremiumThemeEntitlements({ nowMs: 1_000_000 + HOUR });
    expect(callable).toHaveBeenCalledTimes(1);
    expect(m.peekPremiumThemeEntitlements().unlocked.size).toBe(0);
  });
});
