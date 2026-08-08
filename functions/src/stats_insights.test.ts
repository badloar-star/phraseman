import { __statsInsightsTestHooks, type StatsInsightsBriefing } from './stats_insights';

const {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  hasEnoughSignal,
  briefingHashForReplay,
  decideStatsInsightsReplay,
  readStoredStatsInsightsNotes,
} = __statsInsightsTestHooks;

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

  it('hides internal score wording in the learner-facing practice note', () => {
    const result = parseAndGuardResult(JSON.stringify({
      balance: 'У вас 44 балла за баланс. Это начало, продолжайте так же.',
      rhythm: 'На этой неделе 4 дня практики — это уже понятный ритм.',
    }));
    expect(result.notes.balance).toBe('');
    expect(result.notes.rhythm).toContain('4 дня практики');
  });

  it('throws on non-JSON model output', () => {
    expect(() => parseAndGuardResult('not json at all')).toThrow();
  });

  it('throws when every note is empty', () => {
    expect(() => parseAndGuardResult(JSON.stringify({ balance: '', rhythm: '', year: '', percentiles: '', lifetime: '' }))).toThrow();
  });

  it('throws when generated notes are not in the requested language', () => {
    const english = JSON.stringify({
      balance: 'Today you keep a good small practice step with your phrases.',
      rhythm: 'This week your practice rhythm is steady.',
    });
    expect(() => parseAndGuardResult(english, 'ru')).toThrow('stats_insights_wrong_language');
  });

  it('throws when a Latin-script language receives Cyrillic notes', () => {
    expect(() => parseAndGuardResult(fullNotes(), 'es')).toThrow('stats_insights_wrong_language');
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
    expect(clean.lifetime).toEqual({ words: 0, phrases: 100000000, daysActive: 9 });
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

  it('keeps the balance block framed as practice consistency, not visible scoring', () => {
    const prompt = buildSystemPrompt('ru');
    expect(prompt).toContain('practice consistency card');
    expect(prompt).toContain('Do NOT mention the score');
    expect(prompt).not.toContain('practice balance score');
    expect(prompt).not.toMatch(/\b(?:quizzes|arenaWins)\b/);
  });
});

describe('stats_insights quota replay helpers', () => {
  const briefing = (): StatsInsightsBriefing => sanitizeBriefing({
    balance: { active7: 5, avgMinutes: 10 },
    rhythm: { active7: 5, xp7: 320, minutes7: 50 },
    lifetime: { words: 12, daysActive: 3 },
  });

  it('returns stored notes for the same briefing while the window is closed', () => {
    const clean = briefing();
    const hash = briefingHashForReplay(clean);
    const decision = decideStatsInsightsReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: hash,
      lastModel: 'test-model',
      lastNotes: {
        balance: 'Five active days this week.',
        rhythm: 'Your rhythm is steady.',
      },
    }, hash, 1000);

    expect(decision.kind).toBe('replay');
    if (decision.kind !== 'replay') throw new Error('expected replay');
    expect(decision.notes.balance).toBe('Five active days this week.');
    expect(decision.notes.rhythm).toBe('Your rhythm is steady.');
    expect(decision.notes.year).toBe('');
    expect(decision.nextAllowedAtMs).toBe(2000);
    expect(decision.model).toBe('test-model');
  });

  it('opens generation instead of replaying same-hash stored notes in the wrong language', () => {
    const clean = briefing();
    const hash = briefingHashForReplay(clean);
    const decision = decideStatsInsightsReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: hash,
      lastNotes: {
        balance: 'Today you keep a good small practice step with your phrases.',
        rhythm: 'This week your practice rhythm is steady.',
      },
    }, hash, 1000, 'ru');

    expect(decision).toEqual({ kind: 'open' });
  });

  it('keeps a different briefing gated until the window opens', () => {
    const clean = briefing();
    const hash = briefingHashForReplay(clean);
    const decision = decideStatsInsightsReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: 'different-hash',
      lastNotes: { balance: 'Five active days this week.' },
    }, hash, 1000);

    expect(decision).toEqual({ kind: 'not_ready', nextAllowedAtMs: 2000 });
  });

  it('opens generation after the stored window expires', () => {
    const clean = briefing();
    const hash = briefingHashForReplay(clean);
    const decision = decideStatsInsightsReplay({
      nextAllowedAtMs: 1000,
      lastBriefingHash: hash,
      lastNotes: { balance: 'Five active days this week.' },
    }, hash, 2000);

    expect(decision).toEqual({ kind: 'open' });
  });

  it('reuses the learner-facing guard when reading stored notes', () => {
    const notes = readStoredStatsInsightsNotes({
      balance: '44 score for balance.',
      rhythm: 'Your rhythm is steady.',
    });

    expect(notes?.balance).toBe('');
    expect(notes?.rhythm).toBe('Your rhythm is steady.');
  });
});
