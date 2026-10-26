// зачем (скорость тем 26.10, Темы, docs/work/themes-perf-2026-10-26.md): холодный старт ждал права на премиальные темы из сети
// (устаревший кэш → сеть до 15 с) дольше потолка заставки 800 мс — Главная потом перекрашивалась из темы по умолчанию.
// Сторож: (1) обычная сохранённая тема прав не ждёт; (2) премиальная берёт кэш любого возраста без сети и без общей очереди;
// (3) нет кэша — обычный путь с сетью; (4) ThemeContext подключает именно это правило.
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
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ phase: 'active', stableId: 'owner-1' }),
  isCurrentAccountGeneration: () => true,
  subscribeAccountGeneration: () => () => undefined,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() } }));

const HOUR = 60 * 60 * 1000;

function freshModule() {
  let mod!: typeof import('../app/premium_theme_entitlements');
  jest.isolateModules(() => { mod = require('../app/premium_theme_entitlements'); });
  return mod;
}

describe('холодный старт: права на премиальную тему не держат заставку сетью (26.10)', () => {
  beforeEach(() => {
    store.clear();
    callable.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('обычная тема — ждать нечего; премиальная — только кэш', () => {
    const { themeBootEntitlementWait } = require('../components/theme_boot_entitlement_policy');
    expect(themeBootEntitlementWait('graphite')).toEqual({ wait: 'none' });
    expect(themeBootEntitlementWait('grad_aurora')).toEqual({ wait: 'none' });
    expect(themeBootEntitlementWait('grad_full_titanium')).toEqual({ wait: 'cache_first' });
  });

  it('устаревший кэш (3 суток) — права из кэша без сети, даже когда фоновый prime уже идёт в сеть', async () => {
    store.set('premium_theme_entitlements_v1:owner-1', JSON.stringify({ atMs: Date.now() - 72 * HOUR, unlocked: ['grad_full_titanium'], progressByCondition: {} }));
    let release!: (v: unknown) => void;
    callable.mockImplementation(() => new Promise((r) => { release = r; }));
    const m = freshModule();
    const background = m.primePremiumThemeEntitlements();
    const hadCache = await m.primePremiumThemeEntitlementsFromCache();
    expect(hadCache).toBe(true);
    expect(m.peekPremiumThemeEntitlements().unlocked.has('grad_full_titanium' as never)).toBe(true);
    release({ data: { schemaVersion: 'premium-theme-entitlements.v1', entitlements: { grad_full_titanium: 1 }, progressByCondition: {} } });
    await background;
  });

  it('кэша нет — сообщает false, вызывающий идёт обычным путём', async () => {
    const m = freshModule();
    expect(await m.primePremiumThemeEntitlementsFromCache()).toBe(false);
    expect(callable).not.toHaveBeenCalled();
  });

  it('ThemeContext ждёт права только по правилу и только из кэша', () => {
    const { readSource } = require('./helpers/read_source') as { readSource: (p: string) => string };
    const src = readSource('components/ThemeContext.tsx');
    expect(src).toContain('const bootWait = themeBootEntitlementWait(resolveLiquidGlassTheme(storedId));');
    expect(src).toContain("if (bootWait.wait === 'cache_first' && !(await primePremiumThemeEntitlementsFromCache())) await primePremiumThemeEntitlements();");
    expect(src).not.toMatch(/\n\s+await primePremiumThemeEntitlements\(\);\n\s+if \(cancelled\) return;\n\s+const storedCandidate/);
  });
});
