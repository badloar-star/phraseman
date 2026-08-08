// ═══════════════════════════════════════════════════════════════════════════
// coin_exchange.ts — серверная биржа «монеты → звёзды» (план 2026-07-20, §6).
//
// Модель:
// - economy/exchange — единственный серверный документ курса (создаётся лениво
//   с дефолтами). Клиент курс не считает и не читает напрямую (rules: deny).
// - economy_exchange_history/{date} — суточный агрегат (UTC): объёмы пишут
//   каждая сделка, курс/причину — scheduled recalc ('auto') или админ ('manual').
// - coin_exchange_trades/{tradeId} — append-only журнал сделок. tradeId
//   детерминирован: `${uid}_${idempotencyKey}` → повторный вызов с тем же
//   ключом возвращает прежний результат, не списывая монеты дважды.
// - Кошелёк звёзд: users/{uid}.v2_access_stars (+ append-only подколлекция
//   users/{uid}/v2_star_journal). Монеты = переименованные осколки, баланс —
//   существующее поле users/{uid}.shards (миграция 1:1), дебет идёт через
//   ту же транзакцию, что и shardsApplyDelta (здесь — внутренний дебет, без
//   клиентского каталога earn/spend).
//
// Manual override: adminSetCoinExchangeRate выставляет currentRate и
// manualOverride{rate, reason, byUid, at}. Override действует ДО ближайшего
// scheduled recalc: recalc всегда считает следующий курс от currentRate
// (т.е. от ручного курса как новой стартовой точки) и сбрасывает
// manualOverride в null. Это задокументированное поведение, а не баг.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { createAuditRecord } from './admin/audit_contract';
import {
  COIN_EXCHANGE_TRADES_COLLECTION,
  DEFAULT_COIN_EXCHANGE_CONFIG,
  EXCHANGE_DOC_PATH,
  EXCHANGE_HISTORY_COLLECTION,
  RECALC_SCHEDULE,
  RECALC_TIMEZONE,
  V2_ACCESS_STARS_FIELD,
  V2_ACCESS_STARS_UPDATED_AT_MS_FIELD,
  V2_STAR_JOURNAL_SUBCOLLECTION,
  computeExchangeOutcome,
  computeNextExchangeRate,
  computeNextRecalcAtMs,
  aggregateCoinTradeStats,
  normalizeCoinCenterManualOverride,
  normalizeCoinExchangeConfig,
  projectCoinCenterHistoryPoint,
  projectCoinCenterOverrideAudit,
  previousUtcExchangeDayKey,
  readNonNegativeBalance,
  utcExchangeDayKey,
  validateAdminSetRateInput,
  validateExchangeCoinsAmount,
  validateExchangeHistoryDays,
  validateExchangeIdempotencyKey,
  type CoinExchangeConfig,
} from './coin_exchange_core';

const REGION = 'us-central1';

type Row = Record<string, unknown>;

function requireAdminPermission(
  request: { auth?: { uid?: string; token?: Row } | null },
  permission: AdminPermission,
): { actorUid: string; role: AdminRole } {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  if (!hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
  return { actorUid: String(request.auth.uid), role };
}

async function resolveCallerStableUid(authUid: string): Promise<string> {
  const db = admin.firestore();
  const resolved = await resolveStableUidForAuth(
    db,
    authUid,
    undefined,
    { repairLinks: false, requireKnownIdentity: true },
  );
  if (typeof resolved !== 'string' || !resolved) {
    throw new HttpsError('permission-denied', 'Exchange caller identity mismatch');
  }
  return resolved;
}

function quoteFromConfig(cfg: CoinExchangeConfig, nextRecalcAtMs: number | null) {
  return {
    rate: cfg.currentRate,
    corridorMin: cfg.corridorMin,
    corridorMax: cfg.corridorMax,
    nextRecalcAt: nextRecalcAtMs !== null ? new Date(nextRecalcAtMs).toISOString() : null,
  };
}

function readNextRecalcAtMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (value && typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === 'function') {
      try {
        const ms = Number(v.toMillis()) || 0;
        return ms > 0 ? ms : null;
      } catch { /* fallthrough */ }
    }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
  }
  return null;
}

// ── getCoinExchangeQuote ────────────────────────────────────────────────────

export const getCoinExchangeQuote = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const db = admin.firestore();
  const snap = await db.doc(EXCHANGE_DOC_PATH).get();
  const cfg = normalizeCoinExchangeConfig(snap.data());
  const nextRecalcAtMs = readNextRecalcAtMs(snap.data()?.nextRecalcAt)
    ?? computeNextRecalcAtMs(Date.now());
  return quoteFromConfig(cfg, nextRecalcAtMs);
});

// ── getCoinExchangeHistory ──────────────────────────────────────────────────

export const getCoinExchangeHistory = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const daysCount = validateExchangeHistoryDays((request.data as Row | undefined)?.days);
  const db = admin.firestore();
  const snap = await db
    .collection(EXCHANGE_HISTORY_COLLECTION)
    .orderBy('date', 'desc')
    .limit(daysCount)
    .get();
  const points = snap.docs
    .map((doc) => {
      const d = doc.data() as Row;
      return {
        date: typeof d.date === 'string' ? d.date : doc.id,
        rate: readNonNegativeBalance(d.rate),
        volume: readNonNegativeBalance(d.volumeCoins),
      };
    })
    .filter((p) => p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { points };
});

// ── exchangeCoinsForStars ───────────────────────────────────────────────────

export const exchangeCoinsForStars = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const data = (request.data ?? {}) as Row;
  const coinsV = validateExchangeCoinsAmount(data.coins);
  if (!coinsV.ok) throw new HttpsError('invalid-argument', coinsV.message);
  const keyV = validateExchangeIdempotencyKey(data.idempotencyKey);
  if (!keyV.ok) throw new HttpsError('invalid-argument', keyV.message);
  const coins = coinsV.value;
  const idempotencyKey = keyV.value;

  const uid = await resolveCallerStableUid(request.auth.uid);
  const db = admin.firestore();
  const userRef = db.collection('users').doc(uid);
  const exchangeRef = db.doc(EXCHANGE_DOC_PATH);
  const tradeRef = db.collection(COIN_EXCHANGE_TRADES_COLLECTION).doc(`${uid}_${idempotencyKey}`);
  const journalRef = userRef.collection(V2_STAR_JOURNAL_SUBCOLLECTION).doc(idempotencyKey);
  const todayKey = utcExchangeDayKey(Date.now());
  const historyRef = db.collection(EXCHANGE_HISTORY_COLLECTION).doc(todayKey);

  return db.runTransaction(async (tx) => {
    const [exchangeSnap, tradeSnap, userSnap] = await Promise.all([
      tx.get(exchangeRef),
      tx.get(tradeRef),
      tx.get(userRef),
    ]);
    const cfg = normalizeCoinExchangeConfig(exchangeSnap.data());
    const outcome = computeExchangeOutcome({
      existingTrade: tradeSnap.exists ? tradeSnap.data() : null,
      coinBalance: userSnap.data()?.shards,
      starBalance: userSnap.data()?.[V2_ACCESS_STARS_FIELD],
      coins,
      rate: cfg.currentRate,
    });

    if (outcome.kind === 'replay') {
      return { starsGranted: outcome.starsGranted, rateUsed: outcome.rateUsed };
    }
    if (outcome.kind === 'insufficient') {
      throw new HttpsError('failed-precondition', 'insufficient_coins');
    }

    // Ленивая инициализация документа курса (первый обмен в системе).
    if (!exchangeSnap.exists) {
      tx.set(exchangeRef, {
        ...DEFAULT_COIN_EXCHANGE_CONFIG,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        nextRecalcAt: computeNextRecalcAtMs(Date.now()),
        manualOverride: null,
      });
    }

    tx.set(userRef, {
      shards: outcome.nextCoinBalance,
      shards_updated_at_ms: Date.now(),
      shards_updated_op: 'spend',
      shards_updated_reason: 'coin_exchange',
      [V2_ACCESS_STARS_FIELD]: outcome.nextStarBalance,
      [V2_ACCESS_STARS_UPDATED_AT_MS_FIELD]: Date.now(),
    }, { merge: true });
    tx.set(journalRef, {
      source: 'coin_exchange',
      tradeId: tradeRef.id,
      delta: outcome.starsGranted,
      balanceAfter: outcome.nextStarBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(tradeRef, {
      uid,
      coins: outcome.coins,
      stars: outcome.starsGranted,
      rate: outcome.rateUsed,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      idempotencyKey,
    });
    tx.set(historyRef, {
      date: todayKey,
      volumeCoins: admin.firestore.FieldValue.increment(outcome.coins),
      volumeStars: admin.firestore.FieldValue.increment(outcome.starsGranted),
      trades: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

    return { starsGranted: outcome.starsGranted, rateUsed: outcome.rateUsed };
  });
});

// ── adminSetCoinExchangeRate ────────────────────────────────────────────────

export const adminSetCoinExchangeRate = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const actor = requireAdminPermission(
    request as { auth?: { uid?: string; token?: Row } },
    'application.config.write',
  );
  const db = admin.firestore();
  const exchangeRef = db.doc(EXCHANGE_DOC_PATH);

  // Коридор читаем из текущего документа (или дефолты), чтобы валидировать rate.
  const preSnap = await exchangeRef.get();
  const preCfg = normalizeCoinExchangeConfig(preSnap.data());
  const validated = validateAdminSetRateInput(
    request.data,
    preCfg.corridorMin,
    preCfg.corridorMax,
  );
  if (!validated.ok) throw new HttpsError('invalid-argument', validated.message);
  const { rate, reason } = validated.value;

  const todayKey = utcExchangeDayKey(Date.now());
  const historyRef = db.collection(EXCHANGE_HISTORY_COLLECTION).doc(todayKey);
  const auditRef = db.collection('admin_log').doc();
  const nowIso = new Date().toISOString();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(exchangeRef);
    const before = normalizeCoinExchangeConfig(snap.data());
    tx.set(exchangeRef, {
      ...before,
      currentRate: rate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      manualOverride: { rate, reason, byUid: actor.actorUid, at: nowIso },
      nextRecalcAt: computeNextRecalcAtMs(Date.now()),
    });
    tx.set(historyRef, {
      date: todayKey,
      rate,
      reason: 'manual',
    }, { merge: true });
    tx.set(auditRef, createAuditRecord({
      action: 'coin_exchange_set_rate',
      actorUid: actor.actorUid,
      role: actor.role,
      entity: { collection: 'economy', id: 'exchange' },
      reason,
      before: { currentRate: before.currentRate },
      after: { currentRate: rate },
      requestId: auditRef.id,
      timestamp: nowIso,
    }));
    return { ok: true, rate, corridorMin: before.corridorMin, corridorMax: before.corridorMax };
  });
});

// ── recalcCoinExchangeRate (scheduled, ежедневно 04:17 UTC) ─────────────────

export const recalcCoinExchangeRate = onSchedule(
  { schedule: RECALC_SCHEDULE, timeZone: RECALC_TIMEZONE, region: REGION },
  async () => {
    const db = admin.firestore();
    const exchangeRef = db.doc(EXCHANGE_DOC_PATH);
    const nowMs = Date.now();
    const yesterdayKey = previousUtcExchangeDayKey(nowMs);
    const historyRef = db.collection(EXCHANGE_HISTORY_COLLECTION).doc(yesterdayKey);

    await db.runTransaction(async (tx) => {
      const [exchangeSnap, historySnap] = await Promise.all([
        tx.get(exchangeRef),
        tx.get(historyRef),
      ]);
      const cfg = normalizeCoinExchangeConfig(exchangeSnap.data());
      const yesterdayVolumeCoins = readNonNegativeBalance(historySnap.data()?.volumeCoins);
      const result = computeNextExchangeRate({ config: cfg, yesterdayVolumeCoins });

      // Manual override уважается до этого момента: пересчёт стартует от
      // currentRate (который админ мог выставить вручную) и сбрасывает override.
      tx.set(exchangeRef, {
        ...cfg,
        currentRate: result.nextRate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        nextRecalcAt: computeNextRecalcAtMs(nowMs),
        manualOverride: null,
      });
      tx.set(historyRef, {
        date: yesterdayKey,
        rate: result.nextRate,
        reason: 'auto',
      }, { merge: true });
      console.log('[coinExchange] recalc', {
        date: yesterdayKey,
        volumeCoins: yesterdayVolumeCoins,
        demandRatio: result.demandRatio,
        direction: result.direction,
        from: cfg.currentRate,
        to: result.nextRate,
      });
    });
  },
);

// ── adminGetCoinExchangeCenter (Центр монет Admin V2) ───────────────────────
//
// Контракт ответа (admin/v2/scripts/admin-core.js → normalizeCoinCenterResult):
// {
//   exchange: { rate, baseRate, corridorMin, corridorMax, nextRecalcAtMs,
//     updatedAtMs, manualOverride: null | { rate, reason, author, atMs } },
//   history: [{ date, rate, volumeCoins, volumeStars, source: 'auto'|'manual' }],
//   stats24h: { volumeCoins, volumeStars, trades, uniqueUsers, totalCoins },
//   overrides: [{ rate, reason, author, atMs }],
// }
//
// stats24h.totalCoins: суммарный баланс монет всех пользователей не считается
// (требовал бы полного скана users) — возвращаем null; UI принимает null.
// stats24h считается по журналу coin_exchange_trades за последние 24 часа
// (окно ограничено SCAN лимитом; за пределами — честная недосказанность,
// см. stats24hTruncated).

const STATS_24H_SCAN_LIMIT = 2000;
const OVERRIDE_AUDIT_LIMIT = 20;

export const adminGetCoinExchangeCenter = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  requireAdminPermission(request as { auth?: { uid?: string; token?: Row } }, 'money.read');
  const rangeDays = validateExchangeHistoryDays((request.data as Row | undefined)?.rangeDays);
  const db = admin.firestore();
  const nowMs = Date.now();

  const [exchangeSnap, historySnap, tradesSnap, auditSnap] = await Promise.all([
    db.doc(EXCHANGE_DOC_PATH).get(),
    db.collection(EXCHANGE_HISTORY_COLLECTION).orderBy('date', 'desc').limit(rangeDays).get(),
    db.collection(COIN_EXCHANGE_TRADES_COLLECTION)
      .where('createdAt', '>=', new Date(nowMs - 24 * 60 * 60 * 1000))
      .limit(STATS_24H_SCAN_LIMIT)
      .get(),
    db.collection('admin_log')
      .where('action', '==', 'coin_exchange_set_rate')
      .orderBy('timestamp', 'desc')
      .limit(OVERRIDE_AUDIT_LIMIT)
      .get(),
  ]);

  const exchangeRow = exchangeSnap.data() ?? {};
  const cfg = normalizeCoinExchangeConfig(exchangeRow);
  const stats = aggregateCoinTradeStats(
    tradesSnap.docs.map((doc) => doc.data() as Row),
  );

  return {
    exchange: {
      rate: cfg.currentRate,
      baseRate: cfg.baseRate,
      corridorMin: cfg.corridorMin,
      corridorMax: cfg.corridorMax,
      nextRecalcAtMs: readNextRecalcAtMs(exchangeRow.nextRecalcAt) ?? computeNextRecalcAtMs(nowMs),
      updatedAtMs: readNextRecalcAtMs(exchangeRow.updatedAt) ?? 0,
      manualOverride: normalizeCoinCenterManualOverride(exchangeRow.manualOverride),
    },
    history: historySnap.docs
      .map((doc) => projectCoinCenterHistoryPoint(doc.id, doc.data()))
      .sort((a, b) => a.date.localeCompare(b.date)),
    stats24h: { ...stats, totalCoins: null },
    stats24hTruncated: tradesSnap.size >= STATS_24H_SCAN_LIMIT,
    overrides: auditSnap.docs
      .map((doc) => projectCoinCenterOverrideAudit(doc.data()))
      .filter((entry) => entry !== null),
  };
});
