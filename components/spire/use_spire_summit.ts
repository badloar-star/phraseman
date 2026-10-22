// ═══════════════════════════════════════════════════════════════════════════
// use_spire_summit.ts — вершина недели на экране Пика: взята ли и какую ступень показывать на 15-м этаже.
//
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «16 — всё, это потолок, дальше нету никаких этажей» — после Стража-15 маркер уходит на 16-й (лестница
// считает дальше), а экран зажимал этаж до 15 и снова звал на 15-й («ступень 0 из 10» и «Играть»). Теперь вершина взята → док «Ты на
// вершине недели» без кнопки, 15-й этаж показан пройденным целиком, окна позиций не зовут играть; до новой недели так и остаётся.
// Журнал [SPIRE-SUMMIT] — одна строка на смену этажа или вершины: сырой этаж, откуда неделя, что показано.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react';

import { spireSummitReached, type SpireWeekLocal } from '../../modules/spire/report_queue';
import { SPIRE_FLOOR_COUNT, spireCurrentWeekKey, spireStepsIn } from './spire_tower_model';

export type SpireSummitView = Readonly<{ summit: boolean; stepInFloor: number | null }>;

/** Чистое решение: вершина — только у идущей недели (прошлая неделя на 16-м — не вершина: новая начинается с 1-го); на вершине
 *  15-й этаж показан пройденным целиком. */
export function spireSummitView(week: SpireWeekLocal | null, nowMs: number): SpireSummitView {
  const current = week !== null && week.weekKey === spireCurrentWeekKey(nowMs) ? week : null;
  const summit = spireSummitReached(current);
  return { summit, stepInFloor: week === null ? null : summit ? spireStepsIn(SPIRE_FLOOR_COUNT) : week.stepInFloor };
}

export function useSpireSummit(week: SpireWeekLocal | null, shownFloor: number | null, source: 'dev-preview' | 'local_week'): SpireSummitView {
  const view = spireSummitView(week, Date.now());
  useEffect(() => {
    console.log('[SPIRE-SUMMIT] home', JSON.stringify({ source, weekKey: week?.weekKey ?? null, rawFloor: week?.floor ?? null, stepInFloor: week?.stepInFloor ?? null, stepsCleared: week?.stepsCleared ?? null, shownFloor, summit: view.summit, shownStep: view.stepInFloor })); // guard-ok: одна строка на смену этажа или вершины
  }, [source, week?.weekKey, week?.floor, week?.stepInFloor, week?.stepsCleared, shownFloor, view.summit, view.stepInFloor]);
  return view;
}
