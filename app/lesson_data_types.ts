// Lesson Data Type Definitions

export interface LessonWord {
  text: string;           // The word
  correct: string;        // Same as text (for validation)
  distractors: string[];  // 5 specific distractors
  category?: string;      // 'pronoun', 'to-be', 'article', etc.
}

export interface LessonPhrase {
  id: string | number;
  english: string;
  /** Дополнительные правильные формулировки на английском (режим learnTarget=en). */
  alternatives?: string[];
  /** Легитимные альтернативы на испанском (режим learnTarget=es), та же норма региона. */
  alternativesEs?: string[];
  russian: string;
  ukrainian: string;
  /** Подсказка-перевод для локали es; до заполнения — в UI обычно fallback на russian */
  spanish?: string;
  /**
   * Токены целевой фразы (испанский при L2 es). Для уроков с двойным набором см. wordsEn.
   */
  words: LessonWord[];
  /**
   * Английские токены для режима learnTarget=en, когда `words` — испанская сборка (L2).
   */
  wordsEn?: LessonWord[];
  /** Копия названия урока из LESSON_DATA (добавляется в getLessonData) */
  lessonTitleRU?: string;
  lessonTitleUK?: string;
  /** То же для es (название урока в шапке/шаринге фразы) */
  lessonTitleES?: string;
}

/**
 * Тип блока определяет иконку, акцентный цвет и заголовок по умолчанию:
 * - 'why'      — мотивация: зачем эта тема (sparkles, accent)
 * - 'how'      — принцип построения фразы (construct, correct/green)
 * - 'tip'      — полезный нюанс / лайфхак (bulb, gold)
 * - 'trap'     — типичная ошибка / ловушка (warning, wrong)
 * - 'mechanic' — объяснение механики приложения (hand, accent) — обычно только для урока 1
 */
export type LessonIntroBlockKind = 'why' | 'how' | 'tip' | 'trap' | 'mechanic';

export interface LessonIntroExample {
  en: string;
  trRU: string;
  trUK: string;
  /** ES; если нет — показываем trRU */
  trES?: string;
}

export interface LessonIntroScreen {
  /** Основной текст блока (обязательно — для обратной совместимости) */
  textRU: string;
  textUK: string;
  /** ES; если нет — для локали es временно показываем textRU */
  textES?: string;
  /** Тип блока — определяет иконку, цвет акцента, заголовок по умолчанию */
  kind?: LessonIntroBlockKind;
  /** Свой заголовок (если не задан — берётся дефолт по kind) */
  titleRU?: string;
  titleUK?: string;
  titleES?: string;
  /** Опциональный список примеров: EN-фраза + перевод (рисуется отдельной колонкой под текстом) */
  examples?: LessonIntroExample[];
}

export interface LessonData {
  id: number;
  titleRU: string;
  titleUK: string;
  /** Заголовок урока в меню/навигации для локали es */
  titleES?: string;
  introScreens: LessonIntroScreen[];
  phrases: LessonPhrase[];
}

export type PrepositionKind = 'time' | 'place' | 'direction' | 'other';

export interface PrepositionToken {
  text: string;
  kind: PrepositionKind;
}

export interface PrepositionDrillItem {
  id: string;
  sentenceTemplate: string;
  correct: string;
  options: string[];
  explainRU: string;
  explainUK: string;
  /** Пояснение после ответа для локали es; до заполнения — fallback на explainRU в UI */
  explainES?: string;
}

export interface LessonPrepositionPack {
  lessonId: number;
  newPrepositions: PrepositionToken[];
  items: PrepositionDrillItem[];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
