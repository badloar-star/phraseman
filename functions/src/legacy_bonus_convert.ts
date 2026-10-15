import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { arenaSeasonWindow } from './arena_v2_core';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { getWeekKey } from './progress_events';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

/**
 * D195 (владелец 15.10): все старые бонусы → монеты, один раз на человека.
 *
 * Курсы «Средне»: опыт ×0,1, жемчуг ×10, вращение уровня = 130 монет; потолок 5 000 на валюту и 6 000 на человека.
 * Руны — уже монеты (D03). Реферальные вращения НЕ конвертируются (живая рулетка).
 *
 * ИСТОЧНИКИ — только серверные поля, которые клиент писать не может и у которых больше нет писателей:
 *  - опыт: users/{id}.progressServerState.totalXp (на 15.10 — 239 человек);
 *  - жемчуг: users/{id}.shards (правила: hasNoShardWrites / newDocHasNoShardWrites);
 *  - вращения: users/{id}.levelSpinServerState.balance.
 * Значения с телефона (журналы, квитанции, client_economy_opening) не принимаются — иначе накрутка подменой числа.
 * Поля заморожены, поэтому отдельный снимок не нужен: что лежит на сервере сейчас, то лежало и при объявлении.
 *
 * Идемпотентно: метка users/{id}.legacyBonusConvertedV1 и расписки star_operations по opId (legacy_bonus:v1.<валюта>) в одной
 * транзакции; повтор возвращает прежний итог. Скрытые слиянием документы (identityHidden / чужой canonicalStableId) — 0.
 * Выключатель: remote_config/app.bools.legacy_bonus_enabled — пока не true, ничего не пишется (status=disabled).
 * App Check НЕ включаем: общие HOT_CALLABLE_OPTIONS (пломба 2026-08-17).
 */

const LOG = '[LEGACY-BONUS]';

export const LEGACY_BONUS_V1_FIELD = 'legacyBonusConvertedV1' as const;
export const LEGACY_BONUS_FLAG_KEY = 'legacy_bonus_enabled' as const;
/**
 * Документ человека создан ДО выхода 2.0 (сборка 16.10) — значит, человек обновился с 1.x.
 * зачем (владелец 15.10 через координатора): окно «Встречайте PhraseMan 2.0» показываем и при нулевом начислении, но только
 * обновившимся; на свежей установке окна нет. Время создания — служебное поле Firestore (createTime), клиент его не задаёт.
 */
export const LEGACY_BONUS_UPGRADE_CUTOFF_MS = Date.UTC(2026, 9, 16, 0, 0, 0);

export const LEGACY_BONUS_RATES_V1 = Object.freeze({
  xpToCoins: 0.1,
  pearlToCoins: 10,
  levelSpinToCoins: 130,
  capPerCurrency: 5_000,
  capPerPerson: 6_000,
});

export type LegacyBonusCurrency = 'xp' | 'pearls' | 'spins';

export type LegacyBonusSource = Readonly<{ xp: number; pearls: number; spins: number }>;

export type LegacyBonusPlan = Readonly<{
  from: LegacyBonusSource;
  coins: Readonly<{ xp: number; pearls: number; spins: number; total: number }>;
  cappedBy: 'none' | 'currency' | 'person';
}>;

export type LegacyBonusStatus = 'converted' | 'replayed' | 'nothing' | 'merged_orphan' | 'disabled';

export type LegacyBonusResponse = Readonly<{
  status: LegacyBonusStatus;
  /** Человек обновился с 1.x (документ создан до выхода 2.0). */
  upgraded: boolean;
  from: LegacyBonusSource;
  coins: LegacyBonusPlan['coins'];
  cappedBy: LegacyBonusPlan['cappedBy'];
  starsBalance: number;
  starsSeq: number;
}>;

const ZERO_SOURCE: LegacyBonusSource = Object.freeze({ xp: 0, pearls: 0, spins: 0 });
const ZERO_COINS: LegacyBonusPlan['coins'] = Object.freeze({ xp: 0, pearls: 0, spins: 0, total: 0 });

function nonNegativeInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Чистое решение: сколько монет за что. Потолок валюты → потолок человека (срезаем по порядку жемчуг, опыт, вращения не трогаем). */
export function planLegacyBonus(source: LegacyBonusSource, rates = LEGACY_BONUS_RATES_V1): LegacyBonusPlan {
  const from = Object.freeze({ xp: nonNegativeInt(source.xp), pearls: nonNegativeInt(source.pearls), spins: nonNegativeInt(source.spins) });
  let cappedBy: LegacyBonusPlan['cappedBy'] = 'none';
  const perCurrency = (raw: number): number => {
    if (raw > rates.capPerCurrency) {
      cappedBy = 'currency';
      return rates.capPerCurrency;
    }
    return raw;
  };
  let xp = perCurrency(Math.floor(from.xp * rates.xpToCoins));
  let pearls = perCurrency(Math.floor(from.pearls * rates.pearlToCoins));
  const spins = perCurrency(Math.floor(from.spins * rates.levelSpinToCoins));
  let total = xp + pearls + spins;
  if (total > rates.capPerPerson) {
    cappedBy = 'person';
    let excess = total - rates.capPerPerson;
    const cutPearls = Math.min(pearls, excess);
    pearls -= cutPearls;
    excess -= cutPearls;
    const cutXp = Math.min(xp, excess);
    xp -= cutXp;
    total = xp + pearls + spins;
  }
  return Object.freeze({ from, coins: Object.freeze({ xp, pearls, spins, total }), cappedBy });
}

/** Источник из документа users/{id}: только серверные поля. */
export function legacyBonusSourceFromUserDoc(data: Record<string, unknown> | undefined): LegacyBonusSource {
  const progressServerState = (data?.progressServerState ?? {}) as Record<string, unknown>;
  const levelSpinServerState = (data?.levelSpinServerState ?? {}) as Record<string, unknown>;
  return Object.freeze({
    xp: nonNegativeInt(progressServerState.totalXp),
    pearls: nonNegativeInt(data?.shards),
    spins: nonNegativeInt(levelSpinServerState.balance),
  });
}

function ledgerOps(plan: LegacyBonusPlan, nowMs: number): StarOpRequest[] {
  const entries: Array<[LegacyBonusCurrency, number, number]> = [
    ['xp', plan.coins.xp, plan.from.xp],
    ['pearls', plan.coins.pearls, plan.from.pearls],
    ['spins', plan.coins.spins, plan.from.spins],
  ];
  return entries.filter(([, coins]) => coins > 0).map(([currency, coins, fromAmount]) => Object.freeze({
    opId: `legacy_bonus:v1.${currency}`,
    delta: coins,
    // grant: подарок за старое, не заработок — не двигает earnedTotal и очки лиги
    reason: 'legacy_bonus' as const,
    sourceKind: 'legacy_bonus_v1',
    sourceId: currency,
    ruleVersion: 1,
    earnedAtMs: nowMs,
    meta: Object.freeze({ currency, from: fromAmount }),
  }));
}

type PriorRecord = Readonly<{ status: LegacyBonusStatus; upgraded: boolean; from: LegacyBonusSource; coins: LegacyBonusPlan['coins']; cappedBy: LegacyBonusPlan['cappedBy'] }>;

function parsePrior(value: unknown): PriorRecord | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1) return null;
  const from = (raw.from ?? {}) as Record<string, unknown>;
  const coins = (raw.coins ?? {}) as Record<string, unknown>;
  return Object.freeze({
    status: (raw.status as LegacyBonusStatus) ?? 'converted',
    upgraded: raw.upgraded === true,
    from: Object.freeze({ xp: nonNegativeInt(from.xp), pearls: nonNegativeInt(from.pearls), spins: nonNegativeInt(from.spins) }),
    coins: Object.freeze({ xp: nonNegativeInt(coins.xp), pearls: nonNegativeInt(coins.pearls), spins: nonNegativeInt(coins.spins), total: nonNegativeInt(coins.total) }),
    cappedBy: raw.cappedBy === 'currency' || raw.cappedBy === 'person' ? raw.cappedBy : 'none',
  });
}

export async function runLegacyBonusConvertV1(
  db: admin.firestore.Firestore,
  input: Readonly<{ authUid: string; stableUid: string; nowMs: number }>,
): Promise<LegacyBonusResponse> {
  const { authUid, stableUid, nowMs } = input;
  const uid8 = stableUid.slice(0, 8);
  const userRef = db.collection('users').doc(stableUid);
  return db.runTransaction(async (tx) => {
    beginStarLedgerTransactionAttempt(tx);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      console.warn(`${LOG} reject reason=user_missing uid=${uid8}`);
      throw new HttpsError('failed-precondition', 'legacy_bonus_user_missing');
    }
    const data = userSnap.data() ?? {};
    const starsNow = normalizeStars(data.stars);
    const createdMs = userSnap.createTime ? userSnap.createTime.toMillis() : Number.POSITIVE_INFINITY;
    const upgraded = createdMs < LEGACY_BONUS_UPGRADE_CUTOFF_MS;
    const prior = parsePrior(data[LEGACY_BONUS_V1_FIELD]);
    if (prior) {
      console.log(`${LOG} replay uid=${uid8} status=${prior.status} total=${prior.coins.total} balance=${starsNow.balance}`);
      return Object.freeze({ status: 'replayed' as const, upgraded: prior.upgraded, from: prior.from, coins: prior.coins, cappedBy: prior.cappedBy, starsBalance: starsNow.balance, starsSeq: starsNow.seq });
    }
    const canonical = typeof data.canonicalStableId === 'string' ? data.canonicalStableId : '';
    if (data.identityHidden === true || (canonical && canonical !== stableUid)) {
      // скрытый слиянием документ: его бонусы — забота победителя слияния; закрываем без начисления
      tx.set(userRef, { [LEGACY_BONUS_V1_FIELD]: { schemaVersion: 1, status: 'merged_orphan', upgraded, from: ZERO_SOURCE, coins: ZERO_COINS, cappedBy: 'none', atMs: nowMs } }, { merge: true }); // guard-ok: запись внутри транзакции, её фиксирует runTransaction
      console.warn(`${LOG} closed uid=${uid8} status=merged_orphan canonical=${canonical.slice(0, 8)}`);
      return Object.freeze({ status: 'merged_orphan' as const, upgraded, from: ZERO_SOURCE, coins: ZERO_COINS, cappedBy: 'none' as const, starsBalance: starsNow.balance, starsSeq: starsNow.seq });
    }
    const source = legacyBonusSourceFromUserDoc(data);
    const plan = planLegacyBonus(source);
    console.log(`${LOG} plan uid=${uid8} upgraded=${upgraded} from=${JSON.stringify(plan.from)} coins=${JSON.stringify(plan.coins)} cappedBy=${plan.cappedBy}`);
    if (plan.coins.total === 0) {
      tx.set(userRef, { [LEGACY_BONUS_V1_FIELD]: { schemaVersion: 1, status: 'nothing', upgraded, from: plan.from, coins: plan.coins, cappedBy: plan.cappedBy, atMs: nowMs } }, { merge: true }); // guard-ok: запись внутри транзакции, её фиксирует runTransaction
      console.log(`${LOG} closed uid=${uid8} status=nothing upgraded=${upgraded}`);
      return Object.freeze({ status: 'nothing' as const, upgraded, from: plan.from, coins: plan.coins, cappedBy: plan.cappedBy, starsBalance: starsNow.balance, starsSeq: starsNow.seq });
    }
    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, ledgerOps(plan, nowMs), {
      nowMs,
      activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
      weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
      authUid,
      deviceId: null,
    });
    const rejected = prepared.outcomes.filter((outcome) => outcome.status !== 'applied' && outcome.status !== 'already_applied');
    if (rejected.length > 0) {
      // всё или ничего: повтор пройдёт тем же путём
      console.warn(`${LOG} reject reason=ledger_outcome uid=${uid8} first=${rejected[0]?.opId} status=${rejected[0]?.status} code=${String(rejected[0]?.errorCode ?? null)}`);
      throw new HttpsError('failed-precondition', 'legacy_bonus_ledger_rejected');
    }
    const record = { schemaVersion: 1, status: 'converted', upgraded, from: plan.from, coins: plan.coins, cappedBy: plan.cappedBy, atMs: nowMs };
    const result = commitStarOperations(tx, prepared, { [LEGACY_BONUS_V1_FIELD]: record });
    console.log(`${LOG} converted uid=${uid8} total=${plan.coins.total} balanceBefore=${starsNow.balance} balanceAfter=${result.balance} seq=${result.seq}`);
    return Object.freeze({ status: 'converted' as const, upgraded, from: plan.from, coins: plan.coins, cappedBy: plan.cappedBy, starsBalance: result.balance, starsSeq: result.seq });
  });
}

async function legacyBonusEnabled(db: admin.firestore.Firestore): Promise<boolean> {
  const snap = await db.collection('remote_config').doc('app').get();
  const bools = (snap.data()?.bools ?? {}) as Record<string, unknown>;
  return bools[LEGACY_BONUS_FLAG_KEY] === true;
}

// зачем: D195 — человек сам вызывает один раз при первом входе после выкладки (лениво; неактивные не стоят ничего).
export const legacyBonusConvertMine = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<LegacyBonusResponse> => {
  const authUid = request.auth?.uid;
  if (!authUid) {
    console.warn(`${LOG} reject reason=auth_required`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const startedAt = Date.now();
  const db = admin.firestore();
  if (!(await legacyBonusEnabled(db))) {
    console.log(`${LOG} skip reason=flag_off auth=${authUid.slice(0, 8)}`);
    return Object.freeze({ status: 'disabled' as const, upgraded: false, from: ZERO_SOURCE, coins: ZERO_COINS, cappedBy: 'none' as const, starsBalance: 0, starsSeq: 0 });
  }
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.ownerStableId, { requireKnownIdentity: true, repairLinks: false });
  try {
    const response = await runLegacyBonusConvertV1(db, { authUid, stableUid, nowMs: Date.now() });
    console.log(`${LOG} done uid=${stableUid.slice(0, 8)} status=${response.status} total=${response.coins.total} ms=${Date.now() - startedAt}`);
    return response;
  } catch (error) {
    const code = error instanceof HttpsError ? error.code : 'internal';
    console.warn(`${LOG} failed uid=${stableUid.slice(0, 8)} code=${code} message=${error instanceof Error ? error.message : String(error)} ms=${Date.now() - startedAt}`);
    throw error;
  }
});
