import fs from 'fs';
import path from 'path';

describe('admin manual update platform targeting contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'legacy.html'), 'utf8');

  it('lets admins target manual update modal by platform', () => {
    expect(html).toContain('id="cp-manual-update-platform"');
    expect(html).toContain('<option value="">iOS и Android</option>');
    expect(html).toContain('<option value="ios">Только iOS</option>');
    expect(html).toContain('<option value="android">Только Android</option>');
  });

  it('loads and saves manual_update_platform in remote_config/app.texts', () => {
    expect(html).toContain("set('cp-manual-update-platform', texts.manual_update_platform)");
    expect(html).toContain("platform: ['ios', 'android'].includes(get('cp-manual-update-platform'))");
    expect(html).toContain('manual_update_platform: data.platform');
  });
});
