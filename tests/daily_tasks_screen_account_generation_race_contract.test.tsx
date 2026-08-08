import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';

jest.unmock('react-native');

/**
 * зачем: аудит зависшего 0/0 (2026-08-04) — refreshTasksAndProgress в
 * app/daily_tasks_screen.tsx тихо return'ится (см. accountScopeKey(token) !==
 * renderAccountScope), если смена «поколения аккаунта» (вход/merge/restore)
 * происходит МЕЖДУ рендером, зафиксировавшим renderAccountScope, и запуском
 * async-замыкания. Этот файл — минимальная модель именно этого сценария,
 * отдельного от tasks.length-гонки в daily_tasks_screen_loading_race_contract.
 */
type Token = { generation: number; stableId: string | null; phase: 'active' | 'transitioning' };
type Listener = (token: Token) => void;

function makeAccountGenerationStub(initialStableId: string) {
  let generation = 1;
  let stableId: string | null = initialStableId;
  let phase: Token['phase'] = 'active';
  const listeners = new Set<Listener>();

  const capture = (): Token => ({ generation, stableId, phase });
  const scopeKey = (token: Token): string | null => (
    token.phase !== 'active' ? null : `generation:${token.generation}:uid:${token.stableId ?? 'none'}`
  );
  const notify = () => {
    const token = capture();
    listeners.forEach((l) => l(token));
  };
  const beginTransition = () => {
    generation += 1;
    phase = 'transitioning';
    stableId = null;
    notify();
  };
  const settleNewAccount = (newStableId: string) => {
    phase = 'active';
    stableId = newStableId;
    notify();
  };
  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  };

  return { capture, scopeKey, subscribe, beginTransition, settleNewAccount };
}

type DailyTask = { id: string };

let nextRequestId = 0;
function beginRequest(): { requestId: number; isCurrent: () => boolean } {
  nextRequestId += 1;
  const requestId = nextRequestId;
  return { requestId, isCurrent: () => requestId === nextRequestId };
}

function useFocusEffect(effect: () => void | (() => void)) {
  const cleanupRef = useRef<void | (() => void)>(undefined);
  useEffect(() => {
    cleanupRef.current = effect();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [effect]);
}

/**
 * Минимальная модель фрагмента app/daily_tasks_screen.tsx вокруг
 * renderAccountScope + подписки на смену поколения аккаунта.
 * `withGenerationSubscriptionFix=false` воспроизводит ДОРЕФАКТОРИНГОВЫЙ код
 * (нет подписки — только useFocusEffect на фокус).
 */
function DailyTasksScreenHarness({
  stub,
  getTodayTasksSafe,
  withGenerationSubscriptionFix,
  externalRefreshBus,
}: {
  stub: ReturnType<typeof makeAccountGenerationStub>;
  getTodayTasksSafe: () => Promise<DailyTask[]>;
  withGenerationSubscriptionFix: boolean;
  /**
   * зачем: имитирует onAppEvent('daily_task_reward_claimed', ...) из реального
   * кода (строка ~2547) — внешнее событие, не связанное с React-пропсами
   * родителя, которое вызывает refreshTasksAndProgress() БЕЗ предшествующего
   * ре-рендера компонента. Именно так устаревшее замыкание (renderAccountScope
   * из ПРЕЖНЕГО рендера) реально попадает в исполнение: rerender() из RTL сам
   * пересчитывает тело компонента и потому не может честно воспроизвести это.
   */
  externalRefreshBus: { subscribe: (fn: () => void) => { remove: () => void } };
}) {
  const renderToken = stub.capture();
  const renderAccountScope = stub.scopeKey(renderToken);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const tasksLengthRef = useRef(tasks.length);
  tasksLengthRef.current = tasks.length;

  // зачем: в реальном коде (app/daily_tasks_screen.tsx:2375-2378) вся функция
  // обёрнута в (async () => {...})() — accountScopeKey-проверка выполняется на
  // первом microtask-тике ПОСЛЕ вызова, а не синхронно в момент вызова. Именно
  // это окно (между синхронным useFocusEffect-триггером и асинхронной
  // проверкой) и позволяет смене поколения аккаунта проскочить между ними.
  const refreshTasksAndProgress = useCallback(() => {
    (async () => {
      const request = beginRequest();
      const token = stub.capture();
      if (stub.scopeKey(token) !== renderAccountScope) return; // тот самый молчаливый return
      setLoadingTasks(true);
      const list = await getTodayTasksSafe();
      if (!request.isCurrent()) return;
      setTasks(list);
      setLoadingTasks(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTodayTasksSafe, renderAccountScope]);

  useFocusEffect(
    useCallback(() => {
      setLoadingTasks((prev) => (tasksLengthRef.current === 0 ? true : prev));
      refreshTasksAndProgress();
    }, [refreshTasksAndProgress]),
  );

  // Внешний "переход фокуса" (или любое другое событие типа
  // daily_task_reward_claimed) без предшествующего ре-рендера компонента —
  // единственный честный способ воспроизвести устаревшее замыкание
  // refreshTasksAndProgress: rerender() из RTL сам пересчитывает тело
  // компонента (и потому renderAccountScope), так что через rerender() баг
  // не проявляется — а в реальном приложении такого пересчёта не происходит,
  // если ничто не подписано на смену поколения аккаунта.
  useEffect(() => {
    const sub = externalRefreshBus.subscribe(() => { refreshTasksAndProgress(); });
    return () => sub.remove();
  }, [externalRefreshBus, refreshTasksAndProgress]);

  const [bumpTick, setBumpTick] = useState(0);
  useEffect(() => {
    if (!withGenerationSubscriptionFix) return () => {};
    const sub = stub.subscribe((token) => {
      if (token.phase !== 'active') return;
      setBumpTick((v) => v + 1);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withGenerationSubscriptionFix]);
  const bumpTickRef = useRef(bumpTick);
  useEffect(() => {
    if (bumpTickRef.current === bumpTick) return;
    bumpTickRef.current = bumpTick;
    refreshTasksAndProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bumpTick]);

  const visibleLoadingTasks = loadingTasks;
  return (
    <View>
      {visibleLoadingTasks && tasks.length === 0 && <Text testID="skeleton">skeleton</Text>}
      {!visibleLoadingTasks && tasks.length > 0 && <Text testID="task-list">{tasks.length} tasks</Text>}
    </View>
  );
}

function makeRefreshBus() {
  const listeners = new Set<() => void>();
  return {
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return { remove: () => listeners.delete(fn) };
    },
    fire: () => listeners.forEach((fn) => fn()),
  };
}

test('without generation-change subscription, a stale external refresh after an account switch leaves the skeleton stuck forever', async () => {
  const stub = makeAccountGenerationStub('uid_a');
  const refreshBus = makeRefreshBus();
  let resolveFirstFetch: (value: DailyTask[]) => void = () => {};
  const getTodayTasksSafe = jest.fn(() => new Promise<DailyTask[]>((resolve) => { resolveFirstFetch = resolve; }));

  const view = await render(
    <DailyTasksScreenHarness
      stub={stub}
      getTodayTasksSafe={getTodayTasksSafe}
      withGenerationSubscriptionFix={false}
      externalRefreshBus={refreshBus}
    />,
  );
  // Первый фетч (uid_a) ещё в полёте — tasks.length всё ещё 0, скелетон виден.
  expect(view.queryByTestId('skeleton')).not.toBeNull();

  // Аккаунт сменился (вход/merge/restore) ПОКА первый фетч ещё летит. Без
  // подписки на смену поколения НИЧТО не заставляет компонент перерендериться
  // — его renderAccountScope в замыканиях всё ещё uid_a, хотя реальный текущий
  // аккаунт уже uid_b.
  stub.beginTransition();
  stub.settleNewAccount('uid_b');

  // Внешнее событие (напр. daily_task_reward_claimed) вызывает
  // refreshTasksAndProgress БЕЗ предшествующего ре-рендера компонента — эта
  // ссылка на функцию всё ещё держит устаревший renderAccountScope=uid_a.
  await act(async () => {
    refreshBus.fire();
    await Promise.resolve();
    await Promise.resolve();
  });

  // Баг: refreshTasksAndProgress увидел captureAccountGeneration()=uid_b !==
  // stale renderAccountScope=uid_a (замыкание не обновилось — компонент не
  // перерендеривался) и тихо return'ился ДО setLoadingTasks(true)/fetch. Первый
  // фетч (для uid_a) так и не резолвился (реалистично: сеть/RC оборвались
  // ровно на смене аккаунта) — tasks.length всё ещё 0, loadingTasks всё ещё
  // true от исходного useFocusEffect. Экран навсегда завис на скелетоне:
  // НИЧТО больше не вызывает refreshTasksAndProgress для uid_b.
  expect(view.queryByTestId('skeleton')).not.toBeNull();
  expect(view.queryByTestId('task-list')).toBeNull();
  expect(getTodayTasksSafe).toHaveBeenCalledTimes(1); // внешнее событие не дошло до fetch — return на scope-проверке

  // Досдаём первый (устаревший) фетч, чтобы не оставлять висящий промис.
  await act(async () => { resolveFirstFetch([{ id: 'a' }]); await Promise.resolve(); });
});

test('with generation-change subscription (the fix), the same stale-closure window still recovers', async () => {
  const stub = makeAccountGenerationStub('uid_a');
  const refreshBus = makeRefreshBus();
  let resolveFirstFetch: (value: DailyTask[]) => void = () => {};
  const listB: DailyTask[] = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
  const getTodayTasksSafe = jest.fn(() => new Promise<DailyTask[]>((resolve) => { resolveFirstFetch = resolve; }));

  const view = await render(
    <DailyTasksScreenHarness
      stub={stub}
      getTodayTasksSafe={getTodayTasksSafe}
      withGenerationSubscriptionFix
      externalRefreshBus={refreshBus}
    />,
  );
  expect(view.queryByTestId('skeleton')).not.toBeNull();

  // Тот же сценарий, что и в баг-тесте: смена аккаунта, затем внешнее событие
  // со stale-замыканием, ПОКА первый фетч для uid_a ещё летит. beginTransition/
  // settleNewAccount синхронно бампают accountGenerationBumpTick (setState) —
  // должны быть внутри act(), иначе React ругается на update вне act().
  getTodayTasksSafe.mockImplementation(() => Promise.resolve(listB));
  // Разница с баг-тестом: accountGenerationBumpTick синхронно бампается внутри
  // того же act() (settleNewAccount → подписка → setState) и форсирует
  // ре-рендер сам, независимо от фокуса/внешних событий — следующий отдельный
  // эффект (реагирующий на сам тик) вызывает уже ПЕРЕСОЗДАННЫЙ
  // refreshTasksAndProgress с актуальным renderAccountScope=uid_b. Внешнее
  // событие (refreshBus.fire()) по-прежнему тихо return'ится на stale-scope —
  // это ожидаемо и не мешает восстановлению через подписку.
  await act(async () => {
    stub.beginTransition();
    stub.settleNewAccount('uid_b');
    refreshBus.fire();
    await Promise.resolve();
    await Promise.resolve();
  });

  await act(async () => {
    resolveFirstFetch([{ id: 'a' }]); // устаревший фетч — request-currency его отбросит
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(view.queryByTestId('skeleton')).toBeNull();
  expect(view.getByTestId('task-list').props.children).toEqual([3, ' tasks']);
});
