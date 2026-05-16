import fs from 'fs';
import path from 'path';

describe('admin premium grant contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');

  it('writes new admin premium grants as annual, not legacy admin_grant', () => {
    expect(html).not.toMatch(/'progress\.premium_plan'\s*:\s*'admin_grant'/);
    expect(html).toMatch(/'progress\.premium_plan'\s*:\s*'annual'/);
  });

  it('keeps a repair action for legacy active admin_grant documents', () => {
    expect(html).toContain('repairAdminGrantPremiumCompat');
    expect(html).toContain("where('progress.premium_plan', '==', 'admin_grant')");
  });
});
