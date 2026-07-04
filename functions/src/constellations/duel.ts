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

/** Кому очко за вопрос: null — никому (оба мимо). */
function pointWinner(a: DuelAnswer, b: DuelAnswer): 0 | 1 | null {
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
    const taker = pointWinner(answerAt(answersA, i), answerAt(answersB, i));
    if (taker !== null) points[taker] += 1;
    decidedAtQuestion = i;
    const remaining = MAIN_QUESTIONS - 1 - i;
    if (Math.abs(points[0] - points[1]) > remaining) break; // отставание не отыграть
  }

  if (points[0] !== points[1]) {
    return {
      winner: points[0] > points[1] ? 0 : 1,
      points,
      decidedAtQuestion,
      suddenDeath: false,
    };
  }

  // Внезапная смерть (4-й вопрос): первый верный; оба мимо — никто.
  const winner = pointWinner(answerAt(answersA, MAIN_QUESTIONS), answerAt(answersB, MAIN_QUESTIONS));
  return {
    winner,
    points,
    decidedAtQuestion: MAIN_QUESTIONS,
    suddenDeath: true,
  };
}
