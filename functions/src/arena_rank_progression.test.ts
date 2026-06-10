import { applyStarDelta, isPromotion } from './arena_rank_progression';

describe('applyStarDelta — повышение (набор звёзд)', () => {
  it('копит звёзды внутри уровня без смены ранга', () => {
    expect(applyStarDelta({ tier: 'bronze', level: 'I', stars: 0 }, +1))
      .toEqual({ tier: 'bronze', level: 'I', stars: 1 });
    expect(applyStarDelta({ tier: 'bronze', level: 'I', stars: 1 }, +1))
      .toEqual({ tier: 'bronze', level: 'I', stars: 2 });
  });

  it('3-я звезда повышает уровень I→II и обнуляет звёзды', () => {
    expect(applyStarDelta({ tier: 'bronze', level: 'I', stars: 2 }, +1))
      .toEqual({ tier: 'bronze', level: 'II', stars: 0 });
  });

  it('3-я звезда на уровне II повышает до III', () => {
    expect(applyStarDelta({ tier: 'gold', level: 'II', stars: 2 }, +1))
      .toEqual({ tier: 'gold', level: 'III', stars: 0 });
  });

  it('3-я звезда на III повышает до следующего ранга с уровня I', () => {
    expect(applyStarDelta({ tier: 'bronze', level: 'III', stars: 2 }, +1))
      .toEqual({ tier: 'silver', level: 'I', stars: 0 });
    expect(applyStarDelta({ tier: 'grandmaster', level: 'III', stars: 2 }, +1))
      .toEqual({ tier: 'legend', level: 'I', stars: 0 });
  });
});

describe('applyStarDelta — потолок Легенда III (регрессия бага)', () => {
  // Раньше: Легенда III + победа откатывала на Легенда I. Теперь ранг не меняется.
  it('победа на Легенда III НЕ меняет ранг и держит звёзды на 2', () => {
    expect(applyStarDelta({ tier: 'legend', level: 'III', stars: 2 }, +1))
      .toEqual({ tier: 'legend', level: 'III', stars: 2 });
  });

  it('повторные победы на Легенда III остаются на Легенда III', () => {
    let rank = { tier: 'legend', level: 'III', stars: 2 } as const;
    for (let i = 0; i < 5; i++) {
      const next = applyStarDelta(rank, +1);
      expect(next).toEqual({ tier: 'legend', level: 'III', stars: 2 });
      rank = next as typeof rank;
    }
  });

  it('Легенда III с 0–1 звездой копит звёзды как обычно', () => {
    expect(applyStarDelta({ tier: 'legend', level: 'III', stars: 0 }, +1))
      .toEqual({ tier: 'legend', level: 'III', stars: 1 });
    expect(applyStarDelta({ tier: 'legend', level: 'III', stars: 1 }, +1))
      .toEqual({ tier: 'legend', level: 'III', stars: 2 });
  });
});

describe('applyStarDelta — понижение (потеря звезды)', () => {
  it('уход ниже 0 понижает уровень II→I со звёздами=2', () => {
    expect(applyStarDelta({ tier: 'gold', level: 'II', stars: 0 }, -1))
      .toEqual({ tier: 'gold', level: 'I', stars: 2 });
  });

  it('уход ниже 0 на уровне I понижает до предыдущего ранга, уровень III', () => {
    expect(applyStarDelta({ tier: 'silver', level: 'I', stars: 0 }, -1))
      .toEqual({ tier: 'bronze', level: 'III', stars: 2 });
  });

  it('пол Бронза I: поражение НЕ меняет ранг и держит звёзды на 0', () => {
    expect(applyStarDelta({ tier: 'bronze', level: 'I', stars: 0 }, -1))
      .toEqual({ tier: 'bronze', level: 'I', stars: 0 });
  });
});

describe('applyStarDelta — ничья и нулевая дельта', () => {
  it('starDelta=0 не меняет ничего', () => {
    expect(applyStarDelta({ tier: 'master', level: 'II', stars: 1 }, 0))
      .toEqual({ tier: 'master', level: 'II', stars: 1 });
  });
});

describe('applyStarDelta — устойчивость к мусорным входным данным', () => {
  it('неизвестный tier откатывается на bronze', () => {
    expect(applyStarDelta({ tier: 'unknown', level: 'I', stars: 0 }, +1))
      .toEqual({ tier: 'bronze', level: 'I', stars: 1 });
  });
  it('неизвестный level откатывается на I', () => {
    expect(applyStarDelta({ tier: 'gold', level: 'IV', stars: 2 }, +1))
      .toEqual({ tier: 'gold', level: 'II', stars: 0 });
  });
  it('NaN звёзды трактуются как 0', () => {
    expect(applyStarDelta({ tier: 'gold', level: 'I', stars: NaN }, +1))
      .toEqual({ tier: 'gold', level: 'I', stars: 1 });
  });
});

describe('isPromotion', () => {
  it('повышение по tier', () => {
    expect(isPromotion({ tier: 'bronze', level: 'III' }, { tier: 'silver', level: 'I' })).toBe(true);
  });
  it('повышение по level в том же tier', () => {
    expect(isPromotion({ tier: 'gold', level: 'I' }, { tier: 'gold', level: 'II' })).toBe(true);
  });
  it('понижение — не повышение', () => {
    expect(isPromotion({ tier: 'silver', level: 'I' }, { tier: 'bronze', level: 'III' })).toBe(false);
  });
  it('без изменений — не повышение', () => {
    expect(isPromotion({ tier: 'legend', level: 'III' }, { tier: 'legend', level: 'III' })).toBe(false);
  });
});
