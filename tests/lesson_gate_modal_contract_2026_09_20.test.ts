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
      // зачем: D71 — порог 2 звезды; формулировка по образцу learn.html gateLesson (R1 learn-011, 13.10)
      'ru: `Чтобы открыть этот урок, пройди урок ${gateModal.prevNum} на 2★.`',
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

// зачем: D107/D70 — покупка урока за жемчуг удалена целиком; сторож держит, что кнопка не вернулась
describe('модалка «Ещё рано»: кнопки покупки нет', () => {
  it('ни покупки, ни цены, ни «Разблокировать · N» в экране', () => {
    expect(source).not.toContain('Разблокировать · ');
    expect(source).not.toContain('LESSON_PEARL_UNLOCK_PRICE');
    expect(source).not.toContain('buyLessonWithPearls');
    expect(source).not.toContain('buyLessonUnlock');
  });
});
