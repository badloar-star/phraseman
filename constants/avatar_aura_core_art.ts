/**
 * «Ядро» арта аур аватара — слои, которые всегда лежат в бандле.
 *
 * зачем: остальные 111 слоёв уехали в Firebase Storage (−2.4 МБ из бинаря,
 * Фаза 4 «Бандл-диеты», решение владельца 2026-08-24). Но ауры подписки
 * пользователь видит СРАЗУ после оплаты — в момент, когда сеть может отвалиться,
 * а показать пустое кольцо вместо только что оплаченной награды недопустимо.
 * Поэтому aura-plus и aura-pro никогда не зависят от сети.
 *
 * Правило отбора: ауры, привязанные к платному доступу. Ауры за уровни, сезон
 * и коллекции добываются постепенно и всегда через сетевое действие, поэтому
 * их слои успевают прогреться заранее (app/avatar_aura_art_prefetch.ts).
 *
 * Если добавляете сюда id — слои автоматически перестают заливаться в Storage
 * (scripts/upload_avatar_aura_images_to_storage.mjs читает этот файл).
 */
export const CORE_AVATAR_AURA_IDS = [
  'aura-plus',
  'aura-pro',
] as const;

export type CoreAvatarAuraId = (typeof CORE_AVATAR_AURA_IDS)[number];

const CORE_SET: ReadonlySet<string> = new Set(CORE_AVATAR_AURA_IDS);

/** true — все три слоя ауры лежат в бандле (мгновенно, офлайн). */
export function isCoreAvatarAuraArt(auraId: string): boolean {
  return CORE_SET.has(auraId);
}
