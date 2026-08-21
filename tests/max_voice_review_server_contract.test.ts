import fs from 'fs';
import path from 'path';

const read = (relativePath: string) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

/**
 * MAX Voice post-call review (МАКС ПЛАН §6.2): `max_voice_review.tsx` wires the
 * corrections section to `premiumDialogReview(mode:'voice')` instead of the
 * former local-only stub. Full RN-Firebase mocking is heavy for this codebase
 * (see ai_dialog_entitlement_readiness_contract.test.ts) — this is a source-text
 * contract test in the same spirit: verify the wiring exists, the payload shape
 * is correct, and a fetch failure cannot crash the review screen.
 */
describe('MAX Voice review server wiring', () => {
  const screen = read('app/max_voice_review.tsx');
  const client = read('app/ai_dialog_client.ts');
  const server = read('functions/src/premium_dialog_review.ts');

  it('screen calls callPremiumDialogReview with mode:voice and a mapped transcript', () => {
    expect(screen).toContain("import {\n  callPremiumDialogReview,\n  type PremiumDialogReviewCorrection,\n} from './ai_dialog_client';");
    // Учитель шлёт mode 'tutor', остальные звонки — 'voice'.
    expect(screen).toContain("mode: result.format === 'tutor' ? 'tutor' : 'voice'");
    // TranscriptTurn {role,text} must be mapped to DialogChatTurn {role,content} —
    // the raw TranscriptTurn shape is NOT a valid request payload.
    expect(screen).toContain('role: turn.role,\n        content: turn.text,');
  });

  it('only requests a review when the call actually has learner turns', () => {
    const guard = screen.indexOf("const userTurns = result.history.filter((turn) => turn.role === 'user');");
    expect(guard).toBeGreaterThan(-1);
    const earlyReturn = screen.indexOf('if (userTurns.length === 0) return;', guard);
    expect(earlyReturn).toBeGreaterThan(guard);
  });

  it('never dedupes across different calls or crashes the screen on fetch failure', () => {
    // requestedForRef keyed by the specific history array reference: a fresh
    // call (fresh result.history) must NOT be skipped by a stale ref check.
    expect(screen).toContain('requestedForRef.current = result.history;');
    // Failure sets an 'error' state, not a thrown/unhandled rejection.
    const catchBlock = screen.indexOf('.catch(() => {');
    expect(catchBlock).toBeGreaterThan(-1);
    expect(screen.slice(catchBlock, catchBlock + 150)).toContain("setReviewState('error')");
  });

  it('client request type carries an optional mode field forwarded verbatim to the callable', () => {
    // 'tutor' — разбор урока с учителем (память учителя обновляет сервер).
    expect(client).toContain("mode?: 'text' | 'voice' | 'tutor';");
    // The whole `req` object (including mode) is passed straight into fn(req) —
    // no field allowlist that would silently drop `mode` before it reaches the server.
    expect(client).toContain('fn(req)');
  });

  it('client cache key includes mode so text and voice reviews of the same transcript never collide', () => {
    const key = client.slice(
      client.indexOf('function premiumDialogReviewRequestKey'),
      client.indexOf('function premiumDialogReviewRequestKey') + 400,
    );
    expect(key).toContain('mode: req.mode');
  });

  it('server accepts mode and threads it into the prompt builder without changing the text-mode default', () => {
    expect(server).toContain('export function asReviewMode(value: unknown): DialogReviewMode');
    expect(server).toContain("const mode = asReviewMode(data.mode);");
    expect(server).toContain('buildReviewSystemPrompt(cefr, learnerLangName, goalEn, studyTarget, mode)');
  });

  it('back leaves the terminal call flow instead of reviving stale connecting screen', () => {
    expect(screen).toContain("router.replace('/ai_dialog_home' as any)");
    expect(screen).not.toContain('safeRouterBack');
  });

  it('hangup is one-tap and does not wait for an early-call confirmation', () => {
    const session = read('app/max_call_session.tsx');
    const handler = session.slice(session.indexOf('const onEndPress'), session.indexOf('const onMutePress'));
    expect(handler).toContain("clientRef.current?.end('completed')");
    expect(handler).not.toContain('Alert.alert');
    expect(session).not.toContain('END_CONFIRM_WINDOW_MS');
  });

  it('opens call immediately with a reactive feather orb and no equalizer/loading label', () => {
    const prestart = read('app/max_call_prestart.tsx');
    const session = read('app/max_call_session.tsx');
    const halo = read('app/max_call_halo.tsx');
    const startAt = prestart.indexOf('const startCall');
    const handler = prestart.slice(startAt, prestart.indexOf('return (', startAt));

    expect(handler).not.toContain('await ');
    expect(handler).not.toContain('setRequesting');
    // зачем: владелец 2026-08-16 — соединение мгновенное. Настоящий минт
    // стартует ЗАРАНЕЕ на пре-экране (заготовка), тап только передаёт её
    // экрану звонка (handoff) — никакого warmup-пинга и ожидания сети на тапе.
    expect(prestart).toContain('beginPremint(');
    expect(handler).toContain('markPremintHandoff(key)');
    expect(prestart).not.toContain('warmupPing');
    expect(session).toContain('claimPremint(key)');
    expect(session).not.toContain('VoiceEqualizer');
    expect(session).not.toContain('Соединяем…');
    expect(session).toContain('haloRef.current?.setMicLevel(level)');

  it('prioritizes one victory and one validated practice action before detailed corrections', () => {
    expect(screen).toContain('Главная победа');
    expect(screen).toContain('Один фокус на завтра');
    expect(screen).toContain('Потренировать эту фразу');
    expect(screen.indexOf('Главная победа')).toBeLessThan(screen.lastIndexOf('Разбор твоих фраз'));
    expect(screen).toContain("trackEvent('max_tutor_review_practice_started'");
    expect(screen).toContain('corrections[0]');
    expect(screen).toContain("correction.kind === 'fix'");
    expect(screen).toContain('correction.corrected.trim().length > 0');
    expect(screen).toContain('correction.corrected.length <= 100');
    expect(screen).toContain('topFocus ? (');
  });

  it('opens a focused one-phrase practice session instead of the generic five-error queue', () => {
    expect(screen).toContain('focusMistakeId: captured.mistakeId');
    expect(screen).not.toContain("pathname: '/mistake_practice_session', params: { length: '5' }");
    expect(screen).toContain('const [practiceOpening, setPracticeOpening] = useState(false)');
    expect(screen).toContain('disabled={practiceOpening}');
    expect(screen).toContain('accessibilityState={{ busy: practiceOpening, disabled: practiceOpening }}');
    expect(screen).toContain('const practicePrompt = triLang(lang, {');
    expect(screen).toContain('topFocus.original');
    expect(screen).toContain('sourceMeaning: practicePrompt');
    expect(screen).not.toContain('sourceMeaning: topFocus.note');
    expect(screen).toContain("returnTo: 'max_voice_review'");
  });

  it('persists every assigned tutor-homework item into account-scoped practice idempotently', () => {
    expect(screen).toContain('homeworkSavedForRef');
    expect(screen).toContain('result.tutor?.homeworkItems ?? []');
    expect(screen).toContain('captureCurrentAccountObjectiveAttempt({');
    expect(screen).toContain("attemptId: `max-tutor-homework:${result.sessionId ?? 'local'}:${index}`");
    expect(screen).toContain("sourceKind: 'voice_review'");
  });
    expect(halo).toContain('const FEATHER_LAYERS = [');
    expect(halo).toContain('useSharedValue(1)');
    expect(halo).toContain('useReduceMotion()');
  });
});
