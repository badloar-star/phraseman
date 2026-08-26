import { sanitizeVoiceFeedbackRating, voiceFeedbackDocId } from './max_voice_feedback';
import fs from 'node:fs';
import path from 'node:path';

describe('sanitizeVoiceFeedbackRating', () => {
  it('accepts 1-5', () => {
    expect(sanitizeVoiceFeedbackRating(1)).toBe(1);
    expect(sanitizeVoiceFeedbackRating(3)).toBe(3);
    expect(sanitizeVoiceFeedbackRating(5)).toBe(5);
  });

  it('rounds fractional values', () => {
    expect(sanitizeVoiceFeedbackRating(4.6)).toBe(5);
    expect(sanitizeVoiceFeedbackRating(3.2)).toBe(3);
  });

  it('rejects out-of-range and garbage as "no rating" (0)', () => {
    expect(sanitizeVoiceFeedbackRating(0)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(6)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(-1)).toBe(0);
    expect(sanitizeVoiceFeedbackRating('five')).toBe(0);
    expect(sanitizeVoiceFeedbackRating(null)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(undefined)).toBe(0);
    expect(sanitizeVoiceFeedbackRating(NaN)).toBe(0);
  });
});

describe('MAX voice feedback callable boundaries', () => {
  const source = fs.readFileSync(path.join(__dirname, 'max_voice_feedback.ts'), 'utf8');

  it('keeps user submit on global App Check and admin list on the admin-specific flag', () => {
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK,');
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,');
    expect(source).toContain("import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_ADMIN } from './callable_options';");
  });
});

describe('voiceFeedbackDocId', () => {
  it('is deterministic for the same uid+sessionId — one feedback per call', () => {
    const a = voiceFeedbackDocId('uid123', 'sess456');
    const b = voiceFeedbackDocId('uid123', 'sess456');
    expect(a).toBe(b);
  });

  it('differs across sessions of the same user', () => {
    const a = voiceFeedbackDocId('uid123', 'sess456');
    const b = voiceFeedbackDocId('uid123', 'sess789');
    expect(a).not.toBe(b);
  });

  it('strips characters unsafe for a Firestore doc id', () => {
    const id = voiceFeedbackDocId('uid/with:slash', 'sess/with:colon');
    expect(id).not.toMatch(/[/:]/);
  });
});
