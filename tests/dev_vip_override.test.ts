// зачем (координатор 12.10): dev-фикстуры VIP и плана (`vip=`, `promo=ok|lifetime`, `plan=`) раньше писали настоящий VIP-снимок в хранилище, а его ключи входят в облачную
// синхронизацию. Теперь подмена — ТОЛЬКО в памяти: чтение отдаёт подмену, запись снимка пропускается, в AsyncStorage ничего не уходит; в стор-сборке подмены нет.
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined), getDevLocalPlusStorageKey: (id: string) => `dev_local_plus_override_v1:${id}` }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));
const mockStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
  multiSet: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
  multiGet: jest.fn(async () => []),
  getAllKeys: jest.fn(async () => []),
};
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockStorage }));
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { applyDevState } from '../app/dev_state_fixtures';
import {
  clearDevVipOverride, getDevPlanOverride, getDevVipOverrideFor, isDevVipOverrideActive, resetDevVipOverrideForTests, setDevPlanOverride, setDevVipOverride,
} from '../app/dev_vip_override';
import { isDevSettingsFail, resetDevSocialStateForTests } from '../app/dev_social_state';
import { readVipSnapshotForAccount, writeVipSnapshotForAccount } from '../app/premium_vip_storage';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
/** Код без комментариев: в шапках модулей слова AsyncStorage/firebase упоминаются в пояснениях. */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PROMO = { vip_active: 'true', vip_plan: 'promo', vip_from: '1', vip_until: '9999999999999', vip_admin_override: 'true', vip_admin_grant_at: '1' };

describe('dev VIP and plan overrides live in memory only', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDevVipOverrideForTests();
    resetDevSocialStateForTests();
    Object.values(mockStorage).forEach((fn) => fn.mockClear());
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('serves the override on read and skips snapshot writes while it is active', async () => {
    expect(setDevVipOverride('acc-1', PROMO, 'promo_vip')).toBe(true);
    expect(await readVipSnapshotForAccount('acc-1')).toMatchObject({ vip_active: 'true', vip_plan: 'promo' });
    expect(await readVipSnapshotForAccount('acc-2')).toBeNull(); // чужой аккаунт подмену не видит
    await writeVipSnapshotForAccount('acc-1', { vip_active: 'true', vip_plan: 'referral' });
    expect(mockStorage.multiSet).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(await readVipSnapshotForAccount('acc-1')).toMatchObject({ vip_plan: 'promo' }); // запись не перетёрла подмену
    clearDevVipOverride();
    expect(isDevVipOverrideActive()).toBe(false);
    await writeVipSnapshotForAccount('acc-1', { vip_active: 'true', vip_plan: 'referral' });
    expect(mockStorage.multiSet).toHaveBeenCalledTimes(1); // без подмены запись работает как прежде
  });

  it('applies vip= / plan= / promo fixtures without writing the snapshot to storage', async () => {
    const result = await applyDevState({ vip: 'referral', plan: 'yearly' });
    expect(result.skipped).toEqual({});
    expect(getDevVipOverrideFor('stable-1')).toMatchObject({ vip_active: 'true', vip_plan: 'referral' });
    expect(getDevPlanOverride()).toMatchObject({ plan: 'yearly' });
    expect(getDevPlanOverride()?.expiryMs).toBeGreaterThan(Date.now());
    expect(mockStorage.multiSet).not.toHaveBeenCalled();
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    setDevPlanOverride('lifetime');
    expect(getDevPlanOverride()).toEqual({ plan: 'lifetime', expiryMs: null });
    await applyDevState({ plan: 'off' });
    expect(getDevPlanOverride()).toBeNull();
  });

  it('does nothing in a store build', async () => {
    mockStoreRelease = true;
    expect(setDevVipOverride('acc-1', PROMO)).toBe(false);
    expect(setDevPlanOverride('yearly')).toBe(false);
    expect((await applyDevState({ vip: 'promo', plan: 'monthly' })).skipped).toEqual({ all: 'not_dev_build' });
    mockStoreRelease = false;
    setDevVipOverride('acc-1', PROMO);
    setDevPlanOverride('yearly');
    mockStoreRelease = true; // даже если подмена уже стояла — в стор-сборке она не читается и не блокирует запись
    expect([getDevVipOverrideFor('acc-1'), isDevVipOverrideActive(), getDevPlanOverride()]).toEqual([null, false, null]);
    await writeVipSnapshotForAccount('acc-1', { vip_active: 'true' });
    expect(mockStorage.multiSet).toHaveBeenCalledTimes(1);
  });

  it('applies the settings failure switches independently', async () => {
    await applyDevState({ studyfail: 'on', support: 'fail', cache: 'failed' });
    expect([isDevSettingsFail('study_language'), isDevSettingsFail('support_send'), isDevSettingsFail('cache_clear')]).toEqual([true, true, true]);
    await applyDevState({ support: 'ok' });
    expect([isDevSettingsFail('study_language'), isDevSettingsFail('support_send'), isDevSettingsFail('cache_clear')]).toEqual([true, false, true]);
    await applyDevState({ studyfail: 'off', cache: 'ok' });
    expect([isDevSettingsFail('study_language'), isDevSettingsFail('cache_clear')]).toEqual([false, false]);
  });

  it('keeps dev keys and dev writers out of cloud sync and storage', () => {
    expect(code('app/dev_vip_override.ts')).not.toMatch(/AsyncStorage|multiSet|setItem|firebase|fetch\(/);
    expect(read('app/cloud_sync.ts')).not.toMatch(/dev_local_plus_override|dev_vip|dev_plan/);
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).not.toMatch(/writeVipSnapshotForAccount|premium_plan|premium_rc_product_id/);
    const promo = read('app/promo_code_entry.tsx');
    expect(promo.indexOf('getDevPromoResult() !== null')).toBeGreaterThan(-1);
    expect(promo.indexOf('getDevPromoResult() !== null')).toBeLessThan(promo.indexOf('await writeVipSnapshotForAccount'));
  });

  it('is wired into the screens that show the plan and into the settings failure points', () => {
    const checks: ReadonlyArray<readonly [string, RegExp]> = [
      ['app/manage_subscription.tsx', /getDevPlanOverride\(\)[\s\S]*devPlanForMetadata/],
      ['app/(tabs)/settings.tsx', /getDevPlanOverride\(\)\?\.plan \?\? pairs\[1\]\[1\]/],
      ['app/study_languages.ts', /isDevSettingsFail\('study_language'\)/],
      ['app/support_report_outbox.ts', /isDevSettingsFail\('support_send'\)/],
      ['app/cache_reset.ts', /isDevSettingsFail\('cache_clear'\)/],
      ['app/premium_vip_storage.ts', /getDevVipOverrideFor\(stableId\)/],
      ['app/premium_vip_storage.ts', /if \(isDevVipOverrideActive\(\)\)/],
    ];
    const missing = checks.filter(([file, pattern]) => !pattern.test(read(file))).map(([file]) => file);
    expect(missing).toEqual([]);
  });
});
