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
import { accountOwnedStorageKeysFrom, SIGNOUT_DEVICE_KEEP_KEYS, wipeLocalAccountData } from '../app/cloud_sync';
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
  // флаги *_seen_* живут намеренно (ответ Ядра 15.10: иначе A при повторном входе увидит поздравление снова) — см. DEVICE_OR_OPEN_QUESTION; стираются только *_pending*
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
  'premium_celebration_seen_v1', // флаги «поздравление уже показано» живут намеренно
  'premium_celebration_admin_seen_v1',
  'vip_celebration_seen_v1',
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

  // зачем (координатор 18.10 03:08, решение Ядра 15.10; R132): «разрешено выжить» превращено в «ОБЯЗАН выжить» для выхода.
  it('выход/смена (mode signout): онбординг, согласия и языки устройства остаются с прежними значениями', async () => {
    for (const key of SIGNOUT_DEVICE_KEEP_KEYS) await AsyncStorage.setItem(key, `device:${key}`);
    for (const key of ACCOUNT_A_KEYS_FROM_AUDIT) await AsyncStorage.setItem(key, 'a');

    await wipeLocalAccountData(undefined, { mode: 'signout' });

    const kept = await AsyncStorage.multiGet([...SIGNOUT_DEVICE_KEEP_KEYS]);
    expect(kept).toEqual(SIGNOUT_DEVICE_KEEP_KEYS.map((key) => [key, `device:${key}`]));
    const left = await AsyncStorage.getAllKeys();
    expect(ACCOUNT_A_KEYS_FROM_AUDIT.filter((key) => left.includes(key))).toEqual([]);
    expect(logSpy.mock.calls.some((call) => String(call[0]) === '[ACCOUNT-WIPE]' && String(call[1]).includes('"mode":"signout"')
      && String(call[1]).includes('onboarding_done'))).toBe(true);
  });

  it('полное стирание (удаление, вход со сменой): ключи аккаунта из этого набора исчезают, онбординг удаления сбрасывается явно', async () => {
    const accountOwned = new Set(accountOwnedStorageKeysFrom([]));
    const accountKeysInSet = SIGNOUT_DEVICE_KEEP_KEYS.filter((key) => accountOwned.has(key));
    expect(accountKeysInSet).toEqual(expect.arrayContaining(['onboarding_done', 'app_lang']));
    for (const key of accountKeysInSet) await AsyncStorage.setItem(key, 'a');

    await wipeLocalAccountData();

    const left = await AsyncStorage.getAllKeys();
    expect(accountKeysInSet.filter((key) => left.includes(key))).toEqual([]);
    // удаление аккаунта сбрасывает онбординг своим списком (account_deleted_notice) — не через режим выхода
    expect(ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE).toEqual(expect.arrayContaining(['onboarding_done', 'onboarding_step', 'onboarding_flow_version_v1']));
  });

  // имена согласованы с Ядром 15.10 (app/account_owner_change.ts: onAccountOwnerChanged поверх subscribeAccountGeneration; сброс только при смене непустого stableId A -> B / null):
  // наполнить как A -> beginAccountGeneration('stable-b') -> getStatsCache() = DEFAULT, peekActivity365Analytics() = промах, peekTodayTasks() = null,
  // peekStreakDayState() = null, peekDialogVoiceAttempts() = 0, medals через invalidateMedalsCache(); streakTouchedDayKey/SweptDayKey — поведением (touchStreakForToday снова засчитывает день).
  // achievementCountPeek / recentAchievementIdsPeek / diagnostic_test_state.peekByTarget — имена пришлёт Ядро.
  it.todo('ждёт патча Ядра ACC-SWITCH: модульные кэши в памяти пусты после смены владельца A -> B (statsCache, activity365, today_tasks, streak_day_signal, dialog voice attempts, medals)');
});
