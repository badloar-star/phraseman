// ═══════════════════════════════════════════════════════════════════════════
// spire_finalize_cron.ts — недельный итог Шпиля (PM-276, TOWER.md §4.7).
//
// зачем (владелец 2026-09-24): в понедельник каждая комната Шпиля прошлой
// недели подводит итог — место по ступеням, переход в соседний шпиль, монеты
// за место и повышение. Логика одной комнаты — spire_finalize_core.ts.
//
// Отдельный крон для комнат Шпиля: они живут в своей коллекции
// `spire_groups` и имеют самостоятельный недельный итог.
//
// Что пишет на каждого ЖИВОГО участника (ботам — ничего):
//   users/{uid}/spire_week_results/{weekId}_{lang} — итог (место, зоны,
//     шпиль до/после, сколько монет положено). Клиент покажет его ФАКТОМ при
//     первом заходе в Шпиль (§4.7, закон «празднование не durable»): документ —
//     это сама награда/итог, а не «долг на показ».
//   leaderboard/{uid}.spireTiers.{lang} — новый шпиль, ТОЛЬКО если он
//     изменился. spireJoinRoom (PM-277) читает именно это поле при входе в
//     комнату следующей недели.
// И на комнату: spire_groups/{id}.finalizedAt + open:false — повторный запуск
// (ретрай крона) пропускает уже подведённые комнаты и не пишет второй раз.
//
// МОНЕТЫ (PM-280, закрывает О-276-1): сумма пишется в итог (rewardCoins,
// rewardStatus: 'pending_wallet'), затем payoutSpireWeekReward кладёт её в
// журнал рун (монеты = руны до PM-069) по ключу spire_week:{lang}_{weekId} и
// ставит rewardStatus: 'paid'. Порядок на комнату: итоги → flush → выплаты →
// отметка finalizedAt. Если хоть одна выплата комнаты не прошла, отметку НЕ
// ставим и в конце прогона бросаем ошибку: Cloud Scheduler повторит прогон
// (retryCount), ретрай пропустит подведённые комнаты, а выплаты идемпотентны.
//
// Firebase-экономия: 1 запуск в неделю; 1 чтение config/spire_v1; комнаты —
// одним запросом по weekId страницами по 200 (чтений = число комнат прошлой
// недели); записей — по 1 итогу на живого + 1 leaderboard только при смене
// шпиля + 1 отметка на комнату. Ботов — 0 чтений/записей (формула).
// Составной индекс не нужен: равенство weekId + порядок по __name__.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { withCronHeartbeat } from './cron_heartbeat';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireConfigStatus,
  spireEffectiveRankBy,
  type SpireConfigDoc,
} from './spire_config_contract';
import { normalizeStars, starsWeekEarned } from './stars_ledger';
import { computeSpireRoomResults } from './spire_finalize_core';
import { payoutSpireWeekReward } from './spire_week_payout';
import { SPIRE_GROUPS_COLLECTION, spireWeekId } from './spire_groups';
import { isSpireResidentMember, spireWeekStartMs } from './spire_residents';
import { runSpireWeekResultPush, type SpireWeekResultPushInput } from './spire_week_result_push';

const LOG = '[SPIRE-FINALIZE]';
// зачем 200 комнат на страницу при выплатах: каждая комната теперь ещё и
// flush + до ~8 транзакций выплат; страница остаётся прежней, лимит времени
// 540 с — при росте числа комнат выплаты стоит вынести в отдельный крон.
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
export const SPIRE_WEEK_RESULTS_SUBCOLLECTION = 'spire_week_results' as const;

/** Неделя, итог которой подводим: та, что закончилась к моменту запуска. */
export function spirePreviousWeek(nowMs: number): { weekId: string; weekStartMs: number } {
  const currentStart = spireWeekStartMs(nowMs);
  const prevStart = spireWeekStartMs(currentStart - 1);
  return { weekId: spireWeekId(new Date(prevStart)), weekStartMs: prevStart };
}

async function loadSpireConfig(db: admin.firestore.Firestore): Promise<SpireConfigDoc> {
  try {
    // guard-ok: одиночный документ config/spire_v1, не выборка коллекции.
    const snap = await db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID).get();
    const status = spireConfigStatus(snap.exists ? snap.data() : null);
    console.log(LOG, JSON.stringify({
      event: 'config', exists: status.exists, valid: status.valid, live: status.liveForPlayers,
      coins: status.config.coins, residents: status.config.residents,
    }));
    return status.config;
  } catch (err) {
    // Итог недели важнее точных сумм: на отказе конфига — дефолты TOWER.md §4.6.
    console.error(LOG, JSON.stringify({ event: 'config_read_failed', error: String((err as Error)?.message ?? err) }));
    return spireConfigStatus(null).config;
  }
}

/** getAll за раз — с запасом под лимит запроса; комната ≤ 30 мест, живых меньше. */
const WEEK_COINS_READ_CHUNK = 100;

/**
 * D162: монеты недели живых участников комнаты — сумма всех режимов из журнала (users.stars), ДО потолка.
 * зачем getAll с маской 'stars' (Firebase-экономия): одно чтение на живого в неделю и только поле журнала, без профиля.
 * starsWeekEarned читает и прошлую неделю (prevWeekEarned) — в понедельник неделя у многих уже перенесена.
 * Ошибка чтения не глотается: прогон падает и повторяется (retryCount), подведённые комнаты пропускаются.
 */
export async function spireReadWeekCoins(
  db: admin.firestore.Firestore,
  members: Readonly<Record<string, unknown>>,
  weekId: string,
): Promise<Record<string, number>> {
  const uids = Object.entries(members)
    .filter(([uid, raw]) => raw && typeof raw === 'object' && !isSpireResidentMember(uid, raw as Record<string, unknown>))
    .map(([uid]) => uid);
  const out: Record<string, number> = {};
  for (let i = 0; i < uids.length; i += WEEK_COINS_READ_CHUNK) {
    const refs = uids.slice(i, i + WEEK_COINS_READ_CHUNK).map((uid) => db.collection('users').doc(uid));
    if (refs.length === 0) continue;
    // guard-ok: точечные документы по id (участники комнаты), не листинг коллекции.
    const snaps = await db.getAll(...refs, { fieldMask: ['stars'] });
    for (const snap of snaps) {
      out[snap.id] = snap.exists ? starsWeekEarned(normalizeStars(snap.get('stars')), weekId) : 0;
    }
  }
  return out;
}

function membersOf(data: Record<string, unknown>): Record<string, unknown> {
  const m = data.members;
  return m && typeof m === 'object' && !Array.isArray(m) ? m as Record<string, unknown> : {};
}

export const spireFinalizeCron = onSchedule(
  {
    // зачем 00:01: отчёты последних 10 минут недели засчитываются уже в НОВУЮ
    // неделю (D61, О-275-3), так что комнаты прошлой недели после 00:00 не
    // меняются. Чем раньше итог — тем меньше людей успеют войти в комнату
    // новой недели со старым шпилем (см. открытый вопрос в evidence PM-276).
    schedule: 'every monday 00:01',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
    // зачем (PM-280): упавшая выплата монет роняет прогон, чтобы его повторили.
    // Повтор безопасен: подведённые комнаты пропускаются, выплаты — по ключу.
    retryCount: 3,
  },
  withCronHeartbeat('spireFinalizeCron', async () => {
    const db = admin.firestore();
    const startedAt = Date.now();
    const { weekId, weekStartMs } = spirePreviousWeek(startedAt);
    const config = await loadSpireConfig(db);
    // зачем (D162, координатор 13.10): один рубильник config/spire_v1.rankBy; 'coins' действует только с недели
    // SPIRE_RANK_BY_COINS_FROM_WEEK — правило не меняется посреди начатой недели.
    const rankBy = spireEffectiveRankBy(config, weekId);
    console.log(LOG, JSON.stringify({ event: 'start', weekId, weekStartMs, rankByConfig: config.rankBy, rankBy, weekCoinsCap: config.weekCoinsCap }));
    let capHitsTotal = 0;

    let rooms = 0;
    let skipped = 0;
    let results = 0;
    let tierWrites = 0;
    let promoted = 0;
    let demoted = 0;
    let coinsPaid = 0;
    let payoutsPaid = 0;
    let payoutsFailed = 0;
    const weekEndMs = spireWeekStartMs(startedAt);
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let batch = db.batch();
    let batchCount = 0;
    // зачем (PM-281, T30): понедельничный пуш «итог + новый шпиль» собирается
    // ПОПУТНО тем же циклом — экономия чтений (см. шапку spire_week_result_push.ts).
    // Уходит ТОЛЬКО после всех комнат: пуш обязан прийти после того, как
    // итоги реально записаны, иначе текст соврёт про шпиль, который крон
    // ещё не подвёл.
    const pushInputs: SpireWeekResultPushInput[] = [];

    const flush = async () => {
      if (batchCount === 0) return;
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    };
    const add = async (write: (b: FirebaseFirestore.WriteBatch) => void) => {
      write(batch);
      batchCount++;
      if (batchCount >= BATCH_LIMIT) await flush();
    };

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query: FirebaseFirestore.Query = db.collection(SPIRE_GROUPS_COLLECTION)
        .where('weekId', '==', weekId)
        .orderBy('__name__')
        .limit(PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snap = await query.get();
      if (snap.empty) break;
      lastDoc = snap.docs[snap.docs.length - 1];

      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;
        if (data.finalizedAt) {
          skipped++;
          console.log(LOG, JSON.stringify({ event: 'skip', reason: 'already_finalized', groupId: doc.id }));
          continue;
        }
        const lang = typeof data.lang === 'string' ? data.lang : '';
        if (!lang) {
          skipped++;
          console.warn(LOG, JSON.stringify({ event: 'skip', reason: 'no_lang', groupId: doc.id }));
          continue;
        }
        const roomWeekStart = Number(data.weekStartMs);
        const weekCoinsByUid = rankBy === 'coins' ? await spireReadWeekCoins(db, membersOf(data), weekId) : undefined;
        const out = computeSpireRoomResults({
          groupId: doc.id,
          tier: Number(data.tier),
          weekStartMs: Number.isFinite(roomWeekStart) && roomWeekStart > 0 ? roomWeekStart : weekStartMs,
          cohortDay: Number(data.cohortDay) || 0,
          members: membersOf(data),
          coins: config.coins,
          tuning: config.residents,
          rankBy,
          weekCoinsByUid,
          weekCoinsCap: config.weekCoinsCap,
        });
        capHitsTotal += out.capHits;

        let roomPromoted = 0;
        let roomDemoted = 0;
        const toPay: Array<{ uid: string; ref: FirebaseFirestore.DocumentReference }> = [];
        for (const [uid, result] of Object.entries(out.results)) {
          const resultRef = db.collection('users').doc(uid)
            .collection(SPIRE_WEEK_RESULTS_SUBCOLLECTION).doc(`${weekId}_${lang}`);
          await add((b) => b.set(resultRef, {
            ...result,
            weekId,
            lang,
            groupId: doc.id,
            rewardStatus: result.rewardCoins.total > 0 ? 'pending_wallet' : 'none',
            finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
          }));
          results++;
          if (result.rewardCoins.total > 0) toPay.push({ uid, ref: resultRef });
          if (result.promoted) roomPromoted++;
          if (result.demoted) roomDemoted++;
          // зачем: кандидат понедельничного пуша (PM-281) — данные уже в памяти,
          // отдельного чтения не требуется. Отправка — после ВСЕХ комнат ниже.
          pushInputs.push({
            uid, studyLang: lang, prevTier: result.prevTier, newTier: result.newTier,
            promoted: result.promoted, demoted: result.demoted,
          });
          if (result.newTier !== result.prevTier) {
            // merge: карта spireTiers сливается по ключам — другие языки не трогаем.
            await add((b) => b.set(db.collection('leaderboard').doc(uid), {
              spireTiers: { [lang]: result.newTier },
            }, { merge: true }));
            tierWrites++;
          }
        }
        // ── Выплата монет (PM-280) ────────────────────────────────────────
        // Итоги комнаты обязаны быть записаны ДО выплат: транзакция выплаты
        // читает сумму из документа итога и ставит в нём 'paid' через merge.
        // Если бы итог ещё лежал в батче, его set без merge затёр бы 'paid'.
        let roomPayoutFailed = 0;
        if (toPay.length > 0) {
          await flush();
          for (const row of toPay) {
            try {
              const paid = await payoutSpireWeekReward(db, {
                uid: row.uid, weekId, lang, resultRef: row.ref, weekEndMs,
              });
              if (paid.status === 'paid') {
                payoutsPaid++;
                coinsPaid += paid.coins;
              } else if (paid.status === 'rejected' || paid.status === 'skipped_identity_transition') {
                // Отказ журнала или аккаунт в переезде — повторить стоит.
                roomPayoutFailed++;
              }
            } catch (err) {
              roomPayoutFailed++;
              console.error(LOG, JSON.stringify({
                event: 'payout_failed', groupId: doc.id, uid: row.uid, lang,
                error: String((err as Error)?.message ?? err),
              }));
            }
          }
        }
        payoutsFailed += roomPayoutFailed;
        if (roomPayoutFailed > 0) {
          // Комнату НЕ отмечаем: ретрай прогона перепишет итоги и доплатит
          // только тех, у кого нет расписки (остальные — already_paid).
          console.warn(LOG, JSON.stringify({ event: 'room_payout_incomplete', groupId: doc.id, lang, failed: roomPayoutFailed }));
          promoted += roomPromoted;
          demoted += roomDemoted;
          rooms++;
          continue;
        }
        // Отметка идёт ПОСЛЕ итогов и выплат: батчи коммитятся по порядку, значит
        // отмеченная комната уже целиком записана и оплачена; упали раньше —
        // ретрай перепишет те же документы теми же значениями.
        await add((b) => b.update(doc.ref, {
          finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
          open: false,
        }));
        promoted += roomPromoted;
        demoted += roomDemoted;
        rooms++;
        console.log(LOG, JSON.stringify({
          event: 'room', groupId: doc.id, lang, tier: data.tier ?? null,
          live: out.liveTotal, roomTotal: out.roomTotal, zone: out.zoneSize,
          hasAnyScorer: out.hasAnyScorer, promoted: roomPromoted, demoted: roomDemoted,
          rankBy: out.rankBy, capHit: out.capHits,
        }));
      }
    }

    await flush();

    // ── Пуш понедельника (PM-281, T30) ─────────────────────────────────────
    // зачем: строго ПОСЛЕ flush() — итоги и переходы шпилей уже в Firestore,
    // текст пуша не может соврать про шпиль, который ещё не записан. Провал
    // отправки НЕ бросает исключение крона: пуш — не источник истины, итог
    // уже сохранён и его всё равно увидит экран Шпиля фактом при заходе.
    let pushSent = 0;
    try {
      const pushSummary = await runSpireWeekResultPush(db, pushInputs);
      pushSent = pushSummary.sent;
      console.log(LOG, JSON.stringify({ event: 'week_result_push', ...pushSummary }));
    } catch (err) {
      console.error(LOG, JSON.stringify({ event: 'week_result_push_failed', error: String((err as Error)?.message ?? err) }));
    }

    const summary = {
      weekId, rooms, skipped, results, tierWrites, promoted, demoted,
      payoutsPaid, payoutsFailed, coinsPaid, pushSent, rankBy, capHits: capHitsTotal, tookMs: Date.now() - startedAt,
    };
    console.log(LOG, JSON.stringify({ event: 'done', ...summary }));
    if (payoutsFailed > 0) {
      // зачем: без броска Cloud Scheduler считает прогон успешным и не повторит —
      // монеты тех, кому не заплатили, повисли бы до ручного вмешательства.
      throw new Error(`spire_payouts_incomplete:${payoutsFailed}`);
    }
    return { rooms, skipped, results, tierWrites, promoted, demoted, payoutsPaid, coinsPaid, pushSent };
  }),
);
