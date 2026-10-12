// Стор-сборка: заглушка app/dev_paywall_state.ts. Вид окна цен возвращается без изменений.
export const DEV_PAYWALL_STATES = [] as const;
export function parseDevPaywallState(): null { return null; }
export function setDevPaywallLinkState(): boolean { return false; }
export function getDevPaywallLinkState(): null { return null; }
export function setDevManageLoadingHold(): boolean { return false; }
export function isDevManageLoadingHold(): boolean { return false; }
export const DEV_LESSON_UPSELLS = [] as const;
export function setDevLessonUpsell(): boolean { return false; }
export function getDevLessonUpsell(): null { return null; }
export function setDevAiExplainLimit(): boolean { return false; }
export function isDevAiExplainLimit(): boolean { return false; }
export function applyDevPaywallView<T>(_state: unknown, view: T): T { return view; }
