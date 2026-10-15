import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
// CRLF в рабочей копии Windows — нормализуем (сторож source_guard_eol_normalized)
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');

// D111 (владелец): лимит Free в Диалогах — 30 ответов в календарный месяц UTC,
// считает сервер. Имя файла историческое («daily»), контракт — месячный.
describe('ИИ-диалог — месячный лимит обычного аккаунта (клиент + сервер)', () => {
  const session = read('app/ai_dialog_session.tsx');
  const companion = read('app/ai_companion_session.tsx');
  const catalogue = read('components/DialogsTabContent.tsx');
  const send = read('functions/src/premium_dialog.ts');
  const stream = read('functions/src/premium_dialog_stream.ts');

  test('вход решает зеркало серверной квоты, а не глухой замок', () => {
    expect(session).toContain("const dialogAccess = useFeatureAccess('ai_dialog');");
    expect(session).toContain("const dialogSessionOpen = hasPremiumAccess || dailyQuotaGate === 'open';");
    expect(session).toContain('readAiDialogDailyQuota(studyTarget, accountStableId)');
    // Owner 2026-09-14: an exhausted allowance displays the free wall, not an
    // automatic paywall redirect that hides the existing conversation.
    expect(session).toContain("setDailyQuotaGate('exhausted')");
    expect(session).not.toContain("source: 'ai_dialog_direct_entry'");
    expect(session).not.toContain('if (!accessResolved || !aiDialogGateOpen || dialogAccess) return;');
  });

  test('отказ сервера dialog_free_limit → зеркало «0» и контекстный пейвол dialog_limit', () => {
    expect(session).toContain('const handleDailyLimitReached = useCallback((observation?: AiDialogQuotaObservation | null) => {');
    expect(session).toContain('void markAiDialogDailyQuotaExhausted(studyTarget, accountStableId, observation);');
    expect(session).toContain('handleDailyLimitReached(quotaObservationFromDialogError(error));');
    expect(session).toContain("params: { context: 'dialog_limit', source: 'ai_dialog_daily_limit' }");
    expect(session.match(/errorKind === 'free_limit' && !hasPremiumAccess/g)).toHaveLength(2);
    expect(session.match(/recordAiDialogDailyQuotaFromServer\(studyTarget, accountStableId, quotaObservation\)/g)).toHaveLength(2);
    expect(session).toContain("reason: 'monthly_limit'");
    expect(session).not.toContain('hasFreeDialogLeft');
    expect(session).not.toContain('markFreeDialogUsed');
  });

  test('dialog_plus_required и при отправке, и при retry идёт в Plus-paywall, не в Free quota-wall', () => {
    expect(session.match(/errorKind === 'plus_required' && !hasPremiumAccess/g)).toHaveLength(2);
    expect(session.match(/openDialogPaywall\(\);/g)).toHaveLength(2);
    // Ожидаемые отказы (Plus/лимит) логируются как warning, не как авария.
    expect(session).toMatch(/errorKind === 'plus_required'\s*\|\| errorKind === 'free_limit'/);
  });

  test('Optimistic UI: остаток уменьшается при отправке, сервер сверяет, отказ откатывает', () => {
    expect(session).toContain('const spendQuotaOptimistically = useCallback(');
    expect(session).toContain("const quotaSpend = spendQuotaOptimistically('send');");
    expect(session).toContain("const quotaSpend = spendQuotaOptimistically('retry');");
    expect(session).toContain('setDailyQuotaRemaining((prev) => (prev == null ? prev : Math.max(0, prev - 1)));');
    // Откат есть на каждом отказе, который сервер не засчитал (plus_required и
    // общий сбой) — в send и в retry; dialog_free_limit ставит «0», не откатывает.
    expect(session.match(/quotaSpend\.rollback\(errorKind\);/g)).toHaveLength(4);
    expect(session).toContain('if (quotaSpendTokenRef.current !== token)');
    expect(session).toContain('setDailyQuotaRemaining(quotaObservation.remainingQuota);');
  });

  test('счётчик Free виден, а копирайт стены — месячный, не дневной', () => {
    expect(session).toContain('if (!hasPremiumAccess) {');
    expect(session).toContain('remainingQuota: fallback.remainingQuota');
    expect(session).toContain('DialogQuotaBadge');
    expect(session).toContain('resetAtMs={quotaResetAtMs}');
    expect(session).toContain('REVENUE_MONTHLY_LIMITS.ai_dialog_replies');
    expect(session).not.toContain('Завтра снова');
    expect(session).not.toContain('На сегодня всё');
    expect(session).not.toContain('без дневного лимита');
    expect(catalogue).toContain('const dialogsOpenThisMonth = !monthlyLimitExhausted;');
    expect(catalogue).toContain('DialogQuotaBadge');
  });

  test('свободный разговор — только Plus, без Free-квоты', () => {
    expect(companion).toContain('if (!hasPremiumAccess) {');
    expect(companion).not.toContain('DialogQuotaBadge');
  });

  test('голосовой ввод — голосовая попытка квоты', () => {
    // зачем (владелец 15.10, D196): голосовой ввод ИИ-диалога — из общего дневного счётчика 3/день (одна цифра на все микрофоны), прежняя серверная квота и точки остатка убраны
    expect(session).toContain("useVoiceAttemptGate({ surface: 'ai_dialog', source: 'ai_dialog_voice_input' })");
    expect(session).not.toContain('useSpeakingAttemptGate');
    expect(session).not.toContain('SpeakingQuotaDots');
    expect(session).toMatch(/if \(!voiceInputGate\.canStartAttempt\([^\n]*\)\) \{/); // R43: аргумент — автостарт после подтверждения Plus
    expect(session).toContain('voiceInputGate.commitStartedAttempt();');
    expect(session).toContain('{!speechNa ? <MicAllowanceBadge size="sm"'); // устройство без распознавателя (§SPEECH-NA) — цифры нет
  });

  // D124 (владелец 2026-09-30): закрытый сценарий открывает только ранг — тап
  // называет нужный ранг, а не ведёт на пейвол Plus (Plus ранг не заменяет).
  test('каталог закрывает сценарии при исчерпанном месяце или по рангу (D124)', () => {
    expect(catalogue.match(/!dialogsOpenThisMonth \|\| !unlocked \? 'locked'/g)).toHaveLength(2);
    expect(catalogue).not.toContain("context: 'dialog_locked_level', source: 'dialogs_catalogue'");
    expect(catalogue.match(/showGlassAlert\(dialogLockedLabel\(scenario, lang\)\)/g)).toHaveLength(2);
    expect(catalogue).toContain("params: { context: 'dialog_limit', source: 'dialogs_catalogue' }");
  });

  test('сервер: месячный кап бесплатных ответов, полный отказ только при freeMonthlyReplies=0', () => {
    expect(send).toContain('if (!isPremium && aiDialogGatedByPremium && dialogQuota.freeMonthlyReplies <= 0) {');
    expect(send).toContain("throw new HttpsError('permission-denied', 'dialog_plus_required')");
    expect(send).toContain('export async function enforceMonthlyQuota(');
    expect(send).toContain('startOfNextUtcMonth');
    expect(stream).toContain('if (!isPremium && gates.gatedByPremium && dialogQuota.freeMonthlyReplies <= 0) {');
    expect(stream).toContain('enforceMonthlyQuota(');
    // Разбор диалога (dialog_analysis) остаётся только в Plus.
    expect(read('functions/src/premium_dialog_review.ts')).toContain('if (!isPremium && aiDialogGatedByPremium) {');
  });
});
