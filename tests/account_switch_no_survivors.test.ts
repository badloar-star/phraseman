import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Сторож ACC-SWITCH (координатор 15.10, LOGOUT_WIPE_AUDIT_2026-10-15.md п.5): после выхода/смены аккаунта на телефоне
 * не должно остаться ни одного ключа аккаунта A. Тест кладёт ВСЕ ключи из таблицы аудита как данные A, зовёт НАСТОЯЩЕЕ
 * стирание wipeLocalAccountData() (тело — wipeLocalAccountDataUnsafeBody, cloud_sync.ts) и требует пустой список выживших.
 *
 * Выжившими НЕ считаем: KEEP устройства (тема, размер шрифта, хаптик, журналы смены аккаунта — см. KEEP в cloud_sync.ts),
 * аварийную копию account_switch_emergency_backup_* (риск принят осознанно, вопрос владельцу) и study_target_v1
 * (возможно, так задумано — вопрос владельцу). Они в списке DEVICE_OR_OPEN_QUESTION, а не в проверке.
 *
 * ВКЛЮЧЁН: патч Ядра ACC-SWITCH в HEAD (414bb1713), тест зелёный; skip и переменная ACC_SWITCH_NO_SURVIVORS убраны.
 * ИСТОРИЯ — выжившие до патча (живой прогон 15.10 ~06:54), 22 ключа:
 *   ban_status_cached_at_v1, ban_status_cached_v1, community_pack_liked_ids_v1, dialogs_completed_ids_v1,
 *   dialogs_free_lifetime_count_v3, dialogue_v2_voice_attempts_v1, dialogue_v2_why_allowance:v1, energy_zero_count_v1,
 *   lessons_pearl_unlocked_v1, lessons_pearl_unlocked_v1_fr, lifetime_profile_stats_snapshot_v1,
 *   premium_celebration_pending_marker_v1, premium_celebration_pending_v1, premium_celebration_pending_variant_v1,
 *   premium_free_freeze_month_v1, stats_preload_cache_v5, streak_lost_count_v1, streak_plus_freeze_pending_v1,
 *   streak_server_sync_day_v1, streak_week_day_markers_v1, vip_celebration_pending_marker_v1, vip_celebration_pending_v1.
 * Ядро (15.10): ключи стирает экспорт ACCOUNT_SWITCH_LEAK_KEYS (app/account_switch_leak_keys.ts, реэкспорт из cloud_sync.ts).
 */

jest.mock('../app/user_id_policy', () => ({
  clearArenaAuthUidCache: jest.fn(),
  getAuthUserId: jest.fn(() => null),
  getCanonicalUserId: jest.fn(async () => 'stable-a'),
}));

// eslint-disable-next-line import/first
import { __resetAccountGenerationForTests, beginAccountGeneration } from '../app/account_generation';
// eslint-disable-next-line import/first
import { __cloudSyncTestHooks, accountOwnedStorageKeysFrom, SIGNOUT_DEVICE_KEEP_KEYS, wipeLocalAccountData } from '../app/cloud_sync';
// eslint-disable-next-line import/first
import { DEVICE_ONBOARDING_DONE_KEY, DEVICE_ONBOARDING_MARK_KEYS, resolveBootOnboardingDone } from '../app/device_onboarding_marks';
// eslint-disable-next-line import/first
import { languageProfileKey } from '../app/study_languages';
// eslint-disable-next-line import/first
import { ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE } from '../app/account_deleted_notice';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

/** Ключи из таблицы «🔴 Попадает в интерфейс или логику СЛЕДУЮЩЕГО аккаунта» (аудит 15.10) — точные имена из кода. */
const ACCOUNT_A_KEYS_FROM_AUDIT: readonly string[] = [
  // чинить первым: у B сработает отложенная заморозка A
  'streak_plus_freeze_pending_v1',
  // уроки, открытые A
  'lessons_pearl_unlocked_v1',
  'lessons_pearl_unlocked_v1_fr',
  // диалоги: история и израсходованные лимиты A
  'dialogs_completed_ids_v1',
  'dialogs_free_lifetime_count_v3',
  'dialogue_v2_voice_attempts_v1',
  'dialogue_v2_why_allowance:v1',
  // статистика: имя, серия, счётчики A
  'stats_preload_cache_v5',
  'lifetime_profile_stats_snapshot_v1',
  // серия
  'streak_server_sync_day_v1',
  'streak_week_day_markers_v1',
  // бан A (кэш 30 мин)
  'ban_status_cached_v1',
  'ban_status_cached_at_v1',
  // заморозки и поздравления Plus / VIP
  'premium_free_freeze_month_v1',
  // зачем (координатор 18.10 03:42): и отметки «поздравление показано» — аккаунт, а не телефон; тому же владельцу их вернёт копия
  'premium_celebration_seen_v1',
  'premium_celebration_admin_seen_v1',
  'vip_celebration_seen_v1',
  'premium_celebration_pending_v1',
  'premium_celebration_pending_marker_v1',
  'premium_celebration_pending_variant_v1',
  'vip_celebration_pending_v1',
  'vip_celebration_pending_marker_v1',
  // мелочь: лайки наборов A, счётчики персонализации пейвола
  'community_pack_liked_ids_v1',
  'energy_zero_count_v1',
  'streak_lost_count_v1',
];

/** Допустимые «выжившие»: настройки устройства и решения владельца, а не утечка. Их нет в проверке, но тест их кладёт для честности. */
const DEVICE_OR_OPEN_QUESTION: readonly string[] = [
  'app_theme',
  'app_font_size',
  'haptics_tap',
  'fc_voice_prefs_v1', // id системного голоса — настройка устройства (KEEP, координатор 15.10)
  'fc_voice_prefs_by_lang_v1',
  'account_switch_quarantine_v1',
  'account_switch_completion_receipt_v1',
  'account_provider_handoff_v1',
  'study_target_v1', // вопрос владельцу: язык изучения A, возможно, так задумано
  'app_lang', // устройство, решение владельца — пока живёт (ответ Ядра 15.10)
  'onboarding_done', // то же: onboarding_* живут
  'onboarding_step',
  'firestore_cache_clear_pending_v1', // метка очистки кэша Firestore: ОБЯЗАНА пережить wipe (патч Ядра, KEEP)
];
const DEVICE_OR_OPEN_QUESTION_PREFIXES: readonly string[] = [
  'account_switch_emergency_backup', // аварийная копия A для восстановления (до 30 дней) — риск принят, вопрос владельцу
  'onboarding_', // устройство: онбординг пока живёт целиком (ответ Ядра 15.10)
];

const isAllowedSurvivor = (key: string): boolean => (
  DEVICE_OR_OPEN_QUESTION.includes(key) || DEVICE_OR_OPEN_QUESTION_PREFIXES.some((prefix) => key.startsWith(prefix))
);

let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  storage.__reset?.();
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-a');
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
});

describe('ACC-SWITCH: после выхода ничего от аккаунта A не выживает', () => {
  it('таблица аудита не пустая и без дублей (сторож сам не сломан)', () => {
    expect(ACCOUNT_A_KEYS_FROM_AUDIT.length).toBeGreaterThan(20);
    expect(new Set(ACCOUNT_A_KEYS_FROM_AUDIT).size).toBe(ACCOUNT_A_KEYS_FROM_AUDIT.length);
    for (const key of ACCOUNT_A_KEYS_FROM_AUDIT) expect(isAllowedSurvivor(key)).toBe(false);
  });

  it('ни один ключ аккаунта A не выжил после wipeLocalAccountData()', async () => {
    for (const key of ACCOUNT_A_KEYS_FROM_AUDIT) await AsyncStorage.setItem(key, JSON.stringify({ owner: 'stable-a', marker: key }));
    for (const key of DEVICE_OR_OPEN_QUESTION) await AsyncStorage.setItem(key, 'device');
    await AsyncStorage.setItem('account_switch_emergency_backup_stable-a', 'backup');

    await wipeLocalAccountData();

    const left = await AsyncStorage.getAllKeys();
    const survivors = left.filter((key) => !isAllowedSurvivor(key)).sort();
    // имена выживших в сообщение об ошибке: по ним видно, что дописать в accountLocalDataKeysForToday / WIPE_ONLY_*
    expect({ survivors }).toEqual({ survivors: [] });
  });

  // зачем (координатор 18.10 04:16, Ревизор 3.76 / 596051245): держать при выходе ключи СИНХРОНИЗАЦИИ нельзя — при входе B они
  // сливались с его облаком. Сохраняются только ключи устройства вне SYNC_KEYS, онбординг держат метки устройства.
  it('ни один ключ, сохраняемый при выходе, не входит в опись аккаунта (SYNC_KEYS и копию)', () => {
    const accountOwned = new Set(accountOwnedStorageKeysFrom([]));
    expect(SIGNOUT_DEVICE_KEEP_KEYS.filter((key) => accountOwned.has(key))).toEqual([]);
    expect(DEVICE_ONBOARDING_MARK_KEYS.filter((key) => accountOwned.has(key))).toEqual([]);
  });

  it('A вышел → вошёл B с облачными языками и профилем: у B ровно его языки и профиль, от A ничего не осталось', async () => {
    const profileKey = languageProfileKey('fr');
    await AsyncStorage.multiSet([
      ['onboarding_done', '1'], ['app_lang', 'en'], ['lang', 'en'],
      ['study_languages_started_v1', JSON.stringify(['en', 'fr'])], [profileKey, JSON.stringify({ owner: 'A' })],
    ]);
    for (const key of SIGNOUT_DEVICE_KEEP_KEYS) await AsyncStorage.setItem(key, `device:${key}`);

    await wipeLocalAccountData(undefined, { mode: 'signout' });

    // ключи синхронизации A стёрты — в облако B от A уйти нечему
    const syncLeft = await AsyncStorage.multiGet(['onboarding_done', 'app_lang', 'lang', 'study_languages_started_v1', profileKey]);
    expect(syncLeft.filter(([, value]) => value != null)).toEqual([]);
    // ключи устройства вне синхронизации и метки устройства на месте
    expect(await AsyncStorage.multiGet([...SIGNOUT_DEVICE_KEEP_KEYS])).toEqual(SIGNOUT_DEVICE_KEEP_KEYS.map((key) => [key, `device:${key}`]));
    expect(await AsyncStorage.multiGet([...DEVICE_ONBOARDING_MARK_KEYS])).toEqual([['device_onboarding_done_v1', '1'], ['device_ui_lang_v1', 'en']]);
    expect(logSpy.mock.calls.some((call) => String(call[0]) === '[ACCOUNT-WIPE]'
      && String(call[1]).includes('"deviceMarks":["device_onboarding_done_v1","device_ui_lang_v1"]'))).toBe(true);

    // вход B: восстановление из облака B — у B ровно его [en, es] и его профиль
    beginAccountGeneration('stable-b');
    const restored = await __cloudSyncTestHooks.applyRestoreFromUserDoc({
      exists: true,
      data: () => ({ progress: { study_languages_started_v1: JSON.stringify(['en', 'es']), [profileKey]: JSON.stringify({ owner: 'B' }) } }),
    });
    expect(restored).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('study_languages_started_v1')) ?? '[]')).toEqual(['en', 'es']);
    expect(await AsyncStorage.getItem(profileKey)).toBe(JSON.stringify({ owner: 'B' }));
  });

  it('A вышел → холодный старт: онбординг не показан (метка устройства), у нового гостя своя отметка', async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    await wipeLocalAccountData(undefined, { mode: 'signout' });
    const [[, accountDone], [, deviceDone]] = await AsyncStorage.multiGet(['onboarding_done', DEVICE_ONBOARDING_DONE_KEY]);
    expect(accountDone).toBeNull();
    expect(resolveBootOnboardingDone(accountDone, deviceDone)).toEqual({ value: '1', source: 'device' });
    expect(resolveBootOnboardingDone(null, null)).toEqual({ value: null, source: 'none' });
  });

  it('полное стирание (удаление, вход со сменой) снимает метки устройства — после удаления онбординг показывается', async () => {
    await AsyncStorage.multiSet([[DEVICE_ONBOARDING_DONE_KEY, '1'], ['device_ui_lang_v1', 'en'], ['onboarding_done', '1']]);

    await wipeLocalAccountData();

    expect((await AsyncStorage.multiGet([...DEVICE_ONBOARDING_MARK_KEYS, 'onboarding_done'])).filter(([, value]) => value != null)).toEqual([]);
    expect(resolveBootOnboardingDone(null, null).value).toBeNull();
    expect(ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE).toEqual(expect.arrayContaining(['onboarding_done', 'onboarding_step', 'onboarding_flow_version_v1']));
  });

  it('новый аккаунт после смены видит СВОЁ поздравление, даже если выдача у него раньше по времени, чем у прошлого', async () => {
    const { processVipGrantForCelebration, isVipCelebrationPending } = await import('../app/vip_celebration_state');
    const { processAdminGrantForCelebration, isCelebrationPending } = await import('../app/premium_celebration_state');
    // A: обе выдачи уже отпразднованы, метки позднее, чем у B
    await AsyncStorage.multiSet([['vip_celebration_seen_v1', '2000000000000'], ['premium_celebration_admin_seen_v1', '2000000000000']]);

    await wipeLocalAccountData(undefined, { mode: 'signout' });

    expect(logSpy.mock.calls.some((call) => String(call[0]) === '[ACCOUNT-WIPE]'
      && String(call[1]).includes('"wipedCelebrationSeen":["premium_celebration_admin_seen_v1","vip_celebration_seen_v1"]'))).toBe(true);
    beginAccountGeneration('stable-b');
    await processVipGrantForCelebration('1900000000000');
    await processAdminGrantForCelebration('1900000000000');
    expect(await isVipCelebrationPending()).toBe(true);
    expect(await isCelebrationPending()).toBe(true);
  });

  // имена согласованы с Ядром 15.10 (app/account_owner_change.ts: onAccountOwnerChanged поверх subscribeAccountGeneration; сброс только при смене непустого stableId A -> B / null):
  // наполнить как A -> beginAccountGeneration('stable-b') -> getStatsCache() = DEFAULT, peekActivity365Analytics() = промах, peekTodayTasks() = null,
  // peekStreakDayState() = null, peekDialogVoiceAttempts() = 0, medals через invalidateMedalsCache(); streakTouchedDayKey/SweptDayKey — поведением (touchStreakForToday снова засчитывает день).
  // achievementCountPeek / recentAchievementIdsPeek / diagnostic_test_state.peekByTarget — имена пришлёт Ядро.
  it.todo('ждёт патча Ядра ACC-SWITCH: модульные кэши в памяти пусты после смены владельца A -> B (statsCache, activity365, today_tasks, streak_day_signal, dialog voice attempts, medals)');
});
