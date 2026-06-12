import fs from 'fs';
import path from 'path';
import { resolveAppArtBackdropName } from '../components/appArtBackdropRegistry';

const ROOT = path.join(__dirname, '..');

const PHASE_2C_ROUTES = [
  ['/diagnostic_test', 'diagnosticTest'],
  ['/exam', 'exam'],
  ['/flashcards', 'flashcards'],
  ['/progress_map', 'progressMap'],
  ['/shards_shop', 'shardsShop'],
  ['/level_gifts_inventory', 'levelGifts'],
  ['/streak_stats', 'statistics'],
] as const;

describe('Onboarding Graphite app backdrops Phase 2C', () => {
  test('final routes resolve to programmatic backdrop layers without bitmap assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/appArtBackdropRegistry.ts'), 'utf8');

    expect(source).not.toContain('assets/images/app_backdrops');

    for (const [route, backdropName] of PHASE_2C_ROUTES) {
      expect(resolveAppArtBackdropName(route)).toBe(backdropName);
    }
  });
});
