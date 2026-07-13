import fs from 'fs';
import path from 'path';

describe('soft upsell admin preview integration', () => {
  const root = process.cwd();
  const privateAdminSource = fs.readFileSync(path.join(root, 'app', '_admin_settings_testers.tsx'), 'utf8');
  const publicGateSource = fs.readFileSync(path.join(root, 'app', 'settings_testers.tsx'), 'utf8');
  const uiSource = fs.readFileSync(path.join(root, 'components', 'admin_panel', 'ui.tsx'), 'utf8');

  test('registers the preview section under the monetization chapter', () => {
    expect(uiSource).toContain("soft_upsell_previews: { chapter: 'monetization'");
    expect(privateAdminSource).toContain(
      "import SoftUpsellPreviewSection from '../components/admin_panel/sections/SoftUpsellPreviewSection';",
    );
    expect(privateAdminSource).toContain('<SoftUpsellPreviewSection');
    expect(privateAdminSource).toContain("open={openSection === 'soft_upsell_previews'}");
  });

  test('keeps the section behind the existing dev-only dynamic gate', () => {
    expect(publicGateSource).toContain("if (ENABLE_DEV_TOOLS)");
    expect(publicGateSource).toContain("require('./_admin_settings_testers')");
    expect(publicGateSource).not.toContain('SoftUpsellPreviewSection');
    expect(privateAdminSource).not.toMatch(/adminGetRemoteConfigWorkspace|adminPublishRemoteConfig/);
  });
});
