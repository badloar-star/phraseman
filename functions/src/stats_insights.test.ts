import { __statsInsightsTestHooks, type StatsInsightsBriefing } from './stats_insights';
import { readFileSync } from 'fs';

const {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  hasEnoughSignal,
  briefingHashForReplay,
  decideStatsInsightsReplay,
  readStoredStatsInsightsNotes,
  sanitizeVerifiedAnalysis,
  sanitizeVerifiedRequest,
  buildVerifiedSystemPrompt,
  parseAndGuardVerifiedResult,
  verifiedTextUsesOnlyAllowedNumbers,
  hasDuplicateVerifiedNotes,
  decideStatsInsightsGeneration,
  buildLeaseCommitMutation,
  buildLeaseReleaseMutation,
  assertPremiumStatsInsightsAccess,
  renderVerifiedNote,
  verifiedRequestHashForReplay,
} = __statsInsightsTestHooks;

const localized = (values: { ru: string; uk: string; es: string; ptBR: string; vi: string; id: string; tr: string; pl: string }) => ({
  ru: values.ru, uk: values.uk, es: values.es, 'pt-BR': values.ptBR,
  vi: values.vi, id: values.id, tr: values.tr, pl: values.pl,
});

const verifiedAnalysis = () => ({
  fingerprint: 'stats-v1-12345678',
  generatedFromCompleteSnapshot: true,
  blocks: {
    week: { id: 'week.minutes-up', block: 'week', priority: 500, facts: [42, 25, 'Tuesday'], allowedClaim: 'Practice time rose from 25 to 42 minutes; Tuesday was strongest.', allowedAction: 'Repeat the Tuesday routine once.', fallback: localized({ ru: '42 минуты вместо 25.', uk: '42 хвилини замість 25.', es: '42 minutos en vez de 25.', ptBR: '42 minutos em vez de 25.', vi: '42 phút thay vì 25.', id: '42 menit dibanding 25.', tr: '25 yerine 42 dakika.', pl: '42 minuty zamiast 25.' }) },
    longTerm: { id: 'longTerm.streak', block: 'longTerm', priority: 400, facts: [7], allowedClaim: 'The verified current streak is 7 days.', allowedAction: null, fallback: localized({ ru: 'Серия — 7 дней.', uk: 'Серія — 7 днів.', es: 'La racha es de 7 días.', ptBR: 'A sequência é de 7 dias.', vi: 'Chuỗi hiện tại là 7 ngày.', id: 'Rangkaian saat ini 7 hari.', tr: 'Seri 7 gün.', pl: 'Seria trwa 7 dni.' }) },
    comparison: { id: 'comparison.unavailable', block: 'comparison', priority: 100, facts: [], allowedClaim: 'Comparison is temporarily unavailable; focus only on personal progress.', allowedAction: null, fallback: localized({ ru: 'Сравнение пока недоступно.', uk: 'Порівняння поки недоступне.', es: 'La comparación no está disponible.', ptBR: 'A comparação não está disponível.', vi: 'So sánh hiện chưa có.', id: 'Perbandingan belum tersedia.', tr: 'Karşılaştırma henüz yok.', pl: 'Porównanie jest niedostępne.' }) },
    lifetime: { id: 'lifetime.phrases', block: 'lifetime', priority: 300, facts: [120], allowedClaim: 'A verified lifetime milestone is 120 phrases.', allowedAction: null, fallback: localized({ ru: 'Уже 120 фраз.', uk: 'Уже 120 фраз.', es: 'Ya tienes 120 frases.', ptBR: 'Você já tem 120 frases.', vi: 'Bạn đã có 120 cụm từ.', id: 'Kamu sudah punya 120 frasa.', tr: 'Artık 120 ifaden var.', pl: 'Masz już 120 zwrotów.' }) },
  },
});

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

describe('stats_insights verified analysis contract', () => {
  it('sanitizes the exact client-shaped four-block analysis', () => {
    const clean = sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru');
    expect(Object.keys(clean.blocks)).toEqual(['week', 'longTerm', 'comparison', 'lifetime']);
    expect(clean.generatedFromCompleteSnapshot).toBe(true);
    expect(clean.blocks.week.fallback).toBe('42 минуты вместо 25.');
  });

  it('requires and preserves explicit v2 language and study target', () => {
    expect(sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'es', studyTarget: 'fr' })).toMatchObject({ lang: 'es', studyTarget: 'fr' });
    expect(sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru', studyTarget: 'es' })).toMatchObject({ lang: 'ru', studyTarget: 'es' });
    expect(sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru', studyTarget: 'pt-BR' })).toMatchObject({ lang: 'ru', studyTarget: 'pt-BR' });
    expect(() => sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), studyTarget: 'en' })).toThrow('stats_insights_invalid_analysis');
    expect(() => sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru' })).toThrow('stats_insights_invalid_analysis');
    expect(() => sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'xx', studyTarget: 'en' })).toThrow('stats_insights_invalid_analysis');
    expect(() => sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru', studyTarget: '../en' })).toThrow('stats_insights_invalid_analysis');
    expect(() => sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru', studyTarget: 'EN' })).toThrow('stats_insights_invalid_analysis');
  });

  it.each([
    [{ ...verifiedAnalysis(), generatedFromCompleteSnapshot: false }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, extra: verifiedAnalysis().blocks.week } }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, week: { ...verifiedAnalysis().blocks.week, block: 'lifetime' } } }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, week: { ...verifiedAnalysis().blocks.week, id: 'wrong.owner' } } }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, week: { ...verifiedAnalysis().blocks.week, priority: 1.5 } } }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, longTerm: { ...verifiedAnalysis().blocks.longTerm, id: verifiedAnalysis().blocks.week.id } } }],
    [{ ...verifiedAnalysis(), blocks: { ...verifiedAnalysis().blocks, longTerm: { ...verifiedAnalysis().blocks.longTerm, allowedClaim: verifiedAnalysis().blocks.week.allowedClaim } } }],
  ])('rejects malformed verified analysis before paid work', (raw) => {
    expect(() => sanitizeVerifiedAnalysis(raw, 'ru')).toThrow('stats_insights_invalid_analysis');
  });

  it('builds a separate prompt constrained to allowed claims and exact JSON', () => {
    const prompt = buildVerifiedSystemPrompt('ru', sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru'));
    expect(prompt).toContain('Assign each exact observationId');
    expect(prompt).toContain('return no natural-language text');
    expect(prompt).toContain('observationId');
    expect(prompt).toContain('styleKey');
    expect(prompt).not.toContain('Неделя стала активнее');
  });

  it('returns exact verified notes and observation ids', () => {
    const analysis = sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru');
    const result = parseAndGuardVerifiedResult(JSON.stringify({
      week: { observationId: 'week.minutes-up', styleKey: 'insight' },
      longTerm: { observationId: 'longTerm.streak', styleKey: 'focus' },
      comparison: { observationId: 'comparison.unavailable', styleKey: 'coach' },
      lifetime: { observationId: 'lifetime.phrases', styleKey: 'momentum' },
    }), analysis, 'ru');
    expect(Object.keys(result.notes)).toEqual(['week', 'longTerm', 'comparison', 'lifetime']);
    expect(result.observationIds.week).toBe('week.minutes-up');
  });

  it('rejects unknown observation ids and keeps numeric fallback provenance guard', () => {
    const analysis = sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru');
    const base = {
      week: { observationId: 'week.minutes-up', styleKey: 'insight' },
      longTerm: { observationId: 'longTerm.streak', styleKey: 'focus' },
      comparison: { observationId: 'comparison.unavailable', styleKey: 'coach' },
      lifetime: { observationId: 'lifetime.phrases', styleKey: 'momentum' },
    };
    expect(() => parseAndGuardVerifiedResult(JSON.stringify({ ...base, week: { ...base.week, observationId: 'week.unknown' } }), analysis, 'ru')).toThrow('stats_insights_observation_mismatch');
    expect(verifiedTextUsesOnlyAllowedNumbers('Результат: 42,0 и 25%.', [42, 25])).toBe(true);
    expect(verifiedTextUsesOnlyAllowedNumbers('Результат: 42,5.', [42])).toBe(false);
  });

  it('detects exact and near-duplicate note text for stored-data guards', () => {
    expect(hasDuplicateVerifiedNotes({ week: 'Отличный устойчивый ритм на этой неделе.', longTerm: 'Отличный, устойчивый ритм на этой неделе!', comparison: 'Сравнение недоступно.', lifetime: 'Освоено много фраз.' })).toBe(true);
  });

  it('accepts only four unique server-approved style assignments and renders no model prose', () => {
    const analysis = sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru');
    const result = parseAndGuardVerifiedResult(JSON.stringify({
      week: { observationId: 'week.minutes-up', styleKey: 'insight' },
      longTerm: { observationId: 'longTerm.streak', styleKey: 'focus' },
      comparison: { observationId: 'comparison.unavailable', styleKey: 'coach' },
      lifetime: { observationId: 'lifetime.phrases', styleKey: 'momentum' },
    }), analysis, 'ru');
    expect(result.notes.week).toBe('Наблюдение: 42 минуты вместо 25.');
    expect(result.notes.longTerm).toBe('В фокусе: Серия — 7 дней.');
    expect(result.observationIds).toEqual({
      week: 'week.minutes-up', longTerm: 'longTerm.streak',
      comparison: 'comparison.unavailable', lifetime: 'lifetime.phrases',
    });
  });

  it('rejects prose, extra fields, invalid styles, and duplicate styles', () => {
    const analysis = sanitizeVerifiedAnalysis(verifiedAnalysis(), 'ru');
    const valid = {
      week: { observationId: 'week.minutes-up', styleKey: 'insight' },
      longTerm: { observationId: 'longTerm.streak', styleKey: 'focus' },
      comparison: { observationId: 'comparison.unavailable', styleKey: 'coach' },
      lifetime: { observationId: 'lifetime.phrases', styleKey: 'momentum' },
    };
    expect(() => parseAndGuardVerifiedResult(JSON.stringify({ ...valid, extra: valid.week }), analysis, 'ru')).toThrow('stats_insights_bad_shape');
    expect(() => parseAndGuardVerifiedResult(JSON.stringify({ ...valid, week: { ...valid.week, text: 'Practice fell, not rose.' } }), analysis, 'ru')).toThrow('stats_insights_bad_shape');
    expect(() => parseAndGuardVerifiedResult(JSON.stringify({ ...valid, week: { ...valid.week, styleKey: 'sarcastic' } }), analysis, 'ru')).toThrow('stats_insights_invalid_style');
    expect(() => parseAndGuardVerifiedResult(JSON.stringify({ ...valid, longTerm: { ...valid.longTerm, styleKey: 'insight' } }), analysis, 'ru')).toThrow('stats_insights_duplicate_style');
  });

  it('uses a localized server-owned hook for every supported locale', () => {
    const raw = verifiedAnalysis();
    for (const lang of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      const clean = sanitizeVerifiedAnalysis(raw, lang);
      const rendered = renderVerifiedNote(lang, 'insight', clean.blocks.week.fallback);
      expect(rendered).toContain(clean.blocks.week.fallback);
      expect(rendered).not.toBe(clean.blocks.week.fallback);
    }
  });

  it('rejects missing requested fallback and fallback numbers absent from facts', () => {
    const missing = verifiedAnalysis();
    delete (missing.blocks.week.fallback as Record<string, string>).es;
    expect(() => sanitizeVerifiedAnalysis(missing, 'es')).toThrow('stats_insights_invalid_analysis');
    const invented = verifiedAnalysis();
    invented.blocks.week.fallback.ru = '99 минут вместо 25.';
    expect(() => sanitizeVerifiedAnalysis(invented, 'ru')).toThrow('stats_insights_invalid_analysis');
  });

  it('includes the selected deterministic fallback in the replay hash', () => {
    const first = sanitizeVerifiedRequest({ analysis: verifiedAnalysis(), lang: 'ru', studyTarget: 'en' });
    const changedRaw = verifiedAnalysis();
    changedRaw.blocks.comparison.fallback.ru = 'Сравнение сейчас недоступно.';
    const changed = sanitizeVerifiedRequest({ analysis: changedRaw, lang: 'ru', studyTarget: 'en' });
    expect(verifiedRequestHashForReplay(changed)).not.toBe(verifiedRequestHashForReplay(first));
  });

  it('replays a valid deterministic v2 note longer than the legacy 160-char bound byte-for-byte', () => {
    const raw = verifiedAnalysis();
    raw.blocks.comparison.fallback.ru = `Сравнение недоступно. ${'Свой темп остаётся главным ориентиром. '.repeat(4)}`.trim();
    const analysis = sanitizeVerifiedAnalysis(raw, 'ru');
    const generated = parseAndGuardVerifiedResult(JSON.stringify({
      week: { observationId: 'week.minutes-up', styleKey: 'insight' },
      longTerm: { observationId: 'longTerm.streak', styleKey: 'focus' },
      comparison: { observationId: 'comparison.unavailable', styleKey: 'coach' },
      lifetime: { observationId: 'lifetime.phrases', styleKey: 'momentum' },
    }), analysis, 'ru');
    expect(generated.notes.comparison.length).toBeGreaterThan(160);
    const replay = decideStatsInsightsGeneration({
      nextAllowedAtMs: 2000,
      lastRequestHash: 'same',
      responseSchemaVersion: 2,
      lastResult: generated,
    }, 'same', 1000, 2, 'lease');
    expect(replay.kind).toBe('replay');
    if (replay.kind !== 'replay') throw new Error('expected replay');
    expect((replay.result as typeof generated).notes.comparison).toBe(generated.notes.comparison);
  });
});

describe('stats_insights atomic lease decisions', () => {
  const legacyNotes = { balance: 'A', rhythm: 'B', year: '', percentiles: '', lifetime: 'C' };
  const v2Result = {
    notes: { week: 'A', longTerm: 'B', comparison: 'C', lifetime: 'D' },
    observationIds: { week: 'week.a', longTerm: 'longTerm.b', comparison: 'comparison.c', lifetime: 'lifetime.d' },
  };

  it('replays only a compatible stored response schema', () => {
    const stored = { nextAllowedAtMs: 2000, lastRequestHash: 'same', responseSchemaVersion: 2, lastResult: v2Result, lastModel: 'm' };
    expect(decideStatsInsightsGeneration(stored, 'same', 1000, 2, 'lease').kind).toBe('replay');
    expect(decideStatsInsightsGeneration(stored, 'same', 1000, 1, 'lease')).toEqual({ kind: 'not_ready', nextAllowedAtMs: 2000 });
    expect(decideStatsInsightsGeneration({ nextAllowedAtMs: 2000, lastBriefingHash: 'same', lastNotes: legacyNotes }, 'same', 1000, 1, 'lease').kind).toBe('replay');
  });

  it('replays an exact stored v2 result unchanged', () => {
    const decision = decideStatsInsightsGeneration({
      nextAllowedAtMs: 2000,
      lastRequestHash: 'same',
      responseSchemaVersion: 2,
      lastResult: v2Result,
    }, 'same', 1000, 2, 'lease');
    expect(decision.kind).toBe('replay');
    if (decision.kind !== 'replay') throw new Error('expected replay');
    expect(decision.result).toEqual(v2Result);
  });

  it.each([
    ['outer result', { ...v2Result, extra: true }],
    ['notes', { ...v2Result, notes: { ...v2Result.notes, extra: 'x' } }],
    ['observation ids', { ...v2Result, observationIds: { ...v2Result.observationIds, extra: 'x' } }],
  ])('rejects a stored v2 replay with extra keys in %s', (_label, lastResult) => {
    const decision = decideStatsInsightsGeneration({
      nextAllowedAtMs: 2000,
      lastRequestHash: 'same',
      responseSchemaVersion: 2,
      lastResult,
    }, 'same', 1000, 2, 'lease');
    expect(decision).toEqual({ kind: 'not_ready', nextAllowedAtMs: 2000 });
  });

  it('blocks active same or different leases and replaces expired leases', () => {
    for (const hash of ['same', 'different']) {
      expect(decideStatsInsightsGeneration({ generationLeaseToken: 'old', generationLeaseHash: hash, generationLeaseExpiresAtMs: 1500 }, 'new', 1000, 2, 'new-token')).toEqual({ kind: 'in_progress' });
    }
    const open = decideStatsInsightsGeneration({ generationLeaseToken: 'old', generationLeaseExpiresAtMs: 999 }, 'new', 1000, 2, 'new-token');
    expect(open.kind).toBe('reserve');
  });

  it('requires the matching lease for commit and release without setting a window on failure', () => {
    expect(buildLeaseCommitMutation({ generationLeaseToken: 'other' }, 'mine', { nextAllowedAtMs: 999 })).toBeNull();
    expect(buildLeaseReleaseMutation({ generationLeaseToken: 'other', nextAllowedAtMs: 0 }, 'mine')).toBeNull();
    expect(buildLeaseReleaseMutation({ generationLeaseToken: 'mine', nextAllowedAtMs: 0 }, 'mine')).toEqual({ generationLeaseToken: null, generationLeaseHash: null, generationLeaseExpiresAtMs: 0 });
    expect(buildLeaseCommitMutation({ generationLeaseToken: 'mine' }, 'mine', { nextAllowedAtMs: 999 })?.nextAllowedAtMs).toBe(999);
  });
});

describe('stats_insights Premium server gate', () => {
  it('rejects free access with the stable feature error', () => {
    expect(() => assertPremiumStatsInsightsAccess(false)).toThrow('stats_insights_premium_required');
    expect(() => assertPremiumStatsInsightsAccess(true)).not.toThrow();
  });

  it('keeps Premium rejection before quota, rate, budget, and provider work', () => {
    const source = readFileSync(require.resolve('./stats_insights'), 'utf8');
    const handler = source.slice(source.indexOf('export const statsInsightsGenerate'));
    const premium = handler.indexOf('assertPremiumStatsInsightsAccess(isPremium)');
    for (const later of ['reserveGenerationLease(', 'enforceRateLimit(', 'enforceGlobalBudget(', 'fetch(OPENAI_CHAT_URL']) {
      expect(premium).toBeGreaterThanOrEqual(0);
      expect(handler.indexOf(later)).toBeGreaterThan(premium);
    }
  });
});
