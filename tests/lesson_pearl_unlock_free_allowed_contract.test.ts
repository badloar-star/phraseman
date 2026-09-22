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

function buyLessonUnlockBody(source: string): string {
  const start = source.indexOf('const buyLessonUnlock = useCallback');
  expect(start).toBeGreaterThan(-1);
  // Тело до следующего объявления верхнего уровня в компоненте.
  const end = source.indexOf('const mountedRef = useRef', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('покупка урока за жемчужины: Free не отсекается в UI', () => {
  it('обработчик НЕ разворачивает всех Free в пейвол', () => {
    const body = buyLessonUnlockBody(lessonsScreen);
    // Голая отсечка по подписке запрещена: именно она рубила Free до ядра.
    expect(body).not.toMatch(/if\s*\(\s*!isPremium\s*\)\s*\{/);
  });

  it('пейвол остаётся только для уроков, которые реально платные', () => {
    const body = buyLessonUnlockBody(lessonsScreen);
    // Отсечка допустима ТОЛЬКО вместе с проверкой платности урока —
    // ровно как в ядре и в условии показа кнопки.
    expect(body).toMatch(/!isPremium\s*&&\s*requiresPremiumForLesson\(lessonNum\)/);
  });

  it('тап Free доходит до ядра покупки', () => {
    const body = buyLessonUnlockBody(lessonsScreen);
    // Ищем именно ВЫЗОВЫ, а не упоминания: имя ядра встречается и в
    // комментарии выше, и по голому indexOf тест ловил бы его, а не код.
    const paywallAt = body.indexOf('openPremiumPaywall(router');
    const coreCallAt = body.indexOf('await buyLessonWithPearls(');
    expect(coreCallAt).toBeGreaterThan(-1);
    expect(paywallAt).toBeGreaterThan(-1);
    // Единственный ранний выход в пейвол стоит выше вызова ядра, но он
    // обусловлен платностью урока (проверено тестом выше), а не подпиской.
    expect(paywallAt).toBeLessThan(coreCallAt);
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

  it('условие показа кнопки согласовано с обработчиком', () => {
    // Кнопка видна Free на уроках без пейвола — обработчик обязан её принять.
    expect(lessonsScreen).toMatch(
      /isPremium\s*\|\|\s*\(gateModal\?\.kind === "lesson" && !requiresPremiumForLesson\(gateModal\.lessonNum\)\)/,
    );
  });

  it('отказ покупки откатывает оптимистичное открытие', () => {
    const body = buyLessonUnlockBody(lessonsScreen);
    expect(body).toMatch(/setPurchasedLessons\(\(prev\) => prev\.filter/);
  });
});
