import fs from 'fs';
import path from 'path';

describe('admin premium grant contract', () => {
  // зачем: тест читал admin/index.html — ЗАМОРОЖЕННУЮ админку (CLAUDE.md: рабочая
  // одна — admin/v2/legacy.html, её и публикует hosting). Весь проверяемый
  // функционал (switchTab('vip'), repairAdminGrantPremiumCompat, VIP-поля) живёт
  // именно там, а в index.html его нет вовсе — тест падал на семи проверках,
  // сверяя контракт с файлом, который не попадает на боевую.
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

  const between = (startMarker: string, endMarker: string): string => {
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker, start + 1);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return html.slice(start, end);
  };

  const expectNoDirectSensitiveWrite = (body: string): void => {
    expect(body).not.toMatch(/\b(?:addDoc|setDoc|updateDoc|deleteDoc|writeBatch)\s*\(/);
    expect(body).not.toContain('.catch(()=>{})');
    expect(body).not.toContain('.catch(() => {})');
  };

  it('routes admin VIP grants through the protected callable with verified responses', () => {
    const grants = [
      between('window.grantHelperPlus = async function', 'window.editShards = async function'),
      between('async function grantAdminPremiumChoice', 'window.revokeAdminVip = async function'),
      between('window.bulkGrantPremium = async function', 'window.bulkBanUsers = async function'),
    ];
    for (const body of grants) {
      expectNoDirectSensitiveWrite(body);
      expect(body).toContain('getAdminGrantAccessCallable()');
      expect(body).toContain("kind: 'vip'");
      expect(body).toContain('active: true');
      expect(body).toContain('reason');
      expect(body).toContain('requestId');
      expect(body).toContain('idempotencyKey');
      expect(body).toMatch(/response\.data\.ok\s*!==\s*true/);
      expect(body).toContain('response.data.uid');
    }
    expect(grants[0]).toContain('Number(response.data.expiresAtMs)');
    expect(grants[1]).toContain('Number(response.data.expiresAtMs)');
    expect(grants[2]).toContain("response.data.kind !== 'vip'");
    expect(grants[2]).toContain('response.data.active !== true');
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
    const timedGrant = between('async function grantAdminPremiumChoice', 'window.revokeAdminVip = async function');
    const bulkGrant = between('window.bulkGrantPremium = async function', 'window.bulkBanUsers = async function');
    expect(timedGrant).toContain("spec.kind === 'forever' ? 0");
    expect(timedGrant).toContain("vip_plan: 'admin_vip'");
    expect(bulkGrant).toContain('durationDays: 0');
    expect(bulkGrant).toContain("vip_plan: 'admin_vip'");
    expect(timedGrant + bulkGrant).not.toContain("premium_plan: 'annual'");
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

  it('keeps a protected compatibility migration for legacy admin_grant documents', () => {
    const repair = between('window.repairAdminGrantPremiumCompat = async function', 'function appMessageClampDays');
    expectNoDirectSensitiveWrite(repair);
    expect(repair).toContain("where('progress.premium_plan', '==', 'admin_grant')");
    expect(repair).toContain('limit(500)');
    expect(repair).toContain('getAdminMigrateLegacyAdminPremiumCallable()');
    expect(repair).toContain('uids: chunk, reason');
    expect(repair).toContain("createAdminCommandId('premium_migration_request')");
    expect(repair).toContain("createAdminCommandId('premium_migration_operation')");
    expect(repair).toContain('data.ok !== true');
    expect(repair).toContain('Number(data.checked) !== chunk.length');
    expect(repair).toContain('!Array.isArray(data.migrated)');
    expect(repair).toContain('!Array.isArray(data.skipped)');
  });

  it('can find an exact user nickname from Firestore when the loaded users list misses it', () => {
    expect(html).toContain('function findUserByExactNameToCache');
    expect(html).toContain("where('progress.user_name', '==', val)");
    expect(html).toContain('findCachedUserByUidOrExactName');
    expect(html).toContain('window._usersNameLookupInFlight');
    expect(html).toContain('findUserByExactNameToCache(qRaw)');
  });
});
