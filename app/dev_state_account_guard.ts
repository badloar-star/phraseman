/**
 * Защита dev-фикстур Карточек: писать в ключи карточек/наборов можно ТОЛЬКО на анонимном госте.
 *
 * зачем (координатор 12.10, вопрос безопасности): ключи сохранённых/своих карточек и своих наборов входят в облачную синхронизацию
 * (app/cloud_sync.ts) и в Account V2 «card_snapshot» (hooks/use-flashcards.ts → produceAccountsV2ChangeIfEnabled, флаг в Пульте).
 * Фикстура cards=empty или cards=demo на настоящем тестовом аккаунте (№2/№3) могла бы затереть его облачные карточки, а публикации
 * наборов — записи в модерации. Проверка — fail-closed: если вход определить не удалось, считаем аккаунт настоящим и отказываем.
 * Лог: [DEV-STATE] guard.
 */
import { markDevFixtureNoUpload } from './dev_fixture_upload_guard';

export type GuardUser = Readonly<{ isAnonymous?: boolean; uid?: string; providerData?: readonly unknown[] }> | null | undefined;

export type GuestCheck = Readonly<{ ok: true; uid: string }> | Readonly<{ ok: false; reason: string }>;

/** Чистая проверка (юнит-тестируема): анонимный пользователь без привязанных провайдеров = одноразовый гость. */
export function classifyGuestUser(user: GuardUser): GuestCheck {
  if (!user) return { ok: false, reason: 'no_auth_user' };
  if (user.isAnonymous !== true) return { ok: false, reason: 'not_anonymous' };
  const providers = Array.isArray(user.providerData) ? user.providerData.length : 0;
  if (providers > 0) return { ok: false, reason: `linked_providers_${providers}` };
  return { ok: true, uid: String(user.uid ?? '') };
}

function readCurrentUser(): GuardUser {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default();
    return auth?.currentUser ?? null;
  } catch (error) {
    console.warn('[DEV-STATE] guard: Firebase Auth не прочитан, считаю аккаунт настоящим:', error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа fail-closed
    return null;
  }
}

/**
 * Та же проверка БЕЗ побочных эффектов (без пометки «не выгружать»): для `dev_state?guest=required` — ссылка съёмки отказывает
 * целиком на настоящем аккаунте. `readUser` подменяется в тестах.
 */
export function checkDisposableGuestNow(readUser: () => GuardUser = readCurrentUser): GuestCheckWithTrace {
  const user = readUser();
  // зачем (координатор 12.10): лог отказа показывает, ЧТО решило — маска uid и само значение isAnonymous, а не голое «нет».
  const uid = user?.uid ? String(user.uid) : '';
  const uidMasked = uid ? `${uid.slice(0, 4)}…(${uid.length})` : 'none';
  const isAnonymous = user ? (typeof user.isAnonymous === 'boolean' ? user.isAnonymous : null) : null;
  return { ...classifyGuestUser(user), uidMasked, isAnonymous };
}

/** Итог проверки + трасса для лога: маска uid (первые 4 знака и длина) и значение isAnonymous (null — нет пользователя/поля). */
export type GuestCheckWithTrace = GuestCheck & Readonly<{ uidMasked: string; isAnonymous: boolean | null }>;

/**
 * Бросает, если текущий аккаунт — не одноразовый гость. Вызывать ПЕРЕД первой записью фикстуры.
 * `readUser` подменяется в тестах.
 */
export function assertDisposableGuest(what: string, readUser: () => GuardUser = readCurrentUser): void {
  const verdict = classifyGuestUser(readUser());
  if (verdict.ok === false) {
    console.warn(`[DEV-STATE] ${what} refused: real account (${verdict.reason}) — фикстура пишет синхронизируемые карточки/наборы, на настоящем аккаунте запрещено; нужен анонимный гость (pm clear)`); // guard-ok: причина отказа
    throw new Error(`dev_state: ${what} refused: not a disposable guest (${verdict.reason})`);
  }
  console.log(`[DEV-STATE] ${what}: guard ok — анонимный гость ${verdict.uid.slice(0, 6)}…`); // guard-ok: единичный лог на ссылку
  // зачем (координатор 12.10, Ядро): с этого момента карточки/наборы этого гостя не выгружаются в облако (мусор в проде).
  markDevFixtureNoUpload(verdict.uid, what);
}

/** Пользователь Firebase Auth для проверки аккаунта №3 (поля профиля, без хранения почты/uid в коде). */
export type SupportGuardUser = Readonly<{
  isAnonymous?: boolean;
  email?: string | null;
  displayName?: string | null;
  providerData?: readonly unknown[];
}> | null | undefined;

export type SupportAccountCheck = Readonly<{ ok: boolean; reason: string; emailMasked: string; providers: string }>;

// зачем (координатор 12.10, п.A): настоящий «Выйти» роботом — ТОЛЬКО на аккаунте №3 «Phraseman Support» (№1 никогда, №2 не трогаем).
// Опознание по имени профиля Google, почта и uid в коде не хранятся; ошибка опознания = отказ (безопасная сторона).
const SUPPORT_ACCOUNT_DISPLAY_NAME = 'phraseman support';

/** Маска почты для журнала: первые 3 знака, домен и длина — без полного адреса. */
export function maskEmailForLog(email: string | null | undefined): string {
  if (!email) return 'none';
  const at = email.indexOf('@');
  if (at <= 0) return `?(${email.length})`;
  return `${email.slice(0, Math.min(3, at))}…@${email.slice(at + 1)}(${email.length})`;
}

/** Чистая проверка (юнит-тестируема): Google-аккаунт с именем профиля «Phraseman Support». */
export function classifySupportAccount(user: SupportGuardUser): SupportAccountCheck {
  const emailMasked = maskEmailForLog(user?.email ?? null);
  const providerIds = (Array.isArray(user?.providerData) ? user!.providerData : [])
    .map((p) => String((p as { providerId?: unknown } | null)?.providerId ?? '?'));
  const providers = providerIds.join(',') || 'none';
  if (!user) return { ok: false, reason: 'no_auth_user', emailMasked, providers };
  if (user.isAnonymous === true) return { ok: false, reason: 'anonymous', emailMasked, providers };
  if (!providerIds.includes('google.com')) return { ok: false, reason: 'not_google', emailMasked, providers };
  const name = String(user.displayName ?? '').trim().toLowerCase();
  if (name !== SUPPORT_ACCOUNT_DISPLAY_NAME) return { ok: false, reason: 'display_name_mismatch', emailMasked, providers };
  return { ok: true, reason: 'support_account', emailMasked, providers };
}

/** Проверка текущего пользователя без побочных эффектов (для `dev_state?account=support_only`). */
export function checkSupportAccountNow(readUser: () => SupportGuardUser = readCurrentUser as () => SupportGuardUser): SupportAccountCheck {
  return classifySupportAccount(readUser());
}
