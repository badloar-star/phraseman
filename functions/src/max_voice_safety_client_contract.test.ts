import fs from 'node:fs';
import path from 'node:path';

describe('MAX voice safety client contract', () => {
  test('sends the tool-call id and no transcript or free text', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../app/max_call_session.tsx'), 'utf8');
    const payload = source.match(/void safetyReportCallable\(\{([\s\S]{0,500}?)\}\)\.catch/)?.[1] ?? '';
    expect(payload).toContain('reportId: call.callId');
    expect(payload).not.toMatch(/\bhistory\b|\bnote\b|\bmode\b/);
  });

  test('only verified finalization opts into settled-session review', () => {
    const finalize = fs.readFileSync(path.resolve(__dirname, './max_voice_finalize.ts'), 'utf8');
    const premium = fs.readFileSync(path.resolve(__dirname, './premium_dialog_review.ts'), 'utf8');
    const finalizeReview = finalize.match(/reviewSafety:[\s\S]{0,1000}?reviewVoiceSafety\(\{([\s\S]{0,1000}?)\}\);/)?.[1] ?? '';
    const premiumReview = premium.match(/const safetyPromise[\s\S]{0,500}?reviewVoiceSafety\(\{([\s\S]{0,500}?)\}\)/)?.[1] ?? '';

    expect(finalizeReview).toContain('allowSettled: true');
    expect(premiumReview).not.toContain('allowSettled');
  });
});
