import {
  PRONUNCIATION_PASS_THRESHOLD,
  scorePronunciationTranscript,
} from '../app/personal_plan_pronunciation_scoring_core';

describe('local personal plan pronunciation scoring core', () => {
  it('passes exact device transcripts at 100 percent', () => {
    expect(scorePronunciationTranscript({
      targetText: 'The next steps are clear.',
      transcript: 'The next steps are clear',
    })).toEqual(expect.objectContaining({
      score: 100,
      passed: true,
      threshold: PRONUNCIATION_PASS_THRESHOLD,
    }));
  });

  it('keeps incomplete device transcripts below the 90 percent completion threshold', () => {
    const result = scorePronunciationTranscript({
      targetText: 'The next steps are clear.',
      transcript: 'The next steps',
    });

    expect(result.score).toBeLessThan(90);
    expect(result.passed).toBe(false);
  });

  it('penalizes reordered recognized words', () => {
    const result = scorePronunciationTranscript({
      targetText: 'The next steps are clear.',
      transcript: 'clear are steps next the',
    });

    expect(result.score).toBeLessThan(90);
    expect(result.passed).toBe(false);
  });
});
