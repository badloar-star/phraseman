// зачем (координатор 12.10, утечка памяти в хабе Карточек; сперва логи): журнал [HUB-LIFECYCLE] — только dev. В стор-сборке (__DEV__=false) все
// функции пробы обязаны молчать и ничего не регистрировать; в dev — считать живые экземпляры и размеры кэшей, не падая на сбое функции размера.
// В проекте нет react-test-renderer: хук гоняем напрямую, подменив useEffect — эффект запускается сразу, очистка возвращается тесту.
const mockEffects: Array<() => void | (() => void)> = [];
jest.mock('react', () => ({ ...jest.requireActual('react'), useEffect: (fn: () => void | (() => void)) => { mockEffects.push(fn); } }));

import {
  logHubSnapshot, noteHubSubscription, registerHubCacheProbe, resetHubLifecycleProbeForTests, useHubLifecycle,
} from '../app/hub_lifecycle_probe';

/** «Смонтировать» хук: вернуть функцию размонтирования. */
function mountProbe(label: string): () => void {
  mockEffects.length = 0;
  useHubLifecycle(label);
  const cleanup = mockEffects[0]?.();
  return typeof cleanup === 'function' ? cleanup : () => {};
}

describe('hub lifecycle probe', () => {
  let log: jest.SpyInstance;
  beforeEach(() => {
    resetHubLifecycleProbeForTests();
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); (globalThis as { __DEV__?: boolean }).__DEV__ = true; });

  it('stays silent outside dev', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    registerHubCacheProbe('x', () => 1);
    noteHubSubscription('x', 'on');
    logHubSnapshot('tag');
    mountProbe('A')();
    expect(log).not.toHaveBeenCalled();
  });

  it('counts live instances and reports cache sizes in dev', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    registerHubCacheProbe('cache.a', () => 7);
    registerHubCacheProbe('cache.broken', () => { throw new Error('boom'); });
    const unmount = mountProbe('Hub');
    const mountLine = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('mount Hub#1'));
    expect(mountLine).toBeDefined();
    expect(mountLine).toContain('"Hub":1');
    expect(mountLine).toContain('"cache.a":7');
    expect(mountLine).toContain('ошибка: boom');
    unmount();
    const unmountLine = log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('unmount Hub#1'));
    expect(unmountLine).toContain('"Hub":0');
  });

  it('counts subscriptions on and off', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    noteHubSubscription('focus', 'on');
    noteHubSubscription('focus', 'on');
    noteHubSubscription('focus', 'off');
    const lines = log.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('sub focus'));
    expect(lines.map((l) => l.match(/active=(\d+)/)?.[1])).toEqual(['1', '2', '1']);
  });
});
