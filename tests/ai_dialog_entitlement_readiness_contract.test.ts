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
    // зачем (D111/D124): дневной гейт квоты (companionGateOpen/dailyQuotaGate) удалён — у Plus
    // безлимит, у Free месячный счёт ведёт сервер. Редирект на пейвол по-прежнему стоит
    // только ПОСЛЕ разрешения доступа (иначе Plus-пользователя на миг увело бы на пейвол).
    expect(redirectEffect).toContain('if (!accessResolved || hasPremiumAccess) return;');
    expect(redirectEffect).toContain('[accessResolved, hasPremiumAccess, openCompanionPlusPaywall]');

    const send = between(companion, 'const send = useCallback(', '// Приветствие уже в начальном состоянии.');
    const sendGuard = send.indexOf('if (!accessResolved || !hasPremiumAccess) {');
    expect(sendGuard).toBeGreaterThan(-1);
    // пейвол из отправки открывается только при разрешённом доступе, до похода на сервер
    expect(send.indexOf('if (accessResolved) openCompanionPlusPaywall();')).toBeGreaterThan(sendGuard);
    expect(send.indexOf('sendToTheo(trimmed, history)')).toBeGreaterThan(sendGuard);
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
    // зачем: проверка права стала canStartAttempt() (списание — commitStartedAttempt() уже
    // после старта распознавателя), но гейт по-прежнему стоит после разрешения доступа.
    // ebacc519e (R43): canStartAttempt принимает колбэк «после подтверждения Plus запись стартует сама» — сторожим сам вызов
    // гейта (с аргументом или без), а не точный текст скобок
    expectResolutionGuardBefore(voice, 'if (!voiceInputGate.canStartAttempt(');

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
    // зачем (D111): суточный лимит заменён месячным — имя флага dialogsOpenThisMonth.
    expectResolutionGuardBefore(coursePress, 'if (!dialogsOpenThisMonth)');
    expectResolutionGuardBefore(coursePress, "pathname: '/premium_modal'");

    const challengePress = between(catalogue, 'const openChallengeScenario = useCallback(', '// ── View-model');
    expectResolutionGuardBefore(challengePress, 'if (!dialogsOpenThisMonth)');
    expectResolutionGuardBefore(challengePress, "pathname: '/premium_modal'");

    const upsellStart = catalogue.indexOf('{hasLockedCourseLevels && (');
    expect(upsellStart).toBeGreaterThan(-1);
    const upsellPaywall = catalogue.slice(upsellStart, upsellStart + 2200);
    expectResolutionGuardBefore(upsellPaywall, "pathname: '/premium_modal'");
    expect(upsellPaywall).toContain('context: upsellContext');
    expect(catalogue).toContain("monthlyLimitExhausted ? 'dialog_limit' :");
  });
});
