import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

describe('onboarding personal plan locale', () => {
  it('localizes plan goal and level choices instead of rendering Russian defaults directly', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'onboarding.tsx'), 'utf8');

    expect(source).toContain('titleUk:');
    expect(source).toContain('subtitleUk:');
    expect(source).toContain('localizedChoiceTitle');
    expect(source).toContain('localizedChoiceSubtitle');
    expect(source).toContain('planMinutesTitle');
    expect(source).toContain('planMinutesSubtitle');
    expect(source).toContain('const goalLabel = goalChoice ? localizedChoiceTitle(goalChoice) : selectedPlanGoalForPlan');
    expect(source).not.toContain('<Text style={styles.planFlowOptionTitle}>{choice.title}</Text>');
    expect(source).not.toContain('<Text style={styles.planFlowOptionSub}>{choice.subtitle}</Text>');
  });
});
