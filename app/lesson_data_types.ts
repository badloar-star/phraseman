// Lesson Data Type Definitions

import type { HeisenbergSourceLocale } from './source_locales';

export type LessonPhraseSourceLocales = Partial<Record<HeisenbergSourceLocale, string>>;

export interface LessonWord {
  text: string;           // The word
  correct: string;        // Same as text (for validation)
  distractors: string[];  // 5 specific distractors
  category?: string;      // 'pronoun', 'to-be', 'article', etc.
  teachingNote?: LessonTeachingNote;
}

export interface LessonTeachingNote {
  id: string;
  titleRu?: string;
  titleUk?: string;
  titleEs?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  correctRu: string;
  correctUk?: string;
  correctEs?: string;
  correctPtBr?: string;
  correctVi?: string;
  correctId?: string;
  correctTr?: string;
  correctPl?: string;
  wrongRu: string;
  wrongUk?: string;
  wrongEs?: string;
  wrongPtBr?: string;
  wrongVi?: string;
  wrongId?: string;
  wrongTr?: string;
  wrongPl?: string;
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
  /** Подсказка-перевод для локали es; до заполнения UI обычно использует russian. */
  spanish?: string;
  /** Source-language prompt for planned Heisenberg interface locales. */
  sourceLocales?: LessonPhraseSourceLocales;
  /** Target-language French surface. It is separate from source-locale RU/UK prompts. */
  french?: string;
  /**
   * Токены целевой фразы (испанский при L2 es). Для уроков с двойным набором см. wordsEn.
   */
  words: LessonWord[];
  /**
   * Английские токены для режима learnTarget=en, когда `words` — испанская сборка (L2).
   */
  wordsEn?: LessonWord[];
  /** Французские токены для режима learnTarget=fr. */
  wordsFr?: LessonWord[];
  /** Легитимные альтернативы на французском (режим learnTarget=fr). */
  alternativesFr?: string[];
  /** Копия названия урока из LESSON_DATA (добавляется в getLessonData) */
  lessonTitleRU?: string;
  lessonTitleUK?: string;
  /** То же для es (название урока в шапке/шаринге фразы) */
  lessonTitleES?: string;
  lessonTitlePtBr?: string;
  lessonTitleVi?: string;
  lessonTitleId?: string;
  lessonTitleTr?: string;
  lessonTitlePl?: string;
}

/**
 * Тип блока определяет иконку, акцентный цвет и заголовок по умолчанию:
 * - 'why'              — мотивация: зачем эта тема (sparkles, accent)
 * - 'how'              — принцип построения фразы (construct, correct/green)
 * - 'tip'              — полезный нюанс / лайфхак (bulb, gold)
 * - 'trap'             — типичная ошибка / ловушка (warning, wrong)
 * - 'mechanic'         — объяснение механики приложения (hand, accent) — обычно только для урока 1
 * - 'core_idea'          — ключевая идея урока (flash, accent)
 * - 'main_formula'       — главная формула (calculator, gold)
 * - 'be_choice'          — выбор формы глагола (git-branch, correct)
 * - 'description_logic'  — что идёт после глагола (list, gold)
 * - 'memory_tip'         — приём для запоминания / сборки (bulb, gold)
 * - 'negative_formula'   — формула отрицания (close-circle, wrong)
 * - 'question_formula'   — формула вопроса (help-circle, accent)
 * - 'after_be'           — что идёт после To Be в конкретном уроке (list, gold)
 * - 'negative_questions' — вопросы с not (alert-circle, accent)
 * - 'mistakes'           — разбор главных ошибок (warning, wrong)
 */
export type LessonIntroBlockKind =
  | 'why'
  | 'how'
  | 'tip'
  | 'trap'
  | 'mechanic'
  | 'core_idea'
  | 'main_formula'
  | 'be_choice'
  | 'description_logic'
  | 'memory_tip'
  | 'negative_formula'
  | 'question_formula'
  | 'after_be'
  | 'negative_questions'
  | 'mistakes';

export interface LessonIntroExample {
  en: string;
  trRU: string;
  trUK: string;
  /** ES; если нет — показываем trRU */
  trES?: string;
  trPtBr?: string;
  trVi?: string;
  trId?: string;
  trTr?: string;
  trPl?: string;
}

export interface LessonIntroScreen {
  /** Основной текст блока (обязательно — для обратной совместимости) */
  textRU?: string;
  textUK?: string;
  /** ES; если нет — для локали es временно показываем textRU */
  textES?: string;
  textPtBr?: string;
  textVi?: string;
  textId?: string;
  textTr?: string;
  textPl?: string;
  /** Тип блока — определяет иконку, цвет акцента, заголовок по умолчанию */
  kind?: LessonIntroBlockKind | 'concept' | 'formula' | 'practice';
  /** Свой заголовок (если не задан — берётся дефолт по kind) */
  titleRU?: string;
  titleUK?: string;
  titleES?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  /** Опциональный список примеров: EN-фраза + перевод (рисуется отдельной колонкой под текстом) */
  examples?: any[];
  lessonId?: number;
  screenId?: string;
  order?: number;
  subtitleRU?: string;
  subtitleUK?: string;
  subtitleES?: string;
  subtitlePtBr?: string;
  subtitleVi?: string;
  subtitleId?: string;
  subtitleTr?: string;
  subtitlePl?: string;
  linesRU?: IntroLine[];
  linesUK?: IntroLine[];
  linesES?: IntroLine[];
  linesPtBr?: IntroLine[];
  linesVi?: IntroLine[];
  linesId?: IntroLine[];
  linesTr?: IntroLine[];
  linesPl?: IntroLine[];
  developerNotes?: LessonIntroScreenV2['developerNotes'];
  /**
   * Интерактивный блок экрана (раунд 2). Опционально — старые экраны без него
   * рендерятся статично. Раскрывается опт-ин, без XP, tap-only.
   */
  interaction?: IntroInteraction;
  /**
   * Уникальный цвет темы для этого экрана/урока. Если не задан — рендерер
   * берёт topicAccent из реестра по lessonId, иначе fallback на t.accent темы.
   */
  topicAccent?: TopicAccent;
}

// V2 Intro Screen types — rich inline markup with tones and line types
export type IntroTextTone =
  | 'normal'
  | 'muted'
  | 'strong'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'formula'
  | 'code';

export type IntroTextPart = {
  text: string;
  tone?: IntroTextTone;
};

export type IntroLine = {
  type: 'text' | 'formula' | 'example' | 'wrong' | 'correct' | 'step' | 'tip' | 'spacer';
  parts?: IntroTextPart[];
  text?: string;
};

// ============================================================================
// Интерактивная теория (раунд 2) — опциональные блоки внутри экрана теории.
// ВСЁ опционально: старые данные без этих полей рендерятся как раньше.
// Все механики — tap-only (без drag), фидбэк без модалок, без XP/штрафов.
// ============================================================================

/** Локализованная строка-подсказка интерактива (родной язык, всегда видим). */
export interface IntroI18nText {
  ru: string;
  uk?: string;
  es?: string;
  ptBr?: string;
  vi?: string;
  id?: string;
  tr?: string;
  pl?: string;
}

/**
 * «Собери фразу из кнопок-слов» прямо в теории (Word-Bank Builder).
 * Реюзает существующие EN-фразы урока. Перевод (prompt) и формула видны всегда.
 */
export interface IntroBuildInteraction {
  kind: 'word_bank';
  /** Подсказка на родном языке над слотами («Она готова»). */
  prompt: IntroI18nText;
  /** Эталонная сборка по словам, по порядку. Напр. ['She','is','ready']. */
  answer: string[];
  /** Подписи слотов-ролей (родной язык, по числу answer). Напр. ['кто','связка','описание']. */
  slotLabels?: IntroI18nText[];
  /** Доп.слова в банк — дистракторы ТОЛЬКО из той же темы (here/there), НЕ форм agreement. */
  distractors?: string[];
}

/** «Выбери форму» — один пропуск, 2-3 кнопки (3-Tile Choice). */
export interface IntroChoiceInteraction {
  kind: 'choice';
  /** Фраза с пропуском: части до и после слота. */
  before: string;
  after: string;
  /** Варианты-кнопки. */
  options: string[];
  /** Правильный вариант (должен входить в options). */
  answer: string;
  /** Короткое «почему» (раскрывается по запросу). */
  why?: IntroI18nText;
}

/** «Найди промах» — тапни лишнее/неверное слово (Spot-the-Slip). */
export interface IntroSpotInteraction {
  kind: 'spot_slip';
  /** Слова неверной фразы как чипы. */
  chips: string[];
  /** Индекс «лишнего/неверного» чипа в chips. */
  answerIndex: number;
  /** Подсказка-заголовок («Тут лишнее слово»). */
  hint: IntroI18nText;
  /** Что показать после успеха (правильная фраза + почему). */
  fix: IntroI18nText;
}

/** «Финал-чек» — выбор из двух фраз (Binary Recognition). */
export interface IntroBinaryInteraction {
  kind: 'binary';
  question: IntroI18nText;
  /** Две фразы-варианта. */
  optionA: string;
  optionB: string;
  /** Какая верна. */
  correct: 'A' | 'B';
  /** Объяснение после ответа. */
  explain: IntroI18nText;
}

export type IntroInteraction =
  | IntroBuildInteraction
  | IntroChoiceInteraction
  | IntroSpotInteraction
  | IntroBinaryInteraction;

/**
 * Уникальный цвет темы (пожелание владельца — у каждой темы свой).
 * Семантика success/danger/warning остаётся из темы приложения — здесь только accent.
 * Хранится как hex; рендерер проверяет контраст и не даёт accent совпасть с danger/success.
 */
export interface TopicAccent {
  /** Основной акцент темы (hex). Напр. To Be — '#3B7DDB'. */
  accent: string;
  /** Мягкая подложка для CTA/пилюль (hex, низкая насыщенность). */
  soft: string;
  /**
   * Тот же оттенок, затемнённый для СВЕТЛЫХ поверхностей (hex).
   * зачем: базовый accent считался под тёмную карточку #171A21 (там AAA), а на
   * светлой карточке давал контраст ~1.8–2.5 при норме 4.5 — текст не читался.
   */
  accentOnLight: string;
}

export type IntroExample = {
  labelRU?: string;
  labelUK?: string;
  labelES?: string;
  labelPtBr?: string;
  labelVi?: string;
  labelId?: string;
  labelTr?: string;
  labelPl?: string;
  en: IntroTextPart[];
  ru: string;
  uk: string;
  es: string;
  'pt-BR'?: string;
  vi?: string;
  id?: string;
  tr?: string;
  pl?: string;
  noteRU?: string;
  noteUK?: string;
  noteES?: string;
  notePtBr?: string;
  noteVi?: string;
  noteId?: string;
  noteTr?: string;
  notePl?: string;
};

export type LessonIntroScreenV2 = {
  lessonId: number;
  screenId: string;
  order: number;
  kind: 'concept' | 'formula' | 'practice';
  titleRU: string;
  titleUK: string;
  titleES: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
  subtitleRU?: string;
  subtitleUK?: string;
  subtitleES?: string;
  subtitlePtBr?: string;
  subtitleVi?: string;
  subtitleId?: string;
  subtitleTr?: string;
  subtitlePl?: string;
  linesRU: IntroLine[];
  linesUK: IntroLine[];
  linesES: IntroLine[];
  linesPtBr?: IntroLine[];
  linesVi?: IntroLine[];
  linesId?: IntroLine[];
  linesTr?: IntroLine[];
  linesPl?: IntroLine[];
  examples?: IntroExample[];
  developerNotes?: {
    screenGoal: string;
    visualPriority: string[];
    highlightRules: string[];
    forbiddenContent: string[];
    layoutRules: string[];
  };
};

export interface LessonData {
  id: number;
  titleRU: string;
  titleUK: string;
  /** Заголовок урока в меню/навигации для локали es */
  titleES?: string;
  titlePtBr?: string;
  titleVi?: string;
  titleId?: string;
  titleTr?: string;
  titlePl?: string;
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
  /** Пояснение после ответа для локали es; до заполнения UI использует explainRU. */
  explainES?: string;
  explainPtBr?: string;
  explainVi?: string;
  explainId?: string;
  explainTr?: string;
  explainPl?: string;
}

export interface LessonPrepositionPack {
  lessonId: number;
  newPrepositions: PrepositionToken[];
  items: PrepositionDrillItem[];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
