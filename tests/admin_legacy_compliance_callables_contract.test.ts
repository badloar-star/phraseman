import { readFileSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(__dirname, '..', 'admin', 'legacy.html'), 'utf8');

function block(start: string, end: string) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return html.slice(from, to);
}

describe('live admin compliance boundaries', () => {
  test('caches each protected callable exactly once', () => {
    for (const name of ['adminGetComplianceOverview', 'adminListSafetyFlags', 'adminMarkSafetyFlagsHandled']) {
      expect((html.match(new RegExp(`httpsCallable\\(functionsUs, '${name}'\\)`, 'g')) || [])).toHaveLength(1);
    }
  });

  test('safety loaders and mutations have no direct Firestore read/write boundary', () => {
    const safety = block('async function fetchSafetyFlagsPage(reset)', '// ── Age & consent');
    expect(safety).not.toContain("collection(db, 'safety_flags')");
    expect(safety).not.toContain('updateDoc(');
    expect(safety).not.toContain('writeBatch(');
    expect(safety).not.toContain('logAction(');
    expect(safety).not.toContain('prompt(');
    expect(safety).toContain('showInputModal({');
    expect(safety).toContain("createAdminCommandId('safety_request')");
    expect(safety).toContain("createAdminCommandId('safety_operation')");
    expect(safety).toContain("decodeURIComponent('${encodeURIComponent(String(r.id)).replace(/'/g, '%27')}')");
    expect(safety).toContain('filteredTotal');
    expect(safety).toContain('scanBoundReached');
    expect(safety).toContain('loadMoreSafetyFlags');
    expect(safety).toContain('Причина обязательна');
  });

  test('age and radar use complete server aggregates and honest privacy wording', () => {
    const age = block('window.loadAgeConsent = async function()', '// ═══ COMPLIANCE RADAR');
    const radar = block('window.loadComplianceRadar = async function(force)', '// ═══ DAILY DIGEST');
    expect(age).toContain('getAdminGetComplianceOverviewCallable()');
    expect(age).not.toContain("collection(db, 'user_consents')");
    expect(age).toContain('Один текущий снимок на каноническую идентичность');
    expect(radar).toContain('getAdminGetComplianceOverviewCallable()');
    expect(radar).not.toContain('EU_LANGS');
    expect(radar).not.toContain('minorsNoConsent');
    expect(radar).toContain('ожидаемая privacy-защита, не нарушение');
    expect(radar).toContain('страна не собирается');
    expect(radar).toContain("openMinorFlags > 0 ? 'red'");
    expect(radar).toContain('зелёный статус недоступен');
  });
});
