// зачем (координатор 15.10, прогон №7 отложен — «сперва логи» без эмулятора): после крестика пейвола разметка вкладок давала 13–14 коммитов
// layout:tabs на переход. Гипотеза (docs/work/tasks/tabs-render-cascade-plan.md): navigateTo зависит от pathname/segments/router → каждая смена
// маршрута пересоздаёт обработчики вкладок → новый TabContext.value → перерисовка всех потребителей useTabNav; плюс focusTick в общем контексте,
// родитель без memo и панели без memo. Тест отрисовывает НАСТОЯЩИЙ app/(tabs)/_layout.tsx с подменённым окружением и проигрывает «открыли пейвол
// → закрыли» (адрес /home → /premium_modal + потеря фокуса → /home + фокус). Считает ту же трассу, что прогон №7: строки [TABS-RENDER]
// (вызовы ReleasedTabLayout), коммиты профайлера layout:tabs, отрисовки Главной (зонд подписан на контекст вкладок).
// Варианты: текущий код и копии с docs/phraseman-2.0/handoff/TABS_RENDER_n.patch, наложенными в памяти (по одному и все вместе).
// Копии — в tmp/tabs_render_measure/ (папка в .gitignore, разрешена сторожем записи, удаляется); ленивая Главная `import('./home')`
// в тестовой среде без vm-modules не исполняется — в копиях она подключена сразу, одинаково для всех вариантов.
// Каждый вариант грузится в СВОЁМ реестре модулей (jest.isolateModules, вместе с React и RNTL): в общем реестре второй загруженный модуль
// разметки рисовал пустое дерево (проверено 15.10 — менялся порядок, пустым становился второй).
// Окружение двух видов: stable — контексты темы/экрана/insets отдают одну ссылку (мемоизированный провайдер в покое); unstable — новый
// объект на каждый вызов + после каждой смены маршрута три отдельных коммита провайдеров (как провайдеры выше по дереву на устройстве).
import fs from 'fs';
import path from 'path';
import type React from 'react';

// tests/__mocks__/react-native.js — заглушка для логических тестов; рендеру нужен настоящий модуль (как в friend_list_row).
jest.unmock('react-native');

// ── управляемый роутер: адрес, сегменты и фокус группы вкладок ─────────────────────────────────────
const mockNav = {
  pathname: '/home',
  segments: ['(tabs)', 'home'] as string[],
  focused: true,
  listeners: new Set<() => void>(),
  set(next: Partial<{ pathname: string; segments: string[]; focused: boolean }>) {
    if (next.pathname !== undefined) this.pathname = next.pathname;
    // как expo-router: на каждое изменение маршрута — новый массив сегментов
    if (next.segments !== undefined) this.segments = [...next.segments];
    if (next.focused !== undefined) this.focused = next.focused;
    this.listeners.forEach((l) => l());
  },
};
const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn() };
const mockNavRef = { current: null };
jest.mock('expo-router', () => {
  const R = require('react');
  const sub = (l: () => void) => { mockNav.listeners.add(l); return () => mockNav.listeners.delete(l); };
  return {
    usePathname: () => R.useSyncExternalStore(sub, () => mockNav.pathname),
    useSegments: () => R.useSyncExternalStore(sub, () => mockNav.segments),
    useRouter: () => mockRouter,
    useNavigationContainerRef: () => mockNavRef,
    useFocusEffect: (cb: () => void | (() => void)) => {
      const focused = R.useSyncExternalStore(sub, () => mockNav.focused);
      R.useEffect(() => (focused ? cb() : undefined), [focused, cb]);
    },
  };
});

// ── трасса [TAP-LAT]/[TABS-RENDER] включена и собирается в память ─────────────────────────────────
const mockTrace = { lines: [] as string[], commits: {} as Record<string, number> };
jest.mock('../app/tap_latency_trace', () => ({
  TAP_LATENCY_TRACE_ENABLED: true,
  traceLog: (line: string) => { mockTrace.lines.push(line); },
  noteTapAction: () => undefined,
  createTapLatencyProfilerHandler: () => (id: string) => { mockTrace.commits[id] = (mockTrace.commits[id] ?? 0) + 1; },
}));

// ── Главная — зонд: считает свои отрисовки и подписан на контекст вкладок того варианта, что сейчас под тестом ──
const mockHome = { renders: 0, ctx: null as null | { useTabNav: () => unknown } };
jest.mock('../app/(tabs)/home', () => {
  const R = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function HomeProbe() {
      mockHome.renders += 1;
      mockHome.ctx?.useTabNav();
      return R.createElement(View, { testID: 'home-probe' });
    },
  };
});

// ── окружение: контексты темы, экрана и безопасных зон (stable / unstable, см. шапку) ──────────────────
const mockCtx = {
  unstable: false,
  theme: { theme: { bgPrimary: '#000000', textPrimary: '#ffffff' } },
  screen: { width: 412, height: 915, bottomInset: 0, isTablet: false },
  insets: { top: 24, bottom: 0, left: 0, right: 0 },
  listeners: new Set<() => void>(),
  bump(kind: 'theme' | 'screen' | 'insets') {
    if (kind === 'theme') this.theme = { theme: { ...this.theme.theme } };
    if (kind === 'screen') this.screen = { ...this.screen };
    if (kind === 'insets') this.insets = { ...this.insets };
    this.listeners.forEach((l) => l());
  },
};
function mockCtxHook<K extends 'theme' | 'screen' | 'insets'>(R: typeof React, kind: K): (typeof mockCtx)[K] {
  const sub = (l: () => void) => { mockCtx.listeners.add(l); return () => mockCtx.listeners.delete(l); };
  const value = R.useSyncExternalStore(sub, () => mockCtx[kind]);
  return mockCtx.unstable ? ({ ...value } as (typeof mockCtx)[K]) : value;
}
const mockLang = { lang: 'ru' };
const mockStudy = { studyTarget: 'en' };
const mockPending = () => new Promise<never>(() => undefined);
const mockToken = { generation: 1, stableId: 'stable', phase: 'active' };
jest.mock('../components/ThemeContext', () => { const R = require('react'); return { useTheme: () => mockCtxHook(R, 'theme') }; });
jest.mock('../hooks/use-screen', () => { const R = require('react'); return { useScreen: () => mockCtxHook(R, 'screen') }; });
jest.mock('../app/stable_safe_area_metrics', () => { const R = require('react'); return { useStableSafeAreaInsets: () => mockCtxHook(R, 'insets') }; });
jest.mock('../components/LangContext', () => ({ useLang: () => mockLang }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => mockStudy }));
jest.mock('../app/learning_language_surface_readiness', () => ({ isLearnTabVisibleForTarget: () => true }));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, copy: { ru?: string }) => copy?.ru ?? '' }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => false }));
jest.mock('../hooks/use_community_tab_dot', () => ({ useCommunityTabDot: () => false }));
jest.mock('../hooks/use-tab-content-bottom-pad', () => ({ FLOATING_PILL_BOTTOM_GAP: 12 }));
jest.mock('../app/perf_r1_probe', () => ({
  PerfR1Profile: ({ children }: { children: React.ReactNode }) => children,
  useMountTrace: () => undefined,
  useNavActionTrace: () => undefined,
}));
jest.mock('../app/tabs_shell_state', () => ({ setTabsShellMounted: () => undefined }));
jest.mock('../app/home_paint_marker', () => ({ whenHomePainted: () => mockPending() }));
jest.mock('../app/onboarding_defer_gate', () => ({ whenOnboardingSettled: () => mockPending() }));
jest.mock('../app/dev_hub_bus', () => ({ subscribeOpenDevHub: () => () => undefined }));
jest.mock('../app/config', () => ({ ENABLE_DEV_TOOLS: false }));
jest.mock('../app/exam_best_pct_overlay', () => ({ setExamBestPctTabActivity: () => undefined }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockToken,
  subscribeAccountGeneration: () => ({ remove: () => undefined }),
}));
// ScreenGradient оборачивает весь контент вкладок — заглушка обязана рисовать детей
jest.mock('../components/ScreenGradient', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});
jest.mock('../components/TopFadeMask', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/DeferredRedirect', () => ({ DeferredRedirect: () => null }));
jest.mock('../components/dev/DevHubSheetGate', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/v2/V2TabBar', () => ({ __esModule: true, default: () => null, V2_TAB_BAR_HEIGHT: 64 }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('react-freeze', () => ({ Freeze: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});
jest.mock('../app/TabSlider', () => {
  const R = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: { children: React.ReactNode }) => R.createElement(View, null, children) };
});

// ── копии разметки и наложение патчей в памяти ─────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, 'tmp', 'tabs_render_measure');
const lf = (s: string) => s.replace(/\r\n?/g, '\n');
const PATCHES = [1, 2, 3, 4].map((n) => fs.readFileSync(path.join(ROOT, 'docs', 'phraseman-2.0', 'handoff', `TABS_RENDER_${n}.patch`), 'utf8'));

/** Unified diff одного файла из .patch → ровно одна замена «контекст+удалённое» → «контекст+добавленное» на хунк; null — не ложится. */
function applyPatchToFile(source: string, patchText: string, relPath: string): string | null {
  const sections = lf(patchText).split(/^diff --git /m).filter((s) => s.startsWith(`a/${relPath} `));
  if (sections.length === 0) return source;
  let out = lf(source);
  for (const section of sections) {
    for (const hunk of section.split(/^@@[^\n]*@@[^\n]*\n/m).slice(1)) {
      const oldLines: string[] = [];
      const newLines: string[] = [];
      for (const line of hunk.split('\n')) {
        if (line.startsWith('\\')) continue;
        const tag = line[0];
        const body = line.slice(1);
        if (tag === ' ') { oldLines.push(body); newLines.push(body); } else if (tag === '-') oldLines.push(body); else if (tag === '+') newLines.push(body);
      }
      const oldBlock = oldLines.join('\n');
      if (out.split(oldBlock).length !== 2) return null;
      out = out.replace(oldBlock, () => newLines.join('\n'));
    }
  }
  return out;
}

/** Копия в tmp/tabs_render_measure/ — та же глубина, что app/(tabs)/: ./X → app/(tabs)/X, ../X → app/X, ../../X — как есть. */
function relocate(source: string, tabContextFile: string | null): string {
  // Главная — сразу модулем (без React.lazy/Suspense): замер про перерисовки, а не про загрузку; одинаково для всех вариантов.
  const eager = source
    .replace("import('./home')", "Promise.resolve(require('./home'))")
    .replace('React.lazy(() => homeScreenModulePromise)', "(require('./home') as { default: React.ComponentType<{ onOpenDevHub: () => void }> }).default");
  return eager.replace(/(from\s+|import\(\s*|require\(\s*)(['"])(\.{1,2})\/([^'"]+)\2/g, (m, lead, q, dots, rest) => {
    if (dots === '..' && rest === 'TabContext' && tabContextFile) return `${lead}${q}./${tabContextFile}${q}`;
    if (dots === '..' && !rest.startsWith('../')) return `${lead}${q}../../app/${rest}${q}`;
    if (dots === '.') return `${lead}${q}../../app/(tabs)/${rest}${q}`;
    return m;
  });
}

/** Вариант: [] — текущий код, [n…] — с патчами; null — набор не ложится на текущий код (уже применён или код ушёл). */
function buildVariant(numbers: readonly number[]): { layoutPath: string; ctxPath: string } | null {
  let layout: string | null = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', '_layout.tsx'), 'utf8');
  let ctx: string | null = fs.readFileSync(path.join(ROOT, 'app', 'TabContext.tsx'), 'utf8');
  for (const n of numbers) {
    layout = layout === null ? null : applyPatchToFile(layout, PATCHES[n - 1], 'app/(tabs)/_layout.tsx');
    ctx = ctx === null ? null : applyPatchToFile(ctx, PATCHES[n - 1], 'app/TabContext.tsx');
  }
  if (layout === null || ctx === null) return null;
  fs.mkdirSync(TMP, { recursive: true });
  const tag = numbers.length === 0 ? 'current' : `p${numbers.join('')}`;
  const ctxPath = path.join(TMP, `TabContext_${tag}.tsx`);
  const layoutPath = path.join(TMP, `layout_${tag}.tsx`);
  fs.writeFileSync(ctxPath, ctx.replace("from './tab_page_model'", "from '../../app/tab_page_model'"));
  fs.writeFileSync(layoutPath, relocate(layout, `TabContext_${tag}`));
  return { layoutPath, ctxPath };
}

type Env = Readonly<{
  Layout: React.ComponentType;
  ctx: { useTabNav: () => unknown };
  R: typeof React;
  rntl: typeof import('@testing-library/react-native');
}>;

/** Свой реестр модулей на вариант: разметка, контекст вкладок, React и RNTL — из одного реестра. */
function loadIsolated(paths: { layoutPath: string; ctxPath: string }): Env {
  let env: Env | null = null;
  jest.isolateModules(() => {
    env = {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      R: require('react'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      // pure: без авто-очистки (afterEach нельзя регистрировать внутри beforeAll); размонтируем сами в measureTransition
      rntl: require('@testing-library/react-native/pure'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ctx: require(paths.ctxPath),
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Layout: require(paths.layoutPath).default,
    };
  });
  if (!env) throw new Error('isolateModules: вариант не загрузился');
  return env;
}

type Counts = Readonly<{ layoutRenders: number; layoutCommits: number; homeRenders: number; homeMounted: boolean }>;

async function providersRerenderSeparately(env: Env): Promise<void> {
  if (!mockCtx.unstable) return;
  for (const kind of ['insets', 'theme', 'screen'] as const) {
    await env.rntl.act(async () => { mockCtx.bump(kind); });
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

async function measureTransition(env: Env, label: string, unstable: boolean): Promise<Counts> {
  mockCtx.unstable = unstable;
  mockHome.ctx = env.ctx;
  mockTrace.lines.length = 0;
  mockTrace.commits = {};
  mockHome.renders = 0;
  mockNav.set({ pathname: '/home', segments: ['(tabs)', 'home'], focused: true });
  const view = await env.rntl.render(env.R.createElement(env.Layout));
  await env.rntl.act(async () => { await tick(); });
  const mount = {
    layoutRenders: mockTrace.lines.filter((l) => l.includes('[TABS-RENDER]')).length,
    homeRenders: mockHome.renders,
    probeInTree: view.queryAllByTestId('home-probe').length,
  };
  // зачем: 0 здесь = вариант не отрисовался или зонд не смонтирован — замер недействителен, тест обязан это показать
  process.stdout.write(`[TABS-RENDER-MEASURE] ${label} unstable=${String(unstable)} mount=${JSON.stringify(mount)}\n`);
  mockTrace.lines.length = 0;
  mockTrace.commits = {};
  mockHome.renders = 0;
  // «открыли пейвол»: маршрут ушёл на модалку, группа вкладок потеряла фокус
  await env.rntl.act(async () => { mockNav.set({ pathname: '/premium_modal', segments: ['premium_modal'], focused: false }); });
  await providersRerenderSeparately(env);
  // «закрыли крестиком»: маршрут вернулся, фокус вернулся
  await env.rntl.act(async () => { mockNav.set({ pathname: '/home', segments: ['(tabs)', 'home'], focused: true }); });
  await providersRerenderSeparately(env);
  await env.rntl.act(async () => { await tick(); });
  const counts = {
    layoutRenders: mockTrace.lines.filter((l) => l.includes('[TABS-RENDER]')).length,
    layoutCommits: mockTrace.commits['layout:tabs'] ?? 0,
    homeRenders: mockHome.renders,
    homeMounted: mount.probeInTree > 0,
  };
  process.stdout.write(`[TABS-RENDER-MEASURE] ${label} unstable=${String(unstable)} transition=${JSON.stringify(counts)}\n`);
  view.unmount();
  mockCtx.unstable = false;
  return counts;
}

type Result = Readonly<{ stable: Counts; unstable: Counts; mounted: boolean }>;

async function measureVariant(numbers: readonly number[]): Promise<Result | null> {
  const paths = buildVariant(numbers);
  if (!paths) return null;
  const label = numbers.length === 0 ? 'current' : `patches=${numbers.join('+')}`;
  const stable = await measureTransition(loadIsolated(paths), label, false);
  const unstable = await measureTransition(loadIsolated(paths), label, true);
  return { stable, unstable, mounted: stable.layoutRenders > 0 || unstable.layoutRenders > 0 };
}

afterAll(() => { fs.rmSync(TMP, { recursive: true, force: true }); });

describe('tabs layout re-render cascade on «paywall open → close» (route change + focus)', () => {
  let current: Result;
  const singles: Record<number, Result | null> = {};
  let all: Result | null = null;
  let pair12: Result | null = null; // применяемый набор (координатор 15.10): №1 + №2

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    current = (await measureVariant([]))!;
    for (const n of [1, 2, 3, 4]) singles[n] = await measureVariant([n]);
    pair12 = await measureVariant([1, 2]);
    all = await measureVariant([1, 2, 3, 4]);
  });

  it('the harness observes the real layout and Home in every variant (no empty render)', () => {
    // зачем: «живость» стенда — разметка рендерится и Главная смонтирована. Перерисовки Главной на переходе здесь не проверяем:
    // после TABS_RENDER_1+2 их 0 — это цель (последний тест), а не признак пустого стенда.
    expect(current.stable.layoutRenders).toBeGreaterThan(0);
    expect(current.stable.homeMounted).toBe(true);
    for (const r of [...Object.values(singles), pair12, all]) if (r) expect(r.mounted && r.stable.homeMounted).toBe(true);
  });

  it('TABS_RENDER_1..4 together reduce re-renders of Home on a route change (stable providers)', () => {
    if (!all) {
      console.warn('[TABS-RENDER-MEASURE] skip compare: TABS_RENDER_1..4 не ложатся (уже применены или код ушёл)');
      return;
    }
    expect(all.stable.homeRenders).toBeLessThan(current.stable.homeRenders);
    expect(all.stable.layoutRenders).toBeLessThanOrEqual(current.stable.layoutRenders);
  });

  it('unstable providers (new value per render, separate commits) multiply layout renders', () => {
    // зачем: если здесь счётчики разметки много выше stable — 13–14 на устройстве объясняются провайдерами выше по дереву,
    // и чинить надо их мемоизацию, а не разметку.
    expect(current.unstable.layoutRenders).toBeGreaterThan(current.stable.layoutRenders);
  });

  // Цель: Главная не перерисовывается из-за смены маршрута и возврата фокуса. Достигнута применением TABS_RENDER_1 + 2 (15.10,
  // решение координатора по замеру cfe9e5cc2: Главная 3 → 0) — сторож держит это на текущем коде.
  it('current code: Home does not re-render on «paywall open → close» (target after TABS_RENDER_1..4)', () => {
    expect(current.stable.homeRenders).toBe(0);
  });
});
