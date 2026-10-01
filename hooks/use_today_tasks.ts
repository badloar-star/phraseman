// ═══════════════════════════════════════════════════════════════════════════
// use_today_tasks.ts — хук блока «Сегодня» (D49, контракт PM-259):
//   useTodayTasks(lang, studyTarget) → { dayKey, tasks: TodayTask[] }
//
// зачем: заменяет заглушку buildTodayTasksPlaceholder (нули, ничего не считала).
// Первый кадр — синхронно: снимок процесса (peek) или детерминированный набор дня
// с нулевым прогрессом (та же геометрия — 3 строки), диск/выплаты догоняют фоном.
// Обновляется сразу по событию активности (подписка на store), при возврате
// приложения на передний план и в локальную полночь — новый набор.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import type { Lang } from '../constants/i18n';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import { captureAccountGeneration } from '../app/account_generation';
import type { LearningLanguageTarget } from '../app/learning_language_contour';
import { isSpireTabEnabled, primeSpireTabFlag, useSpireTabEnabled } from '../app/spire_tab_flag';
import { isTodayTaskKindAvailableForTarget } from '../app/today_task_surface_filter';
import {
  TODAY_TASK_POOL,
  createTodayTasksDay,
  todayLocalDayKey,
  type TodayTaskKindCore,
  type TodayTasksDayState,
} from '../modules/today-tasks/today_tasks_core';
import { peekTodayTasks, refreshTodayTasks, subscribeTodayTasks } from '../modules/today-tasks/today_tasks_store';
import { todayTasksToView } from '../modules/today-tasks/today_tasks_view';

export function availableTodayTaskKinds(target: LearningLanguageTarget, spireEnabled: boolean): TodayTaskKindCore[] {
  return TODAY_TASK_POOL.filter((kind) => (
    (kind !== 'spire_steps' || spireEnabled) && isTodayTaskKindAvailableForTarget(kind, target)
  ));
}

function firstFrameState(target: LearningLanguageTarget): TodayTasksDayState {
  const peeked = peekTodayTasks();
  const dayKey = todayLocalDayKey(Date.now());
  if (peeked && peeked.dayKey === dayKey) return peeked;
  const token = captureAccountGeneration();
  const owner = token.phase === 'active' && token.stableId ? token.stableId : 'anon';
  return createTodayTasksDay(owner, dayKey, availableTodayTaskKinds(target, isSpireTabEnabled()));
}

function msUntilNextLocalMidnight(nowMs: number): number {
  const next = new Date(nowMs);
  next.setHours(24, 0, 1, 0);
  return Math.max(1_000, next.getTime() - nowMs);
}

export function useTodayTasks(lang: Lang, studyTarget: LearningLanguageTarget): Readonly<{ dayKey: string; tasks: TodayTask[] }> {
  const spireEnabled = useSpireTabEnabled();
  const [state, setState] = useState<TodayTasksDayState>(() => firstFrameState(studyTarget));

  useEffect(() => subscribeTodayTasks((next) => {
    if (next) setState(next);
  }), []);

  useEffect(() => {
    let alive = true;
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;
    const refresh = (reason: string) => {
      // Флаг Шпиля сначала догружается из кэша: иначе набор дня, созданный до
      // гидратации, никогда не включил бы Шпиль.
      void primeSpireTabFlag()
        .catch((error: unknown) => console.warn(`[TODAY-TASKS] hook:spire_flag_prime_failed ${String(error)}`))
        .then(() => {
          const kinds = availableTodayTaskKinds(studyTarget, isSpireTabEnabled());
          console.log(`[TODAY-TASKS] hook:refresh ${JSON.stringify({ reason, studyTarget, kinds })}`);
          return refreshTodayTasks(kinds);
        })
        .then((next) => {
          if (alive && next) setState(next);
        });
    };
    const armMidnight = () => {
      midnightTimer = setTimeout(() => {
        refresh('local_midnight');
        armMidnight();
      }, msUntilNextLocalMidnight(Date.now()));
    };
    refresh('mount_or_target_change');
    armMidnight();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh('foreground');
    });
    return () => {
      alive = false;
      if (midnightTimer) clearTimeout(midnightTimer);
      sub.remove();
    };
  }, [studyTarget, spireEnabled]);

  const tasks = useMemo(() => todayTasksToView(state, lang), [state, lang]);
  return useMemo(() => ({ dayKey: state.dayKey, tasks }), [state.dayKey, tasks]);
}
