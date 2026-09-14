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

  test('embeds reward actions in the existing header before the Statistics card', () => {
    const stats = homeSource.indexOf('testID="home-stats-card"');
    const rewards = homeSource.indexOf('testID="home-reward-actions"');
    const quickStart = homeSource.indexOf('testID="home-quickstart-title"');
    expect(stats).toBeGreaterThan(-1);
    expect(rewards).toBeLessThan(stats);
    expect(rewards).toBeLessThan(quickStart);
    expect(rewards).toBeGreaterThan(homeSource.indexOf('testID="home-header-secondary-actions"'));
    expect(homeSource).not.toContain('testID="home-stats-bottom-row"');
  });

  test('uses compact icon targets with counts and no large button surfaces', () => {
    const spinEntry = homeSource.slice(
      homeSource.indexOf('testID="home-spin-fab"'),
      homeSource.indexOf('testID="home-spin-fab-button"'),
    );

    expect(spinEntry).toContain('width: 44');
    for (const kind of ['spin-fab', 'gift-entry']) {
      const start = homeSource.indexOf(`testID="home-${kind}-button"`);
      const button = homeSource.slice(start, homeSource.indexOf('</TapScale>', start));
      expect(button).not.toContain('<LinearGradient');
      expect(button).toContain('width: 44, height: 44');
      expect(button.indexOf(`testID="home-${kind}-count"`)).toBeGreaterThan(-1);
      expect(button).toContain('position: \'absolute\'');
    }
  });
});
