import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const layout = readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
const client = readFileSync(path.join(root, 'app/onboarding_funnel.ts'), 'utf8');

describe('onboarding funnel durable boot delivery contract', () => {
  test('boot starts one nonblocking bounded resume after cloud auth establishes identity', () => {
    expect(layout).toContain("import { resumePendingOnboardingFunnel } from './onboarding_funnel';");
    const restoreStart = layout.indexOf('const restoreCloudForBoot = async () => {');
    const authReady = layout.indexOf('await ensureAnonUser();', restoreStart);
    const resumeCall = 'void resumePendingOnboardingFunnel().catch(() => {});';
    const resume = layout.indexOf(resumeCall, restoreStart);

    expect(restoreStart).toBeGreaterThan(-1);
    expect(authReady).toBeGreaterThan(restoreStart);
    expect(resume).toBeGreaterThan(authReady);
    expect(layout.split(resumeCall)).toHaveLength(2);
    expect(layout).not.toContain('await resumePendingOnboardingFunnel()');
    expect(client).toContain('export function resumePendingOnboardingFunnel');
    expect(client).not.toContain('setInterval(');
  });

  test('client payload remains opaque and excludes stable, device, and user identifiers', () => {
    expect(client).toContain("type FunnelPayload = { event: FunnelEvent; platform: FunnelPlatform; attemptId: string };");
    expect(client).not.toMatch(/FunnelPayload[^;]*(?:stableId|deviceId|userId|uid)/s);
  });
});
