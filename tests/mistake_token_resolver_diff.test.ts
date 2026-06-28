import { resolveAllMistakeTokens } from '../app/mistake_token_resolver';

// Regression guard for the 2026-06-28 audit: the old positional diff fabricated false
// pairs whenever a contraction (don't = do + not) or a missing/extra word shifted the
// tail. The LCS + contraction-expansion diff must report ONLY genuine differences.

const keys = (pairs: { expected: string; picked: string }[]) =>
  pairs.map((p) => `${p.picked || '∅'}→${p.expected || '∅'}`);

describe('resolveAllMistakeTokens — LCS + contraction-aware diff', () => {
  it('treats a contraction as equal to its full form (no false pairs)', () => {
    expect(resolveAllMistakeTokens('I do not understand', "I don't understand")).toEqual([]);
    expect(resolveAllMistakeTokens('They are playing', "They're playing")).toEqual([]);
    expect(resolveAllMistakeTokens("I don't want it", 'I do not want it')).toEqual([]);
    expect(resolveAllMistakeTokens('We will see', "We'll see")).toEqual([]);
  });

  it('reports only the real error when a contraction is also present', () => {
    // real error: works -> work (extra -s). Old diff also emitted doesn't→does, etc.
    expect(keys(resolveAllMistakeTokens('He does not work here', "He doesn't works here")))
      .toEqual(['works→work']);
  });

  it('isolates a single +s error without shifting the tail', () => {
    expect(keys(resolveAllMistakeTokens('You do not understand me', 'You do not understands me')))
      .toEqual(['understands→understand']);
  });

  it('reports a missing word as expected-only, not a cascade', () => {
    expect(keys(resolveAllMistakeTokens('She is happy', 'She happy'))).toEqual(['∅→is']);
    expect(keys(resolveAllMistakeTokens('It is cold today', 'Is cold today'))).toEqual(['∅→it']);
  });

  it('reports an extra word as picked-only', () => {
    expect(keys(resolveAllMistakeTokens('You are not listening', "You aren't listening to me")))
      .toEqual(['to→∅', 'me→∅']);
  });

  it('still catches plain word-choice and antonym swaps (unchanged behavior)', () => {
    expect(keys(resolveAllMistakeTokens('I have many friends', 'I have much friends')))
      .toEqual(['much→many']);
    expect(keys(resolveAllMistakeTokens('Please close the door', 'Please open the door')))
      .toEqual(['open→close']);
  });

  it('returns empty for an identical answer', () => {
    expect(resolveAllMistakeTokens('Give me the book', 'Give me the book')).toEqual([]);
  });
});
