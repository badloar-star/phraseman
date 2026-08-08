import { TranscriptAccumulator } from '../app/speaking_transcript_accumulator';
import { scorePronunciationTranscript, PRONUNCIATION_PASS_THRESHOLD } from '../app/personal_plan_pronunciation_scoring_core';

function addRecognitionEvent(
  acc: TranscriptAccumulator,
  transcript: string,
  isFinal: boolean,
): void {
  acc.add(transcript, isFinal);
}

describe('TranscriptAccumulator (fast-speech word union)', () => {
  it('reassembles a segmented fast utterance into the full phrase, in order', () => {
    const acc = new TranscriptAccumulator();
    // Engine emitted replacing fragments, never the whole phrase at once.
    acc.add('I would', false);
    acc.add('I would like', false); // overlaps — dedup keeps order
    acc.add('coffee please', true); // the tail
    expect(acc.union()).toBe('i would like coffee please');
    expect(acc.size()).toBe(5);
  });

  it('preserves repeated words while merging overlapping recognition fragments', () => {
    const acc = new TranscriptAccumulator();
    acc.add('the cat', false);
    acc.add('cat sat', false);
    acc.add('the mat', true);
    expect(acc.union()).toBe('the cat sat the mat');
    expect(acc.size()).toBe(5);
  });

  it('does not lose the second article in the tester sentence', () => {
    const acc = new TranscriptAccumulator();
    acc.add('The charger is near', false);
    acc.add('the phone', true);
    expect(acc.union()).toBe('the charger is near the phone');
    expect(acc.size()).toBe(6);
  });

  it('normalizes case and punctuation, dedups', () => {
    const acc = new TranscriptAccumulator();
    acc.add('Hello,', false);
    acc.add('hello there!', true);
    expect(acc.union()).toBe('hello there');
  });

  it('preserves an explicitly repeated one-word recognition event', () => {
    const acc = new TranscriptAccumulator();
    acc.add('go', true);
    acc.add('go', true);
    expect(acc.union()).toBe('go go');
  });

  it('deduplicates an interim one-word hypothesis replayed as the final result', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go');
  });

  it('preserves the same word spoken in two segmented utterances', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', true);
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go go');
  });

  it('preserves identical final-only segments as distinct utterances', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'go', true);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go go');
  });

  it('preserves identical final multiword segments as distinct utterances', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'very good', true);
    addRecognitionEvent(acc, 'very good', true);
    expect(acc.union()).toBe('very good very good');
  });

  it('deduplicates repeated interim noise before the final replay', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go');
  });

  it('preserves a one-word final segment already present in a longer union', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'go now', true);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go now go');
  });

  it('reset clears interim/final segment-boundary state', () => {
    const acc = new TranscriptAccumulator();
    addRecognitionEvent(acc, 'old', false);
    acc.reset();
    addRecognitionEvent(acc, 'go', false);
    addRecognitionEvent(acc, 'go', true);
    expect(acc.union()).toBe('go');
  });

  it('replaces a revised cumulative hypothesis instead of appending garbage', () => {
    const acc = new TranscriptAccumulator();
    acc.add('I would like', false);
    acc.add('I really would like', true);
    expect(acc.union()).toBe('i really would like');
  });

  it('keeps the leading word when an equal-length tail fragment overlaps', () => {
    const acc = new TranscriptAccumulator();
    acc.add('I would like', false);
    acc.add('would like coffee', true);
    expect(acc.union()).toBe('i would like coffee');
  });

  it('ignores empty / whitespace input', () => {
    const acc = new TranscriptAccumulator();
    acc.add('', false);
    acc.add('   ', true);
    expect(acc.size()).toBe(0);
    expect(acc.union()).toBe('');
  });

  it('reset clears everything for the next attempt', () => {
    const acc = new TranscriptAccumulator();
    acc.add('one two', false);
    acc.reset();
    expect(acc.size()).toBe(0);
    acc.add('three', true);
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
    fragments.forEach((f, index) => acc.add(f, index === fragments.length - 1));
    const union = scorePronunciationTranscript({ targetText: target, transcript: acc.union() });
    expect(acc.union()).toBe('i would like a coffee please');
    expect(union.score).toBeGreaterThanOrEqual(PRONUNCIATION_PASS_THRESHOLD);
    expect(union.passed).toBe(true);
  });

  it('does NOT give a false pass when the words are genuinely wrong', () => {
    const target = 'I would like a coffee please';
    const acc = new TranscriptAccumulator();
    const fragments = ['the dog', 'ran fast', 'today'];
    fragments.forEach((f, index) => acc.add(f, index === fragments.length - 1));
    const r = scorePronunciationTranscript({ targetText: target, transcript: acc.union() });
    expect(r.passed).toBe(false);
  });
});
