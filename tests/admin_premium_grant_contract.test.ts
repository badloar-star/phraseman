import fs from 'fs';
import path from 'path';

describe('admin premium grant contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');

  it('keeps timed admin premium grants compatible with installed app builds', () => {
    expect(html).toMatch(/plan\s*=\s*'admin_grant'/);
    expect(html).toMatch(/'progress\.premium_plan'\s*:\s*plan/);
    expect(html).toContain('legacy-compatible <code>admin_grant</code>');
  });

  it('keeps forever and bulk grants as annual', () => {
    expect(html).toMatch(/'progress\.premium_plan'\s*:\s*'annual'/);
  });

  it('keeps a repair action for legacy forever admin_grant documents only', () => {
    expect(html).toContain('repairAdminGrantPremiumCompat');
    expect(html).toContain("where('progress.premium_plan', '==', 'admin_grant')");
    expect(html).toContain('adminOverride && expiry === 0');
  });
});
