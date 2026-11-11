/**
 * Таблица «действие → навык → очки». Утверждена владельцем 11.11.2026 («Принять как есть», 27 строк).
 * Эталон — docs/design/v2-app/elevate-real4.js, массив PTS (страница elevate-skills.html, «Что качает что»).
 *
 * зачем: владелец — «надо определить точно, что будет какие навыки качать конкретно». Таблица одна на всё
 * приложение: экран итога, статистика и визитка считают очки только отсюда, иначе цифры разойдутся.
 */

export const SKILL_IDS = ['listening', 'speech', 'vocab', 'grammar', 'speed', 'social'] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** Навыки, которые можно подтянуть тренировкой. Владелец 11.11: «Подтянуть» предлагает только их. */
export const STUDY_SKILL_IDS: readonly SkillId[] = ['listening', 'speech', 'vocab', 'grammar', 'speed'];

/** Владелец 11.11: порог один на все игры на время — верный ответ быстрее трёх секунд. */
export const SKILL_FAST_ANSWER_MS = 3000;

export interface SkillPointRule {
  /** Навык строки; `null` — навык зависит от вида задания и приходит от вызывающего (ошибки, Пик). */
  readonly skill: SkillId | null;
  readonly points: number;
  /** Строка засчитывается только за верный ответ быстрее порога (правило 3 владельца). */
  readonly needsFastAnswer?: boolean;
  /** Сколько раз в день строка даёт очки (сердечки, комментарии). */
  readonly dailyCap?: number;
  /** Навыки, допустимые для строки с `skill: null`. */
  readonly allowedSkills?: readonly SkillId[];
}

export const SKILL_POINT_RULES = {
  lesson_phrase_first_try: { skill: 'grammar', points: 3 },
  lesson_new_word: { skill: 'vocab', points: 1 },
  theory_task: { skill: 'grammar', points: 2 },
  lesson_words_correct: { skill: 'vocab', points: 1 },
  verbs_prepositions_correct: { skill: 'grammar', points: 2 },
  exam_correct: { skill: 'grammar', points: 3 },
  mistake_step_done: { skill: null, points: 2, allowedSkills: ['grammar', 'vocab'] },
  blitz_correct: { skill: 'vocab', points: 1 },
  blitz_fast: { skill: 'speed', points: 1, needsFastAnswer: true },
  true_false_correct: { skill: 'vocab', points: 1 },
  recall_written: { skill: 'vocab', points: 2 },
  speaking_clean: { skill: 'speech', points: 3 },
  dialog_voice_reply: { skill: 'speech', points: 3 },
  dialog_understood_no_hint: { skill: 'listening', points: 2 },
  video_minute: { skill: 'listening', points: 1 },
  flow_correct: { skill: 'speed', points: 2, needsFastAnswer: true },
  flow_correct_high_tempo: { skill: 'speed', points: 3, needsFastAnswer: true },
  odd_word_sorting_correct: { skill: 'grammar', points: 2 },
  by_ear_correct: { skill: 'listening', points: 2 },
  memory_exact_word_correct: { skill: 'vocab', points: 2 },
  peak_task: { skill: null, points: 2, allowedSkills: ['listening', 'speech', 'vocab', 'grammar', 'speed'] },
  // Бонус за ступень порогу скорости не подчинён: в таблице владельца это отдельная строка без условия.
  peak_step_cleared: { skill: 'speed', points: 5 },
  social_heart_given: { skill: 'social', points: 1, dailyCap: 5 },
  social_comment: { skill: 'social', points: 2, dailyCap: 3 },
  social_pack_added_by_other: { skill: 'social', points: 5 },
  social_invited_friend_started: { skill: 'social', points: 20 },
  social_week_goal_together: { skill: 'social', points: 15 },
  social_peak_room_week_played: { skill: 'social', points: 10 },
} as const satisfies Record<string, SkillPointRule>;

export type SkillAction = keyof typeof SKILL_POINT_RULES;

export function isSkillAction(value: unknown): value is SkillAction {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SKILL_POINT_RULES, value);
}
