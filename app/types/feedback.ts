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
  /** Основное объяснение (RU) */
  readonly generalRule?: string;
  /** Основное объяснение (UA) */
  readonly generalRule_UA?: string;
}

export type LessonErrorTrapsMap = Readonly<Record<number, readonly PhraseErrorTraps[]>>;

export interface ErrorWordInfo {
  readonly wordIndex: number;      // позиция слова в правильном ответе
  readonly userWord: string;       // что написал пользователь
  readonly correctWord: string;    // правильное слово
  readonly hint: string;           // подсказка для этого слова
}

export interface FeedbackResult {
  /** Одно объяснение (первое) — для обратной совместимости */
  readonly explanation: string;
  /** Все найденные подсказки (одна или несколько) */
  readonly explanations: readonly string[];
  readonly source: 'word_trap' | 'trap' | 'general_rule';
  readonly matchedTrigger?: string;
  /** Информация об ошибочных словах для визуальной привязки */
  readonly errorWords?: readonly ErrorWordInfo[];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
