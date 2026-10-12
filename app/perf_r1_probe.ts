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
import { useEffect, useRef } from 'react';

import { IS_STORE_RELEASE } from './config';

const ENABLED = __DEV__ && !IS_STORE_RELEASE;
export const PERF_R1_WINDOW_MS = 3000;

type Probe = { t0: number; commits: number };

function usePerfR1ProbeImpl(screen: string): void {
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
