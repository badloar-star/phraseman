import fs from 'node:fs';
import path from 'node:path';
import { buildCompassDevSeed, type CompassDevSeedId } from '../components/dev/compassDevSeeds';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('DEV Hub Compass preview', () => {
  test('owns a dedicated section with ready states only', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    for (const state of ['review', 'lesson', 'weak-area']) {
      expect(registry).toContain(`action: 'preview-compass-${state}'`);
      expect(registry).toContain(`testID: 'dev-preview-compass-${state}'`);
    }
    expect(registry).not.toMatch(/preview-compass-(?:loading|insufficient|personal-plan)/);
  });

  test('reuses the in-tree production sheet without native modal stacking', () => {
    const hub = read('components/dev/DevHubSheet.tsx');
    const preview = read('components/dev/CompassDevPreview.tsx');
    expect(hub).toContain("useOverlayVisible('devHub', devSurfaceWanted)");
    expect(preview).toContain('<CompassQuickSheet');
    expect(preview).toContain('<CompassSurface');
    expect(preview).not.toContain('<Modal');
    expect(preview).not.toMatch(/\bloading=\{/);
  });

  test('builds only complete localized synthetic presentations', () => {
    const readySeeds: readonly CompassDevSeedId[] = ['review', 'lesson', 'weak-area'];
    for (const seed of readySeeds) {
      const state = buildCompassDevSeed(seed, 'ru');
      expect(state.recommendation.id).toBeTruthy();
      expect(state.recommendation.title).toBeTruthy();
      expect(state.recommendation.explanation).toBeTruthy();
      expect(state.recommendation.actionLabel).toBeTruthy();
      expect(state.recommendation.expectedMinutes).toBeGreaterThanOrEqual(3);
    }
    expect(buildCompassDevSeed('review', 'ru').recommendation.title).toContain('фраз');
    expect(buildCompassDevSeed('lesson', 'ru').recommendation.title).toContain('сессию 7');
  });
});
