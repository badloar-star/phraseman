import fs from 'fs';
import path from 'path';

import { splitTheoryHighlight } from '../components/theory/highlight';
import { getLessonPrepositionPack } from '../app/lesson_prepositions';
import { shuffleWordBankTiles, tokenizeRecallPhrase } from '../app/review_evaluator';

const trainerSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'trainer_phrases_session.tsx'),
  'utf8',
);
const theorySource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'theory_content_lesson25.ts'),
  'utf8',
);
const lessonSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'lesson1.tsx'),
  'utf8',
);
const flashcardsSwipeSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'),
  'utf8',
);

describe('reported user UI regressions', () => {
  it('does not make the phrase check button look active before the word bank is complete', () => {
    expect(trainerSource).toContain('const canCheck = selected.length === correctTokens.length && correctTokens.length > 0;');
    expect(trainerSource).toContain('disabled={!canCheck || feedback !== \'none\'}');
    expect(trainerSource).toContain("opacity: canCheck || feedback !== 'none' ? 1 : 0.4");
  });

  it('allows the phrase-result action to scroll into view on short screens', () => {
    expect(trainerSource).toContain("contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}");
    expect(trainerSource).not.toContain("contentContainerStyle={{ padding: 16, paddingTop: 8, flex: 1 }}");
  });

  it('keeps the advance action but removes the redundant repeat action', () => {
    expect(trainerSource).toContain('onAdvance: () => void;');
    expect(trainerSource).toContain("ru: 'Готово →'");
    expect(trainerSource).not.toContain('const retry = () => {');
    expect(trainerSource).not.toContain("ru: 'Повторить ещё раз'");
    expect(trainerSource).not.toContain('waitForPhraseAnswerFeedback');
  });

  it('records only the first graded attempt when a learner retries the same phrase', () => {
    expect(trainerSource).toContain('const hasRecordedResult = useRef(false);');
    expect(trainerSource).toContain('if (hasRecordedResult.current) return;');
  });

  it('keeps one primary English result with the save action beside it', () => {
    expect(lessonSource).toContain('testID="lesson1-primary-answer-row"');
    expect(lessonSource).toContain('testID="lesson1-primary-save"');
    expect(lessonSource).not.toContain("<View style={{ backgroundColor: t.correctBg, padding: linkedSliceCompact ? 10 : 15");
  });

  it('never leaves a multi-word phrase in the original word order', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const phrase = 'You can go back later';
      const shuffled = shuffleWordBankTiles(phrase);
      expect(shuffled.map((tile) => tile.text)).not.toEqual(tokenizeRecallPhrase(phrase));
      expect(shuffled.find((tile) => tile.slot === 0)?.text).toBe('you');
    } finally {
      random.mockRestore();
    }
  });

  it('keeps the question auxiliary highlight contiguous with the theory highlighter', () => {
    expect(theorySource).toContain("hi: 'Were'");
    expect(splitTheoryHighlight('Were they watching TV?', 'Were')).toEqual([
      '',
      'Were',
      ' they watching TV?',
    ]);
  });

  it('shows an explicit lesson action before the source-language prompt', () => {
    expect(lessonSource).toContain('testID="lesson1-task-instruction"');
    expect(lessonSource).toContain("'Собери фразу:'");
    expect(lessonSource).toContain("'Напечатай фразу:'");
  });

  it('keeps multiple answer choices in lesson 8 preposition items', () => {
    const pack = getLessonPrepositionPack(8);
    expect(pack).not.toBeNull();
    expect(pack!.items.length).toBeGreaterThan(0);
    for (const item of pack!.items) {
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.options).toContain(item.correct);
    }
  });

  it('cannot leave the next swipe card transparent after the Android settle watchdog wins', () => {
    const finishStart = flashcardsSwipeSource.indexOf('const finish = () => {');
    const finishEnd = flashcardsSwipeSource.indexOf('// зачем: A-39', finishStart);
    const finish = flashcardsSwipeSource.slice(finishStart, finishEnd);
    const stop = finish.indexOf('flyOpacity.stopAnimation();');
    const restore = finish.indexOf('flyOpacity.setValue(1);');
    const advance = finish.indexOf('after();');

    expect(finishStart).toBeGreaterThanOrEqual(0);
    expect(stop).toBeGreaterThanOrEqual(0);
    expect(restore).toBeGreaterThan(stop);
    expect(advance).toBeGreaterThan(restore);
    expect(flashcardsSwipeSource).toContain('if (settling) return;\n    flyOpacity.stopAnimation();\n    flyOpacity.setValue(1);');
  });
});
