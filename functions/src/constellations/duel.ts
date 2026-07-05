// ════════════════════════════════════════════════════════════════════════════
// constellations/duel.ts — чистый скоринг дуэли «Столкновение» (спек A4a).
//
// Оба игрока отвечают на ОДНИ И ТЕ ЖЕ 3 вопроса. Очко за вопрос: верность;
// оба верно — скорость по СЕРВЕРНЫМ меткам (клиентским не верим, D6).
// Досрочный финиш, когда отставание не отыгрывается оставшимися вопросами
// (2:0 после двух). Ничья после трёх — внезапная смерть: 4-й вопрос, первый
// верный забирает звезду; оба мимо — победителя нет.
//
// Неотвеченный вопрос (дисконнект, таймаут) — неверно: вызывающий код обязан
// передавать его как {correct: false}. Равенство времени разруливается
// индексом игрока — детерминизм для идемпотентного резолва.
// ════════════════════════════════════════════════════════════════════════════

export interface DuelAnswer {
  correct: boolean;
  timeMs: number;
}

export interface DuelScore {
  /** 0 | 1 — индекс победителя в паре, null — оба мимо (звезда прежнему владельцу). */
  winner: 0 | 1 | null;
  points: [number, number];
  /** Индекс вопроса, на котором дуэль решилась (3 = внезапная смерть). */
  decidedAtQuestion: number;
  suddenDeath: boolean;
}

/** Основных вопросов в дуэли по умолчанию (переопределяется cfg.duel.targetScore). */
export const DEFAULT_MAIN_QUESTIONS = 3;
const NOT_ANSWERED: DuelAnswer = { correct: false, timeMs: Number.MAX_SAFE_INTEGER };

function answerAt(answers: readonly DuelAnswer[], i: number): DuelAnswer {
  return answers[i] ?? NOT_ANSWERED;
}

/**
 * Очки за основной вопрос (1.2): дуэль про ЗНАНИЕ, не про пинг.
 * Оба верно → очко ОБОИМ (ничья по вопросу). Один верно → очко ему. Оба мимо → 0.
 * Возвращает [дельта A, дельта B]. Скорость здесь НЕ решает.
 */
function pointDeltas(a: DuelAnswer, b: DuelAnswer): [number, number] {
  return [a.correct ? 1 : 0, b.correct ? 1 : 0];
}

/** Время ПЕРВОГО верного ответа среди основных вопросов; нет верного → +∞. */
function firstCorrectTime(answers: readonly DuelAnswer[], mainQuestions: number): number {
  for (let i = 0; i < mainQuestions; i += 1) {
    const a = answers[i];
    if (a && a.correct) return a.timeMs;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Внезапная смерть: первый ВЕРНЫЙ забирает; оба верно → быстрейший.
 * Оба мимо → тай-брейк по СКОРОСТИ первого верного ответа в основных вопросах
 * (аудит: полная ничья «звезда никому» — потраченный впустую ход и минус к
 * рейтингу ни за что). Если оба вообще не дали ни одного верного — только тогда
 * null (звезда прежнему владельцу): претендовать было нечем.
 */
function suddenDeathWinner(
  a: DuelAnswer,
  b: DuelAnswer,
  tieBreakA: number,
  tieBreakB: number,
): 0 | 1 | null {
  if (a.correct && b.correct) return a.timeMs <= b.timeMs ? 0 : 1;
  if (a.correct) return 0;
  if (b.correct) return 1;
  // Оба мимо на доп. вопросе → кто раньше был верен в основных.
  if (tieBreakA === Number.MAX_SAFE_INTEGER && tieBreakB === Number.MAX_SAFE_INTEGER) return null;
  return tieBreakA <= tieBreakB ? 0 : 1;
}

export function scoreDuel(
  answersA: readonly DuelAnswer[],
  answersB: readonly DuelAnswer[],
  mainQuestions: number = DEFAULT_MAIN_QUESTIONS,
): DuelScore {
  // Защита от нулей/дробей из runtime-конфига: минимум 1 основной вопрос.
  const total = Math.max(1, Math.floor(mainQuestions));
  const points: [number, number] = [0, 0];
  let decidedAtQuestion = total - 1;

  for (let i = 0; i < total; i += 1) {
    const [da, db] = pointDeltas(answerAt(answersA, i), answerAt(answersB, i));
    points[0] += da;
    points[1] += db;
    decidedAtQuestion = i;
    const remaining = total - 1 - i;
    // Отрыв недостижим оставшимися вопросами (макс по +1 обоим) → досрочно.
    if (Math.abs(points[0] - points[1]) > remaining) break;
  }

  if (points[0] !== points[1]) {
    return {
      winner: points[0] > points[1] ? 0 : 1,
      points,
      decidedAtQuestion,
      suddenDeath: false,
    };
  }

  // Ничья по знанию → внезапная смерть (доп. вопрос): здесь скорость решает.
  const winner = suddenDeathWinner(
    answerAt(answersA, total),
    answerAt(answersB, total),
    firstCorrectTime(answersA, total),
    firstCorrectTime(answersB, total),
  );
  return {
    winner,
    points,
    decidedAtQuestion: total,
    suddenDeath: true,
  };
}
