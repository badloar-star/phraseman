import fs from 'fs';
import path from 'path';
import { resolveAppArtBackdropName } from '../components/appArtBackdropRegistry';

const ROOT = path.join(__dirname, '..');

const PHASE_2A_ROUTES = [
  ['/home', 'home'],
  ['/lessons', 'lessons'],
  ['/trainer_plan_session', 'lessonPractice'],
  ['/quizzes', 'quizzes'],
  ['/arena', 'arena'],
  ['/settings', 'settings'],
] as const;

describe('Onboarding Graphite app backdrops Phase 2A', () => {
  test('key routes resolve to programmatic backdrop layers without bitmap assets', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/appArtBackdropRegistry.ts'), 'utf8');

    expect(source).not.toContain('assets/images/app_backdrops');
    expect(source).not.toContain('assets/images/theme_backdrops');

    for (const [route, backdropName] of PHASE_2A_ROUTES) {
      expect(resolveAppArtBackdropName(route)).toBe(backdropName);
    }
  });
});
