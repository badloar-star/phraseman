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

describe('reported user UI regressions', () => {
  it('does not make the phrase check button look active before the word bank is complete', () => {
    expect(trainerSource).toContain('const canCheck = selected.length === correctTokens.length && correctTokens.length > 0;');
    expect(trainerSource).toContain('disabled={!canCheck || feedback !== \'none\'}');
    expect(trainerSource).toContain("opacity: canCheck || feedback !== 'none' ? 1 : 0.4");
  });

  it('keeps a checked phrase on screen until the learner chooses what to do next', () => {
    expect(trainerSource).toContain('onAdvance: () => void;');
    expect(trainerSource).toContain('const retry = () => {');
    expect(trainerSource).toContain("ru: 'Готово →'");
    expect(trainerSource).toContain("ru: 'Повторить ещё раз'");
    expect(trainerSource).not.toContain('waitForPhraseAnswerFeedback');
  });

  it('records only the first graded attempt when a learner retries the same phrase', () => {
    expect(trainerSource).toContain('const hasRecordedResult = useRef(false);');
    expect(trainerSource).toContain('if (hasRecordedResult.current) return;');
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
});
