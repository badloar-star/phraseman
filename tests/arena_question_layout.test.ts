import {
  arenaQuestionLayout,
  arenaQuestionViewportLayout,
} from '../modules/arena/question_layout';

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

  it('bounds internal task regions at 320 pt landscape and 1.5x font', () => {
    expect(arenaQuestionViewportLayout(320, 1.5)).toEqual({
      compactHeight: true,
      answerTrayMaxHeight: 70,
    });
    expect(arenaQuestionViewportLayout(800, 1.5)).toEqual({
      compactHeight: true,
      answerTrayMaxHeight: 80,
    });
    expect(arenaQuestionViewportLayout(800, 1)).toEqual({
      compactHeight: false,
      answerTrayMaxHeight: 132,
    });
  });
});
