/**
 * Языки курса, для которых ведётся журнал ошибок.
 *
 * зачем (22.09): здесь стояло `'en' | 'fr'` — снимок двухъязычной эпохи. Языков
 * давно четыре (`LEARNING_LANGUAGE_TARGETS` в app/learning_language_contour.ts),
 * и испанский реально предлагается человеку при выборе. Из-за узкого типа
 * по коду расплодились фолбэки `studyTarget === 'fr' ? 'fr' : 'en'`, которые
 * молча писали ИСПАНСКИЕ ошибки в АНГЛИЙСКИЙ журнал, а валидатор
 * (mistake_practice_cloud_merge) объявлял журнал на es/de испорченным целиком.
 *
 * Список продублирован здесь намеренно: `modules/` не импортирует из `app/`
 * (граница слоёв), а тянуть сюда экранный модуль ради четырёх строк — хуже,
 * чем держать копию под сторожем. Расхождение ловит
 * mistake_study_target_languages_contract.test.ts.
 */
// зачем D130: итальянский — пятый язык обучения (карточки копят ошибки и на нём).
export const MISTAKE_STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;

export type MistakeStudyTarget = (typeof MISTAKE_STUDY_TARGETS)[number];

export function isMistakeStudyTargetValue(value: unknown): value is MistakeStudyTarget {
  return typeof value === 'string'
    && (MISTAKE_STUDY_TARGETS as readonly string[]).includes(value);
}

/**
 * Приводит цель обучения к языку журнала ошибок.
 *
 * зачем (22.09): по экранам было рассыпано `studyTarget === 'fr' ? 'fr' : 'en'` —
 * одиннадцать копий одной подмены. Испанский и немецкий молча становились
 * английским, поэтому человек на испанском видел ЧУЖИЕ ошибки, а его
 * собственные уходили в английский журнал. Неизвестный язык по-прежнему даёт
 * 'en' (иначе экран остался бы без данных вовсе), но известный сохраняется.
 */
export function normalizeMistakeStudyTarget(value: unknown): MistakeStudyTarget {
  return isMistakeStudyTargetValue(value) ? value : 'en';
}

export type MistakeFacet =
  | 'meaning'
  | 'form'
  | 'word_order'
  | 'missing_token'
  | 'listening'
  | 'pronunciation';

export type MistakeSourceKind =
  | 'lesson_phrase'
  | 'lesson_word'
  | 'irregular_verb'
  | 'flashcard'
  | 'diagnostic_test'
  | 'level_exam'
  | 'exam'
  | 'learning_v2'
  | 'diagnosis_coach'
  | 'voice_review'
  // зачем (владелец 13.10): поправки «было → стало» из итога диалога (app/dialogue_v2_mistake_capture.ts).
  | 'dialogue';

export interface MistakeContentRef {
  readonly sourceKind: MistakeSourceKind;
  readonly sourceId: string;
  readonly canonicalTarget: string;
  readonly sourceMeaning?: string;
  /**
   * Текст задания как его видел ученик — с пропуском `___` (2026-09-21).
   *
   * зачем: без него задание из теста нельзя решить. Вопрос «She usually drinks
   * coffee, but today she ___ tea.» доходил до «Моих ошибок» одним лишь
   * переводом («Обычно она пьёт кофе, но сегодня пьёт чай»), потому что поля
   * под саму фразу в журнале не было. Перевод звучит как простое настоящее,
   * верным же считается `is drinking`, а слова `today` — единственной зацепки
   * для Continuous — на экране не оставалось. Выбрать правильный вариант было
   * физически невозможно, и человек терял жизнь на неразрешимом задании.
   *
   * Показывается ВМЕСТО перевода, перевод уходит подсказкой ниже
   * (см. buildMistakeExercise). Пустая строка = поля нет, ведём себя как раньше.
   *
   * ⚠️ В отпечаток ошибки (buildMistakeIdentity) НЕ входит: у одной и той же
   * ошибки формулировка задания может отличаться (разные источники, локали),
   * а склеиваться повторы обязаны по сути ошибки. См. identity.ts.
   *
   * Необязательное: старые записи журнала читаются без него как раньше,
   * миграции нет.
   */
  readonly sourcePrompt?: string;
  readonly lessonId?: string;
  readonly audioRef?: string;
  readonly tokens?: readonly string[];
  readonly distractors?: readonly string[];
}

/** Предел длины ответа ученика в записи ошибки (клиент и сервер), см. MistakeFacetRef.given. */
export const MISTAKE_GIVEN_MAX_CHARS = 200;

export interface MistakeFacetRef {
  readonly kind: MistakeFacet;
  readonly tokenIndex?: number;
  readonly expected?: string;
  /**
   * Что ответил ученик (аудит 2026-09-21, одобрено владельцем).
   *
   * зачем: разбор ошибок после занятия обязан показать «ты написал X → надо Y».
   * Правильный ответ в журнале был всегда (content.canonicalTarget), ответа
   * ученика — не было, поэтому строка «ты написал» физически не строилась.
   *
   * ⚠️ В отпечаток ошибки (buildMistakeIdentity) это поле НЕ входит и входить
   * не должно: иначе одна и та же ошибка с разными опечатками превратилась бы
   * в разные записи, и повторы перестали бы склеиваться. Отпечаток считается
   * по явному списку полей — см. identity.ts, contentFingerprint.
   *
   * Необязательное: старые записи журнала читаются без него как раньше,
   * миграции нет.
   *
   * ⚠️ Хранение (исправлено 04.10, решение координатора — вариант А): поле живёт в событии журнала и
   * СИНХРОНИЗИРУЕТСЯ в облако вместе с ним (users/{uid}/progress_events через mistakePracticeEventSync),
   * чтобы «Ваш ответ» был виден на любом устройстве. Удаляется вместе с аккаунтом (рекурсивно с users/{uid}).
   * Длина — не больше MISTAKE_GIVEN_MAX_CHARS (200): режет клиент при записи и сервер при приёме.
   */
  readonly given?: string;
}

export interface MistakeIdentityInput {
  readonly studyTarget: MistakeStudyTarget;
  readonly content: MistakeContentRef;
  readonly facet: MistakeFacetRef;
}

export type MistakeIdentityFailureReason =
  | 'missing_source_id'
  | 'missing_canonical_target'
  | 'invalid_facet';

export type MistakeIdentityResult =
  | Readonly<{
      kind: 'capturable';
      mistakeId: string;
      canonicalIdentity: string;
      contentFingerprint: string;
    }>
  | Readonly<{
      kind: 'not_capturable';
      reason: MistakeIdentityFailureReason;
    }>;

export type MistakeEventType =
  | 'captured'
  | 'hint_used'
  | 'practice_answered'
  | 'hidden'
  | 'restored'
  | 'content_unavailable'
  | 'correction_rewarded';

export interface MistakeEvent {
  readonly eventId: string;
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly type: MistakeEventType;
  readonly occurredAtMs: number;
  readonly studyTarget: MistakeStudyTarget;
  readonly payload: Readonly<Record<string, unknown>>;
}
