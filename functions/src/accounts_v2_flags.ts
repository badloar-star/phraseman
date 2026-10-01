/*
 * Account V2, Пакет 6A (TG-29D525D1B798) — серверный флаг включения.
 *
 * зачем: серверная часть V2 подключается к index.ts и к конвейеру удаления,
 * но деплой обязан ничего не менять для людей, пока владелец сам не включит
 * (после Пакета 6B и проверки на трёх аккаунтах). Поэтому:
 *  - флаг — ОДИН документ `config/accounts_v2` { syncEnabled, deletionPurgeEnabled, everEnabled };
 *  - по умолчанию выключено: нет документа, не boolean true, порча — «выкл»;
 *  - чтение дешёвое: кэш в памяти инстанса ≤ 5 минут, параллельные вызовы
 *    делят одно чтение; сбой чтения кэшируется коротко (не долбим Firestore);
 *  - сбой чтения НЕ превращается молча в «выкл»: вызывающий получает ok:false
 *    (и последнее удачное значение, если оно было) и решает сам.
 *
 * Ремонт №1 (ревью, P2): стирание accounts_v2 при удалении аккаунта обязано
 * идти всегда, когда данные V2 МОГЛИ появиться. Поэтому липкий признак
 * `everEnabled`: сервер ставит его сам в тот же документ, как только увидел
 * любой флаг включённым, и ДО того, как отдать «вкл» вызывающему (не удалось
 * записать — ok:false, «вкл» не отдаём). Сам сервер его не снимает никогда.
 * `accountsV2PurgeRequired` = deletionPurgeEnabled || syncEnabled || everEnabled.
 * Пишет документ ещё только админ (firestore.rules, match /config/accounts_v2).
 */

import { parseMinClientVersion } from './accounts_v2_client_version';

export const ACCOUNTS_V2_FLAGS_DOC = 'config/accounts_v2';
export const ACCOUNTS_V2_FLAGS_CACHE_MS = 5 * 60_000;
export const ACCOUNTS_V2_FLAGS_ERROR_CACHE_MS = 15_000;

export type AccountsV2Flags = Readonly<{
  syncEnabled: boolean; deletionPurgeEnabled: boolean; everEnabled: boolean;
  /** 8F (PM-235 T2): минимальная версия клиента (номер сборки); нет / 0 — проверки нет. */
  minClientVersion?: number;
}>;
export type AccountsV2FlagsRead = Readonly<{ ok: boolean; flags: AccountsV2Flags; lastGood?: AccountsV2Flags | null }>;

export const ACCOUNTS_V2_FLAGS_OFF: AccountsV2Flags = Object.freeze({
  syncEnabled: false, deletionPurgeEnabled: false, everEnabled: false,
});

const LOG = '[ACCOUNTS-V2-FLAGS]';

export function parseAccountsV2Flags(data: unknown): AccountsV2Flags {
  if (typeof data !== 'object' || data === null) return ACCOUNTS_V2_FLAGS_OFF;
  const raw = data as Record<string, unknown>;
  // зачем (8F): минимум версии клиента — только целое ≥ 1; иначе ключа нет (= проверки нет).
  const minClientVersion = parseMinClientVersion(raw.minClientVersion);
  return Object.freeze({
    syncEnabled: raw.syncEnabled === true,
    deletionPurgeEnabled: raw.deletionPurgeEnabled === true,
    everEnabled: raw.everEnabled === true,
    ...(minClientVersion > 0 ? { minClientVersion } : {}),
  });
}

/** Данные V2 могли появиться → при удалении аккаунта их обязательно стирать. */
export function accountsV2PurgeRequired(flags: AccountsV2Flags): boolean {
  return flags.deletionPurgeEnabled || flags.syncEnabled || flags.everEnabled;
}

export interface AccountsV2FlagsReader {
  read(): Promise<AccountsV2FlagsRead>;
}

type Cached = Readonly<{ value: AccountsV2FlagsRead; untilMs: number }>;

function errorTag(error: unknown): string {
  // зачем: только имя и код — сообщение Firestore может нести пути.
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

export function createAccountsV2FlagsReader(
  load: () => Promise<unknown>,
  nowMs: () => number = () => Date.now(),
  markEverEnabled: () => Promise<void> = async () => undefined,
): AccountsV2FlagsReader {
  let cached: Cached | null = null;
  let lastGood: AccountsV2Flags | null = null;
  let inflight: Promise<AccountsV2FlagsRead> | null = null;
  const fail = (stage: string, error: unknown): AccountsV2FlagsRead => {
    console.error(`${LOG} ${stage} ${errorTag(error)} -> ok=false lastGood=${lastGood === null ? 'none' : 'present'}`);
    const value: AccountsV2FlagsRead = Object.freeze({ ok: false, flags: ACCOUNTS_V2_FLAGS_OFF, lastGood });
    cached = { value, untilMs: nowMs() + ACCOUNTS_V2_FLAGS_ERROR_CACHE_MS };
    return value;
  };
  const refresh = async (): Promise<AccountsV2FlagsRead> => {
    let flags: AccountsV2Flags;
    try {
      flags = parseAccountsV2Flags(await load());
    } catch (error) {
      return fail('read_failed', error);
    }
    if ((flags.syncEnabled || flags.deletionPurgeEnabled) && !flags.everEnabled) {
      try {
        await markEverEnabled();
        flags = Object.freeze({ ...flags, everEnabled: true });
        console.log(`${LOG} ever_enabled marked`);
      } catch (error) {
        // зачем: без липкой метки выключение флага потом отключило бы стирание
        // V2 при удалении аккаунта — «вкл» без метки не отдаём.
        return fail('mark_failed', error);
      }
    }
    lastGood = flags;
    const value: AccountsV2FlagsRead = Object.freeze({ ok: true, flags });
    cached = { value, untilMs: nowMs() + ACCOUNTS_V2_FLAGS_CACHE_MS };
    console.log(`${LOG} loaded sync=${String(flags.syncEnabled)} deletionPurge=${String(flags.deletionPurgeEnabled)} `
      + `ever=${String(flags.everEnabled)} minClient=${flags.minClientVersion ?? 0}`);
    return value;
  };
  return {
    read() {
      if (cached !== null && nowMs() < cached.untilMs) return Promise.resolve(cached.value);
      if (inflight === null) inflight = refresh().finally(() => { inflight = null; });
      return inflight;
    },
  };
}

/**
 * Минимальная форма Firestore, нужная читателю.
 * зачем структурный тип, а не импорт SDK: модули functions/src/accounts_v2_*.ts
 * по сторожу паритета (accounts_v2_envelope_parity.test.ts) не импортируют
 * ничего, кроме crypto и своих модулей; настоящий Firestore подходит по форме.
 */
export type AccountsV2FlagsDb = Readonly<{
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): unknown }>;
    set(data: Readonly<Record<string, unknown>>, options: Readonly<{ merge: boolean }>): Promise<unknown>;
  };
}>;

let defaultReader: AccountsV2FlagsReader | null = null;

/** Общий на инстанс читатель флага из Firestore (одно чтение документа на окно кэша). */
export function accountsV2FlagsReader(db: AccountsV2FlagsDb): AccountsV2FlagsReader {
  if (defaultReader === null) {
    defaultReader = createAccountsV2FlagsReader(
      async () => {
        const snapshot = await db.doc(ACCOUNTS_V2_FLAGS_DOC).get(); // guard-ok: один документ, кэш 5 мин
        return snapshot.exists ? snapshot.data() : null;
      },
      () => Date.now(),
      async () => {
        // зачем: одна запись на всё время жизни проекта (метка липкая, повтор не нужен).
        await db.doc(ACCOUNTS_V2_FLAGS_DOC).set({ everEnabled: true }, { merge: true }); // guard-ok: один документ
      },
    );
  }
  return defaultReader;
}
