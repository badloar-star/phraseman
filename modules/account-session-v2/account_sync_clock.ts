import { AccountSyncInvariantError } from './account_sync';

/*
 * Account V2 (TG-831C22D22486) — время для SRS-правок (TEMP-контракт сервера (б), (в)).
 *
 * зачем: «самый свежий» SRS побеждает по времени правки на телефоне, а часы телефона
 * врут. Сервер отдаёт `serverNowMs` в ответе callable; клиент хранит смещение
 * serverNowMs − Date.now() (на диске, в записи outbox) и ставит `updatedAtMs`
 * гибридными часами:
 *   min(max(Date.now() + смещение, увиденное.updatedAtMs + 1),
 *       Date.now() + смещение + окно_сервера − запас).
 * Иначе правка с отстающими часами проиграла бы более старой по смыслу записи, а
 * с убежавшими вперёд — получила бы `rejected srs_time_in_future`.
 * Производители SRS-операций ОБЯЗАНЫ брать время только отсюда.
 *
 * Верхняя граница (TG-7CD73967EF61, P2): «увиденное» ОБЯЗАНО быть значением,
 * подтверждённым сервером (пришло с сервера или вернулось в квитанции), — сервер
 * такое принимает не дальше окна ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS от своих часов.
 * Если «увиденное» всё же дальше окна (локальная правка с убежавшими часами,
 * испорченная запись), `увиденное + 1` дало бы новую `srs_time_in_future` —
 * и перевыпуск крутился бы по кругу. Поэтому время зажимается верхом окна с
 * запасом на погрешность смещения (задержка сети), а зажим пишется в лог.
 */

/** Окно «будущего» времени SRS на сервере — ровно ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS (сторож паритета). */
export const ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;
/** Запас внутри окна: погрешность смещения часов (время в пути ответа) и дрейф. */
export const ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS = 2 * 60 * 1000;

function invalid(): never {
  throw new AccountSyncInvariantError('account_sync_invalid_input');
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Смещение часов сервера относительно телефона: serverNowMs − localNowMs. */
export function accountSyncServerClockOffsetMs(serverNowMs: number, localNowMs: number): number {
  if (!nonNegativeSafeInteger(serverNowMs) || !nonNegativeSafeInteger(localNowMs)) return invalid();
  return serverNowMs - localNowMs;
}

export type AccountSyncHybridClockInput = Readonly<{
  /** Date.now() телефона в момент правки. */
  localNowMs: number;
  /** Последнее смещение из ответа сервера; 0, пока ответа ещё не было. */
  serverOffsetMs: number;
  /** updatedAtMs подтверждённого сервером SRS-значения, которое правит телефон; null — значения ещё нет. */
  seenUpdatedAtMs: number | null;
}>;

/** updatedAtMs новой SRS-правки: max(local + смещение, увиденное + 1), не больше верха окна, не меньше 0. */
export function accountSyncHybridSrsUpdatedAtMs(input: AccountSyncHybridClockInput): number {
  const { localNowMs, serverOffsetMs, seenUpdatedAtMs } = input;
  if (!nonNegativeSafeInteger(localNowMs) || typeof serverOffsetMs !== 'number'
    || !Number.isSafeInteger(serverOffsetMs)
    || (seenUpdatedAtMs !== null && !nonNegativeSafeInteger(seenUpdatedAtMs))) return invalid();
  const serverNow = Math.max(0, localNowMs + serverOffsetMs);
  const candidate = seenUpdatedAtMs === null ? serverNow : Math.max(serverNow, seenUpdatedAtMs + 1);
  // зачем: верх окна сервера минус запас — дальше сервер ответит srs_time_in_future.
  const ceiling = serverNow + ACCOUNT_SYNC_SRS_MAX_FUTURE_SKEW_MS - ACCOUNT_SYNC_SRS_FUTURE_MARGIN_MS;
  if (!Number.isSafeInteger(candidate) || !Number.isSafeInteger(ceiling)) return invalid();
  if (candidate > ceiling) {
    console.warn('[ACCOUNTS-V2-CLIENT] srs_time_clamped', `aheadMs=${candidate - serverNow}`);
    return ceiling;
  }
  return candidate;
}
