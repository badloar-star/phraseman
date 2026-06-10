import { __statsInsightsTestHooks, type StatsInsightsBriefing } from './stats_insights';

const { sanitizeBriefing, parseAndGuardResult, buildSystemPrompt, hasEnoughSignal } = __statsInsightsTestHooks;

function fullNotes(): string {
  return JSON.stringify({
    balance: 'Ты занимаешься ровно — 5 активных дней из 7.',
    rhythm: 'На этой неделе 5 дней практики и 320 XP, хороший ритм.',
    year: 'За год 40 активных дней, серия 5, цель на 12%.',
    percentiles: 'По недельному опыту ты обходишь 72% пользователей.',
    lifetime: 'Уже 120 слов выучено — отличный задел.',
  });
}

describe('stats_insights parseAndGuardResult', () => {
  it('parses all five block notes', () => {
    const result = parseAndGuardResult(fullNotes());
    expect(result.notes.balance).toContain('5 активных');
    expect(result.notes.rhythm).toContain('320 XP');
    expect(result.notes.year).toContain('серия 5');
    expect(result.notes.percentiles).toContain('72%');
    expect(result.notes.lifetime).toContain('120 слов');
  });

  it('keeps missing keys as empty strings without throwing', () => {
    const result = parseAndGuardResult(JSON.stringify({ balance: 'Только баланс заполнен.' }));
    expect(result.notes.balance).toBe('Только баланс заполнен.');
    expect(result.notes.rhythm).toBe('');
    expect(result.notes.year).toBe('');
    expect(result.notes.percentiles).toBe('');
    expect(result.notes.lifetime).toBe('');
  });

  it('throws on non-JSON model output', () => {
    expect(() => parseAndGuardResult('not json at all')).toThrow();
  });

  it('throws when every note is empty', () => {
    expect(() => parseAndGuardResult(JSON.stringify({ balance: '', rhythm: '', year: '', percentiles: '', lifetime: '' }))).toThrow();
  });

  it('caps note length', () => {
    const long = 'а'.repeat(1000);
    const result = parseAndGuardResult(JSON.stringify({ balance: long }));
    expect(result.notes.balance.length).toBeLessThanOrEqual(400);
  });
});

describe('stats_insights sanitizeBriefing', () => {
  it('bounds hostile oversized input', () => {
    const hostile = {
      lang: 'zz',
      studyTarget: 'xx',
      balance: { score: 9999, isWarmup: 'yes', active7: 99, avgMinutes: -5 },
      rhythm: { active7: 50, xp7: -1, minutes7: 1e12, bestDay: 'x'.repeat(200) },
      year: { activeDays: 9999, currentStreak: -3, longestStreak: 1e9, bestMonth: 'y'.repeat(200), goalPct: 500 },
      percentiles: { totalXp: 999, week: -10, daily7: 'abc' },
      lifetime: { words: -1, phrases: 1e12, quizzes: 5, arenaWins: 2, daysActive: 9 },
      weakCategories: Array.from({ length: 20 }, () => ({ label: 'z'.repeat(200), pct: 999 })),
    };
    const clean = sanitizeBriefing(hostile);
    expect(clean.lang).toBe('ru');            // unknown → ru
    expect(clean.studyTarget).toBe('en');     // unknown → en
    expect(clean.balance.score).toBeLessThanOrEqual(100);
    expect(clean.balance.active7).toBeLessThanOrEqual(7);
    expect(clean.balance.avgMinutes).toBeGreaterThanOrEqual(0);
    expect(clean.rhythm.active7).toBeLessThanOrEqual(7);
    expect(clean.rhythm.bestDay.length).toBeLessThanOrEqual(24);
    expect(clean.year.goalPct).toBeLessThanOrEqual(100);
    expect(clean.percentiles.daily7).toBeNull(); // non-numeric → null
    expect(clean.percentiles.week).toBe(0);      // clamped to >= 0
    expect(clean.weakCategories.length).toBeLessThanOrEqual(3);
    expect(clean.weakCategories[0].label.length).toBeLessThanOrEqual(80);
  });

  it('preserves a valid null percentile (hidden metric)', () => {
    const clean = sanitizeBriefing({ percentiles: { totalXp: 80, week: null, daily7: null } });
    expect(clean.percentiles.totalXp).toBe(80);
    expect(clean.percentiles.week).toBeNull();
    expect(clean.percentiles.daily7).toBeNull();
  });

  it('handles completely empty input without throwing', () => {
    const clean = sanitizeBriefing({});
    expect(clean.weakCategories).toEqual([]);
    expect(clean.balance.score).toBe(0);
    expect(clean.lifetime.words).toBe(0);
  });
});

describe('stats_insights hasEnoughSignal', () => {
  const base = (): StatsInsightsBriefing => sanitizeBriefing({});

  it('rejects an empty/brand-new account', () => {
    expect(hasEnoughSignal(base())).toBe(false);
  });

  it('accepts once there is a little real activity', () => {
    expect(hasEnoughSignal(sanitizeBriefing({ lifetime: { words: 5 } }))).toBe(true);
    expect(hasEnoughSignal(sanitizeBriefing({ rhythm: { active7: 2 } }))).toBe(true);
    expect(hasEnoughSignal(sanitizeBriefing({ lifetime: { daysActive: 2 } }))).toBe(true);
  });
});

describe('stats_insights buildSystemPrompt', () => {
  it('localizes to the requested language and lists all five blocks', () => {
    const prompt = buildSystemPrompt('es');
    expect(prompt).toContain('Spanish');
    for (const key of ['balance', 'rhythm', 'year', 'percentiles', 'lifetime']) {
      expect(prompt).toContain(`"${key}"`);
    }
  });
});
