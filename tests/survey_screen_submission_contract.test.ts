import fs from 'fs';
import path from 'path';

const screenSource = fs.readFileSync(path.join(__dirname, '../app/survey_screen.tsx'), 'utf8');
const controllerSource = fs.readFileSync(path.join(__dirname, '../app/survey_flow_controller.ts'), 'utf8');

describe('survey screen submission contract', () => {
  test('the compatibility route delegates all mutable flow state to the shared controller', () => {
    expect(screenSource).toContain('takePrimedSurvey(surveyId, scope)');
    expect(screenSource).toContain('<SurveySheetModal');
    expect(screenSource).toContain('onClose={requestRouteDismiss}');
    expect(screenSource).toContain('onDismissed={closeRoute}');
    expect(screenSource).toContain('visible={routeVisible}');
    expect(screenSource).toContain('key={launchKey}');
    expect(screenSource).not.toContain('useSurveyFlowController');
    expect(screenSource).not.toContain('<SurveyRewardPanel');
    expect(screenSource).not.toContain('QuestionBlock');
    expect(screenSource).not.toContain('useReducer(reduceSurveySubmission');
    expect(screenSource).not.toContain('await submitSurvey(');
    expect(screenSource).not.toContain("emitAppEvent('action_toast'");
    expect(screenSource).not.toContain('Alert.alert');
    expect(screenSource).not.toMatch(/<Text[^>]*numberOfLines=\{1\}[^>]*>\{survey\.title\}/);
    expect(screenSource).not.toContain('<Text style={{ fontSize: 44 }}>');
  });

  test('the controller uses the hardened reducer and optimistic canonical reward before sending', () => {
    expect(controllerSource).toContain('useReducer(');
    expect(controllerSource).toContain('reduceSurveySubmission');
    expect(controllerSource).toContain('initialSurveySubmissionState');
    expect(controllerSource).toContain("type: 'submit_started'");
    expect(controllerSource.indexOf("type: 'submit_started'"))
      .toBeLessThan(controllerSource.indexOf('await submitSurvey('));
    // зачем: PM-058/D70 — награды за опрос нет, оптимистичная сумма всегда 0.
    expect(controllerSource).toContain('expectedReward: 0');
  });

  test('captures identity generation and the immutable opened scope before sending', () => {
    expect(screenSource).toContain('canonicalStableId === scope.stableId');
    expect(screenSource).toContain("account.phase === 'active'");
    expect(screenSource).toContain('account.stableId === canonicalStableId');
    expect(screenSource).toContain('return { survey, stableId: scopeIdentityVerified.stableId, dayKey: openedDayKey, lang };');
    expect(controllerSource).toContain('const accountToken = captureAccountGeneration()');
    expect(controllerSource).toContain("accountToken.phase !== 'active'");
    expect(controllerSource).toContain('!isCurrentAccountGeneration(accountToken, stableId)');
    expect(controllerSource).toContain('dayKey,');
  });

  // зачем: PM-058/D70 — жемчуг за опрос удалён: никакого экономического события,
  // только отметка и кэш после проверки поколения аккаунта.
  test('marks and caches the completion after the generation gate without any pearl event', () => {
    const submit = controllerSource.indexOf('await submitSurvey({');
    const generationGate = controllerSource.indexOf(
      'if (!isCurrentAccountGeneration(accountToken, stableId)) {',
      submit,
    );
    const marker = controllerSource.indexOf('await markSurveyOfferDone({');
    const cache = controllerSource.indexOf('commitSurveyOfferRequest(');
    expect(generationGate).toBeGreaterThan(submit);
    expect(marker).toBeGreaterThan(generationGate);
    expect(cache).toBeGreaterThan(marker);
    expect(controllerSource).not.toContain('commitConfirmedExternalShardEvent');
    expect(controllerSource).not.toContain('shards_earned');
    expect(controllerSource).not.toContain('replaceShardsBalance');
    expect(controllerSource).toContain('presentAccountChanged(attemptId)');
  });

  test('uses a monotonic active request guard and clears the auto-return timer on deactivate', () => {
    expect(controllerSource).toContain('attemptIdRef.current += 1');
    expect(controllerSource).toContain('requestActiveRef.current');
    expect(controllerSource).toContain('clearAutoReturnTimer');
    expect(controllerSource).toContain('presentationActiveRef.current = false');
    expect(controllerSource).toMatch(/setTimeout\([\s\S]*?,\s*AUTO_RETURN_DELAY_MS\)/);
    expect(controllerSource).toContain("dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: 0 })"); // зачем: PM-058/D70 — награды за опрос нет
    expect(controllerSource).toContain("dispatchSubmission({ type: 'submit_failed', attemptId, messageKey })");
  });
});
