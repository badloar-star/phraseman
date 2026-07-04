import {
  judgeSingleWord,
  isDrillableStatus,
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
