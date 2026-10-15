// ═════════════════════════════════════════════════════════════════════
// render_cause_probe.ts — сколько раз компонент перерисовался и ПОЧЕМУ (R1, правило «оптимизация всегда»).
//
// зачем (координатор 15.10, «перерисовки Главной»): `usePerfR1Probe` считает коммиты корня за 3 с, но не говорит, ЧТО их вызвало. Здесь каждому рендеру ставится причина:
// какие из перечисленных значений (состояния, контексты, пропсы) изменились с прошлого рендера. Ничего не изменилось → `parent_or_unlisted`
// (родитель перерисовал, либо виновник — хук, которого нет в списке). Окно — 10 с от монтирования и 10 с от каждого возврата на вкладку (смена `windowKey`).
// Печатается по строке на рендер (не больше LINES_PER_WINDOW за окно) и сводка `renders_window` в конце окна. Значения НЕ печатаются — только имена ключей и числа.
// Только dev и не стор-релиз; в релизе хук — пустая функция: снимок задаётся ФУНКЦИЕЙ и не вызывается, ни хуков, ни таймеров, ни работы на рендер.
// ═════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';

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

function useRenderCauseImpl(tag: string, getSnapshot: () => RenderCauseSnapshot, windowKey: unknown, publishEpoch: boolean): void {
  const previousRef = useRef<RenderCauseSnapshot | null>(null);
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
