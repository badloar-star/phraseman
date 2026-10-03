import { createHash } from 'crypto';

/*
 * Account Authority 2.0, этап S2a: правила личности и хранения (сервер).
 *
 * Чистый модуль без firebase-admin: его импортирует и граница callable
 * (`callable_boundary.ts` обязана оставаться чистым контрактом), и адаптеры.
 *
 * зачем (пакет aa-s2-identity-security, пункты 1, 2, 5, 7):
 *   - анонимный вход не получает ни привязки установки, ни аренды аккаунта;
 *   - у одного uid не больше N активных привязок и не больше M новых в минуту;
 *   - sessionId от клиента принимается только в форме, которую выдаёт сервер;
 *   - сырой Firebase uid в записях AA заменён хешем, у записей есть срок жизни.
 *
 * Числа лимита и троттлинга — консервативный выбор исполнителя S2a
 * (5 активных привязок, 10 вызовов привязки в минуту на uid). Они записаны в
 * итог пакета как решение для подтверждения координатором.
 */

const DAY_MS = 24 * 60 * 60_000;

/** D-AA4: запись аренды/привязки живёт 90 дней после последнего использования. */
export const ACCOUNT_AUTHORITY_RECORD_TTL_MS = 90 * DAY_MS;

/**
 * Срок жизни продлевается не на каждом входе, а когда до конца осталось меньше
 * (TTL − 10 дней). зачем (Firebase-экономия): продление — это лишняя запись; так
 * запись привязки переписывается не чаще раза в 10 дней на установку.
 */
export const ACCOUNT_AUTHORITY_TTL_REFRESH_AFTER_MS = 10 * DAY_MS;

/** Пункт 2: не больше стольких активных привязок установки на один uid. */
export const INSTALLATION_BINDING_ACTIVE_LIMIT = 5;
/** Пункт 2: окно троттлинга вызовов привязки. */
export const INSTALLATION_BINDING_CREATE_WINDOW_MS = 60_000;
/** Пункт 2: не больше стольких вызовов привязки (создание или ротация) за окно на uid. */
export const INSTALLATION_BINDING_CREATE_MAX_PER_WINDOW = 10;

const STRICT_SESSION_ID = /^session-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Пункт 5: ровно `session-<uuid v4 в нижнем регистре>` — то, что выдаёт сервер. */
export function isStrictAccountSessionId(value: unknown): value is string {
  return typeof value === 'string' && STRICT_SESSION_ID.test(value);
}

export type SignInProviderVerdict = 'allowed' | 'anonymous' | 'provider_missing' | 'provider_not_allowed';

/**
 * Раунд 2, L1: явный список разрешённых видов входа. Взят из кода проекта:
 *   - `google.com`, `apple.com` — те же, что принимает восстановление
 *     (auth_recovery.ts, requireRecoverySession);
 *   - `custom` — ТОЛЬКО токен восстановления: auth_recovery.ts выпускает его
 *     через createCustomToken с claim `phrasemanRecovery: true` (единственный
 *     createCustomToken в functions/src).
 * `password` (вход эмулятора и дев-опроса) и всё прочее — отказ.
 */
const ALLOWED_SIGN_IN_PROVIDERS: ReadonlySet<string> = new Set(['google.com', 'apple.com']);
const RECOVERY_CUSTOM_PROVIDER = 'custom';
const RECOVERY_CLAIM = 'phrasemanRecovery';

/**
 * Пункт 1 и раунд 2 (L1): вид входа из проверенного Firebase ID-токена
 * (`token.firebase.sign_in_provider`). Нет поля или пустая строка — отказ (fail
 * closed): у настоящего токена Firebase оно есть всегда.
 */
export function classifySignInProvider(token: unknown): SignInProviderVerdict {
  if (typeof token !== 'object' || token === null) return 'provider_missing';
  const firebase = (token as Record<string, unknown>).firebase;
  if (typeof firebase !== 'object' || firebase === null) return 'provider_missing';
  const provider = (firebase as Record<string, unknown>).sign_in_provider;
  if (typeof provider !== 'string' || provider.length === 0) return 'provider_missing';
  if (provider === 'anonymous') return 'anonymous';
  if (ALLOWED_SIGN_IN_PROVIDERS.has(provider)) return 'allowed';
  if (provider === RECOVERY_CUSTOM_PROVIDER && (token as Record<string, unknown>)[RECOVERY_CLAIM] === true) {
    return 'allowed';
  }
  return 'provider_not_allowed';
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * Хеш uid для хранения. Та же формула, что у записи привязки установки
 * (`authUidHash`), чтобы все записи AA сопоставлялись одним значением.
 */
export function accountAuthorityAuthUidHash(firebaseAuthUid: string): string {
  return sha256(`account-authority-auth-uid.v1\u0000${firebaseAuthUid}`);
}

/**
 * Пункт 7: что кладётся в аренду и квитанции вместо сырого uid. Контракт аренды
 * сравнивает это поле только на равенство, поэтому хеша достаточно.
 */
export function accountAuthorityUidFingerprint(firebaseAuthUid: string): string {
  return accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(firebaseAuthUid));
}

/**
 * Раунд 2, M1: ЕДИНСТВЕННОЕ место, где хеш uid превращается в «субъект аренды»
 * (то, что хранится в аренде/квитанциях и сравнивается при входе, выходе и
 * удалении). Граница callable строит из него VerifiedAuthContext.firebaseAuthUid
 * для всех операций, адаптер — ключ принципала.
 */
export function accountAuthorityFingerprintFromAuthUidHash(authUidHash: string): string {
  return `uidh-${authUidHash}`;
}

/** D-AA4: момент истечения записи (мс), считая от момента использования. */
export function accountAuthorityExpireAtMs(nowMs: number): number {
  return nowMs + ACCOUNT_AUTHORITY_RECORD_TTL_MS;
}

/** Продлевать ли срок: записи нет срока, или до истечения осталось меньше TTL − 10 дней. */
export function shouldRefreshAccountAuthorityExpireAt(storedExpireAtMs: number | null, nowMs: number): boolean {
  if (storedExpireAtMs === null) return true;
  return storedExpireAtMs - nowMs < ACCOUNT_AUTHORITY_RECORD_TTL_MS - ACCOUNT_AUTHORITY_TTL_REFRESH_AFTER_MS;
}
