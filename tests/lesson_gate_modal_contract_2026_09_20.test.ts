/**
 * Сторож СОДЕРЖИМОГО модалки замка урока (владелец 2026-09-20).
 *
 * Повод: прошлый круг проверил только логику доступа и отчитался «работает»,
 * а владелец увидел модалку БЕЗ текста требования и БЕЗ кнопки покупки.
 * Логика была верна — врал экран. Поэтому здесь проверяется РАЗМЕТКА:
 * что человек реально прочитает и на что сможет нажать.
 *
 * Сработал — чинить экран, а не ослаблять сторожа.
 */
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'),
  'utf8',
);

describe('модалка «Ещё рано»: текст требования', () => {
  it('русский message называет урок и оценку, а не дублирует заголовок', () => {
    // До 20.09 здесь стояло ru: "Ещё рано" — дубль заголовка вместо требования.
    expect(source).toContain(
      'ru: `Пройди урок ${gateModal.prevNum} на 2.5+, чтобы открыть этот`',
    );
  });

  it('в message не осталось голого «Ещё рано» как текста требования', () => {
    // Берём именно блок message шторки замка: в файле есть другие message=,
    // и грубый indexOf хватал чужой участок вместе с заголовком.
    const choicesAt = source.indexOf('choices={');
    const messageAt = source.lastIndexOf('message={', choicesAt);
    const messageBlock = source.slice(messageAt, choicesAt);
    expect(messageBlock).not.toContain('ru: "Ещё рано"');
  });

  it('подсказка замка в Learning V2 тоже называет урок', () => {
    expect(source).toContain(
      'ru: `Пройди урок ${lessonOrdinal - 1}, чтобы открыть этот`',
    );
  });

  it('заголовок «Ещё рано» остаётся — он короткий и уместен', () => {
    expect(source).toContain('ru: "Ещё рано"');
  });
});

describe('модалка «Ещё рано»: кнопка покупки', () => {
  it('кнопка показывается НЕ только активному Plus', () => {
    // Голое `isPremium &&` делало уроки 2–3 тупиком для Free.
    expect(source).not.toContain(
      'isPremium && (gateModal?.kind === "lesson" || gateModal?.kind === "levelGate")',
    );
  });

  it('Free видит кнопку на уроке без пейвола', () => {
    expect(source).toContain(
      '(isPremium || (gateModal?.kind === "lesson" && !requiresPremiumForLesson(gateModal.lessonNum)))',
    );
  });

  it('кнопка называет действие и цену', () => {
    expect(source).toContain('ru: `Разблокировать · ${LESSON_PEARL_UNLOCK_PRICE}`');
  });
});
