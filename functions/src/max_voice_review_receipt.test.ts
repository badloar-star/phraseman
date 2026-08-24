import {
  isMaxVoiceReviewReceiptV1,
  sanitizeMaxVoiceReviewReceipt,
} from './max_voice_review_receipt';

function receipt(studyTarget?: 'en' | 'fr' | 'es') {
  return sanitizeMaxVoiceReviewReceipt({
    sessionId: 'session-target',
    stableUid: 'stable-target',
    completedAtMs: 100,
    durationSec: 30,
    endReason: 'completed',
    studyTarget,
    projection: { worked: ['Bien hecho.'] },
    fallbackAction: 'Repite una frase.',
  });
}

describe('MAX review receipt target durability', () => {
  it.each(['en', 'fr', 'es'] as const)('persists and validates studyTarget=%s', (studyTarget) => {
    const value = receipt(studyTarget);
    expect(value.studyTarget).toBe(studyTarget);
    expect(isMaxVoiceReviewReceiptV1(value)).toBe(true);
  });

  it('accepts a legacy receipt without studyTarget as English-compatible', () => {
    const value = receipt();
    expect(value).not.toHaveProperty('studyTarget');
    expect(isMaxVoiceReviewReceiptV1(value)).toBe(true);
  });

  it('rejects an unknown persisted target', () => {
    expect(isMaxVoiceReviewReceiptV1({ ...receipt('en'), studyTarget: 'de' })).toBe(false);
  });
});
