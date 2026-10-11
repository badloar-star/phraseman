// Стор-сборка: заглушка app/dev_paywall_state.ts. Вид окна цен возвращается без изменений.
export const DEV_PAYWALL_STATES = [] as const;
export function parseDevPaywallState(): null { return null; }
export function setDevPaywallLinkState(): boolean { return false; }
export function getDevPaywallLinkState(): null { return null; }
export function applyDevPaywallView<T>(_state: unknown, view: T): T { return view; }
