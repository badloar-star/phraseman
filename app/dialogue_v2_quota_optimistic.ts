/**
 * [DIALOG-QUOTA-OPT] — пилюля «N/30» бесплатных реплик меняется в момент отправки, а не после ответа сервера.
 *
 * зачем (координатор 12.10, аудит Optimistic UI E3, решение советника п.62): число обновлялось только по ответу сервера —
 * человек отправлял реплику и секунды видел прежний остаток. Сервер — источник правды: показ = max(0, остатокСервера −
 * ходовВПолёте). Ход добавляется при отправке (повтор того же turnId ничего не меняет), ответ сервера ОДНИМ переходом
 * пишет остаток и снимает ход — поэтому цифра не прыгает (−1 сразу, ответ подтверждает то же число). Сбой — ход снимается.
 */
export type DialogueV2QuotaState = Readonly<{
  /** Остаток от сервера/зеркала; null — безлимит или ещё не известен (пилюля не показывается). */
  remaining: number | null;
  /** Ходы, отправленные и ещё не отвеченные (turnId). */
  pending: ReadonlySet<string>;
}>;

export const EMPTY_DIALOGUE_V2_QUOTA: DialogueV2QuotaState = Object.freeze({ remaining: null, pending: new Set<string>() });

const LOG = '[DIALOG-QUOTA-OPT]';
const shortId = (turnId: string) => turnId.slice(0, 8);

/** Отправка хода: добавить turnId. Тот же ход повторно (retry) — состояние без изменений. */
export function beginDialogueV2QuotaTurn(state: DialogueV2QuotaState, turnId: string): DialogueV2QuotaState {
  if (state.pending.has(turnId)) {
    console.log(LOG, JSON.stringify({ event: 'begin_dup', turn: shortId(turnId), pending: state.pending.size }));
    return state;
  }
  const pending = new Set(state.pending);
  pending.add(turnId);
  console.log(LOG, JSON.stringify({ event: 'begin', turn: shortId(turnId), remaining: state.remaining, pending: pending.size }));
  return { remaining: state.remaining, pending };
}

/**
 * Ответ сервера: остаток и снятие хода — ОДИН переход (одна отрисовка). remaining не пришёл (null/undefined) —
 * остаток прежний, ход всё равно снимается.
 */
export function settleDialogueV2QuotaTurn(
  state: DialogueV2QuotaState,
  turnId: string,
  serverRemaining: number | null | undefined,
  replayed = false,
): DialogueV2QuotaState {
  const pending = new Set(state.pending);
  const had = pending.delete(turnId);
  // зачем (аудит «пропала сеть», Авторизация 13.10, п.4): ход дошёл до сервера (квота списана), ответ потерян → откат пилюли; повтор
  // приходит replayed БЕЗ квоты — остаток оставался до-ходовым, пилюля «N/30» показывала на 1 больше. Повтор хода, который был в полёте,
  // списывает 1 сам. Дубль ответа без хода в полёте (had=false) не трогаем — его уже снял первый ответ.
  const replayCharge = replayed && had && typeof serverRemaining !== 'number' && typeof state.remaining === 'number';
  const remaining = typeof serverRemaining === 'number'
    ? serverRemaining
    : replayCharge ? Math.max(0, (state.remaining as number) - 1) : state.remaining;
  console.log(LOG, JSON.stringify({ event: replayCharge ? 'settle_replayed' : 'settle', turn: shortId(turnId), had, replayed, serverRemaining: serverRemaining ?? null, remaining, pending: pending.size }));
  return { remaining, pending };
}

/** Сбой хода (service / network / rate_limited / paused): откат — ход снимается, остаток прежний. */
export function rollbackDialogueV2QuotaTurn(state: DialogueV2QuotaState, turnId: string, reason: string): DialogueV2QuotaState {
  if (!state.pending.has(turnId)) {
    console.log(LOG, JSON.stringify({ event: 'rollback_noop', turn: shortId(turnId), reason }));
    return state;
  }
  const pending = new Set(state.pending);
  pending.delete(turnId);
  console.warn(LOG, JSON.stringify({ event: 'rollback', turn: shortId(turnId), reason, remaining: state.remaining, pending: pending.size }));
  return { remaining: state.remaining, pending };
}

/** Остаток от сервера/зеркала вне хода (чтение зеркала, «лимит исчерпан»). Ходы в полёте не трогаем. */
export function setDialogueV2QuotaRemaining(state: DialogueV2QuotaState, remaining: number | null): DialogueV2QuotaState {
  return state.remaining === remaining ? state : { remaining, pending: state.pending };
}

/** Что показать в пилюле: null — пилюли нет. */
export function displayDialogueV2QuotaRemaining(state: DialogueV2QuotaState): number | null {
  return state.remaining === null ? null : Math.max(0, state.remaining - state.pending.size);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
