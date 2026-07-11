import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../app/survey_screen.tsx'), 'utf8');

describe('survey screen submission contract', () => {
  test('uses the hardened reducer and renders optimistic in-app feedback before awaiting submit', () => {
    expect(source).toContain('useReducer(reduceSurveySubmission, initialSurveySubmissionState)');
    expect(source).toContain("type: 'submit_started'");
    expect(source.indexOf("type: 'submit_started'")).toBeLessThan(source.indexOf('await submitSurvey('));
    expect(source).toContain('<SurveyRewardPanel');
    expect(source).not.toContain("emitAppEvent('action_toast'");
    expect(source).not.toContain('Alert.alert');
    expect(source).not.toContain('<Text style={{ fontSize: 44 }}>');
  });

  test('captures identity generation and the opened day before sending', () => {
    expect(source).toContain('const openedDayKey = useRef(scope?.dayKey ?? directOpenDayKey).current');
    expect(source).toContain('const accountToken = captureAccountGeneration()');
    expect(source).toContain("accountToken.phase !== 'active'");
    expect(source).toContain('!isCurrentAccountGeneration(accountToken, stableId)');
    expect(source).toContain('dayKey: openedDayKey');
  });

  test('reconciles authoritative state before mounted presentation and gates stale accounts', () => {
    const generationGate = source.indexOf('if (!isCurrentAccountGeneration(accountToken, stableId)) return;');
    const balance = source.indexOf('await replaceShardsBalanceForAccountGeneration(res.balanceAfter');
    const marker = source.indexOf('await markSurveyDailyTaskDone({ stableId, dayKey: openedDayKey');
    const mountedPresentation = source.indexOf('if (!mountedRef.current || attemptIdRef.current !== attemptId) return;');
    expect(generationGate).toBeGreaterThan(-1);
    expect(balance).toBeGreaterThan(generationGate);
    expect(marker).toBeGreaterThan(balance);
    expect(mountedPresentation).toBeGreaterThan(marker);
    expect(source).not.toContain('replaceShardsBalanceLocal(res.balanceAfter');
    expect(source).toContain("if (balanceReconciled === 'stale-generation') return;");
    expect(source).toContain("if (balanceReconciled === 'failed')");
    expect(source.match(/isCurrentAccountGeneration\(accountToken, stableId\)/g)?.length).toBeGreaterThanOrEqual(5);
  });

  test('uses a monotonic active request guard and clears the auto-return timer', () => {
    expect(source).toContain('attemptIdRef.current += 1');
    expect(source).toContain('requestActiveRef.current');
    expect(source).toContain('clearAutoReturnTimer');
    expect(source).toMatch(/setTimeout\([\s\S]*?,\s*1400\)/);
    expect(source).toContain("dispatchSubmission({ type: 'submit_succeeded', attemptId, reward: res.reward })");
    expect(source).toContain("dispatchSubmission({ type: 'submit_failed', attemptId, messageKey })");
  });
});
