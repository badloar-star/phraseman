// зачем: владелец забраковал демо-витрину «скриптовых режимов» и указал на
// правильный слой — блок «УРОК — НОВОЕ (MVP)» поставки Kimi: карта юнита →
// сессия → раннер с карточками, звёздами, ошибками и лестницей подсказок.
// Это дословный перенос source/src/session/contracts.ts: все отображаемые
// значения (звёзды, вердикты, прогресс) приходят из фикстур, UI их не считает.

export type EngineId = 'choice' | 'match' | 'arrange' | 'input' | 'speech' | 'dialogue';
export type MistakeTag = 'форма' | 'порядок слов' | 'артикль' | 'слух' | 'произношение' | 'смысл';
export type OutcomeId = 'clean' | 'hint' | 'shown' | 'skip';

/** Сколько звёзд даёт исход карточки (запечено в фикстуре). */
export interface StarsByOutcome {
  readonly clean: number;
  readonly hint: number;
  readonly shown: number;
}

/** Лестница подсказок: три ступени на три неверные попытки. */
export interface HintSet {
  /** 1-я ошибка — спокойный толчок. */
  readonly first: string;
  /** 2-я ошибка — контраст: почему соседний вариант неверен. */
  readonly contrast: string;
  /** 3-я ошибка — объяснение рядом с раскрытым ответом. */
  readonly explain: string;
}

interface CardBase {
  readonly id: string;
  readonly engine: EngineId;
  readonly instruction: string;
  readonly starsByOutcome: StarsByOutcome;
  readonly hints: HintSet;
  readonly mistakeTags: readonly MistakeTag[];
  readonly planInjected: boolean;
  readonly mistakeNote?: string;
  /** Карточка ВОЗВРАЩАЕТ прежнюю ошибку — бейдж «Разбираем ошибку». */
  readonly returnsMistake?: boolean;
}

export interface ChoiceOption {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
  readonly icon?: string;
}

export interface ChoiceCard extends CardBase {
  readonly engine: 'choice';
  /** context — сцена; meaning — фраза → RU; audio — большой play, транскрипт
   *  скрыт до попытки; contrast — выбор формы; transfer — та же семья в новой сцене. */
  readonly variant: 'context' | 'meaning' | 'audio' | 'contrast' | 'transfer';
  readonly scene?: { readonly emoji: string; readonly caption: string };
  readonly phrase?: { readonly en: string; readonly ru: string };
  readonly audio?: { readonly label: string; readonly playLabel: string; readonly slowLabel: string };
  readonly options: readonly ChoiceOption[];
  readonly correctOptionId: string;
}

export interface MatchCard extends CardBase {
  readonly engine: 'match';
  readonly variant: 'pairs';
  readonly pairs: readonly { readonly id: string; readonly en: string; readonly ru: string }[];
  readonly timerDisplay: string;
  readonly noTimerLabel: string;
}

export interface ArrangeCard extends CardBase {
  readonly engine: 'arrange';
  /** distractors — лишние чипы в банке; guided — часть слов уже стоит. */
  readonly variant: 'distractors' | 'guided';
  readonly promptRu: string;
  readonly targetTokens: readonly string[];
  readonly bankChips: readonly string[];
  readonly preplaced: readonly string[];
}

export interface InputCard extends CardBase {
  readonly engine: 'input';
  /** cloze — один пропуск; full — перевод без банка; dictation — на слух. */
  readonly variant: 'cloze' | 'full' | 'dictation';
  readonly sentence?: string;
  readonly promptRu?: string;
  readonly audio?: { readonly label: string; readonly playLabel: string; readonly slowLabel: string };
  readonly answer: string;
  readonly placeholder: string;
}

export interface SpeechCard extends CardBase {
  readonly engine: 'speech';
  readonly variant: 'repeat';
  readonly phrase: { readonly en: string; readonly ru: string };
  /** Пословный показ распознавания — никогда не оценка акцента. */
  readonly wordFeedback: readonly { readonly word: string; readonly result: 'good' | 'weak' }[];
  readonly recognitionNote: string;
  readonly skipLabel: string;
  readonly micLabel: string;
}

export interface DialogueTurnPartner {
  readonly speaker: 'partner';
  readonly en: string;
  readonly ru: string;
}

export interface DialogueTurnYou {
  readonly speaker: 'you';
  readonly mode: 'choose';
  readonly options: readonly ChoiceOption[];
  readonly correctOptionId: string;
  readonly ru: string;
}

export type DialogueTurn = DialogueTurnPartner | DialogueTurnYou;

export interface DialogueCard extends CardBase {
  readonly engine: 'dialogue';
  readonly variant: 'scripted';
  readonly scene?: { readonly emoji: string; readonly caption: string };
  readonly turns: readonly DialogueTurn[];
  readonly summary: string;
  readonly replayLabel: string;
  readonly slowLabel: string;
}

export type SessionCard = ChoiceCard | MatchCard | ArrangeCard | InputCard | SpeechCard | DialogueCard;

export interface SessionVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly kind: 'session' | 'practice';
  readonly sessionId: string;
  readonly title: string;
  readonly zone: string;
  readonly intro: {
    readonly kicker: string;
    readonly headline: string;
    readonly canDo?: string;
    readonly startLabel: string;
    readonly cardsDisplay: string;
  };
  readonly finale: { readonly headline: string; readonly canDo: string; readonly continueLabel: string };
  readonly errorChips?: readonly { readonly tag: MistakeTag; readonly count: number }[];
  readonly cards: readonly SessionCard[];
}

export interface UnitSessionNode {
  readonly id: string;
  readonly index: string;
  readonly title: string;
  readonly state: 'done' | 'current' | 'open' | 'locked';
  readonly starsDisplay: string;
  /** 0–3 маленькие звезды под узлом тропы. */
  readonly nodeStars: number;
  readonly sessionRef: string | null;
  readonly engines: readonly EngineId[];
}

export interface UnitZone {
  readonly id: string;
  readonly title: string;
  /** Лента зоны несёт формулировку can-do, а не «этап N». */
  readonly canDo: string;
  readonly sessions: readonly UnitSessionNode[];
}

export interface UnitMapVM {
  readonly id: string;
  readonly surfaceId: string;
  readonly kind: 'unit-map';
  readonly unit: {
    readonly kicker: string;
    readonly title: string;
    readonly canDo: string;
    readonly progressDisplay: string;
    readonly starsDisplay: string;
  };
  readonly planToggle: {
    readonly freeLabel: string;
    readonly plusLabel: string;
    readonly plusNote: string;
    readonly badgeLabel: string;
  };
  readonly zones: readonly UnitZone[];
  readonly sideNodes: readonly {
    readonly id: string;
    readonly title: string;
    readonly sub: string;
    readonly state: 'open' | 'locked';
    readonly surfaceRef: string | null;
    readonly icon: 'target' | 'trophy';
    readonly lockNote?: string;
  }[];
}
