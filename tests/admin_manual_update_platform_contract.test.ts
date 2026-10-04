import fs from 'fs';
import path from 'path';

describe('admin manual update platform targeting contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

  it('lets admins target manual update modal by platform', () => {
    expect(html).toContain('id="cp-manual-update-platform"');
    expect(html).toContain('<option value="">iOS и Android</option>');
    expect(html).toContain('<option value="ios">iOS</option>');
    expect(html).toContain('<option value="android">Android</option>');
  });

  it('loads and saves manual_update_platform in remote_config/app.texts', () => {
    // зачем (04.10): в v2 помощники называются cpSetValue/cpValue — проверяем смысл, не форму вызова
    expect(html).toContain("cpSetValue('cp-manual-update-platform', texts.manual_update_platform)");
    expect(html).toContain("manual_update_platform: cpValue('cp-manual-update-platform')");
  });
});
