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

const MAIN_QUESTIONS = 3;
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

/** Внезапная смерть: первый ВЕРНЫЙ забирает; оба верно → быстрейший; оба мимо → никто. */
function suddenDeathWinner(a: DuelAnswer, b: DuelAnswer): 0 | 1 | null {
  if (a.correct && b.correct) return a.timeMs <= b.timeMs ? 0 : 1;
  if (a.correct) return 0;
  if (b.correct) return 1;
  return null;
}

export function scoreDuel(
  answersA: readonly DuelAnswer[],
  answersB: readonly DuelAnswer[],
): DuelScore {
  const points: [number, number] = [0, 0];
  let decidedAtQuestion = MAIN_QUESTIONS - 1;

  for (let i = 0; i < MAIN_QUESTIONS; i += 1) {
    const [da, db] = pointDeltas(answerAt(answersA, i), answerAt(answersB, i));
    points[0] += da;
    points[1] += db;
    decidedAtQuestion = i;
    const remaining = MAIN_QUESTIONS - 1 - i;
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

  // Ничья по знанию → внезапная смерть (4-й вопрос): здесь скорость решает.
  const winner = suddenDeathWinner(answerAt(answersA, MAIN_QUESTIONS), answerAt(answersB, MAIN_QUESTIONS));
  return {
    winner,
    points,
    decidedAtQuestion: MAIN_QUESTIONS,
    suddenDeath: true,
  };
}
