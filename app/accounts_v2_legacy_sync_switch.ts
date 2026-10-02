import { accountsV2OpenScopeUidIfLoaded, isAccountsV2ClientEnabled } from './accounts_v2_client_flag';
import { getRemoteBool } from './remote_flags';
import {
  customFlashcardsKey,
  flashcardsCommunityOwnedPacksKey,
  flashcardsSavedKey,
  flashcardsSwipeMemoryKey,
} from './target_storage_keys';

/*
 * Account V2, Пакет 7A (OD19) — выключатель старой синхронизации для доменов V2.
 *
 * зачем: после проверки на 3 аккаунтах (OD24) старая синхронизация карточек,
 * памяти свайпов и библиотеки наборов сообщества отключается — их ведёт V2.
 * Пока флаг `accounts_v2_legacy_sync_disabled` выключен (дефолт), функции ниже
 * возвращают ТОТ ЖЕ объект и ничего не делают: путь cloud_sync байт-в-байт
 * прежний (сторож tests/accounts_v2_legacy_sync_switch.test.ts).
 *
 * Пропуск включается, только если ВСЁ сразу (ремонт №1):
 *   1) флаг выключателя true;
 *   2) клиент V2 включён (accounts_v2_client_enabled);
 *   3) платформа реально открывает область V2 (Android / проба iPhone);
 *   4) метка гидрации V2 для ТЕКУЩЕГО uid (окончательный перенос);
 *   5) только для записи: область V2 открыта и принадлежит текущему uid.
 * Иначе (iOS без области, новая установка, перенос не окончателен, смена
 * аккаунта, сервер V2 выключен) — старая синхронизация работает как раньше:
 * данные никогда не остаются без обоих каналов сразу.
 *
 * НЕ трогаем (keep_in_place / OD8 / OD26): монеты, серия, экзамены, достижения,
 * Plus, профиль, купленные наборы, personal_sync_segments. Уроки (best/passed)
 * тоже НЕ выключаются здесь: их старый «писатель» — серверные события урока,
 * общие с открытием уроков и зачётами (keep_in_place), а ключи уроков клиент в
 * облако и так не пишет (isServerOwnedProgressKey) — выключать на клиенте нечего.
 * Все решения — синхронные чтения из памяти, без сети и хранилища.
 */

export const ACCOUNTS_V2_LEGACY_SYNC_DISABLED_FLAG = 'accounts_v2_legacy_sync_disabled' as const;

/**
 * Ремонт №2: ключ метки гидрации — копия константы из
 * modules/account-session-v2/accounts_v2_legacy_marker.ts (равенство сторожит
 * tests/accounts_v2_legacy_sync_switch.test.ts). зачем копия: этот файл и cloud_sync
 * грузятся на старте и не импортируют account-session-v2 статически (сторож 6B).
 */
export const ACCOUNTS_V2_LEGACY_HYDRATED_MARKER_KEY = 'accounts_v2_legacy_hydrated_v1';

export type AccountsV2LegacyDomain = 'saved_cards' | 'custom_cards' | 'swipe_memory' | 'community_library';
export type AccountsV2LegacyPhase = 'write' | 'restore';

/**
 * Ключи старого облака (progress.* и подколлекция flashcard_pages), которые
 * ведёт V2. EN-ключи — «голые» (как в SYNC_KEYS), FR — с областью языка.
 * `flashcards` — старый псевдоним сохранённых карточек (restore-фолбэк).
 */
export const ACCOUNTS_V2_LEGACY_DOMAIN_KEYS: Readonly<Record<string, AccountsV2LegacyDomain>> = Object.freeze({
  flashcards: 'saved_cards',
  [flashcardsSavedKey('en')]: 'saved_cards',
  [flashcardsSavedKey('fr')]: 'saved_cards',
  [customFlashcardsKey('en')]: 'custom_cards',
  [customFlashcardsKey('fr')]: 'custom_cards',
  [flashcardsSwipeMemoryKey('en')]: 'swipe_memory',
  [flashcardsSwipeMemoryKey('fr')]: 'swipe_memory',
  [flashcardsCommunityOwnedPacksKey('en')]: 'community_library',
  [flashcardsCommunityOwnedPacksKey('fr')]: 'community_library',
});

export function isAccountsV2LegacyDomainKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(ACCOUNTS_V2_LEGACY_DOMAIN_KEYS, key);
}

export type AccountsV2LegacyDecisionInput = Readonly<{
  phase: AccountsV2LegacyPhase;
  flagOn: boolean;
  clientEnabled: boolean;
  /** Платформа реально открывает область V2 (Android / сборка пробы iPhone). */
  platformSupported: boolean;
  /** uid из метки гидрации V2 (окончательный перенос) или null. */
  hydratedUid: string | null;
  /** uid открытой области V2 (важно только для записи). */
  openScopeUid: string | null;
  authUid: string | null;
}>;

/**
 * Чистое решение (для сторожа): пропускать ли старые писатели/читатели V2-доменов.
 *
 * зачем (ремонт №1, выбран самый безопасный вариант): restore на холодном старте идёт
 * ДО открытия области, поэтому от открытости области он не зависит — он зависит от
 * МЕТКИ гидрации этого uid (V2 уже получила всё старое облако при окончательном
 * переносе). Нет метки (новая установка, перенос hold / not_found_yet, сбой сети) или
 * платформа без области (iOS вне пробы) → старый restore: человек не остаётся с пустыми
 * карточками. Запись ещё строже: метка + открытая область того же uid — иначе пишем
 * по-старому (дубль дешевле потери).
 */
export function decideAccountsV2LegacySkip(input: AccountsV2LegacyDecisionInput): Readonly<{ skip: boolean; reason: string }> {
  if (!input.flagOn) return { skip: false, reason: 'flag_off' };
  if (!input.clientEnabled) return { skip: false, reason: 'client_off' };
  if (!input.platformSupported) return { skip: false, reason: 'platform_unsupported' };
  if (input.authUid === null) return { skip: false, reason: 'no_auth_uid' };
  if (input.hydratedUid !== input.authUid) return { skip: false, reason: 'not_hydrated' };
  if (input.phase === 'write') {
    if (input.openScopeUid === null) return { skip: false, reason: 'scope_closed' };
    if (input.openScopeUid !== input.authUid) return { skip: false, reason: 'scope_other_uid' };
  }
  return { skip: true, reason: 'v2_owns_domains' };
}

/**
 * Синхронный вход: включён ли выключатель. false — дальше ничего не читается (ни
 * await, ни require, ни логов): путь cloud_sync байт-в-байт прежний.
 */
export function isAccountsV2LegacySwitchFlagOn(): boolean {
  try {
    return getRemoteBool(ACCOUNTS_V2_LEGACY_SYNC_DISABLED_FLAG) === true;
  } catch (error) {
    console.warn(`[ACCOUNT-V2] legacy_skip flag_read_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return false;
  }
}

/** uid метки гидрации (ленивый require: модуль V2 не попадает в старт при выключенном флаге). */
async function readHydratedUid(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const marker = require('../modules/account-session-v2/accounts_v2_legacy_marker') as
    typeof import('../modules/account-session-v2/accounts_v2_legacy_marker');
  return marker.readAccountsV2LegacyHydratedUid();
}

/** Платформа открывает область V2 — та же проверка, что и хранилище (ленивый require, без нативных модулей). */
function platformSupportsAccountsV2(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const env = require('../modules/account-session-v2/native/account_native_expo_environment') as
    typeof import('../modules/account-session-v2/native/account_native_expo_environment');
  return env.isAccountV2NativePlatformSupported();
}

/**
 * Полное решение (вызывать только при isAccountsV2LegacySwitchFlagOn()). Любой сбой —
 * старый путь. authUid — uid Firebase (не stableId старого облака).
 */
export async function resolveAccountsV2LegacySkip(phase: AccountsV2LegacyPhase, authUid: string | null): Promise<boolean> {
  try {
    const clientEnabled = isAccountsV2ClientEnabled();
    const platformSupported = clientEnabled && platformSupportsAccountsV2();
    const hydratedUid = platformSupported && authUid !== null ? await readHydratedUid() : null;
    const openScopeUid = phase === 'write' ? accountsV2OpenScopeUidIfLoaded() : null;
    const decision = decideAccountsV2LegacySkip({
      phase, flagOn: true, clientEnabled, platformSupported, hydratedUid, openScopeUid, authUid,
    });
    const hydrated = authUid !== null && hydratedUid === authUid;
    const scope = phase === 'write' ? ` scopeOpen=${openScopeUid !== null && openScopeUid === authUid}` : '';
    console.log(`[ACCOUNT-V2] legacy_${phase}_decision skip=${decision.skip} reason=${decision.reason} flag=true `
      + `client=${clientEnabled} platformSupported=${platformSupported} hydrated=${hydrated}${scope}`);
    return decision.skip;
  } catch (error) {
    // зачем: любой сбой решения = старый путь (данные не остаются без канала).
    console.warn(`[ACCOUNT-V2] legacy_${phase}_decision skip=false reason=decision_failed kind=${error instanceof Error ? error.name : typeof error}`);
    return false;
  }
}

/**
 * Копия `data` без ключей V2-доменов (если активно) с логом по доменам.
 * Неактивно — возвращается ТОТ ЖЕ объект (без копии и без логов).
 */
export function omitAccountsV2LegacyDomains<T>(
  data: Record<string, T>,
  phase: AccountsV2LegacyPhase,
  active: boolean,
): Record<string, T> {
  if (!active) return data;
  const out: Record<string, T> = {};
  const skipped = new Map<AccountsV2LegacyDomain, number>();
  for (const [key, value] of Object.entries(data)) {
    const domain = isAccountsV2LegacyDomainKey(key) ? ACCOUNTS_V2_LEGACY_DOMAIN_KEYS[key] : null;
    if (domain === null) {
      out[key] = value;
      continue;
    }
    skipped.set(domain, (skipped.get(domain) ?? 0) + 1);
  }
  for (const [domain, count] of skipped) {
    console.log(`[ACCOUNT-V2] legacy_skip domain=${domain} phase=${phase} keys=${count}`);
  }
  return out;
}

/**
 * Пакет 8H (TG-5F6CFA464B29) — диагностика старой синхронизации V2-доменов (правило владельца
 * «сперва логи»). E2E 2026-10-02, сценарий I: после выключения выключателя старое облако
 * держало удалённую карточку. Лог на каждом решении по V2-ключу: ушёл ли ключ в запись,
 * есть ли он в снимке последней синхронизации и совпадает ли со снимком. Без uid и значений —
 * только имя ключа (имена ключей не персональные), длина значения и признаки.
 */
export function logAccountsV2LegacySyncKeys(
  stored: Readonly<Record<string, string | null>>,
  sent: Readonly<Record<string, unknown>>,
  previousSnapshot: Readonly<Record<string, string | null>>,
  matches: (previous: string | null | undefined, value: string) => boolean,
): void {
  for (const key of Object.keys(stored).sort()) {
    if (!isAccountsV2LegacyDomainKey(key)) continue;
    const value = stored[key];
    if (value === null || value === undefined) continue;
    const inSnapshot = Object.prototype.hasOwnProperty.call(previousSnapshot, key);
    console.log(`[LEGACY-V2-SYNC] sync key=${key} decision=${Object.prototype.hasOwnProperty.call(sent, key) ? 'write' : 'skip'} `
      + `local_len=${value.length} snapshot=${inSnapshot ? 'has' : 'none'} equal=${inSnapshot && matches(previousSnapshot[key], value)}`);
  }
}

/* expo-router route shim: utility module discovered as a route */
export default function __RouteShim() { return null; }
