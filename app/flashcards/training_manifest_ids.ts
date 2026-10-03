/**
 * зачем (дыра в экономике, 03.10): с 14.09 prepareFlashcardTrainingPendingGrant принимает только
 * КОМПАКТНЫЙ manifest (id по ID_RE, без текстов карточек). Блиц/«Вспомни»/«Устно» слали полные
 * объекты → invalid_input → fail-open → энергия и месячный лимит не списывались. Сырой card.id
 * может не пройти ID_RE (пробелы, кириллица), поэтому в manifest кладём устойчивый ОТПЕЧАТОК id.
 * Восстановление идёт из уже загруженного пула по отпечаткам; несовпадение — явная ошибка
 * `pending_grant_*`, которую экран уводит в существующий fail-open (решение владельца 14.09).
 *
 * Чистый модуль: без React, без хранилища, без сети — легко тестируется.
 */

/** Тот же шаблон, что ID_RE в app/flashcard_training_pending_grant.ts (валидатор НЕ ослаблялся). */
const MANIFEST_ID_RE = /^[A-Za-z0-9_.:@/-]{1,180}$/;

export const MANIFEST_ID_COLLISION_ERROR = 'pending_grant_manifest_id_collision';
export const MANIFEST_CARDS_UNAVAILABLE_ERROR = 'pending_grant_manifest_cards_unavailable';

/** Две независимые 32-битные FNV-подобные «дорожки» → 64 бита. Без зависимостей. */
function hash64Hex(value: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 0x01000193);
    hashB = Math.imul(hashB ^ code, 0x85ebca6b);
    hashB ^= hashB >>> 13;
  }
  return `${(hashA >>> 0).toString(16).padStart(8, '0')}${(hashB >>> 0).toString(16).padStart(8, '0')}`;
}

/** Детерминированный отпечаток id карточки: `fc_` + 16 hex. Всегда проходит ID_RE. */
export function cardManifestId(rawId: string): string {
  return `fc_${hash64Hex(String(rawId))}`;
}

/** seed в manifest обязан быть ID_RE-строкой: годный id остаётся как есть, прочее — отпечаток. */
export function manifestSeed(raw: string): string {
  const value = String(raw ?? '');
  return MANIFEST_ID_RE.test(value) ? value : `sd_${hash64Hex(value)}`;
}

export type ManifestCardIndex<T> = Readonly<{
  /** отпечаток → карточка (для восстановления). */
  byFingerprint: ReadonlyMap<string, T>;
  /** карточка → отпечаток по сырому id. */
  fingerprintOf: (card: T) => string;
}>;

/**
 * Индекс пула. Один и тот же сырой id дважды — это одна карточка (берём первую);
 * РАЗНЫЕ сырые id с одним отпечатком — коллизия: бросаем ошибку (экран уйдёт в fail-open с логом).
 */
export function buildManifestCardIndex<T extends { id: string }>(
  cards: readonly T[],
  // зачем: подмена отпечатка нужна ТОЛЬКО тесту коллизий (настоящую 64-битную коллизию не найти).
  fingerprintFn: (rawId: string) => string = cardManifestId,
): ManifestCardIndex<T> {
  const byFingerprint = new Map<string, T>();
  for (const card of cards) {
    const fingerprint = fingerprintFn(card.id);
    const existing = byFingerprint.get(fingerprint);
    if (existing && existing.id !== card.id) {
      console.warn('[FC-PENDING-GRANT] manifest:id_collision', JSON.stringify({ fingerprint }));
      throw new Error(MANIFEST_ID_COLLISION_ERROR);
    }
    if (!existing) byFingerprint.set(fingerprint, card);
  }
  return Object.freeze({
    byFingerprint,
    fingerprintOf: (card: T) => fingerprintFn(card.id),
  });
}

/** Карточки → список отпечатков в том же порядке. */
export function toManifestIds<T extends { id: string }>(cards: readonly T[]): string[] {
  return cards.map((card) => cardManifestId(card.id));
}

/**
 * Отпечатки → карточки из текущего пула. Любой неизвестный отпечаток — явная ошибка,
 * а не тихая потеря карточки (иначе раунд стартовал бы с другим составом, чем оплачен).
 */
export function restoreManifestCards<T>(
  ids: unknown,
  index: ManifestCardIndex<T>,
): T[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    console.warn('[FC-PENDING-GRANT] manifest:restore_bad_ids', JSON.stringify({ isArray: Array.isArray(ids) }));
    throw new Error(MANIFEST_CARDS_UNAVAILABLE_ERROR);
  }
  const restored: T[] = [];
  let missing = 0;
  for (const id of ids) {
    const card = typeof id === 'string' ? index.byFingerprint.get(id) : undefined;
    if (card === undefined) missing += 1;
    else restored.push(card);
  }
  if (missing > 0) {
    console.warn('[FC-PENDING-GRANT] manifest:cards_unavailable', JSON.stringify({ requested: ids.length, missing, pool: index.byFingerprint.size }));
    throw new Error(MANIFEST_CARDS_UNAVAILABLE_ERROR);
  }
  return restored;
}
