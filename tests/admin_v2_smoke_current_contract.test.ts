import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'admin-v2-smoke.mjs'), 'utf8');

describe('current Admin v2 smoke contract', () => {
  it('checks the active single-page shell and analytics modules locally by default', () => {
    expect(source).toContain("fs.readFileSync('admin/v2/index.html'");
    expect(source).toContain("'admin/v2/scripts/components/analytics-language.js'");
    expect(source).toContain("'admin/v2/scripts/pages/product-analytics.js'");
    expect(source).toContain("'admin/v2/scripts/pages/product-sessions.js'");
    expect(source).toContain("'admin/v2/scripts/pages/learning-diagnostics.js'");
    expect(source).toContain("'admin/v2/scripts/pages/conversion-diagnostics.js'");
    expect(source).toContain("'admin/v2/scripts/pages/retention-diagnostics.js'");
    expect(source).toContain("'admin/v2/scripts/pages/subscription-analytics.js'");
    expect(source).toContain('ADMIN_V2_SMOKE_LIVE');
    expect(source).not.toContain("fs.readFileSync('admin/index.html'");
  });
});
