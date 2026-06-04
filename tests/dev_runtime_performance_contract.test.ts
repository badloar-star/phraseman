import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('dev runtime performance contract', () => {
  it('filters repeated dev-only RNFirebase warning spam before it floods Metro', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');

    expect(source).toContain('installDevRuntimePerformanceGuards();');
    expect(source).toContain('This method is deprecated (as well as all React Native Firebase namespaced API)');
    expect(source).toContain('shouldDropDevRuntimeLog');
  });

  it('keeps expensive XP stack tracing behind an explicit debug flag', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'hall_of_fame_utils.ts'), 'utf8');

    expect(source).toContain("process.env.EXPO_PUBLIC_DEBUG_XP_TRACE === '1'");
    expect(source).toContain('debugXpTraceEnabled');
  });

  it('offers a fast Android emulator launch mode for responsiveness checks', () => {
    const source = fs.readFileSync(path.join(ROOT, 'scripts', 'dev-android-emulator.ps1'), 'utf8');

    expect(source).toContain('[switch]$Fast');
    expect(source).toContain("'--no-dev'");
    expect(source).toContain("'--minify'");
    expect(source).toContain('wm size 900x1600');
    expect(source).toContain('animator_duration_scale 0');
  });
});
