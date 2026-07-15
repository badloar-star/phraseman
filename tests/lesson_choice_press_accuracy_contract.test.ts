import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const between = (source: string, start: string, end: string): string => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
};

describe('rapid lesson choice presses stay attached to the accepted option', () => {
  it('locks vocabulary training before flashing a question-scoped option identity', () => {
    const source = read('app/lesson_words.tsx');
    const handler = between(source, 'const handleChoice = async', 'const startPractice =');
    const options = between(source, '{current.options.map(', '</DuoPressable>');

    expect(handler).toContain('handleChoice = async (opt: string, optionKey: string)');
    expect(handler).toContain('locked.current = true');
    expect(handler).toContain('flash(optionKey)');
    expect(handler.indexOf('locked.current = true')).toBeLessThan(handler.indexOf('flash(optionKey)'));
    expect(options).toContain('const optionKey = `${current.word.en}:${current.roundIndex}:${i}:${opt}`');
    expect(options).toContain('key={optionKey}');
    expect(options).toContain('const on = flashKey === optionKey');
    expect(options).toContain('onPress={() => { void handleChoice(opt, optionKey); }}');
    expect(options).not.toContain('flash(');
  });

  it('uses live refs in review and starts flash only inside an accepted handler', () => {
    const source = read('app/review.tsx');
    const finishHandler = between(source, 'const finishCard = useCallback', 'const onWordBankTap = useCallback');
    const wordHandler = between(source, 'const onWordBankTap = useCallback', 'const onMeaningPick = useCallback');
    const meaningHandler = between(source, 'const onMeaningPick = useCallback', 'const onSubmitTyped = useCallback');
    const wordOptions = between(source, "{mode === 'word_bank'", "{mode === 'meaning_match'");
    const meaningOptions = between(source, "{mode === 'meaning_match'", "{mode === 'recall_type'");

    expect(source).toContain('const nextSlotRef = useRef(0)');
    expect(source).toContain('const bankTileSlotsRef = useRef<Set<number>>(new Set())');
    expect(finishHandler).toContain('resolveSlotMistake(reviewPhrase, nextSlotRef.current, userPick ?? undefined)');
    expect(wordHandler).toContain('if (checkingRef.current || status !== \'playing\' || burning) return');
    expect(wordHandler).toContain('const liveNextSlot = nextSlotRef.current');
    expect(wordHandler).toContain('flash(optionKey)');
    expect(meaningHandler).toContain('if (checkingRef.current || status !== \'playing\' || burning) return');
    expect(meaningHandler).toContain('flash(optionKey)');

    expect(wordOptions).toContain('const optionKey = `${reviewAttemptIdRef.current}:wb:${tile.slot}:${tile.text}`');
    expect(wordOptions).toContain('key={optionKey}');
    expect(wordOptions).toContain('onPress={() => { onWordBankTap(tile, optionKey); }}');
    expect(wordOptions).not.toContain('flash(');

    expect(meaningOptions).toContain('const optionKey = `${reviewAttemptIdRef.current}:meaning:${j}:${opt}`');
    expect(meaningOptions).toContain('key={optionKey}');
    expect(meaningOptions).toContain('onPress={() => { onMeaningPick(opt, optionKey); }}');
    expect(meaningOptions).not.toContain('flash(');
  });
});
