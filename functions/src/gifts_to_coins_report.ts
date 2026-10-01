/**
 * D51/D53: строка-итог миграции «Подарки и спины → монеты».
 *
 * зачем (владелец 2026-09-24, D53): миграция идёт на телефоне (данные подарков
 * физически есть только там), а владельцу нужен контроль в админке — сколько
 * людей прошло, сколько предметов и монет выдано. Одна запись на аккаунт:
 * `gifts_to_coins_migrations/{stableUid}`.
 *
 * Запись информационная: деньги отсюда не читаются и не начисляются (монеты
 * уже лежат в рунном журнале `star_operations`). Поэтому сервер только
 * проверяет форму и границы и не доверяет клиенту ничего, кроме счётчиков.
 * Персональных данных нет: только внутренний id, числа и время.
 *
 * Стоимость: один вызов на аккаунт за всю жизнь миграции (повтор с тем же
 * run — одна транзакция чтения без записи). Коллекция закрыта правилом
 * (чтение — админ, запись — только этот callable).
 *
 * ⚠️ Требует деплоя functions с согласия владельца (D91: прицельно, после
 * релиза клиента 2.0). Правило коллекции в firestore.rules уже есть.
 *
 * зачем (Q12, 2026-10-01): восстановлено после удаления в efe19ae9d; таблица
 * medium.v2 (без жемчуга, энергия 0) и новый источник season_pass (D53).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { ENFORCE_APP_CHECK } from './callable_options';

export const GIFTS_TO_COINS_REPORT_COLLECTION = 'gifts_to_coins_migrations';

const COUNT_KEYS = [
  'spin_credit', 'spin_prize', 'paid_spin', 'level_gift', 'daily_journey', 'season_pass', 'plus_days',
] as const;
const EXPIRED_KEYS = ['spin_prize', 'level_gift', 'season_pass'] as const;
const CORRUPT_SOURCES = new Set(['spin_state', 'spin_journal', 'level_gifts', 'daily_journey', 'season_pass']);
const MAX_COUNT = 10_000;
/** Верхняя граница суммы: 20 спинов × 300 + сотни подарков — с запасом, но не бесконечность. */
const MAX_TOTAL_COINS = 5_000_000;

export type GiftsToCoinsReportRow = Readonly<{
  stableUid: string;
  migrationVersion: 'g2c.v1';
  tableVersion: 'medium.v2';
  run: number;
  counts: Readonly<Record<typeof COUNT_KEYS[number], number>>;
  expired: Readonly<Record<typeof EXPIRED_KEYS[number], number>>;
  cappedSpins: number;
  totalCoins: number;
  corruptSources: readonly string[];
  clientDoneAtMs: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function boundedInt(value: unknown, max: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > max) {
    throw new HttpsError('invalid-argument', 'gifts_to_coins_report_number_invalid');
  }
  return Number(value);
}

function countRecord<K extends string>(value: unknown, keys: readonly K[]): Record<K, number> {
  if (!isRecord(value) || Object.keys(value).some((key) => !(keys as readonly string[]).includes(key))) {
    throw new HttpsError('invalid-argument', 'gifts_to_coins_report_counts_invalid');
  }
  return Object.fromEntries(keys.map((key) => [key, boundedInt(value[key] ?? 0, MAX_COUNT)])) as Record<K, number>;
}

/** Строгая проверка входа. Экспортируется для тестов. */
export function parseGiftsToCoinsReport(input: unknown, stableUid: string): GiftsToCoinsReportRow {
  if (!isRecord(input)) throw new HttpsError('invalid-argument', 'gifts_to_coins_report_invalid');
  if (input.migrationVersion !== 'g2c.v1' || input.tableVersion !== 'medium.v2') {
    throw new HttpsError('invalid-argument', 'gifts_to_coins_report_version_invalid');
  }
  const corrupt = Array.isArray(input.corruptSources) ? input.corruptSources : null;
  if (!corrupt || corrupt.length > CORRUPT_SOURCES.size
    || corrupt.some((source) => typeof source !== 'string' || !CORRUPT_SOURCES.has(source))) {
    throw new HttpsError('invalid-argument', 'gifts_to_coins_report_corrupt_sources_invalid');
  }
  const totalCoins = boundedInt(input.totalCoins, MAX_TOTAL_COINS);
  if (totalCoins % 10 !== 0) throw new HttpsError('invalid-argument', 'gifts_to_coins_report_total_invalid');
  return Object.freeze({
    stableUid,
    migrationVersion: 'g2c.v1',
    tableVersion: 'medium.v2',
    run: Math.max(1, boundedInt(input.run, 1_000)),
    counts: Object.freeze(countRecord(input.counts, COUNT_KEYS)),
    expired: Object.freeze(countRecord(input.expired, EXPIRED_KEYS)),
    cappedSpins: boundedInt(input.cappedSpins, MAX_COUNT),
    totalCoins,
    corruptSources: Object.freeze([...corrupt] as string[]),
    clientDoneAtMs: boundedInt(input.clientDoneAtMs, Number.MAX_SAFE_INTEGER),
  });
}

export const giftsToCoinsMigrationReport = onCall({
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
  let row: GiftsToCoinsReportRow;
  try {
    row = parseGiftsToCoinsReport(data, stableUid);
  } catch (error) {
    console.warn('[GIFTS-TO-COINS] report rejected', {
      reason: error instanceof HttpsError ? error.message : String(error),
    });
    throw error;
  }
  const ref = db.collection(GIFTS_TO_COINS_REPORT_COLLECTION).doc(stableUid);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    const previousRun = Number(existing.data()?.run ?? 0);
    // Та же или более ранняя попытка — ничего не пишем (идемпотентно).
    if (existing.exists && previousRun >= row.run) {
      console.log('[GIFTS-TO-COINS] report replayed', { run: row.run, previousRun });
      return { ok: true as const, replayed: true };
    }
    tx.set(ref, {
      ...row,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('[GIFTS-TO-COINS] report stored', {
      run: row.run, totalCoins: row.totalCoins, corrupt: row.corruptSources.length,
    });
    return { ok: true as const, replayed: false };
  });
});
