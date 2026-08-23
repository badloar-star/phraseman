/**
 * Телеметрия Learning V2 — воронка курса без личности и содержания.
 *
 * зачем (аудит техдолга 22.08, Phase 12): в модуле не было ни одного события,
 * поэтому после релиза мы были бы слепы — не видно, где люди бросают занятие,
 * сколько оно длится и какие задания проваливаются.
 *
 * Построено по образцу `modules/arena/telemetry.ts`: чистые дескрипторы без
 * побочных эффектов, транспорт отдельно. Правила приватности такие же строгие,
 * как у Арены (их стережёт tests/product_analytics_event_catalog.test.ts):
 * никаких uid, ответов, текста заданий, баланса кошелька и точных таймлайнов —
 * только координаты курса, коды и грубые бакеты.
 */

export type LearningV2SessionKindCode =
  | 'words_then_phrases'
  | 'phrases'
  | 'voice'
  | 'recall'
  | 'checkpoint'
  | 'final_exam';

export type LearningV2ActivityFamilyCode =
  | 'phrase_builder'
  | 'listen_choose'
  | 'sound_contrast'
  | 'listen_build_dictation'
  | 'context_gap_grammar'
  | 'speed_match'
  | 'scripted_repeat_compare'
  | 'intro_check';

/** Где именно человек ушёл — код стадии, а не экранный путь. */
export type LearningV2StageCode = 'intro' | 'practice' | 'finale';

export type LearningV2DurationBucket =
  | 'under_1m'
  | '1_3m'
  | '3_10m'
  | '10m_plus';

export type LearningV2AttemptBucket = 'first_try' | 'second_try' | 'more_tries';

export type LearningV2TelemetryDescriptor = Readonly<{
  event:
    | 'learning_v2_session_start'
    | 'learning_v2_session_complete'
    | 'learning_v2_session_abandon'
    | 'learning_v2_task_result';
  params: Readonly<Record<string, string | number>>;
}>;

/** Грубый бакет вместо точной длительности: точный таймлайн человека не нужен. */
export const learningV2DurationBucket = (
  durationMs: number,
): LearningV2DurationBucket =>
  durationMs < 60_000
    ? 'under_1m'
    : durationMs < 180_000
      ? '1_3m'
      : durationMs < 600_000
        ? '3_10m'
        : '10m_plus';

export const learningV2AttemptBucket = (
  attempts: number,
): LearningV2AttemptBucket =>
  attempts <= 1 ? 'first_try' : attempts === 2 ? 'second_try' : 'more_tries';

const lessonOrdinal = (value: number): number =>
  Math.max(1, Math.min(32, Math.trunc(value)));
const sessionOrdinal = (value: number): number =>
  Math.max(1, Math.min(56, Math.trunc(value)));

export const learningV2SessionStartEvent = (input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly sessionKind: LearningV2SessionKindCode;
  readonly studyTarget: string;
}): LearningV2TelemetryDescriptor => ({
  event: 'learning_v2_session_start',
  params: {
    lesson_ordinal: lessonOrdinal(input.lessonOrdinal),
    session_ordinal: sessionOrdinal(input.sessionOrdinal),
    session_kind: input.sessionKind,
    study_target: input.studyTarget,
    duration_bucket: 'under_1m',
  },
});

export const learningV2SessionCompleteEvent = (input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly sessionKind: LearningV2SessionKindCode;
  readonly studyTarget: string;
  readonly durationMs: number;
  /** Оценка занятия 0–3, НЕ баланс кошелька. */
  readonly starsEarned: number;
  readonly correctCount: number;
}): LearningV2TelemetryDescriptor => ({
  event: 'learning_v2_session_complete',
  params: {
    lesson_ordinal: lessonOrdinal(input.lessonOrdinal),
    session_ordinal: sessionOrdinal(input.sessionOrdinal),
    session_kind: input.sessionKind,
    study_target: input.studyTarget,
    duration_bucket: learningV2DurationBucket(input.durationMs),
    stars_earned: Math.max(0, Math.min(3, Math.trunc(input.starsEarned))),
    correct_count: Math.max(0, Math.min(99, Math.trunc(input.correctCount))),
  },
});

/** Главное событие для поиска обрывов: где именно человек закрыл занятие. */
export const learningV2SessionAbandonEvent = (input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly sessionKind: LearningV2SessionKindCode;
  readonly studyTarget: string;
  readonly durationMs: number;
  readonly stage: LearningV2StageCode;
}): LearningV2TelemetryDescriptor => ({
  event: 'learning_v2_session_abandon',
  params: {
    lesson_ordinal: lessonOrdinal(input.lessonOrdinal),
    session_ordinal: sessionOrdinal(input.sessionOrdinal),
    session_kind: input.sessionKind,
    study_target: input.studyTarget,
    duration_bucket: learningV2DurationBucket(input.durationMs),
    stage: input.stage,
  },
});

/** Какие задания валят людей. Ответ и текст задания сюда не попадают. */
export const learningV2TaskResultEvent = (input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly activityFamily: LearningV2ActivityFamilyCode;
  readonly outcome: 'correct' | 'wrong';
  readonly attempts: number;
}): LearningV2TelemetryDescriptor => ({
  event: 'learning_v2_task_result',
  params: {
    lesson_ordinal: lessonOrdinal(input.lessonOrdinal),
    session_ordinal: sessionOrdinal(input.sessionOrdinal),
    activity_family: input.activityFamily,
    outcome: input.outcome,
    attempt_bucket: learningV2AttemptBucket(input.attempts),
  },
});
