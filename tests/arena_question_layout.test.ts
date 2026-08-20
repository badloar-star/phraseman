import { arenaQuestionLayout } from '../modules/arena/question_layout';

describe('Arena immersive question layout', () => {
  it('expands only pairs and translation builder', () => {
    expect(arenaQuestionLayout('speed_match')).toEqual({
      immersive: true,
      instructionKey: 'matchInstruction',
    });
    expect(arenaQuestionLayout('translate_build')).toEqual({
      immersive: true,
      instructionKey: 'builderInstruction',
    });
    expect(arenaQuestionLayout('guess_phrase')).toEqual({
      immersive: false,
      instructionKey: null,
    });
  });
});
