import { TranscriptAccumulator } from '../app/speaking_transcript_accumulator';
import { scorePronunciationTranscript, PRONUNCIATION_PASS_THRESHOLD } from '../app/personal_plan_pronunciation_scoring_core';

describe('TranscriptAccumulator (fast-speech word union)', () => {
  it('reassembles a segmented fast utterance into the full phrase, in order', () => {
    const acc = new TranscriptAccumulator();
    // Engine emitted replacing fragments, never the whole phrase at once.
    acc.add('I would');
    acc.add('I would like'); // overlaps — dedup keeps order
    acc.add('coffee please'); // the tail
    expect(acc.union()).toBe('i would like coffee please');
    expect(acc.size()).toBe(5);
  });

  it('preserves first-seen order even when later fragments repeat earlier words', () => {
    const acc = new TranscriptAccumulator();
    acc.add('the cat');
    acc.add('cat sat');
    acc.add('the mat');
    // first-seen: the, cat, sat, mat
    expect(acc.union()).toBe('the cat sat mat');
  });

  it('normalizes case and punctuation, dedups', () => {
    const acc = new TranscriptAccumulator();
    acc.add('Hello,');
    acc.add('hello there!');
    expect(acc.union()).toBe('hello there');
  });

  it('ignores empty / whitespace input', () => {
    const acc = new TranscriptAccumulator();
    acc.add('');
    acc.add('   ');
    expect(acc.size()).toBe(0);
    expect(acc.union()).toBe('');
  });

  it('reset clears everything for the next attempt', () => {
    const acc = new TranscriptAccumulator();
    acc.add('one two');
    acc.reset();
    expect(acc.size()).toBe(0);
    acc.add('three');
    expect(acc.union()).toBe('three');
  });

  it('END-TO-END: fast segmented speech passes via the union, the last fragment alone fails', () => {
    const target = 'I would like a coffee please';
    // Fast native speech: engine sent replacing fragments, the LAST one is just the tail.
    const fragments = ['I would', 'would like a', 'a coffee please'];

    // Old behavior: score only the last fragment → fails.
    const lastOnly = scorePronunciationTranscript({ targetText: target, transcript: fragments[fragments.length - 1]! });
    expect(lastOnly.passed).toBe(false);

    // New behavior: accumulate the union across all fragments → passes.
    const acc = new TranscriptAccumulator();
    fragments.forEach((f) => acc.add(f));
    const union = scorePronunciationTranscript({ targetText: target, transcript: acc.union() });
    expect(acc.union()).toBe('i would like a coffee please');
    expect(union.score).toBeGreaterThanOrEqual(PRONUNCIATION_PASS_THRESHOLD);
    expect(union.passed).toBe(true);
  });

  it('does NOT give a false pass when the words are genuinely wrong', () => {
    const target = 'I would like a coffee please';
    const acc = new TranscriptAccumulator();
    ['the dog', 'ran fast', 'today'].forEach((f) => acc.add(f));
    const r = scorePronunciationTranscript({ targetText: target, transcript: acc.union() });
    expect(r.passed).toBe(false);
  });
});
