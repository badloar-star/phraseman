import { __weeklyReviewTestHooks, type WeeklyReviewBriefing, type WeeklyReviewResult } from './weekly_review';

const { sanitizeBriefing, parseAndGuardResult, buildSystemPrompt, buildResponseReview } = __weeklyReviewTestHooks;

function baseBriefing(): WeeklyReviewBriefing {
  return {
    lang: 'ru',
    studyTarget: 'en',
    windowDays: 7,
    totalMistakes: 12,
    weakCategories: [
      { category: 'verb', label: 'Глаголы', pct: 40, priorityScore: 70, topWords: ['have', 'has'] },
    ],
    strongCategories: [{ category: 'noun', label: 'Существительные' }],
    recoveredCategories: [{ category: 'article', label: 'Артикли', recoveryScore: 60 }],
    weakLessons: [{ lessonId: 1, title: 'Lesson 1', pct: 30 }],
    topMistakePhrases: [{ phrase: 'I have a dog', count: 5 }],
    recommendedLessons: [
      { microDiagnosisId: 'verb_present_perfect_basic', label: 'Present Perfect' },
    ],
    effort: { currentStreak: 3, longestStreak: 5, weekXp: 120, weekMinutes: 40 },
  };
}

describe('weekly_review parseAndGuardResult', () => {
  it('keeps only recommendations that are in the briefing allowlist', () => {
    const briefing = baseBriefing();
    const modelOutput = JSON.stringify({
      greeting: 'Привет!',
      paragraphs: ['Ты молодец на этой неделе.', 'Глаголы стоит подтянуть.'],
      recommendations: [
        { microDiagnosisId: 'verb_present_perfect_basic', label: 'whatever the model wrote' },
        // Hallucinated id NOT in the briefing — must be dropped.
        { microDiagnosisId: 'condition_second_basic', label: 'Hallucinated lesson' },
      ],
    });

    const result = parseAndGuardResult(modelOutput, briefing);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].microDiagnosisId).toBe('verb_present_perfect_basic');
    // Label comes from the briefing, NOT the model's text.
    expect(result.recommendations[0].label).toBe('Present Perfect');
  });

  it('drops ALL recommendations when the model invents ids', () => {
    const briefing = baseBriefing();
    const modelOutput = JSON.stringify({
      greeting: 'Привет!',
      paragraphs: ['Текст разбора.'],
      recommendations: [
        { microDiagnosisId: 'totally_made_up', label: 'x' },
        { microDiagnosisId: 'also_fake', label: 'y' },
      ],
    });
    const result = parseAndGuardResult(modelOutput, briefing);
    expect(result.recommendations).toHaveLength(0);
  });

  it('throws on non-JSON model output', () => {
    expect(() => parseAndGuardResult('not json at all', baseBriefing())).toThrow();
  });

  it('throws when greeting or paragraphs are empty', () => {
    const empty = JSON.stringify({ greeting: '', paragraphs: [] });
    expect(() => parseAndGuardResult(empty, baseBriefing())).toThrow();
  });

  it('caps paragraphs at the max', () => {
    const many = JSON.stringify({
      greeting: 'Hi',
      paragraphs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      recommendations: [],
    });
    const result = parseAndGuardResult(many, baseBriefing());
    expect(result.paragraphs.length).toBeLessThanOrEqual(4);
  });
});

describe('weekly_review sanitizeBriefing', () => {
  it('bounds hostile oversized input', () => {
    const hostile = {
      lang: 'xx', // invalid → falls back to ru
      studyTarget: 'zz', // invalid → en
      windowDays: 999, // invalid → 7
      totalMistakes: -50,
      weakCategories: Array.from({ length: 50 }, (_, i) => ({
        category: 'verb',
        label: 'x'.repeat(500),
        pct: 9999,
        priorityScore: -10,
        topWords: Array.from({ length: 50 }, () => 'word'),
      })),
      recommendedLessons: Array.from({ length: 50 }, (_, i) => ({ microDiagnosisId: `id_${i}`, label: 'L' })),
      effort: { currentStreak: -5, longestStreak: 1e9, weekXp: -1, weekMinutes: 1e12 },
    };
    const clean = sanitizeBriefing(hostile);
    expect(clean.lang).toBe('ru');
    expect(clean.studyTarget).toBe('en');
    expect(clean.windowDays).toBe(7);
    expect(clean.totalMistakes).toBe(0); // clamped to >= 0
    expect(clean.weakCategories.length).toBeLessThanOrEqual(5);
    expect(clean.weakCategories[0].label.length).toBeLessThanOrEqual(80);
    expect(clean.weakCategories[0].pct).toBeLessThanOrEqual(100);
    expect(clean.weakCategories[0].topWords.length).toBeLessThanOrEqual(5);
    expect(clean.recommendedLessons.length).toBeLessThanOrEqual(4);
    expect(clean.effort.currentStreak).toBeGreaterThanOrEqual(0);
  });

  it('handles completely empty input without throwing', () => {
    const clean = sanitizeBriefing({});
    expect(clean.weakCategories).toEqual([]);
    expect(clean.recommendedLessons).toEqual([]);
    expect(clean.totalMistakes).toBe(0);
  });
});

describe('weekly_review buildSystemPrompt', () => {
  it('embeds the target language name and the strict rules', () => {
    const prompt = buildSystemPrompt('ru');
    expect(prompt).toContain('Russian');
    expect(prompt).toContain('NEVER recommend');
    expect(prompt).toContain('STRICT JSON');
  });
});

describe('weekly_review buildResponseReview (server-side paywall)', () => {
  function fullResult(): WeeklyReviewResult {
    return {
      greeting: 'Привет!',
      paragraphs: ['Абзац 1', 'Абзац 2', 'Абзац 3', 'Абзац 4'],
      recommendations: [
        { microDiagnosisId: 'verb_present_perfect_basic', label: 'Present Perfect' },
        { microDiagnosisId: 'article_a_an', label: 'Articles' },
      ],
    };
  }

  it('premium gets the FULL review and nothing locked', () => {
    const out = buildResponseReview(fullResult(), true);
    expect(out.paragraphs).toHaveLength(4);
    expect(out.recommendations).toHaveLength(2);
    expect(out.lockedParagraphCount).toBe(0);
  });

  it('free gets ONLY greeting + 1 paragraph, NO recommendations, and the rest withheld', () => {
    const out = buildResponseReview(fullResult(), false);
    expect(out.greeting).toBe('Привет!');
    expect(out.paragraphs).toHaveLength(1);
    expect(out.paragraphs[0]).toBe('Абзац 1');
    // The withheld paragraphs must NOT be present in the free payload.
    expect(out.paragraphs).not.toContain('Абзац 2');
    expect(out.paragraphs).not.toContain('Абзац 4');
    // Recommendations are premium-only — free must receive none.
    expect(out.recommendations).toHaveLength(0);
    // Teaser hint: 3 of 4 paragraphs withheld.
    expect(out.lockedParagraphCount).toBe(3);
  });

  it('free with a single-paragraph review locks nothing (no teaser)', () => {
    const single: WeeklyReviewResult = { greeting: 'Hi', paragraphs: ['only one'], recommendations: [] };
    const out = buildResponseReview(single, false);
    expect(out.paragraphs).toHaveLength(1);
    expect(out.lockedParagraphCount).toBe(0);
  });
});
