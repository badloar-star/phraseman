import { readFileSync } from 'fs';
import { join } from 'path';

const homeSource = readFileSync(join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');

describe('Home Spin entry', () => {
  test('keeps the visible count on the newest authoritative local balance', () => {
    expect(homeSource).toContain('const homeSpinRefreshGenerationRef = useRef(0);');
    expect(homeSource).toContain('const refreshGeneration = ++homeSpinRefreshGenerationRef.current;');
    expect(homeSource).toContain('if (refreshGeneration !== homeSpinRefreshGenerationRef.current) return;');
    expect(homeSource).toContain('{homeSpinBalance}');
  });

  test('centers the Spin button inside the Statistics card', () => {
    const spinEntry = homeSource.slice(
      homeSource.indexOf('testID="home-spin-fab"'),
      homeSource.indexOf('testID="home-spin-fab-button"'),
    );

    expect(spinEntry).toContain("alignSelf: 'center'");
    expect(spinEntry).not.toContain("alignSelf: 'flex-end'");
  });
});
