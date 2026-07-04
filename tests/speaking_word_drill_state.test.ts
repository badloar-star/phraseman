import {
  initWordDrillState,
  openWord,
  closeWord,
  markWordClean,
  isWordCleaned,
  allProblemsCleaned,
} from '../app/speaking_word_drill_state';

describe('speaking word drill state (pure reducer)', () => {
  it('starts with no open card and nothing cleaned', () => {
    const s = initWordDrillState();
    expect(s.openIndex).toBeNull();
    expect(s.cleaned.size).toBe(0);
  });

  it('opens a word card', () => {
    const s = openWord(initWordDrillState(), 3);
    expect(s.openIndex).toBe(3);
  });

  it('toggles the same word closed on a second tap', () => {
    const s = openWord(openWord(initWordDrillState(), 3), 3);
    expect(s.openIndex).toBeNull();
  });

  it('switches to a different word (only one card open at a time)', () => {
    const s = openWord(openWord(initWordDrillState(), 3), 5);
    expect(s.openIndex).toBe(5);
  });

  it('closeWord clears the open card', () => {
    expect(closeWord(openWord(initWordDrillState(), 2)).openIndex).toBeNull();
  });

  it('closeWord on an already-closed state returns the same reference', () => {
    const s = initWordDrillState();
    expect(closeWord(s)).toBe(s);
  });

  it('marks a word clean and reports it cleaned', () => {
    const s = markWordClean(initWordDrillState(), 1);
    expect(isWordCleaned(s, 1)).toBe(true);
    expect(isWordCleaned(s, 2)).toBe(false);
  });

  it('markWordClean is idempotent and returns the same reference when unchanged', () => {
    const s1 = markWordClean(initWordDrillState(), 1);
    const s2 = markWordClean(s1, 1);
    expect(s2).toBe(s1);
  });

  it('does NOT mutate the original state (immutability)', () => {
    const s0 = initWordDrillState();
    const s1 = markWordClean(s0, 1);
    expect(s0.cleaned.size).toBe(0);
    expect(s1.cleaned.size).toBe(1);
    expect(s1).not.toBe(s0);
  });

  it('all problems cleaned only once every problem index is clean', () => {
    let s = initWordDrillState();
    const problems = [1, 3];
    expect(allProblemsCleaned(s, problems)).toBe(false);
    s = markWordClean(s, 1);
    expect(allProblemsCleaned(s, problems)).toBe(false);
    s = markWordClean(s, 3);
    expect(allProblemsCleaned(s, problems)).toBe(true);
  });

  it('all problems cleaned is false when there were no problems to fix', () => {
    const s = markWordClean(initWordDrillState(), 0);
    expect(allProblemsCleaned(s, [])).toBe(false);
  });
});
