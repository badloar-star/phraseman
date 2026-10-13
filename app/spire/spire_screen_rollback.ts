// ═══════════════════════════════════════════════════════════════════════════
// spire_screen_rollback.ts — откат маркера на ЭКРАНЕ Шпиля по отказу сервера.
//
// зачем (решение владельца 13.10, журнал п.86): сервер отверг пройденную ступень → маркер возвращается на честное место.
// На диске откат уже сделала досылка (report_queue.spireApplyFlushResponse); здесь та же арифметика применяется к ТЕКУЩЕЙ неделе экрана,
// а не подменяет её снимком с диска: ступень, пройденная за время запроса, остаётся. Решение вынесено из use_spire_game.ts, чтобы хук
// не рос (контракт «каждый файл ≤ 400 строк») и чтобы каждое ветвление писало причину в журнал [SPIRE-REJECT] (сперва логи).
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { SpireWeekLocal } from '../../modules/spire/report_queue';
import { spireRollbackSteps } from '../../modules/spire/report_queue';
import type { SpireFlushOutcome } from '../../modules/spire/report_store';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import type { SpireStepOutcome } from './use_spire_game';

const LOG = '[SPIRE-REJECT]';

/**
 * Новая неделя экрана после отката или null, если откатывать нечего (причина — в журнале).
 * `rolledIds` — какие отвергнутые строки экран уже откатывал: «присоединившиеся» вызовы досылки получают один и тот же исход,
 * второй раз откатывать нельзя. Функция сама дописывает id в множество.
 */
export function spireScreenRollback(
  out: SpireFlushOutcome,
  cur: SpireWeekLocal | null,
  rolledIds: Set<string>,
): SpireWeekLocal | null {
  const rb = out.rollback;
  if (!rb) return null;
  const ids = rb.reports.map((r) => r.reportId);
  if (!cur) {
    DebugLogger.warn(LOG, `screen: откат ${ids.join(',')} пропущен — на экране нет недели (источник=исход досылки)`);
    return null;
  }
  if (ids.some((id) => rolledIds.has(id))) {
    DebugLogger.info(LOG, `screen: откат ${ids.join(',')} уже применён раньше — второй раз не откатываем`);
    return null;
  }
  if (rb.reports[0]?.weekKey !== cur.weekKey) {
    DebugLogger.warn(LOG, `screen: откат ${ids.join(',')} пропущен — неделя строки ${rb.reports[0]?.weekKey} ≠ недели экрана ${cur.weekKey}`);
    return null;
  }
  ids.forEach((id) => rolledIds.add(id));
  // reachedAtMs диска годится, только если экран не ушёл дальше диска (иначе последняя ступень экрана остаётся «последней»).
  const reachedHint = out.local && cur.stepsCleared - rb.steps === out.local.stepsCleared ? out.local.reachedAtMs : null;
  const next = spireRollbackSteps(cur, { steps: rb.steps, durationMs: rb.durationMs, reachedAtMs: reachedHint });
  DebugLogger.warn(LOG, `screen: откат ${ids.join(',')} — маркер экрана до: этаж=${cur.floor} ступень=${cur.stepInFloor} пройдено=${cur.stepsCleared} | после: этаж=${next.floor} ступень=${next.stepInFloor} пройдено=${next.stepsCleared} | на диске после отката: пройдено=${out.local?.stepsCleared ?? '-'} | источник=исход досылки`);
  return next === cur ? null : next;
}

/**
 * Состояние и применение отката для useSpireGame. rejectNotice — только память экрана (не durable-очередь «показать потом»);
 * гасится на новом старте ступени и смене языка (setRejectNotice(false) снаружи).
 */
export function useSpireRejectRollback(input: Readonly<{
  weekRef: MutableRefObject<SpireWeekLocal | null>;
  setWeek: (week: SpireWeekLocal | null) => void;
  setOutcome: Dispatch<SetStateAction<SpireStepOutcome | null>>;
}>) {
  const { weekRef, setWeek, setOutcome } = input;
  const [rejectNotice, setRejectNotice] = useState(false);
  const rolledIdsRef = useRef<Set<string>>(new Set());
  const applyRollback = useCallback((out: SpireFlushOutcome): boolean => {
    const next = spireScreenRollback(out, weekRef.current, rolledIdsRef.current);
    if (!next) return false;
    const ids = out.rollback?.reports.map((r) => r.reportId) ?? [];
    DebugLogger.info('[SPIRE]', `game: показываем строку про отказ сервера (откатили ${out.rollback?.steps ?? 0} ступ.), панель итога ${ids.join(',')} убираем`); // зачем: общий префикс Шпиля для сквозного поиска, детали — под [SPIRE-REJECT]
    animateNextLayoutTransition(); // зачем: плашка встаёт над башней, маркер едет вниз — плавно
    weekRef.current = next;
    setWeek(next);
    setRejectNotice(true);
    // Панель итога той самой ступени уже не права («пройдена») — убираем, чтобы она не спорила со строкой.
    setOutcome((cur) => (cur && ids.includes(cur.report.reportId) ? null : cur));
    return true;
  }, [weekRef, setWeek, setOutcome]);
  return { rejectNotice, setRejectNotice, applyRollback };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
