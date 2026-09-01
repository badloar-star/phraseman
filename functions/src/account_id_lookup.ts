import * as admin from 'firebase-admin';
import { ACCOUNT_ID_INDEX, ACCOUNT_ID_FIELD, accountIdIndexDocId } from './account_id';

/*
 * ОПОЗНАНИЕ ПО ОДНОМУ ИМЕНИ — этап 3 перестройки (владелец, 01.09.2026).
 *
 * зачем: сегодня сервер опознаёт человека ШЕСТЬЮ способами подряд — якорь
 * привязки, авторитетный поиск по провайдеру, запрошенный id, прямой документ,
 * общий поиск, фолбэк на сам uid. Каждая ступень — отдельный шанс промахнуться,
 * и именно из этих промахов рождаются «не могу войти» и пустые профили.
 *
 * Здесь одно чтение: любой из старых идентификаторов → account_id → аккаунт.
 * Таблица соответствия заполнена этапом 2 (8747 записей, 4703 из 4703 аккаунтов).
 *
 * ВСТРАИВАЕТСЯ ПЕРВОЙ СТУПЕНЬЮ, а не заменяет лестницу. Не нашли — работает всё
 * как раньше. Поэтому переход обратим и ничего не ломает: худшее, что может
 * случиться, — мы вернёмся к нынешнему поведению.
 *
 * Firebase-экономия: одно чтение по известному id вместо запроса-поиска. Это
 * ДЕШЕВЛЕ нынешнего пути, где findStableUidForProviderAuth делает два запроса
 * с limit(20) каждый.
 */

/** Что нашлось по старому имени. */
export type AccountLookupHit = Readonly<{
  /** Новое имя аккаунта. */
  accountId: string;
  /** Текущий stable_id — пока именно он остаётся рабочим ключом документов. */
  stableId: string;
  /** По какому именно псевдониму опознали (для журнала). */
  matchedAlias: string;
  /** Откуда взялся псевдоним: stable/auth/provider/merged_stable. */
  matchedKind: string;
}>;

/**
 * Опознаёт человека по ЛЮБОМУ его старому имени.
 *
 * Возвращает null, если имя неизвестно, — вызывающая сторона обязана
 * продолжить прежним путём. Ошибки чтения тоже дают null: новая ступень не
 * имеет права ронять вход, который до неё работал.
 */
export async function findAccountByAlias(
  db: admin.firestore.Firestore,
  alias: string,
): Promise<AccountLookupHit | null> {
  const clean = String(alias ?? '').trim();
  if (!clean || clean.length > 180) return null;

  let snap: admin.firestore.DocumentSnapshot;
  try {
    snap = await db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(clean)).get();
  } catch (e) {
    // зачем не глотаем молча (правило проекта): новая ступень отключилась, и
    // это обязано быть видно — иначе она «работает» лишь на бумаге.
    console.warn(JSON.stringify({
      event: 'account_id_lookup_unavailable',
      aliasLength: clean.length,
      message: String((e as { message?: unknown })?.message ?? e).slice(0, 160),
    }));
    return null;
  }

  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const accountId = String(data.accountId ?? '').trim();
  const stableId = String(data.stableId ?? '').trim();
  if (!accountId || !stableId) {
    // Половинчатая запись индекса опаснее её отсутствия: по ней нельзя открыть аккаунт,
    // но можно принять решение. Считаем её отсутствующей и говорим об этом.
    console.warn(JSON.stringify({
      event: 'account_id_index_incomplete',
      hasAccountId: Boolean(accountId),
      hasStableId: Boolean(stableId),
    }));
    return null;
  }

  return {
    accountId,
    stableId,
    matchedAlias: clean,
    matchedKind: String(data.kind ?? 'unknown'),
  };
}

/**
 * Проверяет, что найденный аккаунт действительно жив и принадлежит этому имени.
 *
 * зачем отдельной проверкой: индекс — карта, а не источник правды. Аккаунт мог
 * быть слит или скрыт уже после заполнения таблицы, и вести человека по
 * устаревшей записи нельзя — ровно так и появляются «пустые профили».
 */
export async function verifyAccountHit(
  db: admin.firestore.Firestore,
  hit: AccountLookupHit,
): Promise<boolean> {
  let snap: admin.firestore.DocumentSnapshot;
  try {
    snap = await db.collection('users').doc(hit.stableId).get();
  } catch (e) {
    console.warn(JSON.stringify({
      event: 'account_id_lookup_verify_failed',
      message: String((e as { message?: unknown })?.message ?? e).slice(0, 160),
    }));
    return false;
  }
  if (!snap.exists) return false;
  const data = snap.data() ?? {};
  if (data.identityHidden === true) return false;
  // Имя в документе обязано совпасть с именем в индексе: расхождение означает,
  // что карта устарела, и доверять ей нельзя.
  return String(data[ACCOUNT_ID_FIELD] ?? '').trim() === hit.accountId;
}
