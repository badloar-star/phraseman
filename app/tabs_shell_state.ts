// ═════════════════════════════════════════════════════════════════════
// tabs_shell_state.ts — смонтирован ли каркас табов (R1, двойной монтаж Главной; журнал Сверки 12.10 после 531efac35).
//
// зачем: корневой эффект app/_layout.tsx уходит с `/` на Главную. Проверка «мы внутри группы (tabs)» по useSegments() на холодном старте оказалась ложной (в журнале ветка navigate не сработала ни разу):
// фокус стоит на корневом маршруте `index` (его segments пусты), а каркас (tabs) при этом уже смонтирован под ним и показывает Главную. Правильный вопрос — не «какие сегменты», а «каркас уже живой?».
// Флаг ставит сам каркас (app/(tabs)/_layout.tsx) в эффекте монтирования и снимает при размонтировании. Модуль-синглтон без зависимостей, чтобы корень читал его без импорта экрана.
// ═════════════════════════════════════════════════════════════════════
let tabsShellMounted = false;

export function setTabsShellMounted(mounted: boolean): void {
  tabsShellMounted = mounted;
}

export function isTabsShellMounted(): boolean {
  return tabsShellMounted;
}

/**
 * Проверка после router.navigate с корня (журнал Сверки with_navigate_fix2): прежняя проверка читала pathname из рендера (pathnameRef), а при занятом JS-потоке (debug) React ещё не успел
 * перерисоваться за 600 мс — «путь остался корневым» было ложным, и запасной replace пересоздавал каркас уже ПОСЛЕ успешного navigate. Решаем по живому состоянию навигации (getCurrentRoute обновляется
 * синхронно): если сфокусирован маршрут `(tabs)` — navigate сработал (путь `/` у него остаётся и это нормально — каркас считает `/` Главной), оставляем; иначе (остался корневой `index` и т.п.) — прежний replace.
 */
export function rootNavigateFallbackAction(currentRouteName: string | null | undefined): 'keep' | 'replace' {
  return currentRouteName === '(tabs)' ? 'keep' : 'replace';
}
