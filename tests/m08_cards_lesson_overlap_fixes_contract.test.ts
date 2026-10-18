import fs from 'node:fs';
import path from 'node:path';

import { COIN_SIZE, EDGE_MARGIN, MAX_BULGE, coinFlightBulge } from '../components/rewards/coin_flight_bulge';

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
    expect(coin).toContain('const bulge = coinFlightBulge(from.x, to.x - from.x, windowWidth);');
    expect(coin).toContain('const FLIGHT_MS = 620;');
    expect(coin).toContain('const STAGGER_MS = 90;');
  });

  // зачем (Ревизор eb6f98f9f 🟡): крайняя правая точка пути приходится позже середины — проверяем по всему пути, что монета не выходит за край окна.
  it('вынос дуги по всему пути не выводит монету за правый край окна', () => {
    for (const [fromX, toX, width] of [[40, 330, 390], [200, 340, 390], [300, 360, 390], [20, 60, 360], [350, 120, 390]] as const) {
      const dx = toX - fromX;
      const bulge = coinFlightBulge(fromX, dx, width);
      expect(bulge).toBeGreaterThanOrEqual(0);
      expect(bulge).toBeLessThanOrEqual(MAX_BULGE);
      for (let i = 0; i <= 200; i += 1) {
        const p = i / 200;
        const x = fromX + dx * p + bulge * Math.sin(Math.PI * p);
        expect(x + COIN_SIZE / 2).toBeLessThanOrEqual(width - EDGE_MARGIN + 1); // допуск 1 px между точками выборки
      }
    }
  });
});
