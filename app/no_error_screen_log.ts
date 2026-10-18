// no_error_screen_log.ts — единый журнал «экрана-ошибки не показали».
//
// зачем (правило владельца 01.10 и 18.10 07:45: «полноэкранных экранов-ошибок НИГДЕ быть не должно»; координатор 18.10 08:00, правило «сперва логи»):
// каждое место, где раньше рисовался «Сейчас недоступно / Не удалось загрузить / Нет сети / не найдено», теперь пишет, ПОЧЕМУ раньше был бы экран ошибки и ЧТО показано вместо него
// (кэш, спокойное пустое состояние, тихий уход назад). Префикс [NO-ERROR-SCREEN] — всю цепочку достаём одним поиском. Только имена экранов и причины, данные пользователя не пишутся.
export type NoErrorScreenShown = 'cache' | 'quiet_empty' | 'quiet_back' | 'skeleton_retrying' | 'inline_hint' | 'list';

/** Одна строка журнала: экран, причина (значение, которое решило ветку), что показали вместо экрана-ошибки. */
export function logNoErrorScreen(screen: string, reason: string, shown: NoErrorScreenShown, extra: Readonly<Record<string, unknown>> = {}): void {
  console.log('[NO-ERROR-SCREEN]', JSON.stringify({ screen, reason, shown, ...extra })); // guard-ok: журнал причины замены экрана-ошибки, без данных пользователя
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __NoErrorScreenLogRouteShim() {
  return null;
}
