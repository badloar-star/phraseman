/**
 * cards-2.0 (E12): чистая логика блица (§3.9 мастер-плана — Speed Review).
 * 60 секунд, «EN → выбери перевод из 4», 3 жизни.
 * Очков, комбо и рекорда нет (владелец 04.10: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ,
 * ТОЛЬКО МОНЕТЫ СЧИТАЕМ») — монеты начисляет usePracticeRunes, не этот модуль.
 *
 * Без RN-импортов — юнит-тестируется в node (tests/fc_blitz.test.ts).
 * Все числа режима — здесь же (задел под remote config, §1).
 */

// ── Числа блица (§3.9) ───────────────────────────────────────────────────────
export const BLITZ_DURATION_SEC = 60;
export const BLITZ_LIVES = 3;
/** Минимум карточек в наборе для блица (нужны 4 варианта ответа). */
export const BLITZ_MIN_CARDS = 4;

/**
 * Публичный предикат «блиц доступен» — единая точка правды для UI.
 * Правило (владелец, 2026-08-13): если карточек меньше минимума, кнопка «Блиц»
 * НЕ показывается вовсе; экрана-заглушки с текстом ошибки больше нет.
 * Чистая функция без RN — безопасно импортировать из таббара/хаба.
 */
export function canStartBlitz(cardCount: number | null | undefined): boolean {
  const n = typeof cardCount === 'number' && Number.isFinite(cardCount) ? Math.floor(cardCount) : 0;
  return n >= BLITZ_MIN_CARDS;
}

/** Минимум карточек для блица (для подписей/тестов — читать вместо константы). */
export function blitzMinCards(): number {
  return BLITZ_MIN_CARDS;
}
/** Автопереход к следующему вопросу: быстрее арены (§3.9) — 350мс / 700мс на ошибке. */
export const BLITZ_ADVANCE_OK_MS = 350;
export const BLITZ_ADVANCE_WRONG_MS = 700;

// ── Ход сессии (чистый редьюсер) ─────────────────────────────────────────────

export type BlitzState = {
  lives: number;
  correct: number;
  wrong: number;
};

export function initialBlitzState(lives: number = BLITZ_LIVES): BlitzState {
  return { lives, correct: 0, wrong: 0 };
}

export type BlitzAnswerOutcome = {
  state: BlitzState;
  /** Жизни кончились — сессия завершается. */
  outOfLives: boolean;
};

/** Ответ в блице: верно → +1 к верным; ошибка → −жизнь. */
export function applyBlitzAnswer(state: BlitzState, isCorrect: boolean): BlitzAnswerOutcome {
  if (isCorrect) {
    return { state: { ...state, correct: state.correct + 1 }, outOfLives: false };
  }
  const lives = Math.max(0, state.lives - 1);
  return {
    state: { ...state, lives, wrong: state.wrong + 1 },
    outOfLives: lives <= 0,
  };
}

// ── Вопрос «EN → выбери перевод из 4» ────────────────────────────────────────

export type BlitzCardLike = { id: string; en: string; translation: string };

export type BlitzQuestion = {
  card: BlitzCardLike;
  /** 4 варианта перевода (или меньше — набор без 4 уникальных переводов). */
  options: string[];
  correctIndex: number;
};

/**
 * Собрать вопрос: правильный перевод + до 3 уникальных decoy-переводов из ЭТОЙ
 * ЖЕ подборки (паттерн pickDeckDecoy из deck_sources), перемешать. Чистая — rnd
 * инжектится для тестов.
 */
export function buildBlitzQuestion(
  card: BlitzCardLike,
  pool: readonly BlitzCardLike[],
  rnd: () => number = Math.random,
): BlitzQuestion {
  const decoyPool = [
    ...new Set(
      pool
        .map((c) => c.translation)
        .filter((tr) => tr && tr !== card.translation),
    ),
  ];
  // Fisher-Yates по копии — берём первые 3 уникальных decoys
  for (let i = decoyPool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [decoyPool[i], decoyPool[j]] = [decoyPool[j]!, decoyPool[i]!];
  }
  const options = [card.translation, ...decoyPool.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return { card, options, correctIndex: options.indexOf(card.translation) };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
