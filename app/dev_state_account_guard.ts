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
export function checkDisposableGuestNow(readUser: () => GuardUser = readCurrentUser): GuestCheck {
  return classifyGuestUser(readUser());
}

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
