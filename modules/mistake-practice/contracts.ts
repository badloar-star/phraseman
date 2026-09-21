export type MistakeStudyTarget = 'en' | 'fr';

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
  | 'personal_plan'
  | 'diagnosis_coach'
  | 'voice_review';

export interface MistakeContentRef {
  readonly sourceKind: MistakeSourceKind;
  readonly sourceId: string;
  readonly canonicalTarget: string;
  readonly sourceMeaning?: string;
  readonly lessonId?: string;
  readonly audioRef?: string;
  readonly tokens?: readonly string[];
  readonly distractors?: readonly string[];
}

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
   * миграции нет. Хранится ЛОКАЛЬНО на устройстве, в Firestore не уходит.
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
