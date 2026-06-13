import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('deferred tab prewarm contract', () => {
  it('does not prewarm heavy deferred tabs immediately after first content', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(source).toContain('const DEFERRED_TAB_PREWARM_FALLBACK_MS = 4000');
    expect(source).toContain("onAppEvent('app_first_content_ready', schedulePrewarm)");
    expect(source).toContain('setTimeout(startPrewarm, DEFERRED_TAB_PREWARM_FALLBACK_MS)');
    expect(source).not.toContain("onAppEvent('app_first_content_ready', startPrewarm)");
    expect(source).not.toContain('setTimeout(startPrewarm, 900)');
  });
});
