// зачем (эталон today-scene-concepts.html, TS = пять состояний; координатор 22.10, «Сверка»): моки для dev-входа /dev_today_scene_preview —
// ничего не читается из сети и не пишется; состояние выбирает НАСТОЯЩАЯ pickTodaySceneState по этому входу.
import type { TodayTask } from '../home_v2_types';
import type { TodaySceneInput } from './today_scene_state';

export const TODAY_SCENE_PREVIEW_STATES = ['morning', 'day', 'eve', 'done', 'video'] as const;
export type TodayScenePreviewState = typeof TODAY_SCENE_PREVIEW_STATES[number];

export function isTodayScenePreviewState(value: unknown): value is TodayScenePreviewState {
  return typeof value === 'string' && (TODAY_SCENE_PREVIEW_STATES as readonly string[]).includes(value);
}

type Row = Readonly<{ kind: TodayTask['kind']; title: string; subtitle?: string; progress: number; target: number; route: string }>;
const LESSON = (progress: number): Row => ({ kind: 'lesson', title: 'Пройти урок', progress, target: 1, route: '/(tabs)/lessons' });
const DIALOG = (progress: number): Row => ({ kind: 'dialog', title: 'Потренировать диалог', progress, target: 1, route: '/(tabs)/dialogs' });
const VIDEO = (progress: number): Row => ({ kind: 'video', title: 'Посмотреть видео', progress, target: 10, route: '/(tabs)/videos' });
const CARDS = (progress: number): Row => ({ kind: 'cards', title: 'Повторить карточки', subtitle: 'Не менее 10 слов', progress, target: 10, route: '/(tabs)/flashcards' });

const SETUP: Readonly<Record<TodayScenePreviewState, Readonly<{ rows: readonly Row[]; hour: number; streakDays: number; dayCounted: boolean }>>> = {
  morning: { rows: [LESSON(0), DIALOG(0), CARDS(0)], hour: 9, streakDays: 5, dayCounted: false },
  day: { rows: [LESSON(1), DIALOG(0), CARDS(6)], hour: 14, streakDays: 5, dayCounted: true },
  eve: { rows: [LESSON(0), DIALOG(0), CARDS(0)], hour: 21, streakDays: 5, dayCounted: false },
  done: { rows: [LESSON(1), DIALOG(1), CARDS(10)], hour: 19, streakDays: 5, dayCounted: true },
  video: { rows: [LESSON(1), VIDEO(4), CARDS(6)], hour: 16, streakDays: 5, dayCounted: true },
};

export function todayScenePreviewTasks(state: TodayScenePreviewState): TodayTask[] {
  return SETUP[state].rows.map((row, index) => ({
    id: `preview-${state}-${index}`, kind: row.kind, title: row.title, subtitle: row.subtitle,
    progress: row.progress, target: row.target, done: row.progress >= row.target, rewardCoins: 0, route: row.route,
  }));
}

export function todayScenePreviewInput(state: TodayScenePreviewState): TodaySceneInput {
  const setup = SETUP[state];
  return {
    tasks: todayScenePreviewTasks(state).map((t) => ({ kind: t.kind, progress: t.progress, target: t.target, done: t.done })),
    hour: setup.hour, streakDays: setup.streakDays, dayCounted: setup.dayCounted,
  };
}

/** Минуты до полуночи для надписи вечера в превью: 2 ч 20 мин, как в эталоне. */
export const TODAY_SCENE_PREVIEW_MINUTES_TO_MIDNIGHT = 140;
