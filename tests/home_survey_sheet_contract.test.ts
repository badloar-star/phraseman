import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

// зачем (владелец 22.10, «вернуть анкеты»): анкета-кампания из админки снова на Главной — через хук и лениво смонтированную
// шторку, без прежней цепочки на каждый фокус. Строка «Сегодня» одна на два источника: анкета первой, иначе Poll V2.
describe('Home-owned survey entry (Today row + sheet)', () => {
  const home = read('app/(tabs)/home.tsx');
  const hook = read('hooks/use_home_survey_entry.ts');
  const loader = read('app/home_survey_entry.ts');
  const todayCard = read('components/home/v2/HomeV2TodayCard.tsx');
  const route = read('app/survey_screen.tsx');
  const layout = read('app/_layout.tsx');

  test('Home mounts the survey only through the hook and the lazy sheet, never the legacy chain', () => {
    expect(home).toContain('const homeSurvey = useHomeSurveyEntry(lang, homeRuntimeActive);');
    expect(home).toContain('{homeSurvey.launch ? (<Suspense fallback={null}>');
    expect(home).toContain('<SurveySheetModal');
    expect(home).not.toContain('fetchActiveSurveyWithRetry(');
    expect(home).not.toContain('setSurveyOffer');
    expect(home).not.toContain('openSurveyLaunch');
    // никакого обхода через роут и prime
    expect(home).not.toContain('primeSurvey(');
    expect(home).not.toContain("pathname: '/survey_screen'");
  });

  test('one Today row for both: an active survey campaign first, otherwise the V2 poll', () => {
    expect(home).toContain("const homeTodayRowSource: 'survey' | 'poll_v2' | 'none' = homeSurvey.row ? 'survey' : homePollV2.phase !== 'hidden' ? 'poll_v2' : 'none';");
    // зачем (владелец 22.10 кнопкой): Poll V2 строкой на Главной — только без «Сцены» (с ней опрос на «Сегодня»); анкета-кампания — первой всегда
    expect(home).toContain("surveyRow={homeTodayRowSource === 'survey' && homeSurvey.row ? { ...homeSurvey.row, onPress: homeSurvey.openSurvey } : homeTodayRowSource === 'poll_v2' && !HOME_SCENE_V2_ENABLED ? {");
    expect(home).toContain("console.log('[SURVEY-ROW]'");
    expect(home).toContain('onPress: () => setHomePollV2Open(true)');
    expect(todayCard).toContain('surveyRow?: Readonly<{ title: string; subtitle?: string; onPress: () => void }> | null;');
    expect(todayCard).toContain('{surveyRow ? (');
    expect(todayCard).toContain('testID="home-v2-today-survey"');
  });

  test('loads once per app entry through the 6-hour cache, not on every focus', () => {
    expect(hook).toContain('loadHomeSurvey({ stableId, lang, platform: Platform.OS })');
    expect(hook).toContain('[lang, runtimeActive]');
    expect(hook).not.toContain('focusTick');
    expect(loader).toContain('HOME_SURVEY_TTL_MS = 6 * 60 * 60_000');
    expect(loader).toContain('settledThisProcess');
    expect(loader.match(/fetchActiveSurveyWithRetry\(/g)).toHaveLength(1);
  });

  test('closes a stale scope (account / language / UTC day) with one boundary timeout, no polling', () => {
    expect(hook).toContain("account.phase !== 'active'");
    expect(hook).toContain('account.generation !== openedAccount.generation');
    expect(hook).toContain('account.stableId !== launch.stableId');
    expect(hook).toContain('launch.lang !== lang');
    expect(hook).toContain('getUtcDayKey() !== launch.dayKey');
    expect(hook).toContain('Date.UTC(');
    expect(hook).toContain('setTimeout(');
    expect(hook).toContain('clearTimeout(utcDayBoundaryTimeout)');
    expect(hook).not.toContain('setInterval(');
  });

  test('clears only the exactly reconciled offer without closing a still-visible reward sheet', () => {
    const start = hook.indexOf('const onDurablyReconciled = useCallback');
    const end = hook.indexOf('return {', start);
    const handler = hook.slice(start, end);
    expect(handler).toContain('current.stableId !== completed.stableId');
    expect(handler).toContain('current.survey.surveyId !== completed.surveyId');
    expect(handler).toContain('markHomeSurveyCompleted(');
    expect(handler).toContain('setOffer(null)');
    expect(handler).not.toContain('closeSurvey');
    expect(handler).not.toContain('setLaunch');
  });

  test('every branch of the loader and the hook logs under [SURVEY-HOME]', () => {
    expect(loader).toContain('[SURVEY-HOME]');
    expect(hook).toContain('[SURVEY-HOME]');
    expect(loader).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    expect(hook).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
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
});
