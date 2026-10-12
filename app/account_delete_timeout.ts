export const ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS = 540_000;
export const ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS = 30_000;
export const ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS =
  ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS + ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS;
export const ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS = 8_000;
// зачем (координатор 12.10, журнал прода): холодный старт accountDeleteEnqueue ≈9 с > 8 с — у гостя постановка истекала, хотя сервер
// её получил. Ветка гостя ждёт ответ в ФОНЕ (UI уже на онбординге), поэтому ей дедлайн длиннее; связанные аккаунты — прежние 8 с.
export const ACCOUNT_DELETE_GUEST_BACKGROUND_ENQUEUE_TIMEOUT_MS = 25_000;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
