import fs from 'node:fs';
import path from 'node:path';

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

test('completed users do not statically evaluate the onboarding tree during boot', () => {
  expect(layout).not.toMatch(/import\s+Onboarding\s+from\s+['"]\.\.\/components\/onboarding['"]/);
  expect(layout).toContain("import('../components/onboarding')");
  // зачем (10.10): ранний выход ленивой загрузки дополнен проверкой «компонент уже загружен».
  expect(layout).toContain('if (!effectiveShowOnboarding || onboardingComponent) return');
  expect(layout).toContain('onboardingComponent');
});
