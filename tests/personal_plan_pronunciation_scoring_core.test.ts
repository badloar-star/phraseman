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

  it('keeps clearly incomplete device transcripts below the pass threshold', () => {
    const result = scorePronunciationTranscript({
      targetText: 'The next steps are clear.',
      transcript: 'The next steps',
    });

    expect(result.score).toBeLessThan(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(false);
  });

  it('penalizes reordered recognized words', () => {
    const result = scorePronunciationTranscript({
      targetText: 'The next steps are clear.',
      transcript: 'clear are steps next the',
    });

    expect(result.score).toBeLessThan(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(false);
  });

  it('does NOT punish fluent run-together contractions (you\'re ~ you are)', () => {
    // Носитель говорит бегло — движок слышит "you're late" вместо "you are late".
    // Раньше "you're" ≠ "you"+"are" = полная ошибка → проваливал. Теперь засчитывается.
    const result = scorePronunciationTranscript({
      targetText: 'you are late',
      transcript: "you're late",
    });
    expect(result.score).toBeGreaterThanOrEqual(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(true);
  });

  it('still rejects a genuinely wrong phrase', () => {
    const result = scorePronunciationTranscript({
      targetText: 'you are late',
      transcript: 'the cat is sleeping',
    });
    expect(result.score).toBeLessThan(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(false);
  });
});
