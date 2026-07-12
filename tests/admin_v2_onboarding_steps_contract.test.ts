import fs from 'fs';
import path from 'path';

const core = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');

describe('Admin v2 onboarding screen controls', () => {
  it('renders a dedicated protected control for every onboarding step', () => {
    expect(core).toContain("const ONBOARDING_ENABLED_STEPS_KEY = 'onboarding_enabled_steps_v1'");
    for (const id of ['welcome', 'source', 'language', 'level', 'goal', 'minutes', 'aha', 'notifications', 'plusBenefits', 'startMode', 'planComparison', 'onboardingPaywall', 'name']) {
      expect(core).toContain(`['${id}',`);
    }
    expect(core).toContain("const mandatory = id === 'name'");
    expect(core).toContain('mandatory || unavailable || formLocked');
  });

  it('uses preview and the existing revision-safe publish action', () => {
    expect(core).toContain('preview-onboarding-steps');
    expect(core).toContain('buildOnboardingStepsPreview');
    expect(core).toContain("source: 'onboarding-steps'");
    expect(core).toContain('actions.publishRemoteConfig');
    expect(core).toContain('expectedRevision');
    expect(core).toContain('texts: { ...(current.texts || {})');
    expect(core).toContain('const formLocked = locked || Boolean(preview)');
  });
});
