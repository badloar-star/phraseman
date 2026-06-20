// ════════════════════════════════════════════════════════════════════════════
// matchFoundToastPaths.ts — чистая логика «на каких маршрутах показывать тост
// "Соперник найден!"». Без react-native импортов, чтобы её можно было покрыть
// юнит-тестами без нативного окружения. Единый источник правды для блок-листа.
// ════════════════════════════════════════════════════════════════════════════

export type MatchFoundToastHost = 'root' | 'screen';

/**
 * Не показывать тост поверх «боевого» флоу арены; на остальных экранах — можно
 * (табы, уроки, друзья, …).
 * Добавляешь сюда маршрут — проверка скрытия подхватит его автоматически
 * (на это завязан тест match_found_toast_guards).
 */
export const MATCH_FOUND_TOAST_PATH_BLOCKLIST = [
  'arena_lobby',
  'arena_game',
  'arena_join',
  'arena_results',
  'arena_rating',
] as const;

/** Маршруты, где тост рендерит «экранный» хост (а корневой — молчит). */
export const MATCH_FOUND_TOAST_SCREEN_HOST_PATHS = [
  'premium_modal',
] as const;

function pathHasFragment(
  pathname: string,
  fragments: readonly string[],
): boolean {
  const lower = pathname.toLowerCase();
  for (const frag of fragments) {
    if (lower.includes(frag)) return true;
  }
  return false;
}

export function isMatchFoundToastPathAllowed(
  pathname: string | null | undefined,
  host: MatchFoundToastHost,
): boolean {
  if (typeof pathname !== 'string' || pathname.length === 0) return false;
  if (host === 'screen') {
    return pathHasFragment(pathname, MATCH_FOUND_TOAST_SCREEN_HOST_PATHS);
  }
  if (pathHasFragment(pathname, MATCH_FOUND_TOAST_SCREEN_HOST_PATHS)) return false;
  return !pathHasFragment(pathname, MATCH_FOUND_TOAST_PATH_BLOCKLIST);
}
