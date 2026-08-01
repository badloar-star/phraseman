import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const layout = readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const client = readFileSync(path.join(root, 'app/age_consent_cloud.ts'), 'utf8');

describe('age consent durable boot delivery contract', () => {
  it('resumes exactly once after boot identity without blocking the first frame', () => {
    const importLine = "import { resumePendingAgeConsent } from './age_consent_cloud';";
    const restoreStart = layout.indexOf('const restoreCloudForBoot = async () => {');
    const authReady = layout.indexOf('await ensureAnonUser();', restoreStart);
    const onboardingResume = layout.indexOf(
      'void resumePendingOnboardingFunnel().catch(() => {});',
      restoreStart,
    );
    const resumeCall = 'void resumePendingAgeConsent().catch(() => {});';
    const consentResume = layout.indexOf(resumeCall, restoreStart);

    expect(layout).toContain(importLine);
    expect(restoreStart).toBeGreaterThan(-1);
    expect(authReady).toBeGreaterThan(restoreStart);
    expect(onboardingResume).toBeGreaterThan(authReady);
    expect(consentResume).toBeGreaterThan(onboardingResume);
    expect(layout.split(resumeCall)).toHaveLength(2);
    expect(layout).not.toContain('await resumePendingAgeConsent()');
    expect(client).not.toContain('setInterval(');
  });
});
