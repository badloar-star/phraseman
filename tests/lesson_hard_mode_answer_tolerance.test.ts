import { LESSON_DATA } from '../app/lesson_data_all';
import { isCorrectLessonHardModeTypedAnswer } from '../app/lesson_hard_mode_answer_tolerance';
import { phraseAnswerAlternatives, phraseCanonicalAnswer } from '../app/phrase_target_utils';
import { isCorrectAnswer } from '../constants/contractions';

describe('lesson hard mode typed answer tolerance', () => {
  it('accepts singular Tuesday only for lesson 8 phrase 26 hard keyboard input', () => {
    const phrase = LESSON_DATA[8].phrases.find((row) => row.id === 'lesson8_phrase_26');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer(
      'We have class on Tuesday',
      phraseCanonicalAnswer(phrase!, 'en'),
      phraseAnswerAlternatives(phrase!, 'en'),
    )).toBe(false);
    expect(isCorrectLessonHardModeTypedAnswer(phrase!, 'en', 'We have class on Tuesday')).toBe(true);
  });
});
