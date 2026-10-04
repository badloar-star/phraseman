/**
 * PM-211 — первый кадр Главной не ждёт необязательных прогревов.
 *
 * зачем: владелец «так чтобы все летало не лагало». Необязательная работа
 * (проверка достижений по монетам, тяжёлая пост-стартовая инициализация с
 * прогревом друзей/магазина/аналитики) не должна делить JS-поток с ещё не
 * нарисованной Главной. Сторож держит два слоя:
 *  1) поведение помощника runAfterHomeFirstFrame — задача не стартует до кадра
 *     Главной (или потолка), идёт после взаимодействий, отменяется, ошибки не немые;
 *  2) структуру _layout / app_snapshot_bootstrap — путь первого кадра не ждёт
 *     друзей/достижений/AI/лиги и зовёт их только через помощник.
 */
import fs from 'fs';
import path from 'path';

type Handler = () => void;
const listeners = new Map<string, Set<Handler>>();
let latchedHomeReady = false;

jest.mock('../app/events', () => ({
  onAppEvent: (event: string, handler: Handler) => {
    const set = listeners.get(event) ?? new Set<Handler>();
    set.add(handler);
    listeners.set(event, set);
    let replay: ReturnType<typeof setTimeout> | null = null;
    if (event === 'app_home_screen_ready' && latchedHomeReady) {
      replay = setTimeout(() => handler(), 0);
    }
    return {
      remove: () => {
        set.delete(handler);
        if (replay) clearTimeout(replay);
      },
    };
  },
}));

const interactionQueue: Array<{ cb: () => void; cancelled: boolean }> = [];
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      const entry = { cb, cancelled: false };
      interactionQueue.push(entry);
      return { cancel: () => { entry.cancelled = true; } };
    },
  },
}));

function emitHomeReady(): void {
  latchedHomeReady = true;
  for (const h of Array.from(listeners.get('app_home_screen_ready') ?? [])) h();
}

function flushInteractions(): void {
  while (interactionQueue.length > 0) {
    const entry = interactionQueue.shift()!;
    if (!entry.cancelled) entry.cb();
  }
}

const root = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('PM-211 runAfterHomeFirstFrame — поведение', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loadModule = () => require('../app/first_frame_deferred_warmups') as typeof import('../app/first_frame_deferred_warmups');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    listeners.clear();
    interactionQueue.length = 0;
    latchedHomeReady = false;
    // зачем (04.10): по умолчанию сплеш уже снят — проверяем прежнее поведение; ожидание сплеша — отдельный тест.
    (globalThis as { __phrasemanNativeSplashHiddenAt?: number }).__phrasemanNativeSplashHiddenAt = 1;
    delete (globalThis as { __phrasemanNativeSplashWaiters?: unknown }).__phrasemanNativeSplashWaiters;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('после кадра Главной ждёт снятия сплеша (или потолка), чтобы не отнимать поток у снятия сплеша', async () => {
    delete (globalThis as { __phrasemanNativeSplashHiddenAt?: number }).__phrasemanNativeSplashHiddenAt;
    const { runAfterHomeFirstFrame, markNativeSplashHidden, FIRST_FRAME_SPLASH_WAIT_CEILING_MS } = loadModule();
    const task = jest.fn();
    runAfterHomeFirstFrame('splash', task, { fallbackMs: 60_000 });
    emitHomeReady();
    await Promise.resolve();
    flushInteractions();
    expect(task).not.toHaveBeenCalled(); // кадр есть, сплеш ещё висит

    markNativeSplashHidden();
    await Promise.resolve();
    await Promise.resolve();
    flushInteractions();
    expect(task).toHaveBeenCalledTimes(1);

    // потолок: без снятия сплеша задача всё равно не теряется
    delete (globalThis as { __phrasemanNativeSplashHiddenAt?: number }).__phrasemanNativeSplashHiddenAt;
    jest.resetModules();
    const again = loadModule();
    const late = jest.fn();
    again.runAfterHomeFirstFrame('ceiling', late, { fallbackMs: 60_000 });
    emitHomeReady();
    jest.advanceTimersByTime(FIRST_FRAME_SPLASH_WAIT_CEILING_MS);
    await Promise.resolve();
    await Promise.resolve();
    flushInteractions();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('задача НЕ стартует до кадра Главной и стартует после него и взаимодействий', () => {
    const { runAfterHomeFirstFrame } = loadModule();
    const task = jest.fn();
    runAfterHomeFirstFrame('t1', task, { fallbackMs: 5_000 });
    jest.advanceTimersByTime(1_000);
    flushInteractions();
    expect(task).not.toHaveBeenCalled();

    emitHomeReady();
    expect(task).not.toHaveBeenCalled(); // ещё ждёт runAfterInteractions
    flushInteractions();
    expect(task).toHaveBeenCalledTimes(1);

    // потолок после релиза не запускает задачу второй раз
    jest.advanceTimersByTime(10_000);
    flushInteractions();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('если Главная уже нарисована (липкое событие) — задача идёт без ожидания потолка', () => {
    latchedHomeReady = true;
    const { runAfterHomeFirstFrame } = loadModule();
    const task = jest.fn();
    runAfterHomeFirstFrame('t2', task, { fallbackMs: 60_000 });
    jest.advanceTimersByTime(1);
    flushInteractions();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('потолок отпускает задачу, если Главная так и не нарисовалась', () => {
    const { runAfterHomeFirstFrame } = loadModule();
    const task = jest.fn();
    runAfterHomeFirstFrame('t3', task, { fallbackMs: 2_500 });
    jest.advanceTimersByTime(2_499);
    flushInteractions();
    expect(task).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    flushInteractions();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('отмена до кадра и отмена между кадром и взаимодействиями — задача не выполняется', () => {
    const { runAfterHomeFirstFrame } = loadModule();
    const a = jest.fn();
    const b = jest.fn();
    const cancelA = runAfterHomeFirstFrame('a', a, { fallbackMs: 1_000 });
    const cancelB = runAfterHomeFirstFrame('b', b, { fallbackMs: 1_000 });
    cancelA();
    emitHomeReady();
    cancelB();
    jest.advanceTimersByTime(5_000);
    flushInteractions();
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('ошибка задачи (синхронная и асинхронная) не пробрасывается и пишется в лог [FIRST-FRAME]', async () => {
    const { runAfterHomeFirstFrame } = loadModule();
    const warn = console.warn as jest.Mock;
    runAfterHomeFirstFrame('sync_fail', () => { throw new Error('boom_sync'); }, { fallbackMs: 10 });
    runAfterHomeFirstFrame('async_fail', () => Promise.reject(new Error('boom_async')), { fallbackMs: 10 });
    emitHomeReady();
    expect(() => flushInteractions()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    const lines = warn.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('[FIRST-FRAME]') && l.includes('sync_fail') && l.includes('boom_sync'))).toBe(true);
    expect(lines.some((l) => l.includes('[FIRST-FRAME]') && l.includes('async_fail') && l.includes('boom_async'))).toBe(true);
  });
});

describe('PM-211 структура: путь первого кадра не ждёт необязательного', () => {
  const layout = read('app/_layout.tsx');
  const bootstrapStart = layout.indexOf('const bootstrap = async');
  const bootstrapEnd = layout.indexOf("bootMark('setReady(true) — bootstrap COMPLETE')", bootstrapStart);
  const bootstrap = layout.slice(bootstrapStart, bootstrapEnd);

  it('регион bootstrap найден', () => {
    expect(bootstrapStart).toBeGreaterThan(0);
    expect(bootstrapEnd).toBeGreaterThan(bootstrapStart);
  });

  it('локальная гидрация первого кадра (бюджет 350 мс) не содержит друзей/достижений/AI/лиги/арены', () => {
    const start = bootstrap.indexOf('const startupLocalHydration = Promise.all([');
    expect(start).toBeGreaterThan(0);
    const hydration = bootstrap.slice(start, bootstrap.indexOf(']);', start));
    expect(hydration).not.toMatch(/friend|achievement|dialogue|warmDialogue|league|arena|leaderboard/i);
  });

  it('проверка достижений по монетам на старте идёт только после кадра Главной', () => {
    expect(bootstrap).toMatch(
      /runAfterHomeFirstFrame\('achievements_coins_boot_check',\s*\(\) => getStableId\(\)\s*\n\s*\.then\(\(\) => getRunesBalanceRead\(\)\)/,
    );
    expect(bootstrap).not.toMatch(/void getStableId\(\)\s*\n\s*\.then\(\(\) => getRunesBalanceRead\(\)\)/);
    // любой вызов checkAchievements в bootstrap обёрнут помощником
    let idx = bootstrap.indexOf('checkAchievements(');
    while (idx >= 0) {
      const wrapper = bootstrap.lastIndexOf('runAfterHomeFirstFrame(', idx);
      expect(wrapper).toBeGreaterThanOrEqual(0);
      expect(bootstrap.slice(wrapper, idx)).not.toMatch(/\);\n/);
      idx = bootstrap.indexOf('checkAchievements(', idx + 1);
    }
  });

  it('bootstrap не трогает друзей/лигу/арену напрямую', () => {
    expect(bootstrap).not.toMatch(/startFriendsTabSwrPrime|friends_tab_swr_warm|league|arena/i);
  });

  it('тяжёлая пост-стартовая инициализация (друзья, магазин, аналитика) ждёт кадр Главной', () => {
    const effectStart = layout.indexOf('heavyInitStartedRef.current = true;');
    expect(effectStart).toBeGreaterThan(0);
    const effect = layout.slice(effectStart, layout.indexOf('}, [', effectStart));
    expect(effect).toMatch(/runAfterHomeFirstFrame\('heavy_init'/);
    expect(effect).toContain('runHeavyInitRef.current?.()');
    expect(effect).not.toMatch(/InteractionManager\.runAfterInteractions/);
  });

  it('прогрев друзей в снапшоте не входит в Promise.all первого кадра (коммит 31f6e03ac)', () => {
    const snap = read('app/app_snapshot_bootstrap.ts');
    const allStart = snap.indexOf('await Promise.all([');
    expect(allStart).toBeGreaterThan(0);
    const all = snap.slice(allStart, snap.indexOf(']);', allStart));
    expect(all).not.toMatch(/primeFriendsSnapshot|startFriendsTabSwrPrime/);
    expect(snap).toMatch(/void primeFriendsSnapshot\(\);/);
  });
});
