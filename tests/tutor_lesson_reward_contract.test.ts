/**
 * Контракт награды за урок с Максом.
 *
 * зачем: урок закрывался карточкой «Урок пройден» и не давал ничего — ни опыта,
 * ни следа. Обычный диалог за то же время платит, и учиться у Макса было
 * невыгодно. Это класс бага «экран показали, награду не начислили»: ошибок нет,
 * логи чистые, заметить можно только сверкой.
 *
 * Отдельно сторожим ДЕНЬ, а не «один раз навсегда»: урок повторяем по замыслу,
 * запрет навсегда убил бы фичу, отсутствие запрета сделал бы её фермой.
 */
import {
  decideTutorReward,
  localDayKey,
  TUTOR_LESSON_XP,
} from '../app/tutor_lesson_reward';

/** Полдень, чтобы часовой пояс теста не перебрасывал дату через полночь. */
function noon(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12, 0, 0).getTime();
}

describe('награда за урок с Максом', () => {
  it('первый урок за день оплачивается полным опытом', () => {
    const decision = decideTutorReward(null, noon(2026, 9, 15));
    expect(decision.xp).toBe(TUTOR_LESSON_XP);
    expect(decision.reason).toBe('granted');
  });

  it('урок стоит столько же, сколько успешный диалог — учиться не убыточно', () => {
    expect(TUTOR_LESSON_XP).toBeGreaterThan(0);
  });

  it('второй урок в тот же день опыта не приносит — ферму закрываем', () => {
    const now = noon(2026, 9, 15);
    const first = decideTutorReward(null, now);
    const second = decideTutorReward(first.dayKey, now);
    expect(second.xp).toBe(0);
    expect(second.reason).toBe('already_today');
  });

  it('назавтра опыт снова начисляется — урок повторяем по замыслу', () => {
    const yesterday = decideTutorReward(null, noon(2026, 9, 15));
    const today = decideTutorReward(yesterday.dayKey, noon(2026, 9, 16));
    expect(today.xp).toBe(TUTOR_LESSON_XP);
    expect(today.reason).toBe('granted');
  });

  it('день считается по местному времени, а не по UTC', () => {
    // Поздний вечер и раннее утро следующих суток обязаны дать РАЗНЫЕ дни,
    // иначе вечерний урок съедал бы утренний.
    const lateEvening = new Date(2026, 8, 15, 23, 30, 0).getTime();
    const earlyMorning = new Date(2026, 8, 16, 0, 30, 0).getTime();
    expect(localDayKey(lateEvening)).not.toBe(localDayKey(earlyMorning));
  });

  it('битое сохранённое значение не блокирует награду — молчать хуже, чем переплатить', () => {
    const decision = decideTutorReward('мусор', noon(2026, 9, 15));
    expect(decision.xp).toBe(TUTOR_LESSON_XP);
  });
});
