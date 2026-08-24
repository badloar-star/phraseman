import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('Home-owned survey sheet', () => {
  const home = read('app/(tabs)/home.tsx');
  const route = read('app/survey_screen.tsx');
  const card = read('components/SurveyTaskCard.tsx');
  const layout = read('app/_layout.tsx');

  test('owns one scoped launch and opens the delivered survey without a route handoff', () => {
    expect(home).toContain("import SurveySheetModal from '../../components/survey/SurveySheetModal';");
    expect(home).toContain('type SurveyLaunch,');
    expect(home.match(/const \[openSurveyLaunch, setOpenSurveyLaunch\] = useState<SurveyLaunch \| null>\(null\);/g))
      .toHaveLength(1);

    const cardCallsite = home.slice(home.indexOf('<SurveyTaskCard'), home.indexOf('/>', home.indexOf('<SurveyTaskCard')) + 2);
    expect(cardCallsite).toContain('setOpenSurveyLaunch({');
    expect(cardCallsite).toContain('survey: challenge.survey');
    expect(cardCallsite).toContain('stableId: surveyOffer.stableId');
    expect(cardCallsite).toContain('dayKey: surveyOffer.dayKey');
    expect(cardCallsite).toContain('lang,');
    expect(cardCallsite).not.toContain('hapticTap');
    expect(cardCallsite).not.toContain('primeSurvey');
    expect(cardCallsite).not.toContain('router.push');
    expect(cardCallsite).not.toContain('fetchActiveSurvey');
    expect(cardCallsite).not.toContain('refetch');
    expect(home.match(/fetchActiveSurveyWithRetry\(/g)).toHaveLength(1);
  });

  test('mounts one stable sheet in the modal layer and closes stale scope', () => {
    expect(home.match(/<SurveySheetModal\b/g)).toHaveLength(1);
    expect(home).toContain('visible={openSurveyLaunch !== null}');
    expect(home).toContain('launch={openSurveyLaunch}');
    expect(home).toContain('onClose={closeSurveySheet}');
    expect(home).toContain('openSurveyAccountGenerationRef');
    expect(home).toContain('const openedAccount = captureAccountGeneration();');
    expect(home).toContain('openSurveyAccountGenerationRef.current = openedAccount;');
    expect(home).toContain('subscribeAccountGeneration');
    expect(home).toContain("account.phase !== 'active'");
    expect(home).toContain('account.generation !== openedAccount.generation');
    expect(home).toContain('account.stableId !== openSurveyLaunch.stableId');
    expect(home).toContain('surveyOffer.dayKey !== openSurveyLaunch.dayKey');
    expect(home).toContain('openSurveyLaunch.lang !== lang');
    expect(home).toContain('setOpenSurveyLaunch(null);');
  });

  test('clears only the exactly reconciled offer without closing a still-visible reward sheet', () => {
    expect(home).toContain('sameSurveyDurableScope');
    expect(home).toContain('const handleSurveyDurablyReconciled = useCallback');
    const handlerStart = home.indexOf('const handleSurveyDurablyReconciled = useCallback');
    const handlerEnd = home.indexOf('const refreshDailyPhraseVisibility', handlerStart);
    const handler = home.slice(handlerStart, handlerEnd);

    expect(handler).toContain('setSurveyOffer((current) =>');
    expect(handler).toContain('current.challenge.surveyId');
    expect(handler).not.toContain('current.challenge.survey.surveyId');
    expect(handler).toContain('sameSurveyDurableScope(');
    expect(handler).toContain('? null : current');
    expect(handler).not.toContain('closeSurveySheet');
    expect(handler).not.toContain('setOpenSurveyLaunch');
    expect(home).toContain('onDurablyReconciled={handleSurveyDurablyReconciled}');
  });

  test('uses one UTC-boundary timeout while open instead of polling', () => {
    const lifecycleStart = home.indexOf('if (!openSurveyLaunch) return undefined;');
    const lifecycleEnd = home.indexOf('const firstHomeFrameEmittedRef', lifecycleStart);
    const lifecycle = home.slice(lifecycleStart, lifecycleEnd);

    expect(lifecycle).toContain('Date.UTC(');
    expect(lifecycle).toContain('setTimeout(');
    expect(lifecycle).toContain('clearTimeout(');
    expect(lifecycle).toContain('getUtcDayKey() !== openSurveyLaunch.dayKey');
    expect(lifecycle).not.toContain('setInterval(');
  });

  test('keeps the legacy route as a scoped, idempotent wrapper over the same sheet', () => {
    expect(route).toContain('takePrimedSurvey(surveyId, scope)');
    expect(route).toContain('<SurveySheetModal');
    expect(route).toContain('key={launchKey}');
    expect(route).toContain('visible={routeVisible}');
    expect(route).toContain('onClose={requestRouteDismiss}');
    expect(route).toContain('onDismissed={closeRoute}');
    expect(route).toContain('scopeIdentityVerified');
    expect(route).toContain('scope.dayKey === getUtcDayKey()');
    expect(route.indexOf('scopeIdentityVerified')).toBeLessThan(route.indexOf('takePrimedSurvey(surveyId, scope)'));
    expect(route).toContain('account.generation !== launchAccount.generation');
    expect(route).toContain('const routeUtcDayBoundaryTimeout = setTimeout(');
    expect(route).toContain('clearTimeout(routeUtcDayBoundaryTimeout);');
    expect(route).not.toContain('setInterval(');
    expect(route).toContain('if (closeStartedRef.current) return;');
    expect(route).toContain('clearPrimedSurvey();');
    expect(route).toContain('safeRouterBack(router);');
    expect(route).not.toContain('useSurveyFlowController');
    expect(route).not.toContain('<SurveyRewardPanel');
    expect(route).not.toContain('QuestionBlock');
    expect(layout).toContain('<Stack.Screen name="survey_screen" />');
  });

  test('keeps the task card presentation-only', () => {
    expect(card).not.toContain('useRouter');
    expect(card).not.toContain('fetchActiveSurvey');
    expect(card).not.toContain('primeSurvey');
  });
});
