import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { accountsV2FlagsReader, type AccountsV2FlagsReader } from '../accounts_v2_flags';
import { createDeletionProbeLimiter, type DeletionProbeLimiter, type DeletionStatusResult } from './deletion_flow';
import { accountsV2DeletionStatusForCallable } from './firestore_ports';
import { accountsV2PurgeMaxCommitsForBudget } from './purge_core';

/*
 * Account V2, Пакет 6A (TG-29D525D1B798) — callable статуса удаления по ключу.
 *
 * зачем: решение владельца 13 — ключ удаления на телефоне даёт право узнать
 * этап и «дотолкнуть» стирание данных V2; данных аккаунта не открывает.
 * Авторизация — ключом (вход не нужен: аккаунта в Auth уже нет). Поэтому:
 *  - первым шагом серверный флаг `config/accounts_v2.deletionPurgeEnabled`
 *    (выкл по умолчанию): выключен → окончательный `accounts_v2_disabled`,
 *    ноль чтений/записей данных;
 *  - подбор несуществующих квитанций режет лимит промахов инстанса (ключи
 *    вызывающего — хэши uid, адреса и сети адреса; общий потолок режет только
 *    уже промахнувшихся), сверх лимита — 0 чтений;
 *  - бюджет толчка (maxCommits) — из таймаута функции минус запас;
 *  - App Check запломбирован владельцем (ENFORCE_APP_CHECK = false навсегда).
 * Наружу — только { stage } или HttpsError с кодом.
 */

const LOG = '[ACCOUNTS-V2-DELETE]';

export const ACCOUNTS_V2_DELETION_STATUS_TIMEOUT_SECONDS = 60;
/** Запас на транзакции квитанции до/после стирания и ответ. */
export const ACCOUNTS_V2_DELETION_STATUS_RESERVE_MS = 20_000;

export const ACCOUNTS_V2_DELETION_STATUS_OPTIONS = Object.freeze({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: ACCOUNTS_V2_DELETION_STATUS_TIMEOUT_SECONDS,
  memory: '256MiB' as const,
  // зачем мало: лимит промахов живёт в памяти инстанса — чем меньше инстансов,
  // тем ближе общий потолок подбора к заявленному.
  maxInstances: 10,
});

export type AccountsV2DeletionStatusRequest = Readonly<{
  auth?: Readonly<{ uid?: string }> | null;
  data: unknown;
  ip?: string | null;
  /**
   * Заголовок X-Forwarded-For. Берём ПОСЛЕДНЮЮ запись — её дописывает фронт
   * Google; первые записи присылает сам клиент и может подделать (ремонт №2).
   */
  forwardedFor?: string | null;
}>;

export type AccountsV2DeletionStatusDeps = Readonly<{
  flags: AccountsV2FlagsReader;
  limiter: DeletionProbeLimiter;
  status?: typeof accountsV2DeletionStatusForCallable;
}>;

function probeHash(source: string): string {
  return createHash('sha256').update(`accounts_v2_deletion_probe\u0000${source}`).digest('hex').slice(0, 24);
}

/** Сеть адреса: IPv4 — /24, IPv6 — /64. Чужой формат — null. */
function networkOf(address: string): string | null {
  const v4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/i.exec(address);
  if (v4 !== null) return `v4:${v4[1]}.${v4[2]}.${v4[3]}`;
  if (address.includes(':')) {
    const groups = address.toLowerCase().split('::')[0].split(':').filter(Boolean);
    return groups.length > 0 ? `v6:${groups.slice(0, 4).join(':')}` : null;
  }
  return null;
}

/**
 * Ключи лимита промахов (ремонт №1, P3-3): не только адрес. Вошедший — по uid;
 * всегда — по адресу клиента (ПОСЛЕДНИЙ из X-Forwarded-For, иначе адрес запроса)
 * и по его сети (перебор со смены адресов в одной сети упирается в лимит сети).
 * В памяти и логах — только усечённые хэши.
 */
export function accountsV2DeletionProbeKeys(request: AccountsV2DeletionStatusRequest): readonly string[] {
  const keys: string[] = [];
  const uid = typeof request.auth?.uid === 'string' && request.auth.uid.length > 0 ? request.auth.uid : null;
  if (uid !== null) keys.push(probeHash(`uid:${uid}`));
  const forwardedParts = typeof request.forwardedFor === 'string'
    ? request.forwardedFor.split(',').map((part) => part.trim()).filter((part) => part.length > 0)
    : [];
  const forwarded = forwardedParts.length > 0 ? forwardedParts[forwardedParts.length - 1] : '';
  const address = forwarded.length > 0 ? forwarded : (request.ip ?? '').trim();
  if (address.length > 0) {
    keys.push(probeHash(`ip:${address}`));
    const network = networkOf(address);
    if (network !== null) keys.push(probeHash(`net:${network}`));
  }
  if (keys.length === 0) keys.push(probeHash('unknown'));
  return Object.freeze(keys);
}

export async function handleAccountsV2DeletionStatus(
  db: Firestore,
  request: AccountsV2DeletionStatusRequest,
  deps: AccountsV2DeletionStatusDeps,
): Promise<DeletionStatusResult> {
  const read = await deps.flags.read();
  if (!read.ok) {
    console.warn(`${LOG} status reject reason=flag_unavailable reads=0`);
    throw new HttpsError('unavailable', 'retryable', { final: false });
  }
  if (!read.flags.deletionPurgeEnabled) {
    console.warn(`${LOG} status reject reason=accounts_v2_disabled reads=0`);
    throw new HttpsError('failed-precondition', 'accounts_v2_disabled', { final: true, code: 'accounts_v2_disabled' });
  }
  const raw = (typeof request.data === 'object' && request.data !== null ? request.data : {}) as Record<string, unknown>;
  const nudge = raw.nudge === true;
  const maxCommits = accountsV2PurgeMaxCommitsForBudget(
    ACCOUNTS_V2_DELETION_STATUS_TIMEOUT_SECONDS * 1000 - ACCOUNTS_V2_DELETION_STATUS_RESERVE_MS,
  );
  const status = deps.status ?? accountsV2DeletionStatusForCallable;
  return status(db, raw, { nudge, maxCommits, probe: { limiter: deps.limiter, keys: accountsV2DeletionProbeKeys(request) } });
}

const DEFAULT_LIMITER = createDeletionProbeLimiter();

function headerOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null;
}

/** Экспортируется из index.ts; выключена флагом (по умолчанию выкл). */
export const accountsV2DeletionStatus = onCall(ACCOUNTS_V2_DELETION_STATUS_OPTIONS, (request) => {
  const db = admin.firestore();
  return handleAccountsV2DeletionStatus(
    db,
    {
      auth: request.auth ?? null,
      data: request.data,
      ip: request.rawRequest?.ip ?? null,
      forwardedFor: headerOf(request.rawRequest?.headers?.['x-forwarded-for']),
    },
    { flags: accountsV2FlagsReader(db), limiter: DEFAULT_LIMITER },
  );
});
