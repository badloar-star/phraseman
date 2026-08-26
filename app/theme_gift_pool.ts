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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SELECTABLE_THEME_MODES, isSelectableThemeMode, isThemeShardPurchasable } from './theme_access_policy';
import { GRANDFATHERED_THEMES_KEY, OWNED_THEMES_KEY } from './theme_ownership_store';
import { parseStrictStringList } from './spin_gift_storage_integrity';
import { loadSpinCustomAvatarGiftCandidates, type SpinCustomAvatarGiftPoolRead } from './spin_avatar_gift_pool';

export type ThemeGiftPoolRead =
  | Readonly<{ status: 'available'; candidates: readonly string[]; owned: readonly string[] }>
  | Readonly<{ status: 'unavailable'; reason: 'read_failed' | 'malformed' }>;

export async function loadThemeGiftCandidates(): Promise<ThemeGiftPoolRead> {
  let rows: readonly (readonly [string, string | null])[];
  try {
    rows = await AsyncStorage.multiGet([OWNED_THEMES_KEY, GRANDFATHERED_THEMES_KEY]);
  } catch {
    return { status: 'unavailable', reason: 'read_failed' };
  }
  const owned = parseStrictStringList(rows[0]?.[1] ?? null, isSelectableThemeMode);
  const grandfathered = parseStrictStringList(rows[1]?.[1] ?? null, isSelectableThemeMode);
  if (owned.status === 'malformed' || grandfathered.status === 'malformed') {
    return { status: 'unavailable', reason: 'malformed' };
  }
  const taken = new Set([...owned.value, ...grandfathered.value]);
  return {
    status: 'available',
    candidates: SELECTABLE_THEME_MODES.filter((mode) => isThemeShardPurchasable(mode) && !taken.has(mode)),
    owned: owned.value,
  };
}

/**
 * Темы, которые ещё можно выиграть.
 *
 * Берём только полку 'shards' — те самые, что иначе стоят 200 жемчужин.
 * Бесплатные и наградное «Золото» в пул не попадают: выдать их значило бы
 * подарить то, что у человека и так есть или что зарабатывается лигой.
 * Купленные и «дедушкины» исключаются — повторная выдача была бы пустышкой.
 */
export async function listThemeGiftCandidates(): Promise<string[]> {
  const result = await loadThemeGiftCandidates();
  if (result.status === 'unavailable') throw new Error(`theme_gift_ownership_${result.reason}`);
  return [...result.candidates];
}

export function exhaustedSpinRewardIdsForCandidates(
  themeCandidates: readonly unknown[] | null,
  avatarPool: SpinCustomAvatarGiftPoolRead,
): string[] {
  return [
    ...(themeCandidates === null || themeCandidates.length === 0 ? ['cosmetic_theme'] : []),
    ...(avatarPool.status === 'unavailable' || avatarPool.candidates.length === 0
      ? ['cosmetic_avatar_common']
      : []),
  ];
}

/**
 * Награды спина, которые для этого человека нужно исключить из розыгрыша.
 *
 * Тема и полный avatar-пул — исчерпаемые награды. Обе исчезают до розыгрыша,
 * когда у активного аккаунта больше нет ни одного кандидата.
 *
 * Ошибка ownership fail-closed для каждой исчерпаемой награды: новый чек не
 * должен обещать косметику, которую нельзя безопасно записать без потери уже
 * существующих прав.
 */
export async function listExhaustedSpinRewardIds(): Promise<string[]> {
  const [themes, avatars] = await Promise.all([
    loadThemeGiftCandidates(),
    loadSpinCustomAvatarGiftCandidates(),
  ]);
  return exhaustedSpinRewardIdsForCandidates(
    themes.status === 'available' ? themes.candidates : null,
    avatars,
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
