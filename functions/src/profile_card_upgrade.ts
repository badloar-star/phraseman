// ═══════════════════════════════════════════════════════════════════════════
// profile_card_upgrade.ts — серверная валидация прокачки карточки профиля.
//
// Зачем: карточка профиля стала ПУБЛИЧНЫМ статусом (бейдж уровня в строках
// лидербордов/арены/клуба + полная карточка в профиле). Раньше уровень писался
// клиентом без серверной сверки траты осколков → подделанный клиент мог выставить
// себе уровень, не потратив ничего, и красоваться в чужих лидербордах.
//
// Эта callable хранит публичную проекцию уровня. Личную покупку и её атомарный
// результат фиксирует клиент; сервер не проверяет, не списывает и не откатывает
// персональный баланс.
//
// Идемпотентность по уровню: вход содержит expectedLevel (текущий уровень глазами
// клиента). Если серверный уровень уже >= expectedLevel+1, апгрейд уже случился —
// возвращаем текущее состояние без двойного списания.
//
// РЕШЕНИЕ 2026-07-05 (владелец): лестница из 5 уровней. Уровень V («Легенда»)
// дополнительно получает порядковый номер легенды из глобального счётчика
// stats/profile_card_legends — номер выдаётся один раз и навсегда.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { appendExternalEconomyEvent } from './external_economy_events';

const PROFILE_CARD_MAX_LEVEL = 5;
const PROFILE_CARD_LEGEND_LEVEL = 5;
const PROFILE_CARD_LEGEND_COUNTER_DOC = 'profile_card_legends';

// Фаза 4: «праздник легенды» — каждому другу свежей Легенды +5 💠.
const LEGEND_FRIEND_GIFT_SHARDS = 5;
const LEGEND_FRIEND_GIFT_REASON = 'legend_celebration_gift';

/**
 * «Праздник легенды»: после СВЕЖЕЙ выдачи уровня V каждому другу +5 💠 и анонс
 * в ленту друзей. Начисление — immutable external economy event, который клиенты
 * друзей применяют через общий журнал. Анонс — стабильным doc id
 * 'legend_celebration' в users/{uid}/my_events (повторная запись перезаписывает тот
 * же документ — дублей в ленте нет); тип 'achievement' лента уже рендерит на всех
 * 8 языках («{имя} получил достижение 👑 «Легенда №N»») без правок клиента.
 * Вызывается ПОСЛЕ коммита транзакции уровня, best-effort: сбой праздника логируется
 * и НЕ роняет выданный апгрейд. Идемпотентность обеспечена вызывающим — функция
 * стартует только при !alreadyApplied (свежая выдача, повторы отсекаются транзакцией).
 */
async function celebrateNewLegend(
  db: FirebaseFirestore.Firestore,
  uid: string,
  legendNo: number,
): Promise<void> {
  try {
    const friendsSnap = await db.collection('users').doc(uid).collection('friends').get();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    await Promise.all(friendsSnap.docs.map(async (friendDoc) => {
      const friendUid = friendDoc.id;
      try {
        const friendRef = db.collection('users').doc(friendUid);
        await db.runTransaction(async (tx) => {
          appendExternalEconomyEvent(tx, friendRef, {
            source: 'legend_celebration', eventId: `${uid}:${legendNo}:${friendUid}`,
            ownerStableId: friendUid, delta: LEGEND_FRIEND_GIFT_SHARDS,
            reason: LEGEND_FRIEND_GIFT_REASON, kind: 'social_legend_gift',
            subjectId: uid, payload: { legendUid: uid, legendNo }, createdAtMs: nowMs,
          });
          tx.set(friendRef.collection('shard_log').doc(), {
            ts: nowIso,
            type: 'earn',
            amount: LEGEND_FRIEND_GIFT_SHARDS,
            reason: LEGEND_FRIEND_GIFT_REASON,
            authority: 'external_event',
            legendUid: uid,
            legendNo,
          });
        });
      } catch (error) {
        console.error(JSON.stringify({ event: 'legend_celebration_gift_failed', uid, friendUid, legendNo, error: String(error) }));
      }
    }));
    await db.collection('users').doc(uid).collection('my_events').doc('legend_celebration').set({
      type: 'achievement',
      uid,
      ts: nowMs,
      payload: { icon: '👑', nameRu: `Легенда №${legendNo}` },
    }).catch((error: unknown) => {
      console.error(JSON.stringify({ event: 'legend_celebration_feed_failed', uid, legendNo, error: String(error) }));
    });
    console.log(JSON.stringify({ event: 'legend_celebration_done', uid, legendNo, friends: friendsSnap.docs.length }));
  } catch (error) {
    console.error(JSON.stringify({ event: 'legend_celebration_failed', uid, legendNo, error: String(error) }));
  }
}

function readCardLevel(value: unknown): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(PROFILE_CARD_MAX_LEVEL, n));
}

function readLegendNo(value: unknown): number | null {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type UpgradeResult =
  | { ok: true; alreadyApplied: boolean; level: number; spent: 0; legendNo?: number }
  | { ok: false; reason: 'max'; level: number };

/**
 * Callable: поднять уровень карточки профиля на +1 за осколки.
 *
 * Вход:  { expectedLevel?: number }  — текущий уровень глазами клиента (для идемпотентности)
 * Ответ: UpgradeResult (для уровня V дополнительно legendNo — номер легенды)
 */
export const profileCardUpgrade = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  const db = admin.firestore();
  // Forward the client's stableId so we read/write the SAME users/{stableId} doc the
  // client stores shards in. Without it we'd fall back to the auth uid (or an auth-link
  // lookup that may not be stamped yet) → a different/empty doc → balance 0 → the upgrade
  // wrongly reports "insufficient" and the UI sends the player to the shard shop.
  const uid = await resolveStableUidForAuth(db, request.auth.uid, request.data?.stableId);

  const expectedLevelRaw = request.data?.expectedLevel;
  const expectedLevel =
    expectedLevelRaw === undefined || expectedLevelRaw === null
      ? null
      : readCardLevel(expectedLevelRaw);

  const userRef = db.collection('users').doc(uid);
  const legendCounterRef = db.collection('stats').doc(PROFILE_CARD_LEGEND_COUNTER_DOC);

  const result: UpgradeResult = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const data = userSnap.data() ?? {};
    // The badge everyone sees is mirrored from progress.profile_card_level by
    // sync_leaderboard.ts — that is the authoritative field, so read & write it here
    // (and Firestore rules block clients from writing it, leaving this CF the only path).
    const progress = (data.progress ?? {}) as Record<string, unknown>;
    const currentLevel = readCardLevel(progress.profile_card_level);
    const storedLegendNo = readLegendNo(progress.profile_card_legend_no);

    // Идемпотентность: клиент думал, что на expectedLevel, но сервер уже выше —
    // значит апгрейд уже применён (повторный/гонка). Не списываем второй раз.
    // (Номер легенды при таком повторе доедет штатным restore из users.progress.)
    if (expectedLevel !== null && currentLevel > expectedLevel) {
      return { ok: true, alreadyApplied: true, level: currentLevel, spent: 0 };
    }

    if (currentLevel >= PROFILE_CARD_MAX_LEVEL) {
      return { ok: false, reason: 'max', level: currentLevel };
    }

    const nextLevel = currentLevel + 1;
    // «Легенда»: порядковый номер из глобального счётчика. Читаем ДО первой записи —
    // Firestore-транзакция требует все чтения раньше записей.
    let legendNo: number | null = storedLegendNo;
    if (nextLevel === PROFILE_CARD_LEGEND_LEVEL && legendNo === null) {
      const counterSnap = await tx.get(legendCounterRef);
      const issued = Math.max(0, Math.trunc(Number(counterSnap.data()?.issued)) || 0);
      legendNo = issued + 1;
      tx.set(legendCounterRef, { issued: legendNo, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }

    tx.set(
      userRef,
      {
        // Nested under progress so sync_leaderboard mirrors it to the public badge.
        // { merge: true } deep-merges nested objects, so sibling progress keys are kept.
        progress: {
          profile_card_level: nextLevel,
          ...(nextLevel === PROFILE_CARD_LEGEND_LEVEL && legendNo !== null
            ? { profile_card_legend_no: legendNo }
            : {}),
        },
        profile_card_level_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true, alreadyApplied: false, level: nextLevel, spent: 0,
      ...(nextLevel === PROFILE_CARD_LEGEND_LEVEL && legendNo !== null ? { legendNo } : {}),
    };
  });

  // Фаза 4: «праздник легенды» — только при СВЕЖЕЙ выдаче V (не идемпотентный повтор):
  // alreadyApplied/не-V/ошибки праздника отсекаются внутри. После коммита, best-effort.
  if (result.ok && !result.alreadyApplied && result.level === PROFILE_CARD_LEGEND_LEVEL && result.legendNo) {
    await celebrateNewLegend(db, uid, result.legendNo);
  }

  return result;
});
