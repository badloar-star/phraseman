import { mergeBootRunesIntoProgress } from '../app/app_snapshot_bootstrap';

// зачем (пакет 10:26): руны досылаются патчем после публикации снимка — правила слияния обязаны остаться прежними:
// неизвестное не становится 0, свежее значение из памяти не занижается.
describe('mergeBootRunesIntoProgress', () => {
  it('runes unreadable and nothing in memory → stays unknown (never 0)', () => {
    expect(mergeBootRunesIntoProgress(undefined, null)).toEqual({ stars: undefined, starsEarnedTotal: undefined });
    expect(mergeBootRunesIntoProgress({}, null)).toEqual({ stars: undefined, starsEarnedTotal: undefined });
  });

  it('runes unreadable but memory knows → memory value kept', () => {
    expect(mergeBootRunesIntoProgress({ stars: 120, starsEarnedTotal: 900 }, null)).toEqual({ stars: 120, starsEarnedTotal: 900 });
  });

  it('disk vs memory → the larger wins (fresh spin grant is not lowered)', () => {
    expect(mergeBootRunesIntoProgress({ stars: 150, starsEarnedTotal: 900 }, { balance: 100, earnedTotal: 1000 }))
      .toEqual({ stars: 150, starsEarnedTotal: 1000 });
  });

  it('disk arrives on an empty snapshot → disk values', () => {
    expect(mergeBootRunesIntoProgress(undefined, { balance: 42, earnedTotal: 77 })).toEqual({ stars: 42, starsEarnedTotal: 77 });
  });
});
