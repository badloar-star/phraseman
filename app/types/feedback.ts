export interface ErrorTrap {
  readonly trigger: readonly string[];
  readonly explanation: string;
  readonly lite?: string;
}

/** Подсказка привязана к конкретному слову фразы (0-based wordIndex) */
export interface WordTrap {
  readonly wordIndex: number;   // позиция слова в правильном ответе
  readonly hint: string;        // объяснение для этого слова
  readonly lite?: string;       // краткая версия для quiz-режима
}

export interface PhraseErrorTraps {
  readonly phraseIndex: number;
  /** Per-word подсказки — основная система */
  readonly wordTraps?: readonly WordTrap[];
  /** Устаревшие триггеры (fallback) */
  readonly traps: readonly ErrorTrap[];
  readonly generalRule?: string;
}

export type LessonErrorTrapsMap = Readonly<Record<number, readonly PhraseErrorTraps[]>>;

export interface FeedbackResult {
  /** Одно объяснение (первое) — для обратной совместимости */
  readonly explanation: string;
  /** Все найденные подсказки (одна или несколько) */
  readonly explanations: readonly string[];
  readonly source: 'word_trap' | 'trap' | 'general_rule';
  readonly matchedTrigger?: string;
}
