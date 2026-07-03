import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('clean onboarding copy contract', () => {
  it('keeps target-language copy dynamic without restoring old localized plan-choice helpers', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'CleanOnboarding.tsx'), 'utf8');

    expect(source).toContain('targetLabel(studyTarget');
    expect(source).toContain('reactionForLevel(level, studyTarget)');
    expect(source).toContain('reactionForGoal(goal)');
    expect(source).toContain("id: 'en'");
    expect(source).toContain("id: 'fr'");
    expect(source).not.toContain('localizedChoiceTitle');
    expect(source).not.toContain('localizedChoiceSubtitle');
    expect(source).not.toContain('titleUk:');
    expect(source).not.toContain('subtitleUk:');
  });
});
