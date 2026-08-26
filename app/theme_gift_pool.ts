// ═══════════════════════════════════════════════════════════════════════════
// theme_gift_pool.ts — какие платные темы этому человеку ещё можно подарить.
//
// зачем (владелец 2026-08-26): в спине есть редкий приз «тема оформления».
// Когда все платные темы уже открыты, приз обязан ИСЧЕЗНУТЬ из розыгрыша —
// не превращаться в утешительный жемчуг и тем более не выпадать пустышкой.
// Поэтому список кандидатов нужен ДВУМ сторонам: розыгрышу (чтобы исключить
// награду) и выдаче (чтобы выбрать конкретную тему).
//
// Почему отдельный модуль, а не функция в level_gift_system: розыгрыш живёт в
// local_level_spins, а импорт подарочной системы оттуда притащил бы XP-менеджер,
// premium_guard, маркетплейс наборов и облачную синхронизацию — на самый
// горячий путь спина. Здесь только политика тем и чтение двух ключей.
// ═══════════════════════════════════════════════════════════════════════════

import { SELECTABLE_THEME_MODES, isThemeShardPurchasable } from './theme_access_policy';
import { loadGrandfatheredThemeModes, loadOwnedThemeModes } from './theme_ownership_store';

/**
 * Темы, которые ещё можно выиграть.
 *
 * Берём только полку 'shards' — те самые, что иначе стоят 200 жемчужин.
 * Бесплатные и наградное «Золото» в пул не попадают: выдать их значило бы
 * подарить то, что у человека и так есть или что зарабатывается лигой.
 * Купленные и «дедушкины» исключаются — повторная выдача была бы пустышкой.
 */
export async function listThemeGiftCandidates(): Promise<string[]> {
  const [owned, grandfathered] = await Promise.all([
    loadOwnedThemeModes().catch(() => [] as string[]),
    loadGrandfatheredThemeModes().catch(() => [] as string[]),
  ]);
  const taken = new Set([...owned, ...grandfathered]);
  return SELECTABLE_THEME_MODES.filter((mode) => isThemeShardPurchasable(mode) && !taken.has(mode));
}

/**
 * Награды спина, которые для этого человека нужно исключить из розыгрыша.
 *
 * Сейчас это только тема. Функция намеренно возвращает МАССИВ: если позже
 * появится вторая исчерпаемая награда, её добавят сюда, а не в третье место.
 *
 * Ошибку чтения трактуем как «тема ещё доступна»: ложно скрыть приз хуже,
 * чем разыграть его и выдать — выдача всё равно проверит список заново.
 */
export async function listExhaustedSpinRewardIds(): Promise<string[]> {
  try {
    const candidates = await listThemeGiftCandidates();
    return candidates.length === 0 ? ['cosmetic_theme'] : [];
  } catch {
    return [];
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
