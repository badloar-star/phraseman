// Типы АХ-сцены онбординга («Сцена»: слышишь → собираешь → говоришь).
// Контракт модуля: компоненты реализуются строго против этих типов.
// Дизайн: docs/ONBOARDING_AHA_DESIGN_2026-07-02.md

import type { ImageSourcePropType } from 'react-native';

/** Язык интерфейса онбординга (как в CleanOnboarding: ru-дефолт, uk/es поддержаны). */
export type AhaLang = 'ru' | 'uk' | 'es';

/** Троица локализованных строк; резолвится через pickTri(lang, tri). */
export interface TriText {
  ru: string;
  uk: string;
  es: string;
}

/** Идентификаторы сценариев (по цели пользователя). */
export type AhaScenarioId =
  | 'travel'
  | 'work'
  | 'media'
  | 'people'
  | 'everyday'
  | 'self';

/** Цели из CleanOnboarding + запас на будущее. */
export type AhaGoalInput =
  | 'series'
  | 'everyday'
  | 'travel'
  | 'words'
  | 'mind'
  | 'work'
  | (string & {});

/** Пословный тайминг реплики (снят с реального mp3, мс от старта клипа). */
export interface AhaWordTiming {
  /** Слово так, как показываем на экране (может отличаться от ASR-формы). */
  word: string;
  startMs: number;
  endMs: number;
}

/** Одна озвученная реплика сцены. */
export interface AhaLine {
  /** Английский текст реплики (экранное написание). */
  text: string;
  /** Перевод для подсказки (появляется с задержкой). */
  translation: TriText;
  /** Пословные тайминги: length === числу слов в text. */
  timings: readonly AhaWordTiming[];
  /** Длительность клипа, мс (endMs последнего слова + хвост). */
  durationMs: number;
}

/** Контент одного сценария. */
export interface AhaScenario {
  id: AhaScenarioId;
  /** Сеттинг сцены — печатается Компасом в бите 1. */
  setting: TriText;
  /** Реплика собеседника (бит 1). */
  hear: AhaLine;
  /** Подводка к ответу (бит 2), например «Ответь как местный:». */
  replyPrompt: TriText;
  /** Целевая фраза юзера (бит 2 сборка, бит 3 произнесение). */
  say: AhaLine;
  /** Слова-дистракторы для chips (1–2, правдоподобные, отпружинивают). */
  distractors: readonly string[];
}

/** Результат прохождения сцены (наружу, для аналитики/интеграции). */
export type AhaBeat3Mode = 'spoken' | 'shadow' | 'skipped';

export interface AhaSceneResult {
  scenarioId: AhaScenarioId;
  completed: boolean;
  /** Как закончился бит 3. */
  beat3: AhaBeat3Mode;
  /** Доля «чистых+нечётких» слов 0..100, если говорил вслух. */
  speechPct?: number;
}

/** Пропсы корневого компонента сцены. */
export interface AhaSceneProps {
  /** Цель юзера из шага goal (маппится в сценарий). */
  goal: AhaGoalInput | null | undefined;
  lang: AhaLang;
  /** Завершение сцены (пейофф досмотрен, юзер нажал «Дальше»). */
  onDone: (result: AhaSceneResult) => void;
  /** Мелкий «Пропустить сцену» (доступен с 5-й секунды). */
  onSkip: (result: AhaSceneResult) => void;
}

/** Фазы стейт-машины сцены. */
export type AhaBeat =
  | 'enter' // фон въезжает, сеттинг печатается
  | 'listen' // бит 1: реплика + караоке
  | 'assemble' // бит 2: chips
  | 'speak' // бит 3: микрофон / shadow-фолбэк
  | 'payoff'; // конфетти + мост к маршруту

/** Пропсы караоке-строки (подсветка слов по таймингам воспроизведения). */
export interface KaraokeLineProps {
  line: AhaLine;
  /** Идёт ли сейчас воспроизведение (перезапуск подсветки с нуля). */
  playToken: number;
  /** Стиль: реплика собеседника или целевая фраза. */
  variant: 'hear' | 'say';
  /** Тап по строке — повтор клипа (обрабатывает родитель). */
  onPress?: () => void;
}

/** Кадры караоке: какому слову соответствует момент времени. */
export interface KaraokeFrame {
  wordIndex: number;
  atMs: number;
}

/** Пропсы печатающегося текста Компаса. */
export interface TypewriterTextProps {
  text: string;
  /** мс на символ (деф. 32). */
  charMs?: number;
  /** Вызывается один раз, когда текст допечатан (или проскипан тапом). */
  onDone?: () => void;
  /** Тап по тексту мгновенно допечатывает. */
  skipOnPress?: boolean;
  /**
   * Цвет текста и курсора.
   *
   * зачем 2026-08-16: компонент родился внутри ТЁМНОЙ АХ-сцены и брал цвет из
   * её палитры (почти белый). Онбординг стал светлым и печатает этим же
   * компонентом реплики в БЕЛОМ пузыре — получалось белое по белому. Цвет
   * теперь задаёт вызывающий экран; без пропа поведение прежнее (тёмная сцена).
   */
  color?: string;
}

/** Один chip в сборке. */
export interface AhaChip {
  id: string;
  word: string;
  /** Дистрактор: при тапе отпружинивает, в строку не встаёт. */
  isDistractor: boolean;
}

/** Пропсы бита 2. */
export interface ChipsAssemblyProps {
  scenario: AhaScenario;
  lang: AhaLang;
  /** Фраза собрана (все слова в правильном порядке). */
  onSolved: () => void;
  /** Проиграть целевую реплику (родитель владеет аудио). */
  playSay: () => void;
}

/** Пропсы бита 3. */
export interface SpeechBeatProps {
  scenario: AhaScenario;
  lang: AhaLang;
  onDone: (outcome: { mode: AhaBeat3Mode; speechPct?: number }) => void;
  /** Проиграть эталонную реплику из бандла (родитель владеет аудио). */
  playSay: () => void;
}

/** Статусы распознавания в бите 3 (подмножество SpeakingPanel). */
export type AhaSpeechStatus =
  | 'preprompt' // объяснение до системного диалога
  | 'requesting'
  | 'listening'
  | 'scoring'
  | 'done' // показываем карту слов + «Моя запись ↔ Эталон»
  | 'fallback'; // shadow-повтор без микрофона
