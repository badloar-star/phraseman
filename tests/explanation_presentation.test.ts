import {
  buildExplainSheetBlocks,
  buildMistakeExplanationBlocks,
  buildQuizExplanationBlocks,
  semanticToneAccent,
  type SemanticExplanationBlock,
} from '../app/explanation_presentation';

const tones = (blocks: SemanticExplanationBlock[]) => blocks.map((block) => block.tone);

describe('semantic explanation presentation blocks', () => {
  it('splits a mistake explanation into user answer, reason, memory tip, and correct answer blocks', () => {
    const blocks = buildMistakeExplanationBlocks({
      lang: 'ru',
      explanation: 'Use an adverb here.',
      userAnswer: 'They work slower now.',
      targetAnswer: 'They work more slowly now.',
    });

    expect(tones(blocks)).toEqual(['wrong', 'insight', 'memory', 'correct']);
    expect(blocks[0]).toMatchObject({ title: 'Твой выбор', text: 'They work slower now.' });
    expect(blocks[1]).toMatchObject({ title: 'Почему', text: 'Use an adverb here.' });
    expect(blocks[3]).toMatchObject({ title: 'Правильно', text: 'They work more slowly now.' });
  });

  it('does not invent empty answer blocks when values are missing', () => {
    const blocks = buildMistakeExplanationBlocks({
      lang: 'ru',
      explanation: 'Fallback explanation only.',
    });

    expect(tones(blocks)).toEqual(['insight']);
    expect(blocks[0].text).toBe('Fallback explanation only.');
  });

  it('uses the same scheme for phrase explain sheets without highlighting free Latin prose as English', () => {
    const blocks = buildExplainSheetBlocks({
      lang: 'ru',
      phraseEn: 'I am ready',
      explanation: 'This is a full sentence in the server response.',
    });

    expect(tones(blocks)).toEqual(['correct', 'insight', 'memory']);
    expect(blocks[0]).toMatchObject({ title: 'Фраза', text: 'I am ready' });
    expect(blocks[1]).toMatchObject({ title: 'Почему' });
    expect(blocks[1].emphasizeText).toBe(false);
  });

  it('keeps quiz explanations semantic for both wrong and correct answers', () => {
    expect(tones(buildQuizExplanationBlocks({
      lang: 'ru',
      correct: false,
      pickedAnswer: 'slower',
      correctAnswer: 'slowly',
      explanation: 'Use the adverb.',
    }))).toEqual(['wrong', 'insight', 'correct']);

    expect(tones(buildQuizExplanationBlocks({
      lang: 'ru',
      correct: true,
      pickedAnswer: 'slowly',
      correctAnswer: 'slowly',
      explanation: 'That is the adverb form.',
    }))).toEqual(['correct', 'insight']);
  });

  it('maps tones to theme colors without using accent for every role', () => {
    expect(semanticToneAccent('wrong')).toBe('wrong');
    expect(semanticToneAccent('insight')).toBe('accent');
    expect(semanticToneAccent('memory')).toBe('gold');
    expect(semanticToneAccent('correct')).toBe('correct');
  });
});
