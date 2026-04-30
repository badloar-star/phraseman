import { normalizeSpeechRate } from '../app/user_settings_store';

describe('speech rate guard', () => {
  it('clamps invalid and too-fast values to safe range', () => {
    expect(normalizeSpeechRate(undefined)).toBe(0.9);
    expect(normalizeSpeechRate(Number.NaN)).toBe(0.9);
    expect(normalizeSpeechRate(10)).toBe(1.0);
    expect(normalizeSpeechRate(1.0)).toBe(1.0);
    expect(normalizeSpeechRate(0.1)).toBe(0.5);
  });

  it('rounds to one decimal inside safe range', () => {
    expect(normalizeSpeechRate(0.86)).toBe(0.9);
    expect(normalizeSpeechRate(0.84)).toBe(0.8);
    expect(normalizeSpeechRate('0.73')).toBe(0.7);
  });
});
