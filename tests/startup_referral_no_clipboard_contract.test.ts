import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('startup referral flow', () => {
  it('does not read the iOS clipboard automatically on app startup', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const referralEffectStart = layoutSource.indexOf("void import('./referral_bootstrap')");
    const referralEffectEnd = layoutSource.indexOf('}, []);', referralEffectStart);
    const referralEffect = layoutSource.slice(referralEffectStart, referralEffectEnd);

    expect(referralEffectStart).toBeGreaterThanOrEqual(0);
    expect(referralEffect).toContain('captureReferralFromUrl');
    expect(referralEffect).toContain('subscribeReferralUrl');
    expect(referralEffect).not.toContain('referral_clipboard');
    expect(referralEffect).not.toContain('checkClipboardForReferralOnce');
  });
});
