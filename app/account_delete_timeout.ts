export const ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS = 540_000;
export const ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS = 30_000;
export const ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS =
  ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS + ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS;

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
