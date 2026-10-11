/**
 * DEV: подставной итог хода Диалога для `dev_state?dev_dialog_send=ok|quota_exhausted|network|service`.
 *
 * зачем (координатор 12.10): Сверка не может проверить пилюлю «N/30» (076ab7aae) — настоящий ход зовёт ИИ на проде.
 * Здесь только логика итога, без сети: задержка ~1,5 с (как живой ответ), для `ok` — остаток = локальное зеркало − 1,
 * чтобы подтверждение совпало с оптимистичным −1 и цифра не прыгнула. Клиент хода сам строит ответ / ошибку.
 * Включается только флагом в памяти процесса (dev_dialog_state, в стор-сборке всегда выключено). Логи: [DEV-STATE].
 */
export const DEV_DIALOG_SEND_DELAY_MS = 1_500;
/** Остаток, если зеркала ещё нет (бесплатный месяц = 30 реплик). */
export const DEV_DIALOG_SEND_DEFAULT_REMAINING = 30;

export type DevDialogSendMode = 'ok' | 'quota_exhausted' | 'network' | 'service';
export const DEV_DIALOG_SENDS: readonly DevDialogSendMode[] = ['ok', 'quota_exhausted', 'network', 'service'];

export type DevDialogSendOutcome =
  | Readonly<{ kind: 'reply'; remaining: number; resetAtMs: number; source: 'mirror' | 'default' }>
  | Readonly<{ kind: 'fail'; reason: 'quota_exhausted' | 'network' | 'service' }>;

type QuotaRead = Readonly<{ status: string; remaining?: number; resetAtMs?: number }>;

/** Начало следующего месяца (UTC) — срок сброса бесплатных реплик для подставного ответа. */
export function devDialogNextMonthStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

export async function resolveDevDialogSend(
  mode: DevDialogSendMode,
  deps: Readonly<{ readQuota: () => Promise<QuotaRead>; wait: (ms: number) => Promise<void>; nowMs: () => number }>,
): Promise<DevDialogSendOutcome> {
  console.log(`[DEV-STATE] dialogs: send=${mode} — ход подменён, ИИ и Firestore не вызываются, ответ через ${DEV_DIALOG_SEND_DELAY_MS} мс`); // guard-ok: dev-ветка
  await deps.wait(DEV_DIALOG_SEND_DELAY_MS);
  if (mode !== 'ok') {
    console.log(`[DEV-STATE] dialogs: send=${mode} → отказ`); // guard-ok: dev-ветка
    return { kind: 'fail', reason: mode };
  }
  let read: QuotaRead = { status: 'unknown' };
  try {
    read = await deps.readQuota();
  } catch (error: unknown) {
    console.warn(`[DEV-STATE] dialogs: send=ok — зеркало не прочиталось (${error instanceof Error ? error.message : String(error)}) → остаток по умолчанию`); // guard-ok: dev-ветка
  }
  const fromMirror = read.status === 'allowed' && typeof read.remaining === 'number';
  const before = fromMirror ? (read.remaining as number) : DEV_DIALOG_SEND_DEFAULT_REMAINING;
  const remaining = Math.max(0, before - 1);
  const resetAtMs = typeof read.resetAtMs === 'number' && read.resetAtMs > 0 ? read.resetAtMs : devDialogNextMonthStartMs(deps.nowMs());
  console.log(`[DEV-STATE] dialogs: send=ok → остаток ${before}→${remaining} (источник ${fromMirror ? 'зеркало' : 'по умолчанию'})`); // guard-ok: dev-ветка
  return { kind: 'reply', remaining, resetAtMs, source: fromMirror ? 'mirror' : 'default' };
}

/** Подставная сессия: формат как у сервера (d2s_ + 32+ символа), чтобы ход прошёл локальную проверку запроса. */
export function devDialogSessionId(nowMs: number, random: () => number = Math.random): string {
  const tail = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(random() * 36)]).join('');
  return `d2s_dev${nowMs.toString(36)}${tail}`;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
