import {
  classifyMistakeVoiceVerdict,
  mistakeVoiceOutcomeToSessionAttemptVerdict,
} from '../modules/mistake-practice/voice_verdict';

describe('mistake practice voice verdict', () => {
  test('has four explicit outcomes and keeps the uncertainty band neutral', () => {
    expect(classifyMistakeVoiceVerdict({ status: 'invalid', score: null, threshold: 70 })).toBe('INVALID');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 72, threshold: 70 })).toBe('UNCERTAIN');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 80, threshold: 70 })).toBe('PASS');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 60, threshold: 70 })).toBe('FAIL');
  });

  test('only explicit FAIL maps to a paid pedagogical wrong', () => {
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('PASS')).toBe('correct');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('FAIL')).toBe('pedagogical_wrong');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('UNCERTAIN')).toBe('no_speech');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('INVALID')).toBe('technical_error');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('no_speech')).toBe('no_speech');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('stalled')).toBe('technical_error');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('denied')).toBe('technical_error');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('unavailable')).toBe('technical_error');
    expect(mistakeVoiceOutcomeToSessionAttemptVerdict('cancelled')).toBe('cancelled');
  });
});
