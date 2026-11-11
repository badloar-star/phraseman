/**
 * Банк игры «Память» — английский классический курс, уроки 1–8 (D207). На урок 2 раунда по 4 пары.
 * зачем: владелец 11.11.2026 — игры должны быть на всех уроках, «фразы должны корректно подбираться».
 * Правила вычитки: слово или выражение пары взято из фраз урока; перевод — тот, с каким оно стоит в
 * уроке; в одном наборе нет двух слов с одинаковым или близким переводом (noon и midday вместе не идут);
 * неверные варианты — переводы двух других пар того же набора: проверяется именно память, а не догадка.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { QuizRound } from '../quiz_core';

type Pair = readonly [string, string];
type FourPairs = readonly [Pair, Pair, Pair, Pair];

/** `askIndex` — о какой паре вопрос; `wrong` — номера двух других пар; `at` — место верного ответа. */
function round(lesson: number, n: number, pairs: FourPairs, askIndex: number, wrong: readonly [number, number], at: number): QuizRound {
  const correctIndex = Math.min(Math.max(at, 0), wrong.length);
  const wrongOptions = wrong.map((i) => pairs[i][1]);
  const options = [...wrongOptions.slice(0, correctIndex), pairs[askIndex][1], ...wrongOptions.slice(correctIndex)];
  return {
    id: `mem-en-l${String(lesson).padStart(2, '0')}-${n}`,
    ask: `Что значит «${pairs[askIndex][0]}»?`,
    options,
    correctIndex,
    prompt: { kind: 'pairs', pairs, askIndex },
  };
}

export const MEMORY_BANK_EN: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, [['Busy', 'Занят'], ['Ready', 'Готов'], ['Free', 'Свободен'], ['Late', 'Опаздывает']], 2, [0, 1], 1),
    round(1, 2, [['At home', 'Дома'], ['At work', 'На работе'], ['Open', 'Открыто'], ['Closed', 'Закрыто']], 1, [0, 3], 0),
  ],
  2: [
    round(2, 1, [['Seat', 'Место'], ['Ticket', 'Билет'], ['Stairs', 'Лестница'], ['Platform', 'Платформа']], 0, [1, 3], 2),
    round(2, 2, [['Empty', 'Пусто'], ['Safe', 'Безопасно'], ['Valid', 'Действителен'], ['On time', 'Вовремя']], 2, [0, 3], 1),
  ],
  3: [
    round(3, 1, [['Nearby', 'Неподалёку'], ['Alone', 'Один'], ['Together', 'Вместе'], ['Sometimes', 'Иногда']], 1, [2, 3], 0),
    // зачем (владелец 11.11, «Да, „Нужно“»): в уроке фраза переведена «Мне нужна помощь», слова «нуждаться» там нет
    round(3, 2, [['Share', 'Делить'], ['Need', 'Нужно'], ['Use', 'Пользоваться'], ['Finish', 'Заканчивать']], 3, [0, 2], 2),
  ],
  4: [
    round(4, 1, [['Cash', 'Наличные'], ['Receipt', 'Чек'], ['Price', 'Цена'], ['Rent', 'Арендная плата']], 1, [0, 2], 1),
    round(4, 2, [['Drive', 'Водить машину'], ['Smoke', 'Курить'], ['Cook', 'Готовить еду'], ['Understand', 'Понимать']], 3, [1, 2], 0),
  ],
  5: [
    round(5, 1, [['Stamps', 'Марки'], ['Parcel', 'Посылка'], ['Delivery', 'Доставка'], ['Address', 'Адрес']], 2, [1, 3], 2),
    round(5, 2, [['Landlord', 'Арендодатель'], ['Uniform', 'Униформа'], ['Lunch break', 'Перерыв на обед'], ['Spare key', 'Запасной ключ']], 0, [1, 3], 1),
  ],
  6: [
    round(6, 1, [['How much', 'Сколько стоит'], ['How often', 'Как часто'], ['How long', 'Как долго'], ['How far', 'Как далеко']], 2, [1, 3], 0),
    round(6, 2, [['Journey', 'Поездка'], ['Sale', 'Распродажа'], ['Label', 'Этикетка'], ['Surname', 'Фамилия']], 1, [0, 2], 2),
  ],
  7: [
    round(7, 1, [['Headache', 'Головная боль'], ['Cough', 'Кашель'], ['Fever', 'Температура'], ['Sore throat', 'Больное горло']], 2, [0, 1], 1),
    round(7, 2, [['Appointment', 'Запись на приём'], ['Prescription', 'Рецепт'], ['Booking', 'Бронирование'], ['Driving licence', 'Водительские права']], 0, [1, 2], 0),
  ],
  8: [
    round(8, 1, [['Noon', 'Полдень'], ['Midnight', 'Полночь'], ['Dawn', 'Рассвет'], ['Tonight', 'Сегодня вечером']], 2, [0, 1], 2),
    round(8, 2, [['Spring', 'Весна'], ['Summer', 'Лето'], ['Autumn', 'Осень'], ['Winter', 'Зима']], 2, [0, 3], 1),
  ],
};
