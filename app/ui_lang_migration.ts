/**
 * R119 — язык интерфейса существующих установок при открытии английского.
 *
 * зачем (координатор 17.10, решение по a4679d16e, Ревизор 3.13): app_lang пишется только при ЯВНОМ выборе языка.
 * У существующей установки без выбора и с телефоном на языке, которого у нас нет (de, he, ka…), после обновления
 * интерфейс сменился бы сам с русского на английский (новое правило: незнакомый язык → en). Поэтому ОДИН раз при первом
 * запуске новой версии: app_lang пуст и установка не новая (пройден онбординг или есть прогресс) → записать в app_lang
 * язык прежнего правила (resolveLegacyBootstrapLocaleV1). Новые установки — по новому правилу, ничего не пишем.
 *
 * Журнал [UI-LANG-MIGRATE]: признаки существующей установки и их значения, язык телефона, оба правила, что записано, reason.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { coerceInterfaceLang, resolveBootstrapLocaleDecision, resolveLegacyBootstrapLocaleV1, type Lang } from '../constants/i18n';
import { persistPortablePreference } from './phone_state_preference_bridge';

const LOG = '[UI-LANG-MIGRATE]';
export const UI_LANG_MIGRATION_DONE_KEY = 'ui_lang_r119_migrated_v1';
/** Признаки «установка не новая»: пройденный онбординг (оба ключа) или накопленный прогресс. */
export const UI_LANG_EXISTING_INSTALL_KEYS = ['onboarding_done', 'onboarding_completed_at_ms_v1', 'streak_count', 'user_total_xp'] as const;

export type UiLangMigrationResult = Readonly<{
  lang: Lang | null;
  reason: 'already_done' | 'new_install' | 'existing_install_kept_legacy' | 'read_failed' | 'write_failed';
}>;

function deviceLocaleNow(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch (error) {
    console.warn(LOG, JSON.stringify({ step: 'device_locale_unreadable', reason: error instanceof Error ? error.message : String(error) }));
    return '';
  }
}

/** Признак существующей установки по значениям ключей (чистая функция — для тестов). */
export function isExistingInstallV1(values: Readonly<Record<string, string | null>>): boolean {
  const onboardingDone = values.onboarding_done === '1' || values.onboarding_done === 'true';
  const onboardingAt = Number(values.onboarding_completed_at_ms_v1) > 0;
  const streak = Number(values.streak_count) > 0;
  const xp = Number(values.user_total_xp) > 0;
  return onboardingDone || onboardingAt || streak || xp;
}

/**
 * Вызывать, только когда сохранённого app_lang нет (явного выбора не было). Возвращает язык, который записан
 * для существующей установки, или null — новая установка / уже сделано / сбой (тогда остаётся новое правило).
 */
export async function migrateUiLangForExistingInstallOnce(deviceLocale: string = deviceLocaleNow()): Promise<UiLangMigrationResult> {
  let pairs: readonly (readonly [string, string | null])[];
  try {
    pairs = await AsyncStorage.multiGet([UI_LANG_MIGRATION_DONE_KEY, ...UI_LANG_EXISTING_INSTALL_KEYS]);
  } catch (error) {
    console.warn(LOG, JSON.stringify({ step: 'read_failed', reason: error instanceof Error ? error.message : String(error) }));
    return { lang: null, reason: 'read_failed' };
  }
  const values = Object.fromEntries(pairs) as Record<string, string | null>;
  if (values[UI_LANG_MIGRATION_DONE_KEY]) {
    console.log(LOG, JSON.stringify({ step: 'skip', reason: 'already_done', doneValue: values[UI_LANG_MIGRATION_DONE_KEY] }));
    return { lang: null, reason: 'already_done' };
  }
  const existing = isExistingInstallV1(values);
  const legacy = resolveLegacyBootstrapLocaleV1(deviceLocale);
  const next = resolveBootstrapLocaleDecision(deviceLocale);
  const signals = Object.fromEntries(UI_LANG_EXISTING_INSTALL_KEYS.map((key) => [key, values[key] ?? null]));
  if (!existing) {
    console.log(LOG, JSON.stringify({ step: 'decide', reason: 'new_install', signals, device: deviceLocale, newRule: next, legacyRule: legacy, wrote: null }));
    await AsyncStorage.setItem(UI_LANG_MIGRATION_DONE_KEY, 'new_install').catch((error: unknown) => {
      console.warn(LOG, JSON.stringify({ step: 'done_flag_write_failed', reason: error instanceof Error ? error.message : String(error) }));
    });
    return { lang: null, reason: 'new_install' };
  }
  const lang = coerceInterfaceLang(legacy) ?? 'ru';
  try {
    await persistPortablePreference('app_lang', lang);
    await AsyncStorage.setItem(UI_LANG_MIGRATION_DONE_KEY, `kept:${lang}`);
  } catch (error) {
    console.warn(LOG, JSON.stringify({ step: 'write_failed', lang, reason: error instanceof Error ? error.message : String(error) }));
    return { lang: null, reason: 'write_failed' };
  }
  console.log(LOG, JSON.stringify({ step: 'decide', reason: 'existing_install_kept_legacy', signals, device: deviceLocale, newRule: next, legacyRule: legacy, wrote: lang, changedVsNewRule: lang !== next.lang }));
  return { lang, reason: 'existing_install_kept_legacy' };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
