import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

/**
 * MAX review is driven only by the idempotent private finalizer receipt. The
 * screen must never start the retired transcript-review callable itself.
 */
describe('MAX Voice review server wiring', () => {
  const screen = read('app/max_voice_review.tsx');
  const finalizer = read('app/max_voice_finalize_client.ts');

  it('loads and retries the durable finalizer without calling the legacy transcript review', () => {
    expect(screen).toContain('readMaxVoiceReviewReceipt');
    expect(screen).toContain('drainOneMaxFinalize');
    expect(screen).not.toContain('callPremiumDialogReview');
    expect(finalizer).toContain("maxVoiceCallable<unknown>('maxVoiceFinalize')");
  });

  it('keeps a pending local transcript temporary and hides it after a receipt exists', () => {
    expect(screen).toContain('Временно на этом устройстве');
    expect(screen).toContain("reviewState.kind === 'pending'");
    expect(screen).not.toContain("premiumDialogReview");
  });

  it('does not present unsupported pronunciation or proficiency claims', () => {
    expect(screen.toLocaleLowerCase()).not.toContain('pronunciation score');
    expect(screen).not.toContain('metrics.uniqueWords');
    expect(screen).not.toContain('metrics.longestTurnWords');
    expect(screen).not.toContain('goalsAfter');
  });

  it('back leaves the terminal call flow instead of reviving stale connecting screen', () => {
    expect(screen).toContain("router.replace('/(tabs)/home' as any)");
    expect(screen).not.toContain("router.replace('/ai_dialog_home' as any)");
    expect(screen).not.toContain('safeRouterBack');
  });

  it('hangup is one-tap and does not wait for an early-call confirmation', () => {
    const session = read('app/max_call_session.tsx');
    const handler = session.slice(session.indexOf('const onEndPress'), session.indexOf('const onMutePress'));
    expect(handler).toContain("clientRef.current?.end('completed')");
    expect(handler).not.toContain('Alert.alert');
    expect(session).not.toContain('END_CONFIRM_WINDOW_MS');
  });

  it('preloads the call before opening the reactive feather orb', () => {
    const prestart = read('app/max_call_prestart.tsx');
    const session = read('app/max_call_session.tsx');
    const halo = read('app/max_call_halo.tsx');

    expect(prestart).toContain('beginPremint(');
    expect(prestart).toContain('markPremintHandoff(key)');
    expect(prestart).toContain("pathname: '/max_call_session'");
    expect(session).toContain('claimPremint(key)');
    expect(session).not.toContain('VoiceEqualizer');
    expect(session).not.toContain('Соединяем…');
    expect(session).toContain('haloRef.current?.setMicLevel(level)');
    expect(halo).toContain('const FEATHER_LAYERS = [');
    expect(halo).toContain('useSharedValue(1)');
    expect(halo).toContain('useReduceMotion()');
    expect(prestart).toContain("studyTarget: format === 'tutor' ? 'en' : studyTarget");
    expect(session).toContain("studyTarget: isTutor ? 'en' : studyTarget");
  });

  it('presents a calm worked, fix, tomorrow narrative before collapsed details', () => {
    expect(screen).toContain('testID="max-voice-review-worked"');
    expect(screen).toContain('testID="max-voice-review-fix"');
    expect(screen).toContain('testID="max-voice-review-tomorrow"');
    expect(screen).toContain('testID="max-voice-review-details-toggle"');
    expect(screen).toContain('const [detailsOpen, setDetailsOpen] = useState(false)');
    expect(screen.indexOf('max-voice-review-worked')).toBeLessThan(screen.indexOf('max-voice-review-fix'));
    expect(screen.indexOf('max-voice-review-fix')).toBeLessThan(screen.indexOf('max-voice-review-tomorrow'));
    expect(screen.indexOf('max-voice-review-tomorrow')).toBeLessThan(screen.indexOf('max-voice-review-details-toggle'));
    expect(screen).toContain('Что получилось');
    expect(screen).toContain('Что поправить');
    expect(screen).toContain('Что делать завтра');
    expect(screen).toContain('Потренировать эту фразу');
    expect(screen).toContain('{projection.correction.said}');
    expect(screen).toContain('{projection.correction.target}');
    expect(screen).toContain("reviewState.kind === 'loading'");
    expect(screen).toContain('max-voice-review-details');
    expect(screen).toContain('Текст разговора');
    expect(screen).toContain("trackEvent('max_tutor_review_practice_started'");
    expect(screen).toContain('projectMaxReview(reviewState.receipt)');
    expect(screen).toContain('projection?.tomorrowActions ?? []');
    expect(screen).toContain('AccessibilityInfo.announceForAccessibility');
    expect(screen).toContain('accessibilityState={{ expanded: transcriptOpen }}');
    expect(screen).toContain('max-voice-review-transcript-content');
    expect(screen).toContain('max-voice-review-target-phrase');
    expect(screen).toContain('max-voice-review-next-topic');
  });

  it('opens a focused one-phrase practice session instead of the generic five-error queue', () => {
    expect(screen).toContain('focusMistakeId: captured.mistakeId');
    expect(screen).not.toContain("pathname: '/mistake_practice_session', params: { length: '5' }");
    expect(screen).toContain('const [practiceOpening, setPracticeOpening] = useState(false)');
    expect(screen).toContain('disabled={practiceOpening}');
    expect(screen).toContain('accessibilityState={{ busy: practiceOpening, disabled: practiceOpening }}');
    expect(screen).toContain('canonicalTarget: correction.target');
    expect(screen).toContain('sourceMeaning: correction.explanation');
    expect(screen).toContain("returnTo: 'max_voice_review'");
    expect(screen).toContain('maxReviewSessionId: activeSessionId');
  });

  it('persists every assigned tutor-homework item into account-scoped practice idempotently', () => {
    expect(screen).toContain('homeworkSavedForRef');
    expect(screen).toContain('localResult.tutor?.homeworkItems ?? []');
    expect(screen).toContain('captureCurrentAccountObjectiveAttempt({');
    expect(screen).toContain('attemptId: `max-tutor-homework:${sessionId}:${index}`');
    expect(screen).toContain("sourceKind: 'voice_review'");
  });
});
