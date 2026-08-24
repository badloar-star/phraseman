// ═══════════════════════════════════════════════════════════════════════════
// theme_ownership_merge.ts — чистая логика списков купленных тем.
//
// зачем отдельным модулем: `theme_ownership_store` тянет AsyncStorage, а тот на
// этой машине раздувает jest-воркер до OOM (см. project_season_tests_heap_oom).
// Правила слияния — то место, где ошибка стоит человеку 200 жемчужин, поэтому
// они обязаны быть покрыты тестом. Без зависимостей модуль тестируется мгновенно.
// ═══════════════════════════════════════════════════════════════════════════

import { isSelectableThemeMode } from './theme_access_policy';

/** Разбор хранимого значения: мусор и неизвестные темы отсеиваются здесь. */
export function parseThemeModeList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is string => typeof m === 'string' && isSelectableThemeMode(m));
  } catch {
    return [];
  }
}

/** Объединение без дублей; порядок стабилен — детерминизм мержа и тестов. */
export function mergeThemeModeLists(a: readonly string[], b: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const mode of [...a, ...b]) {
    if (!isSelectableThemeMode(mode) || seen.has(mode)) continue;
    seen.add(mode);
    out.push(mode);
  }
  return out.sort();
}

/**
 * Мерж-стратегия облачного restore: покупки только НАКАПЛИВАЮТСЯ.
 * Перезапись стёрла бы покупку, сделанную на другом устройстве.
 */
export function mergeOwnedThemesRestoreValue(
  localRaw: string | null | undefined,
  remoteRaw: string | null | undefined,
): string {
  return JSON.stringify(mergeThemeModeLists(parseThemeModeList(localRaw), parseThemeModeList(remoteRaw)));
}

/** Ключ купленных тем. Синхронизируется — см. SYNC_KEYS в cloud_sync.ts. */
export const OWNED_THEMES_KEY = 'owned_theme_modes_v1';

/** Ключ тем, сохранённых за «дедушками» при смене правил. Тоже синхронизируется. */
export const GRANDFATHERED_THEMES_KEY = 'grandfathered_theme_modes_v1';

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
