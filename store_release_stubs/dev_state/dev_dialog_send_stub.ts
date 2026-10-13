// Стор-сборка: заглушка app/dev_dialog_send.ts. Подставного хода Диалога нет (getDevDialogSend() в сторе = null — сюда не заходят).
export const DEV_DIALOG_SEND_DELAY_MS = 0;
export const DEV_DIALOG_SEND_DEFAULT_REMAINING = 0;
export const DEV_DIALOG_SENDS: readonly string[] = [];
export function devDialogNextMonthStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}
export async function resolveDevDialogSend(): Promise<{ kind: 'fail'; reason: 'service' }> { return { kind: 'fail', reason: 'service' }; }
export function devDialogSessionId(): string { return ''; }
export default function __RouteShim() { return null; }
