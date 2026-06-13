import { readFileSync } from 'fs';
import { join } from 'path';

function read(rel: string): string {
  return readFileSync(join(__dirname, '..', rel), 'utf8');
}

describe('referral 7 plus 7 screen contract', () => {
  it('keeps referral code entry as a separate explanatory screen', () => {
    const source = read('app/referral_code_entry.tsx');

    expect(source).toContain('testID="screen-referral-code-entry"');
    expect(source).toContain('Есть код от друга? Введите его здесь — и заберите 7 дней полного доступа в Phraseman.');
    expect(source).toContain('Мини-квест простой: установить приложение, ввести код и пройти один урок до конца.');
    expect(source).not.toContain('testID="referral-code-seven-plus-seven-note"');
    expect(source).toContain('testID="referral-code-input"');
    expect(source).toContain('applyManualReferralCode');
  });

  it('keeps referrals as a separate screen with per-invite VIP actions', () => {
    const source = read('app/referrals.tsx');

    expect(source).toContain('testID="screen-referrals"');
    expect(source).toContain('Твои приглашения');
    expect(source).toContain('Как только друг поставит приложение, введёт твой код и закончит первый урок');
    expect(source).toContain('друг не выполнил условие');
    expect(source).toContain('Получить VIP');
    expect(source).toContain('claimReferralVipDays');
    expect(source).not.toContain('testID="referrals-seven-plus-seven-note"');
    expect(source).not.toContain('summary.pending');
    expect(source).not.toContain('claimableDays');
    expect(source).toContain(') : null}');
  });

  it('wires friends navigation to referral screens instead of old inline modals', () => {
    const friends = read('app/(tabs)/friends.tsx');
    const layout = read('app/_layout.tsx');

    expect(friends).toContain("router.push('/referral_code_entry' as any)");
    expect(friends).toContain("router.push('/referrals' as any)");
    expect(friends).toContain('testID="friends-open-referrals"');
    expect(layout).toContain('<Stack.Screen name="referral_code_entry"');
    expect(layout).toContain('<Stack.Screen name="referrals"');
  });

  it('keeps cloud reward logic as two separate 7-day rewards', () => {
    const source = read('functions/src/referral.ts');

    expect(source).toContain('export const REFERRAL_REWARD_DAYS = 7');
    expect(source).toContain('const REFERRER_VIP_DAYS = REFERRAL_REWARD_DAYS');
    expect(source).toContain('const REFEREE_VIP_DAYS = REFERRAL_REWARD_DAYS');
    expect(source).toContain("referral_vip_last_source: source");
    expect(source).toContain('refereeVipDays: REFEREE_VIP_DAYS');
    expect(source).toContain("rewardKind: 'vip_days_both'");
  });

  it('keeps modal and share copy aligned with install-code-lesson condition', () => {
    const modal = read('app/referral_access_activated_modal.tsx');
    const share = read('app/referral_invite_share.ts');

    expect(modal).toContain('установил приложение, ввёл ваш код и прошёл один урок полностью');
    expect(modal).toContain('7+7 не равно 14: друг получил свои 7 дней отдельно.');
    expect(share).toContain('Установи приложение, введи мой код и пройди один урок полностью');
    expect(share).toContain('мы оба получим по 7 дней полного доступа');
  });
});
