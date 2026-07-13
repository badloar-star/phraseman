import { pickPercentileLine } from '../app/paywall_percentile_line';
import { MIN_PERCENTILE_SAMPLE_XP, type AllPercentiles } from '../app/leaderboard_stats';

function makePercentiles(over: Partial<AllPercentiles> = {}): AllPercentiles {
  return {
    xp: null,
    streak: null,
    weekXp: null,
    daily7xp: null,
    daily7timeMs: null,
    arenaXp: null,
    totalUsers: 1000,
    sample: {
      status: 'unavailable',
      userTotalXp: 0,
      minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
      totalUsers: 0,
      updatedAtMs: null,
      isStale: false,
    },
    ...over,
  };
}

describe('paywall_percentile_line — pickPercentileLine', () => {
  it('возвращает null если перцентили не загружены', () => {
    expect(pickPercentileLine('streak', null, { streak: 12 }, 'ru')).toBeNull();
  });

  it('молчит для low-performer (перцентиль ниже порога видимости)', () => {
    const p = makePercentiles({ streak: 30 }); // < 50
    expect(pickPercentileLine('streak', p, { streak: 12 }, 'ru')).toBeNull();
  });

  it('для контекста streak возвращает строку при хорошем streak-перцентиле', () => {
    const p = makePercentiles({ streak: 81 });
    const line = pickPercentileLine('streak', p, { streak: 12 }, 'ru');
    expect(line).toContain('81');
    expect(line).toContain('12'); // упоминает текущую серию
  });

  it('не показывает streak-строку при нулевой серии (нечем гордиться)', () => {
    const p = makePercentiles({ streak: 81 });
    expect(pickPercentileLine('streak', p, { streak: 0 }, 'ru')).toBeNull();
  });

  it('для intro_ended использует weekXp-перцентиль', () => {
    const p = makePercentiles({ weekXp: 75 });
    const line = pickPercentileLine('intro_ended', p, { streak: 3 }, 'ru');
    expect(line).not.toBeNull();
    // top-(100-75)=25
    expect(line).toContain('25');
  });

  it('для нерелевантного контекста возвращает null', () => {
    const p = makePercentiles({ streak: 90, weekXp: 90 });
    expect(pickPercentileLine('theme', p, { streak: 12 }, 'ru')).toBeNull();
  });

  it('поддерживает локализацию (es отличается от ru)', () => {
    const p = makePercentiles({ streak: 81 });
    const ru = pickPercentileLine('streak', p, { streak: 12 }, 'ru');
    const es = pickPercentileLine('streak', p, { streak: 12 }, 'es');
    expect(ru).not.toEqual(es);
  });

  it('поддерживает planned locale ветки без русского fallback', () => {
    const p = makePercentiles({ weekXp: 75 });
    const pt = pickPercentileLine('intro_ended', p, { streak: 3 }, 'pt-BR');
    const pl = pickPercentileLine('intro_ended', p, { streak: 3 }, 'pl');

    expect(pt).toContain('top-25%');
    expect(pt).toContain('alunos');
    expect(pl).toContain('top-25%');
    expect(pl).toContain('uczniów');
  });
});
