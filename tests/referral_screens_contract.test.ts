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

describe('referral roulette screen contract', () => {
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

  it('converts qualified invites into spin credits without legacy per-row claiming', () => {
    const source = read('app/referrals.tsx');
    expect(source).toContain('claimReferralSpins');
    expect(source).toContain("'Прокрут начислен'");
    expect(source).toContain("'Прокрут готов'");
    expect(source).not.toContain('testID="referrals-claim-pending"');
    expect(source).not.toContain('claimReferralVipDays');
    expect(source).toContain('readReferralInvites(renderToken)');
  });
  it('keeps referral code entry as a separate explanatory screen', () => {
    const source = read('app/referral_code_entry.tsx');

    expect(source).toContain('testID="screen-referral-code-entry"');
    expect(source).toContain('Есть код от друга? Введи его здесь и закончи первый урок — другу откроется 1 прокрут.');
    expect(source).toContain('Plus от 1 дня до 365 дней.');
    expect(source).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(source).toContain('testID="referral-code-entry-off"');
    expect(source).not.toContain('testID="referral-code-seven-plus-seven-note"');
    expect(source).toContain('testID="referral-code-input"');
    expect(source).toContain('applyManualReferralCode');
  });

  it('keeps referrals as a separate gated roulette screen without legacy Plus claims', () => {
    const source = read('app/referrals.tsx');

    expect(source).toContain('testID="screen-referrals"');
    expect(source).toContain('Твои приглашения');
    expect(source).toContain('testID="referrals-roulette-hero"');
    expect(source).toContain('Ждём первый урок');
    expect(source).toContain('Прокрут готов');
    expect(source).not.toContain('Получить Plus');
    expect(source).not.toContain('Получить VIP');
    expect(source).not.toContain('VIP можно забирать');
    expect(source).not.toContain('claimReferralVipDays');
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

  it('keeps roulette credits and prizes server-authoritative behind the master flag', () => {
    const referral = read('functions/src/referral.ts');
    const claim = read('functions/src/referral_claim_spin.ts');
    const spin = read('functions/src/referral_spin.ts');

    expect(referral).toContain('resolveReferralRouletteEnabled');
    expect(claim).toContain("'REFERRAL_ROULETTE_DISABLED'");
    expect(claim).toContain('referral_spin_credits');
    expect(spin).toContain("'REFERRAL_ROULETTE_DISABLED'");
    expect(spin).toContain('spinRequestId');
    expect(spin).toContain('prizeDays');
  });

  it('keeps share and expiration copy aligned with the roulette model', () => {
    const share = read('app/referral_invite_share.ts');
    const expired = read('components/EntitlementExpiredHost.tsx');

    expect(share).toContain('Установи приложение, введи мой код и пройди первый урок полностью');
    expect(share).toContain('Plus от 1 дня до 365 дней');
    expect(expired).toContain('1 прокрут');
    expect(expired).not.toContain('по 7 дней за каждого');
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
