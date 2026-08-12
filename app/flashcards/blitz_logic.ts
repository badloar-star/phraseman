/**
 * cards-2.0 (E12): чистая логика блица (§3.9 мастер-плана — Speed Review).
 * 60 секунд, «EN → выбери перевод из 4», 3 жизни, комбо-серия ×3/×5/×10
 * (множитель очков + SFX fc_combo_*), счёт: верно = 100 × множитель.
 *
 * Без RN-импортов — юнит-тестируется в node (tests/fc_blitz.test.ts).
 * Все числа — в stars_config (задел под remote config, §1).
 */
import {
  BLITZ_COMBO_STEPS,
  BLITZ_LIVES,
  BLITZ_POINTS_CORRECT,
} from './stars_config';

// ── Комбо и очки ─────────────────────────────────────────────────────────────

/** Множитель очков для текущей серии (×1 / ×1.5 / ×2 / ×3 — stars_config). */
export function comboMultiplier(streak: number): number {
  for (const step of BLITZ_COMBO_STEPS) {
    if (streak >= step.streak) return step.mult;
  }
  return 1;
}

/** Очки за верный ответ при серии `streak` (серия УЖЕ включает этот ответ). */
export function pointsForCorrect(streak: number): number {
  return Math.round(BLITZ_POINTS_CORRECT * comboMultiplier(streak));
}

/** Серия ровно достигла порога ×3/×5/×10 → порог (для SFX/бейджа), иначе null. */
export function comboThresholdHit(streak: number): number | null {
  for (const step of BLITZ_COMBO_STEPS) {
    if (streak === step.streak) return step.streak;
  }
  return null;
}

// ── Счёт сессии (чистый редьюсер) ────────────────────────────────────────────

export type BlitzState = {
  score: number;
  /** Текущая серия верных подряд (ошибка сбрасывает в 0). */
  streak: number;
  lives: number;
  correct: number;
  wrong: number;
};

export function initialBlitzState(lives: number = BLITZ_LIVES): BlitzState {
  return { score: 0, streak: 0, lives, correct: 0, wrong: 0 };
}

export type BlitzAnswerOutcome = {
  state: BlitzState;
  /** Очки, начисленные за этот ответ (0 при ошибке). */
  gained: number;
  /** Порог комбо, достигнутый ЭТИМ ответом (3/5/10), иначе null. */
  comboHit: number | null;
  /** Жизни кончились — сессия завершается. */
  outOfLives: boolean;
};

/** Ответ в блице: верно → серия+1, очки с множителем; ошибка → −жизнь, серия 0. */
export function applyBlitzAnswer(state: BlitzState, isCorrect: boolean): BlitzAnswerOutcome {
  if (isCorrect) {
    const streak = state.streak + 1;
    const gained = pointsForCorrect(streak);
    return {
      state: {
        ...state,
        streak,
        score: state.score + gained,
        correct: state.correct + 1,
      },
      gained,
      comboHit: comboThresholdHit(streak),
      outOfLives: false,
    };
  }
  const lives = Math.max(0, state.lives - 1);
  return {
    state: { ...state, streak: 0, lives, wrong: state.wrong + 1 },
    gained: 0,
    comboHit: null,
    outOfLives: lives <= 0,
  };
}

// ── Вопрос «EN → выбери перевод из 4» ────────────────────────────────────────

export type BlitzCardLike = { id: string; en: string; translation: string };

export type BlitzQuestion = {
  card: BlitzCardLike;
  /** 4 варианта перевода (или меньше — колода без 4 уникальных переводов). */
  options: string[];
  correctIndex: number;
};

/**
 * Собрать вопрос: правильный перевод + до 3 уникальных decoy-переводов из ЭТОЙ
 * ЖЕ колоды (паттерн pickDeckDecoy из deck_sources), перемешать. Чистая — rnd
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
