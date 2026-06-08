import fs from 'fs';
import path from 'path';

describe('admin intro full access controls', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_admin_settings_testers.tsx'), 'utf8');
  const adminIndex = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');

  it('adds intro full access activation, expiration, reset, and modal previews to onboarding admin section', () => {
    expect(source).toContain('activateIntroFullAccessForAdmin');
    expect(source).toContain('expireIntroFullAccessForAdmin');
    expect(source).toContain('resetIntroFullAccessForAdmin');
    expect(source).toContain('admin-intro-full-access-activate');
    expect(source).toContain('admin-intro-full-access-expire');
    expect(source).toContain('admin-intro-full-access-reset');
    expect(source).toContain('admin-intro-full-access-preview-welcome');
    expect(source).toContain('admin-intro-full-access-preview-ended');
  });

  it('keeps admin intro controls separate from real Premium and VIP flags', () => {
    const start = source.indexOf('const activateIntroFullAccessQa');
    const end = source.indexOf('const activateVipOnCurrentProfile', start);
    const body = source.slice(start, end);

    expect(source).toContain("emitAppEvent('intro_full_access_changed'");
    expect(body).not.toContain("['premium_active'");
    expect(body).not.toContain("['vip_active'");
  });

  it('adds an Onboarding QA index tab to the web admin', () => {
    expect(adminIndex).toContain("switchTab('onboarding-qa')");
    expect(adminIndex).toContain('tab-onboarding-qa');
    expect(adminIndex).toContain('intro_full_access_started_at_v1');
    expect(adminIndex).toContain('/premium_modal?context=intro_ended');
  });
});
