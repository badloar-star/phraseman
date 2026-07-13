import {
  aiDialogueCandidate,
  repeatedTrainingCandidate,
  streakCandidate,
  weeklyReviewCandidate,
} from '../app/soft_upsell_trigger_adapters';

describe('soft upsell trigger adapters', () => {
  test('weekly review only emits after completion and never for premium', () => {
    expect(weeklyReviewCandidate({ completed: false, studyTarget: 'en', hasPremiumAccess: false })).toBeNull();
    expect(weeklyReviewCandidate({ completed: true, studyTarget: 'en', hasPremiumAccess: true })).toBeNull();
    expect(weeklyReviewCandidate({ completed: true, studyTarget: 'fr', hasPremiumAccess: false }))
      .toEqual({ trigger: 'weekly_review', value: 1, studyTarget: 'fr' });
  });

  test('AI emits exactly on a newly completed second lifetime success', () => {
    const base = { successful: true, newlyCompleted: true, studyTarget: 'en' as const, hasPremiumAccess: false };
    expect(aiDialogueCandidate({ ...base, completedLifetime: 1 })).toBeNull();
    expect(aiDialogueCandidate({ ...base, completedLifetime: 2 }))
      .toEqual({ trigger: 'second_ai_dialogue', value: 2, studyTarget: 'en' });
    expect(aiDialogueCandidate({ ...base, completedLifetime: 3 })).toBeNull();
    expect(aiDialogueCandidate({ ...base, completedLifetime: 2, newlyCompleted: false })).toBeNull();
    expect(aiDialogueCandidate({ ...base, completedLifetime: 2, successful: false })).toBeNull();
  });

  test.each([7, 14, 30])('streak emits on exact upward transition to %s', (current) => {
    expect(streakCandidate({ previous: current - 1, current, studyTarget: 'en', hasPremiumAccess: false }))
      .toEqual({ trigger: 'streak_milestone', value: current, studyTarget: 'en' });
    expect(streakCandidate({ previous: current, current, studyTarget: 'en', hasPremiumAccess: false })).toBeNull();
  });

  test('training emits once on the second successful completion', () => {
    const base = { successful: true, newlyCompleted: true, studyTarget: 'en' as const, hasPremiumAccess: false };
    expect(repeatedTrainingCandidate({ ...base, completedLifetime: 1 })).toBeNull();
    expect(repeatedTrainingCandidate({ ...base, completedLifetime: 2 }))
      .toEqual({ trigger: 'repeated_training', value: 1, studyTarget: 'en' });
    expect(repeatedTrainingCandidate({ ...base, completedLifetime: 2, newlyCompleted: false })).toBeNull();
  });
});
