import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('ИИ-диалог — дневной лимит обычного аккаунта (клиент + сервер)', () => {
  const session = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const tutor = read('app/ai_dialog_tutor_session.tsx');
  const catalogue = read('components/DialogsTabContent.tsx');
  const send = read('functions/src/premium_dialog.ts');
  const stream = read('functions/src/premium_dialog_stream.ts');

  test('вход решает зеркало серверной квоты, а не глухой замок', () => {
    expect(session).toContain("const dialogAccess = useFeatureAccess('ai_dialog');");
    expect(session).toContain("const dialogSessionOpen = hasPremiumAccess || dailyQuotaGate === 'open';");
    expect(session).toContain('readAiDialogDailyQuota(studyTarget, accountStableId)');
    // Owner 2026-09-14: an exhausted day displays the free wall, not an
    // automatic paywall redirect that hides the existing conversation.
    expect(session).toContain("setDailyQuotaGate('exhausted')");
    expect(session).not.toContain("source: 'ai_dialog_direct_entry'");
    // Старая ветка «нет доступа → пейвол на входе» ушла.
    expect(session).not.toContain('if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;');
  });

  test('отказ сервера dialog_free_limit → зеркало «0» и контекстный пейвол dialog_limit', () => {
    expect(session).toContain('const handleDailyLimitReached = useCallback((observation?: AiDialogQuotaObservation | null) => {');
    expect(session).toContain('void markAiDialogDailyQuotaExhausted(studyTarget, accountStableId, observation);');
    expect(session).toContain('handleDailyLimitReached(quotaObservationFromDialogError(error));');
    expect(session).toContain("params: { context: 'dialog_limit', source: 'ai_dialog_daily_limit' }");
    expect(session).toContain("errorKind === 'free_limit' && !hasPremiumAccess");
    expect(session).toContain("classifyPremiumDialogError(error) === 'free_limit' && !hasPremiumAccess");
    expect(session.match(/recordAiDialogDailyQuotaFromServer\(studyTarget, accountStableId, quotaObservation\)/g)).toHaveLength(2);
    // Пожизненный бесплатный триал остаётся отменённым.
    expect(session).not.toContain('hasFreeDialogLeft');
    expect(session).not.toContain('markFreeDialogUsed');
  });

  test('free-for-all flag does not bypass the real free quota or hide its counter', () => {
    expect(session).toContain('const dialogSessionOpen = hasPremiumAccess || dailyQuotaGate === \'open\';');
    expect(session).toContain('if (!hasPremiumAccess) {');
    expect(session).toContain('setDailyQuotaRemaining(quotaObservation.remainingQuota);');
    expect(session).toContain('void recordAiDialogDailyQuotaFromServer(studyTarget, accountStableId, quotaObservation);');
    expect(session).toContain('remainingQuota: fallback.remainingQuota');
    expect(session).toContain('DialogQuotaBadge');
    expect(companion).toContain('readAiDialogDailyQuota(studyTarget, accountStableId)');
    expect(companion).toContain('DialogQuotaBadge');
    expect(companion).toContain('if (!hasPremiumAccess && dailyQuotaGate !== \'open\')');
    expect(catalogue).toContain('const dialogsOpenToday = !dailyLimitExhausted;');
    expect(catalogue).toContain('DialogQuotaBadge');
  });

  test('text tutor syncs paid grants and records the same account-global quota mirror', () => {
    expect(tutor).toContain('await requireDialogExtraRepliesProviderReady(accountToken, studyTarget)');
    expect(tutor).toContain('recordAiDialogDailyQuotaFromServer(studyTarget, accountToken.stableId, quotaObservation)');
    expect(tutor).toContain('markAiDialogDailyQuotaExhausted(');
    expect(tutor).toContain('quotaObservationFromDialogError(error)');
  });

  test('голосовой ввод — голосовая попытка дневной квоты', () => {
    expect(session).toContain("useSpeakingAttemptGate({ context: 'ai_voice_input', source: 'ai_dialog_voice_input' })");
    expect(session).toContain('if (!voiceInputGate.tryStartAttempt()) return;');
    expect(session).toContain('{voiceInputGate.locked && (');
  });

  test('каталог закрывает сценарии только при исчерпанном дне, уровни выше — за Plus', () => {
    expect(catalogue).toContain('const dialogsOpenToday = !dailyLimitExhausted;');
    expect(catalogue.match(/!dialogsOpenToday \|\| !unlocked \? 'locked'/g)).toHaveLength(2);
    expect(catalogue).toContain("context: 'dialog_locked_level'");
    expect(catalogue).toContain("params: { context: 'dialog_limit', source: 'dialogs_catalogue' }");
  });

  test('сервер: гейт = дневной кап бесплатных реплик, полный отказ только при freeDailyReplies=0', () => {
    expect(send).toContain('if (!isPremium && aiDialogGatedByPremium && dialogQuota.freeDailyReplies <= 0) {');
    expect(send).toContain('if (!isPremium && gates.gatedByPremium && translateQuota.freeDailyReplies <= 0) {');
    expect(send).toContain("throw new HttpsError('permission-denied', 'dialog_plus_required')");
    expect(send).toContain('isPremium ? dialogQuota.premiumDailyReplies : dialogQuota.freeDailyReplies');
    expect(stream).toContain('if (!isPremium && gates.gatedByPremium && dialogQuota.freeDailyReplies <= 0) {');
    // Разбор диалога (dialog_analysis) остаётся только в Plus.
    expect(read('functions/src/premium_dialog_review.ts')).toContain('if (!isPremium && aiDialogGatedByPremium) {');
  });
});
