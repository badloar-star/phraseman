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
  alternatives?: string[];  // Дополнительные правильные переводы
  russian: string;
  ukrainian: string;
  words: LessonWord[];
}

export interface LessonIntroScreen {
  textRU: string;
  textUK: string;
}

export interface LessonData {
  id: number;
  titleRU: string;
  titleUK: string;
  introScreens: LessonIntroScreen[];
  phrases: LessonPhrase[];
}
