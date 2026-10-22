// ═══════════════════════════════════════════════════════════════════════════
// tab_entry_source.ts — открыли вкладку из нижнего меню (тап/свайп) или ссылкой с другого экрана.
//
// зачем (закон владельца 22.10 «кнопка назад везде в одном месте»; координатор: «Пик, открытый с Главной — или любой корень вкладки,
// открытый не тапом по нижнему меню — ДА, показывать ScreenBackButton»): метка `?section=…` в адресе не годится — после ухода по меню
// она может пережить переход, и «назад» всплыл бы при обычном входе. Оболочка вкладок сама отмечает вход из меню; вкладка, ставшая
// видимой без такой отметки, открыта ссылкой (Главная, «Сегодня», пуш) — у неё есть «откуда пришли».
// ═══════════════════════════════════════════════════════════════════════════

/** Сколько живёт отметка: вкладка становится видимой в том же жесте, сотни миллисекунд. */
const MENU_ENTRY_TTL_MS = 2000;

let lastMenuEntry: Readonly<{ route: string; at: number }> | null = null;

/** Оболочка вкладок: вкладку открыли тапом по нижнему меню или свайпом. */
export function noteTabEnteredByMenu(route: string): void {
  lastMenuEntry = { route, at: Date.now() };
}

/** Вкладка `route` только что открыта из меню (а не ссылкой с другого экрана). */
export function tabEnteredByMenu(route: string, now: number = Date.now()): boolean {
  return lastMenuEntry !== null && lastMenuEntry.route === route && now - lastMenuEntry.at <= MENU_ENTRY_TTL_MS;
}

/** Только для тестов. */
export function resetTabEntrySourceForTests(): void {
  lastMenuEntry = null;
}

/* expo-router route shim */
export default function __TabEntrySourceRouteShim() { return null; }
