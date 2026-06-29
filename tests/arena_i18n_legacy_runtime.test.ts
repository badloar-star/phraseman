import { arenaBilingualFirst } from '../constants/arena_i18n';

describe('arena i18n legacy runtime fallbacks', () => {
  it('localizes stale EN/UK arena questions for Russian UI', () => {
    const staleQuestion = "Which verb means 'to enter a bus or a train'? / Яке дієслово означає 'зайти в автобус або поїзд'?";

    expect(arenaBilingualFirst(staleQuestion, 'ru')).toBe("Какой глагол означает 'сесть в автобус или поезд'?");
    expect(arenaBilingualFirst(staleQuestion, 'uk')).toBe("Яке дієслово означає 'зайти в автобус або поїзд'?");
  });
});
