import { buildTopicMap, summarizeTopicMap } from '../app/compass/compass_memory';
import type { CompassSnapshot } from '../app/compass/signal_bus';

function snap(partial: Partial<CompassSnapshot>): CompassSnapshot {
  return {
    mistakes: [],
    mistakesByLesson: {},
    trainer: null,
    posMastery: [],
    planDay: null,
    passedLessons: [],
    collectedAtMs: 1,
    ...partial,
  };
}

describe('compass_memory — карта тем', () => {
  it('высокий уровень без ошибок → уверенно', () => {
    const map = buildTopicMap(snap({ posMastery: [{ category: 'verb', level: 5 } as any] }));
    expect(map[0].status).toBe('confident');
    expect(map[0].progressPct).toBeGreaterThan(70);
  });

  it('низкий уровень → ведём сюда', () => {
    const map = buildTopicMap(snap({ posMastery: [{ category: 'article', level: 1 } as any] }));
    expect(map[0].status).toBe('guided');
  });

  it('средний уровень → крепнет', () => {
    const map = buildTopicMap(snap({ posMastery: [{ category: 'noun', level: 3 } as any] }));
    expect(map[0].status).toBe('growing');
  });

  it('высокий уровень, НО есть свежие ошибки по теме → всё равно ведём сюда', () => {
    const map = buildTopicMap(
      snap({
        posMastery: [{ category: 'preposition', level: 5 } as any],
        mistakes: [{ topCategory: 'preposition' } as any],
      }),
    );
    expect(map[0].status).toBe('guided');
  });

  it('слабые темы идут впереди (сначала ведём сюда)', () => {
    const map = buildTopicMap(
      snap({
        posMastery: [
          { category: 'verb', level: 5 } as any,
          { category: 'article', level: 1 } as any,
          { category: 'noun', level: 3 } as any,
        ],
      }),
    );
    expect(map[0].status).toBe('guided');
    expect(map[map.length - 1].status).toBe('confident');
  });

  it('сводка считает статусы', () => {
    const map = buildTopicMap(
      snap({
        posMastery: [
          { category: 'verb', level: 5 } as any,
          { category: 'article', level: 1 } as any,
        ],
      }),
    );
    const s = summarizeTopicMap(map);
    expect(s.total).toBe(2);
    expect(s.confident).toBe(1);
    expect(s.guided).toBe(1);
  });
});
