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

function expectDelayedAccessFeedback(source: string): void {
  expect(source).toContain('const ACCESS_LOADING_FEEDBACK_DELAY_MS = 300;');
  expect(source).toContain('const [showAccessLoading, setShowAccessLoading] = useState(false);');
  expect(source).toContain(
    'setTimeout(() => setShowAccessLoading(true), ACCESS_LOADING_FEEDBACK_DELAY_MS)',
  );
  expect(source).toContain("ru: 'Проверяем доступ…'");
  expect(source).toContain('accessibilityRole="progressbar"');
  expect(source).toContain('accessibilityLiveRegion="polite"');
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
    expect(redirectEffect).toContain('if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;');
    expect(redirectEffect).toContain('[accessResolved, aiDialogGateOpen, dialogAccess, router]');

    const send = between(companion, 'const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    expectResolutionGuardBefore(send, 'if (!dialogAccess)');
    expectResolutionGuardBefore(send, 'sendToTheo(trimmed, history)');
    expect(send).toContain('accessResolved');
  });

  it('waits for entitlement resolution before scenario send or retry', () => {
    const send = between(
      scenario,
      'const send = useCallback(',
      'sendVoiceTextRef.current =',
    );
    expectResolutionGuardBefore(send, 'if (!dialogAccess)');
    expectResolutionGuardBefore(send, 'callPremiumDialogSend({');
    expect(send).toContain('accessResolved');

    const retry = between(
      scenario,
      'const retryLastSend = useCallback(',
      '// Приветствие уже стоит в начальном состоянии.',
    );
    expectResolutionGuardBefore(retry, 'if (!dialogAccess)');
    expectResolutionGuardBefore(retry, 'callPremiumDialogSend({');
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
      'if (!accessResolved || !ended || userExchanges <= 0 || reviewRequestedRef.current) return;',
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
    expectResolutionGuardBefore(voice, 'if (!hasPremiumAccess)');

    const analysisMarker = scenario.indexOf("source: 'dialog_analysis'");
    const analysisPaywall = scenario.slice(analysisMarker - 220, analysisMarker + 360);
    expectResolutionGuardBefore(analysisPaywall, "pathname: '/premium_modal'");

    const endReview = scenario.lastIndexOf('{renderDialogReview()}');
    const endUpsell = scenario.slice(endReview, endReview + 700);
    expectResolutionGuardBefore(endUpsell, "pathname: '/premium_modal'");

    const conversationMarker = scenario.indexOf("source: 'ai_dialog_conversation_toggle'");
    const conversationPaywall = scenario.slice(conversationMarker - 420, conversationMarker + 440);
    expectResolutionGuardBefore(conversationPaywall, "pathname: '/premium_modal'");
  });

  it('never opens a catalogue paywall before entitlement resolution', () => {
    expect(catalogue).toContain("import { useFeatureAccess, usePremium } from './PremiumContext';");
    expect(catalogue).toContain('const { accessResolved } = usePremium();');

    const coursePress = between(catalogue, 'const openCourseScenario = useCallback(', 'const openChallengeScenario');
    expectResolutionGuardBefore(coursePress, 'if (!dialogAccess)');
    expectResolutionGuardBefore(coursePress, "pathname: '/premium_modal'");

    const challengePress = between(catalogue, 'const openChallengeScenario = useCallback(', '// ── View-model');
    expectResolutionGuardBefore(challengePress, 'if (!dialogAccess)');
    expectResolutionGuardBefore(challengePress, "pathname: '/premium_modal'");

    const upsellPaywall = catalogue.slice(catalogue.lastIndexOf('onPress={() => {', catalogue.indexOf("context: 'dialog_locked_level'", 8000)));
    expectResolutionGuardBefore(upsellPaywall, "pathname: '/premium_modal'");
  });

  it('shows delayed inline feedback and disables unresolved dialogue actions', () => {
    expectDelayedAccessFeedback(scenario);
    expectDelayedAccessFeedback(companion);
    expectDelayedAccessFeedback(catalogue);

    expect(companion).toContain('editable={accessResolved && !sending}');
    expect(companion).toContain('disabled={!accessResolved || !input.trim() || sending}');
    expect(companion).toContain(
      'accessibilityState={{ disabled: !accessResolved || !input.trim() || sending, busy: !accessResolved || sending }}',
    );

    expect(scenario).toContain('editable={accessResolved && !sending}');
    expect(scenario).toContain('disabled={!accessResolved || !input.trim() || sending}');
    expect(scenario).toContain(
      "disabled={!accessResolved || sending || aiSpeaking || voiceInputStatus === 'finishing'}",
    );
    expect(scenario).toContain(
      'accessibilityState={{ disabled: !accessResolved, busy: !accessResolved }}',
    );

    expect(catalogue).toContain('showAccessLoading ? (');
    expect(catalogue).toContain('accessibilityState={{ disabled: !accessResolved, busy: !accessResolved }}');
    expect((catalogue.match(/disabled=\{!accessResolved\}/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});
