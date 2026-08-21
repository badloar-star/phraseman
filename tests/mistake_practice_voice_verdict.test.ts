import { classifyMistakeVoiceVerdict } from '../modules/mistake-practice/voice_verdict';

describe('mistake practice voice verdict', () => {
  test('has four explicit outcomes and keeps the uncertainty band neutral', () => {
    expect(classifyMistakeVoiceVerdict({ status: 'invalid', score: null, threshold: 70 })).toBe('INVALID');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 72, threshold: 70 })).toBe('UNCERTAIN');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 80, threshold: 70 })).toBe('PASS');
    expect(classifyMistakeVoiceVerdict({ status: 'scored', score: 60, threshold: 70 })).toBe('FAIL');
  });
});
