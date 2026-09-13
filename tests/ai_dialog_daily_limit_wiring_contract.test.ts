import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('ИИ-диалог — дневной лимит обычного аккаунта (клиент + сервер)', () => {
  const session = read('app/ai_dialog_session.tsx');
  const catalogue = read('components/DialogsTabContent.tsx');
  const send = read('functions/src/premium_dialog.ts');
  const stream = read('functions/src/premium_dialog_stream.ts');

  test('вход решает зеркало серверной квоты, а не глухой замок', () => {
    expect(session).toContain("const dialogAccess = useFeatureAccess('ai_dialog');");
    expect(session).toContain("const dialogSessionOpen = dialogAccess || dailyQuotaGate === 'open';");
    expect(session).toContain('readAiDialogDailyQuota(accountStableId)');
    expect(session).toContain("source: 'ai_dialog_direct_entry'");
    // Старая ветка «нет доступа → пейвол на входе» ушла.
    expect(session).not.toContain('if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;');
  });

  test('отказ сервера dialog_free_limit → зеркало «0» и контекстный пейвол dialog_limit', () => {
    expect(session).toContain('const handleDailyLimitReached = useCallback(() => {');
    expect(session).toContain('void markAiDialogDailyQuotaExhausted(accountStableId);');
    expect(session).toContain("params: { context: 'dialog_limit', source: 'ai_dialog_daily_limit' }");
    expect(session.match(/classifyPremiumDialogError\(error\) === 'free_limit' && !hasPremiumAccess/g)).toHaveLength(2);
    expect(session.match(/recordAiDialogDailyQuotaFromServer\(accountStableId, streamed\.remainingQuota\)/g)).toHaveLength(2);
    // Пожизненный бесплатный триал остаётся отменённым.
    expect(session).not.toContain('hasFreeDialogLeft');
    expect(session).not.toContain('markFreeDialogUsed');
  });

  test('голосовой ввод — голосовая попытка дневной квоты', () => {
    expect(session).toContain("useSpeakingAttemptGate({ context: 'ai_voice_input', source: 'ai_dialog_voice_input' })");
    expect(session).toContain('if (!voiceInputGate.tryStartAttempt()) return;');
    expect(session).toContain('{voiceInputGate.locked && (');
  });

  test('каталог закрывает сценарии только при исчерпанном дне, уровни выше — за Plus', () => {
    expect(catalogue).toContain('const dialogsOpenToday = dialogAccess || !dailyLimitExhausted;');
    expect(catalogue.match(/!dialogsOpenToday \|\| !unlocked \? 'locked'/g)).toHaveLength(2);
    expect(catalogue).toContain("context: 'dialog_locked_level'");
    expect(catalogue).toContain("params: { context: 'dialog_limit', source: 'dialogs_catalogue' }");
  });

  test('сервер: гейт = дневной кап бесплатных реплик, полный отказ только при freeDailyReplies=0', () => {
    expect(send).toContain('if (!isPremium && aiDialogGatedByPremium && dialogQuota.freeDailyReplies <= 0) {');
    expect(send).toContain('if (!isPremium && aiDialogGatedByPremium && translateQuota.freeDailyReplies <= 0) {');
    expect(send).toContain("throw new HttpsError('permission-denied', 'dialog_plus_required')");
    expect(send).toContain('isPremium ? dialogQuota.premiumDailyReplies : dialogQuota.freeDailyReplies');
    expect(stream).toContain('if (!isPremium && gatedByPremium && dialogQuota.freeDailyReplies <= 0) {');
    // Разбор диалога (dialog_analysis) остаётся только в Plus.
    expect(read('functions/src/premium_dialog_review.ts')).toContain('if (!isPremium && aiDialogGatedByPremium) {');
  });
});
