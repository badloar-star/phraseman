import { existsSync, readFileSync } from 'fs';
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
 *   ядро (lessons_pearl_unlock, УДАЛЕНО): !hasActivePlus && requiresPremiumForLesson(n)
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
// зачем: D107/D70 — покупка урока за жемчуг удалена из экрана уроков; сторож держит,
// что ни UI, ни ядро её не вернули.
const appDir = join(__dirname, '..', 'app');
describe('покупка урока за жемчужины: убрана из экрана уроков', () => {
  it('экран не содержит покупки и её флага', () => {
    expect(lessonsScreen).not.toContain('buyLessonUnlock');
    expect(lessonsScreen).not.toContain('buyLessonWithPearls');
    expect(lessonsScreen).not.toContain('LESSON_PEARL_UNLOCK');
    expect(lessonsScreen).not.toContain('lessonUnlockPending');
  });

  it('ядро покупки удалено, хранилище прошлых покупок осталось', () => {
    expect(existsSync(join(appDir, 'lessons_pearl_unlock.ts'))).toBe(false);
    expect(existsSync(join(appDir, 'lessons_pearl_unlock_flag.ts'))).toBe(false);
    // PM-148-A2: уже купленные уроки по-прежнему читаются отсюда
    expect(existsSync(join(appDir, 'lessons_pearl_unlock_storage.ts'))).toBe(true);
  });
});
