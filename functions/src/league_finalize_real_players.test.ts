import { computeGroupResults } from './league_finalize_cron';

describe('legacy league weekly result uses only real players', () => {
  it('ignores old synthetic members in totals, rank and promotion zones', () => {
    const result = computeGroupResults({
      alice: { uid: 'alice', points: 8 },
      bob: { uid: 'bob', points: 0 },
      res_00: { uid: 'res_00', points: 100 },
      bot_42: { uid: 'bot_42', isBot: true, points: 90 },
    }, 4, { enabled: false, threshold: 1000 });
    expect(Object.keys(result).sort()).toEqual(['alice', 'bob']);
    expect(result.alice).toMatchObject({ rank: 1, total: 2, promoted: true });
    expect(result.bob).toMatchObject({ rank: 2, total: 2, demoted: true });
  });
});
