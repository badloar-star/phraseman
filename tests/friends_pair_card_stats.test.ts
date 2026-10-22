/**
 * pair_card_stats.ts — какие числа показать на визитке друга (идея 1, макет friends-full.html «Визитка»).
 */
import { friendCardCells } from '../app/friends_together/pair_card_stats';

describe('friendCardCells', () => {
  it('три числа с подписями, склонение по числу', () => {
    expect(friendCardCells({ streak: 48, spireFloor: 7, daysTogether: 12 }, 'ru')).toEqual([
      { key: 'streak', value: 48, label: 'дней серии' },
      { key: 'spire', value: 7, label: 'этаж Пика' },
      { key: 'together', value: 12, label: 'дней вдвоём' },
    ]);
    expect(friendCardCells({ streak: 1, spireFloor: null, daysTogether: 2 }, 'ru').map((c) => c.label)).toEqual(['день серии', 'дня вдвоём']);
  });

  it('чисел без данных не выдумывает — ячейки нет', () => {
    expect(friendCardCells({ streak: null, spireFloor: 3, daysTogether: null }, 'ru').map((c) => c.key)).toEqual(['spire']);
  });

  it('нет ни одного числа — блока нет', () => {
    expect(friendCardCells({ streak: null, spireFloor: null, daysTogether: null }, 'ru')).toEqual([]);
  });

  it('ноль — это число, а не «нет данных»', () => {
    expect(friendCardCells({ streak: 0, spireFloor: 0, daysTogether: 0 }, 'ru').map((c) => c.value)).toEqual([0, 0, 0]);
  });
});
