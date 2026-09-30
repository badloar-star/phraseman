import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Сторож решения владельца 22.09: «жемчуг должен работать и у Free».
 *
 * Повод. Владелец: «попытка купить за жемчуг ЛЮБОЙ урок открывает пейвол».
 * Про один вопрос — продать ли урок за жемчужины — отвечали ТРИ слоя, и
 * средний противоречил двум остальным:
 *
 *   показ кнопки (lessons.tsx) : isPremium || !requiresPremiumForLesson(n)
 *                                → Free кнопку ВИДИТ
 *   обработчик   (lessons.tsx) : if (!isPremium) → пейвол
 *                                → Free ОТСЕКАЛСЯ до вызова ядра
 *   ядро (lessons_pearl_unlock): !hasActivePlus && requiresPremiumForLesson(n)
 *                                → Free ПРОДАЛО БЫ урок без пейвола
 *
 * Работающий механизм не звали никогда, а кнопка читалась как обман.
 *
 * Инвариант: если кнопка «Разблокировать» показана — тап обязан дойти до
 * buyLessonWithPearls, а не увести в пейвол. Решение «продать или нет»
 * принимается в ОДНОМ месте — ядре, где денежная граница живёт fail-closed.
 *
 * Сработал — возвращать правило, а не удалять проверку.
 */

const lessonsScreen = readFileSync(
  join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'),
  'utf8',
);
const pearlCore = readFileSync(
  join(__dirname, '..', 'app', 'lessons_pearl_unlock.ts'),
  'utf8',
);

// зачем: D107/D70 — покупка урока за жемчуг удалена из экрана уроков; сторож держит,
// что UI её не вернул. Ядро (lessons_pearl_unlock.ts) удалит другая сессия.
describe('покупка урока за жемчужины: убрана из экрана уроков', () => {
  it('экран не содержит покупки и её флага', () => {
    expect(lessonsScreen).not.toContain('buyLessonUnlock');
    expect(lessonsScreen).not.toContain('buyLessonWithPearls');
    expect(lessonsScreen).not.toContain('LESSON_PEARL_UNLOCK');
    expect(lessonsScreen).not.toContain('lessonUnlockPending');
  });

  it('ядро продаёт Free урок без пейвола и отказывает на платном', () => {
    // Денежная граница обязана жить в ядре, а не в UI: прямой вызов
    // (минуя экран) тоже получает отказ на платном уроке.
    expect(pearlCore).toMatch(
      /if\s*\(\s*!hasActivePlus\s*&&\s*requiresPremiumForLesson\(lessonId\)\s*\)/,
    );
    // Проверка Plus не должна брать ответ из кэша или облачного восстановления.
    expect(pearlCore).toMatch(/bypassCache:\s*true/);
    expect(pearlCore).toMatch(/allowCloudRefresh:\s*false/);
  });
});
