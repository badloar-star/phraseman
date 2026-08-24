import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('background tab pre-mount contract', () => {
  it('starts staged tab pre-mount after first content or a short fallback', () => {
    const source = fs.readFileSync(path.join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8');

    expect(source).toContain('const ENABLE_BACKGROUND_TAB_PREMOUNT = true');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_FALLBACK_MS = 1600');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_FIRST_DELAY_MS = 0');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_STEP_MS = 180');
    expect(source).toContain('const BACKGROUND_TAB_PREMOUNT_IDLE_TIMEOUT_MS = 400');
    expect(source).toContain("onAppEvent('app_first_content_ready', startPremount)");
    expect(source).toContain('BACKGROUND_TAB_PREMOUNT_ORDER.forEach');
    expect(source).not.toContain('const DEFERRED_TAB_PREWARM_FALLBACK_MS = 4000');
    expect(source).not.toContain("onAppEvent('app_first_content_ready', schedulePrewarm)");
  });
});
