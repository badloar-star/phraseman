import fs from 'fs';
import path from 'path';

describe('admin onboarding cleanup contract', () => {
  const adminIndex = fs.readFileSync(path.join(process.cwd(), 'admin', 'legacy.html'), 'utf8');
  const legacyQaTab = 'onboarding' + '-qa';
  const legacyQaTitle = 'Onboarding' + ' QA';

  it('removes the legacy onboarding QA web-admin tab', () => {
    const tabKeysMatch = adminIndex.match(/const ADMIN_TAB_KEYS = \[([^\]]+)\]/);

    expect(tabKeysMatch?.[1]).not.toContain(`'${legacyQaTab}'`);
    expect(adminIndex).not.toContain(`switchTab('${legacyQaTab}')`);
    expect(adminIndex).not.toContain(`tab-${legacyQaTab}`);
    expect(adminIndex).not.toContain('loadOnboarding' + 'QaLive');
    expect(adminIndex).not.toContain(legacyQaTitle);
  });
});
