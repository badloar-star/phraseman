// ═══════════════════════════════════════════════════════════════════════════
// today_scene_state.ts — какое из состояний «Сегодня» в стиле «Сцена» показать и что в нём главное.
//
// зачем (эталон docs/design/v2-app/today-scene-concepts.html, вариант A; координатор 22.10, владелец одобрил «отлично!»): экран заданий дня
// считается ТОЛЬКО из заданий дня на телефоне (modules/today-tasks) и часов — новых чтений базы нет. Чистая функция без React:
// проверяется юнит-тестом, экран только рисует её ответ. Правило вечера — то же, что у героя Главной (home_scene_state: после 20:00,
// серия от 1 дня, сегодня занятия не было), чтобы два экрана не спорили.
//   Утро     — ни одно задание не выполнено, до 20:00           → «0 из 3», кнопка на первое невыполненное
//   День     — часть выполнена                                  → «N из 3», кнопка на следующее
//   Вечер    — после 20:00, серия под угрозой                   → «До полуночи …», кнопка на следующее
//   Готово   — все задания выполнены                            → «3 из 3», кнопки нет (D09: без плашек и бонусов)
//   Видео    — не отдельное состояние, а вариант Дня/Утра: в языке нет диалогов, задание «Посмотреть видео» (N/10 минут)
// ═══════════════════════════════════════════════════════════════════════════
import type { TodayTaskKind } from '../home_v2_types';
import { HOME_SCENE_EVENING_HOUR } from '../scene/home_scene_state';

export const TODAY_SCENE_STATES = ['morning', 'day', 'evening', 'done'] as const;
export type TodaySceneState = typeof TODAY_SCENE_STATES[number];

export type TodaySceneTaskInput = Readonly<{ kind: TodayTaskKind; progress: number; target: number; done: boolean }>;

export type TodaySceneInput = Readonly<{
  tasks: readonly TodaySceneTaskInput[];
  /** Час по часам телефона, 0..23. */
  hour: number;
  /** Серия в днях, как в шапке. */
  streakDays: number;
  /** Сегодня день серии уже засчитан; null — ещё не известно (тогда «вечер» не включаем). */
  dayCounted: boolean | null;
}>;

export type TodaySceneDecision = Readonly<{
  state: TodaySceneState;
  doneCount: number;
  total: number;
  /** Индекс следующего невыполненного задания (кнопка сцены); null — всё выполнено. */
  nextIndex: number | null;
  /** Среди заданий есть «Посмотреть видео» (в языке нет диалогов) — заголовок кнопки и «N из 10 минут». */
  hasVideoTask: boolean;
  /** Что решило выбор — значения, а не голое true/false (журнал [TODAY-SCENE]). */
  reason: string;
}>;

function isDone(task: TodaySceneTaskInput): boolean {
  return task.done || (task.target > 0 && task.progress >= task.target);
}

export function pickTodaySceneState(input: TodaySceneInput): TodaySceneDecision {
  const total = input.tasks.length;
  const doneCount = input.tasks.filter(isDone).length;
  const nextIdx = input.tasks.findIndex((task) => !isDone(task));
  const nextIndex = nextIdx < 0 ? null : nextIdx;
  const hasVideoTask = input.tasks.some((task) => task.kind === 'video');
  const make = (state: TodaySceneState, reason: string): TodaySceneDecision =>
    Object.freeze({ state, doneCount, total, nextIndex, hasVideoTask, reason });
  if (total > 0 && nextIndex === null) return make('done', `doneCount=${doneCount}/${total}`);
  if (input.hour >= HOME_SCENE_EVENING_HOUR && input.streakDays >= 1 && input.dayCounted === false) {
    return make('evening', `hour=${input.hour} streakDays=${input.streakDays} dayCounted=false doneCount=${doneCount}/${total}`);
  }
  if (doneCount === 0) return make('morning', `doneCount=0/${total} hour=${input.hour} dayCounted=${String(input.dayCounted)}`);
  return make('day', `doneCount=${doneCount}/${total}`);
}
