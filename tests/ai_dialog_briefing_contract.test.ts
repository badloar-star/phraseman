import fs from 'fs';
import path from 'path';

const sourcePath = path.resolve(__dirname, '../components/AiDialogBriefingScreen.tsx');

describe('AiDialogBriefingScreen contract', () => {
  const source = () => fs.readFileSync(sourcePath, 'utf8');

  it('uses localized scenario goal and first-prompt helpers with reduced-motion support', () => {
    const content = source();

    expect(content).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(content).toContain('dialogScenarioGoal(scenario, lang)');
    expect(content).toContain('dialogScenarioNextStepHint(scenario, lang)');
    expect(content).toContain('reduceMotion ? undefined : FadeInDown');
  });

  it('keeps actions accessible and the briefing surface borderless and non-looping', () => {
    const content = source();

    expect(content).toContain('accessibilityRole="button"');
    expect(content).not.toContain('borderWidth');
    expect(content).not.toContain('borderColor');
    expect(content).not.toContain('withRepeat(');
  });

  it('does not render untranslated persona, setting, or objectives fields', () => {
    const content = source();

    expect(content).not.toMatch(/scenario\.(?:persona|setting)\b/);
    expect(content).not.toContain('scenarioObjectives(');
  });
});
