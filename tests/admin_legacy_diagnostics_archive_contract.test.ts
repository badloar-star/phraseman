import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');

describe('legacy diagnostics native cutover', () => {
  test('redirects all three legacy tabs to exact Admin v2 capability hashes', () => {
    expect(source).toContain('installNativeDiagnosticsRedirects');
    expect(source).toContain("new Set(['app-health', 'archive', 'changelog-0608'])");
    expect(source).toContain("'./v2/index.html#' + encodeURIComponent(String(tab))");
    expect(source).toContain("legacyArchive') === '1'");
  });

  test('keeps emergency App Health and Archive markup read-only without loading production data', () => {
    expect(source).toContain('data-diagnostics-archive');
    expect(source).toContain('pointer-events:none!important');
    for (const name of ['loadAppHealth', 'loadAppActivity', 'loadArchive']) {
      expect(source).toContain(`window.${name} = async function ${name}DiagnosticsArchive`);
    }
    expect(source).toContain('Архивный макет — без прямого доступа к данным');
  });

  test('fail-closes the legacy App Health write and copy entry points', () => {
    expect(source).toContain('window.markAppHealthStatus = function markAppHealthStatusDiagnosticsV2');
    expect(source).toContain('window.copyAppHealthForAI = function copyAppHealthForAIDiagnosticsV2');
    expect(source).toContain('window.copyAppHealthRaw = function copyAppHealthRawDiagnosticsV2');
  });
});
