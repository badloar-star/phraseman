/*
 * Account Authority 2.0, этап S3: ЕДИНСТВЕННЫЙ список коллекций AA.
 *
 * зачем (S3, пункты 2–5): удаление аккаунта, правила Firestore и TTL обязаны
 * знать ВСЕ коллекции AA. Раньше имена жили константами в трёх файлах, и
 * новая коллекция могла пережить удаление незамеченной. Сторож
 * `s3_delete_rules_ttl.test.ts` сверяет этот список с исходниками, правилами
 * (deny-all для клиента) и TTL-политиками в firestore.indexes.json.
 */

/** Аренда аккаунта (документ = accountId); после удаления — надгробие. */
export const AA_ACCOUNTS_COLLECTION = 'account_authority_accounts_v1';
/**
 * Подколлекция аренды: отметки погашенных сессий. зачем (S3 раунд 2, H-S3-1):
 * TTL Firestore задаётся на ГРУППУ коллекций по имени; прежнее общее имя
 * `retired_sessions` задело бы любую чужую одноимённую подколлекцию. Данных
 * под старым именем нет (rollout выключен), поэтому имя уникальное.
 */
export const AA_RETIRED_SESSIONS_SUBCOLLECTION = 'account_authority_retired_sessions_v1';
/** Принципал uid → accountId (ключ — хеш субъекта аренды). Без TTL (§AA-9 (2)). */
export const AA_PRINCIPALS_COLLECTION = 'account_authority_principals_v1';
export const AA_INSTALLATION_BINDINGS_COLLECTION = 'account_authority_installation_bindings_v1';
export const AA_INSTALLATION_BINDING_TOKENS_COLLECTION = 'account_authority_installation_binding_tokens_v1';
export const AA_INSTALLATION_BINDING_QUOTA_COLLECTION = 'account_authority_installation_binding_quota_v1';
/** S3: состояние удаления аккаунта AA (документ = accountId). */
export const AA_DELETE_JOBS_COLLECTION = 'account_authority_delete_jobs_v1';

/** Все корневые коллекции AA — только Admin SDK, клиенту deny-all. */
export const AA_ROOT_COLLECTIONS: readonly string[] = Object.freeze([
  AA_ACCOUNTS_COLLECTION,
  AA_PRINCIPALS_COLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDING_QUOTA_COLLECTION,
  AA_DELETE_JOBS_COLLECTION,
]);

/**
 * Группы коллекций с TTL на `expireAt` (D-AA4, 90 дней от последнего
 * использования). S3 раунд 2 (H-S3-1): в firestore.indexes.json их НЕТ —
 * `npm run firestore:rules` деплоит и индексы, TTL включился бы без команды.
 * Включение — по docs/phraseman-2.0/deploy/account_authority_ttl.md.
 * Принципала и состояния удаления здесь НЕТ намеренно:
 * принципал — якорь личности (§AA-9 (2)), состояние удаления живёт по
 * контракту (квитанция 90 дней → `expired` через sweep, не TTL).
 * У аренды удаляемого/удалённого аккаунта expireAt = null — TTL её не трогает.
 */
export const AA_TTL_COLLECTION_GROUPS: readonly string[] = Object.freeze([
  AA_ACCOUNTS_COLLECTION,
  AA_RETIRED_SESSIONS_SUBCOLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDING_QUOTA_COLLECTION,
]);

export const AA_TTL_FIELD = 'expireAt';

/** Единственный тенант проекта (S2a: привязка установки выдаёт только его). */
export const AA_PRIMARY_TENANT_ID = 'phraseman-primary';
