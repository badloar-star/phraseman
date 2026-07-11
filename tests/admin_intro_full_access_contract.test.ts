import fs from 'fs';
import path from 'path';

describe('admin onboarding cleanup contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');
  const adminIndex = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');
  const labs = fs.readFileSync(path.join(process.cwd(), 'components', 'admin_panel', 'sections', 'LabsSection.tsx'), 'utf8');
  const legacyRoute = 'admin' + '_intro' + '_preview';
  const legacyQaTab = 'onboarding' + '-qa';
  const legacyQaTitle = 'Onboarding' + ' QA';
  const legacyLabButton = 'admin-lab' + '-intro-preview';
  const legacyIntroPrefix = 'admin-intro' + '-full-access';

  it('keeps only the new onboarding launcher in tester settings', () => {
    expect(source).toContain('admin-new-onboarding-reset');
    expect(source).toContain('ADMIN_ONBOARDING_FLOW_VERSION_KEY');
    expect(source).toContain('ADMIN_ONBOARDING_FLOW_VERSION');
    expect(source).toContain("const ADMIN_ONBOARDING_FLOW_VERSION = 'clean_midnight_aha_flow_2026_07_02b'");
    expect(source).toContain("['onboarding_step', 'welcome']");
    expect(source).not.toContain("['onboarding_step', 'start']");
    expect(source).not.toContain("['onboarding_step', 'studyTarget']");
    expect(source).toContain("'onboarding_discovery_source'");
    expect(source).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    expect(source).toContain('PERSONAL_PLAN_PENDING_ACTIVATION_KEY');

    expect(source).not.toContain(`${legacyIntroPrefix}-activate`);
    expect(source).not.toContain(`${legacyIntroPrefix}-expire`);
    expect(source).not.toContain(`${legacyIntroPrefix}-reset`);
    expect(source).not.toContain(`${legacyIntroPrefix}-preview-welcome`);
    expect(source).not.toContain(`${legacyIntroPrefix}-preview-ended`);
    expect(source).not.toContain(`router.push('/${legacyRoute}'`);
  });

  it('removes the legacy onboarding QA web-admin tab', () => {
    const tabKeysMatch = adminIndex.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/);

    expect(tabKeysMatch?.[1]).not.toContain(`'${legacyQaTab}'`);
    expect(adminIndex).not.toContain(`switchTab('${legacyQaTab}')`);
    expect(adminIndex).not.toContain(`tab-${legacyQaTab}`);
    expect(adminIndex).not.toContain('loadOnboarding' + 'QaLive');
    expect(adminIndex).not.toContain(legacyQaTitle);
  });

  it('removes the legacy intro preview route from admin labs', () => {
    expect(labs).not.toContain(legacyLabButton);
    expect(labs).not.toContain(`/${legacyRoute}`);
  });
});
