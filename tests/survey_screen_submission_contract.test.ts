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
    expect(controllerSource).toContain('expectedReward: SHARD_REWARDS.survey_completed');
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

  test('applies the immutable confirmed event before marker and cache without a balance projection', () => {
    const submit = controllerSource.indexOf('await submitSurvey({');
    const generationGate = controllerSource.indexOf(
      'if (!isCurrentAccountGeneration(accountToken, stableId)) {',
      submit,
    );
    const event = controllerSource.indexOf('await commitConfirmedExternalShardEvent({');
    const marker = controllerSource.indexOf('await markSurveyOfferDone({');
    const cache = controllerSource.indexOf('commitSurveyOfferRequest(');
    const presentationGate = controllerSource.indexOf(
      'if (!presentationActiveRef.current || attemptIdRef.current !== attemptId) return;',
    );
    expect(generationGate).toBeGreaterThan(submit);
    expect(event).toBeGreaterThan(generationGate);
    expect(marker).toBeGreaterThan(event);
    expect(cache).toBeGreaterThan(marker);
    expect(presentationGate).toBeGreaterThan(cache);
    expect(controllerSource).toContain("source: 'shard_survey'");
    expect(controllerSource).toContain('eventId: survey.surveyId');
    expect(controllerSource).toContain('delta: SHARD_REWARDS.survey_completed');
    expect(controllerSource).toContain("kind: 'survey_reward'");
    expect(controllerSource).not.toContain('replaceShardsBalance');
    expect(controllerSource).not.toContain('balanceAfter');
    expect(controllerSource).toContain('presentAccountChanged(attemptId)');
    expect(controllerSource.match(/isCurrentAccountGeneration\(accountToken, stableId\)/g)?.length)
      .toBeGreaterThanOrEqual(5);
  });

  test('uses a monotonic active request guard and clears the auto-return timer on deactivate', () => {
    expect(controllerSource).toContain('attemptIdRef.current += 1');
    expect(controllerSource).toContain('requestActiveRef.current');
    expect(controllerSource).toContain('clearAutoReturnTimer');
    expect(controllerSource).toContain('presentationActiveRef.current = false');
    expect(controllerSource).toMatch(/setTimeout\([\s\S]*?,\s*AUTO_RETURN_DELAY_MS\)/);
    expect(controllerSource).toContain("dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: response.reward })");
    expect(controllerSource).toContain("dispatchSubmission({ type: 'submit_failed', attemptId, messageKey })");
  });
});
