/**
 * зачем (владелец 04.10: «ОЧКИ ИЗ БЛИЦА УБИРАЙ ВООБЩЕ, ТОЛЬКО МОНЕТЫ СЧИТАЕМ»):
 * очки и комбо Блица удалены — монеты за ту же игру обязаны остаться ровно прежними.
 * Монеты считаются только по карточке (3 впервые, 1 при повторе, без бонуса серии),
 * а экран зовёт копилку одной карточкой, без серии ответов.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  awardPracticeRune,
  createPracticeRuneEarnings,
  type PracticeRuneEarnings,
} from '../app/practice_rune_earnings';

/** Игра: верные ответы по карточкам подряд (повторы карточек — как в реальном пуле). */
function playBlitz(answers: readonly string[], firstCompletion: boolean, streakArg?: (i: number) => number): number {
  let earnings: PracticeRuneEarnings = createPracticeRuneEarnings({
    activity: 'flashcards_blitz', sessionKey: 'blitz:test', firstCompletion,
  });
  let total = 0;
  answers.forEach((cardId, i) => {
    const r = awardPracticeRune(earnings, cardId, streakArg?.(i));
    earnings = r.earnings;
    total += r.awarded;
  });
  return total;
}

describe('Блиц: монеты без очков и комбо — те же', () => {
  // 12 верных подряд (до удаления это давало комбо ×3/×5/×10), 8 уникальных карточек.
  const game = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'a', 'b', 'c', 'd'];

  it('первое прохождение: 3 монеты за каждую новую карточку, повтор карточки — 0', () => {
    expect(playBlitz(game, true)).toBe(8 * 3);
  });

  it('повторное прохождение: по 1 монете за карточку', () => {
    expect(playBlitz(game, false)).toBe(8 * 1);
  });

  it('длинная серия верных не меняет монеты Блица (комбо на монеты не влияло и не влияет)', () => {
    expect(playBlitz(game, true, (i) => i + 1)).toBe(playBlitz(game, true));
  });

  it('экран зовёт копилку одной карточкой, без серии, и больше не знает об очках', () => {
    const screen = fs.readFileSync(path.join(process.cwd(), 'app', 'flashcards_blitz_session.tsx'), 'utf8');
    expect(screen).toContain('practiceRunes.onCorrectAnswer(question.card.id);');
    for (const gone of ['blitz_record', 'comboSfxForStreak', 'comboHit', 'isRecord', 'pointsForCorrect']) {
      expect(screen).not.toContain(gone);
    }
    // scoreRow — имя контейнера таймера (вид, сессия 2), не счёт.
    expect(screen).not.toMatch(/score/);
  });
});
