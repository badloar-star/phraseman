// ═══════════════════════════════════════════════════════════════════════════
// theme_ownership_store.ts — какие темы человек КУПИЛ за жемчуг.
//
// зачем (владелец 2026-08-24): темы (кроме «Индиго»/«Нефрит»/«Оливы»/«Золота»)
// продаются за 200 жемчужин и подпиской НЕ открываются. Купленное — это
// потраченная валюта, поэтому список обязан пережить переустановку и переезд
// на другое устройство: ключ уходит в облачную синхронизацию (SYNC_KEYS) и
// мержится ОБЪЕДИНЕНИЕМ, а не перезаписью.
//
// Почему отдельный ключ, а не `app_theme`: `app_theme` (выбранная тема) СОЗНАТЕЛЬНО
// не синхронизируется — облако когда-то перетирало живой выбор пользователя
// старым значением (см. комментарий в cloud_sync.ts). Здесь противоположный
// случай: список только растёт, конфликт невозможен по построению — покупка
// никогда не «отменяется», поэтому объединение двух устройств всегда корректно.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSelectableThemeMode } from './theme_access_policy';
// зачем: чистые правила слияния живут отдельно (без AsyncStorage), чтобы их
// можно было покрыть тестом — импорт этого файла в jest раздувает воркер до OOM.
import {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
  mergeThemeModeLists,
  parseThemeModeList as parseModes,
} from './theme_ownership_merge';

export {
  GRANDFATHERED_THEMES_KEY,
  OWNED_THEMES_KEY,
  mergeOwnedThemesRestoreValue,
  mergeThemeModeLists,
};

async function readList(key: string): Promise<string[]> {
  try {
    return parseModes(await AsyncStorage.getItem(key));
  } catch {
    return [];
  }
}

async function addToList(key: string, mode: string): Promise<string[]> {
  const current = await readList(key);
  if (current.includes(mode)) return current;
  const next = mergeThemeModeLists(current, [mode]);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

/** Темы, купленные за жемчуг. */
export function loadOwnedThemeModes(): Promise<string[]> {
  return readList(OWNED_THEMES_KEY);
}

/** Записать покупку темы. Идемпотентно: повтор не портит список. */
export function addOwnedThemeMode(mode: string): Promise<string[]> {
  return addToList(OWNED_THEMES_KEY, mode);
}

/** Темы, сохранённые за «дедушками». */
export function loadGrandfatheredThemeModes(): Promise<string[]> {
  return readList(GRANDFATHERED_THEMES_KEY);
}

/** Закрепить тему за «дедушкой» навсегда. */
export function addGrandfatheredThemeMode(mode: string): Promise<string[]> {
  return addToList(GRANDFATHERED_THEMES_KEY, mode);
}

/**
 * Разовая миграция при смене правил (2026-08-24).
 *
 * До этой правки «Полночь/Янтарь/Сияние/Лайм/Форест» открывались подпиской.
 * Теперь они продаются за жемчуг — и человек, который прямо СЕЙЧАС сидит на
 * такой теме, потерял бы её на ровном месте. Владелец потребовал: активная
 * тема остаётся навсегда. Закрепляем её за «дедушкой» ровно один раз.
 *
 * Намеренно закрепляется ТОЛЬКО активная тема, а не весь премиум-набор:
 * иначе продажи тем за жемчуг обнулились бы для всех текущих подписчиков.
 */
export async function grandfatherActiveThemeIfNeeded(
  activeMode: string | null | undefined,
  opts: { hadAccess: boolean },
): Promise<string[]> {
  const current = await loadGrandfatheredThemeModes();
  if (!opts.hadAccess) return current;
  if (!activeMode || !isSelectableThemeMode(activeMode)) return current;
  return addGrandfatheredThemeMode(activeMode);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
