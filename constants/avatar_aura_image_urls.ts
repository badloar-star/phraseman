/**
 * Публичные URL слоёв аур в Firebase Storage.
 *
 * зачем: 111 из 117 слоёв колец (2.4 МБ) не едут в нативный бинарь — они лежат
 * в Storage под `aura-images/<auraId>/<layer>.webp` и живут в дисковом кэше
 * expo-image (Фаза 4 «Бандл-диеты», решение владельца 2026-08-24).
 *
 * Почему это НЕ таблица из 111 строк, а формула: правило
 * `match /aura-images/{allPaths=**} { allow get: if true; }` делает объекты
 * публичными, поэтому download-токен в URL не нужен — адрес однозначно выводится
 * из id ауры и имени слоя. Плюсы: карта не может разойтись с тем, что реально
 * залито; перезаливка слоя не меняет URL; ничего не нужно регенерировать руками.
 *
 * Версия ассетов зашита в путь префиксом версии: чтобы обновить арт, поднимаем
 * AURA_ART_VERSION и заливаем в новый префикс — старый дисковый кэш при этом
 * не «моргает», а спокойно доживает до полной готовности новой версии.
 *
 * «Ядро» (constants/avatar_aura_core_art.ts) сюда не попадает — оно в бандле.
 */
import { CORE_AVATAR_AURA_IDS } from './avatar_aura_core_art';

const BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const STORAGE_PREFIX = 'aura-images';

/**
 * Версия арта аур. Меняется ТОЛЬКО вместе с перезаливкой слоёв в новый префикс.
 * v1 — исходные 320×320 слои, байт-в-байт с репозиторием (их sha256 сторожит
 * tests/avatar_aura_v2_assets.test.ts).
 */
export const AVATAR_AURA_ART_VERSION = 'v1';

const CORE_SET: ReadonlySet<string> = new Set<string>(CORE_AVATAR_AURA_IDS);

export type AvatarAuraLayer = 'base' | 'flow' | 'accents';

/** Путь объекта в бакете — единственная точка правды и для скрипта заливки. */
export function avatarAuraObjectPath(auraId: string, layer: AvatarAuraLayer): string {
  return `${STORAGE_PREFIX}/${AVATAR_AURA_ART_VERSION}/${auraId}/${layer}.webp`;
}

/** URL слоя ауры (undefined — слой в бандле, значит сеть не нужна). */
export function getAvatarAuraLayerUrl(auraId: string, layer: AvatarAuraLayer): string | undefined {
  if (CORE_SET.has(auraId)) return undefined;
  const encoded = encodeURIComponent(avatarAuraObjectPath(auraId, layer));
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encoded}?alt=media`;
}
