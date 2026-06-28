import fs from 'fs';
import path from 'path';

describe('admin premium grant contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'index.html'), 'utf8');

  it('writes admin grants as VIP fields instead of premium fields', () => {
    expect(html).toMatch(/'progress\.vip_active'\s*:\s*'true'/);
    expect(html).toMatch(/'progress\.vip_plan'\s*:\s*plan/);
    expect(html).toMatch(/'progress\.vip_until'\s*:\s*expiryStr/);
    expect(html).toMatch(/'progress\.vip_admin_grant_at'\s*:\s*grantAt/);
    expect(html).not.toMatch(/'progress\.premium_plan'\s*:\s*plan/);
  });

  it('shows VIP as a separate admin section instead of hiding it inside Premium', () => {
    expect(html).toContain("switchTab('vip')");
    expect(html).toContain('id="tab-vip"');
    expect(html).toContain('window.renderVipList');
    expect(html).toContain('window.loadVipData');
    expect(html).toContain('💚 Выдать Plus');
    expect(html).toContain('Снять Plus');
    expect(html).toContain("if (tab === 'vip'");
    expect(html).toContain("'premium','vip'");
  });

  it('keeps forever and bulk grants as admin_vip, not annual Premium', () => {
    expect(html).toMatch(/plan\s*=\s*'admin_vip'/);
    expect(html).toMatch(/'progress\.vip_plan'\s*:\s*'admin_vip'/);
    expect(html).not.toMatch(/'progress\.premium_plan'\s*:\s*'annual'/);
  });

  it('does not allow new manual admin_grant writes through the Premium debug editor', () => {
    expect(html).toMatch(/allowed\s*=\s*new Set\(\['monthly', 'annual', 'yearly', 'null', ''\]\)/);
    expect(html).toContain('Для админской выдачи используй Plus');
    expect(html).not.toContain("new Set(['monthly', 'annual', 'yearly', 'admin_grant'");
  });

  it('extends timed VIP from the current VIP expiry only, never from real Premium expiry', () => {
    expect(html).toMatch(/rawProg \|\| \{\}\)\.vip_until \|\| '0'/);
    expect(html).not.toMatch(/vip_until \|\| \(rawProg \|\| \{\}\)\.premium_expiry/);
  });

  it('keeps a repair action that migrates legacy admin_grant documents into VIP', () => {
    expect(html).toContain('repairAdminGrantPremiumCompat');
    expect(html).toContain("where('progress.premium_plan', '==', 'admin_grant')");
    expect(html).toContain("'progress.vip_migrated_from_admin_grant_at'");
  });

  it('can find an exact user nickname from Firestore when the loaded users list misses it', () => {
    expect(html).toContain('function findUserByExactNameToCache');
    expect(html).toContain("where('progress.user_name', '==', cleanName)");
    expect(html).toContain('findCachedUserByUidOrExactName');
    expect(html).toContain('window._usersNameLookupInFlight');
    expect(html).toContain('findUserByExactNameToCache(qRaw)');
  });
});
