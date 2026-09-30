import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

describe('AI dialogue calendar-month quota wiring', () => {
  const send = read('functions/src/premium_dialog.ts');
  const stream = read('functions/src/premium_dialog_stream.ts');
  // зачем: D78/D81 — текстовый репетитор (tutor_text_turn.ts) удалён из кода.
  const config = read('functions/src/openai_dialog_model_config.ts');
  const grant = read('functions/src/ai_dialog_extra_replies.ts');

  test('Free consumes 30/month while Plus receives a no-write unlimited reservation', () => {
    expect(send).toContain('startOfNextUtcMonth');
    expect(send).toContain('enforceMonthlyQuota');
    expect(send).toContain('unlimitedDialogQuotaReservation');
    expect(send).toContain("dialogQuota.freeMonthlyReplies");
    expect(send).not.toContain('dialogQuota.premiumDailyReplies');
    expect(config).toContain('DIALOG_FREE_MONTHLY_REPLIES_DEFAULT = 30');
    expect(config).toContain("quotaPeriod: 'calendar_month'");
    expect(config).toContain('plusUnlimited: true');
  });

  test('callable and stream reject direct Free companion calls before quota work', () => {
    for (const source of [send, stream]) {
      const accessAt = source.indexOf('dialogueReplyAccessDecision(mode, isPremium)');
      const quotaAfterAccess = source.indexOf('enforceMonthlyQuota(', accessAt);
      expect(accessAt).toBeGreaterThanOrEqual(0);
      expect(quotaAfterAccess).toBeGreaterThan(accessAt);
    }
  });

  test('stream uses the monthly reservation and release contract', () => {
    expect(stream).toContain('enforceMonthlyQuota');
    expect(stream).toContain('releaseMonthlyQuota');
  });

  test('legacy paid grants are dual-written into the current-month schema for rollback', () => {
    expect(grant).toContain('extraCapThisMonth: nextQuota.extraCapThisMonth');
    expect(grant).toContain('extraCapToday: nextQuota.extraCapToday');
    expect(grant).toContain('monthlyCount: nextQuota.monthlyCount');
    expect(grant).toContain('dailyCount: nextQuota.dailyCount');
  });
});
