/**
 * aiDialogSyncPurchase — синхронизация покупок диалогов за руны.
 *
 * зачем (владелец, 2026-09-17, макет docs/design/runes/MAKET.html): руны
 * покупают ЯЗЫК. Доступ к сценарию — 5 000 рун обычный, 10 000 интересный
 * или сложный. Это главный сток рун: до него стоков фактически не было,
 * и валюта копилась без применения.
 *
 * СЕРВЕР НЕ РЕШАЕТ, А ДОГОНЯЕТ (дословно владелец): «Сервер не принимает
 * участия, он только синхронизация! Главный телефон только, сервер не нужен».
 * Телефон списал руны и открыл диалог в кадре 0; эта функция лишь
 * (а) проводит трату через журнал, чтобы баланс сошёлся на всех устройствах,
 * (б) сохраняет владение, чтобы переустановка приложения не потеряла купленное.
 * Поэтому здесь НЕТ отказа «недостаточно рун»: решение уже принято на телефоне,
 * а отказ задним числом отнял бы у человека оплаченное. Журнал не уходит в
 * минус сам — это забота prepareStarOperations.
 *
 * Риск принят осознанно (R6): модифицированный клиент откроет каталог себе
 * сам. Страховка — дневной лимит 10 реплик, он остаётся всегда, поэтому
 * вскрытый каталог не даёт бесконечного расхода OpenAI.
 *
 * Идемпотентность: opId `dialog_unlock:{stableUid}:{scenarioId}` стабилен и не
 * зависит от попытки — повтор батча после обрыва сети не спишет дважды, журнал
 * отвергает вставку по тому же opId сам (тот же паттерн, что welcome_gift.ts).
 *
 * ОДИН вызов на весь список покупок, а не вызов на покупку: после офлайна их
 * может накопиться несколько, и N вызовов дали бы N транзакций и N записей
 * на ровном месте.
 *
 * App Check не включаем — запломбирован владельцем (callable_options.ts,
 * APP_CHECK_SEALED_BY_OWNER_2026_08_17).
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarOpRequest,
} from './stars_ledger';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Допустимые цены. Список закрыт: третьего тарифа в макете нет. */
const ALLOWED_PRICES = new Set([5000, 10000]);
/** Потолок на батч: очередь офлайна реально короткая, это защита от мусора. */
const MAX_PURCHASES_PER_CALL = 25;
const SCENARIO_ID_RE = /^[a-z0-9_]{2,64}$/;

/** Зеркало welcome_gift.ts: stableId обязан принадлежать вызывающему. */
function userMatchesAuth(
  stableId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  if (!data || data.identityHidden === true) return false;
  const canonicalStableId = typeof data.canonicalStableId === 'string' ? data.canonicalStableId.trim() : '';
  if (canonicalStableId && canonicalStableId !== stableId) return false;
  const linkedAuthUid = typeof data?.firebaseAuthUid === 'string' ? data.firebaseAuthUid : '';
  return (linkedAuthUid && linkedAuthUid === authUid) || stableId === authUid;
}

/** Тот же ISO-ключ недели, что в welcome_gift.ts. */
function isoWeekKey(nowMs: number): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const date = new Date(nowMs);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

type Purchase = Readonly<{ scenarioId: string; priceRunes: number }>;

function parsePurchases(raw: unknown): Purchase[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Purchase[] = [];
  for (const item of raw.slice(0, MAX_PURCHASES_PER_CALL)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const scenarioId = String(row.scenarioId ?? '').trim();
    const priceRunes = Number(row.priceRunes);
    if (!SCENARIO_ID_RE.test(scenarioId) || seen.has(scenarioId)) continue;
    if (!ALLOWED_PRICES.has(priceRunes)) continue;
    seen.add(scenarioId);
    out.push({ scenarioId, priceRunes });
  }
  return out;
}

export const aiDialogSyncPurchase = onCall(CALLABLE_BASE, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const stableUid = String(request.data?.stableId ?? '').trim();
  if (!stableUid) throw new HttpsError('invalid-argument', 'stable_id_required');

  const purchases = parsePurchases(request.data?.purchases);
  if (purchases.length === 0) throw new HttpsError('invalid-argument', 'no_valid_purchases');

  const db = admin.firestore();
  const userRef = db.collection('users').doc(stableUid);
  const ownershipRef = userRef.collection('dialog_access').doc('owned');
  const now = Date.now();

  return db.runTransaction(async (tx) => {
    const [userSnap, ownedSnap] = await Promise.all([tx.get(userRef), tx.get(ownershipRef)]);

    if (!userSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    if (!userMatchesAuth(stableUid, userSnap.data(), request.auth!.uid)) {
      throw new HttpsError('permission-denied', 'user_does_not_match_auth');
    }

    const ownedBefore = new Set<string>(
      Array.isArray(ownedSnap.data()?.scenarioIds)
        ? (ownedSnap.data()!.scenarioIds as unknown[]).filter((id): id is string => typeof id === 'string')
        : [],
    );

    // Уже учтённые покупки не списываем повторно. Журнал отверг бы дубль и сам
    // по opId, но лишняя операция в батче — лишний шум в истории трат.
    const fresh = purchases.filter((p) => !ownedBefore.has(p.scenarioId));

    if (fresh.length === 0) {
      const current = normalizeStars(userSnap.data()?.stars);
      return {
        ok: true,
        applied: 0,
        stars: current.balance,
        starsSeq: current.seq,
      };
    }

    const starOps: StarOpRequest[] = fresh.map((p) => ({
      opId: `dialog_unlock:${stableUid}:${p.scenarioId}`,
      delta: -p.priceRunes,
      reason: 'dialog_unlock',
      sourceKind: 'dialog_unlock',
      sourceId: p.scenarioId,
      ruleVersion: 1,
      earnedAtMs: now,
      meta: { scenarioId: p.scenarioId, priceRunes: p.priceRunes },
    }));

    const prepared = await prepareStarOperations(tx, db, stableUid, userSnap, starOps, {
      nowMs: now,
      activeSeasonId: '',
      weekKeyNow: isoWeekKey(now),
      authUid: request.auth!.uid,
    });
    const committed = commitStarOperations(tx, prepared);

    // Владение — ОДИН документ игрока, не документ на сценарий: так вход в
    // раздел стоит одно чтение, а не N (правило экономии Firebase).
    tx.set(ownershipRef, {
      scenarioIds: [...ownedBefore, ...fresh.map((p) => p.scenarioId)],
      updatedAtMs: now,
    }, { merge: true });

    return {
      ok: true,
      applied: fresh.length,
      stars: committed.balance,
      starsSeq: committed.seq,
    };
  });
});
