import { readFileSync } from 'fs';
import { join } from 'path';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
import {
  beginReferralInvitesRequest,
  commitReferralInvites,
  parsePersistedReferralInvites,
  readReferralInvites,
  referralInvitesCacheSizeForTests,
  resetReferralInvitesCacheForTests,
  serializeReferralInvites,
} from '../app/referrals_cache';

function read(rel: string): string {
  return readFileSync(join(__dirname, '..', rel), 'utf8');
}

describe('referral 7 plus 7 screen contract', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetReferralInvitesCacheForTests();
  });

  it('keeps referral cache stale-visible and account isolated across restart', () => {
    const alice = ensureAccountGeneration('alice');
    const rows = [{ refereeStableId: 'friend', status: 'qualified', createdAtMs: 1 }] as any;
    const request = beginReferralInvitesRequest(alice);
    expect(commitReferralInvites(request, rows, 1_000)).toBe(true);
    expect(readReferralInvites(alice, 20_000)).toEqual({ value: rows, isFresh: true });
    expect(readReferralInvites(alice, 70_000)).toEqual({ value: rows, isFresh: false });
    const persisted = serializeReferralInvites(alice, rows, 1_000);
    expect(parsePersistedReferralInvites(persisted, { ...alice, generation: alice.generation + 10 })?.value).toEqual(rows);
    expect(parsePersistedReferralInvites(persisted, { ...alice, stableId: 'bob' })).toBeNull();
    for (const uid of ['bob', 'carol']) {
      const token = ensureAccountGeneration(uid);
      expect(commitReferralInvites(beginReferralInvitesRequest(token), rows)).toBe(true);
    }
    expect(referralInvitesCacheSizeForTests()).toBe(2);
  });

  it('uses one aggregate pending state instead of a spinner in every row', () => {
    const source = read('app/referrals.tsx');
    expect(source).toContain('testID="referrals-claim-pending"');
    expect(source).not.toContain('claiming && claimable ? <ActivityIndicator');
    expect(source).toContain('readReferralInvites(renderToken)');
    expect(source).toContain('const claimToken = captureAccountGeneration()');
    expect(source).toContain('if (!isCurrentAccountGeneration(claimToken))');
    expect(source).toContain('invalidateReferralInvites(claimToken)');
  });
  it('keeps referral code entry as a separate explanatory screen', () => {
    const source = read('app/referral_code_entry.tsx');

    expect(source).toContain('testID="screen-referral-code-entry"');
    expect(source).toContain('Есть код от друга? Введите его здесь — и заберите 7 дней полного доступа в Phraseman.');
    expect(source).toContain('Мини-квест простой: установить приложение, ввести код и пройти один урок до конца.');
    expect(source).not.toContain('testID="referral-code-seven-plus-seven-note"');
    expect(source).toContain('testID="referral-code-input"');
    expect(source).toContain('applyManualReferralCode');
  });

  it('keeps referrals as a separate screen with per-invite Plus actions', () => {
    const source = read('app/referrals.tsx');

    expect(source).toContain('testID="screen-referrals"');
    expect(source).toContain('Твои приглашения');
    expect(source).toContain('Как только друг поставит приложение, введёт твой код и закончит первый урок');
    expect(source).toContain('друг не выполнил условие');
    expect(source).toContain('Получить Plus');
    expect(source).not.toContain('Получить VIP');
    expect(source).not.toContain('VIP можно забирать');
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

  it('keeps cloud reward logic as two separate rewards (default 7 days, tunable)', () => {
    const source = read('functions/src/referral.ts');

    // Дефолт 7 дней сохранён; сами дни теперь крутятся из «Пульта» (cfg.rewardDays),
    // но инвариант «две отдельные награды двум людям, не 14 одному» не меняется.
    expect(source).toContain('export const REFERRAL_REWARD_DAYS = 7');
    expect(source).toContain('rewardDays: REFERRAL_REWARD_DAYS'); // дефолт конфига = 7
    expect(source).toContain('referralConfigFromData'); // парсер тюнинга из Пульта
    expect(source).toContain("referral_vip_last_source: source");
    // referee получает свои дни отдельной выдачей (buildReferralVipProgressPatch ... 'referee')
    expect(source).toContain('refereeVipDays: cfg.rewardDays');
    expect(source).toContain("'referee'");
    expect(source).toContain("'referrer'");
    expect(source).toContain("rewardKind: 'vip_days_both'");
  });

  it('keeps modal and share copy aligned with install-code-lesson condition', () => {
    const modal = read('app/referral_access_activated_modal.tsx');
    const share = read('app/referral_invite_share.ts');

    expect(modal).toContain('установил приложение, ввёл ваш код и прошёл один урок полностью');
    expect(modal).toContain('${D}+${D} не равно ${D2}: друг получил свои ${D} ${pluralDaysRu(D)} отдельно.');
    expect(share).toContain('Установи приложение, введи мой код и пройди один урок полностью');
    expect(share).toContain('мы оба получим по 7 дней полного доступа');
  });

  it('hides the welcome code-entry CTA after the code has already been applied', () => {
    const welcomeState = read('app/referral_welcome_state.ts');
    const welcomeHost = read('components/ReferralWelcomeHost.tsx');

    expect(welcomeState).toContain("needsCodeEntry: !applied && !!pending && pendingSource !== 'manual_code'");
    expect(welcomeHost).toContain('welcomeDecision?.needsCodeEntry');
    expect(welcomeHost).toContain('testID="referral-welcome-code"');
  });

  it('shows the invited user display name before falling back to a technical id', () => {
    const cloud = read('app/referral_cloud.ts');
    const screen = read('app/referrals.tsx');
    const server = read('functions/src/referral.ts');

    expect(cloud).toContain('refereeName?: string');
    expect(server).toContain('refereeName');
    expect(server).toContain('referralDisplayNameFromUserData');
    expect(screen).toContain('function inviteDisplayName');
    expect(screen).toContain('invite.refereeName');
    expect(screen).toContain('{displayName}');
  });

  it('keeps referral screens borderless using tonal surfaces instead of decorative outlines', () => {
    const referrals = read('app/referrals.tsx');
    const entry = read('app/referral_code_entry.tsx');
    const ended = read('app/referral_access_ended_modal.tsx');

    expect(referrals).toContain('testID="screen-referrals"');
    expect(referrals).toContain('glassFill(t.bgSurface, 0.46)');
    expect(referrals).toContain('TonalSurface');
    expect(referrals).toContain('testID="referrals-my-code-card"');
    expect(referrals).not.toMatch(/borderWidth:\s*0,\s*borderColor:/);
    expect(referrals).not.toContain('BlurView');
    expect(referrals).not.toContain('backdropFilter');

    expect(entry).toContain('testID="screen-referral-code-entry"');
    expect(entry).toContain('TonalSurface');
    expect(entry).toContain('testID="referral-code-input"');
    expect(entry).toContain('testID="referral-code-submit"');
    expect(entry).not.toMatch(/borderWidth:\s*0,\s*borderColor:/);
    expect(entry).not.toContain('BlurView');
    expect(entry).not.toContain('backdropFilter');

    expect(ended).toContain('backgroundColor: pressed ? t.bgSurface2 : t.bgSurface');
    expect(ended).not.toContain('borderColor: t.accent');
  });
});
