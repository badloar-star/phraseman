import { readFileSync } from 'fs';
import { join } from 'path';
import { __resetAccountGenerationForTests, ensureAccountGeneration } from '../app/account_generation';
import { accountScopeKey } from '../app/account_scope_key';
import {
  selectAccountScopedReferralState,
  selectReferralSurfaceState,
} from '../app/referral_surface_state';
import {
  beginReferralInvitesRequest,
  commitReferralInvites,
  commitReferralState,
  parsePersistedReferralState,
  parsePersistedReferralInvites,
  readReferralDrain,
  readReferralInvites,
  referralInvitesCacheSizeForTests,
  resetReferralInvitesCacheForTests,
  serializeReferralInvites,
  serializeReferralState,
  isReferralAccountRequestCurrent,
  storeReferralState,
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

  it('persists the grandfathered drain with the same account and TTL boundary', () => {
    const alice = ensureAccountGeneration('alice');
    const rows = [{ refereeStableId: 'friend', status: 'pending', createdAtMs: 1 }] as any;
    const drain = {
      softEnabled: false,
      emergencyStop: false,
      serverNowMs: 1_000,
      activePendingCount: 1,
      claimableQualifiedCount: 2,
      availableCreditCount: 3,
      latestPendingDeadlineMs: 2_000,
      earliestCreditExpiryMs: 3_000,
    };
    const request = beginReferralInvitesRequest(alice);
    expect(commitReferralState(request, rows, drain, 1_000)).toBe(true);
    expect(readReferralDrain(alice, 20_000)).toEqual({ value: drain, isFresh: true });
    expect(readReferralDrain(alice, 70_000)).toEqual({ value: drain, isFresh: false });

    const persisted = serializeReferralState(alice, rows, drain, 1_000);
    expect(parsePersistedReferralState(persisted, alice, 20_000)).toEqual({
      value: rows,
      drain,
      updatedAt: 1_000,
      isFresh: true,
    });
    expect(parsePersistedReferralState(persisted, { ...alice, stableId: 'bob' })).toBeNull();
  });

  it('rejects a friends referral refresh response after an account switch', () => {
    const alice = ensureAccountGeneration('alice');
    const aliceKey = accountScopeKey(alice)!;
    expect(isReferralAccountRequestCurrent(alice, aliceKey)).toBe(true);

    ensureAccountGeneration('bob');
    expect(isReferralAccountRequestCurrent(alice, aliceKey)).toBe(false);
  });

  it('hides invites, drain, and spins on the first render of a new account', () => {
    const alice = ensureAccountGeneration('alice');
    const aliceKey = accountScopeKey(alice)!;
    const invites = [{ refereeStableId: 'alice-friend', status: 'qualified', createdAtMs: 1 }] as any;
    const drain = {
      softEnabled: false,
      emergencyStop: false,
      serverNowMs: 1_000,
      activePendingCount: 1,
      claimableQualifiedCount: 1,
      availableCreditCount: 2,
      latestPendingDeadlineMs: 2_000,
      earliestCreditExpiryMs: 3_000,
    };
    expect(selectAccountScopedReferralState(aliceKey, {
      accountKey: aliceKey,
      invites,
      drain,
      spins: 2,
      referralCode: 'ALICE1',
    })).toMatchObject({ accountMatches: true, invites, drain, spins: 2, referralCode: 'ALICE1' });

    const bob = ensureAccountGeneration('bob');
    expect(selectAccountScopedReferralState(accountScopeKey(bob), {
      accountKey: aliceKey,
      invites,
      drain,
      spins: 2,
      referralCode: 'ALICE1',
    })).toEqual({ accountMatches: false, invites: [], drain: null, spins: 0, referralCode: null });
  });

  it('a stale account response cannot evict the newer account cache entry', () => {
    const alice = ensureAccountGeneration('alice');
    const aliceRequest = beginReferralInvitesRequest(alice);
    const bob = ensureAccountGeneration('bob');
    const bobInvites = [{ refereeStableId: 'bob-friend', status: 'pending', createdAtMs: 1 }] as any;
    const bobDrain = {
      softEnabled: false,
      emergencyStop: false,
      serverNowMs: 10,
      activePendingCount: 1,
      claimableQualifiedCount: 0,
      availableCreditCount: 0,
      latestPendingDeadlineMs: 20,
      earliestCreditExpiryMs: 0,
    };
    expect(storeReferralState(bob, bobInvites, bobDrain, 10)).toBe(true);
    expect(commitReferralState(aliceRequest, [], { ...bobDrain, availableCreditCount: 9 }, 20)).toBe(false);
    expect(readReferralInvites(bob, 20)?.value).toBe(bobInvites);
    expect(readReferralDrain(bob, 20)?.value).toBe(bobDrain);
  });

  it('hydrates referrals, friends, and settings from the account-scoped drain cache', () => {
    const referrals = read('app/referrals.tsx');
    const friends = read('app/(tabs)/friends.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const bootstrap = read('app/app_snapshot_bootstrap.ts');

    expect(referrals).toContain('readReferralDrain(renderToken)');
    expect(friends).toContain('readReferralDrain(referralAccountToken)');
    expect(friends).toContain('isReferralAccountRequestCurrent(requestToken, referralAccountKey)');
    expect(settings).toContain('readReferralDrain(settingsReferralToken)');
    expect(settings).toContain("router.push('/referrals' as any)");
    expect(bootstrap).toContain('REFERRAL_STATE_STORAGE_KEY');
    expect(bootstrap).toContain('hydrateReferralStateFromRaw');
  });

  it('uses persisted server policy before remote config hydration', () => {
    const baseDrain = {
      softEnabled: false,
      emergencyStop: false,
      serverNowMs: 1_000,
      activePendingCount: 0,
      claimableQualifiedCount: 0,
      availableCreditCount: 2,
      latestPendingDeadlineMs: 0,
      earliestCreditExpiryMs: 2_000,
    };
    expect(selectReferralSurfaceState({
      referralEnabled: true,
      remotePolicy: { softEnabled: true, emergencyStop: false, remoteHydrated: false },
      persistedDrain: baseDrain,
    })).toMatchObject({
      softEnabled: false,
      emergencyStop: false,
      marketingVisible: false,
      drainVisible: true,
      rouletteAvailable: true,
      availableCreditCount: 2,
    });
    expect(selectReferralSurfaceState({
      referralEnabled: true,
      remotePolicy: { softEnabled: true, emergencyStop: false, remoteHydrated: false },
      persistedDrain: { ...baseDrain, emergencyStop: true },
    })).toMatchObject({
      emergencyStop: true,
      marketingVisible: false,
      drainVisible: false,
      rouletteAvailable: false,
      availableCreditCount: 0,
    });
  });

  it('roulette synchronously reads the persisted account-scoped drain', () => {
    const roulette = read('app/roulette.tsx');
    expect(roulette).toContain('readReferralDrain(rouletteAccountToken)');
    expect(roulette).toContain('selectReferralSurfaceState');
  });

  it('converts qualified invites into spin credits without legacy per-row claiming', () => {
    const source = read('app/referrals.tsx');
    expect(source).toContain('claimReferralSpins');
    expect(source).toContain("'Ключ начислен'");
    expect(source).toContain("'Ключ готов'");
    expect(source).not.toContain('testID="referrals-claim-pending"');
    expect(source).not.toContain('claimReferralVipDays');
    expect(source).toContain('readReferralInvites(renderToken)');
  });
  it('keeps referral code entry as a separate explanatory screen', () => {
    const source = read('app/referral_code_entry.tsx');

    expect(source).toContain('testID="screen-referral-code-entry"');
    expect(source).toContain('Есть код от друга? Введи его здесь и оформи Plus или Pro — другу откроется ключ.');
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
    expect(source).toContain('Ждём покупку Plus');
    expect(source).toContain('Ключ готов');
    expect(source).not.toContain('Получить Plus');
    expect(source).not.toContain('Получить VIP');
    expect(source).not.toContain('VIP можно забирать');
    expect(source).not.toContain('claimReferralVipDays');
    expect(source).not.toContain('testID="referrals-seven-plus-seven-note"');
    expect(source).not.toContain('summary.pending');
    expect(source).not.toContain('claimableDays');
    expect(source).toContain(') : null}');
  });

  it('moves referral entry points from friends to the settings invite banner', () => {
    const friends = read('app/(tabs)/friends.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const layout = read('app/_layout.tsx');

    // Из «Друзей» рулетка/приглашения убраны полностью (owner 2026-07-24):
    // ни иконки-мегафона, ни переходов на реферальные экраны.
    expect(friends).not.toContain('testID="friends-open-referrals"');
    expect(friends).not.toContain("router.push('/referrals' as any)");
    expect(friends).not.toContain("router.push('/referral_code_entry' as any)");
    // Входы живут в настройках: ряд «Ввести реферальный код» + инвайт-баннер.
    expect(settings).toContain('testID="settings-referral-code-row"');
    expect(settings).toContain('testID="settings-invite-banner"');
    expect(settings).toContain("router.push('/referral_code_entry' as any)");
    expect(settings).toContain("router.push('/referrals' as any)");
    expect(layout).toContain('<Stack.Screen name="referral_code_entry"');
    expect(layout).toContain('<Stack.Screen name="referrals"');
  });

  it('keeps roulette credits and prizes server-authoritative behind the master flag', () => {
    const referral = read('functions/src/referral.ts');
    const claim = read('functions/src/referral_claim_spin.ts');
    const spin = read('functions/src/referral_spin.ts');

    expect(referral).toContain('resolveReferralRouletteEnabled');
    expect(claim).toContain("'REFERRAL_ROULETTE_EMERGENCY_STOP'");
    expect(claim).toContain('referralRoulettePolicyFromData');
    expect(claim).toContain('referral_spin_credits');
    expect(spin).toContain("'REFERRAL_ROULETTE_EMERGENCY_STOP'");
    expect(spin).toContain('reconcileLedgerRows');
    expect(spin).toContain('spinRequestId');
    expect(spin).toContain('prizeDays');
  });

  it('keeps share and expiration copy aligned with the roulette model', () => {
    const share = read('app/referral_invite_share.ts');
    const expired = read('components/EntitlementExpiredHost.tsx');

    expect(share).toContain('Установи приложение, введи мой код и оформи Plus или Pro');
    expect(share).toContain('Plus от 1 дня до 365 дней');
    expect(expired).toContain('получишь ключ');
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
