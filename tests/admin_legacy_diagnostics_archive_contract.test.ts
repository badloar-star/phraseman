import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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

  test('installs read-only guards even when the legacy archive hash is malformed', () => {
    const script = source.match(/<script>\s*\/\* Native Diagnostics cutover\.[\s\S]*?<\/script>/)?.[0]
      .replace(/^<script>\s*/, '')
      .replace(/<\/script>$/, '');
    expect(script).toBeTruthy();

    const attributes = new Map<string, string>();
    const windowObject: Record<string, any> = {
      location: {
        search: '?legacyArchive=1',
        hash: '#%E0%A4%A',
        replace: jest.fn(),
        href: '',
      },
    };
    const documentObject = {
      readyState: 'complete',
      documentElement: { setAttribute: (name: string, value: string) => attributes.set(name, value) },
      createElement: () => ({ textContent: '' }),
      head: { appendChild: jest.fn() },
      getElementById: () => null,
      addEventListener: jest.fn(),
    };

    expect(() => vm.runInNewContext(script!, {
      window: windowObject,
      document: documentObject,
      URLSearchParams,
      setTimeout: jest.fn(),
    })).not.toThrow();
    expect(attributes.get('data-diagnostics-archive')).toBe('true');
    for (const name of ['loadAppHealth', 'loadAppActivity', 'loadArchive', 'markAppHealthStatus', 'copyAppHealthForAI', 'copyAppHealthRaw']) {
      expect(typeof windowObject[name]).toBe('function');
    }
  });
});
