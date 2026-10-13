// зачем (Макеты 13.10, cards-v2-051/052): в «Ошибки N» число и список совпадают — у «Хорошего результата» 8 ошибок, у «Есть куда расти» 14.
import { DEV_CARDS_RESULT_STATES, devCardsResultFixture } from '../app/flashcards/dev_cards_result_fixture';

describe('превью итога Карточек: число ошибок равно длине списка', () => {
  it('для каждого состояния wrong === mistakes.length', () => {
    for (const state of DEV_CARDS_RESULT_STATES) {
      const fixture = devCardsResultFixture(state);
      expect(fixture.mistakes).toHaveLength(fixture.wrong);
    }
  });

  it('good — 8, grow — 14, errors — Gate и Customs, clean — пусто; id различны', () => {
    expect(devCardsResultFixture('good').mistakes).toHaveLength(8);
    expect(devCardsResultFixture('grow').mistakes).toHaveLength(14);
    expect(devCardsResultFixture('errors').mistakes.map((m) => m.en)).toEqual(['Gate', 'Customs']);
    expect(devCardsResultFixture('clean').mistakes).toEqual([]);
    const ids = devCardsResultFixture('grow').mistakes.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
