import fs from 'fs';
import path from 'path';

describe('admin Plus Radar contract', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

  it('registers a read-only Plus Radar revenue section', () => {
    expect(html).toContain("switchTab('plus-radar')");
    expect(html).toContain('id="tab-plus-radar"');
    expect(html).toContain("'plus-radar','promo-codes'");
    expect(html).toContain("'plus-radar': 'Plus Radar'");
    expect(html).toContain("'plus-radar': 'revenue'");
    expect(html).toContain("if (tab === 'plus-radar'");
  });

  it('tracks the premium duplication cases admins need to inspect', () => {
    expect(html).toContain('function buildPlusRadarRows(users)');
    expect(html).toContain('window.renderPlusRadar = function renderPlusRadar()');
    expect(html).toContain('window.loadPlusRadarData = async function loadPlusRadarData(force)');
    expect(html).toContain('window.exportPlusRadarCSV = function()');
    expect(html).toContain('double_access');
    expect(html).toContain('identity_duplicate_access');
    expect(html).toContain('name_duplicate_access');
    expect(html).toContain('legacy_admin_grant');
    expect(html).toContain('stale_premium_flag');
    expect(html).toContain('manual_store_fields');
    expect(html).toContain('vip_inactive_shape');
  });

  it('does not add Firestore writes to the Plus Radar implementation block', () => {
    const start = html.indexOf('const PLUS_RADAR_KIND_LABELS');
    const end = html.indexOf('// -- SUBSCRIPTION CANCEL SURVEYS TAB', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const radarBlock = html.slice(start, end);

    expect(radarBlock).not.toContain('setDoc(');
    expect(radarBlock).not.toContain('updateDoc(');
    expect(radarBlock).not.toContain('deleteDoc(');
    expect(radarBlock).not.toContain('addDoc(');
  });
});
