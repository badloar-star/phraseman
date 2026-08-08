import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'app/achievements_screen.tsx'), 'utf8');

test('achievement sections use lightweight tonal surfaces instead of container borders', () => {
  expect(source).toContain("import { LinearGradient } from '../components/SafeLinearGradient';");
  expect(source).toContain('testID="achievements-section-surface"');
  expect(source).toContain('sectionSurfaceColors');
  expect(source).toContain('sectionHighlightStyle');
  expect(source).toContain('borderWidth: 0');
  expect(source).not.toContain('backdropFilter');
  expect(source).not.toContain('<BlurView');
});
