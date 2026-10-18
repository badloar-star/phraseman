import fs from 'node:fs';
import path from 'node:path';

// зачем (Макеты, координатор 09:22, пункты 7/16/17): (7) плавающие «Тренировать» и «Без лимита с Plus» закрывали слово карточки в конце списка «Сохранённых» — нижний отступ списка под обе кнопки;
// (16) правильный ответ зелёным лежал на тёмно-красной плашке («сигналы спорят») — плашка зелёная; (17) тост «Бронзовая медаль» закрывал полосу прогресса урока — поднят над ней.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('перекрытия: список «Сохранённых», плашка правильного ответа, тост медали', () => {
  it('(7) галерея: при плавающей «Без лимита» нижний отступ списка 216 (150 + 66), последний ряд докручивается выше кнопок', () => {
    const gallery = read('app/flashcards/CollectionGalleryView.tsx');
    expect(gallery).toContain('contentLimit: { paddingBottom: 216 }');
    expect(gallery).toContain('limitCta && !selectionMode && styles.contentLimit');
    expect(gallery).toContain('(limitCta ? 66 : 0)'); // пилюля «Тренировать» поднята на высоту limitBar — отступ считан от этого значения
  });

  it('(16) урок: плашка правильного ответа зелёная (correctBg), красной подложки под зелёным текстом нет', () => {
    const lesson = read('app/lesson1.tsx');
    const start = lesson.indexOf('testID="lesson1-correct-answer-on-wrong"');
    const plate = lesson.slice(start - 420, start);
    expect(plate).toContain('backgroundColor: t.correctBg');
    expect(plate).not.toContain('t.wrongBg');
  });

  it('(17) урок: тост медали стоит над полосой прогресса и рядом кнопок (низ 236, не 120)', () => {
    const lesson = read('app/lesson1.tsx');
    const toast = lesson.slice(lesson.indexOf('<MedalToast'), lesson.indexOf('onDismiss={dismissMedalToast}'));
    expect(toast).toContain('bottom={236}');
  });
});
