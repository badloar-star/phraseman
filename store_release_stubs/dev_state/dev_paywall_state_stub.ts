// Стор-сборка: заглушка app/dev_paywall_state.ts. Вид окна цен возвращается без изменений.
export const DEV_PAYWALL_STATES = [] as const;
export function parseDevPaywallState(): null { return null; }
export function setDevPaywallLinkState(): boolean { return false; }
export function getDevPaywallLinkState(): null { return null; }
export function setDevManageLoadingHold(): boolean { return false; }
export function isDevManageLoadingHold(): boolean { return false; }
// зачем (Авторизация 13.10, profile-024/paywalls-022): «Восстановить — пусто» в стор-сборке не подменяется
export function setDevRestorePurchaseEmpty(): boolean { return false; }
export function isDevRestorePurchaseEmpty(): boolean { return false; }
export const DEV_LESSON_UPSELLS = [] as const;
export function setDevLessonUpsell(): boolean { return false; }
export function getDevLessonUpsell(): null { return null; }
export function setDevAiExplainLimit(): boolean { return false; }
export function isDevAiExplainLimit(): boolean { return false; }
// зачем (Ядро 12.10, learn-007…013): подмена прогресса уроков в стор-сборке выключена
export function setDevLessonsProgress(): boolean { return false; }
export function getDevLessonsProgress(): null { return null; }
// зачем (Ядро 13.10, learn-012/013): подмена ворот уроков в стор-сборке выключена
export function setDevLessonGates(): boolean { return false; }
export function getDevLessonGates(): null { return null; }
export function applyDevPaywallView<T>(_state: unknown, view: T): T { return view; }
