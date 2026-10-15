// зачем (координатор 12.10, R1 «нет пути»): dev-состояния paywall= (онбординг), referral=off, promo=…, друзья (hold/fail/event) работают ТОЛЬКО в dev-сборке;
// в стор-сборке ссылка ничего не включает, геттеры «выключено», а ответ промокода всегда настоящий (сервер).
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `k:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiRemove: jest.fn(async () => undefined), multiGet: jest.fn(async () => []) },
}));
const mockCallable = jest.fn(() => { throw new Error('network must not be used'); });
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: jest.fn(() => ({})), httpsCallable: (...args: unknown[]) => (mockCallable as unknown as (...a: unknown[]) => unknown)(...args) }));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState, parseDevStateParams } from '../app/dev_state_fixtures';
import {
  consumeDevFriendEvent, getDevPromoResult, getDevReferralApplyResult, isDevFriendsFail, isDevFriendsHeld, isDevReferralOff, isDevUnsyncedFriendCode, resetDevSocialStateForTests, setDevSocialState,
} from '../app/dev_social_state';
import { getDevPaywallLinkState, setDevPaywallLinkState } from '../app/dev_paywall_state';
import { isReferralCloudEnabled } from '../app/referral_flags';
import { redeemPromoCode } from '../app/promo_code_client';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('dev social states', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevSocialStateForTests();
    setDevPaywallLinkState(null);
    mockCallable.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses the link parameters and rejects unknown values', () => {
    const { request, rejected } = parseDevStateParams({ paywall: 'failed', referral: 'off', promo: 'used', dev_friends_hold: 'add_request', dev_friends_fail: 'add,search', friend_event: 'study_invite' });
    expect(request).toMatchObject({ paywall: 'failed', referral: 'off', promo: 'used', friendsHold: ['add_request'], friendsFail: ['add', 'search'], friendEvent: 'study_invite' });
    expect(rejected).toEqual({});
    const bad = parseDevStateParams({ paywall: 'x', promo: 'free', dev_friends_fail: 'add,boom', friend_event: 'duel' });
    expect(Object.keys(bad.rejected).sort()).toEqual(['dev_friends_fail', 'friend_event', 'paywall', 'promo']);
  });

  it('applies the flags in a dev build and off clears them', async () => {
    const applied = await applyDevState({ paywall: 'reference', referral: 'off', promo: 'expired', friendsHold: ['add_request'], friendsFail: ['search'], friendEvent: 'study_invite' });
    expect(applied.skipped).toEqual({});
    expect(getDevPaywallLinkState()).toBe('reference');
    expect([isDevReferralOff(), getDevPromoResult()?.status, isDevFriendsHeld('add_request'), isDevFriendsFail('search'), isDevFriendsFail('add')]).toEqual([true, 'expired', true, true, false]);
    expect(consumeDevFriendEvent()).toBe('study_invite');
    expect(consumeDevFriendEvent()).toBeNull(); // событие отдаётся один раз
    await applyDevState({ paywall: 'off', referral: 'on', promo: 'none', friendsHold: 'off', friendsFail: 'off' });
    expect(getDevPaywallLinkState()).toBeNull();
    expect([isDevReferralOff(), getDevPromoResult(), isDevFriendsHeld('add_request'), isDevFriendsFail('search')]).toEqual([false, null, false, false]);
  });

  it('maps every promo fixture to a server-like result', () => {
    const expected: Record<string, string> = {
      off: 'promo_disabled', ok: 'redeemed', lifetime: 'redeemed', used: 'already_redeemed', expired: 'expired', disabled: 'disabled', limit: 'limit_reached', not_found: 'not_found', rate_limited: 'rate_limited', error: 'error',
    };
    for (const [key, status] of Object.entries(expected)) {
      setDevSocialState({ promo: key as never });
      expect(getDevPromoResult()?.status).toBe(status);
    }
    setDevSocialState({ promo: 'ok' });
    expect(getDevPromoResult(1_000)).toMatchObject({ rewardDays: 30, rewardKind: 'days', grantAtMs: 1_000 });
    setDevSocialState({ promo: 'lifetime' });
    expect(getDevPromoResult()).toMatchObject({ rewardKind: 'lifetime', vipUntilMs: 0 });
  });

  it('answers the promo code from the fixture without touching the network, but keeps the format check', async () => {
    setDevSocialState({ promo: 'used' });
    expect((await redeemPromoCode('test-code')).status).toBe('already_redeemed');
    expect((await redeemPromoCode('!')).status).toBe('bad_code');
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('turns the invite switch off and recognises the service friend code', () => {
    const before = isReferralCloudEnabled();
    setDevSocialState({ referralOff: true });
    expect(isReferralCloudEnabled()).toBe(false);
    setDevSocialState({ referralOff: false });
    expect(isReferralCloudEnabled()).toBe(before);
    expect(isDevUnsyncedFriendCode(' devunsynced ')).toBe(true);
    expect(isDevUnsyncedFriendCode('ABCD')).toBe(false);
  });

  it('does nothing in a store build', async () => {
    mockStoreRelease = true;
    expect(setDevSocialState({ referralOff: true, promo: 'ok', friendsHolds: ['add_request'], friendsFails: ['add'], friendEvent: 'study_invite' })).toBe(false);
    expect(setDevPaywallLinkState('loading')).toBe(false);
    const result = await applyDevState({ paywall: 'loading', referral: 'off', promo: 'ok', friendsFail: ['add'] });
    expect(result.skipped).toEqual({ all: 'not_dev_build' });
    mockStoreRelease = false;
    setDevSocialState({ referralOff: true, promo: 'ok', friendsHolds: ['add_request'], friendsFails: ['add'], friendEvent: 'study_invite' });
    setDevPaywallLinkState('loading');
    mockStoreRelease = true; // даже если флаг уже стоял — в стор-сборке геттеры его гасят
    expect([isDevReferralOff(), getDevPromoResult(), isDevFriendsHeld('add_request'), isDevFriendsFail('add'), consumeDevFriendEvent(), getDevPaywallLinkState(), isDevUnsyncedFriendCode('DEVUNSYNCED')])
      .toEqual([false, null, false, false, null, null, false]);
  });

  it('is wired into the paywall hook, friends tab, promo client and invite switch', () => {
    const checks: ReadonlyArray<readonly [string, RegExp]> = [
      ['app/paywall_purchase.ts', /devStateArg \?\? getDevPaywallLinkState\(\)/],
      ['app/promo_code_client.ts', /getDevPromoResult\(\)[\s\S]*promoCodeRedeem/],
      ['app/referral_flags.ts', /isDevReferralOff\(\)/],
      ['app/(tabs)/friends.tsx', /isDevFriendsFail\('search'\)[\s\S]*isDevFriendsHeld\('add_request'\)[\s\S]*consumeDevFriendEvent\(\)/],
    ];
    const missing = checks.filter(([file, pattern]) => !pattern.test(read(file))).map(([file]) => file);
    expect(missing).toEqual([]);
    expect(read('app/dev_social_state.ts')).not.toMatch(/httpsCallable\(|firebase\/firestore|@react-native-firebase|\bfetch\(|\bsetDoc\(|\baddDoc\(|\bupdateDoc\(|XMLHttpRequest/);
  });

  // зачем (координатор 12.10, overlays-campaigns-016…026): ответ шита «Код от друга» — фикстурой в памяти; в стор-сборке нет.
  it('answers the friend code sheet from refcode= and skips the server and the friend request', async () => {
    const { request, rejected } = parseDevStateParams({ refcode: 'too_old' });
    expect([request.refcode, rejected]).toEqual(['too_old', {}]);
    expect(Object.keys(parseDevStateParams({ refcode: 'boom' }).rejected)).toEqual(['refcode']);
    await applyDevState({ refcode: 'hold' });
    expect(getDevReferralApplyResult()).toBe('hold');
    setDevSocialState({ refcode: 'none' });
    expect(getDevReferralApplyResult()).toBeNull();
    setDevSocialState({ refcode: 'self' });
    mockStoreRelease = true;
    expect(getDevReferralApplyResult()).toBeNull();
    // подмена стоит ДО сервера, а ранние выходы не доходят до поиска владельца кода и заявки в друзья
    expect(read('components/referral_code_sheet.tsx')).toMatch(
      /getDevReferralApplyResult\(\)[\s\S]*devResult === 'hold'[\s\S]*return;[\s\S]*setFeedback\(feedbackForStatus\(devResult, L\)\)[\s\S]*return;[\s\S]*applyManualReferralCode\(normalized\)[\s\S]*sendFriendRequest/, // зачем (15.10, overlays-campaigns-021): в сеть уходит нормализованный код
    );
  });
});
