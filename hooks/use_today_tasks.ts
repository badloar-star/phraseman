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
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import type { Lang } from '../constants/i18n';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import { captureAccountGeneration } from '../app/account_generation';
import type { LearningLanguageTarget } from '../app/learning_language_contour';
import { isSpireTabEnabled, primeSpireTabFlag, useSpireTabEnabled } from '../app/spire_tab_flag';
import { isTodayTaskKindAvailableForTarget } from '../app/today_task_surface_filter';
import { loadSpireConfig } from '../app/spire_config_client';
import { getMistakePracticeHomeCounts } from '../app/mistake_practice_insights';
import { homeMistakesButtonState } from '../app/home_mistakes_pulse_model';
import { MISTAKE_STUDY_TARGETS, type MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import {
  TODAY_TASK_POOL,
  TODAY_TASK_RULES,
  createTodayTasksDay,
  todayLocalDayKey,
  type TodayTaskKindCore,
  type TodayTasksDayState,
} from '../modules/today-tasks/today_tasks_core';
import { peekTodayTasks, refreshTodayTasks, subscribeTodayTasks } from '../modules/today-tasks/today_tasks_store';
import { todayTasksToView } from '../modules/today-tasks/today_tasks_view';
import { getDevTodayTaskSpire, subscribeDevTodayTasks } from '../app/dev_today_tasks';

/**
 * Живая выполнимость типов, которую нельзя знать синхронно.
 * зачем («Дизайн» 01.10, прогон в эмуляторе): задание «Шпиль» выпадало при выключенном
 * config/spire_v1 («откроется чуть позже»), а «Ошибки 0/5» — при пустом журнале ошибок.
 * Оба — тупики: задание видно, а выполнить нельзя.
 */
export type TodayTaskLiveness = Readonly<{ spireLive?: boolean; mistakesReady?: number; mistakesActive?: number }>;

export function availableTodayTaskKinds(
  target: LearningLanguageTarget,
  spireEnabled: boolean,
  live: TodayTaskLiveness = {},
): TodayTaskKindCore[] {
  return TODAY_TASK_POOL.filter((kind) => {
    if (kind === 'spire_steps' && (!spireEnabled || live.spireLive === false)) return false;
    // Ошибок для повтора должно хватать на цель задания, иначе задание не выполнить.
    if (kind === 'mistakes' && typeof live.mistakesReady === 'number'
      && live.mistakesReady < TODAY_TASK_RULES.mistakes.target) return false;
    // «Мои ошибки» открываются только с порога Главной (D: 10 активных) — иначе строка ведёт в закрытый раздел.
    if (kind === 'mistakes' && typeof live.mistakesActive === 'number'
      && homeMistakesButtonState(live.mistakesActive) !== 'ready') return false;
    return isTodayTaskKindAvailableForTarget(kind, target);
  });
}

/**
 * Закреплённые типы дня.
 * зачем (D144, владелец 01.10): вход в «Мои ошибки» на Главной — только строкой
 * «Сегодня». Если раздел открыт и ошибок на задание хватает — строка есть всегда.
 */
export function pinnedTodayTaskKinds(available: readonly TodayTaskKindCore[]): TodayTaskKindCore[] {
  return available.includes('mistakes') ? ['mistakes'] : [];
}

async function readTodayTaskLiveness(target: LearningLanguageTarget): Promise<TodayTaskLiveness> {
  const [spireLive, mistakeCounts] = await Promise.all([
    loadSpireConfig()
      .then((config) => config.enabled === true)
      .catch((error: unknown) => {
        console.warn(`[TODAY-TASKS] hook:spire_config_failed ${String(error)} → Шпиль не выдаём`);
        return false;
      }),
    (MISTAKE_STUDY_TARGETS as readonly string[]).includes(target)
      ? getMistakePracticeHomeCounts(target as MistakeStudyTarget).catch((error: unknown) => {
        console.warn(`[TODAY-TASKS] hook:mistakes_count_failed ${String(error)} → «Ошибки» не выдаём`);
        return { active: 0, ready: 0 };
      })
      : Promise.resolve({ active: 0, ready: 0 }),
  ]);
  return { spireLive, mistakesReady: mistakeCounts.ready, mistakesActive: mistakeCounts.active };
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
        .then(() => readTodayTaskLiveness(studyTarget))
        .then((live) => {
          const kinds = availableTodayTaskKinds(studyTarget, isSpireTabEnabled(), live);
          const pinned = pinnedTodayTaskKinds(kinds);
          console.log(`[TODAY-TASKS] hook:refresh ${JSON.stringify({ reason, studyTarget, kinds, pinned, live })}`);
          return refreshTodayTasks(kinds, pinned);
        })
        .then((next) => {
          // зачем (аудит Optimistic UI 17.10, п.5): ответ refresh мог затереть более свежее состояние из подписки — берём текущий снимок store
          const latest = peekTodayTasks() ?? next;
          if (!alive || !latest) {
            console.log(`[TODAY-TASKS] hook:refresh_dropped ${JSON.stringify({ reason, alive, hasState: Boolean(latest) })}`);
            return;
          }
          setState(latest);
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

  // зачем (координатор 13.10, «Шпиль → Пик»): dev `todaytask=spire` — задание Пика в ПОКАЗЕ «Сегодня» (копия состояния; хранилище не трогаем). В стор-сборке false.
  const devSpire = useSyncExternalStore(subscribeDevTodayTasks, getDevTodayTaskSpire, getDevTodayTaskSpire);
  const tasks = useMemo(() => {
    if (!devSpire || state.tasks.some((task) => task.kind === 'spire_steps') || state.tasks.length === 0) return todayTasksToView(state, lang);
    const spireTask = Object.freeze({
      kind: 'spire_steps' as const, units: 0, unitKeys: Object.freeze([] as string[]), done: false, doneAtMs: null,
      rewardCoins: TODAY_TASK_RULES.spire_steps.rewardCoins, rewardStatus: 'none' as const,
    });
    console.log(`[DEV-STATE] todaytask: показ «Сегодня» — ${state.tasks[state.tasks.length - 1]!.kind} → spire_steps (только показ)`); // guard-ok: dev-ветка, раз на смену набора
    return todayTasksToView({ ...state, tasks: [...state.tasks.slice(0, -1), spireTask] }, lang);
  }, [state, lang, devSpire]);
  return useMemo(() => ({ dayKey: state.dayKey, tasks }), [state.dayKey, tasks]);
}
