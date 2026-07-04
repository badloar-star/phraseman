import {
  judgeSingleWord,
  isDrillableStatus,
  effectivePhraseScore,
  WORD_DRILL_CLEAN_SIMILARITY,
} from '../app/speaking_word_drill';

describe('speaking word drill — judgeSingleWord', () => {
  it('marks an exact re-attempt clean', () => {
    const v = judgeSingleWord({ target: 'coffee', heardTranscript: 'coffee' });
    expect(v.status).toBe('clean');
    expect(v.heard).toBeUndefined();
    expect(v.soundHints).toBeUndefined();
  });

  it('ignores target punctuation/case when matching', () => {
    expect(judgeSingleWord({ target: 'You?', heardTranscript: 'you' }).status).toBe('clean');
    expect(judgeSingleWord({ target: 'Coffee', heardTranscript: 'COFFEE' }).status).toBe('clean');
  });

  it('accepts a phonetically-equal spelling variant as clean', () => {
    // center / centre sound alike (double_metaphone) — must not be a failure.
    expect(judgeSingleWord({ target: 'center', heardTranscript: 'centre' }).status).toBe('clean');
  });

  it('flags a clearly different word as fuzzy with the heard token', () => {
    const v = judgeSingleWord({ target: 'coffee', heardTranscript: 'banana' });
    expect(v.status).toBe('fuzzy');
    expect(v.heard).toBe('banana');
  });

  it('surfaces the specific sound contrast on a close mispronunciation', () => {
    // "think" said as "sink": /TH/ vs /S/ should show up as a sound hint.
    const v = judgeSingleWord({ target: 'think', heardTranscript: 'sink' });
    expect(v.status).toBe('fuzzy');
    expect(v.heard).toBe('sink');
    expect(v.soundHints && v.soundHints.length).toBeGreaterThan(0);
  });

  it('picks the token closest to the target when the engine adds filler', () => {
    // A stray "uh" before the real word must not fail a clean attempt.
    const v = judgeSingleWord({ target: 'coffee', heardTranscript: 'uh coffee' });
    expect(v.status).toBe('clean');
  });

  it('treats an empty transcript as fuzzy with no heard token (no crash)', () => {
    const v = judgeSingleWord({ target: 'coffee', heardTranscript: '' });
    expect(v.status).toBe('fuzzy');
    expect(v.heard).toBeUndefined();
  });

  it('exposes a tunable clean threshold in the documented range', () => {
    expect(WORD_DRILL_CLEAN_SIMILARITY).toBeGreaterThan(0);
    expect(WORD_DRILL_CLEAN_SIMILARITY).toBeLessThanOrEqual(1);
  });
});

describe('speaking word drill — isDrillableStatus', () => {
  it('only fuzzy and missed words are drillable; clean is not', () => {
    expect(isDrillableStatus('fuzzy')).toBe(true);
    expect(isDrillableStatus('missed')).toBe(true);
    expect(isDrillableStatus('clean')).toBe(false);
  });
});

describe('speaking word drill — effectivePhraseScore', () => {
  const T = 75;

  it('leaves the score unchanged when nothing has been fixed', () => {
    expect(
      effectivePhraseScore({ baseScore: 40, totalProblems: 3, fixedProblems: 0, passThreshold: T }),
    ).toBe(40);
  });

  it('leaves the score unchanged when there were no problem words', () => {
    expect(
      effectivePhraseScore({ baseScore: 88, totalProblems: 0, fixedProblems: 0, passThreshold: T }),
    ).toBe(88);
  });

  it('lifts the score partway as some problem words are fixed', () => {
    const partial = effectivePhraseScore({
      baseScore: 40,
      totalProblems: 4,
      fixedProblems: 2,
      passThreshold: T,
    });
    expect(partial).toBeGreaterThan(40);
    expect(partial).toBeLessThan(T);
  });

  it('reaches an excellent-band pass when every problem word is fixed', () => {
    const full = effectivePhraseScore({
      baseScore: 40,
      totalProblems: 3,
      fixedProblems: 3,
      passThreshold: T,
    });
    expect(full).toBeGreaterThanOrEqual(T); // фраза теперь засчитана
    expect(full).toBeGreaterThanOrEqual(90); // и в полосе «отлично»
  });

  it('is monotonic and never drops below the base score', () => {
    const base = 60;
    const a = effectivePhraseScore({ baseScore: base, totalProblems: 3, fixedProblems: 1, passThreshold: T });
    const b = effectivePhraseScore({ baseScore: base, totalProblems: 3, fixedProblems: 2, passThreshold: T });
    expect(a).toBeGreaterThanOrEqual(base);
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it('never exceeds 100', () => {
    expect(
      effectivePhraseScore({ baseScore: 98, totalProblems: 2, fixedProblems: 2, passThreshold: T }),
    ).toBeLessThanOrEqual(100);
  });
});
