import fs from 'fs';
import path from 'path';
import { resolveAppArtBackdropName } from '../components/appArtBackdropRegistry';

const ROOT = path.join(__dirname, '..');

const PHASE_2B_ROUTES = [
  ['/lesson_intro_screens', 'lessonIntro'],
  ['/arena_join', 'arena'],
  ['/arena_room', 'arenaMatch'],
  ['/friends_screen', 'friends'],
  ['/achievements_screen', 'achievements'],
  ['/daily_tasks_screen', 'dailyTasks'],
] as const;

describe('Onboarding Graphite app backdrops Phase 2B', () => {
  test('secondary routes resolve to programmatic backdrop layers without bitmap assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/appArtBackdropRegistry.ts'), 'utf8');

    expect(source).not.toContain('assets/images/app_backdrops');

    for (const [route, backdropName] of PHASE_2B_ROUTES) {
      expect(resolveAppArtBackdropName(route)).toBe(backdropName);
    }
  });
});
