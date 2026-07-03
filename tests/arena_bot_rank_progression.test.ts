import { computeBotMatchRankDelta } from '../app/arena_bot_profile_write';

// Бот-матчи считают ранг СВОЕЙ функцией (computeBotMatchRankDelta), отдельной от
// серверной applyStarDelta (functions/src/arena_rank_progression.ts). Эти тесты
// держат обе реализации в согласии — особенно на потолке Легенда III, где раньше
// победа в бот-матче откатывала игрока с Легенда III на Легенда I.

const WON = { won: true, isLast: false, isDraw: false };
const LOST = { won: false, isLast: true, isDraw: false };
const NEUTRAL = { won: false, isLast: false, isDraw: false };
const DRAW = { won: false, isLast: false, isDraw: true };

describe('computeBotMatchRankDelta — повышение (набор звёзд)', () => {
  it('копит звёзды внутри уровня без смены ранга', () => {
    expect(computeBotMatchRankDelta(0, 'bronze', 'I', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'bronze', newLevel: 'I', newStars: 1, rankChanged: false });
    expect(computeBotMatchRankDelta(1, 'bronze', 'I', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'bronze', newLevel: 'I', newStars: 2, rankChanged: false });
  });

  it('3-я звезда повышает уровень I→II и обнуляет звёзды', () => {
    expect(computeBotMatchRankDelta(2, 'bronze', 'I', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'bronze', newLevel: 'II', newStars: 0, rankChanged: true, promoted: true });
  });

  it('3-я звезда на III повышает до следующего ранга с уровня I', () => {
    expect(computeBotMatchRankDelta(2, 'bronze', 'III', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'silver', newLevel: 'I', newStars: 0, rankChanged: true, promoted: true });
    expect(computeBotMatchRankDelta(2, 'grandmaster', 'III', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'legend', newLevel: 'I', newStars: 0, rankChanged: true, promoted: true });
  });
});

describe('computeBotMatchRankDelta — потолок Легенда III (регрессия бага из content-репорта)', () => {
  // Раньше: победа на Легенда III откатывала на Легенда I. Теперь ранг не меняется.
  it('победа на Легенда III НЕ меняет ранг и держит звёзды на 2', () => {
    expect(computeBotMatchRankDelta(2, 'legend', 'III', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'legend', newLevel: 'III', newStars: 2, rankChanged: false, promoted: false });
  });

  it('повторные победы на Легенда III остаются на Легенда III', () => {
    let tier = 'legend';
    let level = 'III';
    let stars = 2;
    for (let i = 0; i < 5; i++) {
      const next = computeBotMatchRankDelta(stars, tier, level, WON.won, WON.isLast, WON.isDraw);
      expect(next).toMatchObject({ newTier: 'legend', newLevel: 'III', newStars: 2, rankChanged: false });
      tier = next.newTier;
      level = next.newLevel;
      stars = next.newStars;
    }
  });

  it('Легенда III сразу считается потолком: звёзды больше не двигаются, дальше работает SR', () => {
    expect(computeBotMatchRankDelta(0, 'legend', 'III', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'legend', newLevel: 'III', newStars: 0, rankChanged: false });
    expect(computeBotMatchRankDelta(1, 'legend', 'III', WON.won, WON.isLast, WON.isDraw))
      .toMatchObject({ newTier: 'legend', newLevel: 'III', newStars: 1, rankChanged: false });
  });
});

describe('computeBotMatchRankDelta — понижение (потеря звезды)', () => {
  it('уход ниже 0 понижает уровень II→I со звёздами=2', () => {
    expect(computeBotMatchRankDelta(0, 'gold', 'II', LOST.won, LOST.isLast, LOST.isDraw))
      .toMatchObject({ newTier: 'gold', newLevel: 'I', newStars: 2, rankChanged: true, promoted: false });
  });

  it('уход ниже 0 на уровне I понижает до предыдущего ранга, уровень III', () => {
    expect(computeBotMatchRankDelta(0, 'silver', 'I', LOST.won, LOST.isLast, LOST.isDraw))
      .toMatchObject({ newTier: 'bronze', newLevel: 'III', newStars: 2, rankChanged: true, promoted: false });
  });

  it('пол Бронза I: поражение НЕ меняет ранг и держит звёзды на 0', () => {
    expect(computeBotMatchRankDelta(0, 'bronze', 'I', LOST.won, LOST.isLast, LOST.isDraw))
      .toMatchObject({ newTier: 'bronze', newLevel: 'I', newStars: 0, rankChanged: false });
  });
});

describe('computeBotMatchRankDelta — ничья и нейтральный исход', () => {
  it('ничья не меняет звёзды и ранг даже на потолке', () => {
    expect(computeBotMatchRankDelta(2, 'legend', 'III', DRAW.won, DRAW.isLast, DRAW.isDraw))
      .toMatchObject({ newTier: 'legend', newLevel: 'III', newStars: 2, rankChanged: false });
  });

  it('не последний и не победитель — звёзды не меняются', () => {
    expect(computeBotMatchRankDelta(1, 'gold', 'II', NEUTRAL.won, NEUTRAL.isLast, NEUTRAL.isDraw))
      .toMatchObject({ newTier: 'gold', newLevel: 'II', newStars: 1, rankChanged: false });
  });
});
