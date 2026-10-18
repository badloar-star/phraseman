// ═════════════════════════════════════════════════════════════════════
// render_cause_probe.ts — сколько раз компонент перерисовался и ПОЧЕМУ (R1, правило «оптимизация всегда»).
//
// зачем (координатор 15.10, «перерисовки Главной»): `usePerfR1Probe` считает коммиты корня за 3 с, но не говорит, ЧТО их вызвало. Здесь каждому рендеру ставится причина:
// какие из перечисленных значений (состояния, контексты, пропсы) изменились с прошлого рендера. Ничего не изменилось → `parent_or_unlisted`
// (родитель перерисовал, либо виновник — хук, которого нет в списке). Окно — 10 с от монтирования и 10 с от каждого возврата на вкладку (смена `windowKey`).
// Печатается по строке на рендер (не больше LINES_PER_WINDOW за окно) и сводка `renders_window` в конце окна. Значения НЕ печатаются — только имена ключей и числа.
// Только dev и не стор-релиз; в релизе хук — пустая функция: снимок задаётся ФУНКЦИЕЙ и не вызывается, ни хуков, ни таймеров, ни работы на рендер.
// ═════════════════════════════════════════════════════════════════════
import * as React from 'react';
import { useEffect, useRef } from 'react';

import { noteBackStep } from './back_tap_probe';
import { IS_STORE_RELEASE } from './config';

export const RENDER_CAUSE_WINDOW_MS = 10_000;
export const RENDER_CAUSE_LINES_PER_WINDOW = 40;
export const RENDER_CAUSE_UNLISTED = 'parent_or_unlisted';

export type RenderCauseSnapshot = Readonly<Record<string, unknown>>;

// эпоха окон: корень экрана публикует её при открытии нового окна (возврат на вкладку), дети берут как windowKey и тоже открывают свежее окно
let windowEpoch = 0;
export const renderWindowEpoch = (): number => windowEpoch;

type WindowState = {
  label: string;
  startedAt: number;
  count: number;
  printed: number;
  byCause: Record<string, number>;
  timer: ReturnType<typeof setTimeout> | null;
};

/** Какие ключи изменились между двумя снимками (чистая функция — проверяется тестом). */
export function diffRenderCause(previous: RenderCauseSnapshot | null, next: RenderCauseSnapshot): string[] {
  if (previous === null) return ['mount'];
  const changed: string[] = [];
  for (const key of Object.keys(next)) {
    if (!Object.is(previous[key], next[key])) changed.push(key);
  }
  for (const key of Object.keys(previous)) {
    if (!(key in next)) changed.push(key);
  }
  return changed.length > 0 ? changed : [RENDER_CAUSE_UNLISTED];
}

// зачем (R137, координатор 18.10 06:12, замер Сверки 22dffd841 на 3fc7e4413): home_host_render не печатается (memo сработал — родитель Главную больше не тянет), но рендер №1 остался с причиной parent_or_unlisted:
// Главную перерисовывает КОНТЕКСТ, который читает она сама или её хуки, а в снимке его нет. Здесь, только в dev, из текущего волокна читается список прочитанных контекстов (React 19: owner.dependencies.firstContext → {context, memoizedValue, next})
// и сравнивается с прошлым рендером по Object.is: в журнал идут позиция, displayName (если задан) и ИМЕНА полей значения (не сами значения). Если внутренности React недоступны — одна строка с причиной, не немая ошибка.
type ContextDep = { context?: { displayName?: string }; memoizedValue?: unknown; next?: ContextDep | null };
type ContextDepsReading = Readonly<{ ok: true; deps: ReadonlyArray<Readonly<{ name: string; value: unknown }>> }> | Readonly<{ ok: false; reason: string }>;

function readCurrentFiberContexts(): ContextDepsReading {
  try {
    const internals = (React as unknown as Record<string, { A?: { getOwner?: () => { dependencies?: { firstContext?: ContextDep | null } | null } | null } | null }>)
      .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const owner = internals?.A?.getOwner?.() ?? null;
    if (!owner) return { ok: false, reason: 'owner_null' };
    const deps: Array<{ name: string; value: unknown }> = [];
    let dep: ContextDep | null | undefined = owner.dependencies?.firstContext;
    let guard = 0;
    while (dep && guard < 200) {
      deps.push({ name: dep.context?.displayName ?? `ctx#${deps.length}`, value: dep.memoizedValue });
      dep = dep.next;
      guard += 1;
    }
    return { ok: true, deps };
  } catch (error) {
    return { ok: false, reason: `threw:${error instanceof Error ? error.message : String(error)}` };
  }
}

const valueKeys = (value: unknown): string[] => (value !== null && typeof value === 'object' ? Object.keys(value as object).slice(0, 8) : [typeof value]);

function noteHomeContexts(previousRef: { current: ReadonlyArray<Readonly<{ name: string; value: unknown }>> | null }): void {
  const reading = readCurrentFiberContexts();
  if (!reading.ok) {
    noteBackStep('home_ctx', { unavailable: reading.reason });
    return;
  }
  const before = previousRef.current;
  const ctxChanged = reading.deps
    .map((dep, index) => ({ index, name: dep.name, dep, prev: before?.[index] }))
    .filter((entry) => before === null || before.length !== reading.deps.length || !entry.prev || entry.prev.name !== entry.dep.name || !Object.is(entry.prev.value, entry.dep.value))
    .slice(0, 6)
    .map((entry) => ({ index: entry.index, name: entry.name, keys: valueKeys(entry.dep.value) }));
  previousRef.current = reading.deps;
  noteBackStep('home_ctx', { total: reading.deps.length, changed: ctxChanged });
}

function useRenderCauseImpl(tag: string, getSnapshot: () => RenderCauseSnapshot, windowKey: unknown, publishEpoch: boolean): void {
  const previousRef = useRef<RenderCauseSnapshot | null>(null);
  const previousContextsRef = useRef<ReadonlyArray<Readonly<{ name: string; value: unknown }>> | null>(null);
  const windowRef = useRef<WindowState | null>(null);
  const windowKeyRef = useRef<unknown>(Symbol('unset'));
  const windowSeqRef = useRef(0);
  const pendingRef = useRef<string[]>([]);

  const closeWindow = (): void => {
    const win = windowRef.current;
    if (!win) return;
    if (win.timer) clearTimeout(win.timer);
    console.log('[HOME-RENDERS]', JSON.stringify({ tag, stage: 'renders_window', window: win.label, count: win.count, byCause: win.byCause, ms: Date.now() - win.startedAt })); // guard-ok: замер перерисовок, только dev
    windowRef.current = null;
  };

  // новое окно: первое монтирование или смена windowKey (вернулись на вкладку)
  if (!Object.is(windowKeyRef.current, windowKey)) {
    windowKeyRef.current = windowKey;
    windowSeqRef.current += 1;
    if (publishEpoch) windowEpoch += 1;
    const label = windowSeqRef.current === 1 ? 'cold' : `refocus#${windowSeqRef.current - 1}`;
    closeWindow();
    windowRef.current = { label, startedAt: Date.now(), count: 0, printed: 0, byCause: {}, timer: null };
  }

  const snapshot = getSnapshot();
  const changed = diffRenderCause(previousRef.current, snapshot);
  previousRef.current = snapshot;
  const win = windowRef.current;
  if (win) {
    win.count += 1;
    for (const key of changed) win.byCause[key] = (win.byCause[key] ?? 0) + 1;
    if (win.printed < RENDER_CAUSE_LINES_PER_WINDOW) {
      win.printed += 1;
      console.log('[HOME-RENDERS]', JSON.stringify({ tag, window: win.label, n: win.count, changed, atMs: Date.now() - win.startedAt })); // guard-ok: замер перерисовок, только dev
    }
  }
  pendingRef.current = changed;
  // зачем ([BACK-BTN] 18.10, координатор 03:06: Главная рисуется трижды за возврат — 110/75/55 мс): окно [HOME-RENDERS] на возврате не открывается (homeRuntimeActive не меняется), поэтому причины не было видно;
  // пока есть тап «назад», каждый рендер корня пишет, какие значения изменились
  if (tag === 'home') noteBackStep('home_cause', { changed: changed.slice(0, 8) });
  // зачем (R137): какой контекст сменился на этом рендере (шаг home_ctx; пишется только пока есть тап «назад»)
  if (tag === 'home') noteHomeContexts(previousContextsRef);

  // таймер окна ставим в эффекте (не в рендере): закрытие по времени, либо при размонтировании
  useEffect(() => {
    const current = windowRef.current;
    if (!current || current.timer) return undefined;
    current.timer = setTimeout(() => closeWindow(), RENDER_CAUSE_WINDOW_MS);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowKey]);
  useEffect(() => () => closeWindow(), []); // eslint-disable-line react-hooks/exhaustive-deps
}

const ENABLED = __DEV__ && !IS_STORE_RELEASE;

/**
 * Счётчик перерисовок с причиной. `getSnapshot` — функция, возвращающая значения, изменение которых надо отслеживать
 * (в релизе не вызывается). `windowKey` — любое значение; его смена открывает новое 10-секундное окно (например, `homeRuntimeActive`).
 * `publishEpoch` — корень экрана ставит true: каждое открытое им окно сдвигает общую эпоху (`renderWindowEpoch()`), дети берут её как windowKey.
 */
export const useRenderCause: (tag: string, getSnapshot: () => RenderCauseSnapshot, windowKey?: unknown, publishEpoch?: boolean) => void = ENABLED
  ? (tag, getSnapshot, windowKey, publishEpoch = false) => useRenderCauseImpl(tag, getSnapshot, windowKey, publishEpoch)
  : () => undefined;
