import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { act, render } from '@testing-library/react-native';

jest.unmock('react-native');

/**
 * зачем: воспроизводим РЕАЛЬНУЮ семантику expo-router useFocusEffect (см.
 * node_modules/expo-router/build/useFocusEffect.js, строка "if (navigation.isFocused())
 * { cleanup = callback(); }" внутри React.useEffect(..., [effect, navigation,
 * optionalNavigation])) — пока экран сфокусирован, смена ССЫЛКИ на переданный
 * callback (т.е. смена чего-то из его deps) синхронно перезапускает эффект, а
 * не только настоящий переход фокуса. Именно это свойство и породило баг в
 * app/daily_tasks_screen.tsx: setTasks() внутри refreshTasksAndProgress менял
 * tasks.length, а tasks.length раньше был в deps самого useFocusEffect — эффект
 * перезапускал сам себя второй раз ДО того, как первый вызов долетел до конца.
 */
function useFocusEffect(effect: () => void | (() => void)) {
  const cleanupRef = useRef<void | (() => void)>(undefined);
  useEffect(() => {
    cleanupRef.current = effect();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [effect]);
}

type DailyTask = { id: string };

let nextRequestId = 0;
/** зачем: тот же паттерн request-currency, что и isDailyTasksScreenRequestCurrent в daily_tasks_screen_cache.ts. */
function beginRequest(): { requestId: number; isCurrent: () => boolean } {
  nextRequestId += 1;
  const requestId = nextRequestId;
  return { requestId, isCurrent: () => requestId === nextRequestId };
}

/**
 * Минимальная модель ровно того фрагмента app/daily_tasks_screen.tsx, который
 * содержал баг: warm-кэш синхронно проверяется в начале refreshTasksAndProgress,
 * если его нет — БЕЗУСЛОВНЫЙ setLoadingTasks(true) (как в исходном коде до
 * фикса, строка `} else { setLoadingTasks(true); }`), затем асинхронный
 * getTodayTasksSafe наполняет tasks и снимает loading.
 */
function DailyTasksScreenLoadingHarness({
  getTodayTasksSafe,
  peekWarmCache,
  useBuggyDeps,
}: {
  getTodayTasksSafe: () => Promise<DailyTask[]>;
  /** имитирует peekDailyTasksScreenSnapshot: null пока ничего не закоммичено. */
  peekWarmCache: () => DailyTask[] | null;
  /** true воспроизводит ДОРЕФАКТОРИНГОВЫЙ код (tasks.length в deps useFocusEffect). */
  useBuggyDeps: boolean;
}) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const tasksLengthRef = useRef(tasks.length);
  tasksLengthRef.current = tasks.length;

  const refreshTasksAndProgress = useCallback(() => {
    const request = beginRequest();
    const warm = peekWarmCache();
    if (warm) {
      setTasks(warm);
      setLoadingTasks(false);
    } else {
      // зачем: это ТОЧНАЯ копия ветки `else { setLoadingTasks(true); }` из
      // daily_tasks_screen.tsx до фикса — она ничем не гардилась от staleness.
      setLoadingTasks(true);
    }
    (async () => {
      const list = await getTodayTasksSafe();
      if (!request.isCurrent()) return;
      setTasks(list);
      setLoadingTasks(false);
    })();
  }, [getTodayTasksSafe, peekWarmCache]);

  useFocusEffect(
    useCallback(() => {
      setLoadingTasks((prev) => ((useBuggyDeps ? tasks.length : tasksLengthRef.current) === 0 ? true : prev));
      refreshTasksAndProgress();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, useBuggyDeps ? [refreshTasksAndProgress, tasks.length] : [refreshTasksAndProgress]),
  );

  const visibleLoadingTasks = loadingTasks;
  return (
    <View>
      {visibleLoadingTasks && tasks.length === 0 && <Text testID="skeleton">skeleton</Text>}
      {!visibleLoadingTasks && tasks.length > 0 && <Text testID="task-list">{tasks.length} tasks</Text>}
    </View>
  );
}

test('fixed useFocusEffect (ref-based length check) settles on the real task list without re-arming the loading flag', async () => {
  const list: DailyTask[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  let resolveFirstFetch: (value: DailyTask[]) => void = () => {};
  const getTodayTasksSafe = jest
    .fn()
    .mockImplementationOnce(() => new Promise<DailyTask[]>((resolve) => { resolveFirstFetch = resolve; }))
    .mockImplementation(() => Promise.resolve(list));
  // зачем: warm-кэш появляется только ПОСЛЕ первого успешного fetch (как in-memory
  // Map в daily_tasks_screen_cache.ts — пуста до первого commitDailyTasksScreenSnapshot).
  let committed: DailyTask[] | null = null;
  const peekWarmCache = jest.fn(() => committed);

  const view = await render(
    <DailyTasksScreenLoadingHarness getTodayTasksSafe={getTodayTasksSafe} peekWarmCache={peekWarmCache} useBuggyDeps={false} />,
  );

  await act(async () => {
    committed = list;
    resolveFirstFetch(list);
    await Promise.resolve();
    await Promise.resolve();
  });

  // Экран не должен зависнуть между скелетоном и списком: карточки видны, скелетона нет.
  expect(view.queryByTestId('skeleton')).toBeNull();
  expect(view.getByTestId('task-list').props.children).toEqual([4, ' tasks']);
});

test('pre-fix useFocusEffect (tasks.length in deps) reproduces the empty gap: neither skeleton nor list renders', async () => {
  const list: DailyTask[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  // зачем: и первый, и ВТОРОЙ (само-спровоцированный) вызов refreshTasksAndProgress
  // держим "в полёте" — как реальный getTodayTasksSafe, который ждёт
  // AsyncStorage/Firestore и не резолвится в тот же тик. Это делает промежуточное
  // состояние гонки детерминированным для проверки, а не зависящим от количества
  // microtask-тиков до самоисцеления.
  const pending: Array<(value: DailyTask[]) => void> = [];
  const getTodayTasksSafe = jest.fn(() => new Promise<DailyTask[]>((resolve) => { pending.push(resolve); }));
  let committed: DailyTask[] | null = null;
  const peekWarmCache = jest.fn(() => committed);

  const view = await render(
    <DailyTasksScreenLoadingHarness getTodayTasksSafe={getTodayTasksSafe} peekWarmCache={peekWarmCache} useBuggyDeps />,
  );

  expect(pending).toHaveLength(1);
  // Резолвим ПЕРВЫЙ вызов: setTasks(4) коммитится, tasks.length 0 -> 4 синхронно
  // перезапускает useFocusEffect (deps включают tasks.length). Второй вызов
  // refreshTasksAndProgress видит warm=null (peekWarmCache ещё не обновлён) и
  // безусловно ставит loadingTasks=true (ветка `else { setLoadingTasks(true); }`)
  // поверх уже показанных 4 заданий — его собственный fetch намеренно ещё висит.
  await act(async () => {
    pending[0](list);
    await Promise.resolve();
  });

  expect(pending).toHaveLength(2);
  // Баг: ни скелетон (tasks.length!==0), ни список (loadingTasks===true) не
  // рендерятся — это тот самый пустой экран со скриншота владельца.
  expect(view.queryByTestId('skeleton')).toBeNull();
  expect(view.queryByTestId('task-list')).toBeNull();

  // Досдаём второй вызов, чтобы не оставлять висящий промис после теста.
  await act(async () => {
    pending[1](list);
    await Promise.resolve();
  });
});
