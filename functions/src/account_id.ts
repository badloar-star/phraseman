import { createHash, randomUUID } from 'crypto';

/*
 * ОДНО ИМЯ АККАУНТА — этап 2 перестройки идентичности (владелец, 01.09.2026).
 *
 * зачем: сегодня одного человека описывают ДЕВЯТЬ имён — authUid, stableId,
 * stableUid, firebaseAuthUid, providerUid, canonicalStableId, anchorStableId,
 * stable_id, linkedAuth.providerUid. Девять имён дают десятки пар, и каждая
 * пара — место, где они могут разойтись. Разошлись → человек не может войти.
 * Мы чиним поштучно, поэтому и не кончается: лечим симптомы структуры.
 *
 * КЛЮЧЕВОЕ ОТЛИЧИЕ ОТ stable_id: имя выдаёт СЕРВЕР и оно не живёт на телефоне.
 * Нынешний stable_id рождается в Keychain и потом всю жизнь «знакомится» с
 * серверным authUid — отсюда слияния, якоря, канонические указатели и вечные
 * карантины. У больших приложений этого шва просто нет.
 *
 * ЧТО ЭТО НЕ ДЕЛАЕТ СЕЙЧАС: не заменяет stable_id и ничего не ломает. На этом
 * этапе account_id только ВЫДАЁТСЯ и записывается рядом, а все старые имена
 * продолжают работать. Переключение чтения — следующий этап, и оно обратимо.
 */

/** Коллекция соответствия: любое старое имя → account_id. */
export const ACCOUNT_ID_INDEX = 'account_id_index';

/** Поле в users, где живёт новое имя. */
export const ACCOUNT_ID_FIELD = 'accountId';

/**
 * Префикс намеренно короткий и узнаваемый: по нему в логах и в базе сразу
 * видно, что это новое имя, а не один из восьми старых.
 */
const ACCOUNT_ID_PREFIX = 'acc_';

/** Длина случайной части. 32 hex-символа = 128 бит, коллизия невозможна. */
const ACCOUNT_ID_RANDOM_LEN = 32;

export type AccountIdAlias = Readonly<{
  /** Само старое имя: stable_id, firebaseAuthUid или providerUid. */
  alias: string;
  /** Откуда оно взялось — нужно для разбора инцидентов. */
  kind: 'stable' | 'auth' | 'provider' | 'merged_stable';
}>;

/**
 * Новое имя аккаунта.
 *
 * Не выводится ни из чего существующего НАМЕРЕННО: имя, посчитанное из старого
 * (например, хеш от stable_id), унаследовало бы и его проблемы — при смене
 * источника поменялось бы и «постоянное» имя. Случайность здесь и есть
 * гарантия постоянства.
 */
export function newAccountId(): string {
  return `${ACCOUNT_ID_PREFIX}${randomUUID().replace(/-/g, '')}`.slice(
    0,
    ACCOUNT_ID_PREFIX.length + ACCOUNT_ID_RANDOM_LEN,
  );
}

/** Похоже ли значение на новое имя (для проверок и миграции). */
export function isAccountId(value: unknown): boolean {
  const s = String(value ?? '');
  return new RegExp(`^${ACCOUNT_ID_PREFIX}[0-9a-f]{${ACCOUNT_ID_RANDOM_LEN}}$`).test(s);
}

/**
 * Id документа в таблице соответствия.
 *
 * Старые имена приходят из трёх источников с разными правилами (UUID, uid
 * Firebase до 128 символов, провайдерские идентификаторы), поэтому кладём их
 * по ХЕШУ: так исключены и запрещённые символы, и зарезервированные Firestore
 * идентификаторы вида `__x__`, на которых мы уже обжигались 29.08.
 */
export function accountIdIndexDocId(alias: string): string {
  return `alias_${createHash('sha256').update(String(alias)).digest('hex')}`;
}

/** Нормализует и отсеивает мусор до записи в индекс. */
export function cleanAliases(raw: readonly AccountIdAlias[]): AccountIdAlias[] {
  const seen = new Set<string>();
  const out: AccountIdAlias[] = [];
  for (const item of raw) {
    const alias = String(item?.alias ?? '').trim();
    // Пустое, слишком длинное или зарезервированное имя в индекс не попадает:
    // такой документ либо не создастся, либо станет ловушкой на годы.
    if (!alias || alias.length > 180) continue;
    if (/^__.*__$/.test(alias)) continue;
    if (seen.has(alias)) continue;
    seen.add(alias);
    out.push({ alias, kind: item.kind });
  }
  return out;
}
