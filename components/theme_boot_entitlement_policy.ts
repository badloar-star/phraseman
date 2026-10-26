import { isPremiumThemeId } from '../app/premium_theme_catalog';

/**
 * Что ждать от прав на премиальные темы, пока держится заставка холодного старта.
 *
 * зачем (скорость тем 26.10, Темы, docs/work/themes-perf-2026-10-26.md): чтение темы ждало primePremiumThemeEntitlements, а она при
 * пустом или устаревшем (старше суток) кэше ждёт сеть (таймаут 15 с). Заставку держит потолок 800 мс — при медленной сети она
 * снималась с темой по умолчанию, и Главная потом перекрашивалась в сохранённую: заметный «прыжок» цвета. Права нужны только
 * премиальной теме. Обычной — не ждём ничего (права обновляются фоном отдельным эффектом); премиальной — хватает кэша на
 * телефоне любого возраста (заработанная тема не откатывается), свежий ответ сервера догоняет фоном. Нет кэша — ждём сеть, как прежде.
 */
export type ThemeBootEntitlementWait = Readonly<{ wait: 'none' | 'cache_first' }>;

export function themeBootEntitlementWait(storedThemeId: string): ThemeBootEntitlementWait {
  if (!isPremiumThemeId(storedThemeId)) return { wait: 'none' };
  return { wait: 'cache_first' };
}
