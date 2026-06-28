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

  it('treats spoken numbers and digits as equal (two ~ 2)', () => {
    // Движок пишет "2 coffees please", цель — "Two coffees please". Раньше → 70 FAIL.
    const result = scorePronunciationTranscript({
      targetText: 'Two coffees please',
      transcript: '2 coffees please',
    });
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('treats ordinals written as digits as equal (first ~ 1st)', () => {
    const result = scorePronunciationTranscript({
      targetText: 'She is first in line',
      transcript: 'She is 1st in line',
    });
    expect(result.score).toBeGreaterThanOrEqual(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(true);
  });

  it('treats homophones as equal (right ~ write, ate ~ eight)', () => {
    expect(scorePronunciationTranscript({
      targetText: 'Right now',
      transcript: 'Write now',
    }).passed).toBe(true);
    expect(scorePronunciationTranscript({
      targetText: 'I ate eight cookies',
      transcript: 'I 8 8 cookies',
    }).passed).toBe(true);
  });

  it('expands contractions even when the recognizer drops the apostrophe', () => {
    // On-device движок часто отдаёт "dont"/"youre" без апострофа.
    const result = scorePronunciationTranscript({
      targetText: 'You are not late',
      transcript: 'youre not late',
    });
    expect(result.score).toBeGreaterThanOrEqual(PRONUNCIATION_PASS_THRESHOLD);
    expect(result.passed).toBe(true);
  });

  it("expands won't/can't correctly (won't -> will not, not 'wo not')", () => {
    expect(scorePronunciationTranscript({
      targetText: 'I will not go',
      transcript: "I won't go",
    }).passed).toBe(true);
    expect(scorePronunciationTranscript({
      targetText: 'I can not see',
      transcript: "I can't see",
    }).passed).toBe(true);
  });

  it('forgives a single dropped trailing word on a longer phrase', () => {
    // 5-словная фраза, движок срезал хвостовое "is".
    const result = scorePronunciationTranscript({
      targetText: 'Where is the nearest stop',
      transcript: 'Where the nearest stop',
    });
    // Один пропуск на длинной фразе не должен топить ниже порога.
    expect(result.passed).toBe(true);
  });

  it('still fails when two or more words are missing on a longer phrase', () => {
    const result = scorePronunciationTranscript({
      targetText: 'Where is the nearest bus stop please',
      transcript: 'Where nearest stop',
    });
    expect(result.passed).toBe(false);
  });
});
