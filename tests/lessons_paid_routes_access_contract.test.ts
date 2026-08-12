import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'lessons.tsx'), 'utf8');

describe('lessons paid route access contract', () => {
  it('checks personal-plan access before reading or opening the route', () => {
    const block = source.slice(source.indexOf('const openLearningRoute'), source.indexOf('const openDialogs'));
    expect(source).toContain("const planAccess = useFeatureAccess('personal_plan')");
    expect(block.indexOf('if (!planAccess)')).toBeLessThan(block.indexOf('readPersonalPlanState()'));
    expect(block).toContain("openPremiumPaywall(router, { context: 'personal_plan' })");
  });

  it('does not mount paid dialogs before the access gate', () => {
    const block = source.slice(source.indexOf('const openDialogs'), source.indexOf('const [gateModal'));
    expect(block.indexOf('if (!dialogAccess)')).toBeLessThan(block.indexOf("setPage('dialogs')"));
    expect(block).toContain("openPremiumPaywall(router, { context: 'ai_dialog' })");
    expect(source).toContain('onPress={openDialogs}');
  });
});
