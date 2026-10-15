// ═════════════════════════════════════════════════════════════════════
// perf_r1_probe.ts — замер первого кадра и числа рендеров корня экрана (R1, правило «оптимизация всегда»).
//
// зачем (координатор 12.10, аудит скорости Главной / списка Уроков / хаба Карточек): сперва измерение, потом правка. Хук ставится одной строкой в
// корневой компонент экрана и пишет в Metro ровно две строки на заход:
//   [PERF-R1] {"screen":"home","stage":"first_frame","ms":…,"commits":…}   — от первого рендера корня до первого кадра после коммита
//   [PERF-R1] {"screen":"home","stage":"commits_3s","commits":…,"ms":…}   — сколько раз корень перерисовывался за первые 3 с
// Считаем КОММИТЫ (useEffect без зависимостей), а не вызовы render: в StrictMode разработки render зовётся дважды, коммит — один раз.
// Только dev-сборки и не стор-релиз: в релизе хук — пустышка (три ref-операции, ни таймеров, ни логов).
// ═════════════════════════════════════════════════════════════════════
import { createElement, Profiler, useEffect, useRef, type ProfilerOnRenderCallback, type ReactNode } from 'react';

import { IS_STORE_RELEASE } from './config';

const ENABLED = __DEV__ && !IS_STORE_RELEASE;
export const PERF_R1_WINDOW_MS = 3000;

type Probe = { t0: number; commits: number };

// ═════════════════════════════════════════════════════════════════════
// useMountTrace — кто и когда монтирует/размонтирует (R1, «двойной монтаж Главной», координатор 12.10: СПЕРВА ЛОГИ).
// Цифры Сверки: у Главной в 2 из 3 холодных стартов left_early (≈1 с, 2 коммита) и ВТОРОЙ экземпляр с первым кадром через 2,5 с, т.е. дерево Главной монтируется дважды.
// Метка ставится на нескольких ярусах (tabs_layout → tab_scaffold → home_host → probe:home); по тому, какие ярусы размонтировались вместе, видно, ЧТО именно пересоздало дерево:
//   • размонтировались только probe:home/home_host — виновник между каркасом табов и Главной (Suspense/Freeze/TabSlider);
//   • размонтировался и tab_scaffold — виновник в самом layout; • и tabs_layout — выше (стек/маршрут/ключ).
// inst — порядковый номер экземпляра метки в этом запуске; at — мс от загрузки модуля; render — мс от первого рендера до эффекта (разрыв рендер→коммит).
// Один экземпляр с mount→unmount→mount подряд за миллисекунды — это двойной вызов эффектов (StrictMode), а не повторный монтаж.
// Только dev и не стор-релиз, как и сам замер.
// ═════════════════════════════════════════════════════════════════════
const MODULE_T0 = Date.now();
const mountInstances = new Map<string, number>();

function useMountTraceImpl(tag: string, note?: string): void {
  const stateRef = useRef<{ inst: number; renderedAt: number } | null>(null);
  if (stateRef.current === null) {
    const inst = (mountInstances.get(tag) ?? 0) + 1;
    mountInstances.set(tag, inst);
    stateRef.current = { inst, renderedAt: Date.now() };
    console.log('[PERF-R1-MOUNT]', JSON.stringify({ tag, inst, event: 'render', at: Date.now() - MODULE_T0, ...(note ? { note } : {}) })); // guard-ok: трассировка двойного монтажа, только dev
  }
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return undefined;
    const mountedAt = Date.now();
    console.log('[PERF-R1-MOUNT]', JSON.stringify({ tag, inst: state.inst, event: 'mount', at: mountedAt - MODULE_T0, renderToEffectMs: mountedAt - state.renderedAt })); // guard-ok: трассировка двойного монтажа, только dev
    return () => {
      console.log('[PERF-R1-MOUNT]', JSON.stringify({ tag, inst: state.inst, event: 'unmount', at: Date.now() - MODULE_T0, aliveMs: Date.now() - mountedAt })); // guard-ok: трассировка двойного монтажа, только dev
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function usePerfR1ProbeImpl(screen: string): void {
  useMountTraceImpl(`probe:${screen}`);
  const probeRef = useRef<Probe | null>(null);
  if (probeRef.current === null) probeRef.current = { t0: Date.now(), commits: 0 };

  // каждый коммит корня (без зависимостей): растёт на ре-рендерах из-за состояния, контекстов и родителя
  useEffect(() => {
    if (ENABLED && probeRef.current) probeRef.current.commits += 1;
  });

  useEffect(() => {
    if (!ENABLED) return undefined;
    const probe = probeRef.current;
    if (!probe) return undefined;
    const raf = requestAnimationFrame(() => {
      console.log('[PERF-R1]', JSON.stringify({ screen, stage: 'first_frame', ms: Date.now() - probe.t0, commits: probe.commits })); // guard-ok: замер скорости, только dev
    });
    const timer = setTimeout(() => {
      console.log('[PERF-R1]', JSON.stringify({ screen, stage: 'commits_3s', commits: probe.commits, ms: Date.now() - probe.t0 })); // guard-ok: замер скорости, только dev
    }, PERF_R1_WINDOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      const alive = Date.now() - probe.t0;
      if (alive < PERF_R1_WINDOW_MS) {
        console.log('[PERF-R1]', JSON.stringify({ screen, stage: 'left_early', commits: probe.commits, ms: alive })); // guard-ok: экран закрыт раньше окна замера
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// зачем (владелец 22.09, «тело самого горячего экрана обязано быть чистым»): в релизе и стор-сборке хук — пустая функция БЕЗ единого React-хука и без работы
// на рендер. Выбор сделан один раз на уровне модуля, поэтому порядок хуков между рендерами не меняется.
export const usePerfR1Probe: (screen: string) => void = ENABLED ? usePerfR1ProbeImpl : () => undefined;

// ═════════════════════════════════════════════════════════════════════
// PerfR1Profile — сколько ЧИСТОГО времени рендера съедает экран (R1, «Уроки 3,6 с до первого кадра», координатор 12.10).
// first_frame меряет стенное время, в которое входит ожидание очереди JS-потока (фоновая работа Главной, прогрев других вкладок). Чтобы отделить работу самого экрана
// от ожидания, оборачиваем экран в React.Profiler: actualMs — реальное время рендера поддерева в этом коммите, baseMs — стоимость полного перерендера без мемоизации.
// Печатаются первые 8 коммитов каждого экрана за запуск (дальше — тишина). Только dev и не стор-релиз; в релизе — детей отдаёт как есть.
// ═════════════════════════════════════════════════════════════════════
const PROFILE_LOG_LIMIT = 8;
const profileLogged = new Map<string, number>();
const onProfileRender: ProfilerOnRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
  const n = (profileLogged.get(id) ?? 0) + 1;
  profileLogged.set(id, n);
  if (n > PROFILE_LOG_LIMIT) return;
  console.log('[PERF-R1-PROFILE]', JSON.stringify({ id, n, phase, actualMs: Math.round(actualDuration), baseMs: Math.round(baseDuration), startedAtMs: Math.round(startTime), commitAtMs: Math.round(commitTime) })); // guard-ok: замер скорости, только dev
};

/** Обёртка-замер; в релизе и стор-сборке — просто дети. */
export function PerfR1Profile({ id, children }: { id: string; children: ReactNode }): ReactNode {
  if (!ENABLED) return children;
  return createElement(Profiler, { id, onRender: onProfileRender }, children);
}

// ═════════════════════════════════════════════════════════════════════
// useNavActionTrace — КТО перемонтировал каркас табов (R1, координатор 12.10: СПЕРВА ЛОГИ).
// Журнал [PERF-R1-MOUNT] Сверки показал: через ≈1,5 с после первого монтажа появляется ВТОРОЙ экземпляр `(tabs)`-layout, рендерится ДО смерти первого и заменяет его —
// так ведёт себя замена маршрута в стеке (новый ключ маршрута), а не двойной вызов эффектов. Какой именно вызов навигации это сделал, видно только в момент отправки действия:
// слушаем `__unsafe_action__` корневого контейнера навигации и пишем тип действия, имя/параметры и верх стека вызова (JS-стек в момент dispatch указывает на вызывающий код),
// плюс `state` — ключи маршрутов верхнего стека. Только dev и не стор-релиз; ссылку на контейнер навигации передаёт вызывающий (useNavigationContainerRef) — сам модуль expo-router не импортирует.
// ═════════════════════════════════════════════════════════════════════
type NavTraceState = { routes?: Array<{ name?: string; key?: string; state?: NavTraceState }>; index?: number };

/** Вложенные маршруты строкой: `__root#a1b2c3[(tabs)#d4e5f6,index#789abc*]`, звёздочка — сфокусированный (зачем: в журнале Сверки был виден только корень, а стек (tabs)+index — нет). */
function describeNavState(state: NavTraceState | undefined): string {
  return (state?.routes ?? []).map((route, i) => {
    const inner = route.state ? `[${describeNavState(route.state)}]` : '';
    return `${route.name}#${String(route.key).slice(-6)}${i === state?.index ? '*' : ''}${inner}`;
  }).join(',');
}

type NavTraceRef = {
  current?: {
    addListener?: (type: string, cb: (e: { data?: { action?: { type?: string; payload?: Record<string, unknown> }; noop?: boolean } }) => void) => () => void;
    getRootState?: () => NavTraceState | undefined;
  } | null;
};

function useNavActionTraceImpl(navigationRef: NavTraceRef): void {
  useEffect(() => {
    let removeAction: (() => void) | null = null;
    let removeState: (() => void) | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const attach = (attempt: number) => {
      if (cancelled) return;
      try {
        const ref = navigationRef.current;
        if (!ref?.addListener) {
          if (attempt < 20) timer = setTimeout(() => attach(attempt + 1), 100);
          else console.log('[PERF-R1-NAV]', JSON.stringify({ event: 'no_navigation_ref' })); // guard-ok: трассировка навигации, только dev
          return;
        }
        removeAction = ref.addListener('__unsafe_action__', (e) => {
          const action = e?.data?.action;
          const payload = action?.payload ?? {};
          // зачем (координатор 15.10, r7p: NAVIGATE «(tabs)» дважды за 1–3 мс): кадр нёс адрес бандла и резался на 90 знаках —
          // имени вызывающего не было видно. Теперь кадр = имя@строка:столбец без адреса, глубина до 18 кадров.
          const stack = (new Error().stack ?? '').split('\n').slice(2, 20).map((line) => {
            const frame = line.trim().replace(/^at\s+/, '');
            const pos = frame.match(/:(\d+):(\d+)\)?$/);
            const fn = frame.replace(/\s*\(.*\)$/, '').slice(0, 48);
            return pos ? `${fn}@${pos[1]}:${pos[2]}` : fn;
          }).join(' | ');
          console.log('[PERF-R1-NAV]', JSON.stringify({ event: 'action', type: action?.type, name: payload.name, path: payload.path, noop: e?.data?.noop ?? null, atMs: Date.now() - MODULE_T0, stack })); // guard-ok: трассировка навигации, только dev
        });
        removeState = ref.addListener('state', () => {
          const routes = describeNavState(ref.getRootState?.());
          console.log('[PERF-R1-NAV]', JSON.stringify({ event: 'state', routes, atMs: Date.now() - MODULE_T0 })); // guard-ok: трассировка навигации, только dev
        });
        console.log('[PERF-R1-NAV]', JSON.stringify({ event: 'attached', attempt, atMs: Date.now() - MODULE_T0 })); // guard-ok: трассировка навигации, только dev
      } catch (error) {
        console.log('[PERF-R1-NAV]', JSON.stringify({ event: 'attach_failed', message: error instanceof Error ? error.message : String(error) })); // guard-ok: ошибка трассировки называет причину
      }
    };
    attach(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      removeAction?.();
      removeState?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ═════════════════════════════════════════════════════════════════════
// perfR1BodyStart / perfR1BodyMark — где внутри ТЕЛА тяжёлого экрана уходит время рендера (R1, «Уроки ≈2,4–2,6 с одним коммитом»; координатор 12.10: сперва измерение).
// [PERF-R1-PROFILE] показывает только суммарный actualMs поддерева. Метки в теле компонента дают накопленные мс от начала тела до каждой контрольной точки
// (разность соседних = стоимость участка хуков/вычислений, без детей): так видно, тяжела ли сама логика экрана или его дерево. Печатаются первые 2 рендера тега.
// Только dev и не стор-релиз; в релизе — пустые функции без хуков.
// ═════════════════════════════════════════════════════════════════════
const bodyRenderCount = new Map<string, number>();
const nowMs = (): number => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

/** Начало тела экрана: возвращает метку времени (в релизе — 0). */
export const perfR1BodyStart: (tag: string) => number = ENABLED
  ? (tag) => {
    bodyRenderCount.set(tag, (bodyRenderCount.get(tag) ?? 0) + 1);
    return nowMs();
  }
  : () => 0;

/** Контрольная точка тела: накопленные мс с начала (только первые 2 рендера тега). */
export const perfR1BodyMark: (tag: string, label: string, startedAt: number) => void = ENABLED
  ? (tag, label, startedAt) => {
    const render = bodyRenderCount.get(tag) ?? 0;
    if (render > 2) return;
    console.log('[PERF-R1-BODY]', JSON.stringify({ tag, render, label, sinceBodyStartMs: Math.round((nowMs() - startedAt) * 10) / 10 })); // guard-ok: замер скорости, только dev
  }
  : () => undefined;

/** Метка монтирования яруса (см. выше); в релизе — пустая функция без хуков. */
export const useMountTrace: (tag: string, note?: string) => void = ENABLED ? useMountTraceImpl : () => undefined;

/** Трассировка действий навигации (кто заменил маршрут); в релизе — пустая функция без хуков. */
export const useNavActionTrace: (navigationRef: NavTraceRef) => void = ENABLED ? useNavActionTraceImpl : () => undefined;
