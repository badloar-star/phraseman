/**
 * [TABS-SINGLE] сторож «один экземпляр вкладок» (app/tabs_single_instance.ts).
 * зачем (координатор 15.10, r7k): после router.replace('/(tabs)/…') с экрана поверх вкладок в корневом стеке два (tabs); нижний
 * догоняет каждую смену маршрута впустую. Условия: только при ≥2; после перехода; верхние маршруты (key/params/state) как были;
 * повтор — no-op; аварийный выключатель Remote Config; ранние выходы с логом.
 */
jest.mock('react-native', () => ({ InteractionManager: { runAfterInteractions: (cb: () => void) => cb() } }));
// Пакет навигации — ESM, основной jest его не преобразует; действие reset той же формы, что у оригинала ({ type: 'RESET', payload }).
jest.mock('@react-navigation/native', () => ({ CommonActions: { reset: (payload: unknown) => ({ type: 'RESET', payload }) } }));
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: () => Promise.resolve(null) }));

import {
  planTabsDedupe,
  startTabsSingleInstanceGuard,
  tabsSingleGuardEnabled,
  TABS_SINGLE_GUARD_FLAG,
} from '../app/tabs_single_instance';

type Route = { key: string; name: string; params?: unknown; state?: State };
type State = { key?: string; type?: string; index?: number; routes: Route[] };

const tabs = (key: string, tab = 'home'): Route => ({ key, name: '(tabs)', state: { key: `tabs-stack-${key}`, index: 0, routes: [{ key: `${tab}-${key}`, name: tab }] } });

function rootWith(routes: Route[], index = routes.length - 1): State {
  return { key: 'root-stack', type: 'stack', index, routes };
}

describe('planTabsDedupe — план снятия дублей', () => {
  it('один (tabs) — ничего не делаем', () => {
    expect(planTabsDedupe(rootWith([tabs('a'), { key: 'l', name: 'lesson_complete' }]))).toBeNull();
  });

  it('два (tabs) — оставляем последний и всё выше, снимаем нижнее', () => {
    const paywall: Route = { key: 'pw', name: 'premium_modal', params: { context: 'no_energy' } };
    const plan = planTabsDedupe(rootWith([tabs('a'), { key: 'l', name: 'lesson1' }, tabs('b', 'settings'), paywall]));
    expect(plan).not.toBeNull();
    if (!plan || 'skip' in plan) throw new Error('ожидался план');
    expect(plan.targetKey).toBe('root-stack');
    expect(plan.tabsCount).toBe(2);
    expect(plan.removed).toEqual(['(tabs)', 'lesson1']);
    expect(plan.routes.map((r) => r.key)).toEqual(['b', 'pw']);
    expect(plan.routes[1]).toBe(paywall); // тот же объект: key/params/state верхних не меняются
    expect(plan.index).toBe(1);
  });

  it('фокус ниже последнего (tabs) — не трогаем', () => {
    const plan = planTabsDedupe(rootWith([tabs('a'), tabs('b'), { key: 'x', name: 'exam' }], 0));
    expect(plan).toEqual({ skip: 'focus_below_last_tabs' });
  });

  it('дубли во вложенном стеке тоже находятся', () => {
    const nested: State = { key: 'inner', index: 1, routes: [tabs('a'), tabs('b')] };
    const plan = planTabsDedupe({ key: 'outer', index: 0, routes: [{ key: 'root', name: '__root', state: nested }] });
    if (!plan || 'skip' in plan) throw new Error('ожидался план');
    expect(plan.targetKey).toBe('inner');
    expect(plan.routes.map((r) => r.key)).toEqual(['b']);
  });
});

describe('tabsSingleGuardEnabled — аварийный выключатель', () => {
  it('по умолчанию включён (нет кэша / нет флага)', () => {
    expect(tabsSingleGuardEnabled(null)).toBe(true);
    expect(tabsSingleGuardEnabled(JSON.stringify({ bools: {} }))).toBe(true);
  });
  it('выключен только явным false', () => {
    expect(tabsSingleGuardEnabled(JSON.stringify({ bools: { [TABS_SINGLE_GUARD_FLAG]: false } }))).toBe(false);
  });
  it('битый кэш — включён', () => {
    expect(tabsSingleGuardEnabled('{oops')).toBe(true);
  });
});

function fakeContainer(initial: State) {
  let state = initial;
  const listeners: Array<() => void> = [];
  const dispatched: unknown[] = [];
  return {
    ref: {
      addListener: (_e: 'state', cb: () => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; },
      getRootState: () => state,
      dispatch: (action: unknown) => {
        dispatched.push(action);
        const a = action as { type: string; target: string; payload: { index: number; routes: Route[] } };
        if (a.type === 'RESET' && a.target === state.key) state = { ...state, index: a.payload.index, routes: a.payload.routes };
      },
    },
    setState: (next: State) => { state = next; listeners.forEach((cb) => cb()); },
    dispatched,
    listenerCount: () => listeners.length,
  };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('startTabsSingleInstanceGuard — сторож', () => {
  it('после перехода снимает нижний (tabs), повтор — no-op', async () => {
    const c = fakeContainer(rootWith([tabs('a'), { key: 'lc', name: 'lesson_complete' }]));
    const lines: string[] = [];
    const stop = startTabsSingleInstanceGuard(c.ref, { log: (l) => lines.push(l), readFlagRaw: () => Promise.resolve(null), resetEnabled: true });
    await flush();
    c.setState(rootWith([tabs('a'), tabs('b')])); // replace('/(tabs)/home') с итога урока
    expect(c.dispatched).toHaveLength(1);
    expect(c.ref.getRootState().routes.map((r) => r.key)).toEqual(['b']);
    expect(lines.some((l) => l.includes('[TABS-SINGLE] reset done') && l.includes('after=single'))).toBe(true);
    c.setState(c.ref.getRootState()); // ещё одно событие — дублей нет
    expect(c.dispatched).toHaveLength(1);
    stop();
    expect(c.listenerCount()).toBe(0);
  });

  it('reset ждёт конца перехода и перепроверяет живое состояние', async () => {
    const c = fakeContainer(rootWith([tabs('a')]));
    const queue: Array<() => void> = [];
    const lines: string[] = [];
    startTabsSingleInstanceGuard(c.ref, { log: (l) => lines.push(l), runAfterInteractions: (cb) => { queue.push(cb); }, readFlagRaw: () => Promise.resolve(null), resetEnabled: true });
    await flush();
    c.setState(rootWith([tabs('a'), tabs('b')]));
    expect(c.dispatched).toHaveLength(0); // посреди перехода — не трогаем
    c.setState(rootWith([tabs('a'), tabs('b')])); // второе событие до конца перехода
    expect(lines.some((l) => l.includes('reason=already_scheduled'))).toBe(true);
    c.setState(rootWith([tabs('b')])); // стек сам пришёл к одному (tabs)
    queue.shift()?.();
    expect(c.dispatched).toHaveLength(0);
    expect(lines.some((l) => l.includes('reason=resolved_before_reset'))).toBe(true);
  });

  it('флаг выключен — не трогает и пишет причину', async () => {
    const c = fakeContainer(rootWith([tabs('a')]));
    const lines: string[] = [];
    startTabsSingleInstanceGuard(c.ref, {
      log: (l) => lines.push(l),
      readFlagRaw: () => Promise.resolve(JSON.stringify({ bools: { [TABS_SINGLE_GUARD_FLAG]: false } })),
      resetEnabled: true,
    });
    await flush();
    c.setState(rootWith([tabs('a'), tabs('b')]));
    expect(c.dispatched).toHaveLength(0);
    expect(lines.some((l) => l.includes('reason=flag_off'))).toBe(true);
  });

  it('режим «только журнал»: строка только при смене числа (tabs), источник — экран, бывший сверху', async () => {
    const c = fakeContainer(rootWith([tabs('a')]));
    const lines: string[] = [];
    startTabsSingleInstanceGuard(c.ref, { log: (l) => lines.push(l), readFlagRaw: () => Promise.resolve(null), resetEnabled: false });
    await flush();
    c.setState(rootWith([tabs('a'), { key: 'ex', name: 'exam' }]));
    c.setState(rootWith([tabs('a'), tabs('b')])); // exam сделал replace('/(tabs)/home')
    c.setState(rootWith([tabs('a'), tabs('b')])); // ещё переход — число не менялось, строки нет
    expect(c.dispatched).toHaveLength(0);
    const observed = lines.filter((l) => l.includes('[TABS-SINGLE] observe tabs='));
    expect(observed).toHaveLength(1);
    expect(observed[0]).toContain('source=exam');
    expect(observed[0]).toContain('between=[]');
    expect(observed[0]).toContain('instSeen=2');
    c.setState(rootWith([tabs('b')])); // стек вернулся к одной копии
    expect(lines.some((l) => l.includes('[TABS-SINGLE] observe resolved tabs=1'))).toBe(true);
  });

  it('нет контейнера — выключен с логом, без исключений', () => {
    const lines: string[] = [];
    const stop = startTabsSingleInstanceGuard(null, { log: (l) => lines.push(l) });
    expect(lines).toEqual(['[TABS-SINGLE] off reason=no_container_ref']);
    expect(() => stop()).not.toThrow();
  });
});
