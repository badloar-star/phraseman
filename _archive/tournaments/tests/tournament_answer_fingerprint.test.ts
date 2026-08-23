import { answerFingerprint, canonicalAnswerValue } from '../app/tournament_answer_fingerprint';

describe('tournament answer fingerprint', () => {
  test('preserves answer casing and matches the server golden hash', () => {
    expect(canonicalAnswerValue(['She'])).toBe('She');
    expect(answerFingerprint('room-case', 'translate-case', ['She'])).toBe('1492h78');
    expect(answerFingerprint('room-case', 'translate-case', ['she'])).toBe('cwrldg');
  });

  test('uses the same token separator as the server', () => {
    expect(canonicalAnswerValue(['I', 'am', 'ready'])).toBe('I\u0001am\u0001ready');
    expect(answerFingerprint(
      'room-a',
      'translate-fingerprint-legacy',
      ['I', 'am', 'ready'],
    )).toBe('1kwfq3p');
  });
});
