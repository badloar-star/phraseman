import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

function between(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function expectResolutionGuardBefore(body: string, laterMarker: string): void {
  const guard = body.indexOf('if (!accessResolved) return;');
  const later = body.indexOf(laterMarker);
  expect(guard).toBeGreaterThan(-1);
  expect(later).toBeGreaterThan(guard);
}

describe('AI-dialog entitlement readiness contract', () => {
  const scenario = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const catalogue = read('components/DialogsTabContent.tsx');

  it('waits for entitlement resolution before companion redirect or send', () => {
    expect(companion).toContain('const { hasPremiumAccess, accessResolved } = usePremium();');

    const redirectEffect = between(
      companion,
      'useEffect(() => {',
      '// Приветствие собеседника присутствует',
    );
    expect(redirectEffect).toContain('if (!accessResolved || !companionGateOpen) return;');
    expect(redirectEffect).toContain('[accessResolved, accountStableId, companionGateOpen, hasPremiumAccess, router, studyTarget]');

    const send = between(companion, 'const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    expectResolutionGuardBefore(send, "if (!hasPremiumAccess && dailyQuotaGate !== 'open')");
    expectResolutionGuardBefore(send, 'sendToTheo(trimmed, history)');
    expect(send).toContain('accessResolved');
  });

  it('waits for entitlement resolution before scenario send or retry', () => {
    const send = between(
      scenario,
      'const send = useCallback(',
      '// Голосовой ввод «зажми и продиктуй»',
    );
    expectResolutionGuardBefore(send, 'if (!dialogSessionOpen)');
    expectResolutionGuardBefore(send, 'callPremiumDialogStream(payload');
    expect(send).toContain('accessResolved');

    const retry = between(
      scenario,
      'const retryLastSend = useCallback(',
      '// Приветствие уже стоит в начальном состоянии.',
    );
    expectResolutionGuardBefore(retry, 'if (!dialogSessionOpen)');
    expectResolutionGuardBefore(retry, 'callPremiumDialogStream(payload');
    expect(retry).toContain('accessResolved');
  });

  it('does not start other billable scenario operations while access is unresolved', () => {
    const translation = between(
      scenario,
      'const toggleTranslation = useCallback(',
      'const userExchanges =',
    );
    expectResolutionGuardBefore(translation, 'callPremiumDialogTranslate({');
    expect(translation).toContain('accessResolved');

    const review = between(
      scenario,
      '// Диалог завершён → один раз запрашиваем финальный разбор фраз ученика.',
      'const onBack = useCallback',
    );
    const readinessGuard = review.indexOf(
      'if (!accessResolved || !ended || userExchanges <= 0 || reviewRequestedRef.current || !promptScenario) return;',
    );
    expect(readinessGuard).toBeGreaterThan(-1);
    expect(review.indexOf('callPremiumDialogReview({')).toBeGreaterThan(readinessGuard);
  });

  it('guards every entitlement-based scenario paywall interaction', () => {
    const voice = between(
      scenario,
      'const startVoiceInput = useCallback(',
      'voiceInputMountedRef.current = true;',
    );
    // 2026-09-13: голосовой ввод идёт через дневную квоту речи, а не через Plus-замок.
    expectResolutionGuardBefore(voice, 'if (!voiceInputGate.tryStartAttempt())');

    const analysisMarker = scenario.indexOf("source: 'dialog_analysis'");
    const analysisPaywall = scenario.slice(analysisMarker - 220, analysisMarker + 360);
    expectResolutionGuardBefore(analysisPaywall, "pathname: '/premium_modal'");

    // Маркеры '{renderDialogReview()}' и source 'ai_dialog_conversation_toggle'
    // отсутствуют в экране и в HEAD — контракт сторожил несуществующий код
    // (дрейф до задачи 2026-09-13). Апселл разбора живёт в DialogVerdictScreen
    // и проверяется блоком analysisPaywall выше; дублирующие срезы сняты.
    expect(scenario).toContain('<DialogVerdictScreen');
    expect(scenario).not.toContain('renderDialogReview()');
  });

  it('never opens a catalogue paywall before entitlement resolution', () => {
    expect(catalogue).toContain("import { useFeatureAccess, usePremium } from './PremiumContext';");
    expect(catalogue).toContain('const { accessResolved, hasPremiumAccess } = usePremium();');

    const coursePress = between(catalogue, 'const openCourseScenario = useCallback(', 'const openChallengeScenario');
    expectResolutionGuardBefore(coursePress, 'if (!dialogsOpenToday)');
    expectResolutionGuardBefore(coursePress, "pathname: '/premium_modal'");

    const challengePress = between(catalogue, 'const openChallengeScenario = useCallback(', '// ── View-model');
    expectResolutionGuardBefore(challengePress, 'if (!dialogsOpenToday)');
    expectResolutionGuardBefore(challengePress, "pathname: '/premium_modal'");

    const upsellStart = catalogue.indexOf('{hasLockedCourseLevels && (');
    expect(upsellStart).toBeGreaterThan(-1);
    const upsellPaywall = catalogue.slice(upsellStart, upsellStart + 2200);
    expectResolutionGuardBefore(upsellPaywall, "pathname: '/premium_modal'");
    expect(upsellPaywall).toContain('context: upsellContext');
    expect(catalogue).toContain("dailyLimitExhausted ? 'dialog_limit' : 'dialog_locked_level'");
  });
});
