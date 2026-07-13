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

  test('uses own pace when an available sample has no numeric percentiles', () => {
    const input = snapshot({
      comparison: {
        sample: { status: 'available', userTotalXp: 8000, minimumSampleXp: 5000, totalUsers: 900, updatedAtMs: 100, isStale: false },
        totalXpPercentile: null,
        daily7XpPercentile: null,
        daily7TimePercentile: null,
      },
    });

    const comparison = buildStatsInsightAnalysis(input).blocks.comparison;
    expect(comparison.id).toContain('available-own-pace');
    expect(comparison.fallback.ru).toMatch(/собственн.*ритм/i);
    expect(comparison.fallback.ru).not.toMatch(/место|процентил|мало данных|недостаточно/i);
    expect(comparison.allowedClaim).toMatch(/no numeric percentile/i);
  });

  test('selects the best visible percentile with cohort size and freshness facts', () => {
    const input = snapshot({
      comparison: {
        sample: { status: 'available', userTotalXp: 8000, minimumSampleXp: 5000, totalUsers: 2345, updatedAtMs: 987654321, isStale: true },
        totalXpPercentile: 60,
        daily7XpPercentile: 82,
        daily7TimePercentile: 71,
      },
    });

    const comparison = buildStatsInsightAnalysis(input).blocks.comparison;
    expect(comparison.id).toContain('seven-day-XP');
    expect(comparison.facts).toEqual(expect.arrayContaining([82, 2345, 'stored']));
    expect(comparison.facts).not.toContain(60);
    expect(comparison.facts).not.toContain(71);
    expect(comparison.fallback.ru).toMatch(/82.*2345|2345.*82/);
    expect(comparison.fallback.ru).toMatch(/не свеж/i);
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

  test.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'does not invent trends from invalid previous-period value %p',
    (invalidPrevious) => {
      const input = snapshot({
        week: { activeDays7: 4, minutes7: 80, xp7: 500, previousMinutes7: invalidPrevious, bestDayLabel: null, dailyMinutes7: [10, 20, 20, 30, 0, 0, 0] },
        longTerm: { activeDays365: 40, currentStreak: 4, longestStreak: 12, bestMonthLabel: null, last30ActiveDays: 18, previous30ActiveDays: invalidPrevious, goalPct: 30 },
      });

      const result = buildStatsInsightAnalysis(input);
      expect(result.blocks.week.id).not.toContain('trend');
      expect(result.blocks.week.allowedClaim).not.toMatch(/increase|decrease/i);
      expect(result.blocks.longTerm.id).not.toContain('trend');
      expect(result.blocks.longTerm.allowedClaim).not.toMatch(/increase|decrease/i);
    },
  );

  test('does not clamp an out-of-range previous 30-day period into a trend fact', () => {
    const input = snapshot({
      longTerm: { activeDays365: 40, currentStreak: 4, longestStreak: 12, bestMonthLabel: null, last30ActiveDays: 18, previous30ActiveDays: 31, goalPct: 30 },
    });

    const longTerm = buildStatsInsightAnalysis(input).blocks.longTerm;
    expect(longTerm.id).not.toContain('trend');
    expect(longTerm.allowedClaim).not.toMatch(/increase|decrease/i);
    expect(longTerm.facts).not.toEqual(expect.arrayContaining([18, 30]));
    expect(`${longTerm.facts.join(' ')} ${longTerm.fallback.ru}`).not.toContain('31');
  });

  test('does not clamp oversized previous weekly minutes into a trend fact', () => {
    const oversizedPrevious = 1_000_000_001;
    const input = snapshot({
      week: { activeDays7: 4, minutes7: 80, xp7: 500, previousMinutes7: oversizedPrevious, bestDayLabel: null, dailyMinutes7: [10, 20, 20, 30, 0, 0, 0] },
    });

    const week = buildStatsInsightAnalysis(input).blocks.week;
    expect(week.id).not.toContain('trend');
    expect(week.allowedClaim).not.toMatch(/increase|decrease/i);
    expect(week.facts).not.toContain(1_000_000_000);
    expect(`${week.facts.join(' ')} ${week.fallback.ru}`).not.toContain(String(oversizedPrevious));
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

  test('keeps the default highest-priority selection when no policy is supplied', () => {
    const result = buildStatsInsightAnalysis(snapshot());

    expect(result.blocks.week.id).toBe('week.minutes-trend-up');
    expect(result.blocks.longTerm.id).toBe('longTerm.active-days-trend-up');
    expect(result.blocks.comparison.id).toBe('comparison.verified-total-XP');
    expect(result.blocks.lifetime.id).toBe('lifetime.weak-category');
  });

  test('recreates an earlier rotated selection from preferred observation ids', () => {
    const input = snapshot();
    const defaults = buildStatsInsightAnalysis(input);
    const defaultIds = Object.values(defaults.blocks).map((block) => block.id);
    const rotated = buildStatsInsightAnalysis(input, { previousObservationIds: defaultIds });
    const rotatedIds = Object.values(rotated.blocks).map((block) => block.id);

    const restored = buildStatsInsightAnalysis(input, { preferredObservationIds: rotatedIds });

    expect(Object.values(restored.blocks).map((block) => block.id)).toEqual(rotatedIds);
    expect(restored.fingerprint).toBe(rotated.fingerprint);
  });

  test('rotates at a new window when previous observation ids are supplied as options', () => {
    const first = buildStatsInsightAnalysis(snapshot());
    const second = buildStatsInsightAnalysis(snapshot(), {
      previousObservationIds: [first.blocks.week.id],
    });

    expect(second.blocks.week.id).not.toBe(first.blocks.week.id);
    expect(second.blocks.week.block).toBe('week');
  });

  test('falls back safely when preferred observation ids are stale or unavailable', () => {
    const expected = buildStatsInsightAnalysis(snapshot());
    const actual = buildStatsInsightAnalysis(snapshot(), {
      preferredObservationIds: ['week.removed-candidate', 'lifetime.no-longer-valid'],
    });

    expect(actual).toEqual(expected);
  });

  test('does not use a preferred id from one block for another block', () => {
    const input = snapshot();
    const defaults = buildStatsInsightAnalysis(input);
    const rotatedWeek = buildStatsInsightAnalysis(input, [defaults.blocks.week.id]).blocks.week;

    const result = buildStatsInsightAnalysis(input, {
      preferredObservationIds: [defaults.blocks.longTerm.id, rotatedWeek.id],
    });

    expect(result.blocks.week.id).toBe(rotatedWeek.id);
    expect(result.blocks.longTerm.id).toBe(defaults.blocks.longTerm.id);
    expect(result.blocks.week.block).toBe('week');
    expect(result.blocks.longTerm.block).toBe('longTerm');
  });

  test('does not mutate selection policy arrays or options', () => {
    const defaults = buildStatsInsightAnalysis(snapshot());
    const preferredObservationIds = [defaults.blocks.week.id];
    const previousObservationIds = [defaults.blocks.longTerm.id];
    const policy = { preferredObservationIds, previousObservationIds };
    const before = JSON.parse(JSON.stringify(policy));

    buildStatsInsightAnalysis(snapshot(), policy);

    expect(policy).toEqual(before);
  });

  test('selects a direct lifetime milestone when no weak category is available', () => {
    const input = snapshot({
      lifetime: { words: 640, phrases: 120, quizzes: 30, arenaWins: 3, daysActive: 90 },
      weakCategories: [],
    });

    const lifetime = buildStatsInsightAnalysis(input).blocks.lifetime;
    expect(lifetime.id).toContain('milestone-words');
    expect(lifetime.facts).toEqual(expect.arrayContaining(['words', 640]));
    expect(lifetime.fallback.ru).toMatch(/640.*слова/i);
  });

  test('uses category thresholds instead of comparing unrelated lifetime units', () => {
    const input = snapshot({
      lifetime: { words: 5, phrases: 500, quizzes: 1000, arenaWins: 1000, daysActive: 365 },
      weakCategories: [],
    });

    const lifetime = buildStatsInsightAnalysis(input).blocks.lifetime;
    expect(lifetime.id).toContain('milestone-phrases-500');
    expect(lifetime.facts).toEqual(expect.arrayContaining(['phrases', 500]));
    expect(lifetime.allowedClaim).toMatch(/verified lifetime milestone/i);
    expect(`${lifetime.allowedClaim} ${lifetime.fallback.ru}`).not.toMatch(/largest|biggest|most|крупн|наибольш|сам(?:ый|ая|ое)/i);
  });

  test('selects and rotates a valid weak-category improvement without duplicate identity or claim', () => {
    const input = snapshot({
      lifetime: { words: 640, phrases: 120, quizzes: 30, arenaWins: 3, daysActive: 90 },
      weakCategories: [{ label: 'Предлоги', pct: 43 }],
    });

    const first = buildStatsInsightAnalysis(input).blocks.lifetime;
    const rotated = buildStatsInsightAnalysis(input, [first.id]).blocks.lifetime;
    expect(first.id).toContain('weak-category');
    expect(first.facts).toEqual(expect.arrayContaining(['Предлоги', 43]));
    expect(rotated.id).toContain('milestone-words');
    expect(rotated.id).not.toBe(first.id);
    expect(rotated.allowedClaim).not.toBe(first.allowedClaim);
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

  test('does not mutate valid input while filtering hostile optional values', () => {
    const input = snapshot({
      week: { activeDays7: 4, minutes7: 80, xp7: 500, previousMinutes7: -3, bestDayLabel: ' X '.repeat(200), dailyMinutes7: [10, 20, 20, 30, 0, 0, 0] },
      weakCategories: [{ label: ' A '.repeat(100), pct: 400 }, { label: 'B', pct: -2 }, { label: 'C', pct: 30 }, { label: 'D', pct: 40 }],
    });
    const before = input.week.bestDayLabel;
    const categoriesBefore = input.weakCategories.length;

    buildStatsInsightAnalysis(input);

    expect(input.week.bestDayLabel).toBe(before);
    expect(input.weakCategories).toHaveLength(categoriesBefore);
    expect(input.week.dailyMinutes7).toHaveLength(7);
  });

  test.each([
    ['missing week minutes', (value: StatsInsightsSnapshot) => { delete (value.week as Partial<StatsInsightsSnapshot['week']>).minutes7; }],
    ['NaN goal percentage', (value: StatsInsightsSnapshot) => { value.longTerm.goalPct = Number.NaN; }],
    ['negative lifetime words', (value: StatsInsightsSnapshot) => { value.lifetime.words = -1; }],
    ['active days outside week range', (value: StatsInsightsSnapshot) => { value.week.activeDays7 = 8; }],
  ] as const)('rejects an incomplete required measurement: %s', (_name, mutate) => {
    const input = snapshot();
    mutate(input);
    expect(() => buildStatsInsightAnalysis(input)).toThrow('stats_insights_incomplete_snapshot');
  });

  test.each([
    [[0, 0, 0, 0, 0, 0]],
    [[0, 0, 0, 0, 0, 0, 0, 0]],
    [[0, 0, Number.NaN, 0, 0, 0, 0]],
    [[0, 0, -1, 0, 0, 0, 0]],
  ] as Array<[number[]]>)('rejects a daily measurement that is not exactly seven finite nonnegative values', (dailyMinutes7) => {
    const input = snapshot({ week: { ...snapshot().week, dailyMinutes7 } });
    expect(() => buildStatsInsightAnalysis(input)).toThrow('stats_insights_incomplete_snapshot');
  });

  test.each(['es', null, undefined])('rejects invalid runtime study target %p', (studyTarget) => {
    const input = snapshot({ studyTarget: studyTarget as StatsInsightsSnapshot['studyTarget'] });
    expect(() => buildStatsInsightAnalysis(input)).toThrow('stats_insights_incomplete_snapshot');
  });

  test.each([-1, 100, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid non-null percentile %p', (invalidPercentile) => {
    const input = snapshot({ comparison: { ...snapshot().comparison, totalXpPercentile: invalidPercentile } });
    expect(() => buildStatsInsightAnalysis(input)).toThrow('stats_insights_incomplete_snapshot');
  });

  test('drops invalid weak categories before applying the three-category cap', () => {
    const input = snapshot({
      lifetime: { words: 0, phrases: 0, quizzes: 0, arenaWins: 0, daysActive: 0 },
      weakCategories: [
        { label: 'Invalid NaN', pct: Number.NaN },
        { label: 'Invalid negative', pct: -1 },
        { label: 'Valid one', pct: 20 },
        { label: 'Valid two', pct: 30 },
        { label: 'Valid three', pct: 40 },
        { label: 'Valid four', pct: 50 },
      ],
    });

    const lifetime = buildStatsInsightAnalysis(input).blocks.lifetime;
    expect(lifetime.id).toContain('weak-category');
    expect(lifetime.facts).toEqual(expect.arrayContaining(['Valid one', 20]));
    expect(lifetime.facts).not.toEqual(expect.arrayContaining(['Invalid NaN', 0]));
    expect(lifetime.fallback.ru).not.toMatch(/самая конкретная|наиболее конкретная/i);
  });

  test('uses the requested non-Russian language for fallbacks', () => {
    const input = snapshot({
      lang: 'es',
      week: { activeDays7: 0, minutes7: 0, xp7: 0, previousMinutes7: null, bestDayLabel: null, dailyMinutes7: [0, 0, 0, 0, 0, 0, 0] },
    });

    expect(buildStatsInsightAnalysis(input).blocks.week.fallback.es).toMatch(/primera|semana|actividad/i);
  });
});
