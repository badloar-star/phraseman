import fs from 'fs';
import path from 'path';

const sourcePath = path.resolve(__dirname, '../components/AiDialogBriefingScreen.tsx');
const routePath = path.resolve(__dirname, '../app/ai_dialog_briefing.tsx');
const dialogsTabPath = path.resolve(__dirname, '../components/DialogsTabContent.tsx');
const scenarioTilePath = path.resolve(__dirname, '../components/DialogScenarioTile.tsx');

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
    expect(content).toContain("import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';");
    expect(content).toMatch(
      /markNextNavigationAsReplace\(\);\s*router\.replace\(\{\s*pathname: '\/ai_dialog_session',\s*params: \{ scenarioId: scenario\.id \},\s*\} as never\);/,
    );
  });

  it('uses safe back navigation with the lessons tab as its recovery fallback', () => {
    const content = source();

    expect(content).toContain("safeRouterBack(router, '/(tabs)/lessons' as never)");
    expect(content).not.toContain('router.back()');
  });
});

describe('AI dialog catalog scenario-feed contract', () => {
  const catalog = () => fs.readFileSync(dialogsTabPath, 'utf8');
  const tile = () => fs.readFileSync(scenarioTilePath, 'utf8');

  it('opens an opaque resolver route in the tap frame and resolves intro state there', () => {
    const content = catalog();
    const route = fs.readFileSync(routePath, 'utf8');

    expect(content).toContain("import { hasSeenAiDialogIntro } from '../app/ai_dialog_intro_seen';");
    expect(content).toContain("pathname: '/ai_dialog_briefing'");
    expect(content).toContain("forceBriefing: forceBriefing ? '1' : undefined");
    expect(content).not.toContain('await hasSeenAiDialogIntro(studyTarget, scenario.id)');
    expect(content).toContain('scenarioId: scenario.id');
    expect(route).toContain('peekAiDialogIntroSeen(studyTarget, scenario.id)');
    expect(route).toContain('hasSeenAiDialogIntro(studyTarget, scenario.id).then((seen) => {');
    expect(route).toContain("pathname: '/ai_dialog_session'");
  });

  it('keeps the normal destination decision behind the existing successful gates and lets long press force briefing', () => {
    const content = catalog();

    expect(content).toContain('const openScenarioDestination = useCallback');
    expect(content).toContain('const openCourseScenario = useCallback');
    expect(content).toContain('const openChallengeScenario = useCallback');
    expect(content).toContain('openScenarioDestination(scenario, forceBriefing)');
    expect(content).toContain('onLongPress: () => openCourseScenario(scenario, true)');
    expect(content).toContain('onLongPress: () => openChallengeScenario(scenario, true)');
    expect(content.match(/onLongPress=\{vm\.onLongPress\}/g)).toHaveLength(2);
    expect(content).toContain('delayLongPress={550}');
  });

  it('renders a concise borderless PressableScale tile with accessible long-press briefing and reduced-motion entrance', () => {
    const content = tile();

    expect(content).toContain("PressableScale } from './feedback/PressableScale';");
    expect(content).toContain('delay(Math.min(index, 10) * 40)');
    expect(content).toContain('reduceMotion ? undefined : FadeInDown');
    expect(content).toContain('delayLongPress={550}');
    expect(content).toContain('accessibilityHint');
    expect(content).toContain('statusLabel: string');
    expect(content).toContain('{statusLabel}');
    expect(catalog()).toContain('const accessibilityHint = locked');
    expect(catalog()).toContain('`${title}. ${levelChip}. ${statusLabel}`');
    expect(content).not.toContain('dialogScenarioGoal(');
    expect(content).not.toContain('borderWidth');
    expect(content).not.toContain('withRepeat(');
  });
});
