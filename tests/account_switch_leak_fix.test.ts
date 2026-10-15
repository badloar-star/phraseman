// Утечка между аккаунтами (координатор 15.10, docs/phraseman-2.0/handoff/LOGOUT_WIPE_AUDIT_2026-10-15.md, 🔴 №1 к 16.10).
// Сторож ключей хранилища — tests/account_switch_no_survivors.test.ts (Дизайн). Здесь: сброс памяти при смене владельца,
// снятие push при выходе/смене и лог survivors. Сработал — чини логику, а не сторожа.
import fs from 'node:fs';
import path from 'node:path';

import { beginAccountGeneration } from '../app/account_generation';
import { onAccountOwnerChanged } from '../app/account_owner_change';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('onAccountOwnerChanged — сброс кэша в памяти только при смене владельца', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('холодный старт (нет владельца → A) — без сброса; A → B — сброс один раз; B → B — без сброса; B → нет — сброс', () => {
    beginAccountGeneration(null);
    const reset = jest.fn();
    onAccountOwnerChanged('test_cache', reset);
    beginAccountGeneration('owner-A');
    expect(reset).not.toHaveBeenCalled();
    beginAccountGeneration('owner-B');
    expect(reset).toHaveBeenCalledTimes(1);
    beginAccountGeneration('owner-B');
    expect(reset).toHaveBeenCalledTimes(1);
    beginAccountGeneration(null);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('окно A → нет → B: сброс и на выходе, и на приходе B; A → нет → A — один сброс', () => {
    beginAccountGeneration(null);
    const reset = jest.fn();
    onAccountOwnerChanged('window_cache', reset);
    beginAccountGeneration('owner-A');
    expect(reset).toHaveBeenCalledTimes(0);
    beginAccountGeneration(null);
    expect(reset).toHaveBeenCalledTimes(1);
    beginAccountGeneration('owner-B');
    expect(reset).toHaveBeenCalledTimes(2);
    beginAccountGeneration(null);
    expect(reset).toHaveBeenCalledTimes(3);
    beginAccountGeneration('owner-B');
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it('сбой сброса не ломает смену аккаунта (пишет причину)', () => {
    beginAccountGeneration('owner-A');
    onAccountOwnerChanged('broken_cache', () => { throw new Error('boom'); });
    expect(() => beginAccountGeneration('owner-B')).not.toThrow();
  });
});

describe('проводка заплатки', () => {
  it('выход/смена: push-токен и уведомления снимаются ДО signOut и только в пути смены, не в общем выходе провайдера', () => {
    const src = read('app/auth_provider.ts');
    const at = src.indexOf('signOut: async (): Promise<void> => {\n      await clearAccountPushBeforeSwitchSignOut();\n      await signOutCurrentProviderKeepingSwitchResume();');
    expect(at).toBeGreaterThan(-1);
    const perform = src.slice(src.indexOf('async function performCurrentProviderSignOut(): Promise<void> {'), src.indexOf("logAuthEvent('auth_signout');"));
    expect(perform).not.toContain('clearAccountPushBeforeSwitchSignOut');
    expect(src).toContain('[ACC-SWITCH-WIPE] push_cleanup result=');
  });

  it('стирание: ключи-утечки в шаге «только стирание», лог survivors и метка очистки кэша Firestore', () => {
    const src = read('app/cloud_sync.ts');
    expect(src).toContain('export { ACCOUNT_SWITCH_LEAK_KEYS };');
    expect(read('app/account_switch_leak_keys.ts')).toContain("'streak_plus_freeze_pending_v1'");
    // копия A несёт ключи-утечки (A получает их обратно при своём входе), опись аккаунта — нет (иначе гость «грязный» при входе)
    expect(src).toMatch(/shardQueueKey,[\s\S]{0,700}\.\.\.ACCOUNT_SWITCH_LEAK_KEYS,\n  \]\);/);
    expect(read('app/account_switch_backup_restore.ts')).toContain('[ACC-SWITCH-RESTORE] owner_match=');
    expect(src).toContain('new Set([...APP_MESSAGES_ACCOUNT_WIPE_LEGACY_KEYS, ...ACCOUNT_SWITCH_LEAK_KEYS])');
    expect(src).toContain('[ACC-SWITCH-WIPE] survivors=');
    expect(src).toContain("markFirestoreCacheClearPending('account_wipe')");
  });

  it.each([
    ['app/statsCache.ts', 'stats_preload'],
    ['app/medal_utils.ts', 'medals'],
    ['app/activity_365_analytics.ts', 'activity_365'],
    ['modules/today-tasks/today_tasks_store.ts', 'today_tasks'],
    ['app/hall_of_fame_utils.ts', 'streak_day_marks'],
    ['app/dialogue_v2_voice_daily_limit.ts', 'dialog_voice_attempts'],
    ['app/streak_day_signal.ts', 'streak_day_signal'],
    ['app/diagnostic_test_state.ts', 'diagnostic_peek'],
    ['app/streak_stats.tsx', 'streak_stats_peeks'],
  ])('%s сбрасывает кэш при смене владельца (%s)', (file, name) => {
    expect(read(file)).toContain(`onAccountOwnerChanged('${name}'`);
  });
});
