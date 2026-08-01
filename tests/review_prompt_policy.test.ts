import {
  REVIEW_PROMPT_COOLDOWN_DAYS,
  decideReviewPrompt,
  isReviewMilestone,
} from '../app/review_prompt_policy';

describe('review prompt policy', () => {
  const now = Date.UTC(2026, 6, 29);

  it('allows a strong passed level exam only after the user continues from its result', () => {
    expect(decideReviewPrompt({
      trigger: 'level_exam_pass',
      scorePercent: 85,
      userContinued: true,
      nowMs: now,
      priorPromptCount: 0,
      lastPromptedAtMs: null,
      hasRated: false,
    })).toEqual({ eligible: true });
  });

  it('rejects an exam result below the strong-success threshold', () => {
    expect(decideReviewPrompt({
      trigger: 'level_exam_pass',
      scorePercent: 84,
      userContinued: true,
      nowMs: now,
      priorPromptCount: 0,
      lastPromptedAtMs: null,
      hasRated: false,
    })).toEqual({ eligible: false, reason: 'weak_outcome' });
  });

  it('allows a perfect lesson only after three active days and three completed lessons', () => {
    expect(decideReviewPrompt({
      trigger: 'perfect_lesson',
      completedLessons: 3,
      activeDays: 3,
      nowMs: now,
      priorPromptCount: 0,
      lastPromptedAtMs: null,
      hasRated: false,
    })).toEqual({ eligible: true });
  });

  it('does not request a review after an ordinary lesson', () => {
    expect(decideReviewPrompt({
      trigger: 'ordinary_lesson',
      completedLessons: 12,
      activeDays: 12,
      nowMs: now,
      priorPromptCount: 0,
      lastPromptedAtMs: null,
      hasRated: false,
    })).toEqual({ eligible: false, reason: 'unsupported_trigger' });
  });

  it('recognizes only the requested streak milestones', () => {
    expect(isReviewMilestone(7)).toBe(true);
    expect(isReviewMilestone(14)).toBe(true);
    expect(isReviewMilestone(30)).toBe(true);
    expect(isReviewMilestone(6)).toBe(false);
  });

  it('requires the streak celebration to be closed before requesting a review', () => {
    expect(decideReviewPrompt({
      trigger: 'streak_milestone',
      streakDays: 7,
      celebrationClosed: false,
      nowMs: now,
      priorPromptCount: 0,
      lastPromptedAtMs: null,
      hasRated: false,
    })).toEqual({ eligible: false, reason: 'not_continued' });
  });

  it('enforces the shared prompt cooldown and maximum', () => {
    expect(decideReviewPrompt({
      trigger: 'streak_milestone',
      streakDays: 7,
      celebrationClosed: true,
      nowMs: now,
      priorPromptCount: 3,
      lastPromptedAtMs: now - ((REVIEW_PROMPT_COOLDOWN_DAYS + 1) * 86_400_000),
      hasRated: false,
    })).toEqual({ eligible: false, reason: 'prompt_limit' });
  });
});
