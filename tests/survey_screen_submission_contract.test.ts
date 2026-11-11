import fs from 'fs';
import path from 'path';

const controllerSource = fs.readFileSync(path.join(__dirname, '../app/survey_flow_controller.ts'), 'utf8');

describe('legacy survey controller submission contract', () => {
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
