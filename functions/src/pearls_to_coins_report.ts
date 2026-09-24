/**
 * PM-059 (D15/D53): строка-итог миграции «остаток жемчуга → монеты 1:10».
 *
 * зачем (владелец 2026-09-24): миграция идёт на телефоне (журнал жемчуга —
 * клиентский), а владельцу нужен контроль: сколько людей перевели остаток,
 * сколько жемчуга и монет. Одна запись на аккаунт:
 * `pearls_to_coins_migrations/{stableUid}` (последний прогон + суммы за всё время).
 *
 * Запись информационная: деньги отсюда не читаются и не начисляются (монеты
 * уже лежат в рунном журнале, жемчуг списан клиентским журналом). Сервер только
 * проверяет форму и границы. Персональных данных нет: внутренний id, числа, время.
 *
 * Стоимость: один вызов на прогон (обычно один за жизнь аккаунта); повтор с тем
 * же run — одна транзакция чтения без записи. Коллекция закрыта правилом.
 *
 * ⚠️ ТРЕБУЕТ ДЕПЛОЯ functions и firestore.rules С СОГЛАСИЯ ВЛАДЕЛЬЦА (D32:
 * деньги). До деплоя клиент копит попытки (до 20) и сдаётся — миграцию это не держит.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';

export const PEARLS_TO_COINS_REPORT_COLLECTION = 'pearls_to_coins_migrations';

const RATE = 10;
/** Потолок клиента: 1000 операций × 2000 монет = 2 млн монет = 200 000 жемчуга за прогон. */
const MAX_RUN_PEARLS = 200_000;
const MAX_LIFETIME_PEARLS = 10_000_000;

export type PearlsToCoinsReportRow = Readonly<{
  stableUid: string;
  migrationVersion: 'p2c.v1';
  rate: 10;
  run: number;
  pearls: number;
  totalCoins: number;
  lifetimePearls: number;
  lifetimeCoins: number;
  clientDoneAtMs: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function boundedInt(value: unknown, max: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > max) {
    throw new HttpsError('invalid-argument', 'pearls_to_coins_report_number_invalid');
  }
  return Number(value);
}

/** Строгая проверка входа. Экспортируется для тестов. */
export function parsePearlsToCoinsReport(input: unknown, stableUid: string): PearlsToCoinsReportRow {
  if (!isRecord(input)) throw new HttpsError('invalid-argument', 'pearls_to_coins_report_invalid');
  if (input.migrationVersion !== 'p2c.v1' || input.rate !== RATE) {
    throw new HttpsError('invalid-argument', 'pearls_to_coins_report_version_invalid');
  }
  const pearls = boundedInt(input.pearls, MAX_RUN_PEARLS);
  const totalCoins = boundedInt(input.totalCoins, MAX_RUN_PEARLS * RATE);
  const lifetimePearls = boundedInt(input.lifetimePearls, MAX_LIFETIME_PEARLS);
  const lifetimeCoins = boundedInt(input.lifetimeCoins, MAX_LIFETIME_PEARLS * RATE);
  // Курс проверяется, а не принимается на веру: монеты ровно ×10.
  if (pearls < 1 || totalCoins !== pearls * RATE || lifetimeCoins !== lifetimePearls * RATE
    || lifetimePearls < pearls) {
    throw new HttpsError('invalid-argument', 'pearls_to_coins_report_amount_invalid');
  }
  return Object.freeze({
    stableUid,
    migrationVersion: 'p2c.v1',
    rate: RATE,
    run: Math.max(1, boundedInt(input.run, 1_000)),
    pearls,
    totalCoins,
    lifetimePearls,
    lifetimeCoins,
    clientDoneAtMs: boundedInt(input.clientDoneAtMs, Number.MAX_SAFE_INTEGER),
  });
}

export const pearlsToCoinsMigrationReport = onCall({
  region: 'us-central1',
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
  // Разовый вызов на аккаунт: много инстансов не нужно.
  maxInstances: 10,
}, async (request): Promise<{ ok: true; replayed: boolean }> => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const data = isRecord(request.data) ? request.data : {};
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, data.ownerStableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  const row = parsePearlsToCoinsReport(data, stableUid);
  const ref = db.collection(PEARLS_TO_COINS_REPORT_COLLECTION).doc(stableUid);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const previousRun = Number(existing.data()?.run ?? 0);
    // Та же или более ранняя попытка — ничего не пишем (идемпотентно).
    if (existing.exists && previousRun >= row.run) {
      console.log('[PEARLS-TO-COINS] report replayed', { run: row.run, previousRun });
      return { ok: true as const, replayed: true };
    }
    tx.set(ref, {
      ...row,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[PEARLS-TO-COINS] report stored', {
      run: row.run, pearls: row.pearls, totalCoins: row.totalCoins,
    });
    return { ok: true as const, replayed: false };
  });
});
