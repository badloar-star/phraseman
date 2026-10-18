import fs from 'node:fs';
import path from 'node:path';

// зачем (Макеты, координатор 09:22, пункты 7/16/17): (7) плавающие «Тренировать» и «Без лимита с Plus» закрывали слово карточки в конце списка «Сохранённых» — нижний отступ списка под обе кнопки;
// (16) правильный ответ зелёным лежал на тёмно-красной плашке («сигналы спорят») — плашка зелёная; (17) тост «Бронзовая медаль» закрывал полосу прогресса урока — поднят над ней.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('перекрытия: список «Сохранённых», плашка правильного ответа, тост медали', () => {
  it('(7) галерея: при плавающей «Без лимита» нижний отступ списка 216 (150 + 66), последний ряд докручивается выше кнопок', () => {
    const gallery = read('app/flashcards/CollectionGalleryView.tsx');
    // Ревизор dcda1af2a: отступ считается от нижнего safe-area inset и высот плавающих кнопок, а не константой
    expect(gallery).toContain('const limitedListBottomPad = Math.max(150, Math.max(30, insets.bottom + 10) + 66 + 42 + 24);');
    expect(gallery).toContain('limitCta && !selectionMode && { paddingBottom: limitedListBottomPad }');
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
    expect(toast).toContain('bottom={212 + insets.bottom}');
  });
});

// зачем (координатор 18.10, решение по q_wrong_t06.png): монета по дуге через правый край экрана, не через центр с подсказкой; длительность и каскад прежние.
describe('полёт монеты не пересекает центр', () => {
  it('дуга выносится вправо (bulge·sin) до правого края окна; время полёта и каскад не менялись', () => {
    const coin = read('components/rewards/CoinRewardFlight.tsx');
    expect(coin).toContain('{ translateX: dx * p + bulge * Math.sin(Math.PI * p) },');
    expect(coin).toContain('const bulge = Math.max(0, Math.min(MAX_BULGE, windowWidth - EDGE_MARGIN - COIN_SIZE / 2 - midX));');
    expect(coin).toContain('const FLIGHT_MS = 620;');
    expect(coin).toContain('const STAGGER_MS = 90;');
  });
});
