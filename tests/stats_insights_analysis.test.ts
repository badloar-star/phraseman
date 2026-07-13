import {
  buildStatsInsightAnalysis,
  type StatsInsightsSnapshot,
} from '../app/stats_insights_analysis';

const snapshot = (overrides: Partial<StatsInsightsSnapshot> = {}): StatsInsightsSnapshot => ({
  lang: 'ru',
  studyTarget: 'en',
  week: {
    activeDays7: 4,
    minutes7: 80,
    xp7: 900,
    previousMinutes7: 40,
    bestDayLabel: 'Среда',
    dailyMinutes7: [0, 10, 20, 30, 20, 0, 0],
  },
  longTerm: {
    activeDays365: 120,
    currentStreak: 8,
    longestStreak: 21,
    bestMonthLabel: 'Май',
    last30ActiveDays: 18,
    previous30ActiveDays: 12,
    goalPct: 64,
  },
  comparison: {
    sample: {
      status: 'available',
      userTotalXp: 8000,
      minimumSampleXp: 5000,
      totalUsers: 1200,
      updatedAtMs: 123456789,
      isStale: false,
    },
    totalXpPercentile: 72,
    daily7XpPercentile: 67,
    daily7TimePercentile: 55,
  },
  lifetime: { words: 320, phrases: 140, quizzes: 20, arenaWins: 4, daysActive: 150 },
  weakCategories: [{ label: 'Предлоги', pct: 43 }],
  ...overrides,
});

describe('buildStatsInsightAnalysis', () => {
  test('explains an unavailable comparison as temporary, not as insufficient user data', () => {
    const input = snapshot({
      comparison: {
        sample: { status: 'unavailable', userTotalXp: 0, minimumSampleXp: 5000, totalUsers: 0, updatedAtMs: null, isStale: false },
        totalXpPercentile: null,
        daily7XpPercentile: null,
        daily7TimePercentile: null,
      },
    });

    const comparison = buildStatsInsightAnalysis(input).blocks.comparison;
    expect(comparison.fallback.ru).toMatch(/временно недоступно/i);
    expect(comparison.fallback.ru).not.toMatch(/мало данных|больше объ[её]ма/i);
    expect(comparison.allowedClaim).toMatch(/temporarily unavailable/i);
  });

  test('states the exact verified progress toward the comparison floor', () => {
    const input = snapshot({
      comparison: {
        sample: { status: 'below_sample_floor', userTotalXp: 4200, minimumSampleXp: 5000, totalUsers: 1200, updatedAtMs: 100, isStale: false },
        totalXpPercentile: null,
        daily7XpPercentile: null,
        daily7TimePercentile: null,
      },
    });

    const comparison = buildStatsInsightAnalysis(input).blocks.comparison;
    expect(comparison.facts).toEqual(expect.arrayContaining([4200, 5000]));
    expect(comparison.fallback.ru).toContain('4200');
    expect(comparison.fallback.ru).toContain('5000');
    expect(comparison.fallback.ru).toContain('800');
    expect(comparison.fallback.ru).not.toMatch(/процентил|место/i);
  });

  test('keeps a below-median available sample out of insufficient-data wording', () => {
    const input = snapshot({
      comparison: {
        sample: { status: 'available', userTotalXp: 8000, minimumSampleXp: 5000, totalUsers: 900, updatedAtMs: 100, isStale: false },
        totalXpPercentile: 49,
        daily7XpPercentile: 42,
        daily7TimePercentile: null,
      },
    });

    const comparison = buildStatsInsightAnalysis(input).blocks.comparison;
    expect(comparison.id).toContain('available-hidden');
    expect(comparison.fallback.ru).not.toMatch(/мало данных|недостаточно|место|процентил/i);
    expect(comparison.allowedClaim).toMatch(/own dynamics/i);
  });

  test('uses a verified best month when it is the strongest long-term candidate', () => {
    const input = snapshot({
      longTerm: {
        activeDays365: 15,
        currentStreak: 0,
        longestStreak: 0,
        bestMonthLabel: 'Май',
        last30ActiveDays: 4,
        previous30ActiveDays: null,
        goalPct: 12,
      },
    });

    const longTerm = buildStatsInsightAnalysis(input).blocks.longTerm;
    expect(longTerm.id).toContain('best-month');
    expect(longTerm.facts).toContain('Май');
    expect(longTerm.fallback.ru).toContain('Май');
  });

  test('does not invent trends when previous periods are null', () => {
    const input = snapshot({
      week: { activeDays7: 1, minutes7: 12, xp7: 50, previousMinutes7: null, bestDayLabel: null, dailyMinutes7: [12, 0, 0, 0, 0, 0, 0] },
      longTerm: { activeDays365: 1, currentStreak: 0, longestStreak: 0, bestMonthLabel: null, last30ActiveDays: 1, previous30ActiveDays: null, goalPct: 1 },
    });

    const result = buildStatsInsightAnalysis(input);
    expect(result.blocks.week.id).not.toContain('trend');
    expect(result.blocks.longTerm.id).not.toContain('trend');
    expect(result.blocks.week.allowedClaim).not.toMatch(/increase|decrease/i);
    expect(result.blocks.longTerm.allowedClaim).not.toMatch(/increase|decrease/i);
  });

  test('returns the same fingerprint for the same semantic snapshot', () => {
    const first = buildStatsInsightAnalysis(snapshot());
    const reordered = JSON.parse(JSON.stringify(snapshot())) as StatsInsightsSnapshot;
    expect(buildStatsInsightAnalysis(reordered).fingerprint).toBe(first.fingerprint);
  });

  test('always returns four observations with unique ids', () => {
    const result = buildStatsInsightAnalysis(snapshot());
    const ids = Object.values(result.blocks).map((item) => item.id);
    expect(Object.keys(result.blocks)).toEqual(['week', 'longTerm', 'comparison', 'lifetime']);
    expect(new Set(ids).size).toBe(4);
    expect(result.generatedFromCompleteSnapshot).toBe(true);
  });

  test('rotates week emphasis when another verified candidate exists', () => {
    const first = buildStatsInsightAnalysis(snapshot());
    const second = buildStatsInsightAnalysis(snapshot(), [first.blocks.week.id]);
    expect(second.blocks.week.id).not.toBe(first.blocks.week.id);
    expect(second.blocks.week.block).toBe('week');
  });

  test('returns four honest fallbacks for an empty account', () => {
    const input = snapshot({
      week: { activeDays7: 0, minutes7: 0, xp7: 0, previousMinutes7: null, bestDayLabel: null, dailyMinutes7: [0, 0, 0, 0, 0, 0, 0] },
      longTerm: { activeDays365: 0, currentStreak: 0, longestStreak: 0, bestMonthLabel: null, last30ActiveDays: 0, previous30ActiveDays: null, goalPct: 0 },
      comparison: {
        sample: { status: 'below_sample_floor', userTotalXp: 0, minimumSampleXp: 5000, totalUsers: 1200, updatedAtMs: null, isStale: false },
        totalXpPercentile: null,
        daily7XpPercentile: null,
        daily7TimePercentile: null,
      },
      lifetime: { words: 0, phrases: 0, quizzes: 0, arenaWins: 0, daysActive: 0 },
      weakCategories: [],
    });

    const result = buildStatsInsightAnalysis(input);
    expect(Object.values(result.blocks)).toHaveLength(4);
    expect(result.blocks.week.fallback.ru).toMatch(/пока нет|перв/i);
    expect(result.blocks.longTerm.fallback.ru).toMatch(/перв/i);
    expect(result.blocks.lifetime.fallback.ru).toMatch(/перв/i);
    expect(Object.values(result.blocks).map((item) => item.fallback.ru).join(' ')).not.toMatch(/NaN|undefined|null/);
  });

  test('does not mutate the input while normalizing hostile values', () => {
    const input = snapshot({
      week: { activeDays7: -4, minutes7: -1, xp7: -2, previousMinutes7: -3, bestDayLabel: ' X '.repeat(200), dailyMinutes7: [-1, 2, Number.NaN] as number[] },
      weakCategories: [{ label: ' A '.repeat(100), pct: 400 }, { label: 'B', pct: -2 }, { label: 'C', pct: 30 }, { label: 'D', pct: 40 }],
    });
    const before = input.week.bestDayLabel;
    const categoriesBefore = input.weakCategories.length;

    buildStatsInsightAnalysis(input);

    expect(input.week.bestDayLabel).toBe(before);
    expect(input.weakCategories).toHaveLength(categoriesBefore);
    expect(input.week.dailyMinutes7).toHaveLength(3);
  });

  test('uses the requested non-Russian language for fallbacks', () => {
    const input = snapshot({
      lang: 'es',
      week: { activeDays7: 0, minutes7: 0, xp7: 0, previousMinutes7: null, bestDayLabel: null, dailyMinutes7: [0, 0, 0, 0, 0, 0, 0] },
    });

    expect(buildStatsInsightAnalysis(input).blocks.week.fallback.es).toMatch(/primera|semana|actividad/i);
  });
});
