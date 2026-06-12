import AsyncStorage from '@react-native-async-storage/async-storage';

import { logMistake, flushMistakeLog } from '../app/mistake_log';
import { buildWeeklyReviewBriefing } from '../app/weekly_review_briefing';
import { invalidatePhraseIndex } from '../app/phrase_analytics';

const EFFORT = { currentStreak: 3, longestStreak: 5, weekXp: 120, weekMinutes: 40 };

// Seeds N mistakes for an English phrase/token so computePhraseAnalytics has data.
async function seedMistakes(
  count: number,
  opts: { phrase: string; token: string; rawCategory: string; lessonId: number },
): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    logMistake(opts.phrase, opts.lessonId, 'lesson_words', 'wrong_pick', {
      tokenText: opts.token,
      expected: opts.token,
      picked: 'x',
      rawCategory: opts.rawCategory,
    });
  }
  await flushMistakeLog();
}

describe('weekly review briefing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    invalidatePhraseIndex();
  });

  it('returns null when there is not enough data (<5 mistakes)', async () => {
    await seedMistakes(2, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: true, effort: EFFORT });
    expect(briefing).toBeNull();
  });

  it('builds a briefing with weak categories once enough mistakes exist', async () => {
    await seedMistakes(8, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: true, effort: EFFORT });
    expect(briefing).not.toBeNull();
    expect(briefing!.totalMistakes).toBeGreaterThanOrEqual(5);
    expect(briefing!.weakCategories.length).toBeGreaterThan(0);
    // Window matches stats insights: premium regenerates every 3 days.
    expect(briefing!.windowDays).toBe(3);
  });

  it('uses a 7-day window for free users', async () => {
    await seedMistakes(8, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: false, effort: EFFORT });
    expect(briefing).not.toBeNull();
    expect(briefing!.windowDays).toBe(7);
  });

  it('passes only words that came from logged mistakes into weak categories', async () => {
    await seedMistakes(5, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    await seedMistakes(5, { phrase: 'She has a cat', token: 'has', rawCategory: 'verb', lessonId: 1 });

    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: true, effort: EFFORT });

    expect(briefing).not.toBeNull();
    const allWords = briefing!.weakCategories.flatMap((category) => category.topWords.map((word) => word.toLowerCase()));
    expect(allWords.length).toBeGreaterThan(0);
    expect(new Set(allWords).isSubsetOf?.(new Set(['have', 'has'])) ?? allWords.every((word) => ['have', 'has'].includes(word))).toBe(true);
  });

  // ── SECURITY INVARIANT ──────────────────────────────────────────────────────
  // Recommendations must NEVER contain a lesson that is blocked by the study-target
  // gate. For French, personal trainings are on a source-gate → recommendations
  // must be empty, so the AI can never be handed a blocked lesson id.
  it('produces zero recommendations for French (source-gated)', async () => {
    await seedMistakes(8, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'fr', isPremium: true, effort: EFFORT });
    // Either the briefing is null (no EN analytics for a French learner) or, if
    // built, its recommendations are empty — never a blocked lesson.
    if (briefing) {
      expect(briefing.recommendedLessons).toHaveLength(0);
    } else {
      expect(briefing).toBeNull();
    }
  });

  it('every recommendation resolves to a real, gate-allowed training (en)', async () => {
    await seedMistakes(10, { phrase: 'I have a dog', token: 'have', rawCategory: 'verb', lessonId: 1 });
    const briefing = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: true, effort: EFFORT });
    expect(briefing).not.toBeNull();
    // Lazy import to assert each id maps to an existing training for en.
    const { getDiagnosisTrainingForTarget } = await import('../app/diagnosis_trainings');
    for (const rec of briefing!.recommendedLessons) {
      expect(rec.microDiagnosisId).toBeTruthy();
      expect(rec.label).toBeTruthy();
      expect(getDiagnosisTrainingForTarget(rec.microDiagnosisId, 'en')).not.toBeNull();
    }
  });
});
