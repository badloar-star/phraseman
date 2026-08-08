import fs from 'fs';
import path from 'path';

const sourcePath = path.resolve(__dirname, '../components/AiDialogBriefingScreen.tsx');
const routePath = path.resolve(__dirname, '../app/ai_dialog_briefing.tsx');

describe('AiDialogBriefingScreen contract', () => {
  const source = () => fs.readFileSync(sourcePath, 'utf8');

  it('uses Russian briefing copy while retaining localized scenario fallback and reduced-motion support', () => {
    const content = source();

    expect(content).toContain("import { useReduceMotion } from '../hooks/use_reduce_motion';");
    expect(content).toContain("import { aiDialogBriefingBody } from '../app/ai_dialog_briefing_copy';");
    expect(content).toContain('aiDialogBriefingBody(scenario.id, lang)');
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

describe('AI dialog briefing route contract', () => {
  const source = () => fs.readFileSync(routePath, 'utf8');

  it('fails closed for unavailable target content and unknown scenarios', () => {
    const content = source();

    expect(content).toContain('aiDialogContentAvailableForTarget(studyTarget)');
    expect(content).toContain('frenchAiDialogGateCopy(lang)');
    expect(content).toContain('getScenarioById(scenarioId)');
    expect(content).not.toContain("getScenarioById('coffee')");
    expect(content).not.toContain('ActivityIndicator');
  });

  it('marks the exact target and scenario before replacing into the AI-capable session', () => {
    const content = source();

    expect(content).toContain('markAiDialogIntroSeen(studyTarget, scenario.id)');
    expect(content).toContain("pathname: '/ai_dialog_session'");
    expect(content).toContain('scenarioId: scenario.id');
  });

  it('uses safe back navigation with the lessons tab as its recovery fallback', () => {
    const content = source();

    expect(content).toContain("safeRouterBack(router, '/(tabs)/lessons' as never)");
    expect(content).not.toContain('router.back()');
  });
});
