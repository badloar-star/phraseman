import fs from 'fs';
import path from 'path';

const sources = [
  path.join('app', 'lesson_complete.tsx'),
  path.join('app', 'main_course_plus_copy.ts'),
  path.join('app', 'personal_plan_retired_redirect.ts'),
  path.join('app', 'notifications.ts'),
  path.join('components', 'paywall', 'PaywallProofCards.tsx'),
].map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));

const source = sources.join('\n');

describe('main course completion copy is commercially truthful', () => {
  test('does not claim that all 32 lessons are free or immediately open', () => {
    expect(source).not.toMatch(/(?:Все|Усі) 32[^.\n]*(?:бесплат|безкоштов|открыт|відкрит)/i);
    expect(source).not.toMatch(/All 32[^.\n]*(?:free|open|unlock)/i);
    expect(source).not.toMatch(/(?:Las|As) 32[^.\n]*(?:gratis|abiert|liberad)/i);
  });

  test('states the three-lesson Free limit and Plus continuation', () => {
    expect(source).toContain('Первые три урока доступны бесплатно');
    expect(source).toContain('The first three lessons are free');
    expect(source).toContain('остальные открываются по порядку');
    expect(source).toContain('the rest unlock in order');
  });
});
