/**
 * [PEAK-PERF] — замер скорости Пика на устройстве: время кадра JS, длинные кадры, число перерисовок экрана.
 *
 * зачем (жалоба №3 docs/work/support/REPORTS_BATCH_2026-10-24.md «Пик: дальше 6–7 шага не уйти, сильно тормозит»; координатор
 * 24.10, правило владельца «сперва логи, потом починка»): причину ищем по фактам, а не догадкой. Пока экран Пика открыт,
 * requestAnimationFrame меряет промежутки между кадрами JS-потока; каждые WINDOW_MS в журнал уходит одна строка: этаж/ступень,
 * средний и худший кадр, сколько кадров длиннее 50 мс, сколько раз перерисовался экран. При закрытии — итог за всё время.
 * Ничего не меняет в поведении; одна строка раз в 5 с — дёшево. Префикс один на задачу — владелец вытащит цепочку поиском.
 */
import { useEffect, useRef } from 'react';
import { DebugLogger } from '../debug-logger';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст журнала — [SPIRE], метка задачи — в начале строки
const SPIRE = '[SPIRE]';
export const PEAK_PERF = '[PEAK-PERF]';
const WINDOW_MS = 5_000;
const LONG_FRAME_MS = 50;

export type PeakPerfWindow = Readonly<{ frames: number; avgMs: number; maxMs: number; longFrames: number }>;

/** Сводка окна по промежуткам между кадрами (чистая функция — её проверяет тест). */
export function summarizePeakFrames(gapsMs: readonly number[]): PeakPerfWindow {
  if (gapsMs.length === 0) return { frames: 0, avgMs: 0, maxMs: 0, longFrames: 0 };
  let sum = 0;
  let max = 0;
  let long = 0;
  for (const gap of gapsMs) {
    sum += gap;
    if (gap > max) max = gap;
    if (gap > LONG_FRAME_MS) long += 1;
  }
  return { frames: gapsMs.length, avgMs: Math.round((sum / gapsMs.length) * 10) / 10, maxMs: Math.round(max), longFrames: long };
}

/** Замер одного экрана Пика: area — «home» / «step» / «tower», where — этаж и ступень для строки журнала. */
export function usePeakPerfProbe(area: string, where: string): void {
  const rendersRef = useRef(0);
  rendersRef.current += 1;
  const whereRef = useRef(where);
  whereRef.current = where;

  useEffect(() => {
    let raf: number | null = null;
    let last = 0;
    let gaps: number[] = [];
    let windowStart = Date.now();
    let rendersAtWindow = rendersRef.current;
    const mountedAt = windowStart;
    const all = { frames: 0, long: 0, max: 0 };
    DebugLogger.info(SPIRE, `${PEAK_PERF} ${area}: открыт ${whereRef.current} рендеров=${rendersRef.current}`);
    const onFrame = (ts: number) => {
      if (last > 0) gaps.push(ts - last);
      last = ts;
      const now = Date.now();
      if (now - windowStart >= WINDOW_MS) {
        const w = summarizePeakFrames(gaps);
        all.frames += w.frames;
        all.long += w.longFrames;
        all.max = Math.max(all.max, w.maxMs);
        DebugLogger.info(SPIRE, `${PEAK_PERF} ${area}: ${whereRef.current} кадров=${w.frames} средний=${w.avgMs}мс худший=${w.maxMs}мс длинных(>${LONG_FRAME_MS})=${w.longFrames} рендеров за окно=${rendersRef.current - rendersAtWindow}`);
        gaps = [];
        windowStart = now;
        rendersAtWindow = rendersRef.current;
      }
      raf = requestAnimationFrame(onFrame);
    };
    raf = requestAnimationFrame(onFrame);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      DebugLogger.info(SPIRE, `${PEAK_PERF} ${area}: закрыт ${whereRef.current} за ${Math.round((Date.now() - mountedAt) / 1000)}с кадров=${all.frames} длинных=${all.long} худший=${all.max}мс рендеров всего=${rendersRef.current}`);
    };
  }, [area]);
}

/** Замер синхронного куска работы (поиск верного ответа и т. п.): возвращает результат, в журнал — сколько занял. */
export function measurePeakWork<T>(label: string, work: () => T): T {
  const started = Date.now();
  const result = work();
  const ms = Date.now() - started;
  DebugLogger.info(SPIRE, `${PEAK_PERF} ${label}: ${ms}мс${ms > LONG_FRAME_MS ? ' — ДОЛГО, кадр стоит' : ''}`);
  return result;
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
